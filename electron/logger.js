import fs from 'fs';
import path from 'path';
import os from 'os';
import { app } from 'electron';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Log levels with numeric values for filtering
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

/**
 * Structured Logger for QuantumXfer Application
 * Provides centralized logging for main process, SSH operations, and file transfers
 */
class Logger {
  constructor(options = {}) {
    this.minLevel = LOG_LEVELS[options.level || 'INFO'];
    this.logsDirectory = options.logsDirectory || this.getDefaultLogsDirectory();
    this.maxLogFileSize = options.maxLogFileSize || 10 * 1024 * 1024; // 10MB
    this.maxLogFiles = options.maxLogFiles || 5;
    this.enableConsole = options.enableConsole !== false;
    this.enableFile = options.enableFile !== false;
    this.context = options.context || 'app';
    this.ipcLogger = options.ipcLogger || null;
    
    // Ensure logs directory exists
    if (this.enableFile) {
      this.ensureLogsDirectory();
    }
  }

  /**
   * Get default logs directory based on platform
   */
  getDefaultLogsDirectory() {
    let logsPath;
    
    if (app) {
      // In Electron app context
      logsPath = path.join(app.getPath('userData'), 'logs');
    } else {
      // Fallback for testing
      logsPath = path.join(os.homedir(), '.quantumxfer', 'logs');
    }
    
    return logsPath;
  }

  /**
   * Ensure logs directory exists
   */
  ensureLogsDirectory() {
    try {
      if (!fs.existsSync(this.logsDirectory)) {
        fs.mkdirSync(this.logsDirectory, { recursive: true });
      }
    } catch (error) {
      console.error(`Failed to create logs directory: ${error.message}`);
    }
  }

  /**
   * Format timestamp for logs
   */
  formatTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Get current log file path
   */
  getCurrentLogFilePath() {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(this.logsDirectory, `quantum-xfer-${timestamp}.log`);
  }

  /**
   * Sanitize sensitive data from log entries
   */
  sanitizeSensitiveData(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    let sanitized;
    try {
      sanitized = JSON.parse(JSON.stringify(data));
    } catch (error) {
      // Handle circular references or non-serializable objects
      return { _error: 'Non-serializable object' };
    }

    const sensitiveKeys = ['password', 'privateKey', 'passphrase', 'token', 'secret', 'auth'];

    const sanitizeObject = (obj) => {
      for (const key in obj) {
        if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      }
    };

    sanitizeObject(sanitized);
    return sanitized;
  }

  /**
   * Format log entry as structured JSON
   */
  formatLogEntry(level, message, meta = {}) {
    return {
      timestamp: this.formatTimestamp(),
      level,
      context: this.context,
      message,
      metadata: this.sanitizeSensitiveData(meta),
      processId: process.pid,
      environment: process.env.NODE_ENV || 'production'
    };
  }

  /**
   * Format log entry as human-readable text
   */
  formatLogText(entry) {
    const { timestamp, level, context, message, metadata } = entry;
    let text = `[${timestamp}] [${level}] [${context}] ${message}`;
    
    if (Object.keys(metadata).length > 0) {
      text += ` | ${JSON.stringify(metadata)}`;
    }
    
    return text;
  }

  /**
   * Write log to file
   */
  writeToFile(entry) {
    if (!this.enableFile) return;

    try {
      const logFile = this.getCurrentLogFilePath();
      const logText = this.formatLogText(entry);
      const logJson = JSON.stringify(entry);

      // Append to current log file
      fs.appendFileSync(logFile, logJson + '\n', 'utf8');

      // Check if we need to rotate logs
      this.rotateLogsIfNeeded();
    } catch (error) {
      console.error(`Failed to write to log file: ${error.message}`);
    }
  }

