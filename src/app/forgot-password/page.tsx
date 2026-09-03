"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Button, Input } from '@/components/ui';
import { Mail, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const { user, loading, error, forgotPassword, clearError } = useAuth();

    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    // Redirect if already logged in
    useEffect(() => {
        if (user && !loading) {
            router.push('/');
        }
    }, [user, loading, router]);

    // Clear errors when input changes
    useEffect(() => {
        setLocalError(null);
        clearError();
    }, [email]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email) {
            setLocalError('Please enter your email address');
            return;
        }

        try {
            setIsSubmitting(true);
            await forgotPassword(email);
            setSuccess(true);
        } catch (err) {
            // Error is handled by AuthContext
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 mb-4"></div>
                    <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
                </div>
            </div>
        );
    }

    const displayError = localError || error;

    return (
        <div className="w-full min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 p-4">
            <div className="w-full max-w-md">
                {/* Back Link */}
                <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to login
                </Link>

                {/* Header */}
                <div className="text-center mb-8 flex flex-col items-center">
                    <div className="h-10 mb-3 flex items-center justify-center">
                        <img
                            src="/logo/refloww-full-orange.svg"
                            alt="Refloww Logo"
                            className="h-8 w-auto object-contain"
                        />
                    </div>
                    <h1 className="text-3xl font-bold text-[#2d3748] dark:text-white">
                        Reset Password
                    </h1>
                    <p className="text-neutral-500 dark:text-neutral-400 mt-2">
                        Enter your email and we'll send you a reset link
                    </p>
                </div>

                {/* Card */}
                <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl border border-neutral-100 dark:border-neutral-700 p-8">
                    {success ? (
                        // Success State
                        <div className="text-center py-4">
                            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                            </div>
                            <h2 className="text-xl font-semibold text-[#2d3748] dark:text-white mb-2">
                                Check your email
                            </h2>
                            <p className="text-neutral-500 dark:text-neutral-400 mb-6">
                                We've sent a password reset link to<br />
                                <strong className="text-[#2d3748] dark:text-white">{email}</strong>
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSuccess(false);
                                    setEmail('');
                                }}
                            >
                                Send another link
                            </Button>
                        </div>
                    ) : (
                        <>
                            {/* Error Message */}
                            {displayError && (
                                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-600 dark:text-red-400">{displayError}</p>
                                </div>
                            )}

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <Input
                                    label="Email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    leftIcon={<Mail className="w-4 h-4" />}
                                    autoComplete="email"
                                />

                                <Button
                                    type="submit"
                                    className="w-full"
                                    isLoading={isSubmitting}
                                    disabled={isSubmitting}
                                >
                                    Send Reset Link
                                </Button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
