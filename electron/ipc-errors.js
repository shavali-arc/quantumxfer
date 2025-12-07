/**
 * Standardized IPC Error Types and Codes
 * 
 * All IPC communication follows a consistent error format:
 * {
 *   success: boolean,
 *   error?: {
 *     code: string,
 *     message: string,
 *     details?: any,
 *     timestamp?: string
 *   },
 *   data?: any
 * }
 */

/**
 * Error category definitions
 */
export const ErrorCategory = {
  VALIDATION: 'VALIDATION_ERROR',
  AUTHENTICATION: 'AUTH_ERROR',
  AUTHORIZATION: 'AUTHZ_ERROR',
  NOT_FOUND: 'NOT_FOUND_ERROR',
  CONFLICT: 'CONFLICT_ERROR',
  TIMEOUT: 'TIMEOUT_ERROR',
  NETWORK: 'NETWORK_ERROR',
  SSH: 'SSH_ERROR',
  FILE: 'FILE_ERROR',
  SYSTEM: 'SYSTEM_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR'
};

/**
 * Detailed error codes for each category
 */
export const ErrorCode = {
  // Validation errors (1000-1999)
  VALIDATION_MISSING_FIELD: 'VALIDATION_MISSING_FIELD',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
  VALIDATION_INVALID_TYPE: 'VALIDATION_INVALID_TYPE',
  VALIDATION_OUT_OF_RANGE: 'VALIDATION_OUT_OF_RANGE',
  VALIDATION_INVALID_CONFIG: 'VALIDATION_INVALID_CONFIG',

  // Authentication errors (2000-2999)
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_FAILED: 'AUTH_FAILED',
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  AUTH_INVALID_TOKEN: 'AUTH_INVALID_TOKEN',

  // Authorization errors (3000-3999)
  AUTHZ_PERMISSION_DENIED: 'AUTHZ_PERMISSION_DENIED',
  AUTHZ_INSUFFICIENT_PRIVILEGES: 'AUTHZ_INSUFFICIENT_PRIVILEGES',
  AUTHZ_RESOURCE_ACCESS_DENIED: 'AUTHZ_RESOURCE_ACCESS_DENIED',

  // Not found errors (4000-4999)
  NOT_FOUND_CONNECTION: 'NOT_FOUND_CONNECTION',
  NOT_FOUND_FILE: 'NOT_FOUND_FILE',
  NOT_FOUND_DIRECTORY: 'NOT_FOUND_DIRECTORY',
  NOT_FOUND_RESOURCE: 'NOT_FOUND_RESOURCE',

  // Conflict errors (5000-5999)
  CONFLICT_ALREADY_EXISTS: 'CONFLICT_ALREADY_EXISTS',
  CONFLICT_DUPLICATE_CONNECTION: 'CONFLICT_DUPLICATE_CONNECTION',
  CONFLICT_ALREADY_CONNECTED: 'CONFLICT_ALREADY_CONNECTED',
  CONFLICT_DUPLICATE_BOOKMARK: 'CONFLICT_DUPLICATE_BOOKMARK',

  // Timeout errors (6000-6999)
  TIMEOUT_CONNECTION: 'TIMEOUT_CONNECTION',
  TIMEOUT_COMMAND: 'TIMEOUT_COMMAND',
  TIMEOUT_TRANSFER: 'TIMEOUT_TRANSFER',
  TIMEOUT_OPERATION: 'TIMEOUT_OPERATION',

  // Network errors (7000-7999)
  NETWORK_CONNECTION_REFUSED: 'NETWORK_CONNECTION_REFUSED',
  NETWORK_CONNECTION_RESET: 'NETWORK_CONNECTION_RESET',
  NETWORK_HOST_UNREACHABLE: 'NETWORK_HOST_UNREACHABLE',
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',

  // SSH errors (8000-8999)
  SSH_CONNECT_FAILED: 'SSH_CONNECT_FAILED',
  SSH_AUTH_FAILED: 'SSH_AUTH_FAILED',
  SSH_KEY_INVALID: 'SSH_KEY_INVALID',
  SSH_COMMAND_FAILED: 'SSH_COMMAND_FAILED',
  SSH_SFTP_FAILED: 'SSH_SFTP_FAILED',
  SSH_CHANNEL_OPEN_FAILED: 'SSH_CHANNEL_OPEN_FAILED',
  SSH_CHANNEL_EXEC_FAILED: 'SSH_CHANNEL_EXEC_FAILED',

  // File errors (9000-9999)
  FILE_READ_FAILED: 'FILE_READ_FAILED',
  FILE_WRITE_FAILED: 'FILE_WRITE_FAILED',
  FILE_PERMISSION_DENIED: 'FILE_PERMISSION_DENIED',
  FILE_IN_USE: 'FILE_IN_USE',
  FILE_DISK_SPACE_EXCEEDED: 'FILE_DISK_SPACE_EXCEEDED',
  FILE_CORRUPTED: 'FILE_CORRUPTED',

  // System errors (10000-10999)
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  SYSTEM_RESOURCE_EXHAUSTED: 'SYSTEM_RESOURCE_EXHAUSTED',
  SYSTEM_OPERATION_NOT_SUPPORTED: 'SYSTEM_OPERATION_NOT_SUPPORTED',

  // Unknown errors (11000+)
  UNKNOWN: 'UNKNOWN_ERROR'
};

