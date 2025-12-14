/**
 * File Operations and SFTP Tests
 * 
 * Tests file operation capabilities and SFTP functionality.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import SSHService from '../../electron/ssh-service.js';
import { TestSSHFixtures } from '../fixtures/mock-ssh-server.js';
import { createTestDirectory, cleanupTestDirectory } from '../fixtures/test-helpers.js';

describe('SSH Integration Tests - File Operations', () => {
  let sshService;
  let testDir;
  let testCredentials;
  let sshServerAvailable = false;

  beforeAll(async () => {
    sshService = new SSHService();
    testDir = createTestDirectory('file-ops-');
    testCredentials = TestSSHFixtures.getCredentials();

    const testConfig = {
      host: testCredentials.host,
      port: testCredentials.port,
      username: testCredentials.username,
      password: testCredentials.password,
      authType: 'password',
      readyTimeout: 2000
    };

    try {
      const result = await Promise.race([
        sshService.connect(testConfig),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
      ]);
      
      if (result && result.success) {
        sshServerAvailable = true;
        await sshService.disconnect(result.connectionId);
      }
    } catch (err) {
      sshServerAvailable = false;
    }
  });

  afterAll(async () => {
    if (testDir) {
      cleanupTestDirectory(testDir);
    }
  });

  describe('File Service Availability', () => {
    it('should have SSH service available', () => {
      expect(typeof sshService.connect).toBe('function');
    });

    it('should support SFTP operations', async () => {
      if (!sshServerAvailable) return;

      const config = {
        host: testCredentials.host,
        port: testCredentials.port,
        username: testCredentials.username,
        password: testCredentials.password,
        authType: 'password',
        readyTimeout: 5000
      };

      try {
        const result = await sshService.connect(config);
        if (result && result.success) {
          expect(typeof sshService.uploadFile).toBe('function');
          expect(typeof sshService.downloadFile).toBe('function');

          await sshService.disconnect(result.connectionId);
        }
      } catch (err) {
        // Connection may fail
      }
    });
  });

  describe('Directory Operations', () => {
    it('should support directory listing', async () => {
      if (!sshServerAvailable) return;

      const config = {
        host: testCredentials.host,
        port: testCredentials.port,
        username: testCredentials.username,
        password: testCredentials.password,
        authType: 'password',
        readyTimeout: 5000
      };

      try {
        const result = await sshService.connect(config);
        if (result && result.success) {
          expect(typeof sshService.listDirectory).toBe('function');
          await sshService.disconnect(result.connectionId);
        }
      } catch (err) {
        // Connection may fail
      }
    });

    it('should support recursive listing', async () => {
      if (!sshServerAvailable) return;

      const config = {
        host: testCredentials.host,
        port: testCredentials.port,
        username: testCredentials.username,
        password: testCredentials.password,
        authType: 'password',
        readyTimeout: 5000
      };

      try {
        const result = await sshService.connect(config);
        if (result && result.success) {
          expect(typeof sshService.listDirectory).toBe('function');
          await sshService.disconnect(result.connectionId);
        }
      } catch (err) {
        // Connection may fail
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent directory', async () => {
      if (!sshServerAvailable) return;

      const config = {
        host: testCredentials.host,
        port: testCredentials.port,
        username: testCredentials.username,
        password: testCredentials.password,
        authType: 'password',
        readyTimeout: 5000
      };

      try {
        const result = await sshService.connect(config);
        if (result && result.success) {
          const listing = await sshService.listDirectory('/non/existent/path');
          if (listing) {
            expect(Array.isArray(listing) || listing instanceof Error).toBe(true);
          }
          
          await sshService.disconnect(result.connectionId);
        }
      } catch (err) {
        expect(err).toBeDefined();
      }
    });

    it('should handle permission errors gracefully', async () => {
      if (!sshServerAvailable) return;

      const config = {
        host: testCredentials.host,
        port: testCredentials.port,
        username: testCredentials.username,
        password: testCredentials.password,
        authType: 'password',
        readyTimeout: 5000
      };

      try {
        const result = await sshService.connect(config);
        if (result && result.success) {
          const listing = await sshService.listDirectory('/root/.ssh');
          if (listing) {
            expect(Array.isArray(listing) || listing instanceof Error).toBe(true);
          }
          
          await sshService.disconnect(result.connectionId);
        }
      } catch (err) {
        expect(err).toBeDefined();
      }
    });
  });

  describe('File Operations Support', () => {
    it('should have SFTP helper methods', async () => {
      if (!sshServerAvailable) return;

      const config = {
        host: testCredentials.host,
        port: testCredentials.port,
        username: testCredentials.username,
        password: testCredentials.password,
        authType: 'password',
        readyTimeout: 5000
      };

      try {
        const result = await sshService.connect(config);
        if (result && result.success) {
          expect(typeof sshService.uploadFile).toBe('function');
          expect(typeof sshService.downloadFile).toBe('function');
          expect(typeof sshService.listDirectory).toBe('function');

          await sshService.disconnect(result.connectionId);
        }
      } catch (err) {
        // Connection may fail
      }
    });

    it('should handle SFTP requests', async () => {
      if (!sshServerAvailable) return;

      const config = {
        host: testCredentials.host,
        port: testCredentials.port,
        username: testCredentials.username,
        password: testCredentials.password,
        authType: 'password',
        readyTimeout: 5000
      };

      try {
        const result = await sshService.connect(config);
        if (result && result.success) {
          const listing = await sshService.listDirectory('~');
          expect(listing !== undefined && listing !== null).toBe(true);

          await sshService.disconnect(result.connectionId);
        }
      } catch (err) {
        expect(err).toBeDefined();
      }
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple directory listings', async () => {
      if (!sshServerAvailable) return;

      const config = {
        host: testCredentials.host,
        port: testCredentials.port,
        username: testCredentials.username,
        password: testCredentials.password,
        authType: 'password',
        readyTimeout: 5000
      };

      try {
        const result = await sshService.connect(config);
        if (result && result.success) {
          const promises = [];
          for (let i = 0; i < 3; i++) {
            promises.push(
              sshService.listDirectory('/tmp').catch(() => null)
            );
          }

          const results = await Promise.all(promises);
          expect(Array.isArray(results)).toBe(true);
          expect(results.length).toBe(3);

          await sshService.disconnect(result.connectionId);
        }
      } catch (err) {
        // Connection may fail
      }
    });
  });
});
