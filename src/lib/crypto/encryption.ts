/**
 * Client-Side Encryption Utilities
 * 
 * Implements AES-256-GCM encryption using the Web Crypto API.
 * This provides zero-knowledge encryption where data is encrypted
 * before leaving the user's browser.
 * 
 * Algorithm: AES-GCM (Galois/Counter Mode)
 * Key Size: 256 bits
 * IV Size: 96 bits (12 bytes) - recommended for AES-GCM
 * Key Derivation: PBKDF2 with SHA-256, 100,000 iterations
 */

// Constants
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits, recommended for AES-GCM
const SALT_LENGTH = 16; // 128 bits
const PBKDF2_ITERATIONS = 100000;

/**
 * Generate a cryptographically secure random salt
 */
export function generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Generate a cryptographically secure random IV (Initialization Vector)
 */
export function generateIV(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

/**
 * Derive an encryption key from a password using PBKDF2
 * 
 * @param password - User's encryption password
 * @param salt - Random salt (should be stored with encrypted data)
 * @returns CryptoKey for encryption/decryption
 */
export async function deriveKeyFromPassword(
    password: string,
    salt: Uint8Array
): Promise<CryptoKey> {
    // Encode password as bytes
    const encoder = new TextEncoder();
    const passwordBytes = encoder.encode(password);

    // Import password as a key for PBKDF2
    const baseKey = await crypto.subtle.importKey(
        'raw',
        passwordBytes,
        'PBKDF2',
        false,
        ['deriveKey']
    );

    // Derive the actual encryption key
    const derivedKey = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt as BufferSource,
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256'
        },
        baseKey,
        { name: ALGORITHM, length: KEY_LENGTH },
        true, // Extractable to allow session persistence
        ['encrypt', 'decrypt'] as KeyUsage[]
    );

    return derivedKey;
}

/**
 * Export a CryptoKey to JWK format for storage
 */
export async function exportKeyToJWK(key: CryptoKey): Promise<JsonWebKey> {
    return crypto.subtle.exportKey('jwk', key);
}

/**
 * Import a CryptoKey from JWK format
 */
export async function importKeyFromJWK(jwk: JsonWebKey): Promise<CryptoKey> {
    return crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: ALGORITHM, length: KEY_LENGTH },
        true, // Extractable
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypt a string using AES-256-GCM
 * 
 * @param plaintext - The string to encrypt
 * @param key - CryptoKey derived from password
 * @returns Object containing IV and ciphertext as base64 strings
 */
export async function encryptString(
    plaintext: string,
    key: CryptoKey
): Promise<{ iv: string; ciphertext: string }> {
    const encoder = new TextEncoder();
    const plaintextBytes = encoder.encode(plaintext);
    const iv = generateIV();

    const ciphertextBuffer = await crypto.subtle.encrypt(
        {
            name: ALGORITHM,
            iv: iv as BufferSource
        },
        key,
        plaintextBytes
    );

    return {
        iv: arrayBufferToBase64(iv),
        ciphertext: arrayBufferToBase64(ciphertextBuffer)
    };
}

/**
 * Decrypt a string using AES-256-GCM
 * 
 * @param ciphertext - Base64 encoded ciphertext
 * @param iv - Base64 encoded IV
 * @param key - CryptoKey derived from password
 * @returns Decrypted plaintext string
 */
export async function decryptString(
    ciphertext: string,
    iv: string,
    key: CryptoKey
): Promise<string> {
    const decoder = new TextDecoder();
    const ciphertextBuffer = base64ToArrayBuffer(ciphertext);
    const ivBuffer = base64ToArrayBuffer(iv);

    const plaintextBuffer = await crypto.subtle.decrypt(
        {
            name: ALGORITHM,
            iv: ivBuffer as BufferSource
        },
        key,
        ciphertextBuffer as BufferSource
    );

    return decoder.decode(plaintextBuffer);
}

/**
 * Encrypt a JSON object
 * 
 * @param data - Object to encrypt
 * @param key - CryptoKey derived from password
 * @returns Encrypted data with IV
 */
export async function encryptObject<T extends object>(
    data: T,
    key: CryptoKey
): Promise<{ iv: string; ciphertext: string }> {
    const jsonString = JSON.stringify(data);
    return encryptString(jsonString, key);
}

/**
 * Decrypt a JSON object
 * 
 * @param ciphertext - Base64 encoded ciphertext
 * @param iv - Base64 encoded IV
 * @param key - CryptoKey derived from password
 * @returns Decrypted object
 */
export async function decryptObject<T extends object>(
    ciphertext: string,
    iv: string,
    key: CryptoKey
): Promise<T> {
    const jsonString = await decryptString(ciphertext, iv, key);
    return JSON.parse(jsonString) as T;
}

/**
 * Convert ArrayBuffer to Base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/**
 * Verify if a password can decrypt data (test with a known value)
 * 
 * @param password - Password to test
 * @param salt - Salt used during encryption
 * @param testCiphertext - Encrypted test value
 * @param testIv - IV for test value
 * @param expectedPlaintext - Expected decrypted value
 * @returns True if password is correct
 */
export async function verifyPassword(
    password: string,
    salt: Uint8Array,
    testCiphertext: string,
    testIv: string,
    expectedPlaintext: string = 'REFLOWW_ENCRYPTION_VERIFICATION'
): Promise<boolean> {
    try {
        const key = await deriveKeyFromPassword(password, salt);
        const decrypted = await decryptString(testCiphertext, testIv, key);
        return decrypted === expectedPlaintext;
    } catch {
        return false;
    }
}

/**
 * Create a verification token that can be used to verify the password later
 */
export async function createVerificationToken(
    key: CryptoKey
): Promise<{ iv: string; ciphertext: string }> {
    const verificationText = 'REFLOWW_ENCRYPTION_VERIFICATION';
    return encryptString(verificationText, key);
}

/**
 * Check if encryption is available in this browser
 */
export function isEncryptionSupported(): boolean {
    return !!(
        typeof crypto !== 'undefined' &&
        crypto.subtle &&
        typeof crypto.subtle.encrypt === 'function' &&
        typeof crypto.subtle.decrypt === 'function' &&
        typeof crypto.subtle.deriveKey === 'function'
    );
}
