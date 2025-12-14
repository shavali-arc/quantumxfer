/**
 * Handler Integration Tests
 * Comprehensive tests for IPC handlers wrapped with validation middleware
 * 
 * Tests all handler validation scenarios:
 * - Valid inputs pass through to handlers
 * - Invalid inputs return validation errors
 * - Handler errors are properly formatted
 * - All error responses follow consistent format
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import HandlerValidator from '../electron/validators/middleware.js';

// Mock handler implementations
const createMockHandler = (name, resultData = { success: true }) => 
  vi.fn(async (event, ...args) => resultData);

const createErrorHandler = (name, errorMsg = 'Handler failed') => 
  vi.fn(async (event, ...args) => {
    throw new Error(errorMsg);
  });

describe('Handler Integration - Validation Middleware', () => {

  describe('SSH Connection Handler (ssh-connect)', () => {
    let handler;
    let mockSSHService;

    beforeEach(() => {
      mockSSHService = {
        connect: vi.fn(async (config) => ({
          success: true,
          connectionId: 'conn_' + Date.now()
        }))
      };

      handler = HandlerValidator.createValidatedHandler(
        async (event, config) => mockSSHService.connect(config),
        (config) => HandlerValidator.validateConnection(config)
      );
    });

    it('should allow valid SSH connection', async () => {
      const event = { sender: {} };
      const config = {
        host: '192.168.1.1',
        port: 22,
        username: 'ubuntu',
        authType: 'password'
      };

      const result = await handler(event, config);
      expect(result.success).toBe(true);
      expect(mockSSHService.connect).toHaveBeenCalledWith(config);
    });

    it('should reject connection with invalid host', async () => {
      const event = { sender: {} };
      const config = {
        host: 'invalid..host',
        port: 22,
        username: 'ubuntu',
        authType: 'password'
      };

      const result = await handler(event, config);
      expect(result.success).toBe(false);
      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.details).toBeDefined();
    });

    it('should reject connection with invalid port', async () => {
      const event = { sender: {} };
      const config = {
        host: '192.168.1.1',
        port: 99999,
        username: 'ubuntu',
        authType: 'password'
      };

      const result = await handler(event, config);
      expect(result.success).toBe(false);
      expect(result.code).toBe('VALIDATION_ERROR');
    });

    it('should reject null config', async () => {
      const event = { sender: {} };
      const result = await handler(event, null);
      expect(result.success).toBe(false);
      expect(result.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('SSH Command Execution Handler (ssh-execute-command)', () => {
    let handler;

    beforeEach(() => {
      handler = HandlerValidator.createValidatedHandler(
        async (event, connectionId, command) => ({
          success: true,
          output: 'command output'
        }),
        (connectionId, command) => HandlerValidator.validateCommandExecution(connectionId, command)
      );
    });

    it('should allow valid command execution', async () => {
      const event = { sender: {} };
      const result = await handler(event, 'conn_1', 'ls -la');
      expect(result.success).toBe(true);
    });

    it('should reject missing connectionId', async () => {
      const event = { sender: {} };
      const result = await handler(event, '', 'ls -la');
      expect(result.success).toBe(false);
      expect(result.code).toBe('VALIDATION_ERROR');
    });

    it('should reject missing command', async () => {
      const event = { sender: {} };
      const result = await handler(event, 'conn_1', '');
      expect(result.success).toBe(false);
      expect(result.code).toBe('VALIDATION_ERROR');
    });

    it('should reject null command', async () => {
      const event = { sender: {} };
      const result = await handler(event, 'conn_1', null);
      expect(result.success).toBe(false);
      expect(result.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Directory Listing Handler (ssh-list-directory)', () => {
    let handler;

    beforeEach(() => {
      handler = HandlerValidator.createValidatedHandler(
        async (event, connectionId, remotePath) => ({
          success: true,
          files: []
        }),
        (connectionId, remotePath) => HandlerValidator.validateDirectoryListing(connectionId, remotePath)
      );
    });

    it('should allow valid directory listing', async () => {
      const event = { sender: {} };
      const result = await handler(event, 'conn_1', '/home/user');
      expect(result.success).toBe(true);
    });

    it('should reject invalid remote path traversal', async () => {
      const event = { sender: {} };
      const result = await handler(event, 'conn_1', '../../../etc/passwd');
      expect(result.success).toBe(false);
      expect(result.code).toBe('VALIDATION_ERROR');
    });

    it('should reject missing connectionId', async () => {
      const event = { sender: {} };
      const result = await handler(event, '', '/home/user');
      expect(result.success).toBe(false);
    });

    it('should reject missing remotePath', async () => {
      const event = { sender: {} };
      const result = await handler(event, 'conn_1', '');
      expect(result.success).toBe(false);
    });
  });

  describe('File Download Handler (ssh-download-file)', () => {
    let handler;

    beforeEach(() => {
      handler = HandlerValidator.createValidatedHandler(
        async (event, connectionId, remotePath, localPath) => ({
          success: true,
          bytesDownloaded: 1024
        }),
        (connectionId, remotePath, localPath) => 
          HandlerValidator.validateFileDownload(connectionId, remotePath, localPath)
      );
    });

    it('should allow valid file download', async () => {
      const event = { sender: {} };
      const result = await handler(
        event, 
        'conn_1',
        '/home/user/file.txt',
        'C:\\Downloads\\file.txt'
      );
      expect(result.success).toBe(true);
    });

    it('should reject invalid remote path', async () => {
      const event = { sender: {} };
      const result = await handler(
        event,
        'conn_1',
        '../../../etc/passwd',
        'C:\\file.txt'
      );
      expect(result.success).toBe(false);
      expect(result.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid local path', async () => {
      const event = { sender: {} };
      const result = await handler(
        event,
        'conn_1',
        '/home/user/file.txt',
        '../../sensitive.txt'
      );
      expect(result.success).toBe(false);
      expect(result.code).toBe('VALIDATION_ERROR');
    });

    it('should reject missing parameters', async () => {
      const event = { sender: {} };
      const result = await handler(event, 'conn_1', '', 'C:\\file.txt');
      expect(result.success).toBe(false);
    });
  });

  describe('File Upload Handler (ssh-upload-file)', () => {
    let handler;

    beforeEach(() => {
      handler = HandlerValidator.createValidatedHandler(
        async (event, connectionId, localPath, remotePath) => ({
          success: true,
          bytesUploaded: 2048
        }),
        (connectionId, localPath, remotePath) => 
          HandlerValidator.validateFileUpload(connectionId, localPath, remotePath)
      );
    });

    it('should allow valid file upload', async () => {
      const event = { sender: {} };
      const result = await handler(
        event,
        'conn_1',
        'C:\\Local\\file.txt',
        '/home/user/file.txt'
      );
      expect(result.success).toBe(true);
    });

    it('should reject invalid local path', async () => {
      const event = { sender: {} };
      const result = await handler(
        event,
        'conn_1',
        '../../sensitive.txt',
        '/home/user/file.txt'
      );
      expect(result.success).toBe(false);
      expect(result.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid remote path', async () => {
      const event = { sender: {} };
      const result = await handler(
        event,
        'conn_1',
        'C:\\file.txt',
        '../../../etc/passwd'
      );
      expect(result.success).toBe(false);
    });

    it('should reject missing parameters', async () => {
      const event = { sender: {} };
      const result = await handler(event, 'conn_1', '', '/home/user/file.txt');
      expect(result.success).toBe(false);
    });
  });

  describe('Disconnect Handler (ssh-disconnect)', () => {
    let handler;

    beforeEach(() => {
      handler = HandlerValidator.createValidatedHandler(
        (event, connectionId) => ({
          success: true,
          message: 'Disconnected'
        }),
        (connectionId) => HandlerValidator.validateConnectionId(connectionId)
      );
    });

    it('should allow valid disconnect', async () => {
      const event = { sender: {} };
      const result = await handler(event, 'conn_1');
      expect(result.success).toBe(true);
    });

    it('should reject empty connectionId', async () => {
      const event = { sender: {} };
      const result = await handler(event, '');
      expect(result.success).toBe(false);
      expect(result.code).toBe('VALIDATION_ERROR');
    });

    it('should reject null connectionId', async () => {
      const event = { sender: {} };
      const result = await handler(event, null);
      expect(result.success).toBe(false);
    });

    it('should reject non-string connectionId', async () => {
      const event = { sender: {} };
      const result = await handler(event, 12345);
      expect(result.success).toBe(false);
    });
  });

  describe('Bookmark Add Handler (bookmarks-add)', () => {
    let handler;

    beforeEach(() => {
      handler = HandlerValidator.createValidatedHandler(
        async (event, bookmark) => ({
          success: true,
          bookmark: { ...bookmark, id: 'bm_123' }
        }),
        (bookmark) => HandlerValidator.validateBookmarkObject(bookmark)
      );
    });

    it('should allow valid bookmark', async () => {
      const event = { sender: {} };
      const bookmark = {
        id: 'bm_1',
        name: 'Project Files',
        type: 'directory',
        path: '/home/user/projects'
      };

      const result = await handler(event, bookmark);
      expect(result.success).toBe(true);
    });

    it('should reject invalid bookmark', async () => {
      const event = { sender: {} };
      const bookmark = {
        id: 'bm_1',
        // Missing required fields
        type: 'invalid-type'
      };

      const result = await handler(event, bookmark);
      expect(result.success).toBe(false);
      expect(result.code).toBe('VALIDATION_ERROR');
    });

    it('should reject null bookmark', async () => {
      const event = { sender: {} };
      const result = await handler(event, null);
      expect(result.success).toBe(false);
    });

    it('should reject non-object bookmark', async () => {
      const event = { sender: {} };
      const result = await handler(event, 'invalid');
      expect(result.success).toBe(false);
    });
  });

  describe('Bookmark Remove Handler (bookmarks-remove)', () => {
    let handler;

    beforeEach(() => {
      handler = HandlerValidator.createValidatedHandler(
        async (event, bookmarkId) => ({
          success: true,
          message: 'Bookmark removed'
        }),
        (bookmarkId) => HandlerValidator.validateBookmarkId(bookmarkId)
      );
    });

    it('should allow valid bookmark removal', async () => {
      const event = { sender: {} };
      const result = await handler(event, 'bm_1');
      expect(result.success).toBe(true);
    });

    it('should reject empty bookmarkId', async () => {
      const event = { sender: {} };
      const result = await handler(event, '');
      expect(result.success).toBe(false);
      expect(result.code).toBe('VALIDATION_ERROR');
    });

    it('should reject null bookmarkId', async () => {
      const event = { sender: {} };
      const result = await handler(event, null);
      expect(result.success).toBe(false);
    });

    it('should reject non-string bookmarkId', async () => {
      const event = { sender: {} };
      const result = await handler(event, 123);
      expect(result.success).toBe(false);
    });
  });

  describe('Save Profiles Handler (save-profiles-to-file)', () => {
    let handler;

    beforeEach(() => {
      handler = HandlerValidator.createValidatedHandler(
        async (event, profiles) => ({
          success: true,
          filePath: '/path/to/profiles.json'
        }),
        (profiles) => HandlerValidator.validateProfilesArray(profiles)
      );
    });

    it('should allow valid profiles array', async () => {
      const event = { sender: {} };
      const profiles = [
        {
          id: 'p1',
          name: 'Server 1',
          host: '192.168.1.1',
          port: 22,
          username: 'user'
        }
      ];

      const result = await handler(event, profiles);
      expect(result.success).toBe(true);
    });

    it('should reject non-array input', async () => {
      const event = { sender: {} };
      const result = await handler(event, { id: 'p1' });
      expect(result.success).toBe(false);
      expect(result.code).toBe('VALIDATION_ERROR');
    });

    it('should reject null input', async () => {
      const event = { sender: {} };
      const result = await handler(event, null);
      expect(result.success).toBe(false);
    });

    it('should reject array with invalid profiles', async () => {
      const event = { sender: {} };
      const profiles = [
        {
          id: 'p1',
          name: 'Server',
          host: 'invalid..host',
          port: 22,
          username: 'user'
        }
      ];

      const result = await handler(event, profiles);
      expect(result.success).toBe(false);
      expect(result.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Error Handling - Handler Errors', () => {
    it('should format handler errors consistently', async () => {
      const handler = HandlerValidator.createValidatedHandler(
        async (event, data) => {
          throw new Error('Something went wrong');
        },
        (data) => ({ valid: true, errors: [] })
      );

      const event = { sender: {} };
      const result = await handler(event, { test: 'data' });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.code).toBe('HANDLER_ERROR');
      expect(result.error).toContain('Something went wrong');
    });

    it('should handle async handler errors', async () => {
      const handler = HandlerValidator.createValidatedHandler(
        async (event, connectionId) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          throw new Error('Connection timeout');
        },
        (connectionId) => HandlerValidator.validateConnectionId(connectionId)
      );

      const event = { sender: {} };
      const result = await handler(event, 'conn_1');

      expect(result.success).toBe(false);
      expect(result.code).toBe('HANDLER_ERROR');
      expect(result.error).toContain('Connection timeout');
    });
  });

  describe('Error Response Format Consistency', () => {
    it('should have consistent validation error format', async () => {
      const handler = HandlerValidator.createValidatedHandler(
        async (event, config) => ({ success: true }),
        (config) => HandlerValidator.validateConnection(config)
      );

      const event = { sender: {} };
      const result = await handler(event, null);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(result).toHaveProperty('details');
      expect(Array.isArray(result.details)).toBe(true);
    });

    it('should have consistent handler error format', async () => {
      const handler = HandlerValidator.createValidatedHandler(
        async (event) => {
          throw new Error('Test error');
        },
        () => ({ valid: true, errors: [] })
      );

      const event = { sender: {} };
      const result = await handler(event);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('code', 'HANDLER_ERROR');
    });

    it('should not expose internal stack traces', async () => {
      const handler = HandlerValidator.createValidatedHandler(
        async (event) => {
          throw new Error('Internal error with sensitive info');
        },
        () => ({ valid: true, errors: [] })
      );

      const event = { sender: {} };
      const result = await handler(event);

      // Error message should be present but stack trace should not
      expect(result.error).toBeDefined();
      expect(result.error).not.toContain('at ');
    });
  });

  describe('Parameter Passing Verification', () => {
    it('should pass parameters correctly to handler', async () => {
      const mockHandler = vi.fn(async (event, ...args) => ({
        success: true,
        argsReceived: args.length
      }));

      const handler = HandlerValidator.createValidatedHandler(
        mockHandler,
        (connId, cmd) => HandlerValidator.validateCommandExecution(connId, cmd)
      );

      const event = { sender: {} };
      await handler(event, 'conn_1', 'ls -la');

      expect(mockHandler).toHaveBeenCalled();
      const callArgs = mockHandler.mock.calls[0];
      expect(callArgs[0]).toBe(event);
      expect(callArgs[1]).toBe('conn_1');
      expect(callArgs[2]).toBe('ls -la');
    });

    it('should not pass invalid parameters to handler', async () => {
      const mockHandler = vi.fn(async (event, config) => ({
        success: true
      }));

      const handler = HandlerValidator.createValidatedHandler(
        mockHandler,
        (config) => HandlerValidator.validateConnection(config)
      );

      const event = { sender: {} };
      await handler(event, null);

      // Handler should NOT be called with invalid input
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

});
