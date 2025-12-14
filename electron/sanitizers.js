/**
 * Security Sanitizers
 * 
 * Provides sanitization functions to prevent common security attacks:
 * - Path traversal attacks
 * - XSS (Cross-Site Scripting)
 * - Command injection
 * - Null byte injection
 * - Log injection
 */

/**
 * Prevent path traversal attacks
 * @param {string} filePath - Path to sanitize
 * @param {object} options - Sanitization options
 * @param {boolean} options.allowAbsolute - Allow absolute paths (default: false)
 * @param {Array<string>} options.blockedPaths - Paths to block (default: system paths)
 * @returns {string} Sanitized path
 * @throws {Error} If path contains traversal or blocked patterns
 */
export function sanitizePath(filePath, options = {}) {
  if (typeof filePath !== 'string') {
    throw new Error('Path must be a string');
  }

  const {
    allowAbsolute = false,
    blockedPaths = [
      '/etc/',
      '/root/',
      '/proc/',
      '/sys/',
      '/dev/',
      '/boot/',
      'C:\\Windows\\',
      'C:\\System32\\',
      'C:\\ProgramFiles\\',
      'HKEY_',
      '/root',
      '/etc',
      '/proc',
      '/sys',
      '/dev',
      '/boot'
    ]
  } = options;

  // Remove null bytes
  if (filePath.includes('\0')) {
    throw new Error('Path contains null bytes');
  }

  // Check for path traversal attempts
  if (filePath.includes('..') || filePath.match(/\.\.\//g) || filePath.match(/\.\.\\/g)) {
    throw new Error('Path traversal detected (../)');
  }

  // Check for absolute path if not allowed
  if (!allowAbsolute && (filePath.startsWith('/') || /^[a-zA-Z]:/.test(filePath))) {
    throw new Error('Absolute paths not allowed');
  }

  // Check for blocked system paths
  for (const blockedPath of blockedPaths) {
    if (filePath.includes(blockedPath) || filePath.startsWith(blockedPath)) {
      throw new Error(`Access to system path not allowed: ${blockedPath}`);
    }
  }

  // Normalize path separators
  const normalized = filePath.replace(/\\/g, '/');

  // Verify still safe after normalization
  if (normalized.includes('..') || normalized.match(/\.\.\//g)) {
    throw new Error('Path traversal detected after normalization');
  }

  return normalized;
}

/**
 * Prevent HTML/XSS attacks by encoding dangerous characters
 * @param {string} text - Text to encode
 * @returns {string} HTML-encoded text
 */
export function encodeHTML(text) {
  if (typeof text !== 'string') {
    return text;
  }

  const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;'
  };

  return text.replace(/[&<>"'\/]/g, (char) => htmlEscapes[char]);
}

/**
 * Prevent command injection by detecting dangerous shell patterns
 * @param {string} command - Command to check
 * @param {object} options - Validation options
 * @param {Array<RegExp>} options.dangerousPatterns - Patterns to block
 * @returns {boolean} True if safe, throws if dangerous
 * @throws {Error} If dangerous pattern detected
 */
export function sanitizeCommand(command, options = {}) {
  if (typeof command !== 'string') {
    throw new Error('Command must be a string');
  }

  const {
    dangerousPatterns = [
      /;\s*rm\s+-rf/gi,              // rm -rf
      /;\s*del\s+\/[sfq]/gi,         // del command
      /`[^`]*`/g,                     // backtick execution
      /\$\([^)]*\)/g,                 // $() execution
      /\|\s*nc\s+/gi,                 // nc (netcat)
      /\|\s*telnet\s+/gi,            // telnet
      />\s*\/dev\/null/gi,            // output redirection to null
      />\s*\/dev\/tcp/gi,             // TCP redirection
      /&&\s*[a-z]/gi,                 // command chaining
      /\|\|\s*[a-z]/gi,               // or chaining
      />\s*[a-zA-Z]/gi,               // file redirection
      /\s*2>\s*/gi,                   // stderr redirection
      />\s*\/etc\//gi,                // redirect to system files
      /\|.*sh$/gi,                    // pipe to shell
      /;\s*wget\s+/gi,                // wget download
      /;\s*curl\s+/gi,                // curl download
      /;\s*python\s+/gi,              // python execution
      /;\s*perl\s+/gi,                // perl execution
      /;\s*bash\s+/gi,                // bash execution
      /;\s*sh\s+/gi                   // sh execution
    ]
  } = options;

  // Check for null bytes
  if (command.includes('\0')) {
    throw new Error('Command contains null bytes');
  }

  // Check each dangerous pattern
  for (const pattern of dangerousPatterns) {
    if (pattern.test(command)) {
      throw new Error(`Dangerous command pattern detected: ${pattern.source}`);
    }
  }

  return true;
}

/**
 * Remove null bytes from string (common injection vector)
 * @param {string} text - Text to clean
 * @returns {string} Text without null bytes
 */
export function removeNullBytes(text) {
  if (typeof text !== 'string') {
    return text;
  }

  return text.replace(/\0/g, '');
}

/**
 * Sanitize log data to prevent log injection
 * @param {string} logData - Log data to sanitize
 * @param {object} options - Sanitization options
 * @param {number} options.maxLength - Maximum length (default: 10000)
 * @returns {string} Sanitized log data
 */
export function sanitizeLogData(logData, options = {}) {
  if (typeof logData !== 'string') {
    throw new Error('Log data must be a string');
  }

  const { maxLength = 10000 } = options;

  // Remove null bytes
  let sanitized = removeNullBytes(logData);

  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Prevent log forging (newline injection)
  // Allow newlines for multi-line logs, but prevent fake log entries
  sanitized = sanitized.split('\n').map(line => {
    // Ensure no line starts with log-level patterns to prevent injection
    return line.replace(/^(DEBUG|INFO|WARN|ERROR|CRITICAL|FATAL)\s*:/i, '_$1:');
  }).join('\n');

  // Enforce max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + ' [TRUNCATED]';
  }

  return sanitized;
}

/**
 * Validate and sanitize JSON data
 * @param {string} jsonString - JSON string to validate
 * @returns {*} Parsed JSON object
 * @throws {Error} If JSON is invalid
 */
export function sanitizeJSON(jsonString) {
  if (typeof jsonString !== 'string') {
    throw new Error('JSON data must be a string');
  }

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    throw new Error(`Invalid JSON: ${error.message}`);
  }
}

/**
 * Sanitize object by encoding string values
 * @param {object} obj - Object to sanitize
 * @param {object} options - Sanitization options
 * @param {boolean} options.encodeHTML - Encode HTML entities (default: true)
 * @param {Array<string>} options.encodeFields - Specific fields to encode (optional)
 * @returns {object} Sanitized object
 */
export function sanitizeObject(obj, options = {}) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const {
    encodeHTML: shouldEncodeHTML = true,
    encodeFields = []
  } = options;

  const sanitized = { ...obj };

  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'string') {
      // Encode specific fields or all string fields if encodeHTML is true
      if (shouldEncodeHTML || encodeFields.includes(key)) {
        sanitized[key] = encodeHTML(value);
      }

      // Always remove null bytes
      sanitized[key] = removeNullBytes(sanitized[key]);
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeObject(value, options);
    }
  }

  return sanitized;
}

/**
 * Enforce size limits on strings
 * @param {string} text - Text to check
 * @param {number} maxBytes - Maximum size in bytes
 * @param {string} fieldName - Field name for error message
 * @returns {string} The text if valid
 * @throws {Error} If text exceeds size limit
 */
export function enforceSizeLimit(text, maxBytes, fieldName = 'Data') {
  if (typeof text !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }

  const bytes = Buffer.byteLength(text, 'utf8');
  if (bytes > maxBytes) {
    throw new Error(
      `${fieldName} exceeds maximum size of ${maxBytes} bytes (${bytes} bytes)`
    );
  }

  return text;
}

/**
 * Sanitize database/command input to prevent SQL/command injection
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized input
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return input;
  }

  // Remove null bytes
  let sanitized = removeNullBytes(input);

  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

  // Remove common SQL injection patterns
  sanitized = sanitized.replace(/--|;|\/\*|\*\//g, '');

  return sanitized;
}

/**
 * Validate file upload safety
 * @param {string} fileName - File name to check
 * @param {number} fileSize - File size in bytes
 * @param {object} options - Validation options
 * @param {number} options.maxSize - Maximum file size (default: 2GB)
 * @param {Array<string>} options.allowedExtensions - Allowed extensions (optional)
 * @returns {boolean} True if safe
 * @throws {Error} If file is unsafe
 */
export function validateFileUpload(fileName, fileSize, options = {}) {
  if (typeof fileName !== 'string') {
    throw new Error('File name must be a string');
  }

  const {
    maxSize = 2_147_483_648, // 2GB
    allowedExtensions = null
  } = options;

  // Check file name safety
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    throw new Error('Invalid file name: contains path separators');
  }

  // Check for null bytes
  if (fileName.includes('\0')) {
    throw new Error('File name contains null bytes');
  }

  // Check file size
  if (fileSize > maxSize) {
    throw new Error(
      `File size ${fileSize} bytes exceeds maximum of ${maxSize} bytes`
    );
  }

  // Check extension if list provided
  if (allowedExtensions && allowedExtensions.length > 0) {
    const ext = fileName.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      throw new Error(
        `File extension .${ext} not allowed. Allowed: ${allowedExtensions.join(', ')}`
      );
    }
  }

  return true;
}

/**
 * Sanitize array of strings
 * @param {Array<string>} array - Array to sanitize
 * @param {object} options - Sanitization options
 * @param {number} options.maxItems - Maximum array items (default: 10000)
 * @param {number} options.maxItemLength - Max length per item (default: 10000)
 * @returns {Array<string>} Sanitized array
 * @throws {Error} If array is unsafe
 */
export function sanitizeStringArray(array, options = {}) {
  if (!Array.isArray(array)) {
    throw new Error('Input must be an array');
  }

  const {
    maxItems = 10000,
    maxItemLength = 10000
  } = options;

  if (array.length > maxItems) {
    throw new Error(`Array exceeds maximum of ${maxItems} items`);
  }

  return array.map((item, index) => {
    if (typeof item !== 'string') {
      throw new Error(`Array item ${index} must be a string`);
    }

    if (item.length > maxItemLength) {
      throw new Error(
        `Array item ${index} exceeds maximum length of ${maxItemLength} characters`
      );
    }

    return removeNullBytes(item);
  });
}

/**
 * Check if string looks like it might contain sensitive data
 * @param {string} text - Text to check
 * @returns {boolean} True if likely contains sensitive data
 */
export function containsSensitiveData(text) {
  if (typeof text !== 'string') {
    return false;
  }

  const sensitivePatterns = [
    /password\s*[=:]/i,
    /api[_-]?key\s*[=:]/i,
    /secret\s*[=:]/i,
    /token\s*[=:]/i,
    /auth\s*[=:]/i,
    /credential\s*[=:]/i,
    /ccn|credit.card|visa|mastercard/i,
    /ssn|social.security/i,
    /private.key/i
  ];

  return sensitivePatterns.some(pattern => pattern.test(text));
}

/**
 * Redact sensitive data from text
 * @param {string} text - Text to redact
 * @returns {string} Text with sensitive data redacted
 */
export function redactSensitiveData(text) {
  if (typeof text !== 'string') {
    return text;
  }

  let redacted = text;

  // Redact common sensitive patterns
  const redactionPatterns = [
    {
      pattern: /(password\s*[=:]\s*)([^\s,}]+)/gi,
      replace: '$1[REDACTED]'
    },
    {
      pattern: /(api[_-]?key\s*[=:]\s*)([^\s,}]+)/gi,
      replace: '$1[REDACTED]'
    },
    {
      pattern: /(secret\s*[=:]\s*)([^\s,}]+)/gi,
      replace: '$1[REDACTED]'
    },
    {
      pattern: /(token\s*[=:]\s*)([^\s,}]+)/gi,
      replace: '$1[REDACTED]'
    },
    {
      pattern: /(auth\s*[=:]\s*)([^\s,}]+)/gi,
      replace: '$1[REDACTED]'
    }
  ];

  for (const { pattern, replace } of redactionPatterns) {
    redacted = redacted.replace(pattern, replace);
  }

  return redacted;
}
