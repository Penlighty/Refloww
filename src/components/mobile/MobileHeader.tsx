"use client";

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
    Settings,
    AlertTriangle,
    Clock,
    ArrowRight,
    Package,
    FileText
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useSettingsStore, useStorefrontStore, useOrganizationStore, useProductStore, useDocumentStore } from '@/lib/store';
import { ThemeToggleSimple } from '@/components/ThemeToggle';
import { calculateReorderMetrics } from '@/lib/utils/inventoryUtils';
import { formatCurrency } from '@/lib/utils';

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
    const { products, getFilteredProducts } = useProductStore();
    const { documents, getFilteredDocuments } = useDocumentStore();

    const [mounted, setMounted] = useState(false);
    const [isOrgDrawerOpen, setIsOrgDrawerOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        setMounted(true);
    }, []);

    const displayName = profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Merchant';
    const activeOrg = organizations.find(o => o.id === activeOrganizationId);

    const cartTotalCount = useMemo(() => {
        return cart.reduce((total, item) => total + item.quantity, 0);
    }, [cart]);

    // Operational alerts for notifications panel
    const displayProducts = useMemo(() => getFilteredProducts(), [products, activeOrganizationId, getFilteredProducts]);
    const displayDocuments = useMemo(() => getFilteredDocuments(), [documents, activeOrganizationId, getFilteredDocuments]);

    const lowStockItems = useMemo(() => {
        return displayProducts.filter(p => {
            if (p.productType && p.productType !== 'physical') return false;
            const metrics = calculateReorderMetrics(p, displayDocuments);
            return metrics.isReorderNeeded;
        });
    }, [displayProducts, displayDocuments]);

    const overdueDocs = useMemo(() => {
        return displayDocuments.filter(d => d.status === 'overdue');
    }, [displayDocuments]);

    const totalNotificationCount = lowStockItems.length + overdueDocs.length;

    // Auto-detect variant based on route if not explicitly passed
    let computedVariant = variant;
    if (pathname === '/') {
        computedVariant = 'dashboard';
    } else if (pathname.includes('/new') || pathname.includes('/edit')) {
        computedVariant = 'creation';
    }

    return (
        <>
            <header className="sticky top-0 z-30 md:hidden bg-white/95 dark:bg-[#121620]/95 backdrop-blur-md border-b border-[#e7e9e8] dark:border-neutral-800/80 px-4 sm:px-6 py-2.5 safe-area-pt shadow-xs">
                <div className="flex items-center justify-between min-h-[40px] gap-2">
                    
                    {/* Left Section: Full App Logo + Active Organization Switcher */}
                    {computedVariant === 'dashboard' ? (
                        <div className="flex items-center gap-2.5 min-w-0">
                            {/* Refloww Full App Logo */}
                            <Link href="/" className="shrink-0 flex items-center">
                                <img
                                    src="/logo/refloww-full-orange.svg"
                                    alt="Refloww"
                                    className="h-7.5 sm:h-9 w-auto object-contain max-w-[130px] sm:max-w-[150px]"
                                />
                            </Link>

                            {/* Active Organization Switcher Pill */}
                            <button
                                type="button"
                                onClick={() => setIsOrgDrawerOpen(true)}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-neutral-100/90 dark:bg-neutral-800/90 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200/80 dark:hover:bg-neutral-700/80 transition-colors max-w-[160px] min-w-0"
                                title="Switch Organization"
                            >
                                <Building className="w-3.5 h-3.5 text-[#fc6d2d] shrink-0" />
                                <span className="text-xs font-bold truncate">
                                    {activeOrg?.name || 'My Business'}
                                </span>
                                <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0 ml-0.5" />
                            </button>
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
                        <div className="flex items-center gap-2 min-w-0">
                            <Link
                                href="/"
                                className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center shrink-0 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                                title="Return to Home Dashboard"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </Link>

                            {/* Replace Overview title with Full Logo if title is Overview or omitted */}
                            {(!title || title.toLowerCase() === 'overview') ? (
                                <Link href="/" className="shrink-0 flex items-center">
                                    <img
                                        src="/logo/refloww-full-orange.svg"
                                        alt="Refloww"
                                        className="h-7.5 sm:h-9 w-auto object-contain max-w-[135px] sm:max-w-[150px]"
                                    />
                                </Link>
                            ) : (
                                <h2 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white truncate max-w-[140px] sm:max-w-xs">
                                    {title}
                                </h2>
                            )}
                        </div>
                    )}

                    {/* Right Section Controls: Search, Notifications, Cart, Theme */}
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

                        {/* 2. Notifications Bell Button */}
                        <button
                            type="button"
                            onClick={() => setIsNotificationsOpen(true)}
                            className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center transition-colors relative"
                            title="Notifications & Alerts"
                        >
                            <Bell className="w-4 h-4" />
                            {totalNotificationCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white dark:border-neutral-900 animate-pulse">
                                    {totalNotificationCount}
                                </span>
                            )}
                        </button>

                        {/* 3. Global Cart Button */}
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

                        {/* 4. Theme Toggle */}
                        <div className="flex items-center justify-center">
                            <ThemeToggleSimple />
                        </div>

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

            {/* Portaled Mobile Global Search Modal */}
            {mounted && isSearchOpen && createPortal(
                <div className="fixed inset-0 z-[150] md:hidden bg-black/60 backdrop-blur-xs p-4 flex flex-col pt-12 animate-in fade-in duration-150">
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
                </div>,
                document.body
            )}

            {/* Portaled Mobile Notifications Drawer (Min height ~50vh for spacious scrollable bottom sheet) */}
            {mounted && isNotificationsOpen && createPortal(
                <div className="fixed inset-0 z-[150] md:hidden flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="fixed inset-0" onClick={() => setIsNotificationsOpen(false)} />
                    
                    <div className="relative bg-white dark:bg-[#161a24] rounded-t-[28px] p-5 space-y-4 min-h-[50vh] max-h-[85vh] flex flex-col border-t border-neutral-200 dark:border-neutral-800 shadow-2xl animate-in slide-in-from-bottom duration-200 z-[151]">
                        <div className="w-12 h-1 bg-neutral-300 dark:bg-neutral-700 rounded-full mx-auto mb-1 flex-shrink-0" />

                        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                    <Bell className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Notifications & Alerts</h3>
                                    <p className="text-[11px] text-neutral-400">{totalNotificationCount} active operational notice(s)</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsNotificationsOpen(false)}
                                className="p-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
                            {/* Low Stock Alerts */}
                            {lowStockItems.length > 0 && (
                                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                                            <span>{lowStockItems.length} Product(s) Low Stock</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                                        Items like <strong>{lowStockItems[0].name}</strong> are running below reorder threshold.
                                    </p>
                                    <div className="space-y-1.5 pt-1">
                                        {lowStockItems.slice(0, 5).map(item => (
                                            <div key={item.id} className="flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 bg-amber-100/60 dark:bg-amber-900/40 px-2.5 py-1.5 rounded-xl">
                                                <span className="font-semibold truncate max-w-[180px]">{item.name}</span>
                                                <span className="font-mono text-[11px] font-bold text-amber-700 dark:text-amber-300">{item.stockQuantity || 0} remaining</span>
                                            </div>
                                        ))}
                                    </div>
                                    <Link
                                        href="/products"
                                        onClick={() => setIsNotificationsOpen(false)}
                                        className="inline-flex items-center gap-1 text-xs font-bold text-[#fc6d2d] hover:underline pt-2"
                                    >
                                        <span>Manage Inventory & Restock</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </Link>
                                </div>
                            )}

                            {/* Overdue Invoice Alerts */}
                            {overdueDocs.length > 0 && (
                                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-xs">
                                            <Clock className="w-4 h-4 text-rose-600" />
                                            <span>{overdueDocs.length} Overdue Invoice(s)</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-rose-700 dark:text-rose-400 leading-relaxed">
                                        Invoices pending payment require customer collection follow-up.
                                    </p>
                                    <div className="space-y-1.5 pt-1">
                                        {overdueDocs.slice(0, 5).map(doc => (
                                            <div key={doc.id} className="flex items-center justify-between text-xs text-rose-900 dark:text-rose-200 bg-rose-100/60 dark:bg-rose-900/40 px-2.5 py-1.5 rounded-xl">
                                                <span className="font-mono font-bold">{doc.documentNumber}</span>
                                                <span className="font-semibold">{doc.customerName || 'Customer'}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <Link
                                        href="/invoices"
                                        onClick={() => setIsNotificationsOpen(false)}
                                        className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:underline pt-2"
                                    >
                                        <span>View Overdue Invoices</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </Link>
                                </div>
                            )}

                            {totalNotificationCount === 0 && (
                                <div className="text-center py-10 space-y-2 my-auto">
                                    <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                                        <Check className="w-6 h-6" />
                                    </div>
                                    <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">All Caught Up!</h4>
                                    <p className="text-[11px] text-neutral-400 max-w-xs mx-auto">
                                        No pending stock warnings or overdue payment alerts.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Portaled Mobile Profile & Organization Switcher Drawer */}
            {mounted && isOrgDrawerOpen && createPortal(
                <div className="fixed inset-0 z-[150] md:hidden flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="fixed inset-0" onClick={() => setIsOrgDrawerOpen(false)} />
                    
                    <div className="relative bg-white dark:bg-[#161a24] rounded-t-[28px] p-6 space-y-4 min-h-[50vh] max-h-[85vh] flex flex-col border-t border-neutral-200 dark:border-neutral-800 shadow-2xl animate-in slide-in-from-bottom duration-200 z-[151]">
                        <div className="w-12 h-1 bg-neutral-300 dark:bg-neutral-700 rounded-full mx-auto mb-1 flex-shrink-0" />

                        {/* Profile Info */}
                        <div className="flex items-center gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800 flex-shrink-0">
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

                        {/* Scrollable Body */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
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
                </div>,
                document.body
            )}
        </>
    );
}