/**
 * HTTP-like status codes for IPC errors
 * Maps error codes to appropriate HTTP status codes for API consistency
 */
export const ErrorStatusCode = {
  // Validation (400)
  VALIDATION_MISSING_FIELD: 400,
  VALIDATION_INVALID_FORMAT: 400,
  VALIDATION_INVALID_TYPE: 400,
  VALIDATION_OUT_OF_RANGE: 400,
  VALIDATION_INVALID_CONFIG: 400,

  // Authentication (401)
  AUTH_REQUIRED: 401,
  AUTH_FAILED: 401,
  AUTH_INVALID_CREDENTIALS: 401,
  AUTH_SESSION_EXPIRED: 401,
  AUTH_INVALID_TOKEN: 401,

  // Authorization (403)
  AUTHZ_PERMISSION_DENIED: 403,
  AUTHZ_INSUFFICIENT_PRIVILEGES: 403,
  AUTHZ_RESOURCE_ACCESS_DENIED: 403,

  // Not Found (404)
  NOT_FOUND_CONNECTION: 404,
  NOT_FOUND_FILE: 404,
  NOT_FOUND_DIRECTORY: 404,
  NOT_FOUND_RESOURCE: 404,

  // Conflict (409)
  CONFLICT_ALREADY_EXISTS: 409,
  CONFLICT_DUPLICATE_CONNECTION: 409,
  CONFLICT_ALREADY_CONNECTED: 409,
  CONFLICT_DUPLICATE_BOOKMARK: 409,

  // Timeout (408)
  TIMEOUT_CONNECTION: 408,
  TIMEOUT_COMMAND: 408,
  TIMEOUT_TRANSFER: 408,
  TIMEOUT_OPERATION: 408,

  // Network (503)
  NETWORK_CONNECTION_REFUSED: 503,
  NETWORK_CONNECTION_RESET: 503,
  NETWORK_HOST_UNREACHABLE: 503,
  NETWORK_TIMEOUT: 503,

  // SSH (502)
  SSH_CONNECT_FAILED: 502,
  SSH_AUTH_FAILED: 502,
  SSH_KEY_INVALID: 502,
  SSH_COMMAND_FAILED: 502,
  SSH_SFTP_FAILED: 502,
  SSH_CHANNEL_OPEN_FAILED: 502,
  SSH_CHANNEL_EXEC_FAILED: 502,

  // File (422)
  FILE_READ_FAILED: 422,
  FILE_WRITE_FAILED: 422,
  FILE_PERMISSION_DENIED: 422,
  FILE_IN_USE: 422,
  FILE_DISK_SPACE_EXCEEDED: 422,
  FILE_CORRUPTED: 422,

  // System (500)
  SYSTEM_ERROR: 500,
  SYSTEM_RESOURCE_EXHAUSTED: 500,
  SYSTEM_OPERATION_NOT_SUPPORTED: 501,

  // Unknown (500)
  UNKNOWN_ERROR: 500
};

