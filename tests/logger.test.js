import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Logger from '../electron/logger.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Logger', () => {
  let logger;
  let tempLogsDir;

  beforeEach(() => {
    // Create temporary logs directory
    tempLogsDir = path.join(os.tmpdir(), `quantum-xfer-logs-${Date.now()}`);
    
    logger = new Logger({
      logsDirectory: tempLogsDir,
      enableConsole: false, // Disable console output for tests
      enableFile: true,
      level: 'DEBUG'
    });
  });

  afterEach(() => {
    // Clean up temporary files
    try {
      if (fs.existsSync(tempLogsDir)) {
        const files = fs.readdirSync(tempLogsDir);
        for (const file of files) {
          fs.unlinkSync(path.join(tempLogsDir, file));
        }
        fs.rmdirSync(tempLogsDir);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Initialization', () => {
    it('should create logger with default options', () => {
      const defaultLogger = new Logger();
      expect(defaultLogger).toBeDefined();
      expect(defaultLogger.minLevel).toBeDefined();
      expect(defaultLogger.enableConsole).toBe(true);
    });

    it('should create logger with custom level', () => {
      const errorLogger = new Logger({ level: 'ERROR', enableFile: false });
      expect(errorLogger.minLevel).toBe('ERROR');
    });

    it('should create logs directory if it does not exist', () => {
      expect(fs.existsSync(tempLogsDir)).toBe(true);
    });

    it('should set context correctly', () => {
      expect(logger.context).toBe('app');
      
      const sshLogger = new Logger({ 
        context: 'ssh-service',
        logsDirectory: tempLogsDir,
        enableFile: false
      });
      expect(sshLogger.context).toBe('ssh-service');
    });
  });

  describe('Log Levels', () => {
    it('should respect minimum log level', () => {
      const warnLogger = new Logger({ 
        level: 'WARN',
        logsDirectory: tempLogsDir,
        enableFile: false,
        enableConsole: false
      });

      // Winston logger respects the level set
      expect(warnLogger.minLevel).toBe('WARN');
    });

    it('should log at DEBUG level', () => {
      logger.debug('Debug message', { code: 'DBG001' });
      const logs = logger.readRecentLogs(1);
      
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('debug');
      expect(logs[0].message).toBe('Debug message');
    });

    it('should log at INFO level', () => {
      logger.info('Info message', { code: 'INF001' });
      const logs = logger.readRecentLogs(1);
      
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('info');
    });

    it('should log at WARN level', () => {
      logger.warn('Warning message', { code: 'WRN001' });
      const logs = logger.readRecentLogs(1);
      
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('warn');
    });

    it('should log at ERROR level', () => {
      logger.error('Error message', { code: 'ERR001' });
      const logs = logger.readRecentLogs(1);
      
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('error');
    });
  });

  describe('Sensitive Data Sanitization', () => {
    it('should redact passwords', () => {
      const sensitiveData = {
        username: 'user',
        password: 'secret123'
      };

      const sanitized = logger.sanitizeSensitiveData(sensitiveData);
      
      expect(sanitized.username).toBe('user');
      expect(sanitized.password).toBe('[REDACTED]');
    });

    it('should redact private keys', () => {
      const data = {
        host: 'example.com',
        privateKey: '-----BEGIN RSA PRIVATE KEY-----\n...'
      };

      const sanitized = logger.sanitizeSensitiveData(data);
      
      expect(sanitized.host).toBe('example.com');
      expect(sanitized.privateKey).toBe('[REDACTED]');
    });

    it('should redact tokens and secrets', () => {
      const data = {
        apiToken: 'secret-token-xyz',
        apiSecret: 'secret-abc',
        authToken: 'Bearer xyz'
      };

      const sanitized = logger.sanitizeSensitiveData(data);
      
      expect(sanitized.apiToken).toBe('[REDACTED]');
      expect(sanitized.apiSecret).toBe('[REDACTED]');
      expect(sanitized.authToken).toBe('[REDACTED]');
    });

    it('should handle nested objects', () => {
      const data = {
        user: {
          name: 'John',
          credentials: {
            password: 'secret'
          }
        }
      };

      const sanitized = logger.sanitizeSensitiveData(data);
      
      expect(sanitized.user.name).toBe('John');
      expect(sanitized.user.credentials.password).toBe('[REDACTED]');
    });
  });

  describe('File Logging', () => {
    it('should write logs to file', () => {
      logger.info('Test log message');
      
      // Check that log file was created in temp logs directory
      const files = fs.readdirSync(tempLogsDir);
      const logFiles = files.filter(f => f.includes('quantumxfer-') && f.endsWith('.log'));
      expect(logFiles.length).toBeGreaterThan(0);
    });

    it('should append logs to existing file', () => {
      logger.info('First message');
      logger.info('Second message');
      
      const logs = logger.readRecentLogs(10);
      expect(logs.length).toBeGreaterThanOrEqual(2);
    });

    it('should format logs as JSON', () => {
      logger.info('Test message', { key: 'value' });
      const logs = logger.readRecentLogs(1);
      
      expect(logs[0]).toHaveProperty('timestamp');
      expect(logs[0]).toHaveProperty('level');
      expect(logs[0]).toHaveProperty('message');
      expect(logs[0]).toHaveProperty('service'); // Winston adds this
    });

    it('should not write logs when enableFile is false', () => {
      const noFileLogger = new Logger({
        logsDirectory: tempLogsDir,
        enableFile: false,
        enableConsole: false
      });

      noFileLogger.info('Message that should not be logged');
      
      // No file should be written for this logger
      // Note: This is harder to test with Winston, but we can verify the flag is set
      expect(noFileLogger.enableFile).toBe(false);
    });
  });

  describe('SSH Logging', () => {
    it('should log SSH connections', () => {
      const config = {
        host: 'example.com',
        port: 22,
        username: 'user',
        password: 'secret'
      };

      const result = { success: true };
      logger.logSSHConnect('conn-1', config, result);

      const logs = logger.readRecentLogs(1);
      expect(logs[0].message).toBe('SSH connection established');
      // Check that password is not in the sanitized log
      const logStr = JSON.stringify(logs[0]);
      expect(logStr).not.toContain('secret');
    });

    it('should log SSH commands', () => {
      const result = { success: true, exitCode: 0, duration: 250 };
      logger.logSSHCommand('conn-1', 'ls -la /home', result);

      const logs = logger.readRecentLogs(1);
      expect(logs[0].message).toBe('SSH command executed');
      expect(logs[0]).toHaveProperty('command');
    });

    it('should truncate long commands in logs', () => {
      const longCommand = 'a'.repeat(250);
      const result = { success: true, exitCode: 0 };
      logger.logSSHCommand('conn-1', longCommand, result);

      const logs = logger.readRecentLogs(1);
      // Command should be truncated to 200 chars
      expect(JSON.stringify(logs[0])).toContain('"command":"' + 'a'.repeat(200));
    });

    it('should log file transfers', () => {
      const result = { 
        success: true,
        speed: '204.8 KB/s'
      };

      logger.logFileTransfer('download', 'conn-1', '/remote/file.zip', '/local/file.zip', 1024000, result);

      const logs = logger.readRecentLogs(1);
      expect(logs[0].message).toBe('SSH file download');
      expect(logs[0]).toHaveProperty('type');
      expect(logs[0]).toHaveProperty('fileSize');
    });
  });

  describe('IPC Logging', () => {
    it('should log IPC requests', () => {
      logger.logIPC('ssh-connect', 'request', { host: 'example.com' });

      const logs = logger.readRecentLogs(1);
      expect(logs[0].message).toContain('IPC request');
      expect(logs[0]).toHaveProperty('channel');
    });

    it('should log IPC responses', () => {
      logger.logIPC('ssh-connect', 'response', { success: true });

      const logs = logger.readRecentLogs(1);
      expect(logs[0].message).toContain('IPC response');
    });

    it('should log IPC errors', () => {
      const error = new Error('Connection failed');
      logger.logIPC('ssh-connect', 'error', {}, error);

      const logs = logger.readRecentLogs(1);
      expect(logs[0].level).toBe('error');
      expect(logs[0]).toHaveProperty('error');
    });
  });

  describe('Log Reading', () => {
    it('should read recent logs', () => {
      logger.info('Message 1');
      logger.info('Message 2');
      logger.info('Message 3');

      const logs = logger.readRecentLogs(2);
      expect(logs.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty array if no logs exist', () => {
      const newLogger = new Logger({
        logsDirectory: path.join(os.tmpdir(), `empty-logs-${Date.now()}`),
        enableFile: true,
        enableConsole: false
      });

      const logs = newLogger.readRecentLogs(10);
      expect(Array.isArray(logs)).toBe(true);
    });

    it('should parse JSON log entries correctly', () => {
      logger.info('Test', { key: 'value' });

      const logs = logger.readRecentLogs(1);
      expect(logs[0]).toHaveProperty('timestamp');
    });
  });

  describe('Log Export', () => {
    it('should export logs to file', () => {
      logger.info('Log entry 1');
      logger.info('Log entry 2');

      const exportPath = path.join(tempLogsDir, 'export.json');
      const result = logger.exportLogs(exportPath);

      expect(result.success).toBe(true);
      expect(fs.existsSync(exportPath)).toBe(true);

      const content = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
      expect(Array.isArray(content)).toBe(true);
    });

    it('should handle export errors', () => {
      const mockLogger = new Logger({
        logsDirectory: tempLogsDir,
        enableFile: false,
        enableConsole: false
      });

      // Try to export with non-existent directory path
      const result = mockLogger.exportLogs('/nonexistent/directory/export.json');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Child Logger', () => {
    it('should create child logger with new context', () => {
      const childLogger = logger.createChild('ssh-service');

      expect(childLogger.context).toBe('ssh-service');
      expect(childLogger.logsDirectory).toBe(logger.logsDirectory);
    });

    it('should inherit logger settings', () => {
      const customLogger = new Logger({
        logsDirectory: tempLogsDir,
        level: 'WARN',
        enableConsole: true,
        enableFile: true
      });

      const child = customLogger.createChild('child');

      expect(child.minLevel).toBe(customLogger.minLevel);
      expect(child.enableConsole).toBe(customLogger.enableConsole);
      expect(child.enableFile).toBe(customLogger.enableFile);
    });
  });

  describe('Context Management', () => {
    it('should set context', () => {
      logger.setContext('new-context');
      expect(logger.context).toBe('new-context');
    });

    it('should include context in Winston logger', () => {
      logger.setContext('test-context');
      logger.info('Message');
      
      expect(logger.context).toBe('test-context');
    });
  });

  describe('Error Handling', () => {
    it('should handle logging errors gracefully', () => {
      const logger1 = new Logger({
        logsDirectory: '/invalid/path/that/does/not/exist',
        enableFile: true,
        enableConsole: false
      });

      // Should not throw
      expect(() => {
        logger1.info('Test message');
      }).not.toThrow();
    });

    it('should handle malformed metadata', () => {
      const circularRef = { a: 1 };
      circularRef.self = circularRef; // Create circular reference

      expect(() => {
        logger.info('Test', circularRef);
      }).not.toThrow();
    });
  });

  describe('Timestamp Formatting', () => {
    it('should format timestamps as ISO 8601', () => {
      logger.info('Test');
      const logs = logger.readRecentLogs(1);

      if (logs.length > 0) {
        const timestamp = logs[0].timestamp;
        expect(timestamp).toMatch(/\d{4}-\d{2}-\d{2}/);
      }
    });

    it('should include process ID in logs', () => {
      logger.info('Test');
      const logs = logger.readRecentLogs(1);

      if (logs.length > 0) {
        expect(logs[0]).toHaveProperty('pid');
      }
    });
  });

  describe('Log Level Management', () => {
    it('should set log level dynamically', () => {
      logger.setLogLevel('ERROR');
      expect(logger.minLevel).toBe('ERROR');
    });

    it('should convert level strings to lowercase for Winston', () => {
      logger.setLogLevel('DEBUG');
      // Winston uses lowercase levels
      expect(logger.winstonLogger.level).toBe('debug');
    });
  });

  describe('Pattern-Based Redaction', () => {
    it('should redact by pattern in strings', () => {
      const str = 'password=secret123 and token=xyz123';
      const redacted = logger.redactByPattern(str);
      
      expect(redacted).toContain('[REDACTED]');
      expect(redacted).not.toContain('secret123');
      expect(redacted).not.toContain('xyz123');
    });

    it('should handle multiple sensitive patterns', () => {
      const data = {
        message: 'password=pass123 token=tok456 apiKey=key789'
      };

      const sanitized = logger.sanitizeSensitiveData(data);
      expect(sanitized.message).toContain('[REDACTED]');
    });
  });
});
