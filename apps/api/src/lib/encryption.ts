/**
 * Data encryption utilities using Web Crypto API
 * For encrypting sensitive fields at rest
 * Requirements: 14.5
 */

/**
 * Encryption algorithm configuration
 */
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 128; // Authentication tag length in bits

/**
 * Encrypted data structure
 */
export interface EncryptedData {
  /** Base64-encoded ciphertext */
  ciphertext: string;
  /** Base64-encoded initialization vector */
  iv: string;
  /** Algorithm used for encryption */
  algorithm: string;
  /** Version for future compatibility */
  version: number;
}

/**
 * Key derivation configuration
 */
export interface KeyDerivationConfig {
  /** Salt for key derivation (should be unique per key) */
  salt: Uint8Array;
  /** Number of iterations for PBKDF2 */
  iterations?: number;
}

const DEFAULT_ITERATIONS = 100000;

/**
 * Generate a random encryption key
 * @returns A CryptoKey suitable for AES-GCM encryption
 */
export async function generateEncryptionKey(): Promise<CryptoKey> {
  const key = await crypto.subtle.generateKey(
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
  return key as CryptoKey;
}

/**
 * Derive an encryption key from a password/secret
 * @param secret - The secret/password to derive key from
 * @param config - Key derivation configuration
 * @returns A CryptoKey derived from the secret
 */
export async function deriveKeyFromSecret(
  secret: string,
  config: KeyDerivationConfig
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: config.salt,
      iterations: config.iterations || DEFAULT_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    false, // not extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate a random salt for key derivation
 * @param length - Salt length in bytes (default: 16)
 * @returns Random salt as Uint8Array
 */
export function generateSalt(length: number = 16): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Generate a random initialization vector
 * @returns Random IV as Uint8Array
 */
function generateIv(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

/**
 * Convert Uint8Array to base64 string
 */
function toBase64(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data));
}

/**
 * Convert base64 string to Uint8Array
 */
function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encrypt a string value
 * @param plaintext - The string to encrypt
 * @param key - The encryption key
 * @returns Encrypted data structure
 */
export async function encrypt(
  plaintext: string,
  key: CryptoKey
): Promise<EncryptedData> {
  const encoder = new TextEncoder();
  const iv = generateIv();
  
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv,
      tagLength: TAG_LENGTH,
    },
    key,
    encoder.encode(plaintext)
  );
  
  return {
    ciphertext: toBase64(new Uint8Array(ciphertext)),
    iv: toBase64(iv),
    algorithm: ALGORITHM,
    version: 1,
  };
}

/**
 * Decrypt an encrypted value
 * @param encryptedData - The encrypted data structure
 * @param key - The decryption key
 * @returns The decrypted plaintext string
 */
export async function decrypt(
  encryptedData: EncryptedData,
  key: CryptoKey
): Promise<string> {
  if (encryptedData.algorithm !== ALGORITHM) {
    throw new Error(`Unsupported algorithm: ${encryptedData.algorithm}`);
  }
  
  const decoder = new TextDecoder();
  const ciphertext = fromBase64(encryptedData.ciphertext);
  const iv = fromBase64(encryptedData.iv);
  
  const plaintext = await crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv,
      tagLength: TAG_LENGTH,
    },
    key,
    ciphertext
  );
  
  return decoder.decode(plaintext);
}

/**
 * Export a CryptoKey to a base64 string for storage
 * @param key - The key to export
 * @returns Base64-encoded key
 */
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return toBase64(new Uint8Array(exported as ArrayBuffer));
}

/**
 * Import a CryptoKey from a base64 string
 * @param keyString - Base64-encoded key
 * @returns The imported CryptoKey
 */
