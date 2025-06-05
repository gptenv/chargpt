import express from 'express';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import { SocksProxyAgent } from 'socks-proxy-agent';
import completionsRoute from './routes/oai/v1/chat/completions.js';

dotenvExpand.expand(dotenv.config());

const app = express();
app.use(express.json());

const PORT = process.env.CHARGPT_PORT || 8842;
const BASE = process.env.CHARGPT_API_BASE;
const PROXY = process.env.CHARGPT_PROXY_URL;
const AUTH = process.env.CHARGPT_ACCESS_TOKEN;
const UA = process.env.CHARGPT_USER_AGENT;

const agent = PROXY ? new SocksProxyAgent(PROXY) : undefined;

// Mount the OpenAI-compatible endpoint(s)
app.use(completionsRoute({ BASE, AUTH, UA, agent }));

app.listen(PORT, () => {
  console.log(`CharGPT backend running at http://localhost:${PORT}`);
});

