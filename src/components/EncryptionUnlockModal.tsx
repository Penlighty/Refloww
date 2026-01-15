"use client";

import { useState } from 'react';
import { Lock, Key, Eye, EyeOff, RefreshCw, ShieldCheck, Info } from 'lucide-react';
import { Button, Input, Modal, ModalFooter } from '@/components/ui';
import { useEncryption } from '@/contexts/EncryptionContext';
import { toast } from 'react-hot-toast';

export default function EncryptionUnlockModal() {
    const {
        showUnlockPrompt,
        setShowUnlockPrompt,
        unlock,
        isLoading,
        setPendingAction
    } = useEncryption();

    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    const handleUnlock = async () => {
        if (!password) {
            setError('Please enter your password');
            return;
        }

        setError('');
        const success = await unlock(password);

        if (success) {
            setPassword('');
            toast.success('Data unlocked successfully!');
        } else {
            setError('Incorrect password. Please try again.');
        }
    };

    const handleClose = () => {
        setShowUnlockPrompt(false);
        setPendingAction(null);
        setPassword('');
        setError('');
    };

    return (
        <Modal
            isOpen={showUnlockPrompt}
            onClose={handleClose}
            title="Welcome Back!"
            size="sm"
        >
            <div className="space-y-4">
                {/* Friendly welcome message */}
                <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                            Your data is protected
                        </p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                            Enter your encryption password to access your data.
                        </p>
                    </div>
                </div>

                {/* Password input */}
                <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Encryption Password
                    </label>
                    <div className="relative">
                        <Input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setError('');
                            }}
                            placeholder="Enter your encryption password"
                            leftIcon={<Key className="w-4 h-4 text-neutral-400" />}
                            onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                            autoFocus
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    {error && (
                        <p className="text-xs text-red-500 mt-1">{error}</p>
                    )}
                </div>

                {/* Password reminder info */}
                <div className="flex items-start gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p>
                        This prompt appears periodically to help you remember your encryption password.
                        <strong className="text-neutral-600 dark:text-neutral-300"> There is no password recovery</strong> —
                        if forgotten, your encrypted data cannot be accessed.
                    </p>
                </div>
            </div>

            <ModalFooter>
                <Button
                    variant="ghost"
                    onClick={handleClose}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleUnlock}
                    disabled={!password || isLoading}
                    leftIcon={isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                >
                    {isLoading ? 'Unlocking...' : 'Unlock'}
                </Button>
            </ModalFooter>
        </Modal>
    );
}