/**
 * Human-readable error messages
 */
export const ErrorMessages = {
  // Validation
  VALIDATION_MISSING_FIELD: 'Required field is missing: {field}',
  VALIDATION_INVALID_FORMAT: 'Invalid format for {field}: expected {expected}',
  VALIDATION_INVALID_TYPE: '{field} must be of type {type}',
  VALIDATION_OUT_OF_RANGE: '{field} is out of valid range: {range}',
  VALIDATION_INVALID_CONFIG: 'Invalid configuration: {reason}',

  // Authentication
  AUTH_REQUIRED: 'Authentication is required',
  AUTH_FAILED: 'Authentication failed',
  AUTH_INVALID_CREDENTIALS: 'Invalid username or password',
  AUTH_SESSION_EXPIRED: 'Session has expired',
  AUTH_INVALID_TOKEN: 'Invalid authentication token',

  // Authorization
  AUTHZ_PERMISSION_DENIED: 'Permission denied',
  AUTHZ_INSUFFICIENT_PRIVILEGES: 'Insufficient privileges to perform this action',
  AUTHZ_RESOURCE_ACCESS_DENIED: 'Access to this resource is denied',

  // Not Found
  NOT_FOUND_CONNECTION: 'Connection not found: {id}',
  NOT_FOUND_FILE: 'File not found: {path}',
  NOT_FOUND_DIRECTORY: 'Directory not found: {path}',
  NOT_FOUND_RESOURCE: 'Resource not found: {id}',

  // Conflict
  CONFLICT_ALREADY_EXISTS: 'Resource already exists: {name}',
  CONFLICT_DUPLICATE_CONNECTION: 'Connection already exists for {host}',
  CONFLICT_ALREADY_CONNECTED: 'Already connected to {host}',
  CONFLICT_DUPLICATE_BOOKMARK: 'Bookmark with this name already exists',

  // Timeout
  TIMEOUT_CONNECTION: 'Connection timeout after {timeout}ms',
  TIMEOUT_COMMAND: 'Command timeout after {timeout}ms',
  TIMEOUT_TRANSFER: 'Transfer timeout after {timeout}ms',
  TIMEOUT_OPERATION: 'Operation timeout after {timeout}ms',

  // Network
  NETWORK_CONNECTION_REFUSED: 'Connection refused to {host}:{port}',
  NETWORK_CONNECTION_RESET: 'Connection reset by {host}',
  NETWORK_HOST_UNREACHABLE: 'Host unreachable: {host}',
  NETWORK_TIMEOUT: 'Network timeout',

  // SSH
  SSH_CONNECT_FAILED: 'SSH connection failed: {reason}',
  SSH_AUTH_FAILED: 'SSH authentication failed',
  SSH_KEY_INVALID: 'SSH private key is invalid or corrupted',
  SSH_COMMAND_FAILED: 'SSH command failed with exit code {exitCode}',
  SSH_SFTP_FAILED: 'SFTP subsystem initialization failed',
  SSH_CHANNEL_OPEN_FAILED: 'Failed to open SSH channel: {reason}',
  SSH_CHANNEL_EXEC_FAILED: 'Failed to execute command on SSH channel',

  // File
  FILE_READ_FAILED: 'Failed to read file: {path}',
  FILE_WRITE_FAILED: 'Failed to write file: {path}',
  FILE_PERMISSION_DENIED: 'Permission denied: {path}',
  FILE_IN_USE: 'File is in use: {path}',
  FILE_DISK_SPACE_EXCEEDED: 'Not enough disk space to complete operation',
  FILE_CORRUPTED: 'File appears to be corrupted: {path}',

  // System
  SYSTEM_ERROR: 'System error: {reason}',
  SYSTEM_RESOURCE_EXHAUSTED: 'System resources exhausted: {resource}',
  SYSTEM_OPERATION_NOT_SUPPORTED: 'Operation not supported on this platform',

  // Unknown
  UNKNOWN_ERROR: 'An unknown error occurred'
};

