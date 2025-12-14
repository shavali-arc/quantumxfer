/**
 * SSH Connection & Command Validators
 * Provides comprehensive validation for SSH operations including connections,
 * commands, paths, key pairs, and protocol configurations
 */

import { validateRequired, validateString, validatePattern, validateNumberRange, validateEnum } from './common.js';

/**
 * Validate SSH connection configuration
 * @param {object} config - SSH connection configuration
 * @param {string} config.host - Hostname or IP address
 * @param {number} config.port - Port number (default 22)
 * @param {string} config.username - SSH username
 * @param {string} config.password - SSH password (optional if using keys)
 * @param {string} config.privateKey - Path to private key (optional)
 * @param {string} config.authType - 'password', 'key', or 'both'
 * @param {number} config.timeout - Connection timeout in seconds
 * @returns {Array<string>} Array of validation errors (empty if valid)
 */
export function validateSSHConnection(config) {
  const errors = [];

  try {
    // Validate required fields
    if (!config || typeof config !== 'object') {
      errors.push('Config must be an object');
      return errors;
    }

    if (!config.host) {
      errors.push('Host is required');
    } else if (!validateSSHHost(config.host)) {
      errors.push('Invalid SSH host format');
    }

    if (!config.username) {
      errors.push('Username is required');
    } else if (!validateUsername(config.username)) {
      errors.push('Invalid username format');
    }

    // Validate port if provided
    if (config.port !== undefined && !validateSSHPort(config.port)) {
      errors.push('Invalid SSH port');
    }

    // Validate auth type if provided
    if (config.authType && !validateAuthType(config.authType)) {
      errors.push('Invalid authentication type');
    }

    // Validate timeout if provided
    if (config.timeout !== undefined && !validateConnectionTimeout(config.timeout)) {
      errors.push('Invalid connection timeout');
    }

    // Validate password if provided
    if (config.password && !validatePassword(config.password)) {
      errors.push('Invalid password');
    }

    // Validate private key path if provided
    if (config.privateKey && !validatePrivateKeyPath(config.privateKey)) {
      errors.push('Invalid or non-existent private key path');
    }

  } catch (err) {
    errors.push(err.message);
  }

  return errors;
}

/**
 * Validate SSH host (IP address, hostname, or FQDN)
 * @param {string} host - Host to validate
 * @returns {boolean} True if valid host
 */
export function validateSSHHost(host) {
  try {
    if (typeof host !== 'string' || host.length === 0 || host.length > 255) {
      return false;
    }

    // IPv4 validation - must have exactly 4 octets
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Regex.test(host)) {
      // Validate each octet is 0-255
      const octets = host.split('.');
      return octets.length === 4 && octets.every(octet => {
        const num = parseInt(octet, 10);
        return num >= 0 && num <= 255;
      });
    }

    // IPv6 validation - more comprehensive pattern
    const ipv6Regex = /^(([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}|::1|::)$/;
    if (ipv6Regex.test(host)) {
      return true;
    }

    // Hostname/FQDN validation (alphanumeric, hyphens, dots)
    const hostnameRegex = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?$/;
    if (hostnameRegex.test(host)) {
      return true;
    }

    // Allow localhost
    if (/^localhost$/i.test(host)) {
      return true;
    }

    return false;
  } catch (err) {
    return false;
  }
}

/**
 * Validate SSH port number
 * @param {number} port - Port number to validate
 * @returns {boolean} True if valid port
 */
export function validateSSHPort(port) {
  try {
    if (typeof port !== 'number') {
      return false;
    }
    return port >= 1 && port <= 65535;
  } catch (err) {
    return false;
  }
}

/**
 * Validate SSH username
 * @param {string} username - Username to validate
 * @returns {boolean} True if valid username
 */
export function validateUsername(username) {
  try {
    if (typeof username !== 'string' || username.length === 0 || username.length > 32) {
      return false;
    }
    // Username can contain alphanumeric, dots, hyphens, underscores
    return /^[a-zA-Z0-9._-]+$/.test(username);
  } catch (err) {
    return false;
  }
}

/**
 * Validate SSH password
 * @param {string} password - Password to validate
 * @returns {boolean} True if valid password
 */
