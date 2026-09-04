"use client";

// Firebase Sync Hook
// Handles syncing Zustand stores with Firestore when user is authenticated

import { useState, useEffect, useRef, useCallback } from 'react';
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
    subscribeToUserInvitations,
    CollectionName,
    hasLockedDocuments
} from '@/lib/firebase'; // Use encrypted Firestore exports
import {
    useTemplateStore,
    useCustomerStore,
    useProductStore,
    useDocumentStore,
    useDiscountStore,
    useSettingsStore,
    useOrganizationStore,
    useStorefrontStore
} from '@/lib/store';
import { Template, Customer, Product, Document, Discount } from '@/lib/types';

// Track if initial sync has happened
let hasSynced = false;

export function useFirebaseSync() {
    const { user } = useAuth();
    const encryptionContext = useEncryptionSafe();
    const [isSyncLoaded, setIsSyncLoaded] = useState(() => {
        if (hasSynced) return true;
        if (typeof window !== 'undefined') {
            const hasLocalDocs = localStorage.getItem('inflow-documents');
            if (hasLocalDocs) return true;
        }
        return false;
    });
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
    const company = useSettingsStore(state => state.company);
    const numbering = useSettingsStore(state => state.numbering);

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

            // Update stores with loaded data, merging with local changes
            useTemplateStore.setState({ templates: mergeData(useTemplateStore.getState().templates, templates) });
            useCustomerStore.setState({ customers: mergeData(useCustomerStore.getState().customers, customers) });
            useProductStore.setState({ products: mergeData(useProductStore.getState().products, products) });
            useDocumentStore.setState({ documents: mergeData(useDocumentStore.getState().documents, documents) });
            useDiscountStore.setState({ discounts: mergeData(useDiscountStore.getState().discounts, discounts) });

            if (settings) {
                // 1. Merge Organizations
                if (settings.organizations && Array.isArray(settings.organizations)) {
                    const localOrgs = useOrganizationStore.getState().organizations;
                    const serverOrgs = settings.organizations;
                    const mergedOrgs = mergeData(localOrgs, serverOrgs);
                    const activeOrgId = settings.activeOrganizationId || useOrganizationStore.getState().activeOrganizationId;
                    useOrganizationStore.setState({
                        organizations: mergedOrgs,
                        activeOrganizationId: activeOrgId
                    });

                    // --- MIGRATION: Push all local/legacy orgs to global organizations collection ---
                    try {
                        const { db } = await import('@/lib/firebase/config');
                        const { doc, setDoc, writeBatch } = await import('firebase/firestore');
                        for (const org of mergedOrgs) {
                            const orgRef = doc(db, 'organizations', org.id);
                            await setDoc(orgRef, {
                                name: org.name,
                                ownerEmail: org.ownerEmail,
                                createdAt: org.createdAt
                            }, { merge: true });
                            
                            if (org.members && org.members.length > 0) {
                                const batch = writeBatch(db);
                                for (const member of org.members) {
                                    batch.set(doc(db, 'organizations', org.id, 'members', member.id), member, { merge: true });
                                }
                                await batch.commit();
                            }
                        }
                        console.log('[Firebase Sync] Synced local organizations to global collection');
                    } catch (err) {
                        console.error('[Firebase Sync] Failed to sync orgs to global collection:', err);
                    }
                }

                // 2. Merge SettingsStore (company, numbering, companyMap, numberingMap, customNumberingFormatsMap)
                const settingsState = useSettingsStore.getState();
                const updatedCompanyMap = { ...settingsState.companyMap, ...(settings.companyMap || {}) };
                const updatedNumberingMap = { ...settingsState.numberingMap, ...(settings.numberingMap || {}) };
                const updatedFormatsMap = { ...settingsState.customNumberingFormatsMap, ...(settings.customNumberingFormatsMap || {}) };

                useSettingsStore.setState({
                    companyMap: updatedCompanyMap,
                    numberingMap: updatedNumberingMap,
                    customNumberingFormatsMap: updatedFormatsMap,
                    ...(settings.company ? { company: { ...settingsState.company, ...settings.company } } : {}),
                    ...(settings.numbering ? { numbering: { ...settingsState.numbering, ...settings.numbering } } : {})
                });

                const currentOrgId = useOrganizationStore.getState().activeOrganizationId;
                useSettingsStore.getState().syncSettingsForActiveOrg(currentOrgId);

                // 3. Merge StorefrontStore (settingsMap, registeredSlugs)
                if (settings.storefrontSettingsMap || settings.registeredSlugs) {
                    const storefrontState = useStorefrontStore.getState();
                    const updatedSfMap = { ...storefrontState.settingsMap, ...(settings.storefrontSettingsMap || {}) };
                    const updatedSlugs = Array.from(new Set([...(storefrontState.registeredSlugs || []), ...(settings.registeredSlugs || [])]));

                    useStorefrontStore.setState({
                        settingsMap: updatedSfMap,
                        registeredSlugs: updatedSlugs
                    });
                    useStorefrontStore.getState().syncSettingsForActiveOrg(currentOrgId);
                }
            }

            console.log('[Firebase Sync] Data loaded successfully');

            // Small delay to let React process state updates before enabling sync
            await new Promise(resolve => setTimeout(resolve, 100));

            isLoadingFromFirestore.current = false; // Enable sync-back
            hasSynced = true;
            setIsSyncLoaded(true);
        } catch (error) {
            console.error('[Firebase Sync] Error loading data:', error);
            hasSynced = true;
            setIsSyncLoaded(true);
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
                    const { toast } = await import('react-hot-toast');
                    toast.error('Unable to save: Please unlock encryption first', {
                        id: 'encryption-locked-error',
                        duration: 5000,
                        icon: '🔒',
                    });

                    window.dispatchEvent(new CustomEvent('encryption-unlock-required'));
                } else {
                    const { toast } = await import('react-hot-toast');
                    toast.error(`Sync failed: ${error?.message || 'Unknown error'}`, {
                        id: `sync-error-${collectionName}`,
                        duration: 4000,
                    });
                }
            }
        }, 1000);

        pendingOperations.current.set(operationKey, timeout);
    }, [user]);

    // Sync settings & organizations to Firestore
    const syncSettings = useCallback(async () => {
        // Don't sync during initial load or before sync is complete
        if (!user || !hasSynced || isLoadingFromFirestore.current) return;

        try {
            const orgState = useOrganizationStore.getState();
            const settingsState = useSettingsStore.getState();
            const sfState = useStorefrontStore.getState();

            const settings = JSON.parse(JSON.stringify({
                company: settingsState.company,
                companyMap: settingsState.companyMap,
                numbering: settingsState.numbering,
                numberingMap: settingsState.numberingMap,
                customNumberingFormatsMap: settingsState.customNumberingFormatsMap,
                organizations: orgState.organizations,
                activeOrganizationId: orgState.activeOrganizationId,
                storefrontSettingsMap: sfState.settingsMap,
                registeredSlugs: sfState.registeredSlugs
            }));

            await updateUserSettings(settings);
            console.log('[Firebase Sync] Settings & Organizations synced successfully to cloud');
        } catch (error: any) {
            console.error('[Firebase Sync] Error syncing settings:', error);
            const errMsg = error?.message || '';
            if (!errMsg.includes('FIRESTORE') && !errMsg.includes('UNHANDLED EXCEPTION')) {
                const { toast } = await import('react-hot-toast');
                toast.error(`Failed to sync settings with cloud: ${errMsg}`, {
                    id: 'settings-sync-error',
                    duration: 5000
                });
            }
        }
    }, [user]);

    // ============================================
    // INITIAL LOAD ON AUTH
    // ============================================

    useEffect(() => {
        // Wait for encryption check to complete before loading
        if (!encryptionCheckComplete) {
            console.log('[Firebase Sync] Waiting for encryption check to complete...');
            return;
        }

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
            setIsSyncLoaded(false);
        }
    }, [user, loadFromFirestore, encryptionCheckComplete, encryptionContext?.isEnabled, encryptionContext?.isUnlocked]);

    // Listen for encryption unlock event to refresh data
    useEffect(() => {
        const handleEncryptionUnlock = () => {
            console.log('[Firebase Sync] Encryption unlocked, refreshing data...');
            loadFromFirestore(true);
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
            if (!hasSynced) return;
            if (state.templates === prevState.templates) return;

            state.templates.forEach(template => {
                const existed = prevState.templates.find(t => t.id === template.id);
                if (!existed) {
                    syncToFirestore('templates', 'create', template);
                } else if (JSON.stringify(existed) !== JSON.stringify(template)) {
                    syncToFirestore('templates', 'update', template);
                }
            });

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
        const unsubscribe = useCustomerStore.subscribe((state: any, prevState: any) => {
            if (!hasSynced) return;

            (state.customers || []).forEach((customer: Customer) => {
                const existed = (prevState.customers || []).find((c: Customer) => c.id === customer.id);
                if (!existed) {
                    syncToFirestore('customers', 'create', customer);
                } else if (JSON.stringify(existed) !== JSON.stringify(customer)) {
                    syncToFirestore('customers', 'update', customer);
                }
            });

            (prevState.customers || []).forEach((customer: Customer) => {
                const stillExists = (state.customers || []).find((c: Customer) => c.id === customer.id);
                if (!stillExists) {
                    syncToFirestore('customers', 'delete', customer);
                }
            });
        });

        return unsubscribe;
    }, [syncToFirestore]);

    // Products
    useEffect(() => {
        const unsubscribe = useProductStore.subscribe((state: any, prevState: any) => {
            if (!hasSynced) return;

            (state.products || []).forEach((product: Product) => {
                const existed = (prevState.products || []).find((p: Product) => p.id === product.id);
                if (!existed) {
                    syncToFirestore('products', 'create', product);
                } else if (JSON.stringify(existed) !== JSON.stringify(product)) {
                    syncToFirestore('products', 'update', product);
                }
            });

            (prevState.products || []).forEach((product: Product) => {
                const stillExists = (state.products || []).find((p: Product) => p.id === product.id);
                if (!stillExists) {
                    syncToFirestore('products', 'delete', product);
                }
            });
        });

        return unsubscribe;
    }, [syncToFirestore]);

    // Documents
    useEffect(() => {
        const unsubscribe = useDocumentStore.subscribe((state: any, prevState: any) => {
            if (!hasSynced) return;

            (state.documents || []).forEach((doc: Document) => {
                const existed = (prevState.documents || []).find((d: Document) => d.id === doc.id);
                if (!existed) {
                    syncToFirestore('documents', 'create', doc);
                } else if (JSON.stringify(existed) !== JSON.stringify(doc)) {
                    syncToFirestore('documents', 'update', doc);
                }
            });

            (prevState.documents || []).forEach((doc: Document) => {
                const stillExists = (state.documents || []).find((d: Document) => d.id === doc.id);
                if (!stillExists) {
                    syncToFirestore('documents', 'delete', doc);
                }
            });
        });

        return unsubscribe;
    }, [syncToFirestore]);

    // Discounts
    useEffect(() => {
        const unsubscribe = useDiscountStore.subscribe((state: any, prevState: any) => {
            if (!hasSynced) return;

            (state.discounts || []).forEach((discount: Discount) => {
                const existed = (prevState.discounts || []).find((d: Discount) => d.id === discount.id);
                if (!existed) {
                    syncToFirestore('discounts', 'create', discount);
                } else if (JSON.stringify(existed) !== JSON.stringify(discount)) {
                    syncToFirestore('discounts', 'update', discount);
                }
            });

            (prevState.discounts || []).forEach((discount: Discount) => {
                const stillExists = (state.discounts || []).find((d: Discount) => d.id === discount.id);
                if (!stillExists) {
                    syncToFirestore('discounts', 'delete', discount);
                }
            });
        });

        return unsubscribe;
    }, [syncToFirestore]);

    // Settings (debounced)
    useEffect(() => {
        if (!isSyncLoaded) return;

        const timeout = setTimeout(() => {
            syncSettings();
        }, 1000);

        return () => clearTimeout(timeout);
    }, [company, numbering, syncSettings, isSyncLoaded]);

    // Organization Store Subscription
    useEffect(() => {
        const unsubscribe = useOrganizationStore.subscribe(() => {
            if (!isSyncLoaded) return;
            const timeout = setTimeout(() => {
                syncSettings();
            }, 1000);
            return () => clearTimeout(timeout);
        });
        return unsubscribe;
    }, [syncSettings, isSyncLoaded]);

    // Storefront Store Subscription
    useEffect(() => {
        const unsubscribe = useStorefrontStore.subscribe(() => {
            if (!isSyncLoaded) return;
            const timeout = setTimeout(() => {
                syncSettings();
            }, 1000);
            return () => clearTimeout(timeout);
        });
        return unsubscribe;
    }, [syncSettings, isSyncLoaded]);

    // Real-time Organization Invitations Subscription
    useEffect(() => {
        if (!user?.email) return;

        const unsubscribe = subscribeToUserInvitations(user.email, (invitations: any[]) => {
            useOrganizationStore.getState().setPendingInvitations(invitations as any);

            if (invitations.length > 0) {
                import('react-hot-toast').then(({ toast }) => {
                    toast.success(`You have ${invitations.length} pending organization invitation(s)!`, {
                        id: 'pending-org-invite-alert',
                        duration: 6000,
                        icon: '🏢'
                    });
                });
            }
        });

        return unsubscribe;
    }, [user?.email]);

    return {
        isLoading: !isSyncLoaded && !!user,
        hasSynced: isSyncLoaded,
        refresh: loadFromFirestore,
    };
}