export async function importKey(keyString: string): Promise<CryptoKey> {
  const keyData = fromBase64(keyString);
  return crypto.subtle.importKey(
    'raw',
    keyData,
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encryption manager for handling multiple keys and key rotation
 */
export class EncryptionManager {
  private currentKey: CryptoKey | null = null;
  private keyId: string = '';
  private previousKeys: Map<string, CryptoKey> = new Map();
  
  /**
   * Initialize the encryption manager with a key
   * @param keyString - Base64-encoded encryption key
   * @param keyId - Identifier for this key
   */
  async initialize(keyString: string, keyId: string): Promise<void> {
    this.currentKey = await importKey(keyString);
    this.keyId = keyId;
  }
  
  /**
   * Add a previous key for decryption during key rotation
   * @param keyString - Base64-encoded key
   * @param keyId - Identifier for this key
   */
  async addPreviousKey(keyString: string, keyId: string): Promise<void> {
    const key = await importKey(keyString);
    this.previousKeys.set(keyId, key);
  }
  
  /**
   * Encrypt a value with the current key
   * @param plaintext - Value to encrypt
   * @returns Encrypted data with key ID
   */
  async encrypt(plaintext: string): Promise<EncryptedDataWithKeyId> {
    if (!this.currentKey) {
      throw new Error('Encryption manager not initialized');
    }
    
    const encrypted = await encrypt(plaintext, this.currentKey);
    return {
      ...encrypted,
      keyId: this.keyId,
    };
  }
  
  /**
   * Decrypt a value, automatically selecting the correct key
   * @param encryptedData - Encrypted data with key ID
   * @returns Decrypted plaintext
   */
  async decrypt(encryptedData: EncryptedDataWithKeyId): Promise<string> {
    let key: CryptoKey | undefined;
    
    if (encryptedData.keyId === this.keyId) {
      key = this.currentKey || undefined;
    } else {
      key = this.previousKeys.get(encryptedData.keyId);
    }
    
    if (!key) {
      throw new Error(`Unknown key ID: ${encryptedData.keyId}`);
    }
    
    return decrypt(encryptedData, key);
  }
  
  /**
   * Re-encrypt data with the current key (for key rotation)
   * @param encryptedData - Data encrypted with an old key
   * @returns Data re-encrypted with the current key
   */
  async reencrypt(encryptedData: EncryptedDataWithKeyId): Promise<EncryptedDataWithKeyId> {
    const plaintext = await this.decrypt(encryptedData);
    return this.encrypt(plaintext);
  }
  
  /**
   * Check if data needs re-encryption (uses old key)
   */
  needsReencryption(encryptedData: EncryptedDataWithKeyId): boolean {
    return encryptedData.keyId !== this.keyId;
  }
}

/**
 * Encrypted data with key identifier for key rotation support
 */
export interface EncryptedDataWithKeyId extends EncryptedData {
  /** Identifier of the key used for encryption */
  keyId: string;
}

/**
 * Serialize encrypted data to a string for storage
 */
export function serializeEncryptedData(data: EncryptedData | EncryptedDataWithKeyId): string {
  return JSON.stringify(data);
}

/**
 * Deserialize encrypted data from a string
 */
export function deserializeEncryptedData(serialized: string): EncryptedDataWithKeyId {
  return JSON.parse(serialized) as EncryptedDataWithKeyId;
}

/**
 * Helper to encrypt specific fields in an object
 * @param obj - Object with fields to encrypt
 * @param fields - Array of field names to encrypt
 * @param key - Encryption key
 * @returns Object with specified fields encrypted
 */
export async function encryptFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[],
  key: CryptoKey
): Promise<T> {
  const result = { ...obj };
  
  for (const field of fields) {
    const value = obj[field];
    if (typeof value === 'string' && value.length > 0) {
      const encrypted = await encrypt(value, key);
      (result as Record<string, unknown>)[field as string] = serializeEncryptedData(encrypted);
    }
  }
  
  return result;
}

/**
 * Helper to decrypt specific fields in an object
 * @param obj - Object with encrypted fields
 * @param fields - Array of field names to decrypt
 * @param key - Decryption key
 * @returns Object with specified fields decrypted
 */
export async function decryptFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[],
  key: CryptoKey
): Promise<T> {
  const result = { ...obj };
  
  for (const field of fields) {
    const value = obj[field];
    if (typeof value === 'string' && value.length > 0) {
      try {
        const encrypted = deserializeEncryptedData(value);
        const decrypted = await decrypt(encrypted, key);
        (result as Record<string, unknown>)[field as string] = decrypted;
      } catch {
        // Field might not be encrypted, keep original value
      }
    }
  }
  
  return result;
}
