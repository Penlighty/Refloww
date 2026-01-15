/**
 * Document Encryption Service
 * 
 * Handles encryption/decryption of Refloww documents and data
 * while preserving fields that need to remain unencrypted for
 * proper app functionality (filtering, sorting, etc.)
 */

import {
    encryptString,
    decryptString,
    encryptObject,
    decryptObject,
    deriveKeyFromPassword,
    generateSalt,
    createVerificationToken,
    verifyPassword,
    base64ToArrayBuffer,
    arrayBufferToBase64,
    isEncryptionSupported,
    exportKeyToJWK,
    importKeyFromJWK
} from './encryption';



// ============================================
// FIELD DEFINITIONS
// Fields that MUST remain unencrypted for app functionality
// ============================================

/**
 * Document fields that should NOT be encrypted
 * These are needed for:
 * - Filtering and querying in Firestore
 * - Routing and URL generation
 * - Sorting and ordering
 * - Status tracking
 */
const UNENCRYPTED_DOCUMENT_FIELDS = [
    'id',
    'type',           // invoice, receipt, delivery-note (for filtering)
    'status',         // draft, sent, paid, overdue, cancelled (for filtering)
    'createdAt',      // For sorting by date
    'updatedAt',      // For sync tracking
    'syncedAt',       // Firebase sync timestamp
    'templateId',     // Reference to template
    'customerId',     // Reference to customer (ID only)
    'dueDate',        // For overdue calculations
    'date',           // Document date for filtering
    'documentNumber', // For display in lists
    'customerName',   // For display in lists
    'grandTotal',     // For display in lists
] as const;

/**
 * Template fields that should NOT be encrypted
 */
const UNENCRYPTED_TEMPLATE_FIELDS = [
    'id',
    'name',           // For identification in lists
    'type',           // Document type
    'isDefault',      // Default template flag
    'createdAt',
    'updatedAt',
    'syncedAt',
] as const;

/**
 * Customer fields that should NOT be encrypted
 */
const UNENCRYPTED_CUSTOMER_FIELDS = [
    'id',
    'name',           // For identification in lists
    'createdAt',
    'updatedAt',
    'syncedAt',
] as const;

/**
 * Product fields that should NOT be encrypted
 */
const UNENCRYPTED_PRODUCT_FIELDS = [
    'id',
    'name',           // For identification in lists
    'createdAt',
    'updatedAt',
    'syncedAt',
] as const;

// ============================================
// TYPES
// ============================================

export interface EncryptedData {
    _encrypted: true;
    _iv: string;
    _ciphertext: string;
    _version: number;
}

export interface EncryptionConfig {
    enabled: boolean;
    salt: string;          // Base64 encoded salt
    verificationIv: string;
    verificationCiphertext: string;
    enabledAt: string;     // ISO date
}

export type DataType = 'document' | 'template' | 'customer' | 'product' | 'settings';

// Current encryption version (for future migration support)
const ENCRYPTION_VERSION = 1;

// ============================================
// ENCRYPTION SERVICE
// ============================================

class EncryptionService {
    private currentKey: CryptoKey | null = null;
    private config: EncryptionConfig | null = null;

    /**
     * Check if encryption is supported in this browser
     */
    isSupported(): boolean {
        return isEncryptionSupported();
    }

    /**
     * Check if encryption is currently enabled and unlocked
     */
    isUnlocked(): boolean {
        return this.currentKey !== null;
    }

    /**
     * Check if encryption is configured (may need to be unlocked)
     */
    isConfigured(): boolean {
        return this.config !== null && this.config.enabled;
    }

    /**
     * Initialize encryption with a new password
     * This creates the encryption config and derives the key
     */
    async setup(password: string): Promise<EncryptionConfig> {
        if (!this.isSupported()) {
            throw new Error('Encryption is not supported in this browser');
        }

        // Generate a fresh salt
        const salt = generateSalt();

        // Derive key from password
        const key = await deriveKeyFromPassword(password, salt);

        // Create verification token
        const verification = await createVerificationToken(key);

        // Store key in memory
        this.currentKey = key;

        // Create config
        this.config = {
            enabled: true,
            salt: arrayBufferToBase64(salt),
            verificationIv: verification.iv,
            verificationCiphertext: verification.ciphertext,
            enabledAt: new Date().toISOString()
        };

        return this.config;
    }

    /**
     * Unlock encryption with password (for returning users)
     */
    async unlock(password: string, config: EncryptionConfig): Promise<boolean> {
        if (!this.isSupported()) {
            throw new Error('Encryption is not supported in this browser');
        }

        const salt = base64ToArrayBuffer(config.salt);

        // Verify password
        const isValid = await verifyPassword(
            password,
            salt,
            config.verificationCiphertext,
            config.verificationIv
        );

        if (!isValid) {
            return false;
        }

        // Derive and store key
        this.currentKey = await deriveKeyFromPassword(password, salt);
        this.config = config;

        return true;
    }

