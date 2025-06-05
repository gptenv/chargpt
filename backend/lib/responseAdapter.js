export function adaptFromChatGPT(chatgptResponse, originalModel = 'gpt-4') {
  // Handle non-streaming response adaptation
  if (chatgptResponse?.message) {
    return {
      id: chatgptResponse.message.id || 'chargpt-dummy-id',
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: originalModel,
      choices: [{
        message: {
          role: 'assistant',
          content: chatgptResponse.message.content?.parts?.[0] || '[empty]',
        },
        index: 0,
        finish_reason: 'stop',
      }],
      usage: {
        prompt_tokens: 0, // ChatGPT doesn't provide token counts
        completion_tokens: 0,
        total_tokens: 0,
      },
    };
  }

  // Handle streaming delta adaptation
  if (chatgptResponse?.delta || chatgptResponse?.content) {
    const content = chatgptResponse.delta || chatgptResponse.content;
    return {
      id: chatgptResponse.id || 'chargpt-stream-id',
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: originalModel,
      choices: [{
        delta: {
          content: content,
        },
        index: 0,
        finish_reason: null,
      }],
    };
  }

  // Fallback for unknown format
  return {
    id: 'chargpt-fallback-id',
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: originalModel,
    choices: [{
      message: {
        role: 'assistant',
        content: '[Unable to parse ChatGPT response]',
      },
      index: 0,
      finish_reason: 'stop',
    }],
  };
}