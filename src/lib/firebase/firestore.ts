// Firebase Firestore Service
// Provides CRUD operations for all collections

import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    writeBatch,
    QueryConstraint,
    DocumentData,
    Unsubscribe
} from 'firebase/firestore';
import { db } from './config';
import { getCurrentUser } from './auth';

// ============================================
// TYPES
// ============================================

export type CollectionName =
    | 'templates'
    | 'customers'
    | 'products'
    | 'documents'
    | 'discounts';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the current user's ID or throw error
 */
const getUserId = (): string => {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    return user.uid;
};

/**
 * Get collection reference for a user's subcollection
 */
const getUserCollection = (collectionName: CollectionName) => {
    const userId = getUserId();
    return collection(db, 'users', userId, collectionName);
};

/**
 * Get document reference for a user's document
 */
const getUserDoc = (collectionName: CollectionName, docId: string) => {
    const userId = getUserId();
    return doc(db, 'users', userId, collectionName, docId);
};

// ============================================
// UTILITIES
// ============================================

/**
 * Recursively remove undefined values from an object
 * Firestore does not accept undefined values
 */
const sanitizeData = (data: any): any => {
    if (data === null || data === undefined) return null;
    if (typeof data === 'function') return null;
    if (data instanceof Date) return data.toISOString();
    if (Array.isArray(data)) {
        return data.map(item => sanitizeData(item));
    }
    if (typeof data === 'object') {
        const sanitized: any = {};
        Object.keys(data).forEach(key => {
            const value = data[key];
            if (value !== undefined && typeof value !== 'function') {
                sanitized[key] = sanitizeData(value);
            }
        });
        return sanitized;
    }
    return data;
};

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Create a new document
 */
export const createDocument = async <T extends { id: string }>(
    collectionName: CollectionName,
    data: T
): Promise<T> => {
    const docRef = getUserDoc(collectionName, data.id);
    const timestamp = new Date().toISOString();

    const docData = sanitizeData({
        ...data,
        createdAt: (data as any).createdAt || timestamp,
        updatedAt: timestamp,
        syncedAt: serverTimestamp(),
    });

    await setDoc(docRef, docData);
    return data;
};

/**
 * Get a single document by ID
 */
export const getDocument = async <T>(
    collectionName: CollectionName,
    docId: string
): Promise<T | null> => {
    const docRef = getUserDoc(collectionName, docId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;
    return docSnap.data() as T;
};

/**
 * Get all documents in a collection
 */
export const getDocuments = async <T>(
    collectionName: CollectionName,
    constraints: QueryConstraint[] = []
): Promise<T[]> => {
    const collRef = getUserCollection(collectionName);
    const q = constraints.length > 0
        ? query(collRef, ...constraints)
        : collRef;

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as T);
};

/**
 * Update a document
 */
export const updateDocument = async <T extends DocumentData>(
    collectionName: CollectionName,
    docId: string,
    data: Partial<T>
): Promise<void> => {
    const docRef = getUserDoc(collectionName, docId);

    await updateDoc(docRef, sanitizeData({
        ...data,
        updatedAt: new Date().toISOString(),
        syncedAt: serverTimestamp(),
    }));
};

/**
 * Delete a document
 */
export const deleteDocument = async (
    collectionName: CollectionName,
    docId: string
): Promise<void> => {
    const docRef = getUserDoc(collectionName, docId);
    await deleteDoc(docRef);
};

/**
 * Batch create/update multiple documents
 */
export const batchWrite = async <T extends { id: string }>(
    collectionName: CollectionName,
    documents: T[]
): Promise<void> => {
    const batch = writeBatch(db);
    const timestamp = new Date().toISOString();

    documents.forEach(docData => {
        const docRef = getUserDoc(collectionName, docData.id);
        batch.set(docRef, sanitizeData({
            ...docData,
            updatedAt: timestamp,
            syncedAt: serverTimestamp(),
        }));
    });

    await batch.commit();
};

/**
 * Delete all documents in a collection
 */
export const deleteAllDocuments = async (
    collectionName: CollectionName
): Promise<void> => {
    const collRef = getUserCollection(collectionName);
    const snapshot = await getDocs(collRef);

    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
};

// ============================================
// REAL-TIME SUBSCRIPTIONS
// ============================================

/**
 * Subscribe to a collection for real-time updates
 */
export const subscribeToCollection = <T>(
    collectionName: CollectionName,
    callback: (data: T[]) => void,
    constraints: QueryConstraint[] = []
): Unsubscribe => {
    const collRef = getUserCollection(collectionName);
    const q = constraints.length > 0
        ? query(collRef, ...constraints)
        : collRef;

    return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data() as T);
        callback(data);
    }, (error) => {
        console.error(`Error subscribing to ${collectionName}:`, error);
    });
};

/**
 * Subscribe to a single document
 */
export const subscribeToDocument = <T>(
    collectionName: CollectionName,
    docId: string,
    callback: (data: T | null) => void
): Unsubscribe => {
    const docRef = getUserDoc(collectionName, docId);

    return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data() as T);
        } else {
            callback(null);
        }
    }, (error) => {
        console.error(`Error subscribing to ${collectionName}/${docId}:`, error);
    });
};

// ============================================
// USER SETTINGS (Special - not a subcollection)
// ============================================

/**
 * Get user settings
 */
export const getUserSettings = async (): Promise<DocumentData | null> => {
    const userId = getUserId();
    const userDoc = await getDoc(doc(db, 'users', userId));

    if (!userDoc.exists()) return null;
    return userDoc.data().settings || null;
};

/**
 * Update user settings
 */
export const updateUserSettings = async (settings: DocumentData): Promise<void> => {
    const userId = getUserId();
    const userRef = doc(db, 'users', userId);

    await setDoc(userRef, sanitizeData({
        settings,
        updatedAt: serverTimestamp(),
    }), { merge: true });
};

/**
 * Subscribe to user settings
 */
export const subscribeToUserSettings = (
    callback: (settings: DocumentData | null) => void
): Unsubscribe => {
    const userId = getUserId();
    const userRef = doc(db, 'users', userId);

    return onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data().settings || null);
        } else {
            callback(null);
        }
    });
};
