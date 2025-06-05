import express from 'express';
import fetch from 'node-fetch';
import { logProxy, logTranslit, logError } from '../../../lib/logger.js';
import { createMockResponse, shouldUseMock } from '../../../lib/mockResponses.js';

const router = express.Router();

export default ({ BASE, AUTH, UA, agent }) => {

router.get('/v1/models', async (req, res) => {
  logTranslit('Received OpenAI models request');

  const url = new URL('/backend-api/models', BASE).href;
  const headers = {
    'User-Agent': UA,
    'Authorization': `Bearer ${AUTH}`,
    'Content-Type': 'application/json',
  };

  try {
    logProxy('Fetching models from ChatGPT backend', { url });
    
    const gptRes = await fetch(url, {
      method: 'GET',
      headers,
      agent,
    });

    if (!gptRes.ok) {
      throw new Error(`ChatGPT API returned ${gptRes.status}: ${gptRes.statusText}`);
    }

    const data = await gptRes.json();
    
    // Transform ChatGPT models to OpenAI format
    const models = [];
    
    if (data.models && Array.isArray(data.models)) {
      for (const model of data.models) {
        models.push({
          id: model.slug || model.id || 'unknown-model',
          object: 'model',
          created: Math.floor(Date.now() / 1000),
          owned_by: 'openai',
          permission: [{
            id: 'modelperm-' + (model.slug || model.id || 'unknown'),
            object: 'model_permission',
            created: Math.floor(Date.now() / 1000),
            allow_create_engine: false,
            allow_sampling: true,
            allow_logprobs: true,
            allow_search_indices: false,
            allow_view: true,
            allow_fine_tuning: false,
            organization: '*',
            group: null,
            is_blocking: false,
          }],
        });
      }
    }

    // Add default models if none were returned
    if (models.length === 0) {
      models.push(
        {
          id: 'gpt-4',
          object: 'model',
          created: Math.floor(Date.now() / 1000),
          owned_by: 'openai',
        },
        {
          id: 'gpt-4-turbo',
          object: 'model',
          created: Math.floor(Date.now() / 1000),
          owned_by: 'openai',
        },
        {
          id: 'gpt-3.5-turbo',
          object: 'model',
          created: Math.floor(Date.now() / 1000),
          owned_by: 'openai',
        }
      );
    }

    const response = {
      object: 'list',
      data: models,
    };

    logTranslit('Returning OpenAI-compatible models response', { 
      modelCount: models.length,
      models: models.map(m => m.id)
    });

    res.json(response);

  } catch (err) {
    logError('TRANSLIT', 'Models endpoint error', err);
    
    // Use mock response if backend is unavailable
    if (shouldUseMock(err)) {
      const mockResponse = createMockResponse('/v1/models');
      logTranslit('Returning mock models response', { 
        modelCount: mockResponse.data.length 
      });
      return res.json(mockResponse);
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