/**
 * Validation Logger
 * Handles logging for validation middleware with sensitive data sanitization
 */

/**
 * Sanitize sensitive data from objects before logging
 * @param {*} data - Data to sanitize
 * @returns {*} Sanitized data
 */
function sanitizeData(data) {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }

  const sanitized = {};
  const sensitiveFields = [
    'password',
    'privateKey',
    'passphrase',
    'token',
    'secret',
    'apiKey',
    'accessToken',
    'refreshToken',
  ];

  for (const [key, value] of Object.entries(data)) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Logger object for validation middleware
 */
export const logger = {
  /**
   * Log error with context
   * @param {string} context - Context/handler name
   * @param {string} message - Error message
   * @param {*} data - Data to log (will be sanitized)
   */
  error: (context, message, data) => {
    const sanitized = sanitizeData(data);
    console.error(`[${context}] ERROR: ${message}`, sanitized);
  },

  /**
   * Log warning with context
   * @param {string} context - Context/handler name
   * @param {string} message - Warning message
   * @param {*} data - Data to log (will be sanitized)
   */
  warn: (context, message, data) => {
    const sanitized = sanitizeData(data);
    console.warn(`[${context}] WARN: ${message}`, sanitized);
  },

  /**
   * Log info with context
   * @param {string} context - Context/handler name
   * @param {string} message - Info message
   * @param {*} data - Data to log (will be sanitized)
   */
  info: (context, message, data) => {
    const sanitized = sanitizeData(data);
    console.log(`[${context}] INFO: ${message}`, sanitized);
  },

  /**
   * Log debug with context
   * @param {string} context - Context/handler name
   * @param {string} message - Debug message
   * @param {*} data - Data to log (will be sanitized)
   */
  debug: (context, message, data) => {
    const sanitized = sanitizeData(data);
    console.log(`[${context}] DEBUG: ${message}`, sanitized);
  },
};
