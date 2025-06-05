export function parseChatGPTStreamLine(line) {
  try {
    const json = JSON.parse(line.slice(6)); // remove "data: "
    const text = json?.message?.content?.parts?.[0] || null;
    return text;
  } catch (err) {
    return null;
  }
}

