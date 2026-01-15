/**
 * Encrypted Firestore Service
 * 
 * Wraps the standard Firestore service with encryption capabilities.
 * When encryption is enabled, data is encrypted before writing and
 * decrypted after reading.
 */

import {
    CollectionName,
    createDocument as baseCreateDocument,
    getDocument as baseGetDocument,
    getDocuments as baseGetDocuments,
    updateDocument as baseUpdateDocument,
    batchWrite as baseBatchWrite,
    subscribeToCollection as baseSubscribeToCollection,
    subscribeToDocument as baseSubscribeToDocument,
    deleteDocument,
    deleteAllDocuments,
    getUserSettings,
    updateUserSettings,
    subscribeToUserSettings
} from './firestore';
import { encryptionService, DataType } from '../crypto';
import { DocumentData, QueryConstraint, Unsubscribe } from 'firebase/firestore';

// ============================================
// TYPE MAPPINGS
// ============================================

/**
 * Map collection names to encryption data types
 */
const getDataType = (collectionName: CollectionName): DataType => {
    switch (collectionName) {
        case 'templates':
            return 'template';
        case 'customers':
            return 'customer';
        case 'products':
            return 'product';
        case 'documents':
        case 'discounts':
            return 'document';
        default:
            return 'document';
    }
};

// ============================================
// ENCRYPTED CRUD OPERATIONS
// ============================================

/**
 * Create a new document with encryption
 * If E2EE is configured and unlocked, data is encrypted before storage.
 * If E2EE is configured but NOT unlocked, throws an error to prevent saving unencrypted data.
 */
export const createDocument = async <T extends { id: string }>(
    collectionName: CollectionName,
    data: T
): Promise<T> => {
    const dataType = getDataType(collectionName);

    // Check if E2EE is configured
    if (encryptionService.isConfigured()) {
        if (encryptionService.isUnlocked()) {
            // Encrypt and save
            const encryptedData = await encryptionService.encryptData(data, dataType);
            await baseCreateDocument(collectionName, encryptedData as any);
            return data; // Return original unencrypted data
        } else {
            // E2EE is configured but not unlocked - cannot save
            console.error(`[Encrypted Firestore] Cannot create ${collectionName}: E2EE is enabled but not unlocked`);
            throw new Error('Encryption is enabled but not unlocked. Please unlock to save data.');
        }
    }

    // No E2EE configured - save normally
    return baseCreateDocument(collectionName, data);
};

/**
 * Get a single document by ID with decryption
 * If encrypted and locked, returns data with _isLocked marker for UI handling
 */
export const getDocument = async <T>(
    collectionName: CollectionName,
    docId: string
): Promise<T | null> => {
    const data = await baseGetDocument<T>(collectionName, docId);

    if (!data) return null;

    // Decrypt if data is encrypted
    if (encryptionService.isDataEncrypted(data)) {
        if (!encryptionService.isUnlocked()) {
            // Return data with locked marker instead of throwing
            // This allows UI to show the document with an "unlock required" state
            return {
                ...data,
                _isLocked: true, // Marker for UI to show unlock prompt
            } as T;
        }
        return encryptionService.decryptData(data as any);
    }

    return data;
};

/**
 * Get all documents in a collection with decryption
 * If encrypted and locked, returns data with _isLocked marker for UI handling
 */
export const getDocuments = async <T>(
    collectionName: CollectionName,
    constraints: QueryConstraint[] = []
): Promise<T[]> => {
    const documents = await baseGetDocuments<T>(collectionName, constraints);

    // Decrypt each document if encrypted
    const decryptedDocs: T[] = [];

    for (const doc of documents) {
        if (encryptionService.isDataEncrypted(doc)) {
            if (!encryptionService.isUnlocked()) {
                // Return data with locked marker instead of throwing
                // This allows UI to show documents with basic info (IDs, dates, etc.)
                decryptedDocs.push({
                    ...doc,
                    _isLocked: true, // Marker for UI to show unlock prompt
                } as T);
            } else {
                try {
                    const decrypted = await encryptionService.decryptData(doc as any);
                    decryptedDocs.push(decrypted);
                } catch (err) {
                    console.error('Failed to decrypt document:', err);
                    // Still include with locked marker on decryption error
                    decryptedDocs.push({
                        ...doc,
                        _isLocked: true,
                    } as T);
                }
            }
        } else {
            decryptedDocs.push(doc);
        }
    }

    return decryptedDocs;
};

