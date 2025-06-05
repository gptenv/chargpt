import express from 'express';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import { SocksProxyAgent } from 'socks-proxy-agent';
import completionsRoute from './routes/oai/v1/chat/completions.js';
import modelsRoute from './routes/oai/v1/models.js';
import userRoute from './routes/oai/v1/user.js';
import { logProxy, logError } from './lib/logger.js';

dotenvExpand.expand(dotenv.config());

const app = express();
app.use(express.json());

const PORT = process.env.CHARGPT_PORT || 8842;
const BASE = process.env.CHARGPT_API_BASE || 'https://chatgpt.com';
const PROXY = process.env.CHARGPT_PROXY_URL;
const AUTH = process.env.CHARGPT_ACCESS_TOKEN;
const UA = process.env.CHARGPT_USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0';
const TIMEOUT = parseInt(process.env.CHARGPT_TIMEOUT || '30000', 10); // 30 second default timeout

// Log configuration in debug mode
logProxy('Starting CharGPT backend', {
  PORT,
  BASE,
  PROXY: PROXY ? 'configured' : 'none',
  AUTH: AUTH ? 'configured' : 'none',
  UA: UA ? 'configured' : 'default',
  TIMEOUT: `${TIMEOUT}ms`
});

const agent = PROXY ? new SocksProxyAgent(PROXY) : undefined;

// Mount the OpenAI-compatible endpoint(s)
app.use(completionsRoute({ BASE, AUTH, UA, agent, TIMEOUT }));
app.use(modelsRoute({ BASE, AUTH, UA, agent, TIMEOUT }));
app.use(userRoute({ BASE, AUTH, UA, agent, TIMEOUT }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'chargpt-backend',
    timestamp: new Date().toISOString(),
    version: '0.1.0'
  });
});

// 404 handler
app.use((req, res, next) => {
  logProxy(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: {
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      type: 'not_found',
      code: 'route_not_found'
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logError('PROXY', 'Unhandled server error', err);
  res.status(500).json({
    error: {
      message: 'Internal server error',
      type: 'internal_server_error',
      code: 'server_error'
    }
  });
});

app.listen(PORT, () => {
  console.log(`CharGPT backend running at http://localhost:${PORT}`);
});

