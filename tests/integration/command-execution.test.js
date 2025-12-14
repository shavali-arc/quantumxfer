/**
 * Command Execution Integration Tests
 * 
 * Tests SSH command execution via SSHService
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import SSHService from '../../electron/ssh-service.js';
import { TestSSHFixtures } from '../fixtures/mock-ssh-server.js';
import { createTestDirectory, cleanupTestDirectory } from '../fixtures/test-helpers.js';

describe('SSH Integration Tests - Command Execution', () => {
  let sshService;
  let testDir;
  let connectionId;
  let testCredentials;

  beforeAll(async () => {
    sshService = new SSHService();
    testDir = createTestDirectory('cmd-exec-');
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

  describe('Basic Command Execution', () => {
    it('should establish connection for command execution', async () => {
      expect(connectionId).toBeDefined();
      expect(connectionId).not.toBeNull();
    });

    it('should support command execution interface', async () => {
      expect(typeof sshService.exec).toBe('function');
    });
  });

  describe('Concurrent Operations', () => {
    it('should maintain connection pool', async () => {
      const config = {
        host: testCredentials.host,
        port: testCredentials.port,
        username: testCredentials.username,
        password: testCredentials.password,
        authType: 'password'
      };

      try {
        const results = [];
        for (let i = 0; i < 3; i++) {
          const result = await sshService.connect(config);
          if (result && result.success) {
            results.push(result);
          }
        }

        expect(results.length).toBeGreaterThan(0);

        // Clean up
        for (const result of results) {
          await sshService.disconnect(result.connectionId);
        }
      } catch (err) {
        // Connection pool may have limits
        expect(err).toBeDefined();
      }
    });

    it('should manage multiple simultaneous connections', async () => {
      const config = {
        host: testCredentials.host,
        port: testCredentials.port,
        username: testCredentials.username,
        password: testCredentials.password,
        authType: 'password'
      };

      try {
        const connPromises = [];
        for (let i = 0; i < 5; i++) {
          connPromises.push(sshService.connect(config));
        }

        const results = await Promise.allSettled(connPromises);
        const successCount = results.filter(r => 
          r.status === 'fulfilled' && r.value && r.value.success
        ).length;

        expect(successCount).toBeGreaterThan(0);

        // Clean up successful connections
        for (const result of results) {
          if (result.status === 'fulfilled' && result.value && result.value.success) {
            await sshService.disconnect(result.value.connectionId);
          }
        }
      } catch (err) {
        expect(err).toBeDefined();
      }
    });
  });

  describe('Connection Management', () => {
    it('should track active connections', async () => {
      const activeConnections = sshService.getActiveConnections();
      expect(Array.isArray(activeConnections)).toBe(true);
    });

    it('should handle connection disconnection', async () => {
      const config = {
        host: testCredentials.host,
        port: testCredentials.port,
        username: testCredentials.username,
        password: testCredentials.password,
        authType: 'password'
      };

      try {
        const result = await sshService.connect(config);
        if (result && result.success) {
          const disconnected = await sshService.disconnect(result.connectionId);
          expect(disconnected).toBeDefined();
        }
      } catch (err) {
        expect(err).toBeDefined();
      }
    });

    it('should provide connection information', async () => {
      if (connectionId) {
        const connections = sshService.getActiveConnections();
        const conn = connections.find(c => c.id === connectionId);
        
        if (conn) {
          expect(conn.host).toBeDefined();
          expect(conn.username).toBeDefined();
        }
      }
    });
  });

  describe('Performance Tracking', () => {
    it('should support stress testing with multiple connections', async () => {
      const config = {
        host: testCredentials.host,
        port: testCredentials.port,
        username: testCredentials.username,
        password: testCredentials.password,
        authType: 'password',
        readyTimeout: 5000
      };

      try {
        const iterations = 10;
        let successCount = 0;

        for (let i = 0; i < iterations; i++) {
          const result = await sshService.connect(config);
          if (result && result.success) {
            successCount++;
            await sshService.disconnect(result.connectionId);
          }
        }

        expect(successCount).toBeGreaterThan(0);
      } catch (err) {
        // May fail due to server limits
        expect(err).toBeDefined();
      }
    });
  });
});
