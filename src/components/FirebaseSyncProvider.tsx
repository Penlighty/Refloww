"use client";

// Firebase Sync Provider
// Wraps the app and handles Firebase synchronization + data migration

import { useState, useEffect } from 'react';
import { useFirebaseSync } from '@/lib/hooks/useFirebaseSync';
import { useAuth } from '@/lib/contexts/AuthContext';
import { MigrationDialog } from './MigrationDialog';
import { getDocuments } from '@/lib/firebase'; // Use encrypted Firestore exports

interface FirebaseSyncProviderProps {
    children: React.ReactNode;
}

interface LocalData {
    templates: any[];
    customers: any[];
    products: any[];
    documents: any[];
    discounts: any[];
    settings: any;
}

export function FirebaseSyncProvider({ children }: FirebaseSyncProviderProps) {
    const { user } = useAuth();
    const { isLoading } = useFirebaseSync();
    const [showMigration, setShowMigration] = useState(false);
    const [localData, setLocalData] = useState<LocalData | null>(null);
    const [migrationChecked, setMigrationChecked] = useState(false);

    // Check for local data that needs migration
    useEffect(() => {
        const checkForLocalData = async () => {
            if (!user || migrationChecked) return;

            // Check if user already has data in Firestore
            try {
                const existingDocs = await getDocuments('documents');
                const existingTemplates = await getDocuments('templates');

                // If user already has cloud data, skip migration check
                if (existingDocs.length > 0 || existingTemplates.length > 0) {
                    setMigrationChecked(true);
                    return;
                }
            } catch (error) {
                // If error checking, proceed to check local data
                console.log('Error checking existing data:', error);
            }

            // Check localStorage for data
            const getLocalData = (key: string) => {
                try {
                    const data = localStorage.getItem(key);
                    if (!data) return null;
                    const parsed = JSON.parse(data);
                    return parsed.state || parsed;
                } catch {
                    return null;
                }
            };

            const templates = getLocalData('inflow-templates')?.templates || [];
            const customers = getLocalData('inflow-customers')?.customers || [];
            const products = getLocalData('inflow-products')?.products || [];
            const documents = getLocalData('inflow-documents')?.documents || [];
            const discounts = getLocalData('inflow-discounts')?.discounts || [];
            const settingsData = getLocalData('inflow-settings');
            const settings = settingsData ? {
                company: settingsData.company,
                numbering: settingsData.numbering
            } : null;

            const hasLocalData =
                templates.length > 0 ||
                customers.length > 0 ||
                products.length > 0 ||
                documents.length > 0 ||
                discounts.length > 0 ||
                settings;

            if (hasLocalData) {
                setLocalData({
                    templates,
                    customers,
                    products,
                    documents,
                    discounts,
                    settings
                });
                setShowMigration(true);
            } else {
                setMigrationChecked(true);
            }
        };

        checkForLocalData();
    }, [user, migrationChecked]);

    // Handle migration complete
    const handleMigrationComplete = () => {
        setShowMigration(false);
        setMigrationChecked(true);
        // Reload the page to fetch migrated data
        window.location.reload();
    };

    // Handle migration skip
    const handleMigrationSkip = () => {
        setShowMigration(false);
        setMigrationChecked(true);
    };

    // Show migration dialog
    if (showMigration && localData) {
        return (
            <MigrationDialog
                localData={localData}
                onComplete={handleMigrationComplete}
                onSkip={handleMigrationSkip}
            />
        );
    }

    // Show loading state while initial sync is happening
    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        Syncing your data...
                    </p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
