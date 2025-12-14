/**
 * IPC Handler Validation Middleware
 * 
 * Provides validation middleware for wrapping IPC handlers to ensure
 * all input data is validated before execution.
 */

import { logger } from './logger.js';
import {
  validateRequired,
  validateString,
  validateNumber,
  validateObject,
  validateArray,
} from './common.js';
import {
  validateSSHConnection,
  validateSSHCommand,
  validateRemotePath,
} from './ssh.js';
import {
  validateLocalFilePath,
  validateRemoteFilePath,
  validateFileTransferConfig,
  validateBookmark,
  validateProfile,
  validateProfileCollection,
} from './file.js';

/**
 * Validation middleware for IPC handlers
 * Ensures all inputs are validated before handler execution
 */
export class HandlerValidator {
  /**
   * Validate SSH connection configuration
   * @param {object} config - Connection configuration
   * @returns {object} Validation result { valid: boolean, errors: [] }
   */
  static validateConnection(config) {
    try {
      if (!config || typeof config !== 'object') {
        return {
          valid: false,
          errors: ['Configuration must be an object'],
        };
      }

      const errors = validateSSHConnection(config);
      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (err) {
      return {
        valid: false,
        errors: [err.message],
      };
    }
  }

  /**
   * Validate SSH command execution
   * @param {string} connectionId - Connection identifier
   * @param {string} command - Command to execute
   * @returns {object} Validation result { valid: boolean, errors: [] }
   */
  static validateCommandExecution(connectionId, command) {
    const errors = [];

    try {
      validateRequired(connectionId, 'connectionId');
    } catch (err) {
      errors.push(err.message);
    }

    try {
      validateRequired(command, 'command');
      validateString(command, 'command');
      if (!validateSSHCommand(command)) {
        errors.push('Invalid SSH command format');
      }
    } catch (err) {
      errors.push(err.message);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate directory listing request
   * @param {string} connectionId - Connection identifier
   * @param {string} remotePath - Remote path
   * @returns {object} Validation result { valid: boolean, errors: [] }
   */
  static validateDirectoryListing(connectionId, remotePath) {
    const errors = [];

    try {
      validateRequired(connectionId, 'connectionId');
    } catch (err) {
      errors.push(err.message);
    }

    try {
      validateRequired(remotePath, 'remotePath');
      validateString(remotePath, 'remotePath');
      if (!validateRemotePath(remotePath)) {
        errors.push('Invalid remote path format');
      }
    } catch (err) {
      errors.push(err.message);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate file download request
   * @param {string} connectionId - Connection identifier
   * @param {string} remotePath - Remote file path
   * @param {string} localPath - Local file path
   * @returns {object} Validation result { valid: boolean, errors: [] }
   */
  static validateFileDownload(connectionId, remotePath, localPath) {
    const errors = [];

    try {
      validateRequired(connectionId, 'connectionId');
    } catch (err) {
      errors.push(err.message);
    }

    try {
      validateRequired(remotePath, 'remotePath');
      validateString(remotePath, 'remotePath');
      if (!validateRemotePath(remotePath)) {
        errors.push('Invalid remote path format');
      }
    } catch (err) {
      errors.push(err.message);
    }

    try {
      validateRequired(localPath, 'localPath');
      validateString(localPath, 'localPath');
      if (!validateLocalFilePath(localPath)) {
        errors.push('Invalid local path format');
      }
    } catch (err) {
      errors.push(err.message);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate file upload request
   * @param {string} connectionId - Connection identifier
   * @param {string} localPath - Local file path
   * @param {string} remotePath - Remote file path
   * @returns {object} Validation result { valid: boolean, errors: [] }
   */
  static validateFileUpload(connectionId, localPath, remotePath) {
    const errors = [];

    try {
      validateRequired(connectionId, 'connectionId');
    } catch (err) {
      errors.push(err.message);
    }

    try {
      validateRequired(localPath, 'localPath');
      validateString(localPath, 'localPath');
      if (!validateLocalFilePath(localPath)) {
        errors.push('Invalid local path format');
      }
    } catch (err) {
      errors.push(err.message);
    }

    try {
      validateRequired(remotePath, 'remotePath');
      validateString(remotePath, 'remotePath');
      if (!validateRemotePath(remotePath)) {
        errors.push('Invalid remote path format');
      }
    } catch (err) {
      errors.push(err.message);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate connection ID
   * @param {string} connectionId - Connection identifier
   * @returns {object} Validation result { valid: boolean, errors: [] }
   */
  static validateConnectionId(connectionId) {
    const errors = [];

    try {
      validateRequired(connectionId, 'connectionId');
      validateString(connectionId, 'connectionId');
    } catch (err) {
      errors.push(err.message);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate bookmark object
   * @param {object} bookmark - Bookmark to validate
   * @returns {object} Validation result { valid: boolean, errors: [] }
   */
  static validateBookmarkObject(bookmark) {
    try {
      if (!bookmark || typeof bookmark !== 'object') {
        return {
          valid: false,
          errors: ['Bookmark must be an object'],
        };
      }

      const errors = validateBookmark(bookmark);
      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (err) {
      return {
        valid: false,
        errors: [err.message],
      };
    }
  }

  /**
   * Validate profile object
   * @param {object} profile - Profile to validate
   * @returns {object} Validation result { valid: boolean, errors: [] }
   */
  static validateProfileObject(profile) {
    try {
      if (!profile || typeof profile !== 'object') {
        return {
          valid: false,
          errors: ['Profile must be an object'],
        };
      }

      const errors = validateProfile(profile);
      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (err) {
      return {
        valid: false,
        errors: [err.message],
      };
    }
  }

  /**
   * Validate profiles array
   * @param {array} profiles - Profiles to validate
   * @returns {object} Validation result { valid: boolean, errors: [] }
   */
  static validateProfilesArray(profiles) {
    try {
      if (!Array.isArray(profiles)) {
        return {
          valid: false,
          errors: ['Profiles must be an array'],
        };
      }

      const errors = validateProfileCollection(profiles);
      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (err) {
      return {
        valid: false,
        errors: [err.message],
      };
    }
  }

  /**
   * Validate bookmark ID
   * @param {string} bookmarkId - Bookmark identifier
   * @returns {object} Validation result { valid: boolean, errors: [] }
   */
  static validateBookmarkId(bookmarkId) {
    const errors = [];

    try {
      validateRequired(bookmarkId, 'bookmarkId');
      validateString(bookmarkId, 'bookmarkId');
    } catch (err) {
      errors.push(err.message);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Format validation errors for response
   * @param {array} errors - Validation errors
   * @returns {object} Formatted error response
   */
  static formatErrorResponse(errors) {
    return {
      success: false,
      error: 'Validation failed',
      details: errors,
      code: 'VALIDATION_ERROR',
    };
  }

  /**
   * Log validation failure
   * @param {string} handler - Handler name
   * @param {array} errors - Validation errors
   * @param {object} input - Input data (sanitized)
   */
  static logValidationError(handler, errors, input = null) {
    const logData = {
      handler,
      errors,
      timestamp: new Date().toISOString(),
    };

    if (input) {
      // Sanitize sensitive data before logging
      const sanitized = { ...input };
      if (sanitized.password) sanitized.password = '***';
      if (sanitized.privateKey) sanitized.privateKey = '***';
      if (sanitized.passphrase) sanitized.passphrase = '***';
      logData.input = sanitized;
    }

    logger.warn('Handler validation failed', logData);
  }

  /**
   * Create a wrapped handler with validation
   * @param {function} handler - Original handler function
   * @param {function} validator - Validation function
   * @returns {function} Wrapped handler with validation
   */
  static createValidatedHandler(handler, validator) {
    return async (event, ...args) => {
      try {
        // Run validation
        const validation = validator(...args);

        // Return validation error if invalid
        if (!validation.valid) {
          this.logValidationError(handler.name, validation.errors, args[0]);
          return this.formatErrorResponse(validation.errors);
        }

        // Execute original handler
        return await handler(event, ...args);
      } catch (err) {
        logger.error('Handler execution error', {
          handler: handler.name,
          error: err.message,
          stack: err.stack,
        });
        return {
          success: false,
          error: err.message,
          code: 'HANDLER_ERROR',
        };
      }
    };
  }
}

export default HandlerValidator;
