import crypto from 'crypto';
import { getThread } from './session.js';

export function translateToChatGPT(openaiReq, req) {
  const messages = openaiReq.messages || [];
  const lastMessage = messages[messages.length - 1];

  const thread = getThread(req);

  return {
    action: 'next',
    messages: [
      {
        role: 'user',
        content: {
          content_type: 'text',
          parts: [lastMessage?.content || ''],
        },
      },
    ],
    model: openaiReq.model || 'gpt-4-1-mini',
    //model: openaiReq.model || 'text-davinci-002-render-sha',
    parent_message_id: thread?.parentMessageId || crypto.randomUUID(),
    conversation_id: thread?.conversationId, // optional
  };
}

