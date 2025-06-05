const DEBUG = process.env.CHARGPT_DEBUG === 'true';

export function log(tag, message, data = null) {
  if (!DEBUG) return;
  
  const timestamp = new Date().toISOString();
  const prefix = `[${tag}] ${timestamp}`;
  
  if (data) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

export function logProxy(message, data = null) {
  log('PROXY', message, data);
}

export function logTranslit(message, data = null) {
  log('TRANSLIT', message, data);
}

export function logMock(message, data = null) {
  log('MOCK', message, data);
}

export function logError(tag, message, error) {
  const timestamp = new Date().toISOString();
  const prefix = `[${tag}] ${timestamp}`;
  
  console.error(`${prefix} ${message}`);
  if (error) {
    // Log the full error payload as required by AGENTS.md
    console.error(`${prefix} Error details:`, {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      ...(error.cause && { cause: error.cause }),
    });
  }
}