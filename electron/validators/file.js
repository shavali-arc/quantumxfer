/**
 * File, Bookmark, and Profile Validators
 * 
 * Provides validation for file operations, bookmark management, and profile handling.
 * Ensures path safety, file permissions, data integrity, and configuration validity.
 */

import { validateRequired, validateString, validateBoolean, validateObject, validateArray, validatePattern, validateNumberRange, validateStringLength } from './common.js';
import path from 'path';
import { existsSync, statSync } from 'fs';

// ==================== FILE OPERATION VALIDATORS ====================

/**
 * Validate local file path for safety and accessibility
 * @param {string} filePath - File path to validate
 * @returns {boolean} True if valid local file path
 */
export function validateLocalFilePath(filePath) {
  if (typeof filePath !== 'string' || !filePath.trim()) {
    return false;
  }

  try {
    // Check for invalid characters
    const invalidChars = /[<>"|?*\x00-\x1f]/;
    if (invalidChars.test(filePath)) {
      return false;
    }

    // Normalize and check for path traversal attempts
    const normalized = path.normalize(filePath);
    const parts = normalized.split(path.sep);
    for (const part of parts) {
      if (part === '..') {
        return false;
      }
    }

    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Validate local file path exists and is accessible
 * @param {string} filePath - File path to validate
 * @returns {boolean} True if file exists and is accessible
 */
export function validateLocalFileExists(filePath) {
  if (!validateLocalFilePath(filePath)) {
    return false;
  }

  try {
    return existsSync(filePath);
  } catch (err) {
    return false;
  }
}

/**
 * Validate remote file path for safety
 * @param {string} filePath - Remote file path to validate
 * @param {object} options - Validation options
 * @param {boolean} options.allowAbsolute - Allow absolute paths (default: true)
 * @param {number} options.maxLength - Maximum path length (default: 4096)
 * @returns {boolean} True if valid remote path
 */
export function validateRemoteFilePath(filePath, options = {}) {
  const { allowAbsolute = true, maxLength = 4096 } = options;

  if (typeof filePath !== 'string' || !filePath.trim()) {
    return false;
  }

  // Check length
  if (filePath.length > maxLength) {
    return false;
  }

  // Check for null bytes and control characters
  if (/[\x00-\x1f]/.test(filePath)) {
    return false;
  }

  // Check for directory traversal
  const parts = filePath.split(/[\/\\]/);
  for (const part of parts) {
    if (part === '..' || part === '.') {
      return false;
    }
  }

  // Check for shell metacharacters
  const dangerousChars = /[;&|`$()<>]/;
  if (dangerousChars.test(filePath)) {
    return false;
  }

  return true;
}

/**
 * Validate file transfer configuration
 * @param {object} config - File transfer configuration
 * @param {string} config.localPath - Local file path
 * @param {string} config.remotePath - Remote file path
 * @param {string} config.direction - 'upload' or 'download'
 * @param {number} config.maxSize - Maximum file size in bytes (optional)
 * @returns {Array<string>} Array of validation errors (empty if valid)
 */
export function validateFileTransferConfig(config) {
  const errors = [];

  if (!config || typeof config !== 'object') {
    errors.push('Configuration must be an object');
    return errors;
  }

  // Validate local path
  if (!config.localPath) {
    errors.push('localPath is required');
  } else if (!validateLocalFilePath(config.localPath)) {
    errors.push('Invalid local file path');
  }

  // Validate remote path
  if (!config.remotePath) {
    errors.push('remotePath is required');
  } else if (!validateRemoteFilePath(config.remotePath)) {
    errors.push('Invalid remote file path');
  }

  // Validate direction
  if (!config.direction) {
    errors.push('direction is required');
  } else if (!['upload', 'download'].includes(config.direction)) {
    errors.push('direction must be "upload" or "download"');
  }

  // Validate max size if provided
  if (config.maxSize !== undefined) {
    if (typeof config.maxSize !== 'number' || config.maxSize <= 0) {
      errors.push('maxSize must be a positive number');
    }
  }

  return errors;
}

/**
 * Validate file name for safety
 * @param {string} fileName - File name to validate
 * @param {object} options - Validation options
 * @param {number} options.maxLength - Maximum filename length (default: 255)
 * @returns {boolean} True if valid file name
 */
export function validateFileName(fileName, options = {}) {
  const { maxLength = 255 } = options;

  if (typeof fileName !== 'string' || !fileName.trim()) {
    return false;
  }

  // Check length
  if (fileName.length > maxLength) {
    return false;
  }

  // Check for invalid characters
  const invalidChars = /[<>:"|?*\x00-\x1f/\\]/;
  if (invalidChars.test(fileName)) {
    return false;
  }

  // Check for dangerous names (Windows reserved names)
  const reservedNames = /^(con|prn|aux|nul|com\d|lpt\d)$/i;
  if (reservedNames.test(fileName)) {
    return false;
  }

  // Reject filenames that start with dot (hidden files on Unix)
  if (fileName.startsWith('.')) {
    return false;
  }

  return true;
}

/**
 * Validate directory path for safety
 * @param {string} dirPath - Directory path to validate
 * @returns {boolean} True if valid directory path
 */
export function validateDirectoryPath(dirPath) {
  if (typeof dirPath !== 'string' || !dirPath.trim()) {
    return false;
  }

  // Check for path traversal
  const parts = dirPath.split(/[\/\\]/);
  for (const part of parts) {
    if (part === '..' || part === '.' && parts.length > 1) {
      return false;
    }
  }

  // Check for invalid characters
  const invalidChars = /[<>"|?*\x00-\x1f]/;
  if (invalidChars.test(dirPath)) {
    return false;
  }

  // Check for shell metacharacters
  const dangerousChars = /[;&|`$()<>]/;
  if (dangerousChars.test(dirPath)) {
    return false;
  }

  return true;
}

/**
 * Validate file size
 * @param {number} size - File size in bytes
 * @param {object} options - Validation options
 * @param {number} options.maxSize - Maximum allowed size (default: 10GB)
 * @param {number} options.minSize - Minimum allowed size (default: 0)
 * @returns {boolean} True if valid file size
 */
export function validateFileSize(size, options = {}) {
  const { maxSize = 10 * 1024 * 1024 * 1024, minSize = 0 } = options; // 10GB default

  if (typeof size !== 'number' || !Number.isInteger(size)) {
    return false;
  }

  return size >= minSize && size <= maxSize;
}

/**
 * Validate file permissions in octal format
 * @param {string|number} permissions - File permissions (e.g., '644' or 0o644)
 * @returns {boolean} True if valid permissions
 */
export function validateFilePermissions(permissions) {
  // Handle string permissions like "644"
  if (typeof permissions === 'string') {
    if (!/^\d{3,4}$/.test(permissions)) {
      return false;
    }
    permissions = parseInt(permissions, 8);
  }

  // Check if it's a valid octal number
  if (typeof permissions !== 'number') {
    return false;
  }

  // Valid permissions range: 0o0000 to 0o7777
  return permissions >= 0o0000 && permissions <= 0o7777;
}

/**
 * Validate file metadata object
 * @param {object} metadata - File metadata
 * @param {string} metadata.name - File name
 * @param {number} metadata.size - File size in bytes
 * @param {string} metadata.type - File type (file, directory, symlink, etc.)
 * @param {number} metadata.modifiedTime - Last modified timestamp
 * @returns {Array<string>} Array of validation errors (empty if valid)
 */
export function validateFileMetadata(metadata) {
  const errors = [];

  if (!metadata || typeof metadata !== 'object') {
    errors.push('Metadata must be an object');
    return errors;
  }

  // Validate name
  if (!metadata.name) {
    errors.push('File name is required');
  } else if (!validateFileName(metadata.name)) {
    errors.push('Invalid file name');
  }

  // Validate size
  if (metadata.size !== undefined) {
    if (!validateFileSize(metadata.size)) {
      errors.push('Invalid file size');
    }
  }

  // Validate type
  if (metadata.type && !['file', 'directory', 'symlink', 'socket', 'device'].includes(metadata.type)) {
    errors.push('Invalid file type');
  }

  // Validate modified time
  if (metadata.modifiedTime !== undefined) {
    if (typeof metadata.modifiedTime !== 'number' || metadata.modifiedTime < 0) {
      errors.push('Invalid modification time');
    }
  }

  return errors;
}

// ==================== BOOKMARK VALIDATORS ====================

/**
 * Validate bookmark configuration
 * @param {object} bookmark - Bookmark object
 * @param {string} bookmark.id - Unique bookmark identifier
 * @param {string} bookmark.name - Display name for bookmark
 * @param {string} bookmark.type - Bookmark type ('server' or 'directory')
 * @param {string} bookmark.path - Server path or file path
 * @param {number} bookmark.createdAt - Creation timestamp (optional)
 * @returns {Array<string>} Array of validation errors (empty if valid)
 */
export function validateBookmark(bookmark) {
  const errors = [];

  if (!bookmark || typeof bookmark !== 'object') {
    errors.push('Bookmark must be an object');
    return errors;
  }

  // Validate ID
  if (!bookmark.id) {
    errors.push('Bookmark ID is required');
  } else if (typeof bookmark.id !== 'string' || !validateBookmarkId(bookmark.id)) {
    errors.push('Invalid bookmark ID format');
  }

  // Validate name
  if (!bookmark.name) {
    errors.push('Bookmark name is required');
  } else if (!validateBookmarkName(bookmark.name)) {
    errors.push('Invalid bookmark name');
  }

  // Validate type
  if (!bookmark.type) {
    errors.push('Bookmark type is required');
  } else if (!['server', 'directory'].includes(bookmark.type)) {
    errors.push('Bookmark type must be "server" or "directory"');
  }

  // Validate path - optional if type is server
  if (bookmark.type === 'directory' && !bookmark.path) {
    errors.push('Bookmark path is required for directory bookmarks');
  } else if (bookmark.path && !validateRemoteFilePath(bookmark.path)) {
    errors.push('Invalid bookmark path');
  }

  // Validate timestamp if provided
  if (bookmark.createdAt !== undefined) {
    if (typeof bookmark.createdAt !== 'number' || bookmark.createdAt <= 0) {
      errors.push('Invalid creation timestamp');
    }
  }

  return errors;
}

/**
 * Validate bookmark ID format
 * @param {string} id - Bookmark ID to validate
 * @returns {boolean} True if valid bookmark ID
 */
export function validateBookmarkId(id) {
  if (typeof id !== 'string' || !id.trim()) {
    return false;
  }

  // UUID format
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(id)) {
    return true;
  }

  // Hash-like IDs (alphanumeric, at least 4 chars)
  const hashPattern = /^[a-z0-9]{4,}$/i;
  if (hashPattern.test(id)) {
    return true;
  }

  // Slug-like IDs with underscores and hyphens (at least 2 chars)
  const slugPattern = /^[a-zA-Z0-9_-]{2,}$/;
  if (slugPattern.test(id)) {
    return true;
  }

  return false;
}

/**
 * Validate bookmark name
 * @param {string} name - Bookmark name to validate
 * @param {object} options - Validation options
 * @param {number} options.maxLength - Maximum name length (default: 100)
 * @param {number} options.minLength - Minimum name length (default: 1)
 * @returns {boolean} True if valid bookmark name
 */
export function validateBookmarkName(name, options = {}) {
  const { maxLength = 100, minLength = 1 } = options;

  if (typeof name !== 'string') {
    return false;
  }

  const trimmed = name.trim();
  if (trimmed.length < minLength || trimmed.length > maxLength) {
    return false;
  }

  // Allow alphanumeric, spaces, hyphens, underscores, and some special chars
  const validPattern = /^[a-zA-Z0-9\s\-_.@()[\]{}]*$/;
  return validPattern.test(name);
}

/**
 * Validate bookmark collection
 * @param {Array} bookmarks - Array of bookmark objects
 * @param {object} options - Validation options
 * @param {number} options.maxBookmarks - Maximum number of bookmarks (default: 1000)
 * @returns {Array<string>} Array of validation errors (empty if valid)
 */
export function validateBookmarkCollection(bookmarks, options = {}) {
  const { maxBookmarks = 1000 } = options;
  const errors = [];

  if (!Array.isArray(bookmarks)) {
    errors.push('Bookmarks must be an array');
    return errors;
  }

  if (bookmarks.length > maxBookmarks) {
    errors.push(`Number of bookmarks exceeds maximum of ${maxBookmarks}`);
  }

  // Check for duplicate IDs
  const ids = new Set();
  for (const bookmark of bookmarks) {
    if (bookmark.id && ids.has(bookmark.id)) {
      errors.push(`Duplicate bookmark ID: ${bookmark.id}`);
      break;
    }
    if (bookmark.id) {
      ids.add(bookmark.id);
    }

    // Validate individual bookmark
    const bookmarkErrors = validateBookmark(bookmark);
    if (bookmarkErrors.length > 0) {
      errors.push(`Bookmark validation error: ${bookmarkErrors.join(', ')}`);
    }
  }

  return errors;
}

// ==================== PROFILE VALIDATORS ====================

/**
 * Validate connection profile configuration
 * @param {object} profile - Profile object
 * @param {string} profile.id - Profile unique identifier
 * @param {string} profile.name - Profile display name
 * @param {string} profile.host - SSH host
 * @param {number} profile.port - SSH port
 * @param {string} profile.username - SSH username
 * @param {string} profile.authType - Authentication type ('password', 'key', or 'both')
 * @param {object} profile.metadata - Additional profile metadata (optional)
 * @returns {Array<string>} Array of validation errors (empty if valid)
 */
export function validateProfile(profile) {
  const errors = [];

  if (!profile || typeof profile !== 'object') {
    errors.push('Profile must be an object');
    return errors;
  }

  // Validate ID
  if (!profile.id) {
    errors.push('Profile ID is required');
  } else if (!validateProfileId(profile.id)) {
    errors.push('Invalid profile ID format');
  }

  // Validate name
  if (!profile.name) {
    errors.push('Profile name is required');
  } else if (!validateProfileName(profile.name)) {
    errors.push('Invalid profile name');
  }

  // Validate host
  if (!profile.host) {
    errors.push('Host is required');
  } else if (!validateProfileHost(profile.host)) {
    errors.push('Invalid host format');
  }

  // Validate port
  if (profile.port !== undefined) {
    if (!validateProfilePort(profile.port)) {
      errors.push('Invalid port number');
    }
  }

  // Validate username
  if (!profile.username) {
    errors.push('Username is required');
  } else if (!validateProfileUsername(profile.username)) {
    errors.push('Invalid username format');
  }

  // Validate auth type
  if (profile.authType && !['password', 'key', 'both'].includes(profile.authType)) {
    errors.push('Invalid authentication type');
  }

  // Validate metadata if provided
  if (profile.metadata && !validateProfileMetadata(profile.metadata)) {
    errors.push('Invalid profile metadata');
  }

  return errors;
}

/**
 * Validate profile ID
 * @param {string} id - Profile ID to validate
 * @returns {boolean} True if valid profile ID
 */
export function validateProfileId(id) {
  if (typeof id !== 'string' || !id.trim()) {
    return false;
  }

  // UUID format
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(id)) {
    return true;
  }

  // Slug-like IDs with alphanumerics, underscores, hyphens (at least 2 chars)
  const slugPattern = /^[a-zA-Z0-9_-]{2,}$/;
  return slugPattern.test(id);
}

/**
 * Validate profile name
 * @param {string} name - Profile name to validate
 * @param {object} options - Validation options
 * @param {number} options.maxLength - Maximum name length (default: 100)
 * @param {number} options.minLength - Minimum name length (default: 1)
 * @returns {boolean} True if valid profile name
 */
export function validateProfileName(name, options = {}) {
  const { maxLength = 100, minLength = 1 } = options;

  if (typeof name !== 'string') {
    return false;
  }

  const trimmed = name.trim();
  if (trimmed.length < minLength || trimmed.length > maxLength) {
    return false;
  }

  // Allow alphanumeric, spaces, hyphens, underscores, and special chars
  const validPattern = /^[a-zA-Z0-9\s\-_.@()[\]{}]*$/;
  return validPattern.test(name);
}

/**
 * Validate profile host (hostname or IP)
 * @param {string} host - Host to validate
 * @returns {boolean} True if valid host
 */
export function validateProfileHost(host) {
  if (typeof host !== 'string' || !host.trim()) {
    return false;
  }

  // Check if it looks like an IPv4 (contains dots, no colons)
  const looksLikeIPv4 = host.includes('.') && !host.includes(':');
  
  if (looksLikeIPv4 && /^\d/.test(host)) {
    // Validate as IPv4 only if starts with digit
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipv4Pattern.test(host)) {
      return false;
    }
    const parts = host.split('.');
    if (parts.length !== 4) {
      return false;
    }
    return parts.every(p => {
      const num = parseInt(p, 10);
      return num >= 0 && num <= 255;
    });
  }

  // IPv6 - must have colons
  if (host.includes(':')) {
    // Basic IPv6 validation (allow :: and hexadecimal)
    return /^[0-9a-f:]+$/i.test(host);
  }

  // Hostname/FQDN - allow hyphens and dots
  if (host === 'localhost') {
    return true;
  }
  
  // Must start and end with alphanumeric, can contain hyphens
  const hostnamePattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
  return hostnamePattern.test(host);
}

