/**
 * File, Bookmark, and Profile Validators Test Suite
 * Comprehensive tests for file operations, bookmarks, and profile management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateLocalFilePath,
  validateLocalFileExists,
  validateRemoteFilePath,
  validateFileTransferConfig,
  validateFileName,
  validateDirectoryPath,
  validateFileSize,
  validateFilePermissions,
  validateFileMetadata,
  validateBookmark,
  validateBookmarkId,
  validateBookmarkName,
  validateBookmarkCollection,
  validateProfile,
  validateProfileId,
  validateProfileName,
  validateProfileHost,
  validateProfilePort,
  validateProfileUsername,
  validateProfileMetadata,
  validateMetadataKey,
  validateMetadataValue,
  validateProfileCollection,
  validateProfileUpdate,
} from '../../electron/validators/file.js';

// ==================== FILE OPERATION TESTS ====================

describe('File Operation Validators', () => {

  describe('validateLocalFilePath', () => {
    it('should validate valid local file paths', () => {
      expect(validateLocalFilePath('file.txt')).toBe(true);
      expect(validateLocalFilePath('/home/user/file.txt')).toBe(true);
      expect(validateLocalFilePath('C:\\Users\\user\\file.txt')).toBe(true);
      expect(validateLocalFilePath('./relative/path/file.txt')).toBe(true);
    });

    it('should reject empty or whitespace-only paths', () => {
      expect(validateLocalFilePath('')).toBe(false);
      expect(validateLocalFilePath('   ')).toBe(false);
      expect(validateLocalFilePath(null)).toBe(false);
      expect(validateLocalFilePath(undefined)).toBe(false);
    });

    it('should reject paths with directory traversal attempts', () => {
      expect(validateLocalFilePath('../../../etc/passwd')).toBe(false);
      expect(validateLocalFilePath('file/../../../etc/passwd')).toBe(false);
      expect(validateLocalFilePath('path/../../file.txt')).toBe(false);
    });

    it('should reject paths with invalid characters', () => {
      expect(validateLocalFilePath('file<test>.txt')).toBe(false);
      expect(validateLocalFilePath('file"test".txt')).toBe(false);
      expect(validateLocalFilePath('file|pipe.txt')).toBe(false);
      expect(validateLocalFilePath('file\x00null.txt')).toBe(false);
    });

    it('should reject non-string values', () => {
      expect(validateLocalFilePath(123)).toBe(false);
      expect(validateLocalFilePath({})).toBe(false);
      expect(validateLocalFilePath([])).toBe(false);
    });
  });

  describe('validateRemoteFilePath', () => {
    it('should validate valid remote file paths', () => {
      expect(validateRemoteFilePath('/home/user/file.txt')).toBe(true);
      expect(validateRemoteFilePath('/var/log/app.log')).toBe(true);
      expect(validateRemoteFilePath('~/documents/file.txt')).toBe(true);
      expect(validateRemoteFilePath('/tmp/test')).toBe(true);
    });

    it('should reject paths with directory traversal', () => {
      expect(validateRemoteFilePath('../etc/passwd')).toBe(false);
      expect(validateRemoteFilePath('file/../../etc/passwd')).toBe(false);
      expect(validateRemoteFilePath('/home/user/../../etc/passwd')).toBe(false);
    });

    it('should reject paths with shell metacharacters', () => {
      expect(validateRemoteFilePath('/path/file;ls')).toBe(false);
      expect(validateRemoteFilePath('/path/file&whoami')).toBe(false);
      expect(validateRemoteFilePath('/path/file|cat')).toBe(false);
      expect(validateRemoteFilePath('/path/file`whoami`')).toBe(false);
      expect(validateRemoteFilePath('/path/file$(whoami)')).toBe(false);
    });

    it('should reject paths with control characters', () => {
      expect(validateRemoteFilePath('/path/file\x00')).toBe(false);
      expect(validateRemoteFilePath('/path/\x01file')).toBe(false);
    });

    it('should respect max length option', () => {
      const longPath = '/home/' + 'a'.repeat(5000);
      expect(validateRemoteFilePath(longPath, { maxLength: 100 })).toBe(false);
      expect(validateRemoteFilePath(longPath, { maxLength: 10000 })).toBe(true);
    });

    it('should handle edge cases', () => {
      expect(validateRemoteFilePath('')).toBe(false);
      expect(validateRemoteFilePath('   ')).toBe(false);
      expect(validateRemoteFilePath(null)).toBe(false);
    });
  });

  describe('validateFileTransferConfig', () => {
    it('should validate valid file transfer config', () => {
      const config = {
        localPath: '/local/file.txt',
        remotePath: '/remote/file.txt',
        direction: 'upload',
      };
      expect(validateFileTransferConfig(config)).toEqual([]);
    });

    it('should validate with optional maxSize', () => {
      const config = {
        localPath: '/local/file.txt',
        remotePath: '/remote/file.txt',
        direction: 'download',
        maxSize: 1024 * 1024 * 100, // 100MB
      };
      expect(validateFileTransferConfig(config)).toEqual([]);
    });

    it('should reject missing localPath', () => {
      const config = {
        remotePath: '/remote/file.txt',
        direction: 'upload',
      };
      const errors = validateFileTransferConfig(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('localPath');
    });

    it('should reject missing remotePath', () => {
      const config = {
        localPath: '/local/file.txt',
        direction: 'upload',
      };
      const errors = validateFileTransferConfig(config);
      expect(errors.some(e => e.includes('remotePath'))).toBe(true);
    });

    it('should reject invalid direction', () => {
      const config = {
        localPath: '/local/file.txt',
        remotePath: '/remote/file.txt',
        direction: 'invalid',
      };
      const errors = validateFileTransferConfig(config);
      expect(errors.some(e => e.includes('direction'))).toBe(true);
    });

    it('should reject invalid maxSize', () => {
      const config = {
        localPath: '/local/file.txt',
        remotePath: '/remote/file.txt',
        direction: 'upload',
        maxSize: -1,
      };
      const errors = validateFileTransferConfig(config);
      expect(errors.some(e => e.includes('maxSize'))).toBe(true);
    });
  });

  describe('validateFileName', () => {
    it('should validate valid file names', () => {
      expect(validateFileName('document.txt')).toBe(true);
      expect(validateFileName('my_file.pdf')).toBe(true);
      expect(validateFileName('file-v1.2.3.zip')).toBe(true);
      expect(validateFileName('README')).toBe(true);
    });

    it('should reject invalid characters', () => {
      expect(validateFileName('file<name>.txt')).toBe(false);
      expect(validateFileName('file"name".txt')).toBe(false);
      expect(validateFileName('file:name.txt')).toBe(false);
      expect(validateFileName('file|name.txt')).toBe(false);
      expect(validateFileName('file?name.txt')).toBe(false);
      expect(validateFileName('file*name.txt')).toBe(false);
    });

    it('should reject reserved Windows names', () => {
      expect(validateFileName('CON')).toBe(false);
      expect(validateFileName('PRN')).toBe(false);
      expect(validateFileName('AUX')).toBe(false);
      expect(validateFileName('NUL')).toBe(false);
      expect(validateFileName('COM1')).toBe(false);
      expect(validateFileName('LPT1')).toBe(false);
    });

    it('should reject hidden files (starting with dot)', () => {
      expect(validateFileName('.hidden')).toBe(false);
      expect(validateFileName('.bashrc')).toBe(false);
    });

    it('should respect max length', () => {
      const longName = 'a'.repeat(300);
      expect(validateFileName(longName, { maxLength: 255 })).toBe(false);
      expect(validateFileName(longName, { maxLength: 500 })).toBe(true);
    });

    it('should reject empty or whitespace', () => {
      expect(validateFileName('')).toBe(false);
      expect(validateFileName('   ')).toBe(false);
    });
  });

  describe('validateDirectoryPath', () => {
    it('should validate valid directory paths', () => {
      expect(validateDirectoryPath('/home/user')).toBe(true);
      expect(validateDirectoryPath('/var/log')).toBe(true);
      expect(validateDirectoryPath('relative/path')).toBe(true);
      expect(validateDirectoryPath('/root')).toBe(true);
    });

    it('should reject directory traversal attempts', () => {
      expect(validateDirectoryPath('../../../etc')).toBe(false);
      expect(validateDirectoryPath('/home/../../etc')).toBe(false);
    });

    it('should reject paths with invalid characters', () => {
      expect(validateDirectoryPath('/path<dir>')).toBe(false);
      expect(validateDirectoryPath('/path"dir"')).toBe(false);
      expect(validateDirectoryPath('/path|dir')).toBe(false);
    });

    it('should reject shell metacharacters', () => {
      expect(validateDirectoryPath('/path;ls')).toBe(false);
      expect(validateDirectoryPath('/path&whoami')).toBe(false);
      expect(validateDirectoryPath('/path`id`')).toBe(false);
    });
  });

  describe('validateFileSize', () => {
    it('should validate valid file sizes', () => {
      expect(validateFileSize(0)).toBe(true);
      expect(validateFileSize(1024)).toBe(true);
      expect(validateFileSize(1024 * 1024)).toBe(true); // 1MB
      expect(validateFileSize(1024 * 1024 * 1024)).toBe(true); // 1GB
    });

    it('should reject negative sizes', () => {
      expect(validateFileSize(-1)).toBe(false);
      expect(validateFileSize(-1024)).toBe(false);
    });

    it('should reject non-integer sizes', () => {
      expect(validateFileSize(1.5)).toBe(false);
      expect(validateFileSize('1024')).toBe(false);
    });

    it('should respect maxSize option', () => {
      const size = 1024 * 1024 * 100; // 100MB
      expect(validateFileSize(size, { maxSize: 1024 * 1024 * 50 })).toBe(false);
      expect(validateFileSize(size, { maxSize: 1024 * 1024 * 200 })).toBe(true);
    });

    it('should respect minSize option', () => {
      expect(validateFileSize(0, { minSize: 1 })).toBe(false);
      expect(validateFileSize(1, { minSize: 1 })).toBe(true);
    });
  });

  describe('validateFilePermissions', () => {
    it('should validate valid permissions in octal format', () => {
      expect(validateFilePermissions('644')).toBe(true);
      expect(validateFilePermissions('755')).toBe(true);
      expect(validateFilePermissions('777')).toBe(true);
      expect(validateFilePermissions('600')).toBe(true);
    });

    it('should validate numeric octal permissions', () => {
      expect(validateFilePermissions(0o644)).toBe(true);
      expect(validateFilePermissions(0o755)).toBe(true);
      expect(validateFilePermissions(0o777)).toBe(true);
    });

    it('should reject invalid octal values', () => {
      expect(validateFilePermissions('999')).toBe(false);
      expect(validateFilePermissions('888')).toBe(false);
    });

    it('should reject invalid formats', () => {
      expect(validateFilePermissions('abc')).toBe(false);
      expect(validateFilePermissions('64')).toBe(false); // Too short
      expect(validateFilePermissions('6444')).toBe(true); // 4-digit is valid
    });
  });

  describe('validateFileMetadata', () => {
    it('should validate valid file metadata', () => {
      const metadata = {
        name: 'file.txt',
        size: 1024,
        type: 'file',
        modifiedTime: Date.now(),
      };
      expect(validateFileMetadata(metadata)).toEqual([]);
    });

    it('should validate with minimal metadata', () => {
      const metadata = {
        name: 'document.pdf',
      };
      expect(validateFileMetadata(metadata)).toEqual([]);
    });

    it('should reject missing file name', () => {
      const metadata = {
        size: 1024,
        type: 'file',
      };
      const errors = validateFileMetadata(metadata);
      expect(errors.some(e => e.includes('name'))).toBe(true);
    });

    it('should reject invalid file type', () => {
      const metadata = {
        name: 'file.txt',
        type: 'invalid-type',
      };
      const errors = validateFileMetadata(metadata);
      expect(errors.some(e => e.includes('type'))).toBe(true);
    });

    it('should reject invalid modification time', () => {
      const metadata = {
        name: 'file.txt',
        modifiedTime: -1,
      };
      const errors = validateFileMetadata(metadata);
      expect(errors.some(e => e.includes('modification'))).toBe(true);
    });
  });
});

// ==================== BOOKMARK TESTS ====================

describe('Bookmark Validators', () => {

  describe('validateBookmark', () => {
    it('should validate valid server bookmark', () => {
      const bookmark = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Production Server',
        type: 'server',
        path: '/srv',
        createdAt: Date.now(),
      };
      expect(validateBookmark(bookmark)).toEqual([]);
    });

    it('should validate valid directory bookmark', () => {
      const bookmark = {
        id: 'bookmark_001',
        name: 'Project Files',
        type: 'directory',
        path: '/home/user/projects',
        createdAt: Date.now(),
      };
      expect(validateBookmark(bookmark)).toEqual([]);
    });

    it('should reject missing ID', () => {
      const bookmark = {
        name: 'Test',
        type: 'server',
        path: '/srv',
      };
      const errors = validateBookmark(bookmark);
      expect(errors.some(e => e.includes('ID'))).toBe(true);
    });

    it('should reject missing name', () => {
      const bookmark = {
        id: 'bookmark_001',
        type: 'server',
        path: '/srv',
      };
      const errors = validateBookmark(bookmark);
      expect(errors.some(e => e.includes('name'))).toBe(true);
    });

    it('should reject invalid type', () => {
      const bookmark = {
        id: 'bookmark_001',
        name: 'Test',
        type: 'invalid',
        path: '/srv',
      };
      const errors = validateBookmark(bookmark);
      expect(errors.some(e => e.includes('type'))).toBe(true);
    });

    it('should reject missing path', () => {
      const bookmark = {
        id: 'bookmark_001',
        name: 'Test',
        type: 'directory',
      };
      const errors = validateBookmark(bookmark);
      expect(errors.some(e => e.includes('path'))).toBe(true);
    });
  });

  describe('validateBookmarkId', () => {
    it('should validate UUID format', () => {
      expect(validateBookmarkId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(validateBookmarkId('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
    });

    it('should validate hash-like IDs', () => {
      expect(validateBookmarkId('a1b2c3d4e5f6g7h8')).toBe(true);
      expect(validateBookmarkId('abcdef0123456789')).toBe(true);
      expect(validateBookmarkId('abcd')).toBe(true); // 4 chars minimum
    });

    it('should validate slug-like IDs', () => {
      expect(validateBookmarkId('bookmark_001')).toBe(true);
      expect(validateBookmarkId('my-bookmark')).toBe(true);
      expect(validateBookmarkId('b1')).toBe(true); // 2 chars minimum
    });

    it('should reject invalid formats', () => {
      expect(validateBookmarkId('')).toBe(false);
      expect(validateBookmarkId('x')).toBe(false); // too short
      expect(validateBookmarkId('invalid@id')).toBe(false); // invalid char
    });
  });

  describe('validateBookmarkName', () => {
    it('should validate valid bookmark names', () => {
      expect(validateBookmarkName('Production Server')).toBe(true);
      expect(validateBookmarkName('backup-folder')).toBe(true);
      expect(validateBookmarkName('Project_Files')).toBe(true);
      expect(validateBookmarkName('Server (Main)')).toBe(true);
    });

    it('should reject names exceeding max length', () => {
      const longName = 'a'.repeat(150);
      expect(validateBookmarkName(longName, { maxLength: 100 })).toBe(false);
    });

    it('should reject invalid characters', () => {
      expect(validateBookmarkName('name<script>')).toBe(false);
      expect(validateBookmarkName('name"quoted"')).toBe(false);
    });

    it('should reject empty names', () => {
      expect(validateBookmarkName('')).toBe(false);
      expect(validateBookmarkName('   ')).toBe(false);
    });
  });

  describe('validateBookmarkCollection', () => {
    it('should validate valid bookmark collection', () => {
      const bookmarks = [
        { id: 'b1', name: 'Bookmark 1', type: 'server', path: '/srv' },
        { id: 'b2', name: 'Bookmark 2', type: 'directory', path: '/home' },
      ];
      const errors = validateBookmarkCollection(bookmarks);
      expect(errors.length).toBe(0);
    });

    it('should reject duplicate IDs', () => {
      const bookmarks = [
        { id: 'duplicate', name: 'First', type: 'server', path: '/srv' },
        { id: 'duplicate', name: 'Second', type: 'directory', path: '/home' },
      ];
      const errors = validateBookmarkCollection(bookmarks);
      expect(errors.some(e => e.includes('Duplicate'))).toBe(true);
    });

    it('should reject non-array input', () => {
      const errors = validateBookmarkCollection({ id: 'b1' });
      expect(errors.some(e => e.includes('array'))).toBe(true);
    });

    it('should respect maxBookmarks limit', () => {
      const bookmarks = Array.from({ length: 100 }, (_, i) => ({
        id: `b${i}`,
        name: `Bookmark ${i}`,
        type: 'server',
        path: '/srv',
      }));
      const errors = validateBookmarkCollection(bookmarks, { maxBookmarks: 50 });
      expect(errors.some(e => e.includes('exceeds maximum'))).toBe(true);
    });
  });
});

// ==================== PROFILE TESTS ====================

describe('Profile Validators', () => {

  describe('validateProfile', () => {
    it('should validate valid profile', () => {
      const profile = {
        id: 'profile_001',
        name: 'My Server',
        host: '192.168.1.100',
        port: 22,
        username: 'ubuntu',
        authType: 'key',
      };
      expect(validateProfile(profile)).toEqual([]);
    });

    it('should validate with metadata', () => {
      const profile = {
        id: 'profile_001',
        name: 'Production',
        host: 'prod.example.com',
        port: 22,
        username: 'admin',
        authType: 'password',
        metadata: {
          environment: 'production',
          team: 'infrastructure',
        },
      };
      expect(validateProfile(profile)).toEqual([]);
    });

    it('should reject missing required fields', () => {
      const profile = {
        id: 'profile_001',
        name: 'Incomplete',
      };
      const errors = validateProfile(profile);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid host', () => {
      const profile = {
        id: 'profile_001',
        name: 'Test',
        host: 'invalid..host',
        port: 22,
        username: 'user',
      };
      const errors = validateProfile(profile);
      expect(errors.some(e => e.includes('host'))).toBe(true);
    });

    it('should reject invalid port', () => {
      const profile = {
        id: 'profile_001',
        name: 'Test',
        host: '192.168.1.1',
        port: 99999,
        username: 'user',
      };
      const errors = validateProfile(profile);
      expect(errors.some(e => e.includes('port'))).toBe(true);
    });

    it('should reject invalid authType', () => {
      const profile = {
        id: 'profile_001',
        name: 'Test',
        host: '192.168.1.1',
        port: 22,
        username: 'user',
        authType: 'biometric',
      };
      const errors = validateProfile(profile);
      expect(errors.some(e => e.includes('authentication'))).toBe(true);
    });
  });

  describe('validateProfileId', () => {
    it('should validate UUID format', () => {
      expect(validateProfileId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should validate slug-like IDs', () => {
      expect(validateProfileId('profile_001')).toBe(true);
      expect(validateProfileId('my-profile-id')).toBe(true);
      expect(validateProfileId('p1')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(validateProfileId('')).toBe(false);
      expect(validateProfileId('x')).toBe(false); // too short
      expect(validateProfileId('invalid@id')).toBe(false); // invalid char
    });
  });

  describe('validateProfileName', () => {
    it('should validate valid profile names', () => {
      expect(validateProfileName('Production Server')).toBe(true);
      expect(validateProfileName('backup-server')).toBe(true);
      expect(validateProfileName('Dev_Server')).toBe(true);
    });

    it('should reject too long names', () => {
      const longName = 'a'.repeat(150);
      expect(validateProfileName(longName, { maxLength: 100 })).toBe(false);
    });
  });

  describe('validateProfileHost', () => {
    it('should validate IPv4 addresses', () => {
      expect(validateProfileHost('192.168.1.1')).toBe(true);
      expect(validateProfileHost('10.0.0.1')).toBe(true);
      expect(validateProfileHost('127.0.0.1')).toBe(true);
    });

    it('should validate hostnames', () => {
      expect(validateProfileHost('example.com')).toBe(true);
      expect(validateProfileHost('server.example.com')).toBe(true);
      expect(validateProfileHost('localhost')).toBe(true);
    });

    it('should validate IPv6 addresses', () => {
      expect(validateProfileHost('::1')).toBe(true);
      expect(validateProfileHost('2001:db8::1')).toBe(true);
    });

    it('should reject invalid IPs', () => {
      expect(validateProfileHost('256.1.1.1')).toBe(false);
      expect(validateProfileHost('192.168.1')).toBe(false);
    });

    it('should reject invalid hostnames', () => {
      expect(validateProfileHost('-invalid')).toBe(false);
      expect(validateProfileHost('invalid-.com')).toBe(false);
    });
  });

  describe('validateProfilePort', () => {
    it('should validate valid ports', () => {
      expect(validateProfilePort(22)).toBe(true);
      expect(validateProfilePort(2222)).toBe(true);
      expect(validateProfilePort(65535)).toBe(true);
    });

    it('should reject invalid ports', () => {
      expect(validateProfilePort(0)).toBe(false);
      expect(validateProfilePort(65536)).toBe(false);
      expect(validateProfilePort(-1)).toBe(false);
    });

    it('should reject non-integer ports', () => {
      expect(validateProfilePort(22.5)).toBe(false);
      expect(validateProfilePort('22')).toBe(false);
    });
  });

  describe('validateProfileUsername', () => {
    it('should validate valid usernames', () => {
      expect(validateProfileUsername('ubuntu')).toBe(true);
      expect(validateProfileUsername('user_name')).toBe(true);
      expect(validateProfileUsername('user-name')).toBe(true);
      expect(validateProfileUsername('user.name')).toBe(true);
    });

    it('should reject invalid characters', () => {
      expect(validateProfileUsername('user@domain')).toBe(false);
      expect(validateProfileUsername('user name')).toBe(false);
      expect(validateProfileUsername('user#name')).toBe(false);
    });

    it('should respect length constraints', () => {
      const longName = 'a'.repeat(50);
      expect(validateProfileUsername(longName, { maxLength: 32 })).toBe(false);
    });
  });

  describe('validateMetadataKey', () => {
    it('should validate valid keys', () => {
      expect(validateMetadataKey('environment')).toBe(true);
      expect(validateMetadataKey('team_name')).toBe(true);
      expect(validateMetadataKey('app_version')).toBe(true);
    });

    it('should reject invalid keys', () => {
      expect(validateMetadataKey('key-with-dash')).toBe(false);
      expect(validateMetadataKey('key.with.dot')).toBe(false);
      expect(validateMetadataKey('key@symbol')).toBe(false);
    });

    it('should reject empty keys', () => {
      expect(validateMetadataKey('')).toBe(false);
    });
  });

  describe('validateMetadataValue', () => {
    it('should validate simple types', () => {
      expect(validateMetadataValue('string')).toBe(true);
      expect(validateMetadataValue(123)).toBe(true);
      expect(validateMetadataValue(true)).toBe(true);
      expect(validateMetadataValue(null)).toBe(true);
    });

    it('should reject objects and arrays', () => {
      expect(validateMetadataValue({ nested: 'object' })).toBe(false);
      expect(validateMetadataValue([1, 2, 3])).toBe(false);
    });

    it('should reject long strings', () => {
      const longString = 'a'.repeat(1100);
      expect(validateMetadataValue(longString)).toBe(false);
    });
  });

  describe('validateProfileMetadata', () => {
    it('should validate valid metadata', () => {
      const metadata = {
        environment: 'production',
        team: 'infrastructure',
        monitored: true,
      };
      expect(validateProfileMetadata(metadata)).toBe(true);
    });

    it('should reject non-objects', () => {
      expect(validateProfileMetadata('string')).toBe(false);
      expect(validateProfileMetadata([1, 2, 3])).toBe(false);
      expect(validateProfileMetadata(null)).toBe(false);
    });

    it('should reject with invalid keys', () => {
      const metadata = {
        'invalid-key': 'value',
      };
      expect(validateProfileMetadata(metadata)).toBe(false);
    });

    it('should limit number of metadata fields', () => {
      const metadata = {};
      for (let i = 0; i < 100; i++) {
        metadata[`field${i}`] = `value${i}`;
      }
      expect(validateProfileMetadata(metadata)).toBe(false);
    });
  });

  describe('validateProfileCollection', () => {
    it('should validate valid profile collection', () => {
      const profiles = [
        { id: 'p1', name: 'Server 1', host: '192.168.1.1', port: 22, username: 'user' },
        { id: 'p2', name: 'Server 2', host: '192.168.1.2', port: 22, username: 'admin' },
      ];
      const errors = validateProfileCollection(profiles);
      expect(errors.length).toBe(0);
    });

    it('should reject duplicate IDs', () => {
      const profiles = [
        { id: 'same', name: 'First', host: '192.168.1.1', port: 22, username: 'user' },
        { id: 'same', name: 'Second', host: '192.168.1.2', port: 22, username: 'admin' },
      ];
      const errors = validateProfileCollection(profiles);
      expect(errors.some(e => e.includes('Duplicate'))).toBe(true);
    });

    it('should reject duplicate names', () => {
      const profiles = [
        { id: 'p1', name: 'duplicate', host: '192.168.1.1', port: 22, username: 'user' },
        { id: 'p2', name: 'duplicate', host: '192.168.1.2', port: 22, username: 'admin' },
      ];
      const errors = validateProfileCollection(profiles);
      expect(errors.some(e => e.includes('Duplicate'))).toBe(true);
    });

    it('should respect maxProfiles limit', () => {
      const profiles = Array.from({ length: 100 }, (_, i) => ({
        id: `p${i}`,
        name: `Profile ${i}`,
        host: `192.168.1.${i + 1}`,
        port: 22,
        username: 'user',
      }));
      const errors = validateProfileCollection(profiles, { maxProfiles: 50 });
      expect(errors.some(e => e.includes('exceeds maximum'))).toBe(true);
    });
  });

  describe('validateProfileUpdate', () => {
    it('should validate partial updates', () => {
      const update = {
        name: 'Updated Name',
        port: 2222,
      };
      expect(validateProfileUpdate(update)).toEqual([]);
    });

    it('should reject invalid updates', () => {
      const update = {
        port: 99999,
      };
      const errors = validateProfileUpdate(update);
      expect(errors.some(e => e.includes('port'))).toBe(true);
    });

    it('should allow empty updates', () => {
      expect(validateProfileUpdate({})).toEqual([]);
    });
  });
});
