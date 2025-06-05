export function parseChatGPTStreamLine(line) {
  try {
    const json = JSON.parse(line.slice(6)); // remove "data: "
    const text = json?.message?.content?.parts?.[0] || null;
    return text;
  } catch (err) {
    return null;
  }
}

export async function accumulateChatGPTStream(gptRes) {
  const reader = gptRes.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let conversationId = null;
  let messageId = null;
  let fullContent = '';
  let lastValidMessage = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // Keep incomplete line in buffer

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      
      if (line.includes('[DONE]')) {
        // Stream is complete
        if (lastValidMessage && lastValidMessage.message) {
          return {
            conversationId,
            messageId: lastValidMessage.message.id,
            content: lastValidMessage.message.content?.parts?.[0] || fullContent,
            success: true
          };
        }
        return {
          conversationId,
          messageId,
          content: fullContent,
          success: true
        };
      }

      try {
        const parsed = JSON.parse(line.slice(6));
        
        // Extract conversation and message IDs
        if (parsed.conversation_id) {
          conversationId = parsed.conversation_id;
        }
        if (parsed.message?.id) {
          messageId = parsed.message.id;
          lastValidMessage = parsed;
        }

        // Accumulate content from streaming parts
        const contentPart = parsed.message?.content?.parts?.[0];
        if (contentPart && typeof contentPart === 'string') {
          fullContent = contentPart; // ChatGPT sends the full content each time, not deltas
        }
      } catch (parseErr) {
        // Skip malformed lines
        continue;
      }
    }
  }

  // If we get here, stream ended without [DONE]
  if (lastValidMessage && lastValidMessage.message) {
    return {
      conversationId,
      messageId: lastValidMessage.message.id,
      content: lastValidMessage.message.content?.parts?.[0] || fullContent,
      success: true
    };
  }

  return {
    conversationId,
    messageId,
    content: fullContent,
    success: false,
    error: 'Stream ended without proper completion'
  };
}

