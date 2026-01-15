"use client";

// Firebase Sync Hook
// Handles syncing Zustand stores with Firestore when user is authenticated

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useEncryptionSafe } from '@/contexts/EncryptionContext';
import {
    getDocuments,
    createDocument as createFirestoreDoc,
    updateDocument as updateFirestoreDoc,
    deleteDocument as deleteFirestoreDoc,
    batchWrite,
    getUserSettings,
    updateUserSettings,
    CollectionName,
    hasLockedDocuments
} from '@/lib/firebase'; // Use encrypted Firestore exports
import {
    useTemplateStore,
    useCustomerStore,
    useProductStore,
    useDocumentStore,
    useDiscountStore,
    useSettingsStore
} from '@/lib/store';
import { Template, Customer, Product, Document, Discount } from '@/lib/types';

// Track if initial sync has happened
let hasSynced = false;

export function useFirebaseSync() {
    const { user } = useAuth();
    const encryptionContext = useEncryptionSafe();
    const syncInProgress = useRef(false);
    const isLoadingFromFirestore = useRef(false); // Prevent sync-back during load
    const pendingOperations = useRef<Map<string, NodeJS.Timeout>>(new Map());

    // Check if encryption is ready for data loading
    // Ready means: encryption not enabled OR encryption is enabled and unlocked
    // Also need to wait for isReady flag which indicates the check is complete
    // IMPORTANT: If context is null, we're still waiting for EncryptionProvider
    const isEncryptionContextAvailable = encryptionContext !== null;
    const isEncryptionReady = isEncryptionContextAvailable &&
        (!encryptionContext.isEnabled || (encryptionContext.isReady && encryptionContext.isUnlocked));
    const encryptionCheckComplete = isEncryptionContextAvailable && encryptionContext.isReady;

    // Store references
    const templateStore = useTemplateStore();
    const customerStore = useCustomerStore();
    const productStore = useProductStore();
    const documentStore = useDocumentStore();
    const discountStore = useDiscountStore();
    const settingsStore = useSettingsStore();

    // ============================================
    // LOAD DATA FROM FIRESTORE
    // ============================================

    // Helper to merge server data with local data (preferring newer)
    const mergeData = <T extends { id: string; updatedAt?: string }>(local: T[], server: T[]): T[] => {
        const mergedMap = new Map<string, T>();

        // Start with server data
        server.forEach(item => mergedMap.set(item.id, item));

        // Overlay local data if it's newer or doesn't exist on server
        local.forEach(localItem => {
            const serverItem = mergedMap.get(localItem.id);
            if (!serverItem) {
                // Local only (newly created)
                mergedMap.set(localItem.id, localItem);
            } else if (localItem.updatedAt && serverItem.updatedAt) {
                // Both exist, check timestamps
                const localDate = new Date(localItem.updatedAt).getTime();
                const serverDate = new Date(serverItem.updatedAt).getTime();
                if (localDate > serverDate) {
                    mergedMap.set(localItem.id, localItem);
                }
            }
        });

        return Array.from(mergedMap.values());
    };

    const loadFromFirestore = useCallback(async (force = false) => {
        if (!user || (syncInProgress.current && !force)) return;

        syncInProgress.current = true;
        isLoadingFromFirestore.current = true; // Prevent sync-back
        console.log('[Firebase Sync] Loading data from Firestore...');

        try {
            // Load all collections in parallel
            const [templates, customers, products, documents, discounts, settings] = await Promise.all([
                getDocuments<Template>('templates'),
                getDocuments<Customer>('customers'),
                getDocuments<Product>('products'),
                getDocuments<Document>('documents'),
                getDocuments<Discount>('discounts'),
                getUserSettings(),
            ]);

            // Check if any data is locked (encrypted but needs unlock)
            const dataIsLocked =
                hasLockedDocuments(templates) ||
                hasLockedDocuments(customers) ||
                hasLockedDocuments(products) ||
                hasLockedDocuments(documents) ||
                hasLockedDocuments(discounts);

            if (dataIsLocked) {
                console.log('[Firebase Sync] Some data is encrypted and locked. Unlock required for full access.');
            }

            // Update stores with loaded data (including locked documents with partial info)
            // The UI can display basic info (IDs, dates) even for locked documents
            // Update stores with loaded data, merging with local changes
            useTemplateStore.setState({ templates: mergeData(useTemplateStore.getState().templates, templates) });
            useCustomerStore.setState({ customers: mergeData(useCustomerStore.getState().customers, customers) });
            useProductStore.setState({ products: mergeData(useProductStore.getState().products, products) });
            useDocumentStore.setState({ documents: mergeData(useDocumentStore.getState().documents, documents) });
            useDiscountStore.setState({ discounts: mergeData(useDiscountStore.getState().discounts, discounts) });

            if (settings) {
                // Merge settings (simple merge for now, prioritizing server unless we track settings update time)
                // Settings usually don't have partial migrations, so server win is safer,
                // BUT if we just updated settings, we might lose it.
                // However, settings writes are debounced 1s, less likely to conflict.
                if (settings.company) {
                    useSettingsStore.setState({ company: settings.company });
                }
                if (settings.numbering) {
                    useSettingsStore.setState({ numbering: settings.numbering });
                }
            }

            console.log('[Firebase Sync] Data loaded successfully');

            // Small delay to let React process state updates before enabling sync
            await new Promise(resolve => setTimeout(resolve, 100));

            isLoadingFromFirestore.current = false; // Enable sync-back
            hasSynced = true;
        } catch (error) {
            console.error('[Firebase Sync] Error loading data:', error);
            // Even if load fails, mark as synced so we can start saving new changes
            // Otherwise the app remains in "read-only" mode forever
            hasSynced = true;
            isLoadingFromFirestore.current = false;
        } finally {
            syncInProgress.current = false;
        }
    }, [user]);

    // ============================================
    // SYNC TO FIRESTORE (Debounced)
    // ============================================

    const syncToFirestore = useCallback(async (
        collectionName: CollectionName,
        operation: 'create' | 'update' | 'delete',
        data: any
    ) => {
        // Don't sync during initial load or before sync is complete
        if (!user || !hasSynced || isLoadingFromFirestore.current) return;

        const operationKey = `${collectionName}-${data.id}-${operation}`;

        // Debounce rapid operations on the same document
        if (pendingOperations.current.has(operationKey)) {
            clearTimeout(pendingOperations.current.get(operationKey)!);
        }

        const timeout = setTimeout(async () => {
            pendingOperations.current.delete(operationKey);

            // Double-check we're not in loading state
            if (isLoadingFromFirestore.current) return;

            try {
                switch (operation) {
                    case 'create':
                    case 'update':
                        await createFirestoreDoc(collectionName, data);
                        break;
                    case 'delete':
                        await deleteFirestoreDoc(collectionName, data.id);
                        break;
                }
                console.log(`[Firebase Sync] ${operation} ${collectionName}/${data.id}`);
            } catch (error: any) {
                console.error(`[Firebase Sync] Error ${operation} ${collectionName}:`, error);

                // Check if error is due to encryption being locked
                if (error?.message?.includes('not unlocked')) {
                    // Import toast dynamically to avoid hook issues
                    const { toast } = await import('react-hot-toast');
                    toast.error('Unable to save: Please unlock encryption first', {
                        id: 'encryption-locked-error', // Prevent duplicate toasts
                        duration: 5000,
                        icon: '🔒',
                    });

                    // Trigger the unlock prompt by dispatching an event
                    window.dispatchEvent(new CustomEvent('encryption-unlock-required'));
                } else {
                    // Show generic sync error for other issues (like validation/undefined)
                    const { toast } = await import('react-hot-toast');
                    toast.error(`Sync failed: ${error?.message || 'Unknown error'}`, {
                        id: `sync-error-${collectionName}`,
                        duration: 4000,
                    });
                }
            }
        }, 1000); // 1000ms debounce (increased from 500ms) to prevent write exhaustion

        pendingOperations.current.set(operationKey, timeout);
    }, [user]);

    // Sync settings (special case - single document)
    const syncSettings = useCallback(async () => {
        // Don't sync during initial load or before sync is complete
        if (!user || !hasSynced || isLoadingFromFirestore.current) return;

        try {
            const settings = {
                company: settingsStore.company,
                numbering: settingsStore.numbering,
            };
            await updateUserSettings(settings);
            console.log('[Firebase Sync] Settings synced');
        } catch (error) {
            console.error('[Firebase Sync] Error syncing settings:', error);
        }
    }, [user, settingsStore.company, settingsStore.numbering]);

    // ============================================
    // INITIAL LOAD ON AUTH
    // ============================================

    useEffect(() => {
        // Wait for encryption check to complete before loading
        if (!encryptionCheckComplete) {
            console.log('[Firebase Sync] Waiting for encryption check to complete...');
            return;
        }

        // If encryption is enabled but not unlocked, don't load yet
        // The data would come back as locked anyway
        if (encryptionContext?.isEnabled && !encryptionContext?.isUnlocked) {
            console.log('[Firebase Sync] Encryption is enabled but locked, waiting for unlock...');
            return;
        }

        if (user && !hasSynced) {
            loadFromFirestore();
        }

        // Reset sync status on logout
        if (!user) {
            hasSynced = false;
        }
    }, [user, loadFromFirestore, encryptionCheckComplete, encryptionContext?.isEnabled, encryptionContext?.isUnlocked]);

    // Listen for encryption unlock event to refresh data
    useEffect(() => {
        const handleEncryptionUnlock = () => {
            console.log('[Firebase Sync] Encryption unlocked, refreshing data...');
            loadFromFirestore(true); // Force refresh to bypass syncInProgress
        };

        window.addEventListener('encryption-unlocked', handleEncryptionUnlock);
        return () => {
            window.removeEventListener('encryption-unlocked', handleEncryptionUnlock);
        };
    }, [loadFromFirestore]);

    // ============================================
    // SUBSCRIBE TO STORE CHANGES
    // ============================================

    // Templates
    useEffect(() => {
        const unsubscribe = useTemplateStore.subscribe((state, prevState) => {
            // Don't sync until initial load is complete
            if (!hasSynced) return;

            // Optimization: If array reference hasn't changed, skip expensive processing
            if (state.templates === prevState.templates) return;

            // Detect added templates
            state.templates.forEach(template => {
                const existed = prevState.templates.find(t => t.id === template.id);
                if (!existed) {
                    syncToFirestore('templates', 'create', template);
                } else if (JSON.stringify(existed) !== JSON.stringify(template)) {
                    syncToFirestore('templates', 'update', template);
                }
            });

            // Detect deleted templates
            prevState.templates.forEach(template => {
                const stillExists = state.templates.find(t => t.id === template.id);
                if (!stillExists) {
                    syncToFirestore('templates', 'delete', template);
                }
            });
        });

        return unsubscribe;
    }, [syncToFirestore]);

    // Customers
    useEffect(() => {
        const unsubscribe = useCustomerStore.subscribe((state, prevState) => {
            // Don't sync until initial load is complete
            if (!hasSynced) return;

            state.customers.forEach(customer => {
                const existed = prevState.customers.find(c => c.id === customer.id);
                if (!existed) {
                    syncToFirestore('customers', 'create', customer);
                } else if (JSON.stringify(existed) !== JSON.stringify(customer)) {
                    syncToFirestore('customers', 'update', customer);
                }
            });

            prevState.customers.forEach(customer => {
                const stillExists = state.customers.find(c => c.id === customer.id);
                if (!stillExists) {
                    syncToFirestore('customers', 'delete', customer);
                }
            });
        });

        return unsubscribe;
    }, [syncToFirestore]);

    // Products
    useEffect(() => {
        const unsubscribe = useProductStore.subscribe((state, prevState) => {
            // Don't sync until initial load is complete
            if (!hasSynced) return;

            state.products.forEach(product => {
                const existed = prevState.products.find(p => p.id === product.id);
                if (!existed) {
                    syncToFirestore('products', 'create', product);
                } else if (JSON.stringify(existed) !== JSON.stringify(product)) {
                    syncToFirestore('products', 'update', product);
                }
            });

            prevState.products.forEach(product => {
                const stillExists = state.products.find(p => p.id === product.id);
                if (!stillExists) {
                    syncToFirestore('products', 'delete', product);
                }
            });
        });

        return unsubscribe;
    }, [syncToFirestore]);

    // Documents
    useEffect(() => {
        const unsubscribe = useDocumentStore.subscribe((state, prevState) => {
            // Don't sync until initial load is complete
            if (!hasSynced) return;

            state.documents.forEach(doc => {
                const existed = prevState.documents.find(d => d.id === doc.id);
                if (!existed) {
                    syncToFirestore('documents', 'create', doc);
                } else if (JSON.stringify(existed) !== JSON.stringify(doc)) {
                    syncToFirestore('documents', 'update', doc);
                }
            });

            prevState.documents.forEach(doc => {
                const stillExists = state.documents.find(d => d.id === doc.id);
                if (!stillExists) {
                    syncToFirestore('documents', 'delete', doc);
                }
            });
        });

        return unsubscribe;
    }, [syncToFirestore]);

    // Discounts
    useEffect(() => {
        const unsubscribe = useDiscountStore.subscribe((state, prevState) => {
            // Don't sync until initial load is complete
            if (!hasSynced) return;

            state.discounts.forEach(discount => {
                const existed = prevState.discounts.find(d => d.id === discount.id);
                if (!existed) {
                    syncToFirestore('discounts', 'create', discount);
                } else if (JSON.stringify(existed) !== JSON.stringify(discount)) {
                    syncToFirestore('discounts', 'update', discount);
                }
            });

            prevState.discounts.forEach(discount => {
                const stillExists = state.discounts.find(d => d.id === discount.id);
                if (!stillExists) {
                    syncToFirestore('discounts', 'delete', discount);
                }
            });
        });

        return unsubscribe;
    }, [syncToFirestore]);

    // Settings (debounced)
    useEffect(() => {
        // Don't sync until initial load is complete
        if (!hasSynced) return;

        const timeout = setTimeout(() => {
            syncSettings();
        }, 1000); // 1 second debounce for settings

        return () => clearTimeout(timeout);
    }, [settingsStore.company, settingsStore.numbering, syncSettings]);

    return {
        isLoading: !hasSynced && !!user,
        hasSynced,
        refresh: loadFromFirestore,
    };
}
