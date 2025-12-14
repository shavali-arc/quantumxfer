/**
 * Mock SSH Server for Integration Testing
 * 
 * Provides a lightweight SSH server for testing SSH client functionality
 * without requiring a real SSH server in the test environment.
 */

import Server from 'ssh2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Mock SSH Server for integration testing
 * Simulates SSH server behavior for testing client operations
 */
export class MockSSHServer {
  constructor(options = {}) {
    this.port = options.port || 2222;
    this.host = options.host || 'localhost';
    this.credentials = options.credentials || {
      'testuser': 'testpass',
      'ubuntu': 'ubuntu'
    };
    this.keyAuth = options.keyAuth || {
      'testuser': '/path/to/test/key.pub'
    };
    this.fileSystem = options.fileSystem || '/tmp/ssh-test';
    this.server = null;
    this.isRunning = false;
  }

  /**
   * Start the mock SSH server
   */
  async start() {
    return new Promise((resolve, reject) => {
      // Get SSH host key for testing
      const hostKey = this.getHostKey();

      this.server = new Server(
        {
          hostKeys: [hostKey],
          algorithms: {
            serverHostKey: ['ssh-rsa', 'ssh-dss'],
            cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr', 'aes128-gcm@openssh.com'],
            serverToClient: ['aes128-ctr', 'aes192-ctr'],
            clientToServer: ['aes128-ctr', 'aes192-ctr']
          }
        },
        (client) => {
          this.handleClient(client);
        }
      );

      this.server.listen(this.port, this.host, () => {
        this.isRunning = true;
        console.log(`Mock SSH Server listening on ${this.host}:${this.port}`);
        resolve();
      });

      this.server.on('error', (err) => {
        this.isRunning = false;
        reject(err);
      });
    });
  }

  /**
   * Stop the mock SSH server
   */
  async stop() {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close((err) => {
        this.isRunning = false;
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Handle client connection
   */
  handleClient(client) {
    let authenticated = false;

    client.on('authentication', (ctx) => {
      const { username, method, password, key, signature } = ctx;

      // Password authentication
      if (method === 'password') {
        if (this.credentials[username] === password) {
          authenticated = true;
          ctx.accept();
        } else {
          ctx.reject(['password']);
        }
      }
      // Public key authentication
      else if (method === 'publickey') {
        if (this.keyAuth[username]) {
          authenticated = true;
          ctx.accept();
        } else {
          ctx.reject(['publickey']);
        }
      }
      else {
        ctx.reject(['password', 'publickey']);
      }
    });

    client.on('ready', () => {
      if (!authenticated) {
        client.end();
        return;
      }

      client.on('session', (accept, reject) => {
        const session = accept();

        session.on('exec', (accept, reject, info) => {
          this.handleExec(accept, reject, info);
        });

        session.on('shell', (accept, reject) => {
          const stream = accept();
          stream.write('Welcome to Mock SSH Server\n');
          stream.exit(0);
        });

        session.on('subsystem', (accept, reject, info) => {
          if (info.subsystem === 'sftp') {
            this.handleSFTP(accept);
          } else {
            reject();
          }
        });
      });

      client.on('sftp', (accept, reject) => {
        this.handleSFTP(accept);
      });
    });

    client.on('close', () => {
      // Client disconnected
    });

    client.on('error', (err) => {
      console.error('Client error:', err);
    });
  }

  /**
   * Handle command execution
   */
  handleExec(accept, reject, info) {
    const { command } = info;
    const stream = accept();

    // Simulate various commands
    if (command.startsWith('ls')) {
      stream.write('file1.txt\nfile2.txt\nfolder1\n');
      stream.exit(0);
    } else if (command.startsWith('pwd')) {
      stream.write('/home/testuser\n');
      stream.exit(0);
    } else if (command.startsWith('echo')) {
      const text = command.replace('echo ', '').replace(/"/g, '');
      stream.write(text + '\n');
      stream.exit(0);
    } else if (command === 'exit') {
      stream.exit(0);
    } else {
      stream.write(`Command executed: ${command}\n`);
      stream.exit(0);
    }
  }

  /**
   * Handle SFTP subsystem
   */
  handleSFTP(accept) {
    // For now, accept but don't fully implement SFTP
    const stream = accept();
    stream.on('close', () => {
      // SFTP session closed
    });
  }

  /**
   * Get host key for SSH server
   */
  getHostKey() {
    // For testing, generate or use a test key
    // In production, this would be read from a file
    try {
      const keyPath = path.join(__dirname, 'test-host-key.pem');
      if (fs.existsSync(keyPath)) {
        return fs.readFileSync(keyPath);
      }
    } catch (err) {
      console.error('Error reading host key:', err);
    }

    // Return a default test key (in real implementation, generate or read from file)
    return Buffer.from('test-key-content');
  }

  /**
   * Check if server is running
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      host: this.host,
      port: this.port,
      address: `${this.host}:${this.port}`
    };
  }
}

/**
 * Create and start a mock SSH server for testing
 */
export async function createTestSSHServer(options = {}) {
  const server = new MockSSHServer(options);
  await server.start();
  return server;
}

/**
 * Test fixture provider
 */
export const TestSSHFixtures = {
  /**
   * Get test credentials
   */
  getCredentials() {
    return {
      host: 'localhost',
      port: 2222,
      username: 'testuser',
      password: 'testpass'
    };
  },

  /**
   * Get test file paths
   */
  getTestFiles() {
    return {
      smallFile: path.join('/tmp/ssh-test', 'test-small.txt'),
      mediumFile: path.join('/tmp/ssh-test', 'test-medium.bin'),
      largeFile: path.join('/tmp/ssh-test', 'test-large.bin')
    };
  },

  /**
   * Get test directories
   */
  getTestDirectories() {
    return {
      testDir: '/home/testuser',
      uploadDir: '/home/testuser/uploads',
      downloadDir: '/home/testuser/downloads'
    };
  },

  /**
   * Get test commands
   */
  getTestCommands() {
    return {
      listFiles: 'ls -la',
      getCurrentDir: 'pwd',
      createFile: 'touch test.txt',
      removeFile: 'rm test.txt',
      createDir: 'mkdir testdir',
      removeDir: 'rmdir testdir',
      catFile: 'cat test.txt'
    };
  }
};

export default MockSSHServer;
