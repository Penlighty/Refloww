"use client";

import { useState, useRef, useEffect, useMemo } from 'react';
import {
    Search,
    ChevronDown,
    Command,
    Menu,
    LogOut,
    Settings,
    MessageSquare,
    Bell,
    ChevronLeft,
    Check,
    Sparkles,
    ArrowRight,
    Megaphone,
    Gift,
    Info,
    AlertTriangle,
    FileText,
    Receipt,
    Truck,
    User,
    Package,
    X,
    CornerDownLeft,
    Tag,
    ChevronRight,
    ShoppingBag,
    Minus,
    Trash2,
    Layers,
    Building,
    UserPlus,
    Plus,
    Shield,
    Users
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThemeToggleSimple } from './ThemeToggle';
import { Button, Modal, ModalFooter } from '@/components/ui';
import { useSidebarStore } from '@/lib/sidebar-store';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useSettingsStore, useDocumentStore, useCustomerStore, useProductStore, useOrganizationStore, useStorefrontStore } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import { LineItem } from '@/lib/types';
import { subscribeToActiveAnnouncements, Announcement } from '@/lib/firebase/admin';
import { respondToOrgInvitation } from '@/lib/firebase/firestore';
import FeedbackModal from './FeedbackModal';

const typeConfig = {
    announcement: { icon: Megaphone, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    promotion: { icon: Gift, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    greeting: { icon: Info, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' }
};

const priorityConfig = {
    'urgent': { textClass: 'text-red-500', dotClass: 'bg-red-500' },
    'normal': { textClass: 'text-neutral-500 dark:text-neutral-400', dotClass: 'bg-neutral-400' },
    'low': { textClass: 'text-neutral-400 dark:text-neutral-500', dotClass: 'bg-neutral-300' },
};

import toast from 'react-hot-toast';

export default function Header() {
    const { toggleMobile } = useSidebarStore();
    const { user, profile, logout } = useAuth();
    const { documents, getFilteredDocuments } = useDocumentStore();
    const { customers, getFilteredCustomers } = useCustomerStore();
    const { products, getFilteredProducts } = useProductStore();
    const { cart, updateCartQuantity, removeFromCart, clearCart } = useStorefrontStore();
    const company = useSettingsStore(state => state.company);
    const {
        organizations,
        activeOrganizationId,
        setActiveOrganization,
        createOrganization,
        pendingInvitations,
        acceptInvitation,
        declineInvitation
    } = useOrganizationStore();
    const router = useRouter();

    const displayDocuments = useMemo(() => getFilteredDocuments(), [documents, activeOrganizationId, getFilteredDocuments]);
    const displayCustomers = useMemo(() => getFilteredCustomers(), [customers, activeOrganizationId, getFilteredCustomers]);
    const displayProducts = useMemo(() => getFilteredProducts(), [products, activeOrganizationId, getFilteredProducts]);

    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [isGlobalCartOpen, setIsGlobalCartOpen] = useState(false);
    const [isCreateOrgModalOpen, setIsCreateOrgModalOpen] = useState(false);
    const [newOrgName, setNewOrgName] = useState('');
    const [isMounted, setIsMounted] = useState(false);
    const [activeTab, setActiveTab] = useState<'main' | 'notifications'>('main');
    const [notifications, setNotifications] = useState<Announcement[]>([]);

    const cartTotalCount = useMemo(() => {
        return cart.reduce((total, item) => total + item.quantity, 0);
    }, [cart]);

    const cartSubtotal = useMemo(() => {
        return cart.reduce((total, item) => {
            const price = item.product.discountedPrice || item.product.unitPrice;
            return total + (price * item.quantity);
        }, 0);
    }, [cart]);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchCategory, setSearchCategory] = useState<'all' | 'documents' | 'customers' | 'products'>('all');
    const [selectedIndex, setSelectedIndex] = useState(0);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchContainerRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Scroll selected item into view automatically during arrow key navigation
    useEffect(() => {
        if (isSearchOpen && itemRefs.current[selectedIndex]) {
            itemRefs.current[selectedIndex]?.scrollIntoView({
                block: 'nearest',
                behavior: 'smooth'
            });
        }
    }, [selectedIndex, isSearchOpen]);

    // Global Keyboard Shortcuts (Cmd+K / Ctrl+K, Esc, Arrow Up/Down, Enter)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setIsSearchOpen(true);
                setTimeout(() => searchInputRef.current?.focus(), 10);
            }
            if (e.key === 'Escape') {
                setIsSearchOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Close search dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setIsSearchOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Load active announcements
    useEffect(() => {
        const unsubscribe = subscribeToActiveAnnouncements((data) => {
            const filtered = data.filter(a => a.displayStyle === 'notification');
            setNotifications(filtered);
        });
        return () => unsubscribe();
    }, []);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false);
                setActiveTab('main');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        try {
            setIsUserMenuOpen(false);
            await logout();
        } catch (error) {
            console.error('Logout error:', error);
            if (typeof window !== 'undefined') {
                window.location.href = '/login';
            }
        }
    };

    // Live Search Calculation across Documents, Customers, Products
    const searchResults = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return { documents: [], customers: [], products: [], total: 0, flatList: [] };

        // 1. Documents search
        const matchedDocs = displayDocuments.filter(doc => {
            const numMatch = doc.documentNumber.toLowerCase().includes(q);
            const custMatch = doc.customerName.toLowerCase().includes(q);
            const typeMatch = doc.type.toLowerCase().includes(q);
            const statusMatch = doc.status.toLowerCase().includes(q);
            const itemMatch = doc.lineItems?.some((it: LineItem) => it.productName?.toLowerCase().includes(q) || it.description?.toLowerCase().includes(q));
            const idMatch = doc.id.toLowerCase().includes(q);
            return numMatch || custMatch || typeMatch || statusMatch || itemMatch || idMatch;
        }).sort((a, b) => {
            const aNum = a.documentNumber.toLowerCase();
            const bNum = b.documentNumber.toLowerCase();
            if (aNum === q) return -1;
            if (bNum === q) return 1;
            if (aNum.startsWith(q)) return -1;
            if (bNum.startsWith(q)) return 1;
            return 0;
        });

        // 2. Customers search
        const matchedCustomers = displayCustomers.filter(cust => {
            const numMatch = cust.customerNumber?.toLowerCase().includes(q);
            const nameMatch = cust.name.toLowerCase().includes(q);
            const emailMatch = cust.email?.toLowerCase().includes(q);
            const phoneMatch = cust.phone?.toLowerCase().includes(q);
            const compMatch = cust.companyName?.toLowerCase().includes(q);
            return numMatch || nameMatch || emailMatch || phoneMatch || compMatch;
        }).sort((a, b) => {
            const aNum = a.customerNumber?.toLowerCase() || '';
            const bNum = b.customerNumber?.toLowerCase() || '';
            if (aNum === q) return -1;
            if (bNum === q) return 1;
            if (a.name.toLowerCase().startsWith(q)) return -1;
            if (b.name.toLowerCase().startsWith(q)) return 1;
            return 0;
        });

        // 3. Products search
        const matchedProducts = displayProducts.filter(prod => {
            const skuMatch = prod.sku?.toLowerCase().includes(q);
            const nameMatch = prod.name.toLowerCase().includes(q);
            const barcodeMatch = prod.barcode?.toLowerCase().includes(q);
            const catMatch = prod.category?.toLowerCase().includes(q);
            const descMatch = prod.description?.toLowerCase().includes(q);
            return skuMatch || nameMatch || barcodeMatch || catMatch || descMatch;
        }).sort((a, b) => {
            const aSku = a.sku?.toLowerCase() || '';
            const bSku = b.sku?.toLowerCase() || '';
            if (aSku === q) return -1;
            if (bSku === q) return 1;
            if (a.name.toLowerCase().startsWith(q)) return -1;
            if (b.name.toLowerCase().startsWith(q)) return 1;
            return 0;
        });

        const total = matchedDocs.length + matchedCustomers.length + matchedProducts.length;

        // Create flat list for arrow key navigation & category filtering
        const flatList: Array<{ kind: 'document' | 'customer' | 'product'; data: any }> = [];

        if (searchCategory === 'all' || searchCategory === 'documents') {
            matchedDocs.forEach(d => flatList.push({ kind: 'document', data: d }));
        }
        if (searchCategory === 'all' || searchCategory === 'customers') {
            matchedCustomers.forEach(c => flatList.push({ kind: 'customer', data: c }));
        }
        if (searchCategory === 'all' || searchCategory === 'products') {
            matchedProducts.forEach(p => flatList.push({ kind: 'product', data: p }));
        }

        return {
            documents: matchedDocs,
            customers: matchedCustomers,
            products: matchedProducts,
            total,
            flatList
        };
    }, [searchQuery, displayDocuments, displayCustomers, displayProducts, searchCategory]);

    const handleSelectResult = (item: { kind: 'document' | 'customer' | 'product'; data: any }) => {
        setIsSearchOpen(false);
        setSearchQuery('');
        if (item.kind === 'document') {
            const doc = item.data;
            if (doc.type === 'invoice') router.push(`/invoices/${doc.id}`);
            else if (doc.type === 'receipt') router.push(`/receipts/${doc.id}`);
            else if (doc.type === 'delivery-note') router.push(`/delivery-notes/${doc.id}`);
        } else if (item.kind === 'customer') {
            router.push(`/customers/${item.data.id}`);
        } else if (item.kind === 'product') {
            router.push(`/products/${item.data.id}`);
        }
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isSearchOpen) setIsSearchOpen(true);

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev < searchResults.flatList.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : searchResults.flatList.length - 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (searchResults.flatList[selectedIndex]) {
                handleSelectResult(searchResults.flatList[selectedIndex]);
            }
        }
    };

    // Calculate tasks / notifications list
    const tasks = useMemo(() => {
        const generatedTasks: any[] = [];

        // Overdue Invoices
        const overdue = documents.filter(d => d.status === 'overdue');
        overdue.forEach(doc => {
            generatedTasks.push({
                id: `overdue-${doc.id}`,
                title: `${doc.documentNumber} is overdue`,
                category: 'Collection',
                priority: 'urgent',
                documentId: doc.id,
                type: doc.type
            });
        });

        // Drafts
        const drafts = documents.filter(d => d.status === 'draft');
        drafts.forEach(doc => {
            generatedTasks.push({
                id: `draft-${doc.id}`,
                title: `Finish ${doc.documentNumber}`,
                category: 'Drafts',
                priority: 'normal',
                documentId: doc.id,
                type: doc.type
            });
        });

        // Notifications
        notifications.forEach(note => {
            generatedTasks.push({
                id: note.id,
                title: note.title,
                category: note.type.charAt(0).toUpperCase() + note.type.slice(1),
                priority: note.type === 'warning' ? 'urgent' : 'normal',
                documentId: '',
                type: 'invoice'
            });
        });

        return generatedTasks;
    }, [documents, notifications]);

    const pendingCount = tasks.length;

    // Get display name and initials
    const defaultCompanyName = 'My Company';
    const defaultCompanyEmail = 'contact@mycompany.com';

    const hasCustomName = company?.name && company.name.trim() !== '' && company.name !== defaultCompanyName;
    const hasCustomEmail = company?.email && company.email.trim() !== '' && company.email !== defaultCompanyEmail;
    const hasCustomLogo = company?.logo && company.logo.trim() !== '';
    
    // Fallbacks
    const fallbackName = profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'User';
    const displayName = isMounted && hasCustomName ? company.name : fallbackName;
    const email = isMounted && hasCustomEmail ? company.email : (profile?.email || user?.email || '');
    const photoURL = isMounted && hasCustomLogo ? company.logo : (profile?.photoURL || user?.photoURL);
    const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

    const toggleUserMenu = () => {
        const nextState = !isUserMenuOpen;
        setIsUserMenuOpen(nextState);
        if (!nextState) {
            setActiveTab('main');
        }
    };

    return (
        <header className="h-16 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 sticky top-0 z-40 transition-colors">
            <div className="h-full px-4 md:px-6 max-w-[1400px] mx-auto w-full flex items-center justify-between">
                {/* Mobile Menu Button & Brand Logo */}
                <div className="flex items-center gap-2 md:hidden mr-3">
                    <button
                        onClick={toggleMobile}
                        className="p-2 -ml-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 rounded-lg transition-colors"
                        aria-label="Toggle menu"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <Link href="/" className="flex items-center shrink-0">
                        <img
                            src="/logo/refloww-icon-orange.svg"
                            alt="Refloww"
                            className="w-7 h-7 object-contain"
                        />
                    </Link>
                </div>

                {/* Global Search Bar */}
                <div className="flex items-center gap-4 flex-1 max-w-xl relative" ref={searchContainerRef}>
                    <div className="relative w-full max-w-md group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Search className="text-neutral-400 group-focus-within:text-blue-500 transition-colors w-4 h-4" strokeWidth={2} />
                        </div>
                        <input
                            ref={searchInputRef}
                            className="block w-full pl-10 pr-24 py-2 border border-neutral-200 dark:border-neutral-700 rounded-full leading-5 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 sm:text-sm transition-all shadow-sm focus:border-blue-500 dark:focus:border-blue-400"
                            style={{ outline: 'none', boxShadow: 'none' }}
                            placeholder="Search documents, customers, products..."
                            type="text"
                            value={searchQuery}
                            onFocus={() => setIsSearchOpen(true)}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setIsSearchOpen(true);
                                setSelectedIndex(0);
                            }}
                            onKeyDown={handleSearchKeyDown}
                        />
                        <div className="absolute inset-y-0 right-2 flex items-center gap-1">
                            {searchQuery ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchQuery('');
                                        searchInputRef.current?.focus();
                                    }}
                                    className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-full hover:bg-neutral-200/50 dark:hover:bg-neutral-600 transition-colors"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            ) : (
                                <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-200/60 dark:bg-neutral-600/80 text-neutral-400 dark:text-neutral-300 text-[11px] font-medium pointer-events-none">
                                    <Command className="w-3 h-3" />
                                    <span>K</span>
                                </div>
                            )}
                        </div>

                        {/* Live Search Results Dropdown Popover (Aligned to Input container) */}
                        {isSearchOpen && searchQuery.trim() !== '' && (
                            <div 
                                className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl border border-neutral-200/80 dark:border-neutral-700/80 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col"
                                style={{ maxHeight: '350px' }}
                            >
                                {/* Category Filter Tabs */}
                                <div className="flex-shrink-0 flex items-center gap-1 p-2 bg-neutral-50/80 dark:bg-neutral-900/50 border-b border-neutral-100 dark:border-neutral-700/60 text-xs overflow-x-auto">
                                    <button
                                        type="button"
                                        onClick={() => setSearchCategory('all')}
                                        className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                                            searchCategory === 'all'
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/50'
                                        }`}
                                    >
                                        All ({searchResults.total})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSearchCategory('documents')}
                                        className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                                            searchCategory === 'documents'
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/50'
                                        }`}
                                    >
                                        Documents ({searchResults.documents.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSearchCategory('customers')}
                                        className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                                            searchCategory === 'customers'
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/50'
                                        }`}
                                    >
                                        Customers ({searchResults.customers.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSearchCategory('products')}
                                        className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                                            searchCategory === 'products'
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/50'
                                        }`}
                                    >
                                        Products ({searchResults.products.length})
                                    </button>
                                </div>

                                {/* Results List Container */}
                                <div className="flex-1 overflow-y-auto p-2 space-y-3 min-h-0" style={{ maxHeight: '260px' }}>
                                {searchResults.total === 0 ? (
                                    <div className="py-8 text-center px-4 space-y-2">
                                        <Search className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto" strokeWidth={1.5} />
                                        <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                                            No results for &quot;{searchQuery}&quot;
                                        </p>
                                        <p className="text-xs text-neutral-400 dark:text-neutral-500 max-w-xs mx-auto">
                                            Try searching document numbers (INV-..., RCP-...), customer names, product SKUs, or email addresses.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Documents Group */}
                                        {(searchCategory === 'all' || searchCategory === 'documents') && searchResults.documents.length > 0 && (
                                            <div>
                                                <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 flex items-center justify-between">
                                                    <span>Documents</span>
                                                    <span>{searchResults.documents.length}</span>
                                                </div>
                                                <div className="space-y-1 mt-1">
                                                    {searchResults.documents.map((doc) => {
                                                        const flatIdx = searchResults.flatList.findIndex(i => i.kind === 'document' && i.data.id === doc.id);
                                                        const isSelected = flatIdx === selectedIndex;
                                                        const IconComponent = doc.type === 'invoice' ? FileText : doc.type === 'receipt' ? Receipt : Truck;
                                                        return (
                                                            <button
                                                                key={doc.id}
                                                                ref={(el) => { itemRefs.current[flatIdx] = el; }}
                                                                type="button"
                                                                onClick={() => handleSelectResult({ kind: 'document', data: doc })}
                                                                className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all text-left ${
                                                                    isSelected
                                                                        ? 'bg-blue-50 dark:bg-blue-950/40 border-l-4 border-blue-600'
                                                                        : 'hover:bg-neutral-50 dark:hover:bg-neutral-700/50'
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    <div className="p-2 rounded-lg bg-blue-100/70 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 shrink-0">
                                                                        <IconComponent className="w-4 h-4" />
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-semibold text-xs text-neutral-900 dark:text-white truncate">
                                                                                {doc.documentNumber}
                                                                            </span>
                                                                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium capitalize ${
                                                                                doc.status === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' :
                                                                                doc.status === 'overdue' ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300' :
                                                                                'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300'
                                                                            }`}>
                                                                                {doc.status}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                                                                            {doc.customerName || 'No customer'} • {doc.lineItems?.length || 0} line item(s)
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right shrink-0 ml-2">
                                                                    <span className="font-mono text-xs font-bold text-neutral-800 dark:text-neutral-200">
                                                                        {formatCurrency(doc.grandTotal || 0, company.currency)}
                                                                    </span>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Customers Group */}
                                        {(searchCategory === 'all' || searchCategory === 'customers') && searchResults.customers.length > 0 && (
                                            <div>
                                                <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 flex items-center justify-between">
                                                    <span>Customers</span>
                                                    <span>{searchResults.customers.length}</span>
                                                </div>
                                                <div className="space-y-1 mt-1">
                                                    {searchResults.customers.map((cust) => {
                                                        const flatIdx = searchResults.flatList.findIndex(i => i.kind === 'customer' && i.data.id === cust.id);
                                                        const isSelected = flatIdx === selectedIndex;
                                                        return (
                                                            <button
                                                                key={cust.id}
                                                                ref={(el) => { itemRefs.current[flatIdx] = el; }}
                                                                type="button"
                                                                onClick={() => handleSelectResult({ kind: 'customer', data: cust })}
                                                                className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all text-left ${
                                                                    isSelected
                                                                        ? 'bg-purple-50 dark:bg-purple-950/40 border-l-4 border-purple-600'
                                                                        : 'hover:bg-neutral-50 dark:hover:bg-neutral-700/50'
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    <div className="p-2 rounded-lg bg-purple-100/70 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 shrink-0">
                                                                        <User className="w-4 h-4" />
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-semibold text-xs text-neutral-900 dark:text-white truncate">
                                                                                {cust.name}
                                                                            </span>
                                                                            {cust.customerNumber && (
                                                                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                                                                                    {cust.customerNumber}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                                                                            {[cust.companyName, cust.email, cust.phone].filter(Boolean).join(' • ') || 'No contact details'}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <ChevronRight className="w-4 h-4 text-neutral-300 dark:text-neutral-600 shrink-0" />
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Products Group */}
                                        {(searchCategory === 'all' || searchCategory === 'products') && searchResults.products.length > 0 && (
                                            <div>
                                                <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 flex items-center justify-between">
                                                    <span>Products</span>
                                                    <span>{searchResults.products.length}</span>
                                                </div>
                                                <div className="space-y-1 mt-1">
                                                    {searchResults.products.map((prod) => {
                                                        const flatIdx = searchResults.flatList.findIndex(i => i.kind === 'product' && i.data.id === prod.id);
                                                        const isSelected = flatIdx === selectedIndex;
                                                        return (
                                                            <button
                                                                key={prod.id}
                                                                ref={(el) => { itemRefs.current[flatIdx] = el; }}
                                                                type="button"
                                                                onClick={() => handleSelectResult({ kind: 'product', data: prod })}
                                                                className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all text-left ${
                                                                    isSelected
                                                                        ? 'bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-600'
                                                                        : 'hover:bg-neutral-50 dark:hover:bg-neutral-700/50'
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    <div className="p-2 rounded-lg bg-amber-100/70 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 shrink-0">
                                                                        <Package className="w-4 h-4" />
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-semibold text-xs text-neutral-900 dark:text-white truncate">
                                                                                {prod.name}
                                                                            </span>
                                                                            {prod.sku && (
                                                                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                                                                                    {prod.sku}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                                                                            {prod.category || 'General'} {prod.stockQuantity !== undefined ? `• Stock: ${prod.stockQuantity}` : ''}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right shrink-0 ml-2">
                                                                    <span className="font-mono text-xs font-bold text-neutral-800 dark:text-neutral-200">
                                                                        {formatCurrency(prod.unitPrice || 0, company.currency)}
                                                                    </span>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Footer Shortcuts hint */}
                            <div className="flex-shrink-0 p-2 bg-neutral-50 dark:bg-neutral-900/70 border-t border-neutral-100 dark:border-neutral-700/60 flex items-center justify-between text-[11px] text-neutral-400 dark:text-neutral-500 px-3">
                                <div className="flex items-center gap-3">
                                    <span className="flex items-center gap-1">
                                        <kbd className="font-mono bg-white dark:bg-neutral-700 px-1 py-0.5 rounded border border-neutral-200 dark:border-neutral-600 text-[10px]">↑↓</kbd> Navigate
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <kbd className="font-mono bg-white dark:bg-neutral-700 px-1 py-0.5 rounded border border-neutral-200 dark:border-neutral-600 text-[10px]">↵</kbd> Select
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <kbd className="font-mono bg-white dark:bg-neutral-700 px-1 py-0.5 rounded border border-neutral-200 dark:border-neutral-600 text-[10px]">ESC</kbd> Close
                                    </span>
                                </div>
                                <span>{searchResults.total} item(s)</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2">
                    {/* Shopping Cart Button */}
                    <button
                        type="button"
                        onClick={() => setIsGlobalCartOpen(true)}
                        className="relative p-2 text-neutral-500 hover:text-[#2d3748] dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all duration-200 cursor-pointer"
                        title="Shopping Cart"
                    >
                        <ShoppingBag className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
                        {cartTotalCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-[#fc6d2d] text-white text-[10px] font-extrabold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center border-2 border-white dark:border-neutral-800 shadow-md animate-in zoom-in-50">
                                {cartTotalCount > 99 ? '99+' : cartTotalCount}
                            </span>
                        )}
                    </button>

                    {/* Theme Toggle */}
                    <ThemeToggleSimple />

                    <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />

                    <div className="h-8 w-px bg-neutral-100 dark:bg-neutral-700 mx-2 hidden sm:block"></div>

                    {/* User Menu */}
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={toggleUserMenu}
                            className="flex items-center gap-3 pl-2 pr-2 py-1.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-all duration-200 cursor-pointer group"
                        >
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-semibold text-[#2d3748] dark:text-neutral-100 leading-none">
                                    {displayName}
                                </p>
                                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5 max-w-[150px] truncate">
                                    {email}
                                </p>
                            </div>
                            
                            <div className="relative">
                                {photoURL ? (
                                    <img
                                        src={photoURL}
                                        alt={displayName}
                                        className="w-9 h-9 rounded-full object-cover shadow-sm border border-neutral-100 dark:border-neutral-700"
                                    />
                                ) : (
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center overflow-hidden shadow-sm">
                                        <span className="text-white text-sm font-medium">{initials}</span>
                                    </div>
                                )}
                                {pendingCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-neutral-800"></span>
                                )}
                            </div>
                            
                            <ChevronDown
                                className={`text-neutral-400 w-4 h-4 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`}
                                strokeWidth={2}
                            />
                        </button>

                        {/* Dropdown Menu */}
                        {isUserMenuOpen && (
                            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-neutral-800 rounded-2xl shadow-xl border border-neutral-100 dark:border-neutral-700 py-2 z-50 overflow-hidden">
                                {activeTab === 'main' ? (
                                    <>
                                        {/* User Info */}
                                        <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-700">
                                            <p className="text-sm font-semibold text-[#2d3748] dark:text-white">
                                                {displayName}
                                            </p>
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                                                {email}
                                            </p>
                                        </div>

                                        {/* Pending Organization Invitations Banner */}
                                        {pendingInvitations && pendingInvitations.length > 0 && (
                                            <div className="px-3 py-2 border-b border-amber-200 dark:border-amber-900 bg-amber-50/90 dark:bg-amber-950/40">
                                                <div className="flex items-center justify-between px-1 mb-1.5">
                                                    <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1">
                                                        <Building className="w-3 h-3 text-amber-600" />
                                                        Pending Org Invites ({pendingInvitations.length})
                                                    </span>
                                                </div>

                                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                                    {pendingInvitations.map((invite) => (
                                                        <div
                                                            key={invite.id}
                                                            className="p-2 rounded-xl bg-white dark:bg-neutral-800 border border-amber-200/80 dark:border-amber-800/80 shadow-sm"
                                                        >
                                                            <div className="flex items-center justify-between gap-1 mb-1">
                                                                <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                                                                    {invite.orgName}
                                                                </span>
                                                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 capitalize">
                                                                    {invite.role === 'admin' ? 'Co-Admin' : invite.role === 'inventory_manager' ? 'Manager' : 'Cashier'}
                                                                </span>
                                                            </div>
                                                            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mb-2 truncate">
                                                                From: {invite.inviterEmail}
                                                            </p>

                                                            <div className="flex items-center gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={async () => {
                                                                        try {
                                                                            await respondToOrgInvitation(invite.id, 'accepted');
                                                                        } catch (e) {}
                                                                        acceptInvitation(invite);
                                                                        setIsUserMenuOpen(false);
                                                                        toast.success(`Joined ${invite.orgName} as ${invite.role}!`);
                                                                    }}
                                                                    className="flex-1 py-1 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                                                >
                                                                    <Check className="w-3 h-3" /> Accept
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={async () => {
                                                                        try {
                                                                            await respondToOrgInvitation(invite.id, 'declined');
                                                                        } catch (e) {}
                                                                        declineInvitation(invite.id);
                                                                        toast.success(`Declined invite to ${invite.orgName}`);
                                                                    }}
                                                                    className="py-1 px-2.5 rounded-lg bg-neutral-200 dark:bg-neutral-700 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/40 font-bold text-[11px] text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                                                                >
                                                                    Decline
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Organization Switcher Section */}
                                        <div className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-700 bg-neutral-50/70 dark:bg-neutral-900">
                                            <div className="flex items-center justify-between px-1 mb-1.5">
                                                <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                                                    My Organizations
                                                </span>
                                                <button
                                                    onClick={() => setIsCreateOrgModalOpen(true)}
                                                    className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                                                >
                                                    <Plus className="w-3 h-3" /> New
                                                </button>
                                            </div>

                                            <div className="space-y-1 max-h-36 overflow-y-auto">
                                                {organizations.map((org) => {
                                                    const isActive = org.id === activeOrganizationId;
                                                    return (
                                                        <button
                                                            key={org.id}
                                                            onClick={() => {
                                                                setActiveOrganization(org.id);
                                                                toast.success(`Switched to ${org.name}`);
                                                            }}
                                                            className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer ${
                                                                isActive
                                                                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold border border-blue-200/60 dark:border-blue-800/60'
                                                                    : 'hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <Building className="w-3.5 h-3.5 shrink-0 opacity-70" />
                                                                <span className="text-xs truncate">{org.name}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                <span className="text-[10px] px-1.5 py-0.2 rounded font-bold uppercase bg-neutral-200/70 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                                                                    {org.roleInOrg === 'admin' ? 'Owner' : org.roleInOrg === 'inventory_manager' ? 'Manager' : 'Cashier'}
                                                                </span>
                                                                {isActive && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            <Link
                                                href="/settings?tab=team"
                                                onClick={() => setIsUserMenuOpen(false)}
                                                className="mt-2 w-full py-1.5 px-2 rounded-xl bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 text-xs font-semibold text-neutral-700 dark:text-neutral-200 flex items-center justify-center gap-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-600 transition-colors"
                                            >
                                                <UserPlus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                                <span>Invite Staff / Manage Team</span>
                                            </Link>
                                        </div>

                                        {/* Menu Items */}
                                        <div className="py-1.5">
                                            <Link
                                                href="/settings"
                                                onClick={() => setIsUserMenuOpen(false)}
                                                className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
                                            >
                                                <Settings className="w-4 h-4 text-neutral-400" />
                                                Settings
                                            </Link>
                                            
                                            <button
                                                onClick={() => setActiveTab('notifications')}
                                                className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Bell className="w-4 h-4 text-neutral-400" />
                                                    <span>Notifications</span>
                                                </div>
                                                {pendingCount > 0 && (
                                                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                                                        {pendingCount}
                                                    </span>
                                                )}
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setIsUserMenuOpen(false);
                                                    setIsFeedbackOpen(true);
                                                }}
                                                className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors w-full text-left"
                                            >
                                                <MessageSquare className="w-4 h-4 text-neutral-400" />
                                                Send Feedback
                                            </button>
                                        </div>

                                        {/* Logout */}
                                        <div className="border-t border-neutral-100 dark:border-neutral-700 pt-1.5">
                                            <button
                                                onClick={handleLogout}
                                                className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors w-full text-left"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                Sign out
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* Notifications / Tasks view */}
                                        <div className="flex items-center justify-between px-3 py-2.5 border-b border-neutral-100 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/50">
                                            <button
                                                onClick={() => setActiveTab('main')}
                                                className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                                Back
                                            </button>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs font-bold text-[#2d3748] dark:text-white">Notifications</span>
                                                {pendingCount > 0 && (
                                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                                                        {pendingCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="max-h-[300px] overflow-y-auto p-2">
                                            {tasks.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center text-center py-6 px-4">
                                                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full mb-2">
                                                        <Check className="w-4 h-4" strokeWidth={2.5} />
                                                    </div>
                                                    <p className="text-xs font-bold text-[#2d3748] dark:text-white">All caught up!</p>
                                                    <p className="text-[10px] text-neutral-400 mt-0.5">No pending actions.</p>
                                                </div>
                                            ) : (
                                                <ul className="flex flex-col gap-0.5">
                                                    {tasks.map((task) => (
                                                        <li
                                                            key={task.id}
                                                            onClick={() => {
                                                                const note = notifications.find(n => n.id === task.id);
                                                                if (note) {
                                                                    if (note.ctaLink) window.open(note.ctaLink, '_blank');
                                                                } else {
                                                                    router.push(`/${task.type}s/${task.documentId}`);
                                                                    setIsUserMenuOpen(false);
                                                                    setActiveTab('main');
                                                                }
                                                            }}
                                                            className="group flex items-start gap-2.5 p-2 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-all cursor-pointer"
                                                        >
                                                            <div className="mt-0.5 relative flex items-center justify-center">
                                                                {notifications.some(n => n.id === task.id) ? (
                                                                    (() => {
                                                                        const note = notifications.find(n => n.id === task.id);
                                                                        const noteType = (note?.type || 'announcement') as 'announcement' | 'promotion' | 'greeting' | 'warning';
                                                                        const Icon = typeConfig[noteType].icon;
                                                                        const colorClass = typeConfig[noteType].color;
                                                                        return <Icon className={`w-3.5 h-3.5 ${colorClass}`} />;
                                                                    })()
                                                                ) : (
                                                                    <div className={`w-1.5 h-1.5 rounded-full ${priorityConfig[task.priority as 'urgent' | 'normal' | 'low']?.dotClass || ''}`}></div>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-semibold text-[#2d3748] dark:text-white group-hover:text-neutral-700 dark:group-hover:text-neutral-200 transition-colors line-clamp-1">
                                                                    {task.title}
                                                                </p>
                                                                <div className="flex items-center gap-1 mt-0.5">
                                                                    <p className={`text-[10px] ${priorityConfig[task.priority as 'urgent' | 'normal' | 'low']?.textClass || ''}`}>
                                                                        {task.category}
                                                                    </p>
                                                                    {notifications.find(n => n.id === task.id)?.message && (
                                                                        <span className="text-[10px] text-neutral-400 truncate max-w-[120px]">
                                                                            - {notifications.find(n => n.id === task.id)?.message}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <ArrowRight className="w-3.5 h-3.5 text-neutral-300 group-hover:text-neutral-500 dark:text-neutral-600 dark:group-hover:text-neutral-400 transition-colors opacity-0 group-hover:opacity-100" />
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>

                                        {/* Footer */}
                                        <div className="p-2.5 bg-neutral-50 dark:bg-neutral-900/30 border-t border-neutral-100 dark:border-neutral-700">
                                            <div className="flex items-start gap-2 px-1">
                                                <Sparkles className="w-3 h-3 text-blue-500 mt-0.5" />
                                                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                                    Use <kbd className="font-mono bg-white dark:bg-neutral-700 px-1 py-0.5 rounded border border-neutral-200 dark:border-neutral-600 text-[9px]">⌘K</kbd> to search everything.
                                                </p>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Create Organization Modal */}
            {isCreateOrgModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-neutral-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-neutral-100 dark:border-neutral-700 animate-in zoom-in-95">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                                    <Building className="w-5 h-5" />
                                </div>
                                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                                    Create New Organization
                                </h3>
                            </div>
                            <button
                                onClick={() => setIsCreateOrgModalOpen(false)}
                                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            Set up a new store or business branch. You will be assigned as the Organization Owner.
                        </p>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                                    Organization / Business Name
                                </label>
                                <input
                                    type="text"
                                    value={newOrgName}
                                    onChange={(e) => setNewOrgName(e.target.value)}
                                    placeholder="e.g. Lagos Island Branch, Refloww Fashion..."
                                    className="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-xl text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => setIsCreateOrgModalOpen(false)}
                                className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (!newOrgName.trim()) {
                                        toast.error('Please enter an organization name');
                                        return;
                                    }
                                    const createdId = createOrganization(newOrgName, user?.email || 'contact@mycompany.com');
                                    toast.success(`Organization "${newOrgName}" created!`);
                                    setNewOrgName('');
                                    setIsCreateOrgModalOpen(false);
                                    setIsUserMenuOpen(false);
                                }}
                                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm cursor-pointer"
                            >
                                Create & Switch
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* GLOBAL SHOPPING CART MODAL */}
            <Modal
                isOpen={isGlobalCartOpen}
                onClose={() => setIsGlobalCartOpen(false)}
                title="Your Shopping Cart"
                size="md"
            >
                {cart.length === 0 ? (
                    <div className="p-8 text-center space-y-3">
                        <div className="w-14 h-14 bg-neutral-100 dark:bg-neutral-800 text-neutral-400 rounded-2xl flex items-center justify-center mx-auto">
                            <ShoppingBag className="w-7 h-7" />
                        </div>
                        <h3 className="text-base font-bold text-[#2d3748] dark:text-white">Your cart is empty</h3>
                        <p className="text-xs text-neutral-500 max-w-xs mx-auto">Items added from your catalog or storefront will appear here.</p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setIsGlobalCartOpen(false);
                                router.push('/storefront/catalog');
                            }}
                        >
                            Browse Storefront Catalog
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between text-xs text-neutral-500 pb-2 border-b border-neutral-100 dark:border-neutral-700">
                            <span>{cartTotalCount} {cartTotalCount === 1 ? 'item' : 'items'} in cart</span>
                            <button
                                onClick={clearCart}
                                className="text-rose-500 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> Clear All
                            </button>
                        </div>

                        <div className="divide-y divide-neutral-100 dark:divide-neutral-700 max-h-72 overflow-y-auto pr-1">
                            {cart.map(item => {
                                const price = item.product.discountedPrice || item.product.unitPrice;
                                return (
                                    <div key={item.product.id} className="py-3 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            {item.product.imageUrl ? (
                                                <img src={item.product.imageUrl} alt={item.product.name} className="w-11 h-11 rounded-xl object-cover shrink-0 border border-neutral-100 dark:border-neutral-700" />
                                            ) : (
                                                <div className="w-11 h-11 bg-neutral-100 dark:bg-neutral-700 rounded-xl flex items-center justify-center text-neutral-400 shrink-0">
                                                    <ShoppingBag className="w-5 h-5" />
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <h4 className="font-semibold text-xs text-[#2d3748] dark:text-white truncate">{item.product.name}</h4>
                                                <p className="text-[11px] text-neutral-400">{formatCurrency(price, company.currency)} each</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2.5 shrink-0">
                                            <div className="flex items-center border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden bg-neutral-50 dark:bg-neutral-800">
                                                <button
                                                    type="button"
                                                    onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                                                    className="p-1 text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition-colors cursor-pointer"
                                                >
                                                    <Minus className="w-3.5 h-3.5" />
                                                </button>
                                                <span className="px-2 text-xs font-bold text-[#2d3748] dark:text-white">{item.quantity}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                                                    className="p-1 text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition-colors cursor-pointer"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                </button>
                                            </div>

                                            <span className="text-xs font-bold text-[#2d3748] dark:text-white min-w-[55px] text-right">
                                                {formatCurrency(price * item.quantity, company.currency)}
                                            </span>

                                            <button
                                                type="button"
                                                onClick={() => removeFromCart(item.product.id)}
                                                className="p-1 text-neutral-400 hover:text-rose-500 transition-colors cursor-pointer"
                                                title="Remove item"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Total Summary */}
                        <div className="p-4 bg-neutral-50 dark:bg-neutral-800/80 rounded-2xl space-y-1.5 border border-neutral-200/60 dark:border-neutral-700/60">
                            <div className="flex items-center justify-between text-xs text-neutral-500">
                                <span>Subtotal</span>
                                <span className="font-semibold text-[#2d3748] dark:text-white">{formatCurrency(cartSubtotal, company.currency)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm font-bold pt-2 border-t border-neutral-200 dark:border-neutral-700">
                                <span className="text-[#2d3748] dark:text-white">Total Amount</span>
                                <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(cartSubtotal, company.currency)}</span>
                            </div>
                        </div>
                    </div>
                )}

                <ModalFooter>
                    <Button variant="ghost" onClick={() => setIsGlobalCartOpen(false)}>Close</Button>
                    {cart.length > 0 && (
                        <Button
                            variant="primary"
                            onClick={() => {
                                setIsGlobalCartOpen(false);
                                router.push('/storefront/catalog');
                            }}
                            rightIcon={<ArrowRight className="w-4 h-4" />}
                        >
                            Proceed to Checkout
                        </Button>
                    )}
                </ModalFooter>
            </Modal>
        </header>
    );
}
