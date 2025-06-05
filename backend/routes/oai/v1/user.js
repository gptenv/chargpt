import express from 'express';
import fetch from 'node-fetch';
import { logProxy, logTranslit, logError } from '../../../lib/logger.js';
import { createMockResponse, shouldUseMock } from '../../../lib/mockResponses.js';

const router = express.Router();

export default ({ BASE, AUTH, UA, agent }) => {

// Handle multiple user profile endpoints
const userEndpoints = ['/v1/me', '/v1/whoami', '/v1/profile'];

userEndpoints.forEach(endpoint => {
  router.get(endpoint, async (req, res) => {
    logTranslit(`Received user profile request for ${endpoint}`);

    try {
      // Fetch user data from both ChatGPT endpoints
      const meUrl = new URL('/backend-api/me', BASE).href;
      const settingsUrl = new URL('/backend-api/settings/user', BASE).href;
      
      const headers = {
        'User-Agent': UA,
        'Authorization': `Bearer ${AUTH}`,
        'Content-Type': 'application/json',
      };

      logProxy('Fetching user data from ChatGPT backend', { 
        meUrl, 
        settingsUrl 
      });

      // Fetch both endpoints concurrently
      const [meRes, settingsRes] = await Promise.allSettled([
        fetch(meUrl, { method: 'GET', headers, agent }),
        fetch(settingsUrl, { method: 'GET', headers, agent })
      ]);

      let meData = null;
      let settingsData = null;

      // Process /backend-api/me response
      if (meRes.status === 'fulfilled' && meRes.value.ok) {
        try {
          meData = await meRes.value.json();
        } catch (err) {
          logError('TRANSLIT', 'Failed to parse /backend-api/me response', err);
        }
      } else if (meRes.status === 'rejected') {
        logError('TRANSLIT', 'Failed to fetch /backend-api/me', meRes.reason);
      }

      // Process /backend-api/settings/user response
      if (settingsRes.status === 'fulfilled' && settingsRes.value.ok) {
        try {
          settingsData = await settingsRes.value.json();
        } catch (err) {
          logError('TRANSLIT', 'Failed to parse /backend-api/settings/user response', err);
        }
      } else if (settingsRes.status === 'rejected') {
        logError('TRANSLIT', 'Failed to fetch /backend-api/settings/user', settingsRes.reason);
      }

      // Combine data into OpenAI-compatible format
      const response = {
        id: meData?.id || 'user-unknown',
        object: 'user',
        email: meData?.email || settingsData?.email || null,
        name: meData?.name || settingsData?.name || null,
        picture: meData?.picture || meData?.image || null,
        created: meData?.created ? Math.floor(new Date(meData.created).getTime() / 1000) : Math.floor(Date.now() / 1000),
      };

      // Add additional fields if available
      if (settingsData) {
        if (settingsData.preferences) {
          response.preferences = settingsData.preferences;
        }
        if (settingsData.locale) {
          response.locale = settingsData.locale;
        }
      }

      // If both requests failed, use mock response
      if (!meData && !settingsData && 
          meRes.status === 'rejected' && settingsRes.status === 'rejected') {
        
        // Check if we should use mock based on the first error
        const firstError = meRes.reason || settingsRes.reason;
        if (shouldUseMock(firstError)) {
          const mockResponse = createMockResponse(endpoint);
          logTranslit(`Returning mock user profile response for ${endpoint}`, {
            userId: mockResponse.id
          });
          return res.json(mockResponse);
        }
      }

      logTranslit(`Returning user profile response for ${endpoint}`, {
        userId: response.id,
        hasEmail: !!response.email,
        hasName: !!response.name
      });

      res.json(response);

    } catch (err) {
      logError('TRANSLIT', `User profile endpoint ${endpoint} error`, err);
      
      // Use mock response if backend is unavailable
      if (shouldUseMock(err)) {
        const mockResponse = createMockResponse(endpoint);
        logTranslit(`Returning mock user profile response for ${endpoint}`, {
          userId: mockResponse.id
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
});

return router;
};