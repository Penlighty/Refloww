"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { encryptionService, EncryptionConfig } from '@/lib/crypto';
import { useSettingsStore } from '@/lib/store';

// ============================================
// CONSTANTS
// ============================================

// Re-prompt for password every 72 hours (3 days) for security reminder
const PASSWORD_REMINDER_DAYS = 3;
const PASSWORD_REMINDER_KEY = 'refloww_encryption_last_entry';
const STORAGE_KEY_JWK = 'refloww_enc_key_jwk';
const STORAGE_KEY_TIMESTAMP = 'refloww_enc_key_ts';

// ============================================
// TYPES
// ============================================

interface EncryptionContextValue {
    // State
    isSupported: boolean;
    isEnabled: boolean;
    isUnlocked: boolean;
    isLoading: boolean;
    isReady: boolean; // True when encryption state has been determined (can proceed with data loading)
    needsPasswordPrompt: boolean;

    // Actions
    setup: (password: string) => Promise<boolean>;
    unlock: (password: string) => Promise<boolean>;
    lock: () => void;

    // UI State
    showUnlockPrompt: boolean;
    setShowUnlockPrompt: (show: boolean) => void;
    pendingAction: (() => void) | null;
    setPendingAction: (action: (() => void) | null) => void;
}

const EncryptionContext = createContext<EncryptionContextValue | null>(null);

// ============================================
// PROVIDER
// ============================================

interface EncryptionProviderProps {
    children: ReactNode;
}

export function EncryptionProvider({ children }: EncryptionProviderProps) {
    const { company, updateCompany } = useSettingsStore();

    const [isSupported, setIsSupported] = useState(true);
    const [isEnabled, setIsEnabled] = useState(false);
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isReady, setIsReady] = useState(false); // True when encryption check is complete
    const [showUnlockPrompt, setShowUnlockPrompt] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
    const [needsPasswordPrompt, setNeedsPasswordPrompt] = useState(false);

    // Initial Check & Restore Session
    useEffect(() => {
        const checkStatus = async () => {
            setIsSupported(encryptionService.isSupported());
            const config = company.encryptionConfig;

            if (config?.enabled) {
                setIsEnabled(true);

                // 1. Try to restore session from LocalStorage
                if (typeof localStorage !== 'undefined') {
                    const savedJwk = localStorage.getItem(STORAGE_KEY_JWK);
                    const savedTs = localStorage.getItem(STORAGE_KEY_TIMESTAMP);

                    if (savedJwk && savedTs) {
                        const ageHours = (Date.now() - parseInt(savedTs, 10)) / (1000 * 60 * 60);

                        if (ageHours < (PASSWORD_REMINDER_DAYS * 24)) {
                            // Valid session (< 72h)
                            try {
                                const jwk = JSON.parse(savedJwk);
                                const restored = await encryptionService.restoreKey(jwk, config);
                                if (restored) {
                                    setIsUnlocked(true);
                                    setNeedsPasswordPrompt(false);
                                    setIsReady(true); // Mark as ready

                                    // Dispatch unlock event to trigger data refresh (e.g. for useFirebaseSync)
                                    if (typeof window !== 'undefined') {
                                        console.log('[Encryption] Session restored, refreshing data...');
                                        window.dispatchEvent(new CustomEvent('encryption-unlocked'));
                                    }

                                    return;
                                }
                            } catch (e) {
                                console.error('Failed to restore encryption session', e);
                            }
                        } else {
                            // Expired
                            localStorage.removeItem(STORAGE_KEY_JWK);
                            localStorage.removeItem(STORAGE_KEY_TIMESTAMP);
                        }
                    }
                }

                // 2. Fallback: Check if already in memory (rare on reload, but good for HMR)
                if (encryptionService.isUnlocked()) {
                    setIsUnlocked(true);
                    setNeedsPasswordPrompt(false);
                    setIsReady(true); // Mark as ready
                    return;
                }

                // 3. Locked - Prompt User
                setIsUnlocked(false);
                setNeedsPasswordPrompt(true);
                setIsReady(true); // Mark as ready (even though locked, we know the state)
                // Only auto-show prompt if we intended to access data, but user says "prompt only on new session". 
                // Since this IS a new session (reload) and restore failed, we SHOULD prompt.
                setShowUnlockPrompt(true);
            } else {
                // Encryption is not enabled or has been disabled
                // Reset all encryption state to ensure UI reflects the change
                setIsEnabled(false);
                setIsUnlocked(false);
                setNeedsPasswordPrompt(false);
                setShowUnlockPrompt(false);

                // Clear any stored session keys since encryption is disabled
                if (typeof localStorage !== 'undefined') {
                    localStorage.removeItem(STORAGE_KEY_JWK);
                    localStorage.removeItem(STORAGE_KEY_TIMESTAMP);
                }

                // Lock the service and clear its config since encryption is disabled
                encryptionService.lock(true);

                setIsReady(true);
            }
        };

        checkStatus();
    }, [company]);

    // ... (Unlock required event listener unchanged)
    useEffect(() => {
        const handleUnlockRequired = () => {
            if (isEnabled && !isUnlocked) {
                setShowUnlockPrompt(true);
            }
        };

        window.addEventListener('encryption-unlock-required', handleUnlockRequired);
        return () => {
            window.removeEventListener('encryption-unlock-required', handleUnlockRequired);
        };
    }, [isEnabled, isUnlocked]);

    // Setup new encryption
    const setup = useCallback(async (password: string): Promise<boolean> => {
        setIsLoading(true);
        try {
            const config = await encryptionService.setup(password);

            // Save config to settings
            updateCompany({
                ...company,
                encryptionConfig: config
            });

            // Export and Save Session
            const jwk = await encryptionService.exportKey();
            if (jwk && typeof localStorage !== 'undefined') {
                localStorage.setItem(STORAGE_KEY_JWK, JSON.stringify(jwk));
                localStorage.setItem(STORAGE_KEY_TIMESTAMP, Date.now().toString());
            }

            setIsEnabled(true);
            setIsUnlocked(true);
            setNeedsPasswordPrompt(false);

            return true;
        } catch (error) {
            console.error('Failed to setup encryption:', error);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [company, updateCompany]);

    // Unlock with password
    const unlock = useCallback(async (password: string): Promise<boolean> => {
        const config = company.encryptionConfig;
        if (!config) return false;

        setIsLoading(true);
        try {
            const success = await encryptionService.unlock(password, config);

            if (success) {
                // Export and Save Session
                const jwk = await encryptionService.exportKey();
                if (jwk && typeof localStorage !== 'undefined') {
                    localStorage.setItem(STORAGE_KEY_JWK, JSON.stringify(jwk));
                    localStorage.setItem(STORAGE_KEY_TIMESTAMP, Date.now().toString());
                }

                setIsUnlocked(true);
                setNeedsPasswordPrompt(false);

                // Dispatch event to trigger data refresh
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('encryption-unlocked'));
                }

                // Execute pending action if any
                if (pendingAction) {
                    pendingAction();
                    setPendingAction(null);
                }

                setShowUnlockPrompt(false);
            }

            return success;
        } catch (error) {
            console.error('Failed to unlock encryption:', error);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [company, pendingAction]);

    // Lock encryption
    const lock = useCallback(() => {
        encryptionService.lock();
        setIsUnlocked(false);
        setNeedsPasswordPrompt(true);

        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(STORAGE_KEY_JWK);
            localStorage.removeItem(STORAGE_KEY_TIMESTAMP);
        }
    }, []);

    const value: EncryptionContextValue = {
        isSupported,
        isEnabled,
        isUnlocked,
        isLoading,
        isReady,
        needsPasswordPrompt,
        setup,
        unlock,
        lock,
        showUnlockPrompt,
        setShowUnlockPrompt,
        pendingAction,
        setPendingAction,
    };

    return (
        <EncryptionContext.Provider value={value}>
            {children}
        </EncryptionContext.Provider>
    );
}

