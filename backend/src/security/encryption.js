/**
 * Backend Encryption Service
 * Matches frontend triple encryption for seamless communication
 */

const CryptoJS = require('crypto-js');

class EncryptionService {
  constructor() {
    // Use environment key or generate for session
    this.masterKey = process.env.ENCRYPTION_KEY || this.generateMasterKey();
    this.saltKey = CryptoJS.lib.WordArray.random(256/8);
    this.iv = CryptoJS.lib.WordArray.random(128/8);
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  generateMasterKey() {
    const factors = [
      'backend-server',
      new Date().getTime().toString(),
      Math.random().toString(36),
      process.env.JWT_SECRET || 'default-key'
    ];

    return CryptoJS.PBKDF2(
      factors.join('|'),
      CryptoJS.lib.WordArray.random(128/8),
      { keySize: 512/32, iterations: 1000 }
    ).toString();
  }

  /**
   * Decrypt data from frontend (matches frontend encryption)
   */
  decrypt(encryptedData) {
    try {
      // In development, check if data is actually encrypted
      if (this.isDevelopment && !this.isEncrypted(encryptedData)) {
        return encryptedData;
      }

      // Decode the packet
      const packet = JSON.parse(Buffer.from(encryptedData, 'base64').toString());

      // Verify integrity
      const currentHash = CryptoJS.SHA256(packet.d).toString();
      if (currentHash !== packet.h) {
        throw new Error('Data integrity check failed');
      }

      // Check timestamp (5 minute validity)
      if (Date.now() - packet.t > 300000) {
        throw new Error('Data expired');
      }

      // Reverse Layer 3: Custom XOR
      let decrypted = this.reverseXOR(packet.d);

      // Reverse Layer 2: TripleDES
      decrypted = CryptoJS.TripleDES.decrypt(decrypted, this.saltKey.toString())
        .toString(CryptoJS.enc.Utf8);

      // Reverse Layer 1: AES-256
      decrypted = CryptoJS.AES.decrypt(decrypted, this.masterKey, {
        iv: this.iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }).toString(CryptoJS.enc.Utf8);

      // Parse JSON if possible
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (error) {
      // In development, return original if decryption fails
      if (this.isDevelopment) {
        console.log('⚠️ Decryption skipped (development mode)');
        return encryptedData;
      }
      throw error;
    }
  }

  /**
   * Encrypt data for frontend (matches frontend decryption)
   */
  encrypt(data) {
    try {
      // In development, optionally skip encryption
      if (this.isDevelopment && !process.env.FORCE_ENCRYPTION) {
        return data;
      }

      const dataStr = typeof data === 'string' ? data : JSON.stringify(data);

      // Layer 1: AES-256
      let encrypted = CryptoJS.AES.encrypt(dataStr, this.masterKey, {
        iv: this.iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }).toString();

      // Layer 2: TripleDES
      encrypted = CryptoJS.TripleDES.encrypt(encrypted, this.saltKey.toString()).toString();

      // Layer 3: Custom XOR
      encrypted = this.customXOR(encrypted);

      // Create packet with integrity check
      const hash = CryptoJS.SHA256(encrypted).toString();
      const packet = {
        d: encrypted,
        h: hash,
        t: Date.now()
      };

      return Buffer.from(JSON.stringify(packet)).toString('base64');
    } catch (error) {
      console.error('Encryption error:', error);
      // Return original in development if encryption fails
      if (this.isDevelopment) {
        return data;
      }
      throw error;
    }
  }

  customXOR(data) {
    const key = CryptoJS.SHA256(this.masterKey + Date.now()).toString();
    let result = '';

    for (let i = 0; i < data.length; i++) {
      result += String.fromCharCode(
        data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }

    return Buffer.from(result).toString('base64');
  }

  reverseXOR(data) {
    const decoded = Buffer.from(data, 'base64').toString();
    const key = CryptoJS.SHA256(this.masterKey + Date.now()).toString();
    let result = '';

    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(
        decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }

    return result;
  }

  /**
   * Check if data is encrypted
   */
  isEncrypted(data) {
    try {
      const packet = JSON.parse(Buffer.from(data, 'base64').toString());
      return packet.d && packet.h && packet.t;
    } catch {
      return false;
    }
  }

  /**
   * Create checksum for data validation
   */
  createChecksum(data) {
    return CryptoJS.MD5(JSON.stringify(data)).toString();
  }

  /**
   * Verify checksum
   */
  verifyChecksum(data, checksum) {
    const calculated = this.createChecksum(data);
    return calculated === checksum;
  }
}

module.exports = { EncryptionService };