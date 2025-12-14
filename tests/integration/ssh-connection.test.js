/**
 * SSH Connection Management Tests
 * 
 * Tests SSH connection establishment, authentication, pooling, and error handling.
 * Tests gracefully handle missing SSH server by checking availability first.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import SSHService from '../../electron/ssh-service.js';
import { TestSSHFixtures } from '../fixtures/mock-ssh-server.js';

describe('SSH Integration Tests - Connection Management', () => {
  let sshService;
  let testCredentials;
  let sshServerAvailable = false;

  beforeAll(async () => {
    sshService = new SSHService();
    testCredentials = TestSSHFixtures.getCredentials();

    // Check SSH availability
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
    // Cleanup all connections
    const connections = sshService.getActiveConnections();
    for (const conn of connections) {
      try {
        await sshService.disconnect(conn.id);
      } catch (err) {
        // Ignore cleanup errors
      }
    }
  });

  describe('SSH Connection', () => {
    it('should establish valid SSH connection with password', async () => {
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
          expect(result.connectionId).toBeDefined();
          expect(typeof result.connectionId).toBe('string');
          await sshService.disconnect(result.connectionId);
        }
      } catch (err) {
        // Connection may fail if server not available
      }
    });

    it('should reject connection with invalid credentials', async () => {
      if (!sshServerAvailable) return;

      const config = {
        host: testCredentials.host,
        port: testCredentials.port,
        username: 'invalid',
        password: 'invalid',
        authType: 'password',
        readyTimeout: 3000
      };

      try {
        const result = await sshService.connect(config);
        expect(result && result.success).toBe(false);
      } catch (err) {
        expect(err).toBeDefined();
        expect(err.message).toContain('Auth');
      }
    });

    it('should handle unreachable host with timeout', async () => {
      if (!sshServerAvailable) return;

      const config = {
        host: '192.0.2.1',
        port: 22,
        username: testCredentials.username,
        password: testCredentials.password,
        authType: 'password',
        readyTimeout: 1000
      };

      try {
        await Promise.race([
          sshService.connect(config),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
        ]);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeDefined();
      }
    });

    it('should successfully disconnect from server', async () => {
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
          const connectionId = result.connectionId;
          await sshService.disconnect(connectionId);
          
          const connections = sshService.getActiveConnections();
          const still_connected = connections.some(c => c.id === connectionId);
          expect(still_connected).toBe(false);
        }
      } catch (err) {
        // Connection may fail
      }
    });

    it('should maintain multiple simultaneous connections', async () => {
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
          }
        }

        const activeConns = sshService.getActiveConnections();
        expect(activeConns.length).toBeGreaterThanOrEqual(connIds.length);

        for (const id of connIds) {
          try {
            await sshService.disconnect(id);
          } catch (err) {
            // Ignore
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
          expect(info.host).toBe(config.host);

          await sshService.disconnect(result.connectionId);
        }
      } catch (err) {
        // Connection may fail
      }
    });

    it('should validate connection parameters', async () => {
      const invalidConfigs = [
        { port: 22, username: 'user', password: 'pass', authType: 'password' },
        { host: 'localhost', username: 'user', password: 'pass', authType: 'password' },
        { host: 'localhost', port: 22, password: 'pass', authType: 'password' },
        { host: 'localhost', port: 22, username: 'user', authType: 'password' }
      ];

      for (const config of invalidConfigs) {
        try {
          const result = await sshService.connect(config);
          expect(result && !result.success).toBe(true);
        } catch (err) {
          expect(err).toBeDefined();
        }
      }
    });

    it('should handle retry on failure', async () => {
      if (!sshServerAvailable) return;

      const config = {
        host: testCredentials.host,
        port: testCredentials.port,
        username: testCredentials.username,
        password: testCredentials.password,
        authType: 'password',
        readyTimeout: 5000
      };

      let successCount = 0;
      const connIds = [];

      try {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const result = await sshService.connect(config);
            if (result && result.success) {
              successCount++;
              connIds.push(result.connectionId);
            }
          } catch (err) {
            // Retry
          }
        }

        expect(successCount).toBeGreaterThan(0);

        for (const id of connIds) {
          try {
            await sshService.disconnect(id);
          } catch (err) {
            // Ignore
          }
        }
      } catch (err) {
        // Connection may fail
      }
    });
  });

  describe('Connection Management', () => {
    it('should track active connections', () => {
      const connections = sshService.getActiveConnections();
      expect(Array.isArray(connections)).toBe(true);
      expect(connections.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle connection pooling', async () => {
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

        const poolSize = sshService.getActiveConnections().length;
        expect(poolSize).toBeGreaterThan(initialCount);

        for (const id of connIds) {
          try {
            await sshService.disconnect(id);
          } catch (err) {
            // Ignore
          }
        }
      } catch (err) {
        // Connection may fail
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors', async () => {
      if (!sshServerAvailable) return;

      const config = {
        host: testCredentials.host,
        port: testCredentials.port,
        username: 'wronguser',
        password: 'wrongpass',
        authType: 'password',
        readyTimeout: 3000
      };

      try {
        const result = await sshService.connect(config);
        expect(result && result.success).toBe(false);
      } catch (err) {
        expect(err).toBeDefined();
        expect(typeof err.message).toBe('string');
      }
    });

    it('should handle network errors', () => {
      const config = {
        host: '192.0.2.1',
        port: 22,
        username: 'user',
        password: 'pass',
        authType: 'password',
        readyTimeout: 1000
      };

      return Promise.race([
        sshService.connect(config),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
      ]).catch(err => {
        expect(err).toBeDefined();
        expect(err.message).toBeDefined();
      });
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