// ============================================
// HOOK
// ============================================

export function useEncryption(): EncryptionContextValue {
    const context = useContext(EncryptionContext);
    if (!context) {
        throw new Error('useEncryption must be used within an EncryptionProvider');
    }
    return context;
}

/**
 * Safe version of useEncryption that returns null instead of throwing
 * Use this in hooks that may be called outside EncryptionProvider
 */
export function useEncryptionSafe(): EncryptionContextValue | null {
    return useContext(EncryptionContext);
}

// ============================================
// UTILITY HOOK
// ============================================

/**
 * Hook that wraps an action requiring encryption to be unlocked
 * If encryption is enabled but locked, it will prompt for unlock
 */
export function useEncryptedAction<T extends (...args: any[]) => Promise<any>>(
    action: T
): (...args: Parameters<T>) => Promise<ReturnType<T> | undefined> {
    const { isEnabled, isUnlocked, setShowUnlockPrompt, setPendingAction } = useEncryption();

    return useCallback(async (...args: Parameters<T>): Promise<ReturnType<T> | undefined> => {
        // If encryption not enabled, just run the action
        if (!isEnabled) {
            return action(...args);
        }

        // If encryption is enabled but not unlocked, prompt for unlock
        if (!isUnlocked) {
            setPendingAction(() => () => action(...args));
            setShowUnlockPrompt(true);
            return undefined;
        }

        // Encryption is unlocked, run the action
        return action(...args);
    }, [action, isEnabled, isUnlocked, setShowUnlockPrompt, setPendingAction]);
}
