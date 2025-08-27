// SSH Connection Service for Electron Backend
import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';

class SSHService {
  constructor() {
    this.connections = new Map(); // Store active connections
    this.connectionId = 0;
  }

  /**
   * Create a new SSH connection
   * @param {Object} config - SSH configuration
   * @param {string} config.host - Server hostname or IP
   * @param {number} config.port - SSH port (default 22)
   * @param {string} config.username - SSH username
   * @param {string} config.password - SSH password
   * @param {string} config.privateKey - SSH private key (optional)
   * @returns {Promise<Object>} Connection result
   */
  async connect(config) {
    return new Promise((resolve, reject) => {
      const conn = new Client();
      const currentConnectionId = ++this.connectionId;

      conn.on('ready', () => {
        console.log(`SSH Connection ${currentConnectionId} ready`);
        
        // Store the connection
        this.connections.set(currentConnectionId, {
          client: conn,
          config: { ...config, password: '[HIDDEN]' }, // Don't store password
          connected: true,
          createdAt: new Date()
        });

        resolve({
          success: true,
          connectionId: currentConnectionId,
          message: `Connected to ${config.username}@${config.host}:${config.port}`,
          serverInfo: {
            host: config.host,
            port: config.port,
            username: config.username
          }
        });
      });

      conn.on('banner', (message) => {
        console.log(`SSH Connection ${currentConnectionId} banner:`, message);
      });

      conn.on('greeting', (message) => {
        console.log(`SSH Connection ${currentConnectionId} greeting:`, message);
      });

      conn.on('handshake', (negotiated) => {
        console.log(`SSH Connection ${currentConnectionId} handshake completed:`, negotiated);
      });

      conn.on('error', (err) => {
        console.error(`SSH Connection ${currentConnectionId} error:`, err.message);
        reject({
          success: false,
          error: err.message,
          code: err.code || 'CONNECTION_ERROR'
        });
      });

      conn.on('end', () => {
        console.log(`SSH Connection ${currentConnectionId} ended`);
        this.connections.delete(currentConnectionId);
      });

      conn.on('close', () => {
        console.log(`SSH Connection ${currentConnectionId} closed`);
        this.connections.delete(currentConnectionId);
      });

      // Prepare connection options
      const connectOptions = {
        host: config.host,
        port: config.port || 22,
        username: config.username
      };

      // Add authentication method
      if (config.privateKey) {
        try {
          connectOptions.privateKey = fs.readFileSync(config.privateKey);
        } catch (err) {
          return reject({
            success: false,
            error: `Failed to read private key: ${err.message}`,
            code: 'PRIVATE_KEY_ERROR'
          });
        }
      } else if (config.password) {
        connectOptions.password = config.password;
      } else {
        return reject({
          success: false,
          error: 'No authentication method provided (password or private key)',
          code: 'AUTH_ERROR'
        });
      }

      // Optional: Add other SSH options
      connectOptions.readyTimeout = 60000; // 60 second timeout
      connectOptions.keepaliveInterval = 5000; // 5 second keepalive
      connectOptions.algorithms = {
        kex: ['diffie-hellman-group14-sha256', 'diffie-hellman-group14-sha1'],
        cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr'],
        hmac: ['hmac-sha2-256', 'hmac-sha1']
      };

      // Attempt connection
      try {
        console.log('SSH connection attempt with options:', {
          host: connectOptions.host,
          port: connectOptions.port,
          username: connectOptions.username,
          hasPassword: !!connectOptions.password,
          hasPrivateKey: !!connectOptions.privateKey,
          readyTimeout: connectOptions.readyTimeout
        });
        conn.connect(connectOptions);
      } catch (err) {
        reject({
          success: false,
          error: `Connection failed: ${err.message}`,
          code: 'CONNECTION_FAILED'
        });
      }
    });
  }

  /**
   * Execute a command on the SSH connection
   * @param {number} connectionId - Connection ID
   * @param {string} command - Command to execute
   * @returns {Promise<Object>} Command result
   */
  async executeCommand(connectionId, command) {
    return new Promise((resolve, reject) => {
      const connection = this.connections.get(connectionId);
      
      if (!connection || !connection.connected) {
        return reject({
          success: false,
          error: 'Connection not found or not connected',
          code: 'NO_CONNECTION'
        });
      }

      connection.client.exec(command, (err, stream) => {
        if (err) {
          return reject({
            success: false,
            error: err.message,
            code: 'EXEC_ERROR'
          });
        }

        let stdout = '';
        let stderr = '';

        stream.on('close', (code, signal) => {
          resolve({
            success: true,
            command,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode: code,
            signal
          });
        });

        stream.on('data', (data) => {
          stdout += data.toString();
        });

        stream.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      });
    });
  }