/**
 * Validate profile port
 * @param {number} port - Port number to validate
 * @returns {boolean} True if valid port
 */
export function validateProfilePort(port) {
  if (typeof port !== 'number' || !Number.isInteger(port)) {
    return false;
  }

  return port > 0 && port <= 65535;
}

/**
 * Validate profile username
 * @param {string} username - Username to validate
 * @param {object} options - Validation options
 * @param {number} options.maxLength - Maximum length (default: 32)
 * @param {number} options.minLength - Minimum length (default: 1)
 * @returns {boolean} True if valid username
 */
export function validateProfileUsername(username, options = {}) {
  const { maxLength = 32, minLength = 1 } = options;

  if (typeof username !== 'string') {
    return false;
  }

  if (username.length < minLength || username.length > maxLength) {
    return false;
  }

  // Allow alphanumeric, underscore, dot, hyphen
  const validPattern = /^[a-zA-Z0-9._-]+$/;
  return validPattern.test(username);
}

/**
 * Validate profile metadata
 * @param {object} metadata - Profile metadata to validate
 * @returns {boolean} True if valid metadata
 */
export function validateProfileMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return false;
  }

  // Metadata should be a plain object
  const keys = Object.keys(metadata);
  if (keys.length > 50) {
    return false; // Limit metadata fields
  }

  // Check values are simple types
  for (const key of keys) {
    if (!validateMetadataKey(key)) {
      return false;
    }

    const value = metadata[key];
    if (!validateMetadataValue(value)) {
      return false;
    }
  }

  return true;
}

