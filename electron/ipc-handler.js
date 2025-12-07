/**
 * IPC Error Handler Utilities
 * 
 * Provides wrapper functions and utilities for consistent error handling
 * across all IPC handlers with automatic logging integration.
 */

let logger;

// Lazy-load logger to avoid circular dependencies in tests
try {
  const loggerModule = await import('./logger.js');
  logger = loggerModule.logger || loggerModule.default;
} catch (e) {
  // Logger not available (e.g., in test environment without mock)
  logger = {
    debug: () => {},
    error: () => {},
    warn: () => {},
    info: () => {}
  };
}

import {
  StandardizedError,
  ErrorCode,
  categorizeError,
  formatErrorMessage,
  ErrorMessages
} from './ipc-errors.js';

/**
 * Wraps an IPC handler function with standardized error handling
 * 
 * @param {string} handlerName - Name of the IPC handler for logging
 * @param {Function} handlerFn - The actual handler function (async)
 * @returns {Function} Wrapped handler that catches and standardizes errors
 */
export function createIPCHandler(handlerName, handlerFn) {
  return async (event, ...args) => {
    const startTime = Date.now();
    const requestId = `${handlerName}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    try {
      logger.debug(`[IPC] ${handlerName} request started`, {
        requestId,
        args: sanitizeArgs(args)
      });

      const result = await handlerFn(event, ...args);

      logger.debug(`[IPC] ${handlerName} completed successfully`, {
        requestId,
        duration: Date.now() - startTime
      });

      // Ensure result follows IPC response format
      if (result && typeof result === 'object' && 'success' in result) {
        return result;
      }

      // Wrap non-standard responses
      return {
        success: true,
        data: result
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      // Categorize and standardize the error
      const standardizedError = error instanceof StandardizedError
        ? error
        : categorizeError(error);

      // Log the error with context
      logger.error(`[IPC] ${handlerName} failed`, {
        requestId,
        error: standardizedError.toJSON(),
        duration,
        args: sanitizeArgs(args)
      });

      // Return standardized error response
      return standardizedError.toIPCResponse();
    }
  };
}

/**
 * Creates an IPC handler with validation
 * 
 * @param {string} handlerName - Name of the IPC handler
 * @param {Function} validatorFn - Validator function that throws if validation fails
 * @param {Function} handlerFn - The actual handler function
 * @returns {Function} Wrapped handler with validation
 */
export function createValidatedIPCHandler(handlerName, validatorFn, handlerFn) {
  return createIPCHandler(handlerName, async (event, ...args) => {
    try {
      await validatorFn(...args);
    } catch (validationError) {
      throw new StandardizedError({
        code: ErrorCode.VALIDATION_INVALID_FORMAT,
        message: validationError.message || 'Validation failed',
        details: {
          validator: handlerName,
          originalError: validationError.message
        }
      });
    }

    return handlerFn(event, ...args);
  });
}

/**
 * Standardize success response
 * 
 * @param {any} data - Data to return
 * @param {string} message - Optional success message
 * @returns {object} IPC response
 */
export function successResponse(data = null, message = null) {
  return {
    success: true,
    ...(data !== null && { data }),
    ...(message && { message })
  };
}

/**
 * Standardize error response
 * 
 * @param {StandardizedError|Error|string} error - Error to return
 * @param {string} code - Optional error code override
 * @returns {object} IPC error response
 */
export function errorResponse(error, code = null) {
  let standardizedError;

  if (typeof error === 'string') {
    standardizedError = new StandardizedError({
      code: code || ErrorCode.UNKNOWN,
      message: error
    });
  } else if (error instanceof StandardizedError) {
    standardizedError = error;
  } else {
    standardizedError = categorizeError(error);
    if (code) {
      standardizedError.code = code;
    }
  }

  return standardizedError.toIPCResponse();
}

/**
 * Create a specific error with code and formatted message
 * 
 * @param {string} errorCode - Error code from ErrorCode
 * @param {object} details - Details to format into message
 * @returns {StandardizedError}
 */
export function createError(errorCode, details = {}) {
  const template = ErrorMessages[errorCode] || 'An error occurred';
  const message = formatErrorMessage(template, details);

  return new StandardizedError({
    code: errorCode,
    message,
    details
  });
}

/**
 * Validate required fields in request
 * 
 * @param {object} data - Data object to validate
 * @param {string[]} requiredFields - List of required field names
 * @throws {StandardizedError} If any required field is missing
 */
export function validateRequired(data, requiredFields = []) {
  for (const field of requiredFields) {
    if (!(field in data) || data[field] === null || data[field] === undefined) {
      throw createError(ErrorCode.VALIDATION_MISSING_FIELD, { field });
    }
  }
}

/**
 * Validate field types
 * 
 * @param {object} data - Data object to validate
 * @param {object} schema - Schema with field names and types
 * @throws {StandardizedError} If field type doesn't match
 */
export function validateTypes(data, schema = {}) {
  for (const [field, expectedType] of Object.entries(schema)) {
    if (!(field in data)) continue; // Skip missing fields (use validateRequired separately)

    const actualType = typeof data[field];
    const isArray = Array.isArray(data[field]);

    // Handle array type check
    if (expectedType === 'array') {
      if (!isArray) {
        throw createError(ErrorCode.VALIDATION_INVALID_TYPE, {
          field,
          type: 'array'
        });
      }
    } else if (actualType !== expectedType) {
      throw createError(ErrorCode.VALIDATION_INVALID_TYPE, {
        field,
        type: expectedType
      });
    }
  }
}

/**
 * Validate a value is within a range
 * 
 * @param {number} value - Value to validate
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @param {string} fieldName - Field name for error message
 * @throws {StandardizedError} If value is out of range
 */
export function validateRange(value, min, max, fieldName = 'value') {
  if (value < min || value > max) {
    throw createError(ErrorCode.VALIDATION_OUT_OF_RANGE, {
      field: fieldName,
      range: `${min}-${max}`
    });
  }
}

/**
 * Safely handle SSH-specific errors
 * Maps SSH library errors to standardized error codes
 * 
 * @param {Error} error - SSH library error
 * @returns {StandardizedError}
 */
export function handleSSHError(error) {
  const message = (error.message || '').toLowerCase();

  if (message.includes('authentication') || message.includes('auth failed')) {
    return createError(ErrorCode.SSH_AUTH_FAILED);
  }
  if (message.includes('key') || message.includes('private key')) {
    return createError(ErrorCode.SSH_KEY_INVALID);
  }
  if (message.includes('timeout')) {
    return createError(ErrorCode.TIMEOUT_CONNECTION, { timeout: '30000' });
  }
  if (message.includes('sftp')) {
    return createError(ErrorCode.SSH_SFTP_FAILED);
  }
  if (message.includes('channel')) {
    return createError(ErrorCode.SSH_CHANNEL_OPEN_FAILED, {
      reason: error.message
    });
  }

  return new StandardizedError({
    code: ErrorCode.SSH_CONNECT_FAILED,
    message: error.message,
    details: { originalError: error.message },
    originalError: error
  });
}

/**
 * Safely handle file system errors
 * Maps fs library errors to standardized error codes
 * 
 * @param {Error} error - File system error
 * @param {string} filePath - File path for context
 * @returns {StandardizedError}
 */
export function handleFileError(error, filePath = '') {
  const code = error.code || '';
  const message = (error.message || '').toLowerCase();

  if (code === 'ENOENT' || message.includes('no such file')) {
    return createError(ErrorCode.NOT_FOUND_FILE, { path: filePath });
  }
  if (code === 'EACCES' || message.includes('permission denied')) {
    return createError(ErrorCode.FILE_PERMISSION_DENIED, { path: filePath });
  }
  if (code === 'EBUSY' || message.includes('file is in use')) {
    return createError(ErrorCode.FILE_IN_USE, { path: filePath });
  }
  if (code === 'ENOSPC' || message.includes('no space')) {
    return createError(ErrorCode.FILE_DISK_SPACE_EXCEEDED);
  }

  return new StandardizedError({
    code: ErrorCode.FILE_READ_FAILED,
    message: error.message,
    details: { path: filePath, originalError: error.message },
    originalError: error
  });
}

/**
 * Safely handle network-related errors
 * 
 * @param {Error} error - Network error
 * @param {string} host - Host for context
 * @returns {StandardizedError}
 */
export function handleNetworkError(error, host = '') {
  const code = error.code || '';
  const message = (error.message || '').toLowerCase();

  if (code === 'ECONNREFUSED' || message.includes('connection refused')) {
    return createError(ErrorCode.NETWORK_CONNECTION_REFUSED, { host });
  }
  if (code === 'ECONNRESET' || message.includes('connection reset')) {
    return createError(ErrorCode.NETWORK_CONNECTION_RESET, { host });
  }
  if (code === 'EHOSTUNREACH' || message.includes('host unreachable')) {
    return createError(ErrorCode.NETWORK_HOST_UNREACHABLE, { host });
  }
  if (code === 'ETIMEDOUT' || message.includes('timeout')) {
    return createError(ErrorCode.NETWORK_TIMEOUT);
  }

  return new StandardizedError({
    code: ErrorCode.SYSTEM_ERROR,
    message: error.message,
    details: { host, originalError: error.message },
    originalError: error
  });
}

/**
 * Sanitize arguments for logging (removes sensitive data)
 * 
 * @param {array} args - Arguments to sanitize
 * @returns {array} Sanitized arguments
 */
function sanitizeArgs(args) {
  if (!Array.isArray(args)) return args;

  return args.map(arg => {
    if (typeof arg !== 'object' || arg === null) {
      return arg;
    }

    const sanitized = { ...arg };
    const sensitiveFields = ['password', 'passphrase', 'token', 'secret', 'apiKey', 'privateKey'];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  });
}

/**
 * Batch operation error handler
 * Collects errors from multiple operations and returns a summary
 * 
 * @param {array} operations - Array of operations to perform
 * @returns {object} Result with succeeded/failed arrays
 */
export async function handleBatchOperations(operations = []) {
  const results = {
    succeeded: [],
    failed: [],
    summary: {
      total: operations.length,
      successCount: 0,
      failureCount: 0
    }
  };

  for (const operation of operations) {
    try {
      const result = await operation.fn();
      results.succeeded.push({
        id: operation.id,
        result
      });
      results.summary.successCount++;
    } catch (error) {
      const standardizedError = error instanceof StandardizedError
        ? error
        : categorizeError(error);

      results.failed.push({
        id: operation.id,
        error: standardizedError.toJSON()
      });
      results.summary.failureCount++;
    }
  }

  return results;
}

export default {
  createIPCHandler,
  createValidatedIPCHandler,
  successResponse,
  errorResponse,
  createError,
  validateRequired,
  validateTypes,
  validateRange,
  handleSSHError,
  handleFileError,
  handleNetworkError,
  handleBatchOperations
};
