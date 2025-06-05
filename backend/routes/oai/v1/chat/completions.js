import express from 'express';
import fetch from 'node-fetch';
import { translateToChatGPT } from '../../../../lib/translator.js';
import { adaptFromChatGPT } from '../../../../lib/responseAdapter.js';
import { updateThread } from '../../../../lib/session.js';
// Simple helper functions per Tuesday's specification

async function proxyAndRelayStream({ from, to, req, payload }) {
  logTranslit('Starting direct stream relay');
  
  to.setHeader('Content-Type', 'text/event-stream');
  to.setHeader('Cache-Control', 'no-cache');
  to.setHeader('Connection', 'keep-alive');

  const reader = from.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let messageId = null;
  let conversationId = null;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;

        if (line.includes('[DONE]')) {
          // Update thread state if we have the IDs
          if (conversationId && messageId) {
            updateThread(req, conversationId, messageId);
          }
          to.write(`data: [DONE]\n\n`);
          to.end();
          return;
        }

        // Transform ChatGPT line to OpenAI format and send immediately
        try {
          const parsed = JSON.parse(line.slice(6));
          
          // Extract IDs for thread management
          if (parsed.conversation_id) conversationId = parsed.conversation_id;
          if (parsed.message?.id) messageId = parsed.message.id;

          // Extract content and transform to OpenAI format
          const content = parsed.message?.content?.parts?.[0];
          if (content) {
            const oaiChunk = {
              id: messageId ? `chatcmpl-${messageId}` : 'chatcmpl-streaming',
              object: 'chat.completion.chunk',
              created: Math.floor(Date.now() / 1000),
              model: req.body.model || payload.model,
              choices: [{
                delta: { content },
                index: 0,
                finish_reason: null,
              }],
            };
            to.write(`data: ${JSON.stringify(oaiChunk)}\n\n`);
          }
        } catch (_) {
          // Skip malformed lines
        }
      }
    }
    
    // Stream ended without [DONE]
    if (conversationId && messageId) {
      updateThread(req, conversationId, messageId);
    }
    to.write(`data: [DONE]\n\n`);
    to.end();
    
  } catch (streamErr) {
    logError('TRANSLIT', 'Error during stream relay', streamErr);
    to.write(`data: ${JSON.stringify({
      error: {
        message: 'Stream processing error',
        type: 'chargpt_stream_error'
      }
    })}\n\n`);
    to.end();
  }
}

async function accumulateStream(gptRes) {
  logTranslit('Accumulating ChatGPT stream for non-streaming response');
  
  const reader = gptRes.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let conversationId = null;
  let messageId = null;
  let fullContent = '';
  let lastValidMessage = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // Keep incomplete line in buffer

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      
      if (line.includes('[DONE]')) {
        return {
          conversationId,
          messageId: lastValidMessage?.message?.id || messageId,
          content: lastValidMessage?.message?.content?.parts?.[0] || fullContent,
          success: true
        };
      }

      try {
        const parsed = JSON.parse(line.slice(6));
        
        if (parsed.conversation_id) conversationId = parsed.conversation_id;
        if (parsed.message?.id) {
          messageId = parsed.message.id;
          lastValidMessage = parsed;
        }

        // ChatGPT sends the full content each time, not deltas
        const contentPart = parsed.message?.content?.parts?.[0];
        if (contentPart && typeof contentPart === 'string') {
          fullContent = contentPart;
        }
      } catch (_) {
        // Skip malformed lines
      }
    }
  }

  // Stream ended without [DONE]
  return {
    conversationId,
    messageId: lastValidMessage?.message?.id || messageId,
    content: lastValidMessage?.message?.content?.parts?.[0] || fullContent,
    success: fullContent.length > 0
  };
}

