import express from 'express';
import fetch from 'node-fetch';
import { translateToChatGPT } from '../../../../lib/translator.js';
import { adaptFromChatGPT } from '../../../../lib/responseAdapter.js';
import { updateThread } from '../../../../lib/session.js';
import { parseChatGPTStreamLine } from '../../../../lib/streamAdapter.js';

const router = express.Router();

export default ({ BASE, AUTH, UA, agent }) => {

router.post('/v1/chat/completions', async (req, res) => {
  const url = new URL('/backend-api/conversation', BASE).href;
  const headers = {
    'User-Agent': UA,
    'Authorization': `Bearer ${AUTH}`,
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
  };

  const payload = translateToChatGPT(req.body, req);
  const streamMode = req.body.stream === true;

  try {
    const gptRes = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      agent,
    });

    if (!streamMode) {
      const text = await gptRes.text();
      const lines = text.trim().split('\n');
      const last = lines.reverse().find((l) => l.startsWith('data: '));
      const parsed = JSON.parse(last?.slice(6) || '{}');

      updateThread(req, parsed?.conversation_id, parsed?.message?.id);

      res.status(200).json({
        id: parsed?.message?.id || 'chargpt-dummy-id',
        object: 'chat.completion',
        created: Date.now(),
        model: payload.model,
        choices: [{
          message: {
            role: 'assistant',
            content: parsed?.message?.content?.parts?.[0] || '[empty]',
          },
          index: 0,
          finish_reason: 'stop',
        }],
      });
    } else {
      // STREAMING MODE
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
    console.error('CharGPT stream error:', err);
    res.status(500).json({ error: err.message });
  }
});

};

