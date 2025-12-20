/**
 * IPC Error Handler Utility
 * Provides standardized error handling and response formatting for all IPC handlers
 * 
 * Usage:
 * ipcMain.handle('some-handler', wrapIPCHandler(async (event, ...args) => {
 *   // handler logic
 *   return data; // will be wrapped in success response
 * }));
 */

class IPCErrorHandler {
  /**
   * Standardized error response format
   * @param {boolean} success - Whether operation succeeded
   * @param {any} data - Response data (if successful)
   * @param {string} error - Error message (if failed)
   * @param {string} code - Error code for categorization
   * @returns {Object} Standardized response object
   */
  static createResponse(success, data = undefined, error = undefined, code = undefined) {
    return {
      success,
      ...(success && data !== undefined && { data }),
      ...(!success && error && { error }),
      ...(code && { code }),
      timestamp: Date.now()
    };
  }

  /**
   * Wrap an IPC handler with error handling and standardized responses
   * @param {Function} handler - The IPC handler function
   * @param {Object} options - Configuration options
   * @returns {Function} Wrapped handler
   */
  static wrapHandler(handler, options = {}) {
    const {
      timeout = 30000, // 30 second default timeout
      retries = 0,
      retryDelay = 1000,
      onError = null
    } = options;

    return async (...args) => {
      let lastError = null;
      let attempt = 0;

      while (attempt <= retries) {
        try {
          // Wrap in timeout promise
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Operation timeout after ${timeout}ms`)), timeout)
          );

          const handlerPromise = handler(...args);
          const result = await Promise.race([handlerPromise, timeoutPromise]);

          // If handler returns already formatted response, return it
          if (result && typeof result === 'object' && 'success' in result) {
            return result;
          }

          // Otherwise wrap successful result
          return IPCErrorHandler.createResponse(true, result);
        } catch (err) {
          lastError = err;
          attempt++;

          // Only retry on specific error types (network timeouts, temporary errors)
          if (attempt <= retries && IPCErrorHandler.isRetryable(err)) {
            console.warn(`Attempt ${attempt} failed, retrying in ${retryDelay}ms...`, err.message);
            await IPCErrorHandler.delay(retryDelay);
          } else {
            break; // Don't retry further
          }
        }
      }

      // All retries exhausted or non-retryable error
      const errorMessage = IPCErrorHandler.sanitizeError(lastError);
      const errorCode = IPCErrorHandler.categorizeError(lastError);

      if (onError) {
        onError(lastError);
      }

      return IPCErrorHandler.createResponse(false, undefined, errorMessage, errorCode);
    };
  }

  /**
   * Check if an error is retryable (transient failures)
   * @param {Error} error - The error to check
   * @returns {boolean} Whether the error is retryable
   */
  static isRetryable(error) {
    const retryableErrors = [
      'ECONNREFUSED',
      'ECONNRESET',
      'ETIMEDOUT',
      'EHOSTUNREACH',
      'ENETUNREACH',
      'ENOTFOUND'
    ];

    const message = error?.message?.toUpperCase() || '';
    return retryableErrors.some(code => message.includes(code) || error?.code === code);
  }

  /**
   * Categorize errors for client-side handling
   * @param {Error} error - The error to categorize
   * @returns {string} Error category code
   */
  static categorizeError(error) {
    if (!error) return 'UNKNOWN_ERROR';

    const message = (error.message || '').toUpperCase();
    const code = error.code || '';

    // Network errors
    if (code === 'ECONNREFUSED' || message.includes('ECONNREFUSED')) return 'CONNECTION_REFUSED';
    if (code === 'ECONNRESET' || message.includes('ECONNRESET')) return 'CONNECTION_RESET';
    if (code === 'ETIMEDOUT' || message.includes('TIMEOUT')) return 'OPERATION_TIMEOUT';
    if (code === 'EHOSTUNREACH') return 'HOST_UNREACHABLE';
    if (code === 'ENOTFOUND') return 'HOST_NOT_FOUND';

    // SSH errors
    if (message.includes('AUTHENTICATION') || message.includes('AUTH')) return 'AUTHENTICATION_FAILED';
    if (message.includes('PERMISSION') || message.includes('DENIED')) return 'PERMISSION_DENIED';
    if (message.includes('INVALID')) return 'INVALID_INPUT';

    // File/Path errors
    if (message.includes('ENOENT') || message.includes('NOT FOUND')) return 'PATH_NOT_FOUND';
    if (message.includes('EACCES') || message.includes('ACCESS DENIED')) return 'ACCESS_DENIED';

    return 'OPERATION_FAILED';
  }

  /**
   * Sanitize error messages to remove sensitive data
   * @param {Error} error - The error to sanitize
   * @returns {string} Sanitized error message
   */
  static sanitizeError(error) {
    if (!error) return 'Unknown error occurred';

    let message = error.message || error.toString();

    // Remove sensitive patterns
    const sensitivePatterns = [
      /password[:\s='"]+[^\s'"]+/gi,
      /token[:\s='"]+[^\s'"]+/gi,
      /key[:\s='"]+[^\s'"]+/gi,
      /secret[:\s='"]+[^\s'"]+/gi,
      /bearer\s+\S+/gi,
      /authorization[:\s='"]+[^\s'"]+/gi
    ];

    sensitivePatterns.forEach(pattern => {
      message = message.replace(pattern, '[REDACTED]');
    });

    return message;
  }

  /**
   * Utility delay function for retries
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after delay
   */
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default IPCErrorHandler;
