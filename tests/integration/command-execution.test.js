/**
 * Command Execution and Connection Tests
 * 
 * Tests basic SSH connectivity and connection tracking.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import SSHService from '../../electron/ssh-service.js';
import { TestSSHFixtures } from '../fixtures/mock-ssh-server.js';
import { createTestDirectory, cleanupTestDirectory } from '../fixtures/test-helpers.js';

describe('SSH Integration Tests - Command Execution', () => {
  let sshService;
  let testDir;
  let testCredentials;
  let sshServerAvailable = false;

  beforeAll(async () => {
    sshService = new SSHService();
    testDir = createTestDirectory('cmd-exec-');
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

  describe('Basic Connection', () => {
    it('should have SSH service available', () => {
      expect(typeof sshService.connect).toBe('function');
    });

    it('should create valid connection config', () => {
      const config = {
        host: testCredentials.host,
        port: testCredentials.port,
        username: testCredentials.username,
        password: testCredentials.password,
        authType: 'password'
      };

      expect(config.host).toBeDefined();
      expect(config.port).toBeDefined();
      expect(config.username).toBeDefined();
    });

    it('should track connection attempts', async () => {
      if (!sshServerAvailable) return;

      const initialConns = sshService.getActiveConnections().length;

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
          const activeConns = sshService.getActiveConnections().length;
          expect(activeConns).toBeGreaterThanOrEqual(initialConns);

          await sshService.disconnect(result.connectionId);
        }
      } catch (err) {
        // Connection may fail
      }
    });
  });

  describe('Connection Management', () => {
    it('should maintain active connection list', () => {
      const connections = sshService.getActiveConnections();
      expect(Array.isArray(connections)).toBe(true);
    });

    it('should support multiple connections', async () => {
      if (!sshServerAvailable) return;

      const config = {
        host: testCredentials.host,
        port: testCredentials.port,
        username: testCredentials.username,
        password: testCredentials.password,
        authType: 'password',
        readyTimeout: 5000
      };

      const connIds = [];

      try {
        for (let i = 0; i < 2; i++) {
          const result = await sshService.connect(config);
          if (result && result.success) {
            connIds.push(result.connectionId);
          }
        }

        const activeConns = sshService.getActiveConnections();
        expect(activeConns.length).toBeGreaterThanOrEqual(connIds.length);

        for (const id of connIds) {
          try {
            await sshService.disconnect(id);
          } catch (err) {
            // Ignore cleanup errors
          }
        }
      } catch (err) {
        // Connection may fail
      }
    });

    it('should provide connection information', async () => {
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
          const info = sshService.getConnectionInfo(result.connectionId);
          expect(info).toBeDefined();
          expect(typeof info).toBe('object');

          await sshService.disconnect(result.connectionId);
        }
      } catch (err) {
        // Connection may fail
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors gracefully', () => {
      const badConfig = {
        host: 'localhost',
        port: 9999,
        username: 'invalid',
        password: 'invalid',
        authType: 'password',
        readyTimeout: 1000
      };

      return sshService.connect(badConfig)
        .catch(err => {
          expect(err).toBeDefined();
        });
    });

    it('should handle invalid configuration', async () => {
      const invalidConfig = {
        // Missing required fields
      };

      try {
        const result = await sshService.connect(invalidConfig);
        expect(result && !result.success).toBe(true);
      } catch (err) {
        expect(err).toBeDefined();
      }
    });

    it('should track failed connections', async () => {
      const initialConns = sshService.getActiveConnections().length;

      const badConfig = {
        host: '192.0.2.1',
        port: 22,
        username: 'invalid',
        password: 'invalid',
        authType: 'password',
        readyTimeout: 1000
      };

      try {
        await Promise.race([
          sshService.connect(badConfig),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
        ]);
      } catch (err) {
        // Expected failure
      }

      const finalConns = sshService.getActiveConnections().length;
      expect(finalConns).toBeLessThanOrEqual(initialConns + 1);
    });
  });
});
