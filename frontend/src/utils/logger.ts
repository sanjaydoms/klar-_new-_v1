export const redactPII = (data: any): any => {
  if (!data) return data;
  if (typeof data === 'string') {
    // Redact passports
    data = data.replace(/[A-Z]{1,2}[0-9]{7}/g, '********');
    // Redact PAN
    data = data.replace(/[A-Z]{5}[0-9]{4}[A-Z]{1}/g, '**********');
    // Redact Credit Cards
    data = data.replace(/(?:\d[ -]*?){13,16}/g, '****-****-****-****');
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(redactPII);
  }

  if (typeof data === 'object') {
    const redacted: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (['password', 'passportNumber', 'panNumber', 'cardNumber', 'cvv'].includes(key)) {
        redacted[key] = '********';
      } else {
        redacted[key] = redactPII(value);
      }
    }
    return redacted;
  }

  return data;
};

const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  info: (message: string, data?: any) => {
    if (isDev) {
      if (data) {
        console.log(`[INFO] ${message}`, redactPII(JSON.parse(JSON.stringify(data))));
      } else {
        console.log(`[INFO] ${message}`);
      }
    }
  },
  warn: (message: string, data?: any) => {
    if (isDev) {
      if (data) {
        console.warn(`[WARN] ${message}`, redactPII(JSON.parse(JSON.stringify(data))));
      } else {
        console.warn(`[WARN] ${message}`);
      }
    }
  },
  error: (message: string, data?: any) => {
    if (isDev) {
      if (data) {
        console.error(`[ERROR] ${message}`, redactPII(JSON.parse(JSON.stringify(data))));
      } else {
        console.error(`[ERROR] ${message}`);
      }
    }
  },
};
