import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ErrorCode,
  ErrorCategory,
  ErrorStatusCode,
  ErrorMessages,
  StandardizedError,
  formatErrorMessage,
  createStandardizedError,
  categorizeError
} from '../electron/ipc-errors.js';

// Mock the logger before importing ipc-handler
vi.mock('../electron/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

import {
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
} from '../electron/ipc-handler.js';

/**
 * Tests for IPC Error Types and Codes
 */
describe('Error Types and Codes', () => {
  it('should have all error categories defined', () => {
    expect(ErrorCategory.VALIDATION).toBe('VALIDATION_ERROR');
    expect(ErrorCategory.AUTHENTICATION).toBe('AUTH_ERROR');
    expect(ErrorCategory.SSH).toBe('SSH_ERROR');
    expect(ErrorCategory.FILE).toBe('FILE_ERROR');
    expect(ErrorCategory.NETWORK).toBe('NETWORK_ERROR');
  });

  it('should have all error codes defined', () => {
    expect(ErrorCode.VALIDATION_MISSING_FIELD).toBe('VALIDATION_MISSING_FIELD');
    expect(ErrorCode.AUTH_FAILED).toBe('AUTH_FAILED');
    expect(ErrorCode.SSH_AUTH_FAILED).toBe('SSH_AUTH_FAILED');
    expect(ErrorCode.NOT_FOUND_FILE).toBe('NOT_FOUND_FILE');
    expect(ErrorCode.NETWORK_CONNECTION_REFUSED).toBe('NETWORK_CONNECTION_REFUSED');
  });

  it('should map error codes to HTTP status codes', () => {
    expect(ErrorStatusCode.VALIDATION_INVALID_FORMAT).toBe(400);
    expect(ErrorStatusCode.AUTH_FAILED).toBe(401);
    expect(ErrorStatusCode.AUTHZ_PERMISSION_DENIED).toBe(403);
    expect(ErrorStatusCode.NOT_FOUND_FILE).toBe(404);
    expect(ErrorStatusCode.CONFLICT_ALREADY_EXISTS).toBe(409);
    expect(ErrorStatusCode.TIMEOUT_CONNECTION).toBe(408);
    expect(ErrorStatusCode.SSH_CONNECT_FAILED).toBe(502);
    expect(ErrorStatusCode.FILE_READ_FAILED).toBe(422);
    expect(ErrorStatusCode.SYSTEM_ERROR).toBe(500);
  });

  it('should have error messages for all codes', () => {
    const codes = Object.values(ErrorCode);
    for (const code of codes) {
      expect(ErrorMessages[code]).toBeDefined();
      expect(typeof ErrorMessages[code]).toBe('string');
    }
  });
});

/**
 * Tests for StandardizedError class
 */
describe('StandardizedError', () => {
  it('should create error with default values', () => {
    const error = new StandardizedError();
    expect(error.code).toBe(ErrorCode.UNKNOWN);
    expect(error.message).toBeDefined();
    expect(error.timestamp).toBeDefined();
  });

  it('should create error with custom code and message', () => {
    const error = new StandardizedError({
      code: ErrorCode.AUTH_FAILED,
      message: 'Custom auth message'
    });
    expect(error.code).toBe(ErrorCode.AUTH_FAILED);
    expect(error.message).toBe('Custom auth message');
  });

  it('should include details in error', () => {
    const details = { userId: '123', reason: 'invalid token' };
    const error = new StandardizedError({
      code: ErrorCode.AUTH_FAILED,
      details
    });
    expect(error.details).toEqual(details);
  });

  it('should convert to IPC response format', () => {
    const error = new StandardizedError({
      code: ErrorCode.NOT_FOUND_FILE,
      message: 'File not found: test.txt',
      details: { path: 'test.txt' }
    });

    const response = error.toIPCResponse();
    expect(response.success).toBe(false);
    expect(response.error.code).toBe(ErrorCode.NOT_FOUND_FILE);
    expect(response.error.message).toBe('File not found: test.txt');
    expect(response.error.details).toEqual({ path: 'test.txt' });
    expect(response.error.timestamp).toBeDefined();
  });

  it('should convert to JSON for logging', () => {
    const nativeError = new Error('Original error');
    const error = new StandardizedError({
      code: ErrorCode.SYSTEM_ERROR,
      message: 'System error occurred',
      originalError: nativeError
    });

    const json = error.toJSON();
    expect(json.name).toBe('StandardizedError');
    expect(json.code).toBe(ErrorCode.SYSTEM_ERROR);
    expect(json.statusCode).toBe(500);
    expect(json.originalMessage).toBe('Original error');
  });

  it('should maintain proper prototype chain', () => {
    const error = new StandardizedError({
      code: ErrorCode.AUTH_FAILED
    });
    expect(error instanceof StandardizedError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });
});

/**
 * Tests for error message formatting
 */
describe('Error Message Formatting', () => {
  it('should format message with placeholders', () => {
    const formatted = formatErrorMessage(
      'File not found: {path}',
      { path: '/home/user/test.txt' }
    );
    expect(formatted).toBe('File not found: /home/user/test.txt');
  });

  it('should handle multiple placeholders', () => {
    const formatted = formatErrorMessage(
      'Cannot connect to {host}:{port} - {reason}',
      { host: 'localhost', port: 22, reason: 'connection refused' }
    );
    expect(formatted).toBe('Cannot connect to localhost:22 - connection refused');
  });

  it('should leave unmatched placeholders unchanged', () => {
    const formatted = formatErrorMessage(
      'Error in {module} - {details}',
      { module: 'ssh' }
    );
    expect(formatted).toBe('Error in ssh - {details}');
  });

  it('should handle missing template', () => {
    const formatted = formatErrorMessage(null, {});
    expect(formatted).toBe('');
  });
});

/**
 * Tests for creating standardized errors
 */
describe('createStandardizedError', () => {
  it('should create error from native error', () => {
    const nativeError = new Error('Connection timeout');
    const error = createStandardizedError(
      nativeError,
      ErrorCode.TIMEOUT_OPERATION
    );

    expect(error.code).toBe(ErrorCode.TIMEOUT_OPERATION);
    expect(error.message).toBe('Connection timeout');
    expect(error.originalError).toBe(nativeError);
  });

  it('should include custom details', () => {
    const nativeError = new Error('SSH error');
    const error = createStandardizedError(
      nativeError,
      ErrorCode.SSH_CONNECT_FAILED,
      { host: 'example.com', port: 22 }
    );

    expect(error.details.host).toBe('example.com');
    expect(error.details.port).toBe(22);
    expect(error.details.originalError).toBe('SSH error');
  });
});

/**
 * Tests for error categorization
 */
describe('categorizeError', () => {
  it('should return standardized error as-is', () => {
    const error = new StandardizedError({ code: ErrorCode.AUTH_FAILED });
    const categorized = categorizeError(error);
    expect(categorized).toBe(error);
  });

  it('should categorize SSH errors', () => {
    const sshError = new Error('ssh: authentication failed');
    const categorized = categorizeError(sshError);
    expect(categorized.code).toBe(ErrorCode.SSH_AUTH_FAILED);
  });

  it('should categorize file not found errors', () => {
    const fileError = new Error('ENOENT: no such file or directory');
    const categorized = categorizeError(fileError);
    expect(categorized.code).toBe(ErrorCode.NOT_FOUND_FILE);
  });

  it('should categorize permission denied errors', () => {
    const permError = new Error('EACCES: permission denied');
    const categorized = categorizeError(permError);
    expect(categorized.code).toBe(ErrorCode.FILE_PERMISSION_DENIED);
  });

  it('should categorize timeout errors', () => {
    const timeoutError = new Error('operation timeout');
    const categorized = categorizeError(timeoutError);
    expect(categorized.code).toBe(ErrorCode.TIMEOUT_OPERATION);
  });

  it('should default to system error for unknown types', () => {
    const unknownError = new Error('Some weird error');
    const categorized = categorizeError(unknownError);
    expect(categorized.code).toBe(ErrorCode.SYSTEM_ERROR);
  });
});

/**
 * Tests for IPC handler wrapper
 */
describe('createIPCHandler', () => {
  it('should return success response for successful handler', async () => {
    const handler = createIPCHandler('test-handler', async (event, name) => {
      return { result: `Hello ${name}` };
    });

    const result = await handler({}, 'World');
    expect(result.success).toBe(true);
    expect(result.data.result).toBe('Hello World');
  });

  it('should return error response for failed handler', async () => {
    const handler = createIPCHandler('test-handler', async (event) => {
      throw new StandardizedError({
        code: ErrorCode.NOT_FOUND_FILE,
        message: 'File not found'
      });
    });

    const result = await handler({});
    expect(result.success).toBe(false);
    expect(result.error.code).toBe(ErrorCode.NOT_FOUND_FILE);
  });

  it('should categorize native errors', async () => {
    const handler = createIPCHandler('test-handler', async (event) => {
      throw new Error('Connection timeout');
    });

    const result = await handler({});
    expect(result.success).toBe(false);
    expect(result.error.code).toBe(ErrorCode.TIMEOUT_OPERATION);
  });

  it('should wrap standard response objects', async () => {
    const handler = createIPCHandler('test-handler', async (event) => {
      return { success: true, data: { id: 123 } };
    });

    const result = await handler({});
    expect(result.success).toBe(true);
    expect(result.data.id).toBe(123);
  });
});

/**
 * Tests for response helpers
 */
describe('Response Helpers', () => {
  it('should create success response with data', () => {
    const response = successResponse({ id: 1, name: 'test' });
    expect(response.success).toBe(true);
    expect(response.data.id).toBe(1);
  });

  it('should create success response with message', () => {
    const response = successResponse({ id: 1 }, 'Created successfully');
    expect(response.success).toBe(true);
    expect(response.message).toBe('Created successfully');
  });

  it('should create error response from StandardizedError', () => {
    const error = new StandardizedError({
      code: ErrorCode.AUTH_FAILED,
      message: 'Invalid credentials'
    });
    const response = errorResponse(error);
    expect(response.success).toBe(false);
    expect(response.error.code).toBe(ErrorCode.AUTH_FAILED);
  });

  it('should create error response from native error', () => {
    const error = new Error('ECONNREFUSED: connection refused');
    const response = errorResponse(error);
    expect(response.success).toBe(false);
    expect(response.error.code).toBe(ErrorCode.NETWORK_CONNECTION_REFUSED);
  });

  it('should create error response from string', () => {
    const response = errorResponse('Something went wrong');
    expect(response.success).toBe(false);
    expect(response.error.message).toBe('Something went wrong');
  });

  it('should override error code', () => {
    const error = new Error('Some error');
    const response = errorResponse(error, ErrorCode.SYSTEM_ERROR);
    expect(response.error.code).toBe(ErrorCode.SYSTEM_ERROR);
  });
});

/**
 * Tests for createError helper
 */
describe('createError', () => {
  it('should create error with code and formatted message', () => {
    const error = createError(ErrorCode.NOT_FOUND_FILE, {
      path: '/home/user/file.txt'
    });

    expect(error.code).toBe(ErrorCode.NOT_FOUND_FILE);
    expect(error.message).toContain('/home/user/file.txt');
    expect(error.details.path).toBe('/home/user/file.txt');
  });

  it('should handle validation errors', () => {
    const error = createError(ErrorCode.VALIDATION_MISSING_FIELD, {
      field: 'username'
    });

    expect(error.code).toBe(ErrorCode.VALIDATION_MISSING_FIELD);
    expect(error.message).toContain('username');
  });

  it('should handle timeout errors', () => {
    const error = createError(ErrorCode.TIMEOUT_CONNECTION, {
      timeout: '5000'
    });

    expect(error.code).toBe(ErrorCode.TIMEOUT_CONNECTION);
    expect(error.message).toContain('5000');
  });
});

/**
 * Tests for validation helpers
 */
describe('Validation Helpers', () => {
  it('validateRequired should pass for present fields', () => {
    const data = { username: 'test', password: 'secret' };
    expect(() => validateRequired(data, ['username', 'password'])).not.toThrow();
  });

  it('validateRequired should throw for missing fields', () => {
    const data = { username: 'test' };
    expect(() => validateRequired(data, ['username', 'password'])).toThrow();
  });

  it('validateRequired should throw for null/undefined fields', () => {
    const data = { username: 'test', password: null };
    expect(() => validateRequired(data, ['password'])).toThrow();
  });

  it('validateTypes should pass for correct types', () => {
    const data = { name: 'test', age: 25, active: true };
    expect(() => validateTypes(data, {
      name: 'string',
      age: 'number',
      active: 'boolean'
    })).not.toThrow();
  });

  it('validateTypes should throw for incorrect types', () => {
    const data = { name: 'test', age: '25' };
    expect(() => validateTypes(data, {
      name: 'string',
      age: 'number'
    })).toThrow();
  });

  it('validateTypes should handle array type', () => {
    const data = { items: [1, 2, 3] };
    expect(() => validateTypes(data, { items: 'array' })).not.toThrow();
  });

  it('validateTypes should throw for non-array', () => {
    const data = { items: 'not-array' };
    expect(() => validateTypes(data, { items: 'array' })).toThrow();
  });

  it('validateRange should pass for value within range', () => {
    expect(() => validateRange(5, 1, 10, 'value')).not.toThrow();
  });

  it('validateRange should throw for value below minimum', () => {
    expect(() => validateRange(0, 1, 10, 'value')).toThrow();
  });

  it('validateRange should throw for value above maximum', () => {
    expect(() => validateRange(11, 1, 10, 'value')).toThrow();
  });
});

/**
 * Tests for SSH error handling
 */
describe('SSH Error Handling', () => {
  it('should handle SSH authentication errors', () => {
    const error = new Error('SSH authentication failed');
    const handled = handleSSHError(error);
    expect(handled.code).toBe(ErrorCode.SSH_AUTH_FAILED);
  });

  it('should handle SSH key errors', () => {
    const error = new Error('Invalid private key format');
    const handled = handleSSHError(error);
    expect(handled.code).toBe(ErrorCode.SSH_KEY_INVALID);
  });

  it('should handle SSH timeout errors', () => {
    const error = new Error('timeout');
    const handled = handleSSHError(error);
    expect(handled.code).toBe(ErrorCode.TIMEOUT_CONNECTION);
  });

  it('should handle SFTP errors', () => {
    const error = new Error('SFTP subsystem failed');
    const handled = handleSSHError(error);
    expect(handled.code).toBe(ErrorCode.SSH_SFTP_FAILED);
  });

  it('should handle SSH channel errors', () => {
    const error = new Error('Failed to open channel');
    const handled = handleSSHError(error);
    expect(handled.code).toBe(ErrorCode.SSH_CHANNEL_OPEN_FAILED);
  });

  it('should default to SSH_CONNECT_FAILED for unknown SSH errors', () => {
    const error = new Error('Unknown SSH error');
    const handled = handleSSHError(error);
    expect(handled.code).toBe(ErrorCode.SSH_CONNECT_FAILED);
  });
});

/**
 * Tests for file error handling
 */
describe('File Error Handling', () => {
  it('should handle file not found errors (ENOENT)', () => {
    const error = new Error('no such file or directory');
    error.code = 'ENOENT';
    const handled = handleFileError(error, '/path/to/file.txt');
    expect(handled.code).toBe(ErrorCode.NOT_FOUND_FILE);
    expect(handled.message).toContain('file.txt');
  });

  it('should handle permission denied errors (EACCES)', () => {
    const error = new Error('permission denied');
    error.code = 'EACCES';
    const handled = handleFileError(error, '/protected/file');
    expect(handled.code).toBe(ErrorCode.FILE_PERMISSION_DENIED);
  });

  it('should handle file in use errors (EBUSY)', () => {
    const error = new Error('file is busy');
    error.code = 'EBUSY';
    const handled = handleFileError(error);
    expect(handled.code).toBe(ErrorCode.FILE_IN_USE);
  });

  it('should handle disk space errors (ENOSPC)', () => {
    const error = new Error('no space left on device');
    error.code = 'ENOSPC';
    const handled = handleFileError(error);
    expect(handled.code).toBe(ErrorCode.FILE_DISK_SPACE_EXCEEDED);
  });

  it('should default to FILE_READ_FAILED for unknown file errors', () => {
    const error = new Error('unknown file error');
    const handled = handleFileError(error, '/some/file');
    expect(handled.code).toBe(ErrorCode.FILE_READ_FAILED);
  });
});

/**
 * Tests for network error handling
 */
describe('Network Error Handling', () => {
  it('should handle connection refused errors', () => {
    const error = new Error('connection refused');
    error.code = 'ECONNREFUSED';
    const handled = handleNetworkError(error, 'example.com');
    expect(handled.code).toBe(ErrorCode.NETWORK_CONNECTION_REFUSED);
    expect(handled.message).toContain('example.com');
  });

  it('should handle connection reset errors', () => {
    const error = new Error('connection reset by peer');
    error.code = 'ECONNRESET';
    const handled = handleNetworkError(error, 'example.com');
    expect(handled.code).toBe(ErrorCode.NETWORK_CONNECTION_RESET);
  });

  it('should handle host unreachable errors', () => {
    const error = new Error('no route to host');
    error.code = 'EHOSTUNREACH';
    const handled = handleNetworkError(error, 'unreachable.com');
    expect(handled.code).toBe(ErrorCode.NETWORK_HOST_UNREACHABLE);
  });

  it('should handle timeout errors', () => {
    const error = new Error('connection timeout');
    error.code = 'ETIMEDOUT';
    const handled = handleNetworkError(error);
    expect(handled.code).toBe(ErrorCode.NETWORK_TIMEOUT);
  });

  it('should default to SYSTEM_ERROR for unknown network errors', () => {
    const error = new Error('unknown network error');
    const handled = handleNetworkError(error, 'host');
    expect(handled.code).toBe(ErrorCode.SYSTEM_ERROR);
  });
});

/**
 * Tests for batch operations
 */
describe('Batch Operations', () => {
  it('should handle all successful operations', async () => {
    const operations = [
      { id: '1', fn: async () => ({ status: 'ok' }) },
      { id: '2', fn: async () => ({ status: 'ok' }) },
      { id: '3', fn: async () => ({ status: 'ok' }) }
    ];

    const results = await handleBatchOperations(operations);

    expect(results.summary.total).toBe(3);
    expect(results.summary.successCount).toBe(3);
    expect(results.summary.failureCount).toBe(0);
    expect(results.succeeded).toHaveLength(3);
    expect(results.failed).toHaveLength(0);
  });

  it('should handle mixed success and failure', async () => {
    const operations = [
      { id: '1', fn: async () => ({ status: 'ok' }) },
      { id: '2', fn: async () => { throw new Error('Failed'); } },
      { id: '3', fn: async () => ({ status: 'ok' }) }
    ];

    const results = await handleBatchOperations(operations);

    expect(results.summary.total).toBe(3);
    expect(results.summary.successCount).toBe(2);
    expect(results.summary.failureCount).toBe(1);
    expect(results.succeeded).toHaveLength(2);
    expect(results.failed).toHaveLength(1);
  });

  it('should capture error details for failed operations', async () => {
    const operations = [
      {
        id: 'op-1',
        fn: async () => {
          throw new StandardizedError({
            code: ErrorCode.NOT_FOUND_FILE,
            message: 'File not found'
          });
        }
      }
    ];

    const results = await handleBatchOperations(operations);

    expect(results.failed[0].id).toBe('op-1');
    expect(results.failed[0].error.code).toBe(ErrorCode.NOT_FOUND_FILE);
  });

  it('should handle empty operations array', async () => {
    const results = await handleBatchOperations([]);

    expect(results.summary.total).toBe(0);
    expect(results.summary.successCount).toBe(0);
    expect(results.summary.failureCount).toBe(0);
  });
});

/**
 * Integration tests
 */
describe('Error Handling Integration', () => {
  it('should create complete error response pipeline', async () => {
    const handler = createIPCHandler('user-login', async (event, credentials) => {
      validateRequired(credentials, ['username', 'password']);
      validateTypes(credentials, { username: 'string', password: 'string' });

      if (credentials.username === 'admin' && credentials.password === 'secret') {
        return successResponse({ token: 'abc123', user: 'admin' }, 'Logged in');
      }

      throw new StandardizedError({
        code: ErrorCode.AUTH_INVALID_CREDENTIALS,
        message: 'Invalid username or password'
      });
    });

    // Successful login
    const successResult = await handler({}, { username: 'admin', password: 'secret' });
    expect(successResult.success).toBe(true);
    expect(successResult.message).toBe('Logged in');

    // Invalid credentials
    const failResult = await handler({}, { username: 'admin', password: 'wrong' });
    expect(failResult.success).toBe(false);
    expect(failResult.error.code).toBe(ErrorCode.AUTH_INVALID_CREDENTIALS);

    // Missing field
    const validationResult = await handler({}, { username: 'admin' });
    expect(validationResult.success).toBe(false);
    expect(validationResult.error.code).toBe(ErrorCode.VALIDATION_MISSING_FIELD);
  });

  it('should handle complex SSH operation error', async () => {
    const handler = createIPCHandler('ssh-connect', async (event, config) => {
      validateRequired(config, ['host', 'port', 'username']);

      try {
        // Simulate SSH connection failure
        throw new Error('SSH authentication failed: permission denied');
      } catch (error) {
        throw handleSSHError(error);
      }
    });

    const result = await handler({}, { host: 'localhost', port: 22, username: 'user' });
    expect(result.success).toBe(false);
    expect(result.error.code).toBe(ErrorCode.SSH_AUTH_FAILED);
  });

  it('should handle file transfer error', async () => {
    const handler = createIPCHandler('download-file', async (event, filePath) => {
      validateRequired({ filePath }, ['filePath']);

      try {
        // Simulate file not found
        const error = new Error('ENOENT: no such file');
        error.code = 'ENOENT';
        throw error;
      } catch (error) {
        throw handleFileError(error, filePath);
      }
    });

    const result = await handler({}, 'missing.txt');
    expect(result.success).toBe(false);
    expect(result.error.code).toBe(ErrorCode.NOT_FOUND_FILE);
  });
});
