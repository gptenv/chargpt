import express from 'express';
import fetch from 'node-fetch';
import { translateToChatGPT } from '../../../../lib/translator.js';
import { adaptFromChatGPT } from '../../../../lib/responseAdapter.js';
import { updateThread } from '../../../../lib/session.js';
import { parseChatGPTStreamLine, accumulateChatGPTStream } from '../../../../lib/streamAdapter.js';
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

    if (!streamMode) {
      // NON-STREAMING MODE: Accumulate the full stream then return as JSON
      logTranslit('Processing non-streaming response (accumulating stream)');
      
      const result = await accumulateChatGPTStream(gptRes);
      
      if (!result.success) {
        logError('TRANSLIT', 'Failed to accumulate ChatGPT stream', { error: result.error });
        return res.status(502).json({
          error: {
            message: 'Failed to process ChatGPT response stream',
            type: 'chargpt_stream_error',
            code: 'stream_accumulation_failed',
            chargpt_fallback: true
          }
        });
      }

      if (!result.messageId) {
        logError('TRANSLIT', 'No valid message ID in ChatGPT response', result);
        return res.status(502).json({
          error: {
            message: 'Invalid response from ChatGPT backend - missing message ID',
            type: 'chargpt_response_invalid',
            code: 'missing_message_id',
            chargpt_fallback: true
          }
        });
      }

      // Update thread state
      updateThread(req, result.conversationId, result.messageId);

      const response = {
        id: `chatcmpl-${result.messageId}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: req.body.model || payload.model,
        choices: [{
          message: {
            role: 'assistant',
            content: result.content || '',
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

      logTranslit('Sending OpenAI-compatible response', { 
        responseId: response.id,
        model: response.model,
        contentLength: result.content?.length || 0
      });

      res.status(200).json(response);
    } else {
      // STREAMING MODE: Stream the response in real-time
      logTranslit('Starting streaming response');
      
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const reader = gptRes.body.getReader();
      let buffer = '';
      let messageId = null;
      let conversationId = null;
      let hasStarted = false;

      const decoder = new TextDecoder('utf-8');

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
              logTranslit('Stream completed');
              
              // Update thread state if we have the IDs
              if (conversationId && messageId) {
                updateThread(req, conversationId, messageId);
              }
              
              res.write(`data: [DONE]\n\n`);
              res.end();
              return;
            }

            const content = parseChatGPTStreamLine(line);
            if (content) {
              if (!hasStarted) {
                hasStarted = true;
                logTranslit('First content chunk received, starting stream');
              }
              
              res.write(`data: ${JSON.stringify({
                id: messageId ? `chatcmpl-${messageId}` : 'chatcmpl-streaming',
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: req.body.model || payload.model,
                choices: [{
                  delta: { content },
                  index: 0,
                  finish_reason: null,
                }],
              })}\n\n`);
            }

            // Extract conversation and message IDs for thread management
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.conversation_id) {
                conversationId = parsed.conversation_id;
              }
              if (parsed.message?.id) {
                messageId = parsed.message.id;
              }
            } catch (_) {
              // Skip malformed lines
            }
          }
        }
        
        // If we reach here, stream ended without [DONE]
        logTranslit('Stream ended without [DONE] marker');
        if (conversationId && messageId) {
          updateThread(req, conversationId, messageId);
        }
        res.write(`data: [DONE]\n\n`);
        res.end();
        
      } catch (streamErr) {
        logError('TRANSLIT', 'Error during streaming', streamErr);
        res.write(`data: ${JSON.stringify({
          error: {
            message: 'Stream processing error',
            type: 'chargpt_stream_error'
          }
        })}\n\n`);
        res.end();
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
    
    res.status(500).json({ 
      error: {
        message: err.message,
        type: 'chargpt_proxy_error',
        code: err.code || 'unknown_error'
      }
    });
  }
});

return router;
};

