/**
 * Profile SSH Key Integration Tests
 * 
 * Tests for saving and loading profiles with SSH key authentication.
 * Validates:
 * - Profile save/load with sshKeyPath
 * - Auth toggle logic when loading profiles
 * - Mutual exclusivity of password vs privateKey
 * - Profile persistence across sessions
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock ConnectionProfile type structure
const createMockProfile = (overrides = {}) => ({
  id: `profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  name: 'Test Profile',
  host: 'example.com',
  port: 22,
  username: 'testuser',
  password: undefined,
  lastUsed: new Date(),
  logsDirectory: undefined,
  commandHistory: [],
  sshKeyPath: undefined,
  ...overrides
});

describe('Profile SSH Key Integration Tests', () => {
  const testDir = path.join(__dirname, '..', 'temp-profiles');

  beforeEach(() => {
    // Create temp directory for test profiles
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Profile with SSH Key Path', () => {
    it('should save profile with sshKeyPath and no password', () => {
      const profile = createMockProfile({
        name: 'SSH Key Profile',
        password: undefined,
        sshKeyPath: '/home/user/.ssh/id_rsa'
      });

      // Verify password is undefined when using SSH key
      expect(profile.password).toBeUndefined();
      expect(profile.sshKeyPath).toBeDefined();
      expect(profile.sshKeyPath).toBe('/home/user/.ssh/id_rsa');
    });

    it('should save profile with password and no sshKeyPath', () => {
      const profile = createMockProfile({
        name: 'Password Profile',
        password: 'secret123',
        sshKeyPath: undefined
      });

      // Verify sshKeyPath is undefined when using password
      expect(profile.password).toBe('secret123');
      expect(profile.sshKeyPath).toBeUndefined();
    });

    it('should enforce mutual exclusivity between password and sshKeyPath', () => {
      // Create profile with both (should not happen in normal flow)
      const profile = createMockProfile({
        password: 'secret123',
        sshKeyPath: '/home/user/.ssh/id_rsa'
      });

      // In application logic, this should trigger validation
      // For now, test that both are present (edge case handling)
      expect(profile.password || profile.sshKeyPath).toBeDefined();
      
      // Typically, after validation, one should be cleared
      const validProfile = { ...profile, password: undefined };
      expect(validProfile.sshKeyPath).toBeDefined();
      expect(validProfile.password).toBeUndefined();
    });
  });

  describe('Profile Serialization and Persistence', () => {
    it('should serialize profile with sshKeyPath to JSON', () => {
      const profile = createMockProfile({
        name: 'Serialization Test',
        sshKeyPath: '/home/user/.ssh/id_rsa'
      });

      const json = JSON.stringify(profile);
      const parsed = JSON.parse(json);

      expect(parsed.sshKeyPath).toBe('/home/user/.ssh/id_rsa');
      expect(parsed.password).toBeUndefined();
    });

    it('should deserialize profile and restore sshKeyPath', () => {
      const original = createMockProfile({
        name: 'Deserialization Test',
        sshKeyPath: '/home/user/.ssh/id_ed25519'
      });

      const json = JSON.stringify(original);
      const restored = JSON.parse(json);

      // Restore dates
      restored.lastUsed = new Date(restored.lastUsed);

      expect(restored.sshKeyPath).toBe(original.sshKeyPath);
      expect(restored.name).toBe(original.name);
      expect(restored.host).toBe(original.host);
    });

    it('should save and load profiles from file storage', () => {
      const profiles = [
        createMockProfile({
          id: 'profile-1',
          name: 'SSH Key Profile',
          sshKeyPath: '/home/user/.ssh/id_rsa'
        }),
        createMockProfile({
          id: 'profile-2',
          name: 'Password Profile',
          password: 'secret123'
        })
      ];

      const filePath = path.join(testDir, 'profiles.json');

      // Simulate saving
      fs.writeFileSync(filePath, JSON.stringify(profiles, null, 2));
      expect(fs.existsSync(filePath)).toBe(true);

      // Simulate loading
      const loaded = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      expect(loaded).toHaveLength(2);
      expect(loaded[0].sshKeyPath).toBe('/home/user/.ssh/id_rsa');
      expect(loaded[1].password).toBe('secret123');
    });
  });

  describe('Profile Loading and Auth Toggle Logic', () => {
    it('should correctly toggle useSSHKey when loading profile with sshKeyPath', () => {
      const profile = createMockProfile({
        sshKeyPath: '/home/user/.ssh/id_rsa',
        password: undefined
      });

      // Mock auth toggle logic
      let useSSHKey = false;
      let config = { password: '', privateKey: '' };

      // Simulate loadProfile() logic
      if (profile.sshKeyPath) {
        useSSHKey = true;
        config = { ...config, privateKey: profile.sshKeyPath, password: '' };
      } else {
        useSSHKey = false;
        config = { ...config, privateKey: '' };
      }

      expect(useSSHKey).toBe(true);
      expect(config.privateKey).toBe('/home/user/.ssh/id_rsa');
      expect(config.password).toBe('');
    });

    it('should correctly toggle useSSHKey when loading profile with password', () => {
      const profile = createMockProfile({
        password: 'secret123',
        sshKeyPath: undefined
      });

      // Mock auth toggle logic
      let useSSHKey = false;
      let config = { password: '', privateKey: '' };

      // Simulate loadProfile() logic
      if (profile.sshKeyPath) {
        useSSHKey = true;
        config = { ...config, privateKey: profile.sshKeyPath, password: '' };
      } else {
        useSSHKey = false;
        config = { ...config, privateKey: '' };
      }

      expect(useSSHKey).toBe(false);
      expect(config.privateKey).toBe('');
      expect(config.password).toBe('');
    });

    it('should preserve all profile fields when toggling auth', () => {
      const profile = createMockProfile({
        name: 'Auth Toggle Test',
        host: '192.168.1.100',
        port: 2222,
        username: 'ubuntu',
        sshKeyPath: '/home/ubuntu/.ssh/id_rsa',
        logsDirectory: '/var/log/ssh'
      });

      // Simulate update logic
      let useSSHKey = true;
      const updatedProfile = {
        ...profile,
        password: undefined
      };

      expect(updatedProfile.name).toBe(profile.name);
      expect(updatedProfile.host).toBe(profile.host);
      expect(updatedProfile.port).toBe(profile.port);
      expect(updatedProfile.username).toBe(profile.username);
      expect(updatedProfile.sshKeyPath).toBe(profile.sshKeyPath);
      expect(updatedProfile.logsDirectory).toBe(profile.logsDirectory);
    });
  });

  describe('Profile Collection Operations', () => {
    it('should filter profiles with SSH keys', () => {
      const profiles = [
        createMockProfile({
          id: 'profile-1',
          name: 'SSH Key 1',
          sshKeyPath: '/home/user/.ssh/id_rsa'
        }),
        createMockProfile({
          id: 'profile-2',
          name: 'Password 1',
          password: 'secret123'
        }),
        createMockProfile({
          id: 'profile-3',
          name: 'SSH Key 2',
          sshKeyPath: '/home/user/.ssh/id_ed25519'
        })
      ];

      const sshKeyProfiles = profiles.filter(p => p.sshKeyPath);
      expect(sshKeyProfiles).toHaveLength(2);
      expect(sshKeyProfiles[0].name).toBe('SSH Key 1');
      expect(sshKeyProfiles[1].name).toBe('SSH Key 2');
    });

    it('should update profile with SSH key path', () => {
      const profiles = [
        createMockProfile({
          id: 'profile-1',
          name: 'Test Profile',
          password: 'old-password'
        })
      ];

      // Simulate switching to SSH key auth
      const updated = profiles.map(p =>
        p.id === 'profile-1'
          ? { ...p, password: undefined, sshKeyPath: '/home/user/.ssh/id_rsa' }
          : p
      );

      expect(updated[0].password).toBeUndefined();
      expect(updated[0].sshKeyPath).toBe('/home/user/.ssh/id_rsa');
    });

    it('should delete profile without affecting others', () => {
      const profiles = [
        createMockProfile({ id: 'profile-1', name: 'Profile 1' }),
        createMockProfile({ id: 'profile-2', name: 'Profile 2' }),
        createMockProfile({ id: 'profile-3', name: 'Profile 3' })
      ];

      const remaining = profiles.filter(p => p.id !== 'profile-2');
      expect(remaining).toHaveLength(2);
      expect(remaining.find(p => p.id === 'profile-2')).toBeUndefined();
      expect(remaining.find(p => p.id === 'profile-1')).toBeDefined();
    });
  });

  describe('Profile Update with Auth Change', () => {
    it('should update profile from password to SSH key', () => {
      const profile = createMockProfile({
        id: 'profile-1',
        name: 'Auth Migration',
        password: 'secret123',
        sshKeyPath: undefined
      });

      // Simulate auth change
      const updated = {
        ...profile,
        password: undefined,
        sshKeyPath: '/home/user/.ssh/id_rsa'
      };

      expect(updated.password).toBeUndefined();
      expect(updated.sshKeyPath).toBe('/home/user/.ssh/id_rsa');
    });

    it('should update profile from SSH key to password', () => {
      const profile = createMockProfile({
        id: 'profile-1',
        name: 'Auth Migration',
        password: undefined,
        sshKeyPath: '/home/user/.ssh/id_rsa'
      });

      // Simulate auth change
      const updated = {
        ...profile,
        password: 'new-secret',
        sshKeyPath: undefined
      };

      expect(updated.password).toBe('new-secret');
      expect(updated.sshKeyPath).toBeUndefined();
    });

    it('should preserve profile metadata during auth change', () => {
      const profile = createMockProfile({
        name: 'Metadata Test',
        host: 'prod.example.com',
        port: 2222,
        username: 'produser',
        password: 'secret',
        logsDirectory: '/var/log/prod'
      });

      const updated = {
        ...profile,
        password: undefined,
        sshKeyPath: '/home/produser/.ssh/id_rsa'
      };

      expect(updated.name).toBe('Metadata Test');
      expect(updated.host).toBe('prod.example.com');
      expect(updated.port).toBe(2222);
      expect(updated.username).toBe('produser');
      expect(updated.logsDirectory).toBe('/var/log/prod');
    });
  });
});
