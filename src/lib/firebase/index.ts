// Firebase exports
// Central export point for all Firebase services

export { auth, db } from './config';
export * from './auth';

// Export encrypted Firestore operations (wraps base Firestore with encryption)
// This makes encryption transparent to the rest of the application
export * from './encryptedFirestore';

// Export base Firestore for direct access when needed (e.g., testing)
export * as baseFirestore from './firestore';
