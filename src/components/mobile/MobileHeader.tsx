"use client";

import { useState, useMemo, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Bell,
    MoreVertical,
    Search,
    ShoppingBag,
    ChevronDown,
    Building,
    LogOut,
    X,
    Settings,
    AlertTriangle,
    Clock,
    ArrowRight,
    Check,
    Search as SearchIcon,
} from '@/components/icons';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useSettingsStore, useStorefrontStore, useOrganizationStore, useProductStore, useDocumentStore } from '@/lib/store';
import { ThemeToggleSimple } from '@/components/ThemeToggle';
import { calculateReorderMetrics } from '@/lib/utils/inventoryUtils';
import { usePageHeaderConfig } from '@/components/mobile/PageHeaderContext';
import { Sheet } from '@/components/ui/Sheet';

export default function MobileHeader() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, profile, logout } = useAuth();
    const cart = useStorefrontStore(state => state.cart);
    const { organizations, activeOrganizationId, setActiveOrganization } = useOrganizationStore();
    const { products, getFilteredProducts } = useProductStore();
    const { documents, getFilteredDocuments } = useDocumentStore();

    const { config: pageConfig, run: runAction } = usePageHeaderConfig();

    const [isOrgSheetOpen, setIsOrgSheetOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const displayName = profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Merchant';
    const activeOrg = organizations.find(o => o.id === activeOrganizationId);

    const cartTotalCount = useMemo(() => {
        return cart.reduce((total, item) => total + item.quantity, 0);
    }, [cart]);

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

    // Header title and variant determination
    const headerTitle = pageConfig.title || (pathname === '/' ? undefined : 'Overview');
    const isDashboard = pathname === '/';
    const isCreation = /\/(new|edit)(\/|$)/.test(pathname);

    const handleBack = () => {
        if (pageConfig.backHref) {
            router.push(pageConfig.backHref);
        } else if (typeof window !== 'undefined' && window.history.length > 1) {
            router.back();
        } else {
            router.push('/');
        }
    };

    return (
        <>
            {/* Header / Top Search Bar */}
            {isSearchOpen ? (
                <header className="sticky top-0 z-40 desk:hidden bg-paper border-b border-line px-5 sm:px-6 pt-safe pb-2">
                    <div className="flex items-center h-[var(--header-h)] gap-2.5 relative">
                        <button
                            type="button"
                            onClick={() => {
                                setIsSearchOpen(false);
                                setSearchQuery('');
                            }}
                            className="size-9 rounded-ctl bg-paper-2 text-ink flex items-center justify-center shrink-0 border border-line"
                            aria-label="Close search"
                        >
                            <ArrowLeft className="size-4" />
                        </button>

                        <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-ctl bg-paper-2 border border-line min-w-0">
                            <SearchIcon className="size-4 text-ink-3 shrink-0" />
                            <input
                                type="text"
                                autoFocus
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search products, invoices, customers..."
                                className="w-full text-xs sm:text-sm text-ink bg-transparent focus:outline-none min-w-0"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="text-ink-3 hover:text-ink p-1"
                                    aria-label="Clear query"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Top Search Results Dropdown Popover */}
                        <div className="absolute top-full left-0 right-0 mt-2 bg-paper border border-line rounded-2xl shadow-2xl p-4 max-h-[65vh] overflow-y-auto space-y-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                            {searchQuery.trim() ? (
                                <>
                                    <Link
                                        href={`/transactions?search=${encodeURIComponent(searchQuery)}`}
                                        onClick={() => {
                                            setIsSearchOpen(false);
                                            setSearchQuery('');
                                        }}
                                        className="flex items-center justify-between p-3 rounded-ctl bg-paper-2 border border-line text-primary-text font-semibold text-body hover:bg-paper-2/80 transition-colors"
                                    >
                                        <span className="truncate">Search for &quot;{searchQuery}&quot; in Transactions</span>
                                        <ArrowRight className="size-4 shrink-0" />
                                    </Link>

                                    <div className="space-y-1 pt-1">
                                        <p className="text-micro font-medium uppercase tracking-wider text-ink-3 px-1">Quick Search Views</p>
                                        <Link
                                            href={`/products?search=${encodeURIComponent(searchQuery)}`}
                                            onClick={() => {
                                                setIsSearchOpen(false);
                                                setSearchQuery('');
                                            }}
                                            className="flex items-center justify-between p-2.5 rounded-ctl hover:bg-paper-2 text-ink text-caption font-medium transition-colors"
                                        >
                                            <span>Search in Products</span>
                                            <ArrowRight className="size-3.5 text-ink-3" />
                                        </Link>
                                        <Link
                                            href={`/invoices?search=${encodeURIComponent(searchQuery)}`}
                                            onClick={() => {
                                                setIsSearchOpen(false);
                                                setSearchQuery('');
                                            }}
                                            className="flex items-center justify-between p-2.5 rounded-ctl hover:bg-paper-2 text-ink text-caption font-medium transition-colors"
                                        >
                                            <span>Search in Invoices</span>
                                            <ArrowRight className="size-3.5 text-ink-3" />
                                        </Link>
                                        <Link
                                            href={`/customers?search=${encodeURIComponent(searchQuery)}`}
                                            onClick={() => {
                                                setIsSearchOpen(false);
                                                setSearchQuery('');
                                            }}
                                            className="flex items-center justify-between p-2.5 rounded-ctl hover:bg-paper-2 text-ink text-caption font-medium transition-colors"
                                        >
                                            <span>Search in Customers</span>
                                            <ArrowRight className="size-3.5 text-ink-3" />
                                        </Link>
                                    </div>
                                </>
                            ) : (
                                <p className="text-caption text-ink-3 py-2 text-center">Type keywords to search across transactions, products & customers...</p>
                            )}
                        </div>
                    </div>
                </header>
            ) : (
                <header className="sticky top-0 z-30 desk:hidden bg-paper border-b border-line px-5 sm:px-6 pt-safe pb-2">
                    <div className="flex items-center justify-between h-[var(--header-h)] gap-2">
                        
                        {/* Left Section */}
                        {isDashboard ? (
                            <div className="flex items-center gap-2.5 min-w-0">
                                <Link href="/" className="shrink-0 flex items-center">
                                    <img
                                        src="/logo/refloww-full-orange.svg"
                                        alt="Refloww"
                                        className="h-7 w-auto object-contain max-w-[120px]"
                                    />
                                </Link>

                                <button
                                    type="button"
                                    onClick={() => setIsOrgSheetOpen(true)}
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-ctl bg-paper-2 text-ink hover:bg-paper-2/80 transition-colors max-w-[150px] min-w-0 border border-line"
                                    title="Switch Organization"
                                >
                                    <Building className="size-3.5 text-primary-500 shrink-0" />
                                    <span className="text-caption font-semibold truncate">
                                        {activeOrg?.name || 'My Business'}
                                    </span>
                                    <ChevronDown className="size-3.5 text-ink-3 shrink-0 ml-0.5" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 min-w-0">
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    className="size-9 rounded-ctl bg-paper-2 text-ink flex items-center justify-center shrink-0 border border-line"
                                    aria-label="Go back"
                                >
                                    <ArrowLeft className="size-4" />
                                </button>

                                {(!headerTitle || headerTitle.toLowerCase() === 'overview') ? (
                                    <Link href="/" className="shrink-0 flex items-center">
                                        <img
                                            src="/logo/refloww-full-orange.svg"
                                            alt="Refloww"
                                            className="h-7 w-auto object-contain max-w-[130px]"
                                        />
                                    </Link>
                                ) : (
                                    <div className="min-w-0">
                                        <h2 className="text-body font-semibold text-ink truncate max-w-[180px] sm:max-w-xs">
                                            {headerTitle}
                                        </h2>
                                        {pageConfig.subtitle && (
                                            <p className="text-micro text-ink-3 truncate">{pageConfig.subtitle}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Right Section Controls */}
                        <div className="flex items-center gap-1.5 shrink-0">
                            {/* Custom actions registered by current page */}
                            {pageConfig.actions?.map((action) => {
                                const ActionIcon = action.icon;
                                if (action.primary) {
                                    return (
                                        <button
                                            key={action.id}
                                            type="button"
                                            onClick={() => runAction(action.id)}
                                            disabled={action.disabled || action.loading}
                                            className="h-9 px-3.5 bg-primary-500 hover:bg-primary-600 text-on-primary text-caption font-semibold rounded-ctl flex items-center gap-1.5 disabled:opacity-50"
                                        >
                                            {ActionIcon && <ActionIcon className="size-4" />}
                                            <span>{action.loading ? 'Saving...' : action.label}</span>
                                        </button>
                                    );
                                }
                                return (
                                    <button
                                        key={action.id}
                                        type="button"
                                        onClick={() => runAction(action.id)}
                                        disabled={action.disabled || action.loading}
                                        aria-label={action.label}
                                        className="size-9 rounded-ctl bg-paper-2 text-ink flex items-center justify-center border border-line disabled:opacity-50"
                                    >
                                        {ActionIcon ? <ActionIcon className="size-4" /> : action.label}
                                    </button>
                                );
                            })}

                            {/* Standard controls if not explicit creation */}
                            {!isCreation && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setIsSearchOpen(true)}
                                        className="size-9 rounded-ctl bg-paper-2 text-ink flex items-center justify-center border border-line"
                                        title="Search"
                                        aria-label="Search"
                                    >
                                        <Search className="size-4" />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setIsNotificationsOpen(true)}
                                        className="size-9 rounded-ctl bg-paper-2 text-ink flex items-center justify-center border border-line relative"
                                        title="Notifications & Alerts"
                                        aria-label="Notifications"
                                    >
                                        <Bell className="size-4 rf-bell" />
                                        {totalNotificationCount > 0 && (
                                            <span className="absolute -top-1 -right-1 size-4 rounded-full bg-danger-solid text-white text-micro font-bold flex items-center justify-center border-2 border-paper">
                                                {totalNotificationCount}
                                            </span>
                                        )}
                                    </button>

                                    <Link
                                        href="/pos"
                                        className="size-9 rounded-ctl bg-paper-2 text-ink flex items-center justify-center border border-line relative"
                                        title="Cart"
                                        aria-label="Cart"
                                    >
                                        <ShoppingBag className="size-4" />
                                        {cartTotalCount > 0 && (
                                            <span className="absolute -top-1 -right-1 size-4 rounded-full bg-primary-500 text-on-primary text-micro font-bold flex items-center justify-center border-2 border-paper">
                                                {cartTotalCount}
                                            </span>
                                        )}
                                    </Link>

                                    <ThemeToggleSimple />
                                </>
                            )}
                        </div>

                    </div>
                </header>
            )}

            {/* Notifications Sheet */}
            <Sheet
                open={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
                title="Notifications & Alerts"
                description={`${totalNotificationCount} active notice(s)`}
                height="tall"
                size="md"
            >
                <div className="space-y-3 py-2">
                    {lowStockItems.length > 0 && (
                        <div className="p-3.5 bg-warning-tint border border-warning-text/20 rounded-panel space-y-2">
                            <div className="flex items-center gap-2 text-warning-text font-semibold text-caption">
                                <AlertTriangle className="size-4 shrink-0" />
                                <span>{lowStockItems.length} Product(s) Low Stock</span>
                            </div>
                            <div className="space-y-1">
                                {lowStockItems.slice(0, 5).map(item => (
                                    <div key={item.id} className="flex items-center justify-between text-caption text-ink bg-paper/70 px-2.5 py-1.5 rounded-ctl">
                                        <span className="font-medium truncate max-w-[180px]">{item.name}</span>
                                        <span className="money font-semibold text-warning-text">{item.stockQuantity || 0} left</span>
                                    </div>
                                ))}
                            </div>
                            <Link
                                href="/products"
                                onClick={() => setIsNotificationsOpen(false)}
                                className="inline-flex items-center gap-1 text-caption font-semibold text-primary-text pt-1"
                            >
                                <span>Manage Inventory</span>
                                <ArrowRight className="size-3.5" />
                            </Link>
                        </div>
                    )}

                    {overdueDocs.length > 0 && (
                        <div className="p-3.5 bg-danger-tint border border-danger-text/20 rounded-panel space-y-2">
                            <div className="flex items-center gap-2 text-danger-text font-semibold text-caption">
                                <Clock className="size-4 shrink-0" />
                                <span>{overdueDocs.length} Overdue Invoice(s)</span>
                            </div>
                            <div className="space-y-1">
                                {overdueDocs.slice(0, 5).map(doc => (
                                    <div key={doc.id} className="flex items-center justify-between text-caption text-ink bg-paper/70 px-2.5 py-1.5 rounded-ctl">
                                        <span className="font-mono font-medium">{doc.documentNumber}</span>
                                        <span className="truncate max-w-[160px]">{doc.customerName || 'Customer'}</span>
                                    </div>
                                ))}
                            </div>
                            <Link
                                href="/invoices"
                                onClick={() => setIsNotificationsOpen(false)}
                                className="inline-flex items-center gap-1 text-caption font-semibold text-danger-text pt-1"
                            >
                                <span>View Overdue Invoices</span>
                                <ArrowRight className="size-3.5" />
                            </Link>
                        </div>
                    )}

                    {totalNotificationCount === 0 && (
                        <div className="text-center py-10 space-y-2">
                            <div className="size-12 rounded-full bg-success-tint text-success-text flex items-center justify-center mx-auto">
                                <Check className="size-6" />
                            </div>
                            <h4 className="text-body font-semibold text-ink">All Caught Up!</h4>
                            <p className="text-caption text-ink-3 max-w-xs mx-auto">
                                No pending stock warnings or overdue payment alerts.
                            </p>
                        </div>
                    )}
                </div>
            </Sheet>

            {/* Organization Switcher Sheet */}
            <Sheet
                open={isOrgSheetOpen}
                onClose={() => setIsOrgSheetOpen(false)}
                title={displayName}
                description={user?.email || undefined}
                height="tall"
                size="md"
            >
                <div className="space-y-4 py-2">
                    <div>
                        <h4 className="text-micro font-medium uppercase tracking-[0.06em] text-ink-3 mb-2">
                            Active Organization
                        </h4>
                        <div className="space-y-1.5">
                            {organizations.map((org) => (
                                <button
                                    key={org.id}
                                    type="button"
                                    onClick={() => {
                                        setActiveOrganization(org.id);
                                        setIsOrgSheetOpen(false);
                                    }}
                                    className={`w-full p-3 rounded-ctl flex items-center justify-between text-left transition-colors border ${
                                        org.id === activeOrganizationId
                                            ? 'bg-paper-2 border-primary-500 text-primary-text font-semibold'
                                            : 'bg-paper border-line text-ink'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Building className="size-4 shrink-0" />
                                        <span className="text-body">{org.name}</span>
                                    </div>
                                    {org.id === activeOrganizationId && (
                                        <span className="text-micro font-semibold bg-primary-500 text-on-primary px-2 py-0.5 rounded-tag">
                                            Active
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-3 border-t border-line space-y-2">
                        <Link
                            href="/settings"
                            onClick={() => setIsOrgSheetOpen(false)}
                            className="flex items-center gap-2.5 p-3 rounded-ctl bg-paper-2 text-body font-medium text-ink border border-line"
                        >
                            <Settings className="size-4 text-ink-3" />
                            <span>Business Settings</span>
                        </Link>

                        <button
                            type="button"
                            onClick={() => {
                                setIsOrgSheetOpen(false);
                                logout();
                            }}
                            className="w-full flex items-center gap-2.5 p-3 rounded-ctl bg-danger-tint text-body font-medium text-danger-text text-left border border-danger-text/20"
                        >
                            <LogOut className="size-4" />
                            <span>Sign Out</span>
                        </button>
                    </div>
                </div>
            </Sheet>
        </>
    );
}
