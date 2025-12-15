/**
 * Password hashing utilities for Cloudflare Workers
 * Uses Web Crypto API (PBKDF2) which is compatible with Workers runtime
 */

const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Generates a cryptographically secure random salt
 */
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Converts Uint8Array to hex string
 */
function toHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Converts hex string to Uint8Array
 */
function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Derives a key from password using PBKDF2
 */
async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_LENGTH * 8
  );

  return new Uint8Array(derivedBits);
}

/**
 * Hashes a password using PBKDF2
 * Returns a string in format: salt$hash
 * @param password - Plain text password
 * @returns Hashed password string
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = generateSalt();
  const hash = await deriveKey(password, salt);
  return `${toHex(salt)}$${toHex(hash)}`;
}

/**
 * Verifies a password against a hash
 * @param hash - Stored hash in format: salt$hash
 * @param password - Plain text password to verify
 * @returns true if password matches
 */
export async function verifyPassword(
  hash: string,
  password: string
): Promise<boolean> {
  const [saltHex, storedHashHex] = hash.split('$');
  
  if (!saltHex || !storedHashHex) {
    return false;
  }

  const salt = fromHex(saltHex);
  const storedHash = fromHex(storedHashHex);
  const computedHash = await deriveKey(password, salt);

  // Constant-time comparison to prevent timing attacks
  if (storedHash.length !== computedHash.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < storedHash.length; i++) {
    result |= storedHash[i] ^ computedHash[i];
  }

  return result === 0;
}