/**
 * Update a document with encryption
 * If E2EE is configured but not unlocked, throws an error.
 */
export const updateDocument = async <T extends DocumentData>(
    collectionName: CollectionName,
    docId: string,
    data: Partial<T>
): Promise<void> => {
    const dataType = getDataType(collectionName);

    // Check if E2EE is configured
    if (encryptionService.isConfigured()) {
        if (encryptionService.isUnlocked()) {
            // Get existing document
            const existing = await getDocument<T>(collectionName, docId);
            if (existing) {
                // Merge with update
                const merged = { ...existing, ...data };
                // Re-encrypt full document
                const encryptedData = await encryptionService.encryptData(merged as any, dataType);
                await baseUpdateDocument(collectionName, docId, encryptedData);
                return;
            }
        } else {
            // E2EE is configured but not unlocked - cannot save
            console.error(`[Encrypted Firestore] Cannot update ${collectionName}: E2EE is enabled but not unlocked`);
            throw new Error('Encryption is enabled but not unlocked. Please unlock to save data.');
        }
    }

    return baseUpdateDocument(collectionName, docId, data);
};

/**
 * Batch create/update multiple documents with encryption
 * If E2EE is configured but not unlocked, throws an error.
 */
export const batchWrite = async <T extends { id: string }>(
    collectionName: CollectionName,
    documents: T[]
): Promise<void> => {
    const dataType = getDataType(collectionName);

    // Check if E2EE is configured
    if (encryptionService.isConfigured()) {
        if (encryptionService.isUnlocked()) {
            const encryptedDocs: any[] = [];

            for (const doc of documents) {
                const encrypted = await encryptionService.encryptData(doc, dataType);
                encryptedDocs.push(encrypted);
            }

            return baseBatchWrite(collectionName, encryptedDocs);
        } else {
            // E2EE is configured but not unlocked - cannot save
            console.error(`[Encrypted Firestore] Cannot batch write ${collectionName}: E2EE is enabled but not unlocked`);
            throw new Error('Encryption is enabled but not unlocked. Please unlock to save data.');
        }
    }

    return baseBatchWrite(collectionName, documents);
};

/**
 * Subscribe to a collection for real-time updates with decryption
 */
export const subscribeToCollection = <T>(
    collectionName: CollectionName,
    callback: (data: T[]) => void,
    constraints: QueryConstraint[] = []
): Unsubscribe => {
    return baseSubscribeToCollection<T>(
        collectionName,
        async (rawData) => {
            // Decrypt each document if encrypted
            const decryptedDocs: T[] = [];

            for (const doc of rawData) {
                if (encryptionService.isDataEncrypted(doc)) {
                    if (encryptionService.isUnlocked()) {
                        try {
                            const decrypted = await encryptionService.decryptData(doc as any);
                            decryptedDocs.push(decrypted);
                        } catch (err) {
                            console.error('Failed to decrypt document:', err);
                            // Include raw doc so UI can show "encrypted" state
                            decryptedDocs.push(doc);
                        }
                    } else {
                        // Include raw doc - UI should prompt for unlock
                        decryptedDocs.push(doc);
                    }
                } else {
                    decryptedDocs.push(doc);
                }
            }

            callback(decryptedDocs);
        },
        constraints
    );
};

/**
 * Subscribe to a single document with decryption
 */
