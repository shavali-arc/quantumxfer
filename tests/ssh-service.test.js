import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import SSHService from '../electron/ssh-service.js';
import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';

// Mock ssh2 Client
vi.mock('ssh2', () => ({
  Client: vi.fn()
}));

vi.mock('fs');
vi.mock('path', async () => {
  const actualPath = await vi.importActual('path');
  return {
    ...actualPath,
    posix: {
      ...actualPath.posix,
      join: vi.fn((...args) => args.join('/'))
    }
  };
});

describe('SSHService', () => {
  let sshService;

  function createMockClient() {
    return {
      handlers: {},
      on: vi.fn(function(event, handler) {
        this.handlers[event] = handler;
        return this;
      }),
      connect: vi.fn(function() {
        if (this.handlers && this.handlers.ready) {
          setTimeout(() => this.handlers.ready(), 5);
        }
      }),
      exec: vi.fn(),
      sftp: vi.fn(),
      end: vi.fn()
    };
  }

  function getMockClient() {
    const results = Client.mock.results;
    return results.length > 0 ? results[results.length - 1].value : null;
  }

  beforeEach(() => {
    sshService = new SSHService();
    Client.mockClear();
    Client.mockImplementation(createMockClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('connect', () => {
    it('should successfully connect with password authentication', async () => {
      const config = {
        host: 'example.com',
        port: 22,
        username: 'user',
        password: 'pass123'
      };

      const promise = sshService.connect(config);
      const mockClient = getMockClient();
      if (mockClient.handlers && mockClient.handlers.ready) {
        mockClient.handlers.ready();
      }

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.connectionId).toBeDefined();
      expect(result.serverInfo.host).toBe('example.com');
      expect(result.serverInfo.username).toBe('user');
    });

    it('should successfully connect with private key authentication', async () => {
      const keyPath = '/path/to/key';
      const config = {
        host: 'example.com',
        port: 22,
        username: 'user',
        privateKey: keyPath
      };

      fs.readFileSync.mockReturnValue('private key content');

      const promise = sshService.connect(config);
      const mockClient = getMockClient();
      if (mockClient.handlers && mockClient.handlers.ready) {
        mockClient.handlers.ready();
      }

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.connectionId).toBeDefined();
      expect(fs.readFileSync).toHaveBeenCalledWith(keyPath);
    });

    it('should reject when no authentication method is provided', async () => {
      const config = {
        host: 'example.com',
        port: 22,
        username: 'user'
      };

      try {
        await sshService.connect(config);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.success).toBe(false);
        expect(error.code).toBe('AUTH_ERROR');
      }
    });

    it('should reject when private key file cannot be read', async () => {
      const config = {
        host: 'example.com',
        port: 22,
        username: 'user',
        privateKey: '/nonexistent/key'
      };

      fs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      try {
        await sshService.connect(config);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.success).toBe(false);
        expect(error.code).toBe('PRIVATE_KEY_ERROR');
      }
    });

    it('should handle connection errors', async () => {
      const config = {
        host: 'bad.example.com',
        port: 22,
        username: 'user',
        password: 'pass'
      };

      const promise = sshService.connect(config);
      const mockClient = getMockClient();
      if (mockClient.handlers && mockClient.handlers.error) {
        mockClient.handlers.error(new Error('Connection refused'));
      }

      try {
        await promise;
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.success).toBe(false);
        expect(error.code).toBe('CONNECTION_ERROR');
      }
    });

    it('should default port to 22', async () => {
      const config = {
        host: 'example.com',
        username: 'user',
        password: 'pass'
      };

      const promise = sshService.connect(config);
      const mockClient = getMockClient();
      if (mockClient.handlers && mockClient.handlers.ready) {
        mockClient.handlers.ready();
      }

      await promise;

      const callArgs = mockClient.connect.mock.calls[0][0];
      expect(callArgs.port).toBe(22);
    });
  });

  describe('executeCommand', () => {
    let connectionId;
    let mockClient;

    beforeEach(async () => {
      const config = {
        host: 'example.com',
        port: 22,
        username: 'user',
        password: 'pass'
      };

      const promise = sshService.connect(config);
      mockClient = getMockClient();
      if (mockClient.handlers && mockClient.handlers.ready) {
        mockClient.handlers.ready();
      }

      const result = await promise;
      connectionId = result.connectionId;
    });

    it('should execute command successfully', async () => {
      const command = 'ls -la';
      const stdout = 'file1.txt\nfile2.txt';

      mockClient.exec.mockImplementation((cmd, callback) => {
        const stream = {
          handlers: {},
          on: vi.fn(function(event, handler) {
            this.handlers[event] = handler;
            if (event === 'data') {
              setTimeout(() => handler(Buffer.from(stdout)), 5);
            } else if (event === 'close') {
              setTimeout(() => handler(0, null), 15);
            }
            return this;
          }),
          stderr: {
            on: vi.fn(function(event, handler) {
              return this;
            })
          }
        };
        callback(null, stream);
      });

      const result = await sshService.executeCommand(connectionId, command);

      expect(result.success).toBe(true);
      expect(result.command).toBe(command);
      expect(result.stdout).toContain('file1.txt');
      expect(result.exitCode).toBe(0);
    });

    it('should capture stderr output', async () => {
      const command = 'bad-command';
      const stderr = 'command not found';

      mockClient.exec.mockImplementation((cmd, callback) => {
        const stream = {
          handlers: {},
          on: vi.fn(function(event, handler) {
            this.handlers[event] = handler;
            if (event === 'close') {
              setTimeout(() => handler(127, null), 15);
            }
            return this;
          }),
          stderr: {
            handlers: {},
            on: vi.fn(function(event, handler) {
              this.handlers[event] = handler;
              if (event === 'data') {
                setTimeout(() => handler(Buffer.from(stderr)), 5);
              }
              return this;
            })
          }
        };
        callback(null, stream);
      });

      const result = await sshService.executeCommand(connectionId, command);

      expect(result.success).toBe(true);
      expect(result.stderr).toContain('command not found');
      expect(result.exitCode).toBe(127);
    });

    it('should reject when connection not found', async () => {
      try {
        await sshService.executeCommand(99999, 'ls');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.success).toBe(false);
        expect(error.code).toBe('NO_CONNECTION');
      }
    });

    it('should handle command execution errors', async () => {
      mockClient.exec.mockImplementation((cmd, callback) => {
        callback(new Error('Command execution failed'));
      });

      try {
        await sshService.executeCommand(connectionId, 'ls');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.success).toBe(false);
        expect(error.code).toBe('EXEC_ERROR');
      }
    });
  });

  describe('disconnect', () => {
    it('should disconnect successfully', async () => {
      const config = {
        host: 'example.com',
        port: 22,
        username: 'user',
        password: 'pass'
      };

      const promise = sshService.connect(config);
      const mockClient = getMockClient();
      if (mockClient.handlers && mockClient.handlers.ready) {
        mockClient.handlers.ready();
      }

      const result = await promise;
      const connectionId = result.connectionId;

      expect(sshService.connections.has(connectionId)).toBe(true);

      const disconnectResult = sshService.disconnect(connectionId);
      expect(disconnectResult.success).toBe(true);
      expect(disconnectResult.message).toContain('Disconnected');
    });

    it('should reject when disconnecting non-existent connection', () => {
      const result = sshService.disconnect(99999);
      expect(result.success).toBe(false);
      expect(result.code).toBe('NO_CONNECTION');
    });
  });

  describe('getSFTP', () => {
    let connectionId;
    let mockClient;

    beforeEach(async () => {
      const config = {
        host: 'example.com',
        port: 22,
        username: 'user',
        password: 'pass'
      };

      const promise = sshService.connect(config);
      mockClient = getMockClient();
      if (mockClient.handlers && mockClient.handlers.ready) {
        mockClient.handlers.ready();
      }

      const result = await promise;
      connectionId = result.connectionId;
    });

    it('should get SFTP client successfully', async () => {
      const mockSFTP = { readdir: vi.fn() };
      mockClient.sftp.mockImplementation((callback) => {
        callback(null, mockSFTP);
      });

      const result = await sshService.getSFTP(connectionId);

      expect(result.success).toBe(true);
      expect(result.sftp).toBeDefined();
    });

    it('should reject when SFTP initialization fails', async () => {
      mockClient.sftp.mockImplementation((callback) => {
        callback(new Error('SFTP initialization failed'));
      });

      try {
        await sshService.getSFTP(connectionId);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.success).toBe(false);
        expect(error.code).toBe('SFTP_ERROR');
      }
    });

    it('should reject when connection not found', async () => {
      try {
        await sshService.getSFTP(99999);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.success).toBe(false);
        expect(error.code).toBe('NO_CONNECTION');
      }
    });
  });

  describe('listDirectory', () => {
    let connectionId;
    let mockClient;

    beforeEach(async () => {
      const config = {
        host: 'example.com',
        port: 22,
        username: 'user',
        password: 'pass'
      };

      const promise = sshService.connect(config);
      mockClient = getMockClient();
      if (mockClient.handlers && mockClient.handlers.ready) {
        mockClient.handlers.ready();
      }

      const result = await promise;
      connectionId = result.connectionId;
    });

    it('should list directory contents successfully', async () => {
      const mockSFTP = {
        readdir: vi.fn((path, callback) => {
          const files = [
            {
              filename: 'file1.txt',
              attrs: {
                size: 1024,
                mode: 33188,
                mtime: Date.now() / 1000,
                isDirectory: () => false
              }
            },
            {
              filename: 'subdir',
              attrs: {
                size: 4096,
                mode: 16877,
                mtime: Date.now() / 1000,
                isDirectory: () => true
              }
            }
          ];
          callback(null, files);
        })
      };

      mockClient.sftp.mockImplementation((callback) => {
        callback(null, mockSFTP);
      });

      const result = await sshService.listDirectory(connectionId, '/home/user');

      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(2);
      expect(result.files[0].name).toBe('file1.txt');
      expect(result.files[0].type).toBe('file');
      expect(result.files[1].name).toBe('subdir');
      expect(result.files[1].type).toBe('directory');
    });

    it('should default to current directory', async () => {
      const mockSFTP = {
        readdir: vi.fn((path, callback) => {
          expect(path).toBe('.');
          callback(null, []);
        })
      };

      mockClient.sftp.mockImplementation((callback) => {
        callback(null, mockSFTP);
      });

      const result = await sshService.listDirectory(connectionId);

      expect(result.success).toBe(true);
      expect(result.path).toBe('.');
    });
  });

  describe('downloadFile', () => {
    let connectionId;
    let mockClient;

    beforeEach(async () => {
      const config = {
        host: 'example.com',
        port: 22,
        username: 'user',
        password: 'pass'
      };

      const promise = sshService.connect(config);
      mockClient = getMockClient();
      if (mockClient.handlers && mockClient.handlers.ready) {
        mockClient.handlers.ready();
      }

      const result = await promise;
      connectionId = result.connectionId;
    });

    it('should download file successfully', async () => {
      const mockSFTP = {
        fastGet: vi.fn((remotePath, localPath, callback) => {
          callback(null);
        })
      };

      mockClient.sftp.mockImplementation((callback) => {
        callback(null, mockSFTP);
      });

      const result = await sshService.downloadFile(connectionId, '/remote/file.txt', '/local/file.txt');

      expect(result.success).toBe(true);
      expect(result.remotePath).toBe('/remote/file.txt');
      expect(result.localPath).toBe('/local/file.txt');
    });

    it('should handle download errors', async () => {
      const mockSFTP = {
        fastGet: vi.fn((remotePath, localPath, callback) => {
          callback(new Error('Download failed'));
        })
      };

      mockClient.sftp.mockImplementation((callback) => {
        callback(null, mockSFTP);
      });

      try {
        await sshService.downloadFile(connectionId, '/remote/file.txt', '/local/file.txt');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.success).toBe(false);
        expect(error.code).toBe('DOWNLOAD_ERROR');
      }
    });
  });

  describe('uploadFile', () => {
    let connectionId;
    let mockClient;

    beforeEach(async () => {
      const config = {
        host: 'example.com',
        port: 22,
        username: 'user',
        password: 'pass'
      };

      const promise = sshService.connect(config);
      mockClient = getMockClient();
      if (mockClient.handlers && mockClient.handlers.ready) {
        mockClient.handlers.ready();
      }

      const result = await promise;
      connectionId = result.connectionId;
    });

    it('should upload file successfully', async () => {
      const mockSFTP = {
        fastPut: vi.fn((localPath, remotePath, callback) => {
          callback(null);
        })
      };

      mockClient.sftp.mockImplementation((callback) => {
        callback(null, mockSFTP);
      });

      const result = await sshService.uploadFile(connectionId, '/local/file.txt', '/remote/file.txt');

      expect(result.success).toBe(true);
      expect(result.localPath).toBe('/local/file.txt');
      expect(result.remotePath).toBe('/remote/file.txt');
    });

    it('should handle upload errors', async () => {
      const mockSFTP = {
        fastPut: vi.fn((localPath, remotePath, callback) => {
          callback(new Error('Upload failed'));
        })
      };

      mockClient.sftp.mockImplementation((callback) => {
        callback(null, mockSFTP);
      });

      try {
        await sshService.uploadFile(connectionId, '/local/file.txt', '/remote/file.txt');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.success).toBe(false);
        expect(error.code).toBe('UPLOAD_ERROR');
      }
    });
  });

  describe('listDirectoryRecursive', () => {
    let connectionId;
    let mockClient;

    beforeEach(async () => {
      const config = {
        host: 'example.com',
        port: 22,
        username: 'user',
        password: 'pass'
      };

      const promise = sshService.connect(config);
      mockClient = getMockClient();
      if (mockClient.handlers && mockClient.handlers.ready) {
        mockClient.handlers.ready();
      }

      const result = await promise;
      connectionId = result.connectionId;
    });

    it('should list with maxDepth option', async () => {
      const mockSFTP = {
        readdir: vi.fn((dirPath, callback) => {
          callback(null, []);
        })
      };

      mockClient.sftp.mockImplementation((callback) => {
        callback(null, mockSFTP);
      });

      const result = await sshService.listDirectoryRecursive(connectionId, '.', { maxDepth: 2 });

      expect(result.success).toBe(true);
      expect(result.maxDepth).toBe(2);
    });

    it('should respect maxFiles option', async () => {
      const mockSFTP = {
        readdir: vi.fn((dirPath, callback) => {
          const files = Array.from({ length: 100 }, (_, i) => ({
            filename: `file${i}.txt`,
            attrs: {
              size: 1024,
              mode: 33188,
              mtime: Date.now() / 1000,
              isDirectory: () => false
            }
          }));
          callback(null, files);
        })
      };

      mockClient.sftp.mockImplementation((callback) => {
        callback(null, mockSFTP);
      });

      const result = await sshService.listDirectoryRecursive(connectionId, '.', { maxFiles: 50 });

      expect(result.success).toBe(true);
      expect(result.totalFiles).toBeLessThanOrEqual(50);
      expect(result.truncated).toBe(true);
    });
  });

  describe('getActiveConnections', () => {
    it('should return list of active connections', async () => {
      const config = {
        host: 'host1.com',
        port: 22,
        username: 'user1',
        password: 'pass1'
      };

      const promise = sshService.connect(config);
      const mockClient = getMockClient();
      if (mockClient.handlers && mockClient.handlers.ready) {
        mockClient.handlers.ready();
      }

      await promise;

      const activeConnections = sshService.getActiveConnections();

      expect(Array.isArray(activeConnections)).toBe(true);
      expect(activeConnections.length).toBe(1);
      expect(activeConnections[0].config.username).toBe('user1');
      expect(activeConnections[0].connected).toBe(true);
      expect(activeConnections[0].createdAt).toBeDefined();
    });

    it('should return empty array when no connections', () => {
      const activeConnections = sshService.getActiveConnections();

      expect(Array.isArray(activeConnections)).toBe(true);
      expect(activeConnections.length).toBe(0);
    });
  });

  describe('disconnectAll', () => {
    it('should disconnect all active connections', async () => {
      const config1 = {
        host: 'host1.com',
        port: 22,
        username: 'user1',
        password: 'pass1'
      };

      const config2 = {
        host: 'host2.com',
        port: 22,
        username: 'user2',
        password: 'pass2'
      };

      const promise1 = sshService.connect(config1);
      const mockClient1 = getMockClient();
      if (mockClient1.handlers && mockClient1.handlers.ready) {
        mockClient1.handlers.ready();
      }
      await promise1;

      const promise2 = sshService.connect(config2);
      const mockClient2 = getMockClient();
      if (mockClient2.handlers && mockClient2.handlers.ready) {
        mockClient2.handlers.ready();
      }
      await promise2;

      expect(sshService.connections.size).toBe(2);

      const result = sshService.disconnectAll();

      expect(result.success).toBe(true);
      expect(sshService.connections.size).toBe(0);
    });
  });

  describe('connection ID increments', () => {
    it('should increment connection IDs correctly', async () => {
      const config = {
        host: 'example.com',
        port: 22,
        username: 'user',
        password: 'pass'
      };

      const promise1 = sshService.connect(config);
      const mockClient1 = getMockClient();
      if (mockClient1.handlers && mockClient1.handlers.ready) {
        mockClient1.handlers.ready();
      }
      const result1 = await promise1;

      const promise2 = sshService.connect(config);
      const mockClient2 = getMockClient();
      if (mockClient2.handlers && mockClient2.handlers.ready) {
        mockClient2.handlers.ready();
      }
      const result2 = await promise2;

      expect(result2.connectionId).toBe(result1.connectionId + 1);
    });
  });

  describe('error scenarios', () => {
    it('should handle readdir errors in listDirectory', async () => {
      const config = {
        host: 'example.com',
        port: 22,
        username: 'user',
        password: 'pass'
      };

      const promise = sshService.connect(config);
      const mockClient = getMockClient();
      if (mockClient.handlers && mockClient.handlers.ready) {
        mockClient.handlers.ready();
      }

      const result = await promise;
      const connectionId = result.connectionId;

      const mockSFTP = {
        readdir: vi.fn((path, callback) => {
          callback(new Error('Permission denied'));
        })
      };

      mockClient.sftp.mockImplementation((callback) => {
        callback(null, mockSFTP);
      });

      try {
        await sshService.listDirectory(connectionId, '/');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.success).toBe(false);
        expect(error.code).toBe('READDIR_ERROR');
      }
    });

    it('should handle file transfer with disconnected connection', async () => {
      const result = await sshService.downloadFile(99999, '/remote/file', '/local/file');

      expect(result.success).toBe(false);
      expect(result.code).toBe('NO_CONNECTION');
    });
  });
});