/**
 * Validate metadata key
 * @param {string} key - Metadata key to validate
 * @returns {boolean} True if valid key
 */
export function validateMetadataKey(key) {
  if (typeof key !== 'string') {
    return false;
  }

  // Allow alphanumeric, underscore, dot
  return /^[a-zA-Z0-9_]{1,64}$/.test(key);
}

/**
 * Validate metadata value
 * @param {*} value - Metadata value to validate
 * @returns {boolean} True if valid value
 */
export function validateMetadataValue(value) {
  // Allow string, number, boolean, null
  if (value === null) {
    return true;
  }

  const type = typeof value;
  if (type === 'string' || type === 'number' || type === 'boolean') {
    // String should not be too long
    if (type === 'string' && value.length > 1000) {
      return false;
    }
    return true;
  }

  return false;
}

/**
 * Validate profile collection
 * @param {Array} profiles - Array of profile objects
 * @param {object} options - Validation options
 * @param {number} options.maxProfiles - Maximum number of profiles (default: 1000)
 * @returns {Array<string>} Array of validation errors (empty if valid)
 */
export function validateProfileCollection(profiles, options = {}) {
  const { maxProfiles = 1000 } = options;
  const errors = [];

  if (!Array.isArray(profiles)) {
    errors.push('Profiles must be an array');
    return errors;
  }

  if (profiles.length > maxProfiles) {
    errors.push(`Number of profiles exceeds maximum of ${maxProfiles}`);
  }

  // Check for duplicate IDs and names
  const ids = new Set();
  const names = new Set();

  for (const profile of profiles) {
    if (profile.id && ids.has(profile.id)) {
      errors.push(`Duplicate profile ID: ${profile.id}`);
      break;
    }
    if (profile.id) {
      ids.add(profile.id);
    }

    if (profile.name && names.has(profile.name)) {
      errors.push(`Duplicate profile name: ${profile.name}`);
      break;
    }
    if (profile.name) {
      names.add(profile.name);
    }

    // Validate individual profile
    const profileErrors = validateProfile(profile);
    if (profileErrors.length > 0) {
      errors.push(`Profile validation error: ${profileErrors.join(', ')}`);
    }
  }

  return errors;
}

/**
 * Validate profile update data (partial profile)
 * @param {object} updateData - Partial profile data to update
 * @returns {Array<string>} Array of validation errors (empty if valid)
 */
export function validateProfileUpdate(updateData) {
  const errors = [];

  if (!updateData || typeof updateData !== 'object') {
    errors.push('Update data must be an object');
    return errors;
  }

  // Validate each optional field
  if (updateData.name !== undefined && !validateProfileName(updateData.name)) {
    errors.push('Invalid profile name');
  }

  if (updateData.host !== undefined && !validateProfileHost(updateData.host)) {
    errors.push('Invalid host format');
  }

  if (updateData.port !== undefined && !validateProfilePort(updateData.port)) {
    errors.push('Invalid port number');
  }

  if (updateData.username !== undefined && !validateProfileUsername(updateData.username)) {
    errors.push('Invalid username format');
  }

  if (updateData.authType !== undefined && !['password', 'key', 'both'].includes(updateData.authType)) {
    errors.push('Invalid authentication type');
  }

  if (updateData.metadata !== undefined && !validateProfileMetadata(updateData.metadata)) {
    errors.push('Invalid profile metadata');
  }

  return errors;
}
