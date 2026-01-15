"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Button, Input } from '@/components/ui';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, Check } from 'lucide-react';

export default function SignupPage() {
    const router = useRouter();
    const { user, loading, error, signup, loginWithGoogle, clearError } = useAuth();

    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    // Redirect if already logged in
    useEffect(() => {
        if (user && !loading) {
            router.push('/');
        }
    }, [user, loading, router]);

    // Clear errors when inputs change
    useEffect(() => {
        setLocalError(null);
        clearError();
    }, [displayName, email, password, confirmPassword]);

    // Password strength check
    const passwordChecks = {
        length: password.length >= 6,
        hasLetter: /[a-zA-Z]/.test(password),
        hasNumber: /[0-9]/.test(password),
    };
    const passwordStrength = Object.values(passwordChecks).filter(Boolean).length;

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!displayName || !email || !password || !confirmPassword) {
            setLocalError('Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            setLocalError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setLocalError('Password must be at least 6 characters');
            return;
        }

        try {
            setIsSubmitting(true);
            await signup(email, password, displayName);
            router.push('/');
        } catch (err) {
            // Error is handled by AuthContext
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGoogleSignup = async () => {
        try {
            setIsSubmitting(true);
            await loginWithGoogle();
            router.push('/');
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
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 p-4">
            <div className="w-full max-w-md">
                {/* Logo/Brand */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-[#2d3748] dark:text-white">
                        Create Account
                    </h1>
                    <p className="text-neutral-500 dark:text-neutral-400 mt-2">
                        Get started with Refloww for free
                    </p>
                </div>

                {/* Signup Card */}
                <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl border border-neutral-100 dark:border-neutral-700 p-8">
                    {/* Error Message */}
                    {displayError && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-600 dark:text-red-400">{displayError}</p>
                        </div>
                    )}

                    {/* Google Sign Up */}
                    <button
                        onClick={handleGoogleSignup}
                        disabled={isSubmitting}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-xl text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Continue with Google
                    </button>

                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-neutral-200 dark:border-neutral-600"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-white dark:bg-neutral-800 text-neutral-500">or</span>
                        </div>
                    </div>

                    {/* Email Form */}
                    <form onSubmit={handleSignup} className="space-y-4">
                        <Input
                            label="Full Name"
                            type="text"
                            placeholder="John Smith"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            leftIcon={<User className="w-4 h-4" />}
                            autoComplete="name"
                        />

                        <Input
                            label="Email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            leftIcon={<Mail className="w-4 h-4" />}
                            autoComplete="email"
                        />

                        <div className="relative">
                            <Input
                                label="Password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                leftIcon={<Lock className="w-4 h-4" />}
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-9 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>

                        {/* Password Strength */}
                        {password && (
                            <div className="space-y-2">
                                <div className="flex gap-1">
                                    <div className={`h-1 flex-1 rounded ${passwordStrength >= 1 ? 'bg-red-500' : 'bg-neutral-200 dark:bg-neutral-600'}`}></div>
                                    <div className={`h-1 flex-1 rounded ${passwordStrength >= 2 ? 'bg-yellow-500' : 'bg-neutral-200 dark:bg-neutral-600'}`}></div>
                                    <div className={`h-1 flex-1 rounded ${passwordStrength >= 3 ? 'bg-green-500' : 'bg-neutral-200 dark:bg-neutral-600'}`}></div>
                                </div>
                                <div className="text-xs text-neutral-500 dark:text-neutral-400 space-y-1">
                                    <div className={`flex items-center gap-1 ${passwordChecks.length ? 'text-green-600 dark:text-green-400' : ''}`}>
                                        <Check className={`w-3 h-3 ${passwordChecks.length ? 'opacity-100' : 'opacity-30'}`} />
                                        At least 6 characters
                                    </div>
                                </div>
                            </div>
                        )}

                        <Input
                            label="Confirm Password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            leftIcon={<Lock className="w-4 h-4" />}
                            autoComplete="new-password"
                            error={confirmPassword && password !== confirmPassword ? 'Passwords do not match' : undefined}
                        />

                        <Button
                            type="submit"
                            className="w-full"
                            isLoading={isSubmitting}
                            disabled={isSubmitting}
                        >
                            Create Account
                        </Button>
                    </form>

                    {/* Terms */}
                    <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400 text-center">
                        By signing up, you agree to our{' '}
                        <Link href="/terms" className="text-blue-600 hover:underline">Terms of Service</Link>
                        {' '}and{' '}
                        <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
                    </p>
                </div>

                {/* Sign In Link */}
                <p className="text-center mt-6 text-sm text-neutral-500 dark:text-neutral-400">
                    Already have an account?{' '}
                    <Link
                        href="/login"
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                    >
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
