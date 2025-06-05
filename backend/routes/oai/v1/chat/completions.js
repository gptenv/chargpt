import express from 'express';
import fetch from 'node-fetch';
import { translateToChatGPT } from '../../../../lib/translator.js';
import { adaptFromChatGPT } from '../../../../lib/responseAdapter.js';
import { updateThread } from '../../../../lib/session.js';
import { parseChatGPTStreamLine } from '../../../../lib/streamAdapter.js';
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

    if (!streamMode) {
      logTranslit('Processing non-streaming response');
      
      const text = await gptRes.text();
      const lines = text.trim().split('\n');
      const last = lines.reverse().find((l) => l.startsWith('data: '));
      const parsed = JSON.parse(last?.slice(6) || '{}');

      updateThread(req, parsed?.conversation_id, parsed?.message?.id);

      const response = {
        id: parsed?.message?.id || 'chargpt-dummy-id',
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: req.body.model || payload.model,
        choices: [{
          message: {
            role: 'assistant',
            content: parsed?.message?.content?.parts?.[0] || '[empty]',
          },
          index: 0,
          finish_reason: 'stop',
        }],
      };

      logTranslit('Sending OpenAI-compatible response', { 
        responseId: response.id,
        model: response.model 
      });

      res.status(200).json(response);
    } else {
      // STREAMING MODE
      logTranslit('Starting streaming response');
      
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const reader = gptRes.body.getReader();
      let buffer = '';

      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        buffer = lines.pop(); // any incomplete line stays in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          if (line.includes('[DONE]')) {
            logTranslit('Stream completed');
            res.write(`data: [DONE]\n\n`);
            res.end();
            return;
          }

          const content = parseChatGPTStreamLine(line);
          if (content) {
            res.write(`data: ${JSON.stringify({
              choices: [{
                delta: { content },
                index: 0,
                finish_reason: null,
              }],
            })}\n\n`);
          }

          try {
            const parsed = JSON.parse(line.slice(6));
            const convId = parsed?.conversation_id;
            const msgId = parsed?.message?.id;
            if (convId && msgId) {
              updateThread(req, convId, msgId);
            }
          } catch (_) {}
        }
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

