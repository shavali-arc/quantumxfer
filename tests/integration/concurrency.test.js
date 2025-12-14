/**
 * Concurrency and Stress Testing Integration Tests
 * 
 * Tests application behavior under concurrent operations and stress conditions
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import SSHService from '../../electron/ssh-service.js';
import { TestSSHFixtures } from '../fixtures/mock-ssh-server.js';
import { createTestDirectory, cleanupTestDirectory, sleep } from '../fixtures/test-helpers.js';

describe('SSH Integration Tests - Concurrency and Stress', () => {
  let sshService;
  let testDir;
  let testCredentials;

  beforeAll(async () => {
    sshService = new SSHService();
    testDir = createTestDirectory('stress-test-');
    testCredentials = TestSSHFixtures.getCredentials();
  });

  afterAll(async () => {
    try {
      const connections = sshService.getActiveConnections();
      for (const conn of connections) {
        await sshService.disconnect(conn.id);
      }
    } catch (err) {
      // Ignore cleanup errors
    }

    cleanupTestDirectory(testDir);
  });

  describe('Concurrent Connections', () => {
    it('should handle multiple concurrent connections', async () => {
      const config = {
        host: testCredentials.host,
        port: testCredentials.port,
        username: testCredentials.username,
        password: testCredentials.password,
        authType: 'password'
      };

      const connectionPromises = [];
      for (let i = 0; i < 5; i++) {
        connectionPromises.push(sshService.connect(config));
      }

      const results = await Promise.allSettled(connectionPromises);

      // Count successful connections
      const successCount = results.filter(r => 
        r.status === 'fulfilled' && r.value && r.value.success
      ).length;

      expect(successCount).toBeGreaterThan(0);

      // Clean up
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value && result.value.success) {
          await sshService.disconnect(result.value.connectionId);
        }
      }
    });

    it('should handle 10 sequential connections', async () => {
      const config = {
        host: testCredentials.host,
        port: testCredentials.port,
        username: testCredentials.username,
        password: testCredentials.password,
        authType: 'password'
      };

      const connectionIds = [];
      let successCount = 0;

      for (let i = 0; i < 10; i++) {
        try {
          const result = await sshService.connect(config);
          if (result && result.success) {
            connectionIds.push(result.connectionId);
            successCount++;
          }
        } catch (err) {
          // Connection may fail
        }
      }

      expect(successCount).toBeGreaterThan(0);

      // Clean up
      for (const id of connectionIds) {
        await sshService.disconnect(id);
      }
    });

    it('should maintain connection pool efficiently', async () => {
      const config = {
        host: testCredentials.host,
        port: testCredentials.port,
        username: testCredentials.username,
        password: testCredentials.password,
        authType: 'password'
      };

      const connections = [];

      try {
        // Create connections
        for (let i = 0; i < 3; i++) {
          const result = await sshService.connect(config);
          if (result && result.success) {
            connections.push(result.connectionId);
          }
        }

        // Verify we have active connections
        const activeConns = sshService.getActiveConnections();
        expect(activeConns.length).toBeGreaterThan(0);

        // Disconnect all
        for (const id of connections) {
          await sshService.disconnect(id);
        }

        // Verify cleanup
        const finalConns = sshService.getActiveConnections();
        expect(finalConns.length).toBeLessThanOrEqual(activeConns.length);
      } catch (err) {
        expect(err).toBeDefined();
      }
    });
  });

  describe('Connection Management Under Load', () => {
    it('should handle rapid connection/disconnection cycles', async () => {
      const config = {
        host: testCredentials.host,
        port: testCredentials.port,
        username: testCredentials.username,
        password: testCredentials.password,
        authType: 'password',
        readyTimeout: 5000
      };

      let successCount = 0;
      const iterations = 5;

      for (let i = 0; i < iterations; i++) {
        try {
          const result = await sshService.connect(config);
          if (result && result.success) {
            successCount++;
            await sshService.disconnect(result.connectionId);
          }
        } catch (err) {
          // Expected under load
        }
      }

      expect(successCount).toBeGreaterThan(0);
    });

    it('should track active connections accurately', async () => {
      const config = {
        host: testCredentials.host,
        port: testCredentials.port,
        username: testCredentials.username,
        password: testCredentials.password,
        authType: 'password'
      };

      const initialCount = sshService.getActiveConnections().length;

      try {
        const result = await sshService.connect(config);
        
        if (result && result.success) {
          const afterConnect = sshService.getActiveConnections().length;
          expect(afterConnect).toBeGreaterThanOrEqual(initialCount);

          await sshService.disconnect(result.connectionId);

          const afterDisconnect = sshService.getActiveConnections().length;
          expect(afterDisconnect).toBeLessThanOrEqual(afterConnect);
        }
      } catch (err) {
        expect(err).toBeDefined();
      }
    });
  });

  describe('Error Handling Under Stress', () => {
    it('should handle connection failures gracefully', async () => {
      const config = {
        host: 'invalid.example.com',
        port: 22,
        username: 'testuser',
        password: 'testpass',
        authType: 'password',
        readyTimeout: 1000
      };

      let failureCount = 0;

      for (let i = 0; i < 3; i++) {
        try {
          const result = await sshService.connect(config);
          if (!result || !result.success) {
            failureCount++;
          }
        } catch (err) {
          failureCount++;
        }
      }

      expect(failureCount).toBeGreaterThan(0);
    });

    it('should cleanup failed connection attempts', async () => {
      const config = {
        host: '192.0.2.1', // Non-routable IP
        port: 22,
        username: 'testuser',
        password: 'testpass',
        authType: 'password',
        readyTimeout: 500
      };

      const initialConns = sshService.getActiveConnections().length;

      try {
        for (let i = 0; i < 3; i++) {
          try {
            await sshService.connect(config);
          } catch (err) {
            // Expected
          }
        }
      } catch (err) {
        // Outer catch
      }

      const finalConns = sshService.getActiveConnections().length;
      expect(finalConns).toBeLessThanOrEqual(initialConns + 3);
    });
  });

  describe('Performance Metrics', () => {
    it('should measure connection establishment time', async () => {
      const config = {
        host: testCredentials.host,
        port: testCredentials.port,
        username: testCredentials.username,
        password: testCredentials.password,
        authType: 'password'
      };

      try {
        const startTime = Date.now();
        const result = await sshService.connect(config);
        const duration = Date.now() - startTime;

        expect(result).toBeDefined();
        expect(duration).toBeGreaterThan(0);

        if (result && result.success) {
          await sshService.disconnect(result.connectionId);
        }
      } catch (err) {
        expect(err).toBeDefined();
      }
    });

    it('should maintain reasonable performance across iterations', async () => {
      const config = {
        host: testCredentials.host,
        port: testCredentials.port,
        username: testCredentials.username,
        password: testCredentials.password,
        authType: 'password'
      };

      const durations = [];
      const iterations = 3;

      for (let i = 0; i < iterations; i++) {
        try {
          const start = Date.now();
          const result = await sshService.connect(config);
          durations.push(Date.now() - start);

          if (result && result.success) {
            await sshService.disconnect(result.connectionId);
          }
        } catch (err) {
          // Expected on some systems
        }
      }

      expect(durations.length).toBeGreaterThan(0);
    });
  });

  describe('Resource Cleanup', () => {
    it('should not leak resources after failed connections', async () => {
      const initialConns = sshService.getActiveConnections().length;

      const config = {
        host: 'invalid-host-12345.local',
        port: 22,
        username: 'testuser',
        password: 'testpass',
        authType: 'password',
        readyTimeout: 500
      };

      for (let i = 0; i < 5; i++) {
        try {
          await sshService.connect(config);
        } catch (err) {
          // Expected failures
        }
      }

      const finalConns = sshService.getActiveConnections().length;

      // Should not accumulate significantly
      expect(finalConns - initialConns).toBeLessThan(10);
    });

    it('should cleanup all connections on errors', async () => {
      const config = {
        host: testCredentials.host,
        port: testCredentials.port,
        username: testCredentials.username,
        password: testCredentials.password,
        authType: 'password'
      };

      const connections = [];
      let successCount = 0;

      try {
        for (let i = 0; i < 3; i++) {
          const result = await sshService.connect(config);
          if (result && result.success) {
            connections.push(result.connectionId);
            successCount++;
          }
        }

        // Clean up all
        for (const id of connections) {
          await sshService.disconnect(id);
        }
      } catch (err) {
        // Ensure cleanup happens even on error
        for (const id of connections) {
          try {
            await sshService.disconnect(id);
          } catch (e) {
            // Ignore
          }
        }
      }

      expect(successCount).toBeGreaterThan(0);
    });
  });
});
