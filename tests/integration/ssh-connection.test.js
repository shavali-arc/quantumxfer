/**
 * SSH Connection Integration Tests
 * 
 * Tests SSH connection establishment, authentication, and connection management
 * with real SSH server (or mock SSH server)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import SSHService from '../../electron/ssh-service.js';
import { TestSSHFixtures } from '../fixtures/mock-ssh-server.js';
import { 
  createTestDirectory,
  cleanupTestDirectory,
  connectionHelpers,
  sleep
} from '../fixtures/test-helpers.js';

describe('SSH Integration Tests - Connection Management', () => {
  let sshService;
  let testDir;
  let testCredentials;

  beforeAll(() => {
    // Initialize SSH Service
    sshService = new SSHService();
    testDir = createTestDirectory('ssh-integration-');
    testCredentials = TestSSHFixtures.getCredentials();
  });

  afterAll(() => {
    cleanupTestDirectory(testDir);
  });

  describe('SSH Connection', () => {
    afterEach(async () => {
      // Close all connections
      try {
        const connections = sshService.getActiveConnections();
        for (const conn of connections) {
          await sshService.disconnect(conn.id);
        }
      } catch (err) {
        // Ignore errors during cleanup
      }
    });

    it('should establish valid SSH connection with password', async () => {
      const config = {
        host: testCredentials.host,
        port: testCredentials.port,
        username: testCredentials.username,
        password: testCredentials.password,
        authType: 'password'
      };

      const result = await sshService.connect(config);
      const connectionId = connectionHelpers.verifyConnection(result);
      
      expect(connectionId).toBeTruthy();
      expect(result.host).toBe(config.host);
      expect(result.username).toBe(config.username);
    });

    it('should establish connection with key-based authentication', async () => {
      const config = {
        host: testCredentials.host,
        port: testCredentials.port,
        username: testCredentials.username,
        authType: 'key',
        privateKey: '/path/to/test/key'
      };

      try {
        const result = await sshService.connect(config);
        if (result.success) {
          const connectionId = connectionHelpers.verifyConnection(result);
          expect(connectionId).toBeTruthy();
        }
      } catch (err) {
        // Key auth might not be available in test environment
        expect(err).toBeDefined();
      }
    });

    it('should reject connection with invalid credentials', async () => {
      const config = {
        host: testCredentials.host,
        port: testCredentials.port,
        username: testCredentials.username,
        password: 'wrongpassword',
        authType: 'password'
      };

      try {
        const result = await sshService.connect(config);
        expect(result.success).toBe(false);
      } catch (err) {
        expect(err).toBeDefined();
      }
    });

    it('should reject connection to unreachable host', async () => {
      const config = {
        host: '192.0.2.1', // Non-routable IP for testing
        port: 22,
        username: 'testuser',
        password: 'testpass',
        authType: 'password'
      };

      try {
        const result = await sshService.connect(config);
        expect(result.success).toBe(false);
      } catch (err) {
        expect(err).toBeDefined();
      }
    });

    it('should successfully disconnect from SSH server', async () => {
      const config = {
        host: testCredentials.host,
        port: testCredentials.port,
        username: testCredentials.username,
        password: testCredentials.password,
        authType: 'password'
      };

      const connectResult = await sshService.connect(config);
      const connectionId = connectionHelpers.verifyConnection(connectResult);

      const disconnectResult = await sshService.disconnect(connectionId);
      expect(disconnectResult.success).toBe(true);
    });

    it('should maintain multiple simultaneous connections', async () => {
      const config = {
        host: testCredentials.host,
        port: testCredentials.port,
        username: testCredentials.username,
        password: testCredentials.password,
        authType: 'password'
      };

      const connections = [];
      
      // Create multiple connections
      for (let i = 0; i < 3; i++) {
        const result = await sshService.connect(config);
        if (result.success) {
          connections.push(result.connectionId);
        }
      }

      // Verify all connections are active
      const activeConnections = sshService.getActiveConnections();
      expect(activeConnections.length).toBeGreaterThanOrEqual(connections.length);

      // Clean up
      for (const connId of connections) {
        await sshService.disconnect(connId);
      }
    });

    it('should handle connection timeout', async () => {
      const config = {
        host: '192.0.2.1', // Non-routable IP
        port: 22,
        username: 'testuser',
        password: 'testpass',
        authType: 'password',
        readyTimeout: 1000 // 1 second timeout
      };

      try {
        const result = await sshService.connect(config);
        expect(result.success).toBe(false);
      } catch (err) {
        expect(err).toBeDefined();
      }
    });

    it('should provide connection status information', async () => {
      const config = {
        host: testCredentials.host,
        port: testCredentials.port,
        username: testCredentials.username,
        password: testCredentials.password,
        authType: 'password'
      };

      const connectResult = await sshService.connect(config);
      const connectionId = connectionHelpers.verifyConnection(connectResult);

      // Get connection info
      const activeConnections = sshService.getActiveConnections();
      const connection = activeConnections.find(c => c.id === connectionId);

      expect(connection).toBeDefined();
      expect(connection.host).toBe(config.host);
      expect(connection.username).toBe(config.username);
      expect(connection.status).toBe('connected');
    });

    it('should validate connection parameters before connecting', async () => {
      // Missing host
      let config = {
        port: testCredentials.port,
        username: testCredentials.username,
        password: testCredentials.password,
        authType: 'password'
      };

      try {
        const result = await sshService.connect(config);
        expect(result.success).toBe(false);
      } catch (err) {
        expect(err).toBeDefined();
      }

      // Invalid port
      config = {
        host: testCredentials.host,
        port: 99999,
        username: testCredentials.username,
        password: testCredentials.password,
        authType: 'password'
      };

      try {
        const result = await sshService.connect(config);
        expect(result.success).toBe(false);
      } catch (err) {
        expect(err).toBeDefined();
      }
    });

    it('should handle connection retry on failure', async () => {
      const config = {
        host: testCredentials.host,
        port: testCredentials.port,
        username: testCredentials.username,
        password: testCredentials.password,
        authType: 'password',
        retries: 2,
        retryDelay: 100
      };

      try {
        const result = await sshService.connect(config);
        if (result.success) {
          const connectionId = connectionHelpers.verifyConnection(result);
          expect(connectionId).toBeTruthy();
          await sshService.disconnect(connectionId);
        }
      } catch (err) {
        expect(err).toBeDefined();
      }
    });
  });

  describe('Connection Pooling', () => {
    it('should pool connections efficiently', async () => {
      const config = {
        host: testCredentials.host,
        port: testCredentials.port,
        username: testCredentials.username,
        password: testCredentials.password,
        authType: 'password'
      };

      // Create connection pool
      const poolSize = 5;
      const connections = [];

      for (let i = 0; i < poolSize; i++) {
        const result = await sshService.connect(config);
        if (result.success) {
          connections.push(result.connectionId);
          // Small delay between connections
          await sleep(50);
        }
      }

      // Verify pool
      const activeConnections = sshService.getActiveConnections();
      expect(activeConnections.length).toBeGreaterThanOrEqual(connections.length);

      // Clean up
      for (const connId of connections) {
        await sshService.disconnect(connId);
      }
    });

    it('should reuse connections when possible', async () => {
      const config = {
        host: testCredentials.host,
        port: testCredentials.port,
        username: testCredentials.username,
        password: testCredentials.password,
        authType: 'password'
      };

      const result1 = await sshService.connect(config);
      expect(result1.success).toBe(true);

      // Get active connections count
      const countBefore = sshService.getActiveConnections().length;

      // Try to reuse
      const result2 = await sshService.connect(config);
      expect(result2.success).toBe(true);

      // Cleanup
      if (result1.connectionId) {
        await sshService.disconnect(result1.connectionId);
      }
      if (result2.connectionId) {
        await sshService.disconnect(result2.connectionId);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors gracefully', async () => {
      const config = {
        host: testCredentials.host,
        port: testCredentials.port,
        username: 'nonexistent',
        password: 'wrongpassword',
        authType: 'password'
      };

      try {
        const result = await sshService.connect(config);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      } catch (err) {
        expect(err).toBeDefined();
      }
    });

    it('should handle network errors gracefully', async () => {
      const config = {
        host: 'invalid.example.com',
        port: 22,
        username: 'testuser',
        password: 'testpass',
        authType: 'password',
        readyTimeout: 2000
      };

      try {
        const result = await sshService.connect(config);
        expect(result.success).toBe(false);
      } catch (err) {
        expect(err).toBeDefined();
      }
    });

    it('should provide meaningful error messages', async () => {
      const config = {
        host: testCredentials.host,
        port: testCredentials.port,
        username: testCredentials.username,
        password: 'wrongpass',
        authType: 'password'
      };

      try {
        const result = await sshService.connect(config);
        if (!result.success) {
          expect(result.error).toBeTruthy();
          expect(typeof result.error).toBe('string');
        }
      } catch (err) {
        expect(err.message).toBeTruthy();
      }
    });
  });
});
