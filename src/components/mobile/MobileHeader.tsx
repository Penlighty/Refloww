"use client";

import { useState, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Bell,
    Filter,
    MoreVertical,
    Save,
    Search,
    Plus,
    Check,
    ShoppingBag,
    ChevronDown,
    Building,
    LogOut,
    X,
    User,
    Settings
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useSettingsStore, useStorefrontStore, useOrganizationStore } from '@/lib/store';
import { ThemeToggleSimple } from '@/components/ThemeToggle';

interface MobileHeaderProps {
    title?: string;
    variant?: 'dashboard' | 'section' | 'creation' | 'detail' | 'search';
    onSave?: () => void;
    onFilter?: () => void;
    onMore?: () => void;
    isSubmitting?: boolean;
}

export default function MobileHeader({
    title,
    variant = 'section',
    onSave,
    onFilter,
    onMore,
    isSubmitting = false
}: MobileHeaderProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, profile, logout } = useAuth();
    const company = useSettingsStore(state => state.company);
    const cart = useStorefrontStore(state => state.cart);
    const { organizations, activeOrganizationId, setActiveOrganization } = useOrganizationStore();

    const [isOrgDrawerOpen, setIsOrgDrawerOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const displayName = profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Merchant';
    const activeOrg = organizations.find(o => o.id === activeOrganizationId);

    const cartTotalCount = useMemo(() => {
        return cart.reduce((total, item) => total + item.quantity, 0);
    }, [cart]);

    // Auto-detect variant based on route if not explicitly passed
    let computedVariant = variant;
    if (pathname === '/') {
        computedVariant = 'dashboard';
    } else if (pathname.includes('/new') || pathname.includes('/edit')) {
        computedVariant = 'creation';
    }

    return (
        <>
            <header className="sticky top-0 z-30 md:hidden bg-white/95 dark:bg-[#121620]/95 backdrop-blur-md border-b border-[#e7e9e8] dark:border-neutral-800/80 px-3.5 py-2.5 safe-area-pt shadow-xs">
                <div className="flex items-center justify-between min-h-[40px] gap-2">
                    
                    {/* Left Section */}
                    {computedVariant === 'dashboard' ? (
                        <div
                            onClick={() => setIsOrgDrawerOpen(true)}
                            className="flex items-center gap-2 min-w-0 cursor-pointer active:opacity-80 transition-opacity"
                        >
                            <div className="w-8 h-8 rounded-full bg-[#fc6d2d] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                                {displayName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block leading-none truncate max-w-[90px]">
                                        {activeOrg?.name || 'My Business'}
                                    </span>
                                    <ChevronDown className="w-3 h-3 text-neutral-400" />
                                </div>
                                <h2 className="text-xs font-bold text-neutral-900 dark:text-white truncate mt-0.5 leading-none">
                                    {displayName}
                                </h2>
                            </div>
                        </div>
                    ) : computedVariant === 'creation' ? (
                        <div className="flex items-center gap-2 min-w-0">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center shrink-0"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                            <h2 className="text-xs font-bold text-neutral-900 dark:text-white truncate max-w-[140px]">
                                {title || 'Create Record'}
                            </h2>
                        </div>
                    ) : (
                        <Link
                            href="/"
                            className="flex items-center gap-2 min-w-0 active:opacity-80 transition-opacity cursor-pointer group"
                            title="Return to Home Dashboard"
                        >
                            <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center shrink-0 group-hover:bg-neutral-200 dark:group-hover:bg-neutral-700 transition-colors">
                                <ArrowLeft className="w-4 h-4" />
                            </div>
                            <h2 className="text-xs font-bold text-neutral-900 dark:text-white truncate max-w-[140px] group-hover:text-[#fc6d2d] transition-colors">
                                {title || 'Overview'}
                            </h2>
                        </Link>
                    )}

                    {/* Right Section: Image 3 Controls (Search, Cart, Theme, Org/User Avatar) */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        {/* 1. Global Search Button */}
                        <button
                            type="button"
                            onClick={() => setIsSearchOpen(true)}
                            className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center transition-colors"
                            title="Search"
                        >
                            <Search className="w-4 h-4" />
                        </button>

                        {/* 2. Global Cart Button */}
                        <Link
                            href="/pos"
                            className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center transition-colors relative"
                            title="Cart"
                        >
                            <ShoppingBag className="w-4 h-4" />
                            {cartTotalCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#fc6d2d] text-white text-[9px] font-bold flex items-center justify-center border-2 border-white dark:border-neutral-900">
                                    {cartTotalCount}
                                </span>
                            )}
                        </Link>

                        {/* 3. Theme Toggle */}
                        <div className="flex items-center justify-center">
                            <ThemeToggleSimple />
                        </div>

                        {/* 4. User Profile & Org Switcher Avatar */}
                        {computedVariant !== 'dashboard' && (
                            <button
                                type="button"
                                onClick={() => setIsOrgDrawerOpen(true)}
                                className="w-8 h-8 rounded-full bg-[#fc6d2d] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs"
                                title="Account & Organization"
                            >
                                {displayName.charAt(0).toUpperCase()}
                            </button>
                        )}

                        {/* Save Action if Creation Variant */}
                        {computedVariant === 'creation' && onSave && (
                            <button
                                type="button"
                                onClick={onSave}
                                disabled={isSubmitting}
                                className="h-8 px-3 bg-[#fc6d2d] hover:bg-[#d9531d] text-white text-xs font-semibold rounded-xl flex items-center gap-1 shrink-0 shadow-xs active:scale-95 disabled:opacity-50 ml-1"
                            >
                                <Check className="w-3.5 h-3.5" />
                                <span>{isSubmitting ? 'Saving...' : 'Save'}</span>
                            </button>
                        )}
                    </div>

                </div>
            </header>

            {/* Mobile Global Search Modal */}
            {isSearchOpen && (
                <div className="fixed inset-0 z-[100] md:hidden bg-black/60 backdrop-blur-xs p-4 flex flex-col pt-12 animate-in fade-in duration-150">
                    <div className="bg-white dark:bg-[#161a24] rounded-2xl p-4 space-y-3 border border-neutral-200 dark:border-neutral-800 shadow-2xl">
                        <div className="flex items-center justify-between gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-2">
                            <div className="flex items-center gap-2 flex-1">
                                <Search className="w-4 h-4 text-neutral-400" />
                                <input
                                    type="text"
                                    autoFocus
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search transactions, customers, docs..."
                                    className="w-full text-xs text-neutral-900 dark:text-white bg-transparent focus:outline-none"
                                />
                            </div>
                            <button
                                onClick={() => setIsSearchOpen(false)}
                                className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="text-xs text-neutral-400 py-2 text-center">
                            {searchQuery.trim() ? (
                                <Link
                                    href={`/transactions?search=${encodeURIComponent(searchQuery)}`}
                                    onClick={() => setIsSearchOpen(false)}
                                    className="text-[#fc6d2d] font-bold block"
                                >
                                    Search for &quot;{searchQuery}&quot; in Transactions &rarr;
                                </Link>
                            ) : (
                                <span>Type to search across Refloww...</span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Profile & Organization Switcher Drawer */}
            {isOrgDrawerOpen && (
                <div className="fixed inset-0 z-[100] md:hidden flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="fixed inset-0" onClick={() => setIsOrgDrawerOpen(false)} />
                    
                    <div className="relative bg-white dark:bg-[#161a24] rounded-t-[28px] p-6 space-y-4 max-h-[85vh] overflow-y-auto border-t border-neutral-200 dark:border-neutral-800 shadow-2xl animate-in slide-in-from-bottom duration-200 z-[101]">
                        <div className="w-12 h-1 bg-neutral-300 dark:bg-neutral-700 rounded-full mx-auto mb-1" />

                        {/* Profile Info */}
                        <div className="flex items-center gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                            <div className="w-10 h-10 rounded-full bg-[#fc6d2d] text-white flex items-center justify-center font-bold text-sm">
                                {displayName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="text-sm font-bold text-neutral-900 dark:text-white truncate">{displayName}</h3>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{user?.email}</p>
                            </div>
                            <button
                                onClick={() => setIsOrgDrawerOpen(false)}
                                className="p-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Organizations Switcher */}
                        <div>
                            <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                                Active Organization
                            </h4>
                            <div className="space-y-1.5">
                                {organizations.map((org) => (
                                    <button
                                        key={org.id}
                                        onClick={() => {
                                            setActiveOrganization(org.id);
                                            setIsOrgDrawerOpen(false);
                                        }}
                                        className={`w-full p-3 rounded-2xl flex items-center justify-between text-left transition-all ${
                                            org.id === activeOrganizationId
                                                ? 'bg-[#fff0e9] dark:bg-[#fc6d2d]/15 border border-[#fc6d2d]/40 text-[#fc6d2d]'
                                                : 'bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 text-neutral-700 dark:text-neutral-200'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <Building className="w-4 h-4" />
                                            <span className="text-xs font-bold">{org.name}</span>
                                        </div>
                                        {org.id === activeOrganizationId && (
                                            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#fc6d2d] text-white px-2 py-0.5 rounded-full">
                                                Active
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Quick Account Links */}
                        <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
                            <Link
                                href="/settings"
                                onClick={() => setIsOrgDrawerOpen(false)}
                                className="flex items-center gap-2.5 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 text-xs font-bold text-neutral-700 dark:text-neutral-200"
                            >
                                <Settings className="w-4 h-4 text-neutral-500" />
                                <span>Business Settings</span>
                            </Link>

                            <button
                                onClick={() => {
                                    setIsOrgDrawerOpen(false);
                                    logout();
                                }}
                                className="w-full flex items-center gap-2.5 p-3 rounded-2xl bg-red-50 dark:bg-red-950/30 text-xs font-bold text-red-600 dark:text-red-400 text-left"
                            >
                                <LogOut className="w-4 h-4" />
                                <span>Sign Out</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