export function validatePassword(password) {
  try {
    if (typeof password !== 'string' || password.length === 0 || password.length > 256) {
      return false;
    }
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Validate SSH private key file path
 * @param {string} keyPath - Path to private key file
 * @returns {boolean} True if valid key path
 */
export function validatePrivateKeyPath(keyPath) {
  try {
    validateRequired(keyPath, 'keyPath');
    validateString(keyPath, 'keyPath');
    
    // Basic path validation - prevent path traversal
    if (keyPath.includes('..') || keyPath.includes('~')) {
      return false;
    }

    // Check if path looks reasonable for a key file
    // Should be an absolute path or relative with reasonable structure
    const validPathChars = /^[a-zA-Z0-9:\/\\._-]+$/;
    if (!validPathChars.test(keyPath)) {
      return false;
    }

    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Validate SSH authentication type
 * @param {string} authType - Authentication type ('password', 'key', 'both')
 * @returns {boolean} True if valid auth type
 */
export function validateAuthType(authType) {
  try {
    validateEnum(authType, 'authType', ['password', 'key', 'both']);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Validate SSH connection timeout
 * @param {number} timeout - Timeout in seconds
 * @returns {boolean} True if valid timeout
 */
export function validateConnectionTimeout(timeout) {
  try {
    if (typeof timeout !== 'number') {
      return false;
    }
    return timeout >= 1 && timeout <= 300;
  } catch (err) {
    return false;
  }
}

/**
 * Validate connection name/identifier
 * @param {string} name - Connection name
 * @returns {boolean} True if valid name
 */
export function validateConnectionName(name) {
  try {
    if (typeof name !== 'string' || name.length === 0 || name.length > 64) {
      return false;
    }
    return /^[a-zA-Z0-9._-]+$/.test(name);
  } catch (err) {
    return false;
  }
}

/**
 * Validate SSH command for execution safety
 * Prevents command injection and dangerous patterns
 * @param {string} command - Command to validate
 * @returns {boolean} True if command is safe to execute
 */
export function validateSSHCommand(command) {
  try {
    validateRequired(command, 'command');
    validateString(command, 'command');

    // Prevent dangerous shell metacharacters when not escaped
    const dangerousPatterns = [
      /[;&|`$()\n\r]/,  // Shell operators and newlines
      />\s*\/dev\//,     // Redirect to device files
      />\s*\/proc\//,    // Redirect to proc
      /2>\s*&\s*1/,      // Redirect stderr/stdout
      /\|\s*nc\s+/i,     // Pipe to netcat
      /\|\s*telnet/i,    // Pipe to telnet
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(command)) {
        return false;
      }
    }

    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Validate SSH command length
 * @param {string} command - Command to validate
 * @returns {boolean} True if command length is valid
 */
export function validateCommandLength(command) {
  try {
    if (typeof command !== 'string') {
      return false;
    }
    return command.length <= 4096;
  } catch (err) {
    return false;
  }
}

/**
 * Validate command for shell metacharacters
 * @param {string} command - Command to check
 * @returns {boolean} True if no dangerous metacharacters
 */
export function validateCommandShellMetachars(command) {
  try {
    validateRequired(command, 'command');
    validateString(command, 'command');

    // Check for unescaped shell metacharacters
    const shellMetachars = /[;&|`$()\[\]{}<>'\\"]/;
    return !shellMetachars.test(command);
  } catch (err) {
    return false;
  }
}

/**
 * Validate working directory for command execution
 * @param {string} workingDir - Working directory path
 * @returns {boolean} True if valid directory path
 */
export function validateCommandWorkingDir(workingDir) {
  try {
    if (typeof workingDir !== 'string' || workingDir.length === 0) {
      return false;
    }

    // Prevent path traversal
    if (workingDir.includes('..')) {
      return false;
    }

    // Must start with / or be a relative path with reasonable structure
    const validDirPattern = /^(\/|\.\/|[a-zA-Z0-9_-]+)(.+)?$/;
    return validDirPattern.test(workingDir);
  } catch (err) {
    return false;
  }
}

/**
 * Validate command execution timeout
 * @param {number} timeout - Timeout in seconds
 * @returns {boolean} True if valid timeout
 */
export function validateCommandTimeout(timeout) {
  try {
    if (typeof timeout !== 'number') {
      return false;
    }
    return timeout >= 1 && timeout <= 3600;
  } catch (err) {
    return false;
  }
}

/**
 * Validate interactive TTY allocation for SSH command
 * @param {boolean} interactive - Whether to allocate TTY
 * @returns {boolean} True if valid boolean
 */
export function validateSSHCommandInteractive(interactive) {
  return typeof interactive === 'boolean';
}

/**
 * Validate remote file path for SFTP operations
 * @param {string} remotePath - Remote file path
 * @returns {boolean} True if valid remote path
 */
export function validateRemotePath(remotePath) {
  try {
    validateRequired(remotePath, 'remotePath');
    validateString(remotePath, 'remotePath', { maxLength: 4096 });

    // Prevent path traversal attacks
    if (remotePath.includes('..')) {
      return false;
    }

    // Prevent access to sensitive directories
    const sensitivePatterns = [
      /^\/etc\//,
      /^\/root\//,
      /^\/proc\//,
      /^\/sys\//,
      /^\/dev\//,
      /^\/boot\//,
      /^C:\\windows/i,
      /^C:\\system/i,
    ];

    for (const pattern of sensitivePatterns) {
      if (pattern.test(remotePath)) {
        return false;
      }
    }

    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Validate local file path for downloads/uploads
 * @param {string} localPath - Local file path
 * @returns {boolean} True if valid local path
 */
export function validateLocalPath(localPath) {
  try {
    validateRequired(localPath, 'localPath');
    validateString(localPath, 'localPath', { maxLength: 4096 });

    // Prevent path traversal
    if (localPath.includes('..')) {
      return false;
    }

    // Basic Windows/Unix path validation
    const validPathPattern = /^[a-zA-Z0-9:\/\\._-]+$/;
    return validPathPattern.test(localPath);
  } catch (err) {
    return false;
  }
}

/**
 * Validate file path safety for operations
 * @param {string} filePath - File path to validate
 * @returns {boolean} True if path is safe
 */
export function validateFilePath(filePath) {
  try {
    validateRequired(filePath, 'filePath');
    validateString(filePath, 'filePath', { maxLength: 4096 });

    // No null bytes
    if (filePath.includes('\0')) {
      return false;
    }

    // No path traversal
    if (filePath.includes('..')) {
      return false;
    }

    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Validate directory path
 * @param {string} dirPath - Directory path to validate
 * @returns {boolean} True if valid directory path
 */
export function validateDirectoryPath(dirPath) {
  try {
    validateRequired(dirPath, 'dirPath');
    validateString(dirPath, 'dirPath', { maxLength: 4096 });

    // Must not include files
    if (dirPath.includes('..')) {
      return false;
    }

    // Should end with / or be a valid directory name
    return !dirPath.includes('\0');
  } catch (err) {
    return false;
  }
}

/**
 * Validate path encoding (UTF-8)
 * @param {string} path - Path to validate
 * @returns {boolean} True if valid UTF-8 encoding
 */
export function validatePathEncoding(path) {
  try {
    validateRequired(path, 'path');
    validateString(path, 'path');

    // Check if string is valid UTF-8
    return Buffer.from(path, 'utf8').toString('utf8') === path;
  } catch (err) {
    return false;
  }
}

/**
 * Validate path length
 * @param {string} path - Path to validate
 * @returns {boolean} True if path length is valid
 */
export function validatePathLength(path) {
  try {
    if (typeof path !== 'string') {
      return false;
    }
    return path.length <= 4096;
  } catch (err) {
    return false;
  }
}

/**
 * Validate path has read/write permissions
 * @param {string} path - Path to validate
 * @param {string} permission - 'read' or 'write'
 * @returns {boolean} True if path likely has permission
 */
export function validatePathPermissions(path, permission = 'read') {
  try {
    validateRequired(path, 'path');
    validateString(path, 'path');
    validateEnum(permission, 'permission', ['read', 'write']);

    // Basic validation - path should be accessible
    // Actual permission check would need filesystem access
    return !path.includes('..') && !path.includes('\0');
  } catch (err) {
    return false;
  }
}

/**
 * Validate SSH private key format (RSA or ED25519)
 * @param {string} keyContent - Private key content
 * @returns {boolean} True if valid key format
 */
export function validatePrivateKeyFormat(keyContent) {
  try {
    validateRequired(keyContent, 'keyContent');
    validateString(keyContent, 'keyContent');

    // Check for valid OpenSSH key formats
    const validFormats = [
      /BEGIN RSA PRIVATE KEY/,
      /BEGIN OPENSSH PRIVATE KEY/,
      /BEGIN EC PRIVATE KEY/,
      /BEGIN PRIVATE KEY/,
    ];

    return validFormats.some(format => format.test(keyContent));
  } catch (err) {
    return false;
  }
}

/**
 * Validate public key format (SSH)
 * @param {string} keyContent - Public key content
 * @returns {boolean} True if valid public key format
 */
export function validatePublicKeyFormat(keyContent) {
  try {
    validateRequired(keyContent, 'keyContent');
    validateString(keyContent, 'keyContent');

    // SSH public keys start with ssh-rsa, ssh-dss, ssh-ed25519, ecdsa-sha2
    const validFormats = [
      /^ssh-rsa\s+/,
      /^ssh-dss\s+/,
      /^ssh-ed25519\s+/,
      /^ecdsa-sha2-/,
    ];

    return validFormats.some(format => format.test(keyContent));
  } catch (err) {
    return false;
  }
}

/**
 * Validate key passphrase
 * @param {string} passphrase - Passphrase to validate
 * @returns {boolean} True if valid passphrase
 */
export function validateKeyPassphrase(passphrase) {
  try {
    validateRequired(passphrase, 'passphrase');
    validateString(passphrase, 'passphrase', { minLength: 1, maxLength: 256 });
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Validate SSH protocol version (SSH v2 only)
 * @param {string} version - Protocol version
 * @returns {boolean} True if valid version
 */
export function validateSSHVersion(version) {
  try {
    validateEnum(version, 'version', ['2.0', '2']);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Validate cipher suite
 * @param {string} cipher - Cipher name
 * @returns {boolean} True if approved cipher
 */
export function validateCipherSuite(cipher) {
  try {
    validateRequired(cipher, 'cipher');
    validateString(cipher, 'cipher');

    // Approved ciphers for SSH
    const approvedCiphers = [
      'aes128-ctr',
      'aes192-ctr',
      'aes256-ctr',
      'aes128-gcm@openssh.com',
      'aes256-gcm@openssh.com',
      'chacha20-poly1305@openssh.com',
    ];

    return approvedCiphers.includes(cipher);
  } catch (err) {
    return false;
  }
}

/**
 * Validate key exchange algorithm
 * @param {string} algorithm - KEX algorithm name
 * @returns {boolean} True if approved algorithm
 */
export function validateKEXAlgorithm(algorithm) {
  try {
    validateRequired(algorithm, 'algorithm');
    validateString(algorithm, 'algorithm');

    const approvedAlgos = [
      'diffie-hellman-group14-sha256',
      'diffie-hellman-group16-sha512',
      'ecdh-sha2-nistp256',
      'ecdh-sha2-nistp384',
      'ecdh-sha2-nistp521',
      'curve25519-sha256',
      'curve25519-sha256@libssh.org',
    ];

    return approvedAlgos.includes(algorithm);
  } catch (err) {
    return false;
  }
}

/**
 * Validate compression algorithm
 * @param {string} algorithm - Compression algorithm
 * @returns {boolean} True if safe algorithm
 */
export function validateCompressionAlgorithm(algorithm) {
  try {
    validateRequired(algorithm, 'algorithm');
    validateString(algorithm, 'algorithm');

    // Safe compression algorithms
    const safeAlgos = ['none', 'zlib', 'zlib@openssh.com'];
    return safeAlgos.includes(algorithm);
  } catch (err) {
    return false;
  }
}

/**
 * Validate key file permissions (should be 600)
 * @param {number} permissions - File permissions in octal
 * @returns {boolean} True if permissions are secure
 */
export function validateKeyPermissions(permissions) {
  try {
    // SSH keys should have 600 permissions (read/write for owner only)
    // Accept both decimal and octal representations
    const octal = permissions.toString(8);
    return octal === '600' || permissions === 0o600;
  } catch (err) {
    return false;
  }
}
