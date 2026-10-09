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
import NavigationProgressBar from '@/components/NavigationProgressBar';

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
import { PageHeaderProvider } from '@/components/mobile/PageHeaderContext';
import { PageTransition } from '@/components/mobile/PageTransition';

export default function AppShell({ children }: AppShellProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, loading } = useAuth();

    const isPublicPage = PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/s/');
    const isAdminPage = pathname.startsWith('/admin');
    const immersive = /\/(new|edit)(\/|$)/.test(pathname);

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
            <div className="w-full h-dvh flex items-center justify-center bg-ground text-ink">
                <div className="flex flex-col items-center gap-4">
                    <div className="size-10 border-4 border-primary-500 border-t-transparent rounded-full rf-spin"></div>
                    <p className="text-sm text-ink-3">Loading...</p>
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
            <div className="w-full h-dvh flex items-center justify-center bg-ground text-ink">
                <div className="flex flex-col items-center gap-4">
                    <div className="size-10 border-4 border-primary-500 border-t-transparent rounded-full rf-spin"></div>
                    <p className="text-sm text-ink-3">Redirecting...</p>
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
            <PageHeaderProvider>
                <NavigationProgressBar />
                <div data-immersive={immersive} className="flex flex-col h-dvh w-full overflow-hidden bg-ground text-ink">
                    {/* Announcement Banner - Real-time from Firebase */}
                    <AnnouncementBanner />

                    {/* Mobile-only Header & Sub-Header Navigation */}
                    <div className="desk:hidden flex-shrink-0 z-30">
                        <MobileHeader />
                        <MobileSubHeaderNav />
                    </div>

                    {/* Main App Layout */}
                    <div className="flex-1 flex overflow-hidden">
                        <div className="mob:hidden h-full flex flex-col flex-shrink-0">
                            <Sidebar />
                        </div>
                        <main className="flex-1 flex flex-col min-w-0 bg-ground relative overflow-hidden">
                            {/* Desktop Header */}
                            <div className="mob:hidden flex-shrink-0">
                                <Header />
                            </div>
                            <div id="app-scroll" className="flex-1 overflow-y-auto overscroll-contain px-5 pt-4 pb-app px-safe sm:px-6 desk:px-8 desk:pb-8 scroll-smooth">
                                <div className="max-w-[1400px] mx-auto w-full">
                                    <PageTransition>{children}</PageTransition>
                                </div>
                            </div>
                        </main>
                    </div>

                    {/* Mobile-only Bottom Floating Navigation */}
                    <MobileBottomNav />
                </div>
            </PageHeaderProvider>
        </FirebaseSyncProvider>
    );
}
