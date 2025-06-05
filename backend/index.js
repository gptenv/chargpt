import express from 'express';
import fetch from 'node-fetch';
import { SocksProxyAgent } from 'socks-proxy-agent';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';

dotenvExpand.expand(dotenv.config());

const app = express();
app.use(express.json());

const PORT = process.env.CHARGPT_PORT || 8842;
const BASE = process.env.CHARGPT_API_BASE || 'https://chat.openai.com';
const PROXY = process.env.CHARGPT_PROXY_URL || null;
const AUTH = process.env.CHARGPT_ACCESS_TOKEN;
const UA = process.env.CHARGPT_USER_AGENT || 'Mozilla/5.0';

const agent = PROXY ? new SocksProxyAgent(PROXY) : undefined;

// Temporary test route – you’ll replace this with the OpenAI-compatible /v1/chat/completions handler
app.get('/ping-gpt', async (req, res) => {
  try {
    const url = new URL('/backend-api/models', BASE).href;
    const headers = {
      'User-Agent': UA,
      'Accept': '*/*',
      'Authorization': `Bearer ${AUTH}`,
    };

    const response = await fetch(url, { headers, agent });
    const body = await response.text();

    res.status(200).send(body);
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).send('Fetch failed: ' + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`CharGPT backend running at http://localhost:${PORT}`);
});

