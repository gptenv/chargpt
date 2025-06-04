// index.js
import express from 'express';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
const PORT = process.env.CHARGPT_PORT || 8842;

const BASE_URL = process.env.CHARGPT_BACKEND_API_URL || 'https://chat.openai.com/backend-api/conversation';
const ACCESS_TOKEN = process.env.CHARGPT_ACCESS_TOKEN || null;

if (!ACCESS_TOKEN) {
  console.warn('[WARN] CHARGPT_ACCESS_TOKEN not set. Requests will fail unless you fix your life.');
}

app.use(bodyParser.json());

app.post('/v1/chat/completions', async (req, res) => {
  console.log('[REQ] /v1/chat/completions', JSON.stringify(req.body, null, 2));

  const mappedPayload = {
    action: 'next',
    messages: req.body.messages || [],
    model: req.body.model || 'gpt-4',
    parent_message_id: req.body.parent_message_id || crypto.randomUUID(),
    // More translation here later
  };

  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': process.env.CHARGPT_USER_AGENT || 'Mozilla/5.0 (CharGPT)',
      },
      body: JSON.stringify(mappedPayload),
    });

    const text = await response.text();

    res.status(response.status).send(text);
  } catch (error) {
    console.error('[ERROR]', error);
    res.status(500).json({ error: 'Proxy request failed', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`CharGPT backend running at http://localhost:${PORT}`);
});

