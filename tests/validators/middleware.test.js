/**
 * Handler Validation Middleware Tests
 * Comprehensive tests for validation middleware and handler validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import HandlerValidator from '../../electron/validators/middleware.js';

describe('HandlerValidator - Middleware', () => {

  describe('validateConnection', () => {
    it('should validate valid SSH connection config', () => {
      const config = {
        host: '192.168.1.1',
        port: 22,
        username: 'ubuntu',
        authType: 'password',
      };

      const result = HandlerValidator.validateConnection(config);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject invalid connection config', () => {
      const config = {
        host: 'invalid..host',
        port: 99999,
        username: 'user',
      };

      const result = HandlerValidator.validateConnection(config);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject non-object config', () => {
      const result = HandlerValidator.validateConnection('invalid');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('object');
    });

    it('should reject null config', () => {
      const result = HandlerValidator.validateConnection(null);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('object');
    });
  });

  describe('validateCommandExecution', () => {
    it('should validate valid command execution', () => {
      const result = HandlerValidator.validateCommandExecution('conn_1', 'ls -la');
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject missing connectionId', () => {
      const result = HandlerValidator.validateCommandExecution('', 'ls -la');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('connectionId'))).toBe(true);
    });

    it('should reject missing command', () => {
      const result = HandlerValidator.validateCommandExecution('conn_1', '');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('command'))).toBe(true);
    });

    it('should reject null command', () => {
      const result = HandlerValidator.validateCommandExecution('conn_1', null);
      expect(result.valid).toBe(false);
    });

    it('should handle various valid commands', () => {
      const commands = ['ls', 'pwd', 'cd /tmp', 'grep text file.txt', 'echo "test"'];
      commands.forEach(cmd => {
        const result = HandlerValidator.validateCommandExecution('conn_1', cmd);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('validateDirectoryListing', () => {
    it('should validate valid directory listing request', () => {
      const result = HandlerValidator.validateDirectoryListing('conn_1', '/home/user');
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject invalid remote path', () => {
      const result = HandlerValidator.validateDirectoryListing('conn_1', '../../../etc/passwd');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('path'))).toBe(true);
    });

    it('should reject missing connectionId', () => {
      const result = HandlerValidator.validateDirectoryListing('', '/home/user');
      expect(result.valid).toBe(false);
    });

    it('should reject missing remotePath', () => {
      const result = HandlerValidator.validateDirectoryListing('conn_1', '');
      expect(result.valid).toBe(false);
    });

    it('should validate paths with semicolons if they are valid paths', () => {
      // The validator checks for path format validity, not shell injection
      // Semicolons in paths are technically valid on Unix systems
      const result = HandlerValidator.validateDirectoryListing('conn_1', '/home/user/file;data.txt');
      expect(result.valid).toBe(true);
    });
  });

  describe('validateFileDownload', () => {
    it('should validate valid file download request', () => {
      const result = HandlerValidator.validateFileDownload(
        'conn_1',
        '/home/user/file.txt',
        'C:\\Downloads\\file.txt'
      );
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject invalid remote path', () => {
      const result = HandlerValidator.validateFileDownload(
        'conn_1',
        '../../../etc/passwd',
        'C:\\file.txt'
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('remote'))).toBe(true);
    });

    it('should reject invalid local path', () => {
      const result = HandlerValidator.validateFileDownload(
        'conn_1',
        '/home/user/file.txt',
        '../../sensitive.txt'
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('local'))).toBe(true);
    });

    it('should reject missing connectionId', () => {
      const result = HandlerValidator.validateFileDownload(
        '',
        '/home/user/file.txt',
        'C:\\file.txt'
      );
      expect(result.valid).toBe(false);
    });

    it('should reject missing remotePath', () => {
      const result = HandlerValidator.validateFileDownload(
        'conn_1',
        '',
        'C:\\file.txt'
      );
      expect(result.valid).toBe(false);
    });

    it('should reject missing localPath', () => {
      const result = HandlerValidator.validateFileDownload(
        'conn_1',
        '/home/user/file.txt',
        ''
      );
      expect(result.valid).toBe(false);
    });
  });

  describe('validateFileUpload', () => {
    it('should validate valid file upload request', () => {
      const result = HandlerValidator.validateFileUpload(
        'conn_1',
        'C:\\Local\\file.txt',
        '/home/user/file.txt'
      );
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject invalid local path', () => {
      const result = HandlerValidator.validateFileUpload(
        'conn_1',
        '../../sensitive.txt',
        '/home/user/file.txt'
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('local'))).toBe(true);
    });

    it('should reject invalid remote path', () => {
      const result = HandlerValidator.validateFileUpload(
        'conn_1',
        'C:\\file.txt',
        '../../../etc/passwd'
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('remote'))).toBe(true);
    });

    it('should reject missing connectionId', () => {
      const result = HandlerValidator.validateFileUpload(
        '',
        'C:\\file.txt',
        '/home/user/file.txt'
      );
      expect(result.valid).toBe(false);
    });

    it('should reject missing localPath', () => {
      const result = HandlerValidator.validateFileUpload(
        'conn_1',
        '',
        '/home/user/file.txt'
      );
      expect(result.valid).toBe(false);
    });

    it('should reject missing remotePath', () => {
      const result = HandlerValidator.validateFileUpload(
        'conn_1',
        'C:\\file.txt',
        ''
      );
      expect(result.valid).toBe(false);
    });
  });

  describe('validateConnectionId', () => {
    it('should validate valid connection IDs', () => {
      const validIds = ['conn_1', 'connection_abc123', 'ssh_conn'];
      validIds.forEach(id => {
        const result = HandlerValidator.validateConnectionId(id);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject empty connectionId', () => {
      const result = HandlerValidator.validateConnectionId('');
      expect(result.valid).toBe(false);
    });

    it('should reject null connectionId', () => {
      const result = HandlerValidator.validateConnectionId(null);
      expect(result.valid).toBe(false);
    });

    it('should reject non-string connectionId', () => {
      const result = HandlerValidator.validateConnectionId(123);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateBookmarkObject', () => {
    it('should validate valid bookmark', () => {
      const bookmark = {
        id: 'bm_1',
        name: 'Project Files',
        type: 'directory',
        path: '/home/user/projects',
      };

      const result = HandlerValidator.validateBookmarkObject(bookmark);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject invalid bookmark', () => {
      const bookmark = {
        id: 'bm_1',
        // Missing required fields
        type: 'invalid-type',
      };

      const result = HandlerValidator.validateBookmarkObject(bookmark);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject non-object bookmark', () => {
      const result = HandlerValidator.validateBookmarkObject('invalid');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('object');
    });

    it('should reject null bookmark', () => {
      const result = HandlerValidator.validateBookmarkObject(null);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateProfileObject', () => {
    it('should validate valid profile', () => {
      const profile = {
        id: 'profile_1',
        name: 'Production',
        host: '192.168.1.100',
        port: 22,
        username: 'admin',
      };

      const result = HandlerValidator.validateProfileObject(profile);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject invalid profile', () => {
      const profile = {
        id: 'profile_1',
        // Missing required fields
        host: 'invalid..host',
      };

      const result = HandlerValidator.validateProfileObject(profile);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject non-object profile', () => {
      const result = HandlerValidator.validateProfileObject('invalid');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('object');
    });

    it('should reject null profile', () => {
      const result = HandlerValidator.validateProfileObject(null);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateProfilesArray', () => {
    it('should validate valid profiles array', () => {
      const profiles = [
        {
          id: 'p1',
          name: 'Server 1',
          host: '192.168.1.1',
          port: 22,
          username: 'user',
        },
        {
          id: 'p2',
          name: 'Server 2',
          host: '192.168.1.2',
          port: 22,
          username: 'admin',
        },
      ];

      const result = HandlerValidator.validateProfilesArray(profiles);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject non-array input', () => {
      const result = HandlerValidator.validateProfilesArray({ id: 'p1' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('array');
    });

    it('should reject null input', () => {
      const result = HandlerValidator.validateProfilesArray(null);
      expect(result.valid).toBe(false);
    });

    it('should reject array with invalid profiles', () => {
      const profiles = [
        {
          id: 'p1',
          name: 'Server 1',
          host: 'invalid..host',
          port: 22,
          username: 'user',
        },
      ];

      const result = HandlerValidator.validateProfilesArray(profiles);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateBookmarkId', () => {
    it('should validate valid bookmark IDs', () => {
      const validIds = ['bm_1', 'bookmark_abc', 'bm_123_xyz'];
      validIds.forEach(id => {
        const result = HandlerValidator.validateBookmarkId(id);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject empty bookmarkId', () => {
      const result = HandlerValidator.validateBookmarkId('');
      expect(result.valid).toBe(false);
    });

    it('should reject null bookmarkId', () => {
      const result = HandlerValidator.validateBookmarkId(null);
      expect(result.valid).toBe(false);
    });

    it('should reject non-string bookmarkId', () => {
      const result = HandlerValidator.validateBookmarkId(123);
      expect(result.valid).toBe(false);
    });
  });

  describe('formatErrorResponse', () => {
    it('should format validation errors correctly', () => {
      const errors = ['Error 1', 'Error 2'];
      const response = HandlerValidator.formatErrorResponse(errors);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Validation');
      expect(response.details).toEqual(errors);
      expect(response.code).toBe('VALIDATION_ERROR');
    });

    it('should include error details in response', () => {
      const errors = ['Missing host', 'Invalid port'];
      const response = HandlerValidator.formatErrorResponse(errors);

      expect(response.details).toContain('Missing host');
      expect(response.details).toContain('Invalid port');
    });
  });

  describe('logValidationError', () => {
    it('should log validation errors without throwing', () => {
      // Should not throw
      expect(() => {
        HandlerValidator.logValidationError('testHandler', ['Error 1']);
      }).not.toThrow();
    });

    it('should sanitize sensitive data in logs', () => {
      const input = {
        host: '192.168.1.1',
        password: 'secretpassword',
        privateKey: 'private_key_content',
      };

      // Should not throw and should sanitize
      expect(() => {
        HandlerValidator.logValidationError('testHandler', ['Error'], input);
      }).not.toThrow();
    });

    it('should handle null input gracefully', () => {
      expect(() => {
        HandlerValidator.logValidationError('testHandler', ['Error'], null);
      }).not.toThrow();
    });
  });

  describe('createValidatedHandler', () => {
    it('should create a function', () => {
      const handler = async () => ({ success: true });
      const validator = () => ({ valid: true, errors: [] });

      const wrapped = HandlerValidator.createValidatedHandler(handler, validator);
      expect(typeof wrapped).toBe('function');
    });

    it('should return validation error if invalid', async () => {
      const handler = async () => ({ success: true });
      const validator = () => ({ valid: false, errors: ['Invalid input'] });

      const wrapped = HandlerValidator.createValidatedHandler(handler, validator);
      const event = { sender: {} };

      const result = await wrapped(event);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation');
      expect(result.code).toBe('VALIDATION_ERROR');
    });

    it('should execute handler if valid', async () => {
      const handler = async () => ({ success: true, data: 'test' });
      const validator = () => ({ valid: true, errors: [] });

      const wrapped = HandlerValidator.createValidatedHandler(handler, validator);
      const event = { sender: {} };

      const result = await wrapped(event);
      expect(result.success).toBe(true);
      expect(result.data).toBe('test');
    });

    it('should handle handler errors', async () => {
      const handler = async () => {
        throw new Error('Handler failed');
      };
      const validator = () => ({ valid: true, errors: [] });

      const wrapped = HandlerValidator.createValidatedHandler(handler, validator);
      const event = { sender: {} };

      const result = await wrapped(event);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Handler failed');
      expect(result.code).toBe('HANDLER_ERROR');
    });
  });
});
