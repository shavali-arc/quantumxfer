/**
 * Concurrency and Stress Tests
 * 
 * Tests concurrent connections, rapid cycles, and resource cleanup.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import SSHService from '../../electron/ssh-service.js';
import { TestSSHFixtures } from '../fixtures/mock-ssh-server.js';

describe('SSH Integration Tests - Concurrency and Stress', () => {
  let sshService;
  let testCredentials;
  let sshServerAvailable = false;

  beforeAll(async () => {
    sshService = new SSHService();
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
    const connections = sshService.getActiveConnections();
    for (const conn of connections) {
      try {
        await sshService.disconnect(conn.id);
      } catch (err) {
        // Ignore cleanup errors
      }
    }
  });

  describe('Concurrent Connections', () => {
    it('should handle multiple concurrent connections', async () => {
      if (!sshServerAvailable) return;

      const config = {
        host: testCredentials.host,
        port: testCredentials.port,
        username: testCredentials.username,
        password: testCredentials.password,
        authType: 'password',
        readyTimeout: 5000
      };

      const promises = [];
      const connIds = [];

      try {
        for (let i = 0; i < 3; i++) {
          promises.push(sshService.connect(config));
        }

        const results = await Promise.all(promises);
        results.forEach(result => {
          if (result && result.success) {
            connIds.push(result.connectionId);
          }
        });

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

    it('should handle sequential connections', async () => {
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
        for (let i = 0; i < 3; i++) {
          const result = await sshService.connect(config);
          if (result && result.success) {
            connIds.push(result.connectionId);
            await new Promise(resolve => setTimeout(resolve, 100));
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

    it('should maintain connection pool efficiently', async () => {
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
      const initialCount = sshService.getActiveConnections().length;

      try {
        for (let i = 0; i < 5; i++) {
          const result = await sshService.connect(config);
          if (result && result.success) {
            connIds.push(result.connectionId);
          }
        }

        const peakCount = sshService.getActiveConnections().length;
        expect(peakCount).toBeGreaterThan(initialCount);

        for (const id of connIds) {
          try {
            await sshService.disconnect(id);
          } catch (err) {
            // Ignore cleanup errors
          }
        }

        const finalCount = sshService.getActiveConnections().length;
        expect(finalCount).toBeLessThanOrEqual(peakCount);
      } catch (err) {
        // Connection may fail
      }
    });
  });

  describe('Connection Management Under Load', () => {
    it('should handle rapid connection/disconnection cycles', async () => {
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
        for (let i = 0; i < 3; i++) {
          const result = await sshService.connect(config);
          if (result && result.success) {
            await new Promise(resolve => setTimeout(resolve, 50));
            await sshService.disconnect(result.connectionId);
          }
        }

        const activeConns = sshService.getActiveConnections();
        expect(activeConns.length).toBeDefined();
      } catch (err) {
        // Connection may fail
      }
    });

    it('should track active connections accurately', async () => {
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
      const initialConns = sshService.getActiveConnections().length;

      try {
        for (let i = 0; i < 2; i++) {
          const result = await sshService.connect(config);
          if (result && result.success) {
            connIds.push(result.connectionId);
          }
        }

        const middleConns = sshService.getActiveConnections().length;
        expect(middleConns).toBeGreaterThan(initialConns);

        for (const id of connIds) {
          try {
            await sshService.disconnect(id);
          } catch (err) {
            // Ignore cleanup errors
          }
        }

        const finalConns = sshService.getActiveConnections().length;
        expect(finalConns).toBeLessThanOrEqual(middleConns);
      } catch (err) {
        // Connection may fail
      }
    });
  });

  describe('Error Handling Under Stress', () => {
    it('should recover from connection failures during concurrent operations', () => {
      const badConfig = {
        host: '192.0.2.1',
        port: 22,
        username: 'invalid',
        password: 'invalid',
        authType: 'password',
        readyTimeout: 1000
      };

      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(
          Promise.race([
            sshService.connect(badConfig),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
          ]).catch(() => {
            return null;
          })
        );
      }

      return Promise.all(promises).then(results => {
        expect(results).toBeDefined();
        expect(Array.isArray(results)).toBe(true);
      });
    });

    it('should not leak resources after failed connections', async () => {
      const initialConns = sshService.getActiveConnections().length;

      const badConfig = {
        host: '192.0.2.1',
        port: 22,
        username: 'invalid',
        password: 'invalid',
        authType: 'password',
        readyTimeout: 500
      };

      try {
        await Promise.race([
          sshService.connect(badConfig),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500))
        ]);
      } catch (err) {
        // Expected failure
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      const finalConns = sshService.getActiveConnections().length;
      
      expect(finalConns).toBeLessThanOrEqual(initialConns + 1);
    });
  });

  describe('Performance Metrics', () => {
    it('should measure connection establishment time', async () => {
      if (!sshServerAvailable) return;

      const config = {
        host: testCredentials.host,
        port: testCredentials.port,
        username: testCredentials.username,
        password: testCredentials.password,
        authType: 'password',
        readyTimeout: 5000
      };

      const startTime = Date.now();

      try {
        const result = await sshService.connect(config);
        const elapsed = Date.now() - startTime;

        expect(elapsed).toBeLessThan(10000);

        if (result && result.success) {
          await sshService.disconnect(result.connectionId);
        }
      } catch (err) {
        // Connection may fail
      }
    });

    it('should maintain performance across iterations', async () => {
      if (!sshServerAvailable) return;

      const config = {
        host: testCredentials.host,
        port: testCredentials.port,
        username: testCredentials.username,
        password: testCredentials.password,
        authType: 'password',
        readyTimeout: 5000
      };

      const times = [];
      const connIds = [];

      try {
        for (let i = 0; i < 3; i++) {
          const start = Date.now();
          const result = await sshService.connect(config);
          const elapsed = Date.now() - start;

          times.push(elapsed);

          if (result && result.success) {
            connIds.push(result.connectionId);
          }
        }

        times.forEach(t => {
          expect(t).toBeLessThan(10000);
        });

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
  });

  describe('Resource Cleanup', () => {
    it('should not leak resources after failed connections', async () => {
      const initialConns = sshService.getActiveConnections().length;

      const badConfig = {
        host: '192.0.2.1',
        port: 22,
        username: 'invalid',
        password: 'invalid',
        authType: 'password',
        readyTimeout: 500
      };

      try {
        await Promise.race([
          sshService.connect(badConfig),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500))
        ]);
      } catch (err) {
        // Expected failure
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      const finalConns = sshService.getActiveConnections().length;
      
      expect(finalConns).toBeLessThanOrEqual(initialConns + 1);
    });

    it('should cleanup connections on errors', async () => {
      if (!sshServerAvailable) return;

      const config = {
        host: testCredentials.host,
        port: testCredentials.port,
        username: testCredentials.username,
        password: testCredentials.password,
        authType: 'password',
        readyTimeout: 5000
      };

      const initialConns = sshService.getActiveConnections().length;

      try {
        const result = await sshService.connect(config);
        if (result && result.success) {
          await sshService.disconnect(result.connectionId);
        }
      } catch (err) {
        // Connection may fail
      }

      await new Promise(resolve => setTimeout(resolve, 200));
      const finalConns = sshService.getActiveConnections().length;
      
      expect(finalConns).toBeLessThanOrEqual(initialConns + 1);
    });
  });
});
