"use client";

import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { isUserAdmin } from '@/lib/firebase/admin';
import { ShieldAlert, RefreshCw } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function checkAdminAccess() {
            if (authLoading) return;

            if (!user) {
                router.push('/login?redirect=/admin');
                return;
            }

            setCheckingAuth(true);
            setError(null);

            try {
                // Check if user has admin role in Firestore
                const hasAccess = await isUserAdmin(user.uid);

                if (hasAccess) {
                    setIsAuthorized(true);
                } else {
                    router.push('/');
                }
            } catch (err) {
                console.error('Error checking admin access:', err);
                router.push('/');
            } finally {
                setCheckingAuth(false);
            }
        }

        checkAdminAccess();
    }, [user, authLoading, router]);

    // Loading state
    if (authLoading || checkingAuth) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-neutral-900">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm text-slate-500 dark:text-neutral-400 font-medium">
                        Verifying admin access...
                    </p>
                </div>
            </div>
        );
    }

    // Error state - not authorized
    if (error || !isAuthorized) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-neutral-900 p-4">
                <div className="max-w-md w-full bg-white dark:bg-neutral-800 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                        <ShieldAlert className="w-8 h-8 text-red-600 dark:text-red-400" />
                    </div>
                    <h1 className="text-xl font-bold text-[#2d3748] dark:text-white mb-2">
                        Access Denied
                    </h1>
                    <p className="text-neutral-500 dark:text-neutral-400 mb-6">
                        {error || 'You do not have permission to access the admin panel.'}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            onClick={() => router.push('/')}
                            className="px-6 py-2.5 bg-[#2d3748] dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 rounded-xl font-medium transition-colors"
                        >
                            Go to Dashboard
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="flex items-center justify-center gap-2 px-6 py-2.5 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded-xl font-medium transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Retry
                        </button>
                    </div>
                    <p className="mt-6 text-xs text-neutral-400">
                        If you believe this is an error, contact your administrator.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-full bg-neutral-50 dark:bg-neutral-900 font-sans overflow-hidden">
            <AdminSidebar />

            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <AdminHeader />
                <main className="flex-1 overflow-y-auto overflow-x-hidden p-6">
                    <div className="w-full">
                        {children}
                        <div className="h-8"></div>
                    </div>
                </main>
            </div>
        </div>
    );
}
