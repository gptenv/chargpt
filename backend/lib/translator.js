import crypto from 'crypto';
import { getThread } from './session.js';

// conversationId will be forwarded exactly as provided. If falsy, omit.
export function translateToChatGPT(openaiReq, req, conversationId) {
  const messages = openaiReq.messages || [];
  const lastMessage = messages[messages.length - 1];

  const thread = getThread(req);

  const payload = {
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
  };

  if (conversationId) {
    payload.conversation_id = conversationId;
  }

  return payload;
}