  /**
   * Rotate logs if current file exceeds max size
   */
  rotateLogsIfNeeded() {
    try {
      const logFile = this.getCurrentLogFilePath();
      
      if (!fs.existsSync(logFile)) return;

      const stats = fs.statSync(logFile);
      
      if (stats.size > this.maxLogFileSize) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = logFile.replace('.log', `-backup-${timestamp}.log`);
        fs.renameSync(logFile, backupFile);
        
        // Clean old backups
        this.cleanupOldLogs();
      }
    } catch (error) {
      console.error(`Failed to rotate logs: ${error.message}`);
    }
  }

  /**
   * Clean up old log files exceeding max count
   */
  cleanupOldLogs() {
    try {
      if (!fs.existsSync(this.logsDirectory)) return;

      const files = fs.readdirSync(this.logsDirectory)
        .filter(f => f.startsWith('quantum-xfer-') && f.endsWith('.log'))
        .sort()
        .reverse();

      // Keep only maxLogFiles
      for (let i = this.maxLogFiles; i < files.length; i++) {
        const oldFile = path.join(this.logsDirectory, files[i]);
        fs.unlinkSync(oldFile);
      }
    } catch (error) {
      console.error(`Failed to cleanup old logs: ${error.message}`);
    }
  }

  /**
   * Core logging function
   */
  log(level, message, meta = {}) {
    const numLevel = LOG_LEVELS[level];
    
    // Check if this log level should be logged
    if (numLevel < this.minLevel) {
      return;
    }

    const entry = this.formatLogEntry(level, message, meta);

    // Log to console
    if (this.enableConsole) {
      const logText = this.formatLogText(entry);
      const consoleMethod = {
        DEBUG: 'debug',
        INFO: 'info',
        WARN: 'warn',
        ERROR: 'error'
      }[level] || 'log';

      console[consoleMethod](logText);
    }

    // Log to file
    this.writeToFile(entry);

    // Send to IPC logger if available
    if (this.ipcLogger) {
      try {
        this.ipcLogger(entry);
      } catch (error) {
        // Silently fail - don't interrupt logging if IPC fails
      }
    }
  }

  /**
   * Public logging methods
   */
  debug(message, meta = {}) {
    this.log('DEBUG', message, meta);
  }

  info(message, meta = {}) {
    this.log('INFO', message, meta);
  }

  warn(message, meta = {}) {
    this.log('WARN', message, meta);
  }

  error(message, meta = {}) {
    this.log('ERROR', message, meta);
  }

  /**
   * Log SSH connection event
   */
  logSSHConnect(connectionId, config, result) {
    this.info('SSH connection established', {
      connectionId,
      host: config.host,
      port: config.port,
      username: config.username,
      authMethod: config.privateKey ? 'key' : 'password',
      success: result.success,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log SSH command execution
   */
  logSSHCommand(connectionId, command, result) {
    this.info('SSH command executed', {
      connectionId,
      command: command.substring(0, 100), // Truncate long commands
      success: result.success,
      exitCode: result.exitCode,
      duration: result.duration,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log file transfer
   */
  logFileTransfer(type, connectionId, sourcePath, destPath, result) {
    this.info(`SSH file ${type}`, {
      connectionId,
      sourcePath,
      destPath,
      success: result.success,
      fileSize: result.fileSize,
      duration: result.duration,
      transferSpeed: result.transferSpeed,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log IPC request/response
   */
  logIPC(channel, type, data, error = null) {
    const logLevel = error ? 'ERROR' : 'DEBUG';
    this.log(logLevel, `IPC ${type}`, {
      channel,
      hasError: !!error,
      error: error ? error.message : null,
      dataKeys: typeof data === 'object' ? Object.keys(data || {}) : null,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get logs directory
   */
  getLogsDirectory() {
    return this.logsDirectory;
  }

  /**
   * Read recent logs
   */
  readRecentLogs(lines = 100) {
    try {
      const logFile = this.getCurrentLogFilePath();
      
      if (!fs.existsSync(logFile)) {
        return [];
      }

      const content = fs.readFileSync(logFile, 'utf8');
      const logLines = content.trim().split('\n');
      
      return logLines
        .slice(-lines)
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return { message: line };
          }
        });
    } catch (error) {
      return [{ error: error.message, level: 'ERROR' }];
    }
  }

  /**
   * Export logs to file
   */
  exportLogs(outputPath) {
    try {
      // Check if output directory exists and is writable
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        return { success: false, error: 'Output directory does not exist' };
      }

      const logs = this.readRecentLogs(1000);
      fs.writeFileSync(outputPath, JSON.stringify(logs, null, 2), 'utf8');
      return { success: true, path: outputPath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Set context for logger
   */
  setContext(context) {
    this.context = context;
  }

  /**
   * Create child logger with new context
   */
  createChild(childContext) {
    const childLogger = new Logger({
      level: Object.keys(LOG_LEVELS).find(k => LOG_LEVELS[k] === this.minLevel),
      logsDirectory: this.logsDirectory,
      maxLogFileSize: this.maxLogFileSize,
      maxLogFiles: this.maxLogFiles,
      enableConsole: this.enableConsole,
      enableFile: this.enableFile,
      context: childContext,
      ipcLogger: this.ipcLogger
    });

    return childLogger;
  }
}

export default Logger;
