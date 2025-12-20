import fs from 'fs';
import path from 'path';
import os from 'os';
import { app } from 'electron';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Structured Logging Framework for QuantumXfer
 * Uses Winston for logging with daily rotation, JSON formatting, and sensitive data sanitization
 * 
 * Log Levels:
 * - error: Critical errors that need immediate attention
 * - warn: Warning conditions that should be reviewed
 * - info: General informational messages (default)
 * - debug: Detailed debugging information
 */

// Sensitive patterns to redact from logs
const SENSITIVE_PATTERNS = [
  /password\s*[:=]\s*['"]?([^\s,}'"]+)['"]?/gi,
  /token\s*[:=]\s*['"]?([^\s,}'"]+)['"]?/gi,
  /api[_-]?key\s*[:=]\s*['"]?([^\s,}'"]+)['"]?/gi,
  /secret\s*[:=]\s*['"]?([^\s,}'"]+)['"]?/gi,
  /private[_-]?key\s*[:=]\s*['"]?([^\s,}'"]+)['"]?/gi,
  /passphrase\s*[:=]\s*['"]?([^\s,}'"]+)['"]?/gi,
  /auth\s*[:=]\s*['"]?([^\s,}'"]+)['"]?/gi,
];

const SENSITIVE_KEYS = [
  'password',
  'privateKey',
  'passphrase',
  'token',
  'secret',
  'auth',
  'apiKey',
  'api_key',
  'credential',
  'credentials'
];

/**
 * Structured Logger for QuantumXfer Application
 * Provides centralized logging for main process, SSH operations, and file transfers
 */
class Logger {
  constructor(options = {}) {
    this.minLevel = options.level || (process.env.NODE_ENV === 'production' ? 'INFO' : 'DEBUG');
    this.logsDirectory = options.logsDirectory || this.getDefaultLogsDirectory();
    this.enableConsole = options.enableConsole !== false;
    this.enableFile = options.enableFile !== false;
    this.context = options.context || 'app';
    this.maxLogFileSize = options.maxLogFileSize || '10m';
    this.maxLogFiles = options.maxLogFiles || '14d';
    
    // Ensure logs directory exists
    if (this.enableFile) {
      this.ensureLogsDirectory();
    }

    // Initialize Winston logger
    this.winstonLogger = this.initializeWinston();
  }