/**
 * StandardizedError class for IPC communication
 */
export class StandardizedError extends Error {
  constructor(options = {}) {
    const {
      code = ErrorCode.UNKNOWN,
      message = ErrorMessages[code] || 'An error occurred',
      details = {},
      originalError = null,
      timestamp = new Date().toISOString()
    } = options;

    super(message);
    this.name = 'StandardizedError';
    this.code = code;
    this.message = message;
    this.details = details;
    this.timestamp = timestamp;
    this.originalError = originalError;
    this.statusCode = ErrorStatusCode[code] || 500;

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, StandardizedError.prototype);
  }

  /**
   * Convert to IPC response format
   */
  toIPCResponse() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: this.timestamp
      }
    };
  }

  /**
   * Convert to JSON for logging
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
      statusCode: this.statusCode,
      originalMessage: this.originalError?.message
    };
  }
}

/**
 * Utility function to format error messages with placeholders
 * @param {string} template - Message template with {placeholder} syntax
 * @param {object} values - Values to substitute
 * @returns {string} Formatted message
 */
export function formatErrorMessage(template, values = {}) {
  if (!template) return '';
  
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return values[key] !== undefined ? String(values[key]) : match;
  });
}

/**
 * Helper to create standardized error from native Error
 */
export function createStandardizedError(nativeError, code = ErrorCode.UNKNOWN, details = {}) {
  return new StandardizedError({
    code,
    message: nativeError.message,
    details: {
      ...details,
      originalError: nativeError.message
    },
    originalError: nativeError
  });
}

/**
 * Error categorization helper - maps error types to error codes
 */
export function categorizeError(error) {
  if (error instanceof StandardizedError) {
    return error;
  }

  const message = (error.message || error.toString()).toLowerCase();

  // SSH-related errors
  if (message.includes('ssh') || message.includes('sftp')) {
    if (message.includes('auth') || message.includes('permission')) {
      return new StandardizedError({
        code: ErrorCode.SSH_AUTH_FAILED,
        details: { originalError: message },
        originalError: error
      });
    }
    if (message.includes('timeout')) {
      return new StandardizedError({
        code: ErrorCode.TIMEOUT_CONNECTION,
        details: { originalError: message },
        originalError: error
      });
    }
    return new StandardizedError({
      code: ErrorCode.SSH_CONNECT_FAILED,
      details: { reason: message, originalError: message },
      originalError: error
    });
  }

  // File-related errors
  if (message.includes('file') || message.includes('enoent') || message.includes('no such file')) {
    return new StandardizedError({
      code: ErrorCode.NOT_FOUND_FILE,
      details: { originalError: message },
      originalError: error
    });
  }
  if (message.includes('permission') || message.includes('eacces')) {
    return new StandardizedError({
      code: ErrorCode.FILE_PERMISSION_DENIED,
      details: { originalError: message },
      originalError: error
    });
  }

  // Network-related errors
  if (message.includes('econnrefused')) {
    return new StandardizedError({
      code: ErrorCode.NETWORK_CONNECTION_REFUSED,
      details: { originalError: message },
      originalError: error
    });
  }
  if (message.includes('timeout') || message.includes('etimeout')) {
    return new StandardizedError({
      code: ErrorCode.TIMEOUT_OPERATION,
      details: { originalError: message },
      originalError: error
    });
  }

  // Generic system error
  return new StandardizedError({
    code: ErrorCode.SYSTEM_ERROR,
    message: error.message || 'A system error occurred',
    details: { originalError: message },
    originalError: error
  });
}

export default {
  ErrorCategory,
  ErrorCode,
  ErrorStatusCode,
  ErrorMessages,
  StandardizedError,
  formatErrorMessage,
  createStandardizedError,
  categorizeError
};