function convertToOpenAIFormat(fullResponse, req, payload) {
  if (!fullResponse.success || !fullResponse.messageId) {
    logError('TRANSLIT', 'Failed to accumulate valid response', fullResponse);
    throw new Error('Invalid response from ChatGPT backend');
  }

  // Update thread state
  updateThread(req, fullResponse.conversationId, fullResponse.messageId);

  const response = {
    id: `chatcmpl-${fullResponse.messageId}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: req.body.model || payload.model,
    choices: [{
      message: {
        role: 'assistant',
        content: fullResponse.content || '',
      },
      index: 0,
      finish_reason: 'stop',
    }],
    usage: {
      prompt_tokens: 0, // ChatGPT doesn't provide this
      completion_tokens: 0, // ChatGPT doesn't provide this
      total_tokens: 0
    }
  };

  logTranslit('Converted to OpenAI format', { 
    responseId: response.id,
    model: response.model,
    contentLength: fullResponse.content?.length || 0
  });

  return response;
}
import { logProxy, logTranslit, logError } from '../../../../lib/logger.js';
import { createMockResponse, shouldUseMock } from '../../../../lib/mockResponses.js';

const router = express.Router();

export default ({ BASE, AUTH, UA, agent, TIMEOUT = 30000 }) => {

router.post('/v1/chat/completions', async (req, res) => {
  logTranslit('Received OpenAI chat completion request', { 
    stream: req.body.stream, 
    model: req.body.model,
    messageCount: req.body.messages?.length 
  });

  const url = new URL('/backend-api/conversation', BASE).href;
  const headers = {
    'User-Agent': UA,
    'Authorization': `Bearer ${AUTH}`,
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
  };

  const payload = translateToChatGPT(req.body, req);
  const streamMode = req.body.stream === true;

  logTranslit('Translated to ChatGPT format', { 
    action: payload.action,
    model: payload.model,
    streamMode 
  });

  try {
    logProxy('Making request to ChatGPT backend', { url });
    
    const gptRes = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      agent,
      timeout: TIMEOUT,
    });

    if (!gptRes.ok) {
      throw new Error(`ChatGPT backend responded with ${gptRes.status}: ${gptRes.statusText}`);
    }

    if (streamMode) {
      // STREAMING MODE: Fast path - pipe ChatGPT stream → OpenAI stream
      return proxyAndRelayStream({ from: gptRes, to: res, req, payload });
    } else {
      // NON-STREAMING MODE: Slow path - accumulate, parse, convert to OpenAI format
      const fullResponse = await accumulateStream(gptRes);
      
      try {
        const oaiResponse = convertToOpenAIFormat(fullResponse, req, payload);
        return res.json(oaiResponse);
      } catch (convertErr) {
        logError('TRANSLIT', 'Failed to convert ChatGPT response to OpenAI format', convertErr);
        return res.status(502).json({
          error: {
            message: 'Invalid response from ChatGPT backend',
            type: 'chargpt_response_invalid',
            code: 'conversion_failed',
            chargpt_fallback: true
          }
        });
      }
    }
  } catch (err) {
    logError('TRANSLIT', 'ChatGPT completion error', err);
    
    // Use mock response if backend is unavailable
    if (shouldUseMock(err)) {
      if (streamMode) {
        // Handle streaming mock response
        const mockChunks = createMockResponse('/v1/chat/completions/stream', req.body);
        logTranslit('Returning mock streaming chat completion response', { 
          chunkCount: mockChunks.length,
          model: req.body.model
        });

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Send chunks with delay to simulate streaming
        let chunkIndex = 0;
        const sendChunk = () => {
          if (chunkIndex < mockChunks.length) {
            const chunk = mockChunks[chunkIndex];
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            chunkIndex++;
            setTimeout(sendChunk, 50); // 50ms delay between chunks
          } else {
            res.write(`data: [DONE]\n\n`);
            res.end();
          }
        };
        
        sendChunk();
        return;
      } else {
        // Handle non-streaming mock response
        const mockResponse = createMockResponse('/v1/chat/completions', req.body);
        logTranslit('Returning mock chat completion response', { 
          responseId: mockResponse.id,
          model: mockResponse.model 
        });
        return res.json(mockResponse);
      }
    }
    
    // Return structured error response
    const errorResponse = {
      error: {
        message: 'Failed to process ChatGPT response',
        type: 'chargpt_proxy_error',
        code: err.code || 'unknown_error',
        chargpt_fallback: true
      }
    };
    
    if (streamMode) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
      res.end();
    } else {
      res.status(502).json(errorResponse);
    }
  }
});

return router;
};

