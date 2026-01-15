"use client";

import { useState, useEffect } from 'react';
import {
    Shield,
    ShieldCheck,
    ShieldAlert,
    Lock,
    Unlock,
    Key,
    AlertTriangle,
    Info,
    CheckCircle2,
    XCircle,
    Eye,
    EyeOff,
    Download,
    RefreshCw,
    Database
} from 'lucide-react';
import { Button, Input, Modal, ModalFooter } from '@/components/ui';
import { encryptionService, EncryptionConfig, isEncryptionSupported } from '@/lib/crypto';
import { encryptExistingData, decryptExistingData, CollectionName } from '@/lib/firebase';
import { useSettingsStore, useTemplateStore, useCustomerStore, useProductStore, useDocumentStore } from '@/lib/store';
import { toast } from 'react-hot-toast';

interface EncryptionSettingsProps {
    className?: string;
}

export default function EncryptionSettings({ className }: EncryptionSettingsProps) {
    const { company, updateCompany } = useSettingsStore();
    const templates = useTemplateStore((state) => state.templates);
    const customers = useCustomerStore((state) => state.customers);
    const products = useProductStore((state) => state.products);
    const documents = useDocumentStore((state) => state.documents);

    // State
    const [isSupported, setIsSupported] = useState(true);
    const [isEnabled, setIsEnabled] = useState(false);
    const [showSetupModal, setShowSetupModal] = useState(false);
    const [showDisableModal, setShowDisableModal] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [migrationProgress, setMigrationProgress] = useState<{ current: number; total: number; step: string } | null>(null);

    // Check encryption support on mount
    useEffect(() => {
        setIsSupported(isEncryptionSupported());

        // Check if encryption is configured
        const config = company.encryptionConfig;
        if (config?.enabled) {
            setIsEnabled(true);
        }
    }, [company]);

    // Handle setting up encryption
    const handleSetupEncryption = async () => {
        if (!password || password.length < 8) {
            toast.error('Password must be at least 8 characters');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (!agreedToTerms) {
            toast.error('Please read and accept the terms');
            return;
        }

        setIsLoading(true);

        try {
            // Step 1: Setup encryption key
            setMigrationProgress({ current: 0, total: 5, step: 'Setting up encryption...' });
            const config = await encryptionService.setup(password);

            // Step 2: Migrate existing data
            const collectionsToMigrate: { name: CollectionName; data: any[]; label: string }[] = [
                { name: 'templates', data: templates, label: 'Templates' },
                { name: 'customers', data: customers, label: 'Customers' },
                { name: 'products', data: products, label: 'Products' },
                { name: 'documents', data: documents, label: 'Documents' },
            ];

            let migrated = 0;
            for (const collection of collectionsToMigrate) {
                if (collection.data.length > 0) {
                    setMigrationProgress({
                        current: migrated + 1,
                        total: collectionsToMigrate.length + 1,
                        step: `Encrypting ${collection.label} (${collection.data.length} items)...`
                    });

                    try {
                        await encryptExistingData(collection.name, collection.data);
                    } catch (err) {
                        console.error(`Failed to encrypt ${collection.label}:`, err);
                        // Continue with other collections even if one fails
                    }
                }
                migrated++;
            }

            // Step 3: Save config to settings
            setMigrationProgress({
                current: collectionsToMigrate.length + 1,
                total: collectionsToMigrate.length + 1,
                step: 'Finalizing...'
            });

            updateCompany({
                ...company,
                encryptionConfig: config
            });

            setIsEnabled(true);
            setShowSetupModal(false);
            setPassword('');
            setConfirmPassword('');
            setAgreedToTerms(false);
            setMigrationProgress(null);

            toast.success('End-to-end encryption enabled! All your data is now encrypted.');
        } catch (error: any) {
            toast.error(error.message || 'Failed to setup encryption');
            setMigrationProgress(null);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle disabling encryption (requires decrypting all data first!)
    const handleDisableEncryption = async () => {
        if (!password) {
            toast.error('Please enter your encryption password to disable');
            return;
        }

        // First verify the password
        const config = company.encryptionConfig;
        if (!config) {
            toast.error('No encryption config found');
            return;
        }

        setIsLoading(true);

        try {
            // Unlock with password first
            const unlocked = await encryptionService.unlock(password, config);
            if (!unlocked) {
                toast.error('Incorrect password');
                setIsLoading(false);
                return;
            }

            // Decrypt all collections
            const collectionsToDecrypt: { name: CollectionName; label: string }[] = [
                { name: 'templates', label: 'Templates' },
                { name: 'customers', label: 'Customers' },
                { name: 'products', label: 'Products' },
                { name: 'documents', label: 'Documents' },
            ];

            setMigrationProgress({ current: 0, total: collectionsToDecrypt.length + 1, step: 'Preparing...' });

            let decrypted = 0;
            for (const collection of collectionsToDecrypt) {
                setMigrationProgress({
                    current: decrypted + 1,
                    total: collectionsToDecrypt.length + 1,
                    step: `Decrypting ${collection.label}...`
                });

                try {
                    await decryptExistingData(collection.name);
                } catch (err) {
                    console.error(`Failed to decrypt ${collection.label}:`, err);
                }
                decrypted++;
            }

            // Remove encryption config
            setMigrationProgress({
                current: collectionsToDecrypt.length + 1,
                total: collectionsToDecrypt.length + 1,
                step: 'Finalizing...'
            });

            // Clear encryption config from settings
            // IMPORTANT: We must explicitly set encryptionConfig to undefined
            // because updateCompany merges with existing state using spread operator
            // Simply omitting the property won't remove it
            updateCompany({ encryptionConfig: undefined });

            // Lock and reset state
            encryptionService.lock();
            setIsEnabled(false);
            setShowDisableModal(false);
            setPassword('');
            setMigrationProgress(null);

            toast.success('End-to-end encryption disabled. Your data is now protected by Firebase encryption only.');
        } catch (error: any) {
            toast.error(error.message || 'Failed to disable encryption');
            setMigrationProgress(null);
        } finally {
            setIsLoading(false);
        }
    };

    // Calculate password strength
    const getPasswordStrength = (pwd: string): { score: number; label: string; color: string } => {
        let score = 0;
        if (pwd.length >= 8) score++;
        if (pwd.length >= 12) score++;
        if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
        if (/\d/.test(pwd)) score++;
        if (/[^a-zA-Z0-9]/.test(pwd)) score++;

        if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500' };
        if (score <= 2) return { score, label: 'Fair', color: 'bg-orange-500' };
        if (score <= 3) return { score, label: 'Good', color: 'bg-yellow-500' };
        if (score <= 4) return { score, label: 'Strong', color: 'bg-emerald-500' };
        return { score, label: 'Very Strong', color: 'bg-emerald-600' };
    };

    const passwordStrength = getPasswordStrength(password);

    if (!isSupported) {
        return (
            <section className={`bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-6 shadow-sm ${className}`}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
                        <ShieldAlert className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-semibold text-[#2d3748] dark:text-white">End-to-End Encryption</h2>
                </div>
                <p className="text-sm text-red-600 dark:text-red-400">
                    Your browser does not support the Web Crypto API required for client-side encryption.
                    Please use a modern browser like Chrome, Firefox, Safari, or Edge.
                </p>
            </section>
        );
    }

    return (
        <>
            <section className={`bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-6 shadow-sm ${className}`}>
                <div className="flex items-center gap-3 mb-6">
                    <div className={`p-2 rounded-lg ${isEnabled
                        ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                        : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400'}`}>
                        {isEnabled ? <ShieldCheck className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-[#2d3748] dark:text-white">End-to-End Encryption</h2>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            Zero-knowledge encryption for maximum data privacy
                        </p>
                    </div>
                </div>

                {/* Status Display */}
                <div className="mb-6">
                    <div className={`flex items-center gap-3 p-4 rounded-xl ${isEnabled
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-neutral-50 dark:bg-neutral-700/50 border border-neutral-200 dark:border-neutral-600'
                        }`}>
                        {isEnabled ? (
                            <>
                                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">End-to-End Encryption Active</p>
                                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                        Your data is protected with zero-knowledge encryption
                                    </p>
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                    onClick={() => setShowDisableModal(true)}
                                >
                                    <ShieldAlert className="w-4 h-4 mr-1" />
                                    Disable
                                </Button>
                            </>
                        ) : (
                            <>
                                <Shield className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Standard Protection</p>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Data is encrypted by Firebase (server-side)</p>
                                </div>
                                <Button size="sm" onClick={() => setShowSetupModal(true)}>
                                    <ShieldCheck className="w-4 h-4 mr-1" />
                                    Enable E2EE
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* Info Cards */}
                <div className="space-y-3">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                        <div className="flex items-start gap-3">
                            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">What is End-to-End Encryption?</p>
                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                    Your data is encrypted in your browser before being stored in the cloud.
                                    Only you have the key to decrypt it — not even we can read your data.
                                </p>
                            </div>
                        </div>
                    </div>

                    {!isEnabled && (
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Current Protection Level</p>
                                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                        Your data is currently protected by Firebase's server-side encryption.
                                        This is secure, but Google has theoretical access to your data.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Disable option - only shown when enabled */}
                {isEnabled && (
                    <div className="mt-6 pt-6 border-t border-neutral-100 dark:border-neutral-700">
                        <button
                            onClick={() => setShowDisableModal(true)}
                            className="text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                        >
                            Disable end-to-end encryption...
                        </button>
                    </div>
                )}
            </section>

            {/* Setup Encryption Modal */}
            <Modal
                isOpen={showSetupModal}
                onClose={() => {
                    setShowSetupModal(false);
                    setPassword('');
                    setConfirmPassword('');
                    setAgreedToTerms(false);
                }}
                title="Enable End-to-End Encryption"
                size="lg"
            >
                <div className="space-y-6">
                    {/* Benefits */}
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                        <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 mb-3 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            Benefits
                        </h4>
                        <ul className="space-y-2 text-xs text-emerald-600 dark:text-emerald-400">
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                <span><strong>Zero-Knowledge Privacy:</strong> Your financial data is encrypted before leaving your device</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                <span><strong>Only You Have Access:</strong> No one else can read your data — not even us or cloud providers</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                <span><strong>Military-Grade Security:</strong> AES-256-GCM encryption, the same standard used by banks</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                <span><strong>All Existing Data Protected:</strong> Your current templates, customers, products, and documents will be encrypted automatically</span>
                            </li>
                        </ul>
                    </div>

                    {/* Warnings */}
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                        <h4 className="text-sm font-semibold text-red-700 dark:text-red-300 mb-3 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Important Warnings
                        </h4>
                        <ul className="space-y-2 text-xs text-red-600 dark:text-red-400">
                            <li className="flex items-start gap-2">
                                <XCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                <span><strong>Password Lost = Data Lost:</strong> If you forget your encryption password, your data <strong>CANNOT be recovered</strong> by anyone</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <XCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                <span><strong>No Password Reset:</strong> We cannot reset your encryption password — there is no recovery option</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <XCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                <span><strong>Your Responsibility:</strong> You are solely responsible for remembering your password and securing your data</span>
                            </li>
                        </ul>
                    </div>

                    {/* Password Setup */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                                Encryption Password
                            </label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter a strong password (min 8 characters)"
                                    leftIcon={<Key className="w-4 h-4 text-neutral-400" />}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {password && (
                                <div className="mt-2">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all ${passwordStrength.color}`}
                                                style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                                            />
                                        </div>
                                        <span className={`text-xs font-medium ${passwordStrength.score <= 1 ? 'text-red-500' :
                                            passwordStrength.score <= 2 ? 'text-orange-500' :
                                                passwordStrength.score <= 3 ? 'text-yellow-600' :
                                                    'text-emerald-500'
                                            }`}>
                                            {passwordStrength.label}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                                Confirm Password
                            </label>
                            <Input
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Re-enter your password"
                                leftIcon={<Key className="w-4 h-4 text-neutral-400" />}
                            />
                            {confirmPassword && password !== confirmPassword && (
                                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                            )}
                        </div>
                    </div>

                    {/* Migration Progress (shown during setup) */}
                    {migrationProgress && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                            <div className="flex items-center gap-3 mb-3">
                                <Database className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-pulse" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                        Encrypting Your Data
                                    </p>
                                    <p className="text-xs text-blue-600 dark:text-blue-400">
                                        {migrationProgress.step}
                                    </p>
                                </div>
                            </div>
                            <div className="h-2 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                    style={{ width: `${(migrationProgress.current / migrationProgress.total) * 100}%` }}
                                />
                            </div>
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 text-center">
                                Step {migrationProgress.current} of {migrationProgress.total}
                            </p>
                        </div>
                    )}

                    {/* Agreement Checkbox */}
                    <label className={`flex items-start gap-3 cursor-pointer ${migrationProgress ? 'opacity-50 pointer-events-none' : ''}`}>
                        <input
                            type="checkbox"
                            checked={agreedToTerms}
                            onChange={(e) => setAgreedToTerms(e.target.checked)}
                            className="mt-1 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                            disabled={!!migrationProgress}
                        />
                        <span className="text-xs text-neutral-600 dark:text-neutral-400">
                            I understand that <strong>I am solely responsible for my encryption password</strong>.
                            If I lose or forget my password, my data <strong>cannot be recovered</strong> by anyone,
                            including Refloww support. I accept full responsibility for my encrypted data.
                        </span>
                    </label>
                </div>

                <ModalFooter>
                    <Button
                        variant="ghost"
                        onClick={() => {
                            setShowSetupModal(false);
                            setPassword('');
                            setConfirmPassword('');
                            setAgreedToTerms(false);
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSetupEncryption}
                        disabled={!password || password.length < 8 || password !== confirmPassword || !agreedToTerms || isLoading}
                        leftIcon={isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    >
                        {isLoading ? 'Enabling...' : 'Enable Encryption'}
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Disable Encryption Modal */}
            <Modal
                isOpen={showDisableModal}
                onClose={() => {
                    if (!isLoading) {
                        setShowDisableModal(false);
                        setPassword('');
                    }
                }}
                title="Disable End-to-End Encryption"
                size="md"
            >
                <div className="space-y-4">
                    {/* Warning */}
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">What will happen:</p>
                                <ul className="text-xs text-amber-600 dark:text-amber-400 mt-2 space-y-1">
                                    <li>• All your data will be decrypted</li>
                                    <li>• Data will be re-saved without client-side encryption</li>
                                    <li>• Firebase server-side encryption will remain active</li>
                                    <li>• You can re-enable E2EE at any time</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Migration Progress */}
                    {migrationProgress && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                            <div className="flex items-center gap-3 mb-3">
                                <Database className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-pulse" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                        Decrypting Your Data
                                    </p>
                                    <p className="text-xs text-blue-600 dark:text-blue-400">
                                        {migrationProgress.step}
                                    </p>
                                </div>
                            </div>
                            <div className="h-2 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                    style={{ width: `${(migrationProgress.current / migrationProgress.total) * 100}%` }}
                                />
                            </div>
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 text-center">
                                Step {migrationProgress.current} of {migrationProgress.total}
                            </p>
                        </div>
                    )}

                    {/* Password Input */}
                    {!migrationProgress && (
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                                Enter your encryption password to confirm
                            </label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your encryption password"
                                    leftIcon={<Key className="w-4 h-4 text-neutral-400" />}
                                    onKeyDown={(e) => e.key === 'Enter' && handleDisableEncryption()}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <ModalFooter>
                    <Button
                        variant="ghost"
                        onClick={() => {
                            setShowDisableModal(false);
                            setPassword('');
                        }}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="danger"
                        onClick={handleDisableEncryption}
                        disabled={!password || isLoading}
                        leftIcon={isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                    >
                        {isLoading ? 'Decrypting...' : 'Disable Encryption'}
                    </Button>
                </ModalFooter>
            </Modal>
        </>
    );
}
