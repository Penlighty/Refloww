"use client";

// Authentication Context and Provider
// Provides auth state and functions throughout the app

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
    onAuthChange,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    resetPassword,
    UserProfile,
    getUserProfile
} from '@/lib/firebase/auth';

// ============================================
// TYPES
// ============================================

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    error: string | null;

    // Auth functions
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string, displayName: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    forgotPassword: (email: string) => Promise<void>;
    clearError: () => void;
    updateUserProfile: (data: { displayName?: string; photoURL?: string }) => Promise<void>;
}

// ============================================
// CONTEXT
// ============================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Subscribe to auth state changes
    useEffect(() => {
        const unsubscribe = onAuthChange(async (firebaseUser) => {
            setUser(firebaseUser);

            if (firebaseUser) {
                // Fetch user profile from Firestore
                try {
                    const userProfile = await getUserProfile(firebaseUser.uid);
                    setProfile(userProfile);
                } catch (err) {
                    console.error('Error fetching user profile:', err);
                }
            } else {
                setProfile(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // ============================================
    // AUTH FUNCTIONS
    // ============================================

    const login = async (email: string, password: string) => {
        try {
            setError(null);
            setLoading(true);
            await signInWithEmail(email, password);
        } catch (err: any) {
            setError(getErrorMessage(err.code));
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const signup = async (email: string, password: string, displayName: string) => {
        try {
            setError(null);
            setLoading(true);
            await signUpWithEmail(email, password, displayName);
        } catch (err: any) {
            setError(getErrorMessage(err.code));
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const loginWithGoogle = async () => {
        try {
            setError(null);
            setLoading(true);
            await signInWithGoogle();
        } catch (err: any) {
            setError(getErrorMessage(err.code));
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            setError(null);
            // Non-blocking sign out with 1.5s timeout fallback
            await Promise.race([
                signOut(),
                new Promise((resolve) => setTimeout(resolve, 1500))
            ]).catch((err) => console.warn('Firebase signOut non-fatal warning:', err));

            setUser(null);
            setProfile(null);
            
            // Clear encryption session marker
            if (typeof sessionStorage !== 'undefined') {
                sessionStorage.removeItem('refloww_encryption_session');
            }

            // Do NOT wipe persistent user stores (organizations, products, documents, etc.)
            // User created organizations and business data remain safely preserved across login sessions.

            // Reload browser to a clean login state
            if (typeof window !== 'undefined') {
                window.location.href = '/login';
            }
        } catch (err: any) {
            console.error('Logout error:', err);
            if (typeof window !== 'undefined') {
                window.location.href = '/login';
            }
        }
    };

    const forgotPassword = async (email: string) => {
        try {
            setError(null);
            await resetPassword(email);
        } catch (err: any) {
            setError(getErrorMessage(err.code));
            throw err;
        }
    };

    const clearError = () => setError(null);

    const updateUserProfile = async (data: { displayName?: string; photoURL?: string }) => {
        try {
            setError(null);
            setLoading(true);
            const { updateProfile: firebaseUpdateProfile } = await import('@/lib/firebase/auth');
            await firebaseUpdateProfile(data);
            
            // Reactively update local profile state
            setProfile(prev => {
                if (prev) {
                    return {
                        ...prev,
                        displayName: data.displayName !== undefined ? data.displayName : prev.displayName,
                        photoURL: data.photoURL !== undefined ? data.photoURL : prev.photoURL
                    };
                }
                return {
                    uid: user?.uid || '',
                    email: user?.email || '',
                    displayName: data.displayName || null,
                    photoURL: data.photoURL || null
                };
            });
        } catch (err: any) {
            setError(getErrorMessage(err.code));
            throw err;
        } finally {
            setLoading(false);
        }
    };

    // ============================================
    // CONTEXT VALUE
    // ============================================

    const value: AuthContextType = {
        user,
        profile,
        loading,
        error,
        login,
        signup,
        loginWithGoogle,
        logout,
        forgotPassword,
        clearError,
        updateUserProfile,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// ============================================
// HOOK
// ============================================

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getErrorMessage(code: string): string {
    switch (code) {
        case 'auth/invalid-email':
            return 'Invalid email address.';
        case 'auth/user-disabled':
            return 'This account has been disabled.';
        case 'auth/user-not-found':
            return 'No account found with this email.';
        case 'auth/wrong-password':
            return 'Incorrect password.';
        case 'auth/invalid-credential':
            return 'Invalid email or password.';
        case 'auth/email-already-in-use':
            return 'An account already exists with this email.';
        case 'auth/weak-password':
            return 'Password must be at least 6 characters.';
        case 'auth/operation-not-allowed':
            return 'This sign-in method is not enabled.';
        case 'auth/popup-closed-by-user':
            return 'Sign-in popup was closed. Please try again.';
        case 'auth/cancelled-popup-request':
            return 'Sign-in was cancelled.';
        case 'auth/popup-blocked':
            return 'Sign-in popup was blocked. Please allow popups.';
        case 'auth/too-many-requests':
            return 'Too many attempts. Please try again later.';
        case 'auth/network-request-failed':
            return 'Network error. Please check your connection.';
        default:
            return 'An error occurred. Please try again.';
    }
}