  /**
   * Initialize Winston logger with transports
   */
  initializeWinston() {
    const transports = [];

    // Console transport (development)
    if (this.enableConsole) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              let log = `${timestamp} [${level}] [${this.context}] ${message}`;
              if (Object.keys(meta).length > 0) {
                const metaSanitized = this.sanitizeSensitiveData(meta);
                log += ` ${JSON.stringify(metaSanitized)}`;
              }
              return log;
            })
          )
        })
      );
    }

    // File transport - all logs with daily rotation
    if (this.enableFile) {
      transports.push(
        new DailyRotateFile({
          filename: path.join(this.logsDirectory, 'quantumxfer-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: this.maxLogFileSize,
          maxFiles: this.maxLogFiles,
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.json()
          )
        })
      );

      // Error logs with daily rotation
      transports.push(
        new DailyRotateFile({
          level: 'error',
          filename: path.join(this.logsDirectory, 'error-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: this.maxLogFileSize,
          maxFiles: this.maxLogFiles,
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.json()
          )
        })
      );

      // Audit logs with extended retention
      transports.push(
        new DailyRotateFile({
          level: 'info',
          filename: path.join(this.logsDirectory, 'audit-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: this.maxLogFileSize,
          maxFiles: '30d',
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.json()
          )
        })
      );
    }

    return winston.createLogger({
      level: this.minLevel.toLowerCase(),
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
      ),
      defaultMeta: { service: 'quantumxfer', context: this.context },
      transports,
      exceptionHandlers: [
        new DailyRotateFile({
          filename: path.join(this.logsDirectory, 'exception-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: this.maxLogFileSize,
          maxFiles: this.maxLogFiles,
          format: winston.format.json()
        })
      ],
      rejectionHandlers: [
        new DailyRotateFile({
          filename: path.join(this.logsDirectory, 'rejection-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: this.maxLogFileSize,
          maxFiles: this.maxLogFiles,
          format: winston.format.json()
        })
      ]
    });
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
   * Sanitize sensitive data from logs
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

    const sanitizeObject = (obj) => {
      for (const key in obj) {
        const lowerKey = key.toLowerCase();
        
        // Redact sensitive fields by key name
        if (SENSITIVE_KEYS.some(sk => lowerKey.includes(sk))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'string') {
          // Redact by pattern
          obj[key] = this.redactByPattern(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      }
    };

    sanitizeObject(sanitized);
    return sanitized;
  }

  /**
   * Redact sensitive patterns from strings
   */
  redactByPattern(str) {
    if (typeof str !== 'string') return str;

    let result = str;
    SENSITIVE_PATTERNS.forEach(pattern => {
      result = result.replace(pattern, (match) => {
        const keyPart = match.split(/[:=]/)[0];
        return `${keyPart}=[REDACTED]`;
      });
    });
    return result;
  }

  /**
   * Public logging methods
   */
  debug(message, meta = {}) {
    this.winstonLogger.debug(message, this.sanitizeSensitiveData(meta));
  }

  info(message, meta = {}) {
    this.winstonLogger.info(message, this.sanitizeSensitiveData(meta));
  }

  warn(message, meta = {}) {
    this.winstonLogger.warn(message, this.sanitizeSensitiveData(meta));
  }

  error(message, meta = {}) {
    this.winstonLogger.error(message, this.sanitizeSensitiveData(meta));
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
      error: result.error || null,
      duration: result.duration || 0,
      category: 'audit',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log SSH command execution
   */
  logSSHCommand(connectionId, command, result) {
    this.info('SSH command executed', {
      connectionId,
      command: command.substring(0, 200), // Truncate long commands for logs
      success: result.success,
      exitCode: result.exitCode || null,
      error: result.error || null,
      duration: result.duration || 0,
      category: 'audit',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log file transfer
   */
  logFileTransfer(type, connectionId, sourcePath, destPath, fileSize, result) {
    this.info(`SSH file ${type}`, {
      connectionId,
      type,
      sourcePath: sourcePath.substring(0, 200),
      destPath: destPath.substring(0, 200),
      fileSize,
      success: result.success,
      error: result.error || null,
      duration: result.duration || 0,
      transferSpeed: result.speed || 0,
      category: 'audit',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log IPC request/response
   */
  logIPC(channel, type, data, error = null) {
    const level = error ? 'error' : 'debug';
    const logMethod = this[level].bind(this);

    logMethod(`IPC ${type}`, {
      channel,
      type,
      hasError: !!error,
      error: error ? error.message : null,
      dataKeys: typeof data === 'object' ? Object.keys(data || {}) : null,
      category: 'ipc',
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
      const today = new Date().toISOString().split('T')[0];
      const logFile = path.join(this.logsDirectory, `quantumxfer-${today}.log`);
      
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
      return [{ error: error.message, level: 'error' }];
    }
  }

  /**
   * Export logs to file
   */
  exportLogs(outputPath) {
    try {
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
    this.winstonLogger.defaultMeta = { service: 'quantumxfer', context };
  }

  /**
   * Create child logger with new context
   */
  createChild(childContext) {
    const childLogger = new Logger({
      level: this.minLevel,
      logsDirectory: this.logsDirectory,
      maxLogFileSize: this.maxLogFileSize,
      maxLogFiles: this.maxLogFiles,
      enableConsole: this.enableConsole,
      enableFile: this.enableFile,
      context: childContext
    });

    return childLogger;
  }

  /**
   * Set log level dynamically
   */
  setLogLevel(level) {
    this.minLevel = level.toUpperCase();
    this.winstonLogger.level = level.toLowerCase();
    this.info(`Log level changed to: ${level}`);
  }
}

export default Logger;