export const subscribeToDocument = <T>(
    collectionName: CollectionName,
    docId: string,
    callback: (data: T | null) => void
): Unsubscribe => {
    return baseSubscribeToDocument<T>(
        collectionName,
        docId,
        async (rawData) => {
            if (!rawData) {
                callback(null);
                return;
            }

            if (encryptionService.isDataEncrypted(rawData)) {
                if (encryptionService.isUnlocked()) {
                    try {
                        const decrypted = await encryptionService.decryptData(rawData as any);
                        callback(decrypted);
                    } catch (err) {
                        console.error('Failed to decrypt document:', err);
                        callback(rawData); // Include raw doc
                    }
                } else {
                    callback(rawData); // UI should prompt for unlock
                }
            } else {
                callback(rawData);
            }
        }
    );
};

// ============================================
// RE-EXPORTS (Unchanged functions)
// ============================================

// These don't need encryption wrapping
export {
    deleteDocument,
    deleteAllDocuments,
    getUserSettings,
    updateUserSettings,
    subscribeToUserSettings
};

// Re-export type separately for isolatedModules compatibility
export type { CollectionName } from './firestore';

// ============================================
// ENCRYPTION STATE UTILITIES
// ============================================

/**
 * Check if a document has the _isLocked marker (encrypted but locked)
 */
export const isDocumentLocked = (data: any): boolean => {
    return data?._isLocked === true;
};

/**
 * Check if any documents in an array are locked
 */
export const hasLockedDocuments = (docs: any[]): boolean => {
    return docs.some(doc => isDocumentLocked(doc));
};

/**
 * Check if encryption is configured but currently locked
 * Returns true if user needs to enter password to access their data
 */
export const needsUnlock = (): boolean => {
    return encryptionService.isConfigured() && !encryptionService.isUnlocked();
};

// ============================================
// MIGRATION UTILITIES
// ============================================

/**
 * Encrypt all existing data when user first enables encryption
 * This should be called after encryption is set up
 */
export const encryptExistingData = async (
    collectionName: CollectionName,
    documents: any[]
): Promise<void> => {
    if (!encryptionService.isUnlocked()) {
        throw new Error('Encryption must be unlocked to encrypt existing data');
    }

    const dataType = getDataType(collectionName);
    const encryptedDocs: any[] = [];

    for (const doc of documents) {
        // Skip already encrypted documents
        if (encryptionService.isDataEncrypted(doc)) {
            encryptedDocs.push(doc);
            continue;
        }

        const encrypted = await encryptionService.encryptData(doc, dataType);
        encryptedDocs.push(encrypted);
    }

    await baseBatchWrite(collectionName, encryptedDocs);
};

/**
 * Check if a collection has any encrypted documents
 */
export const hasEncryptedData = async (
    collectionName: CollectionName
): Promise<boolean> => {
    const documents = await baseGetDocuments<any>(collectionName);
    return documents.some(doc => encryptionService.isDataEncrypted(doc));
};

/**
 * Decrypt all encrypted data in a collection (for disabling encryption)
 * This reads encrypted documents, decrypts them, and writes them back unencrypted
 */
export const decryptExistingData = async (
    collectionName: CollectionName
): Promise<number> => {
    if (!encryptionService.isUnlocked()) {
        throw new Error('Encryption must be unlocked to decrypt existing data');
    }

    // Get all documents (raw, without decryption wrapper)
    const documents = await baseGetDocuments<any>(collectionName);
    const decryptedDocs: any[] = [];
    let decryptedCount = 0;

    for (const doc of documents) {
        // Only process encrypted documents
        if (encryptionService.isDataEncrypted(doc)) {
            try {
                const decrypted = await encryptionService.decryptData(doc);
                decryptedDocs.push(decrypted);
                decryptedCount++;
            } catch (err) {
                console.error(`Failed to decrypt document ${doc.id}:`, err);
                // Keep the original document if decryption fails
                decryptedDocs.push(doc);
            }
        } else {
            // Already unencrypted, keep as-is
            decryptedDocs.push(doc);
        }
    }

    // Write all documents back (now unencrypted since encryption service is not writing)
    // We need to temporarily bypass the encryption wrapper
    if (decryptedDocs.length > 0) {
        await baseBatchWrite(collectionName, decryptedDocs);
    }

    return decryptedCount;
};