    /**
     * Lock encryption (clear key from memory)
     * Optionally also clears config when encryption is being disabled entirely
     */
    lock(clearConfig: boolean = false): void {
        this.currentKey = null;
        if (clearConfig) {
            this.config = null;
        }
    }

    /**
     * Export current key for session persistence
     */
    async exportKey(): Promise<JsonWebKey | null> {
        if (!this.currentKey) return null;
        try {
            return await exportKeyToJWK(this.currentKey);
        } catch (e) {
            console.error('Failed to export key', e);
            return null;
        }
    }

    /**
     * Restore key from session storage
     */
    async restoreKey(jwk: JsonWebKey, config: EncryptionConfig): Promise<boolean> {
        try {
            const key = await importKeyFromJWK(jwk);
            this.currentKey = key;
            this.config = config;
            return true;
        } catch (e) {
            console.error('Failed to restore key', e);
            return false;
        }
    }

    /**
     * Get the list of fields to exclude from encryption for a data type
     */
    getUnencryptedFields(dataType: DataType): readonly string[] {
        switch (dataType) {
            case 'document':
                return UNENCRYPTED_DOCUMENT_FIELDS;
            case 'template':
                return UNENCRYPTED_TEMPLATE_FIELDS;
            case 'customer':
                return UNENCRYPTED_CUSTOMER_FIELDS;
            case 'product':
                return UNENCRYPTED_PRODUCT_FIELDS;
            case 'settings':
                return ['id', 'createdAt', 'updatedAt', 'syncedAt'];
            default:
                return ['id'];
        }
    }

    /**
     * Encrypt a document/entity while preserving required unencrypted fields
     */
    async encryptData<T extends Record<string, any>>(
        data: T,
        dataType: DataType
    ): Promise<T & { _encryptedPayload?: EncryptedData }> {
        // If encryption not unlocked, return data as-is
        if (!this.currentKey || !this.config?.enabled) {
            return data;
        }

        const unencryptedFields = this.getUnencryptedFields(dataType);

        // Separate encrypted and unencrypted fields
        const unencryptedData: Record<string, any> = {};
        const toEncrypt: Record<string, any> = {};

        for (const [key, value] of Object.entries(data)) {
            if (unencryptedFields.includes(key as any)) {
                unencryptedData[key] = value;
            } else if (value !== undefined) {
                toEncrypt[key] = value;
            }
        }

        // Encrypt sensitive fields
        const encrypted = await encryptObject(toEncrypt, this.currentKey);

        return {
            ...unencryptedData,
            _encryptedPayload: {
                _encrypted: true,
                _iv: encrypted.iv,
                _ciphertext: encrypted.ciphertext,
                _version: ENCRYPTION_VERSION
            }
        } as T & { _encryptedPayload?: EncryptedData };
    }

    /**
     * Decrypt a document/entity
     */
    async decryptData<T extends Record<string, any>>(
        data: T & { _encryptedPayload?: EncryptedData }
    ): Promise<T> {
        // If no encrypted payload, return as-is
        if (!data._encryptedPayload || !data._encryptedPayload._encrypted) {
            // Remove the payload field if present but empty
            const { _encryptedPayload, ...rest } = data;
            return rest as T;
        }

        // If encryption not unlocked, throw error
        if (!this.currentKey) {
            throw new Error('Encryption is locked. Please unlock with your password.');
        }

        const { _encryptedPayload, ...unencryptedData } = data;

        // Decrypt the payload
        const decryptedFields = await decryptObject<Record<string, any>>(
            _encryptedPayload._ciphertext,
            _encryptedPayload._iv,
            this.currentKey
        );

        return {
            ...unencryptedData,
            ...decryptedFields
        } as T;
    }

    /**
     * Check if data is encrypted
     */
    isDataEncrypted(data: any): boolean {
        return data?._encryptedPayload?._encrypted === true;
    }

    /**
     * Change encryption password
     * This requires re-encrypting all data with the new key
     */
    async changePassword(
        oldPassword: string,
        newPassword: string,
        config: EncryptionConfig
    ): Promise<EncryptionConfig | null> {
        // First verify old password
        const unlocked = await this.unlock(oldPassword, config);
        if (!unlocked) {
            return null;
        }

        // Setup with new password (this creates new salt and key)
        return this.setup(newPassword);
    }
}

// Export singleton instance
export const encryptionService = new EncryptionService();

// Export utility for checking if data needs decryption
export function needsDecryption(data: any): boolean {
    return encryptionService.isDataEncrypted(data);
}