  /**
   * Get SFTP client for file operations
   * @param {number} connectionId - Connection ID
   * @returns {Promise<Object>} SFTP client result
   */
  async getSFTP(connectionId) {
    return new Promise((resolve, reject) => {
      const connection = this.connections.get(connectionId);
      
      if (!connection || !connection.connected) {
        return reject({
          success: false,
          error: 'Connection not found or not connected',
          code: 'NO_CONNECTION'
        });
      }

      connection.client.sftp((err, sftp) => {
        if (err) {
          return reject({
            success: false,
            error: err.message,
            code: 'SFTP_ERROR'
          });
        }

        resolve({
          success: true,
          sftp
        });
      });
    });
  }

  /**
   * List directory contents via SFTP
   * @param {number} connectionId - Connection ID
   * @param {string} remotePath - Remote directory path
   * @returns {Promise<Object>} Directory listing
   */
  async listDirectory(connectionId, remotePath = '.') {
    try {
      const sftpResult = await this.getSFTP(connectionId);
      if (!sftpResult.success) {
        return sftpResult;
      }

      return new Promise((resolve, reject) => {
        sftpResult.sftp.readdir(remotePath, (err, list) => {
          if (err) {
            return reject({
              success: false,
              error: err.message,
              code: 'READDIR_ERROR'
            });
          }

          const files = list.map(item => ({
            name: item.filename,
            type: item.attrs.isDirectory() ? 'directory' : 'file',
            size: item.attrs.size,
            permissions: item.attrs.mode.toString(8),
            modified: new Date(item.attrs.mtime * 1000),
            path: path.posix.join(remotePath, item.filename)
          }));

          resolve({
            success: true,
            path: remotePath,
            files
          });
        });
      });
    } catch (error) {
      return {
        success: false,
        error: error.error || error.message,
        code: error.code || 'UNKNOWN_ERROR'
      };
    }
  }

  /**
   * Download a file from remote server
   * @param {number} connectionId - Connection ID
   * @param {string} remotePath - Remote file path
   * @param {string} localPath - Local file path
   * @returns {Promise<Object>} Download result
   */
  async downloadFile(connectionId, remotePath, localPath) {
    try {
      const sftpResult = await this.getSFTP(connectionId);
      if (!sftpResult.success) {
        return sftpResult;
      }

      return new Promise((resolve, reject) => {
        sftpResult.sftp.fastGet(remotePath, localPath, (err) => {
          if (err) {
            return reject({
              success: false,
              error: err.message,
              code: 'DOWNLOAD_ERROR'
            });
          }

          resolve({
            success: true,
            message: `Downloaded ${remotePath} to ${localPath}`,
            remotePath,
            localPath
          });
        });
      });
    } catch (error) {
      return {
        success: false,
        error: error.error || error.message,
        code: error.code || 'UNKNOWN_ERROR'
      };
    }
  }

  /**
   * Upload a file to remote server
   * @param {number} connectionId - Connection ID
   * @param {string} localPath - Local file path
   * @param {string} remotePath - Remote file path
   * @returns {Promise<Object>} Upload result
   */
  async uploadFile(connectionId, localPath, remotePath) {
    try {
      const sftpResult = await this.getSFTP(connectionId);
      if (!sftpResult.success) {
        return sftpResult;
      }

      return new Promise((resolve, reject) => {
        sftpResult.sftp.fastPut(localPath, remotePath, (err) => {
          if (err) {
            return reject({
              success: false,
              error: err.message,
              code: 'UPLOAD_ERROR'
            });
          }

          resolve({
            success: true,
            message: `Uploaded ${localPath} to ${remotePath}`,
            localPath,
            remotePath
          });
        });
      });
    } catch (error) {
      return {
        success: false,
        error: error.error || error.message,
        code: error.code || 'UNKNOWN_ERROR'
      };
    }
  }

  /**
   * Close a specific SSH connection
   * @param {number} connectionId - Connection ID
   * @returns {Object} Disconnect result
   */
  disconnect(connectionId) {
    const connection = this.connections.get(connectionId);
    
    if (!connection) {
      return {
        success: false,
        error: 'Connection not found',
        code: 'NO_CONNECTION'
      };
    }

    connection.client.end();
    this.connections.delete(connectionId);

    return {
      success: true,
      message: `Disconnected connection ${connectionId}`
    };
  }

  /**
   * Get information about active connections
   * @returns {Array} List of active connections
   */
  getActiveConnections() {
    const connections = [];
    
    for (const [id, conn] of this.connections) {
      connections.push({
        id,
        config: conn.config,
        connected: conn.connected,
        createdAt: conn.createdAt
      });
    }

    return connections;
  }

  /**
   * Close all SSH connections
   */
  disconnectAll() {
    for (const [id, connection] of this.connections) {
      connection.client.end();
    }
    this.connections.clear();
    
    return {
      success: true,
      message: 'All connections closed'
    };
  }
}

export default SSHService;
