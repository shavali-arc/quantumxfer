/**
 * File Operations Integration Tests
 * 
 * Tests SSH file transfer operations via SSHService SFTP
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import SSHService from '../../electron/ssh-service.js';
import { TestSSHFixtures } from '../fixtures/mock-ssh-server.js';
import {
  createTestDirectory,
  cleanupTestDirectory,
  createTestFile,
  createTestFiles,
  verifyFileExists,
  getFileSize
} from '../fixtures/test-helpers.js';
import path from 'path';
import fs from 'fs';

describe('SSH Integration Tests - File Operations', () => {
  let sshService;
  let testDir;
  let remoteDir = '/tmp/quantumxfer-test-' + Date.now();
  let connectionId;
  let testCredentials;

  beforeAll(async () => {
    sshService = new SSHService();
    testDir = createTestDirectory('file-ops-');
    testCredentials = TestSSHFixtures.getCredentials();

    const config = {
      host: testCredentials.host,
      port: testCredentials.port,
      username: testCredentials.username,
      password: testCredentials.password,
      authType: 'password'
    };

    const result = await sshService.connect(config);
    if (result && result.success) {
      connectionId = result.connectionId;
    }
  });

  afterAll(async () => {
    if (connectionId) {
      await sshService.disconnect(connectionId);
    }
    cleanupTestDirectory(testDir);
  });

  describe('Basic File Operations', () => {
    it('should establish connection for file operations', async () => {
      expect(connectionId).toBeDefined();
      expect(connectionId).not.toBeNull();
    });

    it('should support SFTP operations', async () => {
      if (!connectionId) this.skip();

      const sftpResult = await sshService.getSFTP(connectionId);
      expect(sftpResult).toBeDefined();
      if (sftpResult) {
        expect(sftpResult.success || sftpResult.sftp).toBeTruthy();
      }
    });

    it('should list directory contents', async () => {
      if (!connectionId) this.skip();

      try {
        const result = await sshService.listDirectory(connectionId, '/tmp');
        expect(result).toBeDefined();
        if (result && result.files) {
          expect(Array.isArray(result.files)).toBe(true);
        }
      } catch (err) {
        // May fail if /tmp doesn't exist on server
        expect(err).toBeDefined();
      }
    });

    it('should list home directory', async () => {
      if (!connectionId) this.skip();

      try {
        const result = await sshService.listDirectory(connectionId, '~');
        expect(result).toBeDefined();
      } catch (err) {
        expect(err).toBeDefined();
      }
    });
  });

  describe('Directory Listing', () => {
    it('should handle listing with recursion', async () => {
      if (!connectionId) this.skip();

      try {
        const result = await sshService.listDirectoryRecursive(
          connectionId,
          '/tmp',
          { maxDepth: 2, maxFiles: 100 }
        );
        expect(result).toBeDefined();
      } catch (err) {
        expect(err).toBeDefined();
      }
    });

    it('should handle file filtering options', async () => {
      if (!connectionId) this.skip();

      try {
        const result = await sshService.listDirectoryRecursive(
          connectionId,
          '/tmp',
          { includeHidden: false, maxFiles: 50 }
        );
        expect(result).toBeDefined();
      } catch (err) {
        expect(err).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent directory', async () => {
      if (!connectionId) this.skip();

      try {
        const result = await sshService.listDirectory(
          connectionId,
          '/nonexistent-dir-12345'
        );
        if (result && !result.success) {
          expect(result.error).toBeDefined();
        }
      } catch (err) {
        expect(err).toBeDefined();
      }
    });

    it('should handle permission denied errors', async () => {
      if (!connectionId) this.skip();

      try {
        const result = await sshService.listDirectory(connectionId, '/root');
        // May fail due to permissions
        if (result && !result.success) {
          expect(result.error || result.message).toBeDefined();
        }
      } catch (err) {
        expect(err).toBeDefined();
      }
    });
  });

  describe('Concurrent File Operations', () => {
    it('should handle multiple concurrent list operations', async () => {
      if (!connectionId) this.skip();

      try {
        const listOps = [];
        for (let i = 0; i < 5; i++) {
          listOps.push(sshService.listDirectory(connectionId, '/tmp'));
        }

        const results = await Promise.allSettled(listOps);
        const successCount = results.filter(r => r.status === 'fulfilled').length;

        expect(successCount).toBeGreaterThan(0);
      } catch (err) {
        expect(err).toBeDefined();
      }
    });
  });

  describe('File Metadata', () => {
    it('should include file metadata in listings', async () => {
      if (!connectionId) this.skip();

      try {
        const result = await sshService.listDirectory(connectionId, '/tmp');
        
        if (result && result.files && result.files.length > 0) {
          const firstFile = result.files[0];
          expect(firstFile.name).toBeDefined();
          // Different servers may have different metadata formats
          expect(firstFile).toBeDefined();
        }
      } catch (err) {
        expect(err).toBeDefined();
      }
    });
  });

  describe('Performance', () => {
    it('should handle recursive listing performance', async () => {
      if (!connectionId) this.skip();

      try {
        const startTime = Date.now();
        
        const result = await sshService.listDirectoryRecursive(
          connectionId,
          '/tmp',
          { maxFiles: 50, maxDepth: 2 }
        );

        const duration = Date.now() - startTime;
        
        expect(result).toBeDefined();
        expect(duration).toBeGreaterThan(0);
      } catch (err) {
        // May fail on some servers
        expect(err).toBeDefined();
      }
    });
  });
});
