import { logMock } from './logger.js';

export function createMockResponse(endpoint, requestData = null) {
  const timestamp = Math.floor(Date.now() / 1000);
  
  switch (endpoint) {
    case '/v1/chat/completions':
      logMock('Generating mock chat completion response');
      return {
        id: `chatcmpl-mock-${Date.now()}`,
        object: 'chat.completion',
        created: timestamp,
        model: requestData?.model || 'gpt-4',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: 'Hello! This is a mock response from CharGPT proxy. The real ChatGPT backend is not available, but the proxy is working correctly.',
          },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: requestData?.messages?.reduce((acc, msg) => acc + (msg.content?.length || 0), 0) || 50,
          completion_tokens: 25,
          total_tokens: 75,
        },
      };

    case '/v1/chat/completions/stream':
      logMock('Generating mock streaming chat completion response');
      // Return an array of streaming chunks
      const mockContent = 'Hello! This is a mock streaming response from CharGPT proxy. The real ChatGPT backend is not available, but the proxy is working correctly.';
      const words = mockContent.split(' ');
      const chunks = [];
      
      let currentContent = '';
      for (let i = 0; i < words.length; i++) {
        currentContent += (i > 0 ? ' ' : '') + words[i];
        chunks.push({
          id: `chatcmpl-mock-${Date.now()}`,
          object: 'chat.completion.chunk',
          created: timestamp,
          model: requestData?.model || 'gpt-4',
          choices: [{
            index: 0,
            delta: {
              content: (i > 0 ? ' ' : '') + words[i],
            },
            finish_reason: null,
          }],
        });
      }
      
      // Final chunk
      chunks.push({
        id: `chatcmpl-mock-${Date.now()}`,
        object: 'chat.completion.chunk',
        created: timestamp,
        model: requestData?.model || 'gpt-4',
        choices: [{
          index: 0,
          delta: {},
          finish_reason: 'stop',
        }],
      });
      
      return chunks;

    case '/v1/models':
      logMock('Generating mock models response');
      return {
        object: 'list',
        data: [
          {
            id: 'gpt-4',
            object: 'model',
            created: timestamp,
            owned_by: 'openai',
          },
          {
            id: 'gpt-4-turbo',
            object: 'model',
            created: timestamp,
            owned_by: 'openai',
          },
          {
            id: 'gpt-3.5-turbo',
            object: 'model',
            created: timestamp,
            owned_by: 'openai',
          },
        ],
      };

    case '/v1/me':
    case '/v1/whoami':
    case '/v1/profile':
      logMock(`Generating mock user profile response for ${endpoint}`);
      return {
        id: 'user-mock-12345',
        object: 'user',
        email: 'mock-user@example.com',
        name: 'Mock User',
        picture: null,
        created: timestamp,
      };

    default:
      logMock(`Unknown endpoint for mock: ${endpoint}`);
      return {
        error: {
          message: 'Mock not available for this endpoint',
          type: 'mock_not_available',
          code: 'mock_error'
        }
      };
  }
}

export function shouldUseMock(error) {
  // Use mock responses for network errors or when backend is unavailable
  return error.code === 'EAI_AGAIN' || 
         error.code === 'ENOTFOUND' || 
         error.code === 'ECONNREFUSED' ||
         error.code === 'ETIMEDOUT' ||
         error.name === 'TimeoutError' ||
         error.message?.includes('getaddrinfo') ||
         error.message?.includes('failed') ||
         error.message?.includes('timeout');
}