// Firebase Authentication Service
// Provides functions for user authentication

import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    signInWithCredential,
    GoogleAuthProvider,
    signOut as firebaseSignOut,
    sendPasswordResetEmail,
    updateProfile as firebaseUpdateProfile,
    onAuthStateChanged,
    User,
    UserCredential,
    deleteUser as firebaseDeleteUser
} from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';
import { Capacitor } from '@capacitor/core';

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Types
export interface UserProfile {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    role?: 'admin' | 'free' | 'pro' | 'premium' | 'enterprise';
    isAdmin?: boolean;
    disabled?: boolean;
}

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

/**
 * Sign in with email and password
 */
export const signInWithEmail = async (
    email: string,
    password: string
): Promise<UserCredential> => {
    return signInWithEmailAndPassword(auth, email, password);
};

/**
 * Sign up with email and password
 * Creates user profile in Firestore
 */
export const signUpWithEmail = async (
    email: string,
    password: string,
    displayName: string
): Promise<UserCredential> => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    // Update display name
    await firebaseUpdateProfile(userCredential.user, { displayName });

    // Create user profile in Firestore
    await createUserProfile(userCredential.user, displayName);

    return userCredential;
};

/**
 * Sign in with Google OAuth
 */
export const signInWithGoogle = async (): Promise<UserCredential> => {
    let userCredential: UserCredential;

    if (Capacitor.isNativePlatform()) {
        try {
            const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
            await GoogleAuth.initialize({
                clientId: '938128551688-rbgf5oe3qvrjuff3s2ccrur8lp0t8eog.apps.googleusercontent.com',
                scopes: ['profile', 'email'],
                grantOfflineAccess: true,
            });
            const googleUser = await GoogleAuth.signIn();
            if (googleUser && googleUser.authentication && googleUser.authentication.idToken) {
                const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
                userCredential = await signInWithCredential(auth, credential);
            } else {
                throw new Error('auth/google-sign-in-failed');
            }
        } catch (nativeErr: any) {
            console.error('Native Google Auth error:', nativeErr);
            // Don't crash if user cancelled
            const errStr = String(nativeErr?.message || nativeErr?.code || nativeErr).toLowerCase();
            if (
                nativeErr?.code === '12501' ||
                errStr.includes('cancel') ||
                errStr.includes('closed') ||
                errStr.includes('popup_closed')
            ) {
                throw new Error('auth/popup-closed-by-user');
            }
            // Fallback attempt with web popup if native fails
            try {
                userCredential = await signInWithPopup(auth, googleProvider);
            } catch (fallbackErr: any) {
                throw nativeErr || fallbackErr;
            }
        }
    } else {
        userCredential = await signInWithPopup(auth, googleProvider);
    }

    // Check if user profile exists, create if not
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    if (!userDoc.exists()) {
        await createUserProfile(userCredential.user);
    }

    return userCredential;
};

/**
 * Sign out
 */
export const signOut = async (): Promise<void> => {
    return firebaseSignOut(auth);
};

/**
 * Send password reset email
 */
export const resetPassword = async (email: string): Promise<void> => {
    return sendPasswordResetEmail(auth, email);
};

/**
 * Update user profile
 */
export const updateProfile = async (data: {
    displayName?: string;
    photoURL?: string;
}): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error('No user logged in');

    await firebaseUpdateProfile(user, data);

    // Update Firestore profile too
    await setDoc(doc(db, 'users', user.uid), data, { merge: true });
};

/**
 * Subscribe to auth state changes
 */
export const onAuthChange = (callback: (user: User | null) => void): (() => void) => {
    return onAuthStateChanged(auth, callback);
};

/**
 * Get current user
 */
export const getCurrentUser = (): User | null => {
    return auth.currentUser;
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create user profile document in Firestore
 */
const createUserProfile = async (user: User, displayName?: string): Promise<void> => {
    const userRef = doc(db, 'users', user.uid);

    await setDoc(userRef, {
        email: user.email,
        displayName: displayName || user.displayName || user.email?.split('@')[0] || 'User',
        photoURL: user.photoURL,
        createdAt: serverTimestamp(),
    });
};

/**
 * Get user profile from Firestore
 */
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) return null;

    const data = userDoc.data();
    return {
        uid,
        email: data.email,
        displayName: data.displayName,
        photoURL: data.photoURL,
        role: data.role,
        isAdmin: data.isAdmin,
        disabled: data.disabled,
    };
};

/**
 * Permanently delete current user account
 */
export const deleteUserAccount = async (): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error('No user logged in');

    // 1. Delete user profile document from Firestore
    try {
        await deleteDoc(doc(db, 'users', user.uid));
    } catch (err) {
        console.warn('Could not delete Firestore user profile document:', err);
    }

    // 2. Delete Firebase Auth user
    await firebaseDeleteUser(user);
};

