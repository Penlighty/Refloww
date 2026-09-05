"use client";

// Data Migration Dialog
// Helps users migrate their localStorage data to Firebase on first login

import { useState } from 'react';
import { Button } from '@/components/ui';
import { Upload, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
    batchWrite,
    updateUserSettings
} from '@/lib/firebase'; // Use encrypted Firestore exports
import { Template, Customer, Product, Document, Discount, DocumentType } from '@/lib/types';
import { compressImageFromDataUrl } from '@/lib/utils/image-utils';

interface MigrationDialogProps {
    localData: {
        templates: Template[];
        customers: Customer[];
        products: Product[];
        documents: Document[];
        discounts: Discount[];
        settings: any;
    };
    onComplete: () => void;
    onSkip: () => void;
}

export function MigrationDialog({ localData, onComplete, onSkip }: MigrationDialogProps) {
    const { user } = useAuth();
    const [status, setStatus] = useState<'idle' | 'migrating' | 'success' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);

    const totalItems =
        localData.templates.length +
        localData.customers.length +
        localData.products.length +
        localData.documents.length +
        localData.discounts.length +
        (localData.settings ? 1 : 0);

    const handleMigrate = async () => {
        if (!user) return;

        setStatus('migrating');
        setError(null);
        setProgress(0);

        try {
            // Ensure root user document exists in Firestore before writing subcollections
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) {
                await setDoc(userRef, {
                    email: user.email || '',
                    displayName: user.displayName || user.email?.split('@')[0] || 'User',
                    photoURL: user.photoURL || null,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                }, { merge: true });
            }
            // Migrate templates (with image compression)
            if (localData.templates.length > 0) {
                // Compress images for each template before migration
                const compressedTemplates = await Promise.all(
                    localData.templates.map(async (template) => {
                        const compressed = { ...template };

                        // Compress main imageUrl
                        if (compressed.imageUrl) {
                            compressed.imageUrl = await compressImageFromDataUrl(compressed.imageUrl);
                        }

                        // Compress coverImage
                        if (compressed.coverImage) {
                            compressed.coverImage = await compressImageFromDataUrl(compressed.coverImage);
                        }

                        // Compress variant images
                        if (compressed.variants) {
                            const variantTypes: DocumentType[] = ['invoice', 'receipt', 'delivery-note'];
                            for (const variantType of variantTypes) {
                                const variant = compressed.variants[variantType];
                                if (variant?.imageUrl) {
                                    variant.imageUrl = await compressImageFromDataUrl(variant.imageUrl);
                                }
                            }
                        }

                        return compressed;
                    })
                );

                await batchWrite('templates', compressedTemplates);
                setProgress(p => p + localData.templates.length);
            }

            // Migrate customers
            if (localData.customers.length > 0) {
                await batchWrite('customers', localData.customers);
                setProgress(p => p + localData.customers.length);
            }

            // Migrate products
            if (localData.products.length > 0) {
                await batchWrite('products', localData.products);
                setProgress(p => p + localData.products.length);
            }

            // Migrate documents
            if (localData.documents.length > 0) {
                await batchWrite('documents', localData.documents);
                setProgress(p => p + localData.documents.length);
            }

            // Migrate discounts
            if (localData.discounts.length > 0) {
                await batchWrite('discounts', localData.discounts);
                setProgress(p => p + localData.discounts.length);
            }

            // Migrate settings
            if (localData.settings) {
                await updateUserSettings(localData.settings);
                setProgress(p => p + 1);
            }

            setStatus('success');

            // Clear localStorage after successful migration
            localStorage.removeItem('inflow-templates');
            localStorage.removeItem('inflow-customers');
            localStorage.removeItem('inflow-products');
            localStorage.removeItem('inflow-documents');
            localStorage.removeItem('inflow-discounts');
            localStorage.removeItem('inflow-settings-storage');

            setTimeout(onComplete, 1500);
        } catch (err: any) {
            console.error('Migration error:', err);
            setStatus('error');
            setError(err.message || 'An error occurred during migration');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
                {status === 'idle' && (
                    <>
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                <Upload className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h2 className="text-xl font-bold text-[#2d3748] dark:text-white mb-2">
                                Migrate Your Data
                            </h2>
                            <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                                We found existing data on this device. Would you like to migrate it to your cloud account?
                            </p>
                        </div>

                        {/* Data Summary */}
                        <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-xl p-4 mb-6">
                            <p className="text-sm font-medium text-[#2d3748] dark:text-white mb-2">
                                Data to migrate:
                            </p>
                            <ul className="space-y-1 text-sm text-neutral-600 dark:text-neutral-300">
                                {localData.templates.length > 0 && (
                                    <li>• {localData.templates.length} template{localData.templates.length !== 1 ? 's' : ''}</li>
                                )}
                                {localData.customers.length > 0 && (
                                    <li>• {localData.customers.length} customer{localData.customers.length !== 1 ? 's' : ''}</li>
                                )}
                                {localData.products.length > 0 && (
                                    <li>• {localData.products.length} product{localData.products.length !== 1 ? 's' : ''}</li>
                                )}
                                {localData.documents.length > 0 && (
                                    <li>• {localData.documents.length} document{localData.documents.length !== 1 ? 's' : ''}</li>
                                )}
                                {localData.discounts.length > 0 && (
                                    <li>• {localData.discounts.length} discount{localData.discounts.length !== 1 ? 's' : ''}</li>
                                )}
                                {localData.settings && (
                                    <li>• Company settings</li>
                                )}
                            </ul>
                        </div>

                        <div className="flex gap-3">
                            <Button variant="outline" onClick={onSkip} className="flex-1">
                                Skip
                            </Button>
                            <Button onClick={handleMigrate} className="flex-1">
                                Migrate Data
                            </Button>
                        </div>
                    </>
                )}

                {status === 'migrating' && (
                    <div className="text-center py-8">
                        <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
                        <h2 className="text-xl font-bold text-[#2d3748] dark:text-white mb-2">
                            Migrating...
                        </h2>
                        <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-4">
                            Please wait while we transfer your data to the cloud.
                        </p>
                        <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                            <div
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${(progress / totalItems) * 100}%` }}
                            />
                        </div>
                        <p className="text-xs text-neutral-400 mt-2">
                            {progress} of {totalItems} items
                        </p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                        </div>
                        <h2 className="text-xl font-bold text-[#2d3748] dark:text-white mb-2">
                            Migration Complete!
                        </h2>
                        <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                            Your data has been successfully migrated to the cloud.
                        </p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                        </div>
                        <h2 className="text-xl font-bold text-[#2d3748] dark:text-white mb-2">
                            Migration Failed
                        </h2>
                        <p className="text-red-500 text-sm mb-4">
                            {error}
                        </p>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={onSkip} className="flex-1">
                                Skip for Now
                            </Button>
                            <Button onClick={handleMigrate} className="flex-1">
                                Try Again
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
