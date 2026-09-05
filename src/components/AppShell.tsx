"use client";

// App Shell - Wraps authenticated pages with Sidebar and Header
// Also handles authentication state and redirects
// Includes announcement banner and feedback button for live app integration

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { FirebaseSyncProvider } from '@/components/FirebaseSyncProvider';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';

// Pages that don't require authentication
const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password'];



interface AppShellProps {
    children: React.ReactNode;
}

// Route Title Map
const PAGE_TITLES: Record<string, string> = {
    '/dashboard': 'Dashboard | Refloww',
    '/storefront/catalog': 'Store Catalog | Refloww',
    '/storefront': 'Manage Storefront | Refloww',
    '/products': 'Products & Services | Refloww',
    '/customers': 'Customer Directory | Refloww',
    '/invoices': 'Invoices | Refloww',
    '/receipts': 'Receipts | Refloww',
    '/delivery-notes': 'Delivery Notes | Refloww',
    '/quotes': 'Quotes & Estimates | Refloww',
    '/purchase-orders': 'Purchase Orders | Refloww',
    '/reports': 'Financial Reports | Refloww',
    '/settings': 'Business Settings | Refloww',
    '/templates': 'Document Templates | Refloww',
    '/login': 'Sign In | Refloww',
    '/signup': 'Create Account | Refloww',
    '/': 'Dashboard | Refloww',
};

import MobileHeader from '@/components/mobile/MobileHeader';
import MobileBottomNav from '@/components/mobile/MobileBottomNav';
import MobileSubHeaderNav from '@/components/mobile/MobileSubHeaderNav';

export default function AppShell({ children }: AppShellProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, loading } = useAuth();

    const isPublicPage = PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/s/');
    const isAdminPage = pathname.startsWith('/admin');

    // Dynamic browser tab header title
    useEffect(() => {
        const matchedKey = Object.keys(PAGE_TITLES).find(path =>
            path === '/' ? pathname === '/' : pathname.startsWith(path)
        );
        document.title = matchedKey ? PAGE_TITLES[matchedKey] : 'Refloww';
    }, [pathname]);

    // Sync settings store active organization on switch (client-side only, avoids SSR evaluation-order errors)
    useEffect(() => {
        const { useOrganizationStore, useSettingsStore } = require('@/lib/store');
        const unsubscribe = useOrganizationStore.subscribe((state: any) => {
            useSettingsStore.getState().syncSettingsForActiveOrg(state.activeOrganizationId);
        });
        
        // Initial sync on mount
        const activeOrgId = useOrganizationStore.getState().activeOrganizationId;
        if (activeOrgId) {
            useSettingsStore.getState().syncSettingsForActiveOrg(activeOrgId);
        }

        return () => unsubscribe();
    }, []);

    // Redirect logic
    useEffect(() => {
        if (loading) return;

        if (!user && !isPublicPage) {
            // Not logged in and trying to access protected page
            router.push('/login');
        }
    }, [user, loading, isPublicPage, router]);

    // Loading state
    if (loading) {
        return (
            <div className="w-full h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading...</p>
                </div>
            </div>
        );
    }

    // Public pages (login, signup, etc.) - no sidebar/header
    if (isPublicPage) {
        return <>{children}</>;
    }

    // Not authenticated and not on public page - will redirect
    if (!user) {
        return (
            <div className="w-full h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Redirecting...</p>
                </div>
            </div>
        );
    }

    // Admin pages have their own layout
    if (isAdminPage) {
        return <>{children}</>;
    }

    // Authenticated - show full app with sidebar, header, announcement banner, and Firebase sync
    return (
        <FirebaseSyncProvider>
            <div className="flex flex-col h-screen w-full overflow-hidden bg-[#F4F5F3] dark:bg-[#0B0F19]">
                {/* Announcement Banner - Real-time from Firebase */}
                <AnnouncementBanner />

                {/* Mobile-only Header & Sub-Header Navigation */}
                <div className="md:hidden flex-shrink-0 z-30">
                    <MobileHeader />
                    <MobileSubHeaderNav />
                </div>

                {/* Main App Layout */}
                <div className="flex-1 flex overflow-hidden">
                    <Sidebar />
                    <main className="flex-1 flex flex-col min-w-0 bg-[#F4F5F3] dark:bg-[#0B0F19] relative overflow-hidden transition-colors">
                        {/* Desktop Header */}
                        <div className="hidden md:block flex-shrink-0">
                            <Header />
                        </div>
                        <div className="flex-1 overflow-y-auto px-4.5 sm:px-6 py-4 pb-36 sm:pb-40 md:pb-8 scroll-smooth">
                            <div className="max-w-[1400px] mx-auto w-full">
                                {children}
                            </div>
                        </div>
                    </main>
                </div>

                {/* Mobile-only Bottom Floating Navigation */}
                <MobileBottomNav />
            </div>
        </FirebaseSyncProvider>
    );
}
