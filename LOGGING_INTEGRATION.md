/**
 * Logger Integration Examples
 * 
 * This file demonstrates how to integrate the Logger into various parts of the application.
 * Follow these patterns when adding logging to other modules.
 */

// ============================================================================
// 1. BASIC SETUP IN MAIN.JS
// ============================================================================

/*
import Logger from './logger.js';

// Initialize the main logger
const logger = new Logger({
  level: isDev ? 'DEBUG' : 'INFO',
  enableConsole: true,
  enableFile: true,
  context: 'main-process'
});

// Export for use in other modules
export { logger };
*/

// ============================================================================
// 2. IPC HANDLER LOGGING PATTERN
// ============================================================================

/*
// BEFORE: Without logging
ipcMain.handle('ssh-connect', async (event, config) => {
  try {
    const result = await sshService.connect(config);
    return result;
  } catch (error) {
    return error;
  }
});

// AFTER: With logging
ipcMain.handle('ssh-connect', async (event, config) => {
  try {
    logger.logIPC('ssh-connect', 'request', { host: config.host, port: config.port });
    
    const result = await sshService.connect(config);
    
    logger.logIPC('ssh-connect', 'response', { success: result.success });
    return result;
  } catch (error) {
    logger.logIPC('ssh-connect', 'error', {}, error);
    return { success: false, error: error.message };
  }
});
*/

// ============================================================================
// 3. SSH SERVICE LOGGING PATTERN
// ============================================================================

/*
// In ssh-service.js, inject logger as constructor parameter:

class SSHService {
  constructor(logger = null) {
    this.connections = new Map();
    this.connectionIdCounter = 0;
    this.logger = logger;
    this.logger?.info('SSHService initialized');
  }

  async connect(config) {
    try {
      this.logger?.info('Attempting SSH connection', {
        host: config.host,
        port: config.port,
        username: config.username
      });

      // ... connection logic ...

      this.logger?.logSSHConnect(connectionId, config, result);
      return result;
    } catch (error) {
      this.logger?.error('SSH connection failed', {
        host: config.host,
        error: error.message
      });
      return { success: false, error: error.message, code: 'SSH_CONNECT_FAILED' };
    }
  }

  async executeCommand(connectionId, command) {
    try {
      this.logger?.debug('Executing SSH command', { 
        connectionId, 
        command: command.substring(0, 100) 
      });

      // ... command execution logic ...

      this.logger?.logSSHCommand(connectionId, command, result);
      return result;
    } catch (error) {
      this.logger?.error('SSH command execution failed', {
        connectionId,
        command: command.substring(0, 100),
        error: error.message
      });
      throw error;
    }
  }

  async downloadFile(connectionId, remotePath, localPath) {
    try {
      this.logger?.debug('Starting file download', { 
        connectionId, 
        remotePath, 
        localPath 
      });

      const startTime = Date.now();
      // ... file download logic ...
      const duration = Date.now() - startTime;

      this.logger?.logFileTransfer('download', connectionId, remotePath, localPath, {
        success: true,
        fileSize: fileStats.size,
        duration,
        transferSpeed: calculateSpeed(fileStats.size, duration)
      });

      return result;
    } catch (error) {
      this.logger?.error('File download failed', {
        connectionId,
        remotePath,
        error: error.message
      });
      throw error;
    }
  }
}

// Usage in main.js:
const sshService = new SSHService(logger);
*/

// ============================================================================
// 4. RENDERER PROCESS LOGGING
// ============================================================================

/*
// In preload.js, expose logging functionality:

const { ipcRenderer } = require('electron');

window.api = {
  async log(level, message, data) {
    return ipcRenderer.invoke('app-log', { level, message, data });
  },
  
  async logError(message, error) {
    return ipcRenderer.invoke('app-log', { 
      level: 'ERROR', 
      message, 
      error: error.message 
    });
  }
};

// In main.js, handle renderer process logs:
ipcMain.handle('app-log', async (event, { level, message, data }) => {
  logger.setContext('renderer-process');
  logger.log(level, message, data);
  logger.setContext('main-process');
  return { success: true };
});

// Usage in React components:
const handleSSHConnect = async () => {
  try {
    window.api.log('INFO', 'User initiated SSH connection');
    const result = await window.api.invoke('ssh-connect', config);
    
    if (result.success) {
      window.api.log('INFO', 'SSH connection successful');
    }
  } catch (error) {
    window.api.logError('SSH connection failed', error);
  }
};
*/

// ============================================================================
// 5. LOG LEVEL GUIDELINES
// ============================================================================

/*
DEBUG:
  - Detailed information for debugging
  - Parameter values
  - State changes
  - Loop iterations with many entries
  - Example: logger.debug('SSH command started', { connectionId, command })

INFO:
  - General informational messages
  - Important milestones
  - Successful operations
  - Example: logger.info('SSH connection established', { connectionId, host })

WARN:
  - Warning conditions
  - Recoverable errors
  - Deprecated functionality usage
  - Example: logger.warn('Connection timeout approaching', { timeout: 30000 })

ERROR:
  - Error conditions
  - Exceptions
  - Failed operations
  - Example: logger.error('SSH connection failed', { error: error.message })
*/

// ============================================================================
// 6. SENSITIVE DATA IN LOGS
// ============================================================================

/*
The logger automatically redacts these fields:
- password
- privateKey
- passphrase
- token
- secret
- auth (and any field containing these words, case-insensitive)

Example:
logger.info('Connection attempt', {
  host: 'example.com',           // ✓ Logged as-is
  username: 'john',               // ✓ Logged as-is
  password: 'secret123'           // ✗ Automatically redacted to '[REDACTED]'
});
*/

// ============================================================================
// 7. ACCESSING LOGS
// ============================================================================

/*
// Read recent logs from main process
const recentLogs = logger.readRecentLogs(100); // Last 100 log entries

// Export logs to file
const result = logger.exportLogs('/path/to/export.json');
if (result.success) {
  console.log('Logs exported to:', result.path);
}

// Get logs directory
const logsDir = logger.getLogsDirectory();
// Returns: ~/.config/QuantumXfer/logs (or equivalent on macOS/Windows)

// Create child logger for sub-module
const sshLogger = logger.createChild('ssh-service');
sshLogger.info('SSH module message'); // context will be 'ssh-service'
*/

// ============================================================================
// 8. LOG FILE LOCATION
// ============================================================================

/*
Logs are stored in:
- Linux: ~/.config/QuantumXfer/logs/
- macOS: ~/Library/Application Support/QuantumXfer/logs/
- Windows: %APPDATA%\QuantumXfer\logs\

File naming:
- quantum-xfer-YYYY-MM-DD.log (daily log file)
- quantum-xfer-YYYY-MM-DD-backup-ISO-TIMESTAMP.log (rotated files)

When a log file exceeds maxLogFileSize (default 10MB), it's rotated and 
old backup files are cleaned up to keep only maxLogFiles (default 5).

Each log entry is one JSON line (JSONL format) for easy parsing:
{
  "timestamp": "2025-12-07T22:45:00.123Z",
  "level": "INFO",
  "context": "ssh-service",
  "message": "SSH connection established",
  "metadata": {
    "connectionId": "conn-1",
    "host": "example.com",
    "port": 22
  },
  "processId": 12345,
  "environment": "production"
}
*/

export const loggingIntegrationGuide = {
  description: 'Logging integration patterns for QuantumXfer application',
  status: 'Reference document - See patterns above for integration examples'
};
