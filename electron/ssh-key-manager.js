import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

/**
 * SSH Key Management Utility
 * Handles generation, import, export, and encryption of SSH keys
 */
class SSHKeyManager {
  constructor() {
    this.keysDirectory = this.getKeysDirectory();
    this.ensureKeysDirectory();
  }

  /**
   * Get keys storage directory
   */
  getKeysDirectory() {
    const keysPath = path.join(app.getPath('userData'), 'ssh-keys');
    return keysPath;
  }

  /**
   * Ensure keys directory exists
   */
  ensureKeysDirectory() {
    if (!fs.existsSync(this.keysDirectory)) {
      fs.mkdirSync(this.keysDirectory, { recursive: true, mode: 0o700 });
    }
  }

  /**
   * Generate SSH key pair (RSA, ED25519, or ECDSA)
   * @param {Object} options - Generation options
   * @param {string} options.type - Key type: 'rsa' | 'ed25519' | 'ecdsa'
   * @param {number} options.bits - Key bits (for RSA: 2048, 4096; ignored for ED25519/ECDSA)
   * @param {string} options.comment - Key comment (usually email)
   * @param {string} options.passphrase - Optional passphrase for key encryption
   * @returns {Promise<Object>} Public and private key pair
   */
  async generateKeyPair(options = {}) {
    const {
      type = 'rsa',
      bits = 4096,
      comment = '',
      passphrase = ''
    } = options;

    return new Promise((resolve, reject) => {
      try {
        // Validate options
        if (!['rsa', 'ed25519', 'ecdsa'].includes(type)) {
          throw new Error('Invalid key type. Must be rsa, ed25519, or ecdsa');
        }

        if (type === 'rsa' && ![2048, 4096].includes(bits)) {
          throw new Error('RSA key bits must be 2048 or 4096');
        }

        // Generate key pair based on type
        if (type === 'rsa') {
          crypto.generateKeyPair('rsa', {
            modulusLength: bits,
            publicKeyEncoding: {
              type: 'spki',
              format: 'pem'
            },
            privateKeyEncoding: {
              type: 'pkcs8',
              format: 'pem',
              cipher: passphrase ? 'aes-256-cbc' : undefined,
              passphrase: passphrase || undefined
            }
          }, (err, publicKey, privateKey) => {
            if (err) reject(err);
            else {
              resolve({
                type: 'rsa',
                bits,
                publicKey: this.formatPublicKey(publicKey, type, comment),
                privateKey,
                fingerprint: this.calculateFingerprint(publicKey),
                comment
              });
            }
          });
        } else if (type === 'ed25519') {
          crypto.generateKeyPair('ed25519', {
            publicKeyEncoding: {
              type: 'spki',
              format: 'pem'
            },
            privateKeyEncoding: {
              type: 'pkcs8',
              format: 'pem',
              cipher: passphrase ? 'aes-256-cbc' : undefined,
              passphrase: passphrase || undefined
            }
          }, (err, publicKey, privateKey) => {
            if (err) reject(err);
            else {
              resolve({
                type: 'ed25519',
                bits: 256,
                publicKey: this.formatPublicKey(publicKey, type, comment),
                privateKey,
                fingerprint: this.calculateFingerprint(publicKey),
                comment
              });
            }
          });
        } else if (type === 'ecdsa') {
          crypto.generateKeyPair('ec', {
            namedCurve: 'prime256v1',
            publicKeyEncoding: {
              type: 'spki',
              format: 'pem'
            },
            privateKeyEncoding: {
              type: 'pkcs8',
              format: 'pem',
              cipher: passphrase ? 'aes-256-cbc' : undefined,
              passphrase: passphrase || undefined
            }
          }, (err, publicKey, privateKey) => {
            if (err) reject(err);
            else {
              resolve({
                type: 'ecdsa',
                bits: 256,
                publicKey: this.formatPublicKey(publicKey, type, comment),
                privateKey,
                fingerprint: this.calculateFingerprint(publicKey),
                comment
              });
            }
          });
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Format public key to OpenSSH format
   */
  formatPublicKey(publicKey, type, comment) {
    try {
      const keyData = publicKey.toString('utf-8');
      
      // For OpenSSH format, we need to convert from PEM
      // For now, return as PEM; can be converted to OpenSSH format if needed
      const commentSuffix = comment ? ` ${comment}` : '';
      
      if (type === 'rsa') {
        return `${keyData}${commentSuffix}`;
      } else if (type === 'ed25519') {
        return `${keyData}${commentSuffix}`;
      } else if (type === 'ecdsa') {
        return `${keyData}${commentSuffix}`;
      }
      
      return keyData;
    } catch (error) {
      return publicKey.toString('utf-8');
    }
  }

  /**
   * Calculate key fingerprint (SHA256)
   */
  calculateFingerprint(publicKey) {
    try {
      const hash = crypto.createHash('sha256');
      hash.update(publicKey);
      const digest = hash.digest('base64');
      // Format as SHA256:xxxxx... format
      return `SHA256:${digest}`;
    } catch (error) {
      return 'Unable to calculate fingerprint';
    }
  }

  /**
   * Validate SSH key format
   */
  validateKeyFormat(keyContent, keyType = 'private') {
    try {
      if (!keyContent || typeof keyContent !== 'string') {
        return { valid: false, error: 'Key must be a string' };
      }

      if (keyType === 'private') {
        // Check for private key markers
        if (!keyContent.includes('-----BEGIN') || !keyContent.includes('-----END')) {
          return { valid: false, error: 'Invalid private key format' };
        }

        const validMarkers = [
          'BEGIN RSA PRIVATE KEY',
          'BEGIN OPENSSH PRIVATE KEY',
          'BEGIN EC PRIVATE KEY',
          'BEGIN PRIVATE KEY',
          'BEGIN ENCRYPTED PRIVATE KEY'
        ];

        const isValid = validMarkers.some(marker => keyContent.includes(marker));
        if (!isValid) {
          return { valid: false, error: 'Unrecognized private key format' };
        }
      } else {
        // Check for public key markers
        const hasValidMarker = keyContent.includes('ssh-rsa') ||
                              keyContent.includes('ssh-ed25519') ||
                              keyContent.includes('ecdsa-sha2') ||
                              keyContent.includes('-----BEGIN');
        
        if (!hasValidMarker) {
          return { valid: false, error: 'Invalid public key format' };
        }
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Import SSH key pair from files
   */
  async importKeyPair(options = {}) {
    const {
      name,
      privateKeyPath,
      publicKeyPath,
      passphrase = ''
    } = options;

    try {
      if (!name || !privateKeyPath) {
        throw new Error('Key name and private key path are required');
      }

      // Read private key
      const privateKeyContent = fs.readFileSync(privateKeyPath, 'utf-8');
      const privateKeyValidation = this.validateKeyFormat(privateKeyContent, 'private');
      
      if (!privateKeyValidation.valid) {
        throw new Error(`Invalid private key: ${privateKeyValidation.error}`);
      }

      // Read public key if provided
      let publicKeyContent = '';
      if (publicKeyPath && fs.existsSync(publicKeyPath)) {
        publicKeyContent = fs.readFileSync(publicKeyPath, 'utf-8');
        const publicKeyValidation = this.validateKeyFormat(publicKeyContent, 'public');
        
        if (!publicKeyValidation.valid) {
          throw new Error(`Invalid public key: ${publicKeyValidation.error}`);
        }
      }

      // Try to determine key type
      let keyType = 'unknown';
      if (privateKeyContent.includes('RSA')) keyType = 'rsa';
      else if (privateKeyContent.includes('ED25519')) keyType = 'ed25519';
      else if (privateKeyContent.includes('EC PRIVATE KEY')) keyType = 'ecdsa';

      // Calculate fingerprint if we have public key
      let fingerprint = '';
      if (publicKeyContent) {
        fingerprint = this.calculateFingerprint(Buffer.from(publicKeyContent));
      }

      return {
        name,
        type: keyType,
        privateKey: privateKeyContent,
        publicKey: publicKeyContent,
        fingerprint,
        imported: true,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to import key pair: ${error.message}`);
    }
  }

  /**
   * Save key pair to storage
   */
  async saveKeyPair(keyData) {
    try {
      const {
        name,
        privateKey,
        publicKey
      } = keyData;

      if (!name) {
        throw new Error('Key name is required');
      }

      // Create key directory
      const keyDir = path.join(this.keysDirectory, name);
      if (!fs.existsSync(keyDir)) {
        fs.mkdirSync(keyDir, { recursive: true, mode: 0o700 });
      }

      // Save private key (with restrictive permissions)
      const privateKeyPath = path.join(keyDir, 'id_rsa');
      fs.writeFileSync(privateKeyPath, privateKey, { mode: 0o600 });

      // Save public key if provided
      let publicKeyPath = '';
      if (publicKey) {
        publicKeyPath = path.join(keyDir, 'id_rsa.pub');
        fs.writeFileSync(publicKeyPath, publicKey, { mode: 0o644 });
      }

      // Save metadata
      const metadata = {
        name,
        type: keyData.type || 'unknown',
        bits: keyData.bits || 0,
        fingerprint: keyData.fingerprint || '',
        comment: keyData.comment || '',
        createdAt: keyData.createdAt || new Date().toISOString(),
        privateKeyPath,
        publicKeyPath
      };

      const metadataPath = path.join(keyDir, 'metadata.json');
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), { mode: 0o600 });

      return metadata;
    } catch (error) {
      throw new Error(`Failed to save key pair: ${error.message}`);
    }
  }

  /**
   * List all stored SSH keys
   */
  listKeyPairs() {
    try {
      const keys = [];
      const entries = fs.readdirSync(this.keysDirectory);

      for (const entry of entries) {
        const keyDir = path.join(this.keysDirectory, entry);
        const metadataPath = path.join(keyDir, 'metadata.json');

        if (fs.existsSync(metadataPath)) {
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
          keys.push(metadata);
        }
      }

      return keys;
    } catch (error) {
      console.error('Failed to list key pairs:', error);
      return [];
    }
  }

  /**
   * Get key pair by name
   */
  getKeyPair(name) {
    try {
      const keyDir = path.join(this.keysDirectory, name);
      const metadataPath = path.join(keyDir, 'metadata.json');

      if (!fs.existsSync(metadataPath)) {
        throw new Error(`Key pair not found: ${name}`);
      }

      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      
      // Read key contents
      const privateKey = fs.readFileSync(metadata.privateKeyPath, 'utf-8');
      let publicKey = '';

      if (metadata.publicKeyPath && fs.existsSync(metadata.publicKeyPath)) {
        publicKey = fs.readFileSync(metadata.publicKeyPath, 'utf-8');
      }

      return {
        ...metadata,
        privateKey,
        publicKey
      };
    } catch (error) {
      throw new Error(`Failed to retrieve key pair: ${error.message}`);
    }
  }

  /**
   * Export key pair to files
   */
  async exportKeyPair(name, outputPath) {
    try {
      const keyPair = this.getKeyPair(name);

      // Ensure output directory exists
      if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
      }

      // Save private key
      const privateKeyPath = path.join(outputPath, `${name}_rsa`);
      fs.writeFileSync(privateKeyPath, keyPair.privateKey, { mode: 0o600 });

      // Save public key if available
      let publicKeyPath = '';
      if (keyPair.publicKey) {
        publicKeyPath = path.join(outputPath, `${name}_rsa.pub`);
        fs.writeFileSync(publicKeyPath, keyPair.publicKey, { mode: 0o644 });
      }

      // Save metadata
      const metadataPath = path.join(outputPath, `${name}_metadata.json`);
      fs.writeFileSync(metadataPath, JSON.stringify(keyPair, null, 2));

      return {
        success: true,
        privateKeyPath,
        publicKeyPath,
        metadataPath
      };
    } catch (error) {
      throw new Error(`Failed to export key pair: ${error.message}`);
    }
  }

  /**
   * Delete key pair
   */
  deleteKeyPair(name) {
    try {
      const keyDir = path.join(this.keysDirectory, name);

      if (!fs.existsSync(keyDir)) {
        throw new Error(`Key pair not found: ${name}`);
      }

      // Remove directory recursively
      fs.rmSync(keyDir, { recursive: true, force: true });

      return { success: true, message: `Key pair deleted: ${name}` };
    } catch (error) {
      throw new Error(`Failed to delete key pair: ${error.message}`);
    }
  }

  /**
   * Test key validity by attempting to load it
   */
  testKeyValidity(name, passphrase = '') {
    try {
      const keyPair = this.getKeyPair(name);
      
      // Try to load the private key
      try {
        crypto.createPrivateKey({
          key: keyPair.privateKey,
          format: 'pem',
          passphrase: passphrase || undefined
        });
        return { valid: true, message: 'Key is valid' };
      } catch (error) {
        return { 
          valid: false, 
          error: `Failed to load key: ${error.message}`,
          requiresPassphrase: error.message.includes('encrypted')
        };
      }
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
}

export default SSHKeyManager;
