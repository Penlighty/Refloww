"use client";

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useProductStore, useStorefrontStore, useSettingsStore, useDiscountStore, useOrganizationStore } from '@/lib/store';
import { Button, Input, Textarea, Modal, ModalFooter, ImageUploader, Select, PageHelpModal, SubTabs } from '@/components/ui';
import { formatCurrency, formatDate, NIGERIAN_BANKS, autoGenerateVendorSubaccounts } from '@/lib/utils';
import { Product } from '@/lib/types';
import { StorefrontCatalogContent } from '@/components/storefront/StorefrontCatalogContent';
import { validateContentPolicy } from '@/lib/utils/contentPolicy';
import {
    Store,
    ExternalLink,
    Copy,
    Check,
    X,
    Eye,
    EyeOff,
    Edit2,
    Tag,
    ShoppingBag,
    FileText,
    Receipt as ReceiptIcon,
    DollarSign,
    Settings,
    Package,
    Sparkles,
    Image as ImageIcon,
    CheckCircle2,
    Clock,
    AlertCircle,
    SlidersHorizontal,
    Search,
    Monitor,
    Tablet,
    Smartphone,
    Globe,
    Mail,
    Phone,
    CreditCard,
    Building2
} from 'lucide-react';

const THEME_PRESETS = [
    {
        id: 'slate-dark',
        name: 'Slate Dark Elegance',
        headerGradient: 'from-slate-900 via-neutral-900 to-slate-800',
        primaryAccentColor: '#2563eb',
        textColor: '#ffffff',
        previewSwatches: ['#0f172a', '#1e293b', '#2563eb']
    },
    {
        id: 'ocean-blue',
        name: 'Ocean Cyan Breeze',
        headerGradient: 'from-cyan-900 via-blue-900 to-slate-900',
        primaryAccentColor: '#0891b2',
        textColor: '#ffffff',
        previewSwatches: ['#164e63', '#1e3a8a', '#0891b2']
    },
    {
        id: 'emerald-green',
        name: 'Emerald Forest',
        headerGradient: 'from-emerald-950 via-teal-900 to-neutral-900',
        primaryAccentColor: '#059669',
        textColor: '#ffffff',
        previewSwatches: ['#022c22', '#134e4a', '#059669']
    },
    {
        id: 'royal-purple',
        name: 'Royal Violet',
        headerGradient: 'from-purple-950 via-indigo-950 to-neutral-900',
        primaryAccentColor: '#7c3aed',
        textColor: '#ffffff',
        previewSwatches: ['#3b0764', '#312e81', '#7c3aed']
    },
    {
        id: 'sunset-rose',
        name: 'Warm Sunset Rose',
        headerGradient: 'from-rose-950 via-amber-950 to-slate-950',
        primaryAccentColor: '#e11d48',
        textColor: '#ffffff',
        previewSwatches: ['#4c0519', '#451a03', '#e11d48']
    },
    {
        id: 'clean-light',
        name: 'Minimalist Clean',
        headerGradient: 'from-neutral-100 via-white to-neutral-200',
        primaryAccentColor: '#18181b',
        textColor: '#18181b',
        previewSwatches: ['#f5f5f5', '#ffffff', '#18181b']
    }
];

export default function StorefrontAdminPage() {
    const { products, getFilteredProducts, updateProduct } = useProductStore();
    const { settings, updateSettings, orders, isSlugAvailable, getFilteredOrders } = useStorefrontStore();
    const activeOrgId = useOrganizationStore((state) => state.activeOrganizationId);
    const displayProducts = useMemo(() => getFilteredProducts(), [products, activeOrgId, getFilteredProducts]);
    const displayOrders = useMemo(() => getFilteredOrders(), [orders, activeOrgId, getFilteredOrders]);
    const { company } = useSettingsStore();

    const activeCurrency = company.currency || settings.currency || 'USD';

    const activeLogo = settings.logoUrl || company.logo;

    const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'preview' | 'settings'>('products');
    const [copiedLink, setCopiedLink] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [slugInput, setSlugInput] = useState(settings.storeSlug || 'my-store');
    const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => {
        setSlugInput(settings.storeSlug || 'my-store');
    }, [settings.storeSlug]);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToastMessage({ message, type });
        setTimeout(() => setToastMessage(null), 4000);
    };

    const { discounts } = useDiscountStore();

    // Product edit modal state
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [productForm, setProductForm] = useState({
        imageUrl: '',
        images: ['', '', '', '', ''],
        discountId: '',
        discountedPrice: '',
        isPublishedToStore: false,
        storeDescription: '',
    });

    const storeUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/s/${settings.storeSlug}`
        : `/s/${settings.storeSlug}`;

    const slugIsAvailable = useMemo(() => {
        return isSlugAvailable(slugInput);
    }, [slugInput, isSlugAvailable]);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(storeUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    const publishedCount = useMemo(() => {
        return displayProducts.filter(p => p.isPublishedToStore !== false).length;
    }, [displayProducts]);

    const totalStorefrontRevenue = useMemo(() => {
        return displayOrders.reduce((acc, order) => acc + (order.grandTotal || 0), 0);
    }, [displayOrders]);

    const categories = useMemo(() => {
        const set = new Set<string>();
        displayProducts.forEach(p => {
            if (p.category) set.add(p.category);
        });
        return Array.from(set);
    }, [displayProducts]);

    const filteredProducts = useMemo(() => {
        return displayProducts.filter(p => {
            const matchesSearch = !searchQuery.trim() ||
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.sku.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [displayProducts, searchQuery, selectedCategory]);

    const openEditModal = (product: Product) => {
        setEditingProduct(product);

        let initialImages = product.images && product.images.length > 0 ? [...product.images] : [product.imageUrl || ''];
        while (initialImages.length < 5) {
            initialImages.push('');
        }

        let initialDiscountId = product.discountId || '';
        if (!initialDiscountId && product.discountedPrice && product.discountedPrice < product.unitPrice) {
            const match = discounts.find(d => {
                const calculated = Math.round(product.unitPrice * (1 - d.percentage / 100) * 100) / 100;
                return Math.abs(calculated - product.discountedPrice!) < 0.05;
            });
            if (match) initialDiscountId = match.id;
        }

        setProductForm({
            imageUrl: product.imageUrl || '',
            images: initialImages.slice(0, 5),
            discountId: initialDiscountId,
            discountedPrice: product.discountedPrice ? String(product.discountedPrice) : '',
            isPublishedToStore: product.isPublishedToStore !== false,
            storeDescription: product.storeDescription || product.description || '',
        });
    };

    const handleSaveProductStoreInfo = () => {
        if (!editingProduct) return;

        const policyCheck = validateContentPolicy({
            storeDescription: productForm.storeDescription,
        });
        if (!policyCheck.isValid) {
            showToast(policyCheck.violationReason || 'Prohibited content detected.', 'error');
            return;
        }

        const validImages = productForm.images.filter(img => img.trim() !== '');
        const primaryImage = validImages[0] || productForm.imageUrl || editingProduct.imageUrl;

        let computedDiscountedPrice: number | undefined = undefined;
        if (productForm.discountId) {
            const foundDiscount = discounts.find(d => d.id === productForm.discountId);
            if (foundDiscount && foundDiscount.isActive) {
                computedDiscountedPrice = Math.round(editingProduct.unitPrice * (1 - foundDiscount.percentage / 100) * 100) / 100;
            }
        }

        updateProduct(editingProduct.id, {
            imageUrl: primaryImage,
            images: validImages,
            discountId: productForm.discountId || undefined,
            discountedPrice: computedDiscountedPrice,
            isPublishedToStore: productForm.isPublishedToStore,
            storeDescription: productForm.storeDescription,
        });
        setEditingProduct(null);
    };

    const togglePublishState = (product: Product, e: React.MouseEvent) => {
        e.stopPropagation();
        const current = product.isPublishedToStore !== false;
        updateProduct(product.id, {
            isPublishedToStore: !current
        });
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Header Banner - Solid Dark Background with Settings Logo */}
            <div className="bg-[#2d3748] dark:bg-[#1a202c] rounded-3xl p-6 md:p-8 text-white shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-start sm:items-center gap-4 sm:gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/15 overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                                {activeLogo ? (
                                    <img src={activeLogo} alt={settings.storeName || company.name} className="w-full h-full object-contain p-1.5 rounded-xl" />
                                ) : (
                                    <Store className="w-7 h-7 text-blue-400" />
                                )}
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{settings.storeName || company.name}</h1>
                                    <PageHelpModal
                                        title="Storefront & E-Commerce Hub"
                                        description="Public online store catalog allowing buyers to browse your products, place orders online, and generate instant invoice receipts."
                                        terms={[
                                            { term: 'Custom Store Slug', definition: 'Unique URL link to share on social media or WhatsApp for customer orders.' },
                                            { term: 'Automated Merchant Payouts', definition: 'Direct bank settlement subaccounts (Paystack / Monnify) for online customer payments.' }
                                        ]}
                                    />
                                </div>
                                <p className="text-sm text-neutral-300 max-w-xl leading-relaxed">Share your custom storefront link with customers to showcase products and take orders.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={handleCopyLink}
                            leftIcon={copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-neutral-300" />}
                            iconOnlyMobile
                            title={copiedLink ? 'Copied Catalog Link!' : 'Copy Catalog Link'}
                            aria-label="Copy Catalog Link"
                            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md"
                        >
                            {copiedLink ? 'Copied Link!' : 'Copy Link'}
                        </Button>
                        <Link href={`/s/${settings.storeSlug}`} target="_blank">
                            <Button variant="primary" leftIcon={<ExternalLink className="w-4 h-4" />} className="shadow-lg shadow-blue-500/20 px-3 sm:px-4">
                                Open Storefront
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Stats Bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
                    <div>
                        <p className="text-xs text-neutral-400 font-medium">Storefront Status</p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`w-2.5 h-2.5 rounded-full ${settings.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'}`} />
                            <span className="text-sm font-semibold">{settings.isActive ? 'Live & Accepting Orders' : 'Inactive'}</span>
                        </div>
                    </div>
                    <div>
                        <p className="text-xs text-neutral-400 font-medium">Store Products</p>
                        <p className="text-lg font-bold mt-0.5">{publishedCount} of {displayProducts.length} Published</p>
                    </div>
                    <div>
                        <p className="text-xs text-neutral-400 font-medium">Storefront Orders</p>
                        <p className="text-lg font-bold mt-0.5">{displayOrders.length} Orders</p>
                    </div>
                    <div>
                        <p className="text-xs text-neutral-400 font-medium">Total Store Revenue</p>
                        <p className="text-lg font-bold mt-0.5 text-emerald-400">{formatCurrency(totalStorefrontRevenue, activeCurrency)}</p>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-neutral-200 dark:border-neutral-700 pb-2">
                <SubTabs
                    activeTab={activeTab}
                    onChangeTab={(tabId) => setActiveTab(tabId as any)}
                    tabs={[
                        {
                            id: 'products',
                            label: 'Storefront Products',
                            icon: Package,
                            count: displayProducts.length,
                            helpModal: {
                                title: 'Storefront Catalog Products',
                                description: 'Select which catalog items are published online, apply discounts/sale tags, and edit public descriptions.',
                                terms: [
                                    { term: 'Publish Toggle', definition: 'Eye icon button to make a product visible or hidden from your public online catalog.' }
                                ]
                            }
                        },
                        {
                            id: 'orders',
                            label: 'Orders',
                            icon: ShoppingBag,
                            count: displayOrders.length,
                            helpModal: {
                                title: 'Storefront Orders Log',
                                description: 'Track incoming web orders placed by customers through your public catalog link.'
                            }
                        },
                        {
                            id: 'preview',
                            label: 'Store Preview',
                            icon: Eye,
                            helpModal: {
                                title: 'Interactive Storefront Preview',
                                description: 'Real-time interactive preview of your public store catalog on desktop, tablet, and mobile displays.'
                            }
                        },
                        {
                            id: 'settings',
                            label: 'Store Settings',
                            icon: Settings,
                            helpModal: {
                                title: 'Storefront Configuration',
                                description: 'Customize store branding, logo, banner image, custom URL slug, contact details, and payment payout bank details.'
                            }
                        }
                    ]}
                />
            </div>

            {/* TAB 1: PRODUCTS MANAGER */}
            {activeTab === 'products' && (
                <div className="space-y-6">
                    {/* Filters & Search */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-neutral-800 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-700">
                        <div className="relative flex-1 flex items-center">
                            <Search className="absolute left-3.5 w-4 h-4 text-neutral-400 pointer-events-none z-10" />
                            <input
                                type="text"
                                placeholder="Search storefront products by name or SKU..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ paddingLeft: '2.5rem' }}
                                className="w-full pr-4 py-2.5 text-sm bg-neutral-50 dark:bg-neutral-700/50 border border-neutral-200 dark:border-neutral-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-[#2d3748] dark:text-white"
                            />
                        </div>

                        {categories.length > 0 && (
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                                <button
                                    onClick={() => setSelectedCategory('all')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-nowrap ${selectedCategory === 'all'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
                                        }`}
                                >
                                    All Categories
                                </button>
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-nowrap ${selectedCategory === cat
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Products Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                        {filteredProducts.map(product => {
                            const isPublished = product.isPublishedToStore !== false;
                            const hasDiscount = product.discountedPrice && product.discountedPrice < product.unitPrice;

                            return (
                                <div
                                    key={product.id}
                                    className={`group bg-white dark:bg-neutral-800 border rounded-2xl overflow-hidden transition-all duration-200 flex flex-col hover:shadow-lg ${isPublished
                                            ? 'border-neutral-200 dark:border-neutral-700'
                                            : 'border-neutral-200/60 dark:border-neutral-700/60 opacity-60 bg-neutral-50/50 dark:bg-neutral-900/50'
                                        }`}
                                >
                                    {/* Product Image Box */}
                                    <div className="relative h-36 sm:h-48 bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center overflow-hidden">
                                        {product.imageUrl ? (
                                            <img
                                                src={product.imageUrl}
                                                alt={product.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        ) : (
                                            <div className="text-neutral-400 flex flex-col items-center gap-1">
                                                <ImageIcon className="w-8 h-8" />
                                                <span className="text-[11px]">No Photo</span>
                                            </div>
                                        )}

                                        {/* Status Badge */}
                                        {hasDiscount && (
                                            <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                                                <span
                                                    style={{ backgroundColor: '#e11d48', color: '#ffffff' }}
                                                    className="px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-extrabold shadow-md uppercase tracking-wider border border-white/20"
                                                >
                                                    SALE
                                                </span>
                                            </div>
                                        )}

                                        {/* Publish Toggle Button */}
                                        <button
                                            onClick={(e) => togglePublishState(product, e)}
                                            className="absolute top-3 right-3 p-2 bg-white/90 dark:bg-neutral-800/90 rounded-full text-neutral-700 dark:text-neutral-200 hover:scale-110 transition-transform shadow-md"
                                            title={isPublished ? 'Hide from Storefront' : 'Publish to Storefront'}
                                        >
                                            {isPublished ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4 text-neutral-400" />}
                                        </button>
                                    </div>

                                    {/* Product Details */}
                                    <div className="p-3 sm:p-5 flex-1 flex flex-col justify-between space-y-2 sm:space-y-4">
                                        <div>
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <span className="text-xs font-mono text-neutral-400 dark:text-neutral-500 uppercase">{product.sku}</span>
                                                {product.category && (
                                                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                                                        {product.category}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="font-bold text-[#2d3748] dark:text-white line-clamp-1 group-hover:text-blue-600 transition-colors">{product.name}</h3>
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">{product.storeDescription || product.description || 'No description added.'}</p>
                                        </div>

                                        {/* Pricing & Controls */}
                                        <div className="pt-3 border-t border-neutral-100 dark:border-neutral-700 flex items-center justify-between">
                                            <div>
                                                {hasDiscount ? (
                                                    <div className="flex flex-col items-start leading-tight">
                                                        <span className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                                            {formatCurrency(product.discountedPrice!, activeCurrency)}
                                                        </span>
                                                        <span className="text-xs text-neutral-400 line-through">
                                                            {formatCurrency(product.unitPrice, activeCurrency)}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-lg font-bold text-[#2d3748] dark:text-white">
                                                        {formatCurrency(product.unitPrice, activeCurrency)}
                                                    </span>
                                                )}
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => openEditModal(product)}
                                                className="p-2 text-neutral-500 hover:text-blue-600 dark:text-neutral-400 dark:hover:text-blue-400 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 rounded-xl transition-colors"
                                                title="Edit Store Info"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* TAB 2: STORE ORDERS */}
            {activeTab === 'orders' && (
                <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-neutral-100 dark:border-neutral-700 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-[#2d3748] dark:text-white">Storefront Orders</h2>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">Orders submitted by customers via your public storefront catalog.</p>
                        </div>
                    </div>

                    {displayOrders.length === 0 ? (
                        <div className="p-12 text-center space-y-3">
                            <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-700 text-neutral-400 rounded-full flex items-center justify-center mx-auto">
                                <ShoppingBag className="w-6 h-6" />
                            </div>
                            <h3 className="text-base font-semibold text-[#2d3748] dark:text-white">No storefront orders yet</h3>
                            <p className="text-xs text-neutral-500 max-w-md mx-auto">Share your storefront catalog link with customers to start receiving orders online.</p>
                            <Button variant="outline" onClick={handleCopyLink} leftIcon={<Copy className="w-4 h-4" />}>
                                Copy Storefront Link
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-neutral-50 dark:bg-neutral-700/50 border-b border-neutral-100 dark:border-neutral-700">
                                    <tr>
                                        <th className="text-left px-6 py-3 text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Order No</th>
                                        <th className="text-left px-6 py-3 text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Customer</th>
                                        <th className="text-left px-6 py-3 text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Date</th>
                                        <th className="text-left px-6 py-3 text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Items</th>
                                        <th className="text-right px-6 py-3 text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Total</th>
                                        <th className="text-center px-6 py-3 text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Generated Documents</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayOrders.map(order => (
                                        <tr key={order.id} className="border-b border-neutral-50 dark:border-neutral-700/50 hover:bg-neutral-50/50 dark:hover:bg-neutral-700/30">
                                            <td className="px-6 py-4 font-mono text-sm font-semibold text-[#2d3748] dark:text-white">{order.orderNumber}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm text-[#2d3748] dark:text-white">{order.customerName}</span>
                                                    <span className="text-xs text-neutral-400">{order.customerPhone || order.customerEmail}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-neutral-500 dark:text-neutral-400">{formatDate(order.createdAt)}</td>
                                            <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-300">
                                                {order.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-[#2d3748] dark:text-white">
                                                {formatCurrency(order.grandTotal, activeCurrency)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    {order.invoiceId && (
                                                        <Link href={`/invoices/${order.invoiceId}`}>
                                                            <Button variant="ghost" size="sm" leftIcon={<FileText className="w-3.5 h-3.5 text-blue-500" />}>
                                                                Invoice
                                                            </Button>
                                                        </Link>
                                                    )}
                                                    {order.receiptId && (
                                                        <Link href={`/receipts/${order.receiptId}`}>
                                                            <Button variant="ghost" size="sm" leftIcon={<ReceiptIcon className="w-3.5 h-3.5 text-emerald-500" />}>
                                                                Receipt
                                                            </Button>
                                                        </Link>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 3: STORE PREVIEW */}
            {activeTab === 'preview' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 rounded-xl">
                                <Eye className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-[#2d3748] dark:text-white">Live Storefront Interactive Preview</h3>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">Preview your customer catalog layout, products, and checkout experience in real-time.</p>
                            </div>
                        </div>
                        <a
                            href="/storefront/catalog"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
                        >
                            <span>Open Full Screen</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    </div>

                    <div className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden shadow-sm bg-neutral-50 dark:bg-neutral-900 p-2 md:p-6 min-h-[850px]">
                        <StorefrontCatalogContent isEmbedded={true} />
                    </div>
                </div>
            )}

            {/* TAB 4: STORE SETTINGS */}
            {activeTab === 'settings' && (
                <div className="space-y-8 max-w-4xl">
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
                        <div>
                            <h2 className="text-lg font-bold text-[#2d3748] dark:text-white">Storefront Branding & Configuration</h2>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">Customize how your online store looks and functions for public customers.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input
                                label="Storefront Name"
                                value={settings.storeName}
                                onChange={(e) => updateSettings({ storeName: e.target.value })}
                                placeholder="e.g. Acme Tech Store"
                            />

                            {/* Store Slug with Uniqueness Checker */}
                            <div>
                                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-300 mb-1">
                                    Custom Store Slug / URL Identifier
                                </label>
                                <div className="space-y-1.5">
                                    <div className="relative">
                                        <Input
                                            value={slugInput}
                                            onChange={(e) => {
                                                const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                                                setSlugInput(val);
                                            }}
                                            placeholder="e.g. acme-tech"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        {slugInput.trim() ? (
                                            slugIsAvailable ? (
                                                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Unique & available!
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-xs font-semibold text-rose-500">
                                                    <AlertCircle className="w-3.5 h-3.5" /> Taken by another store or reserved.
                                                </span>
                                            )
                                        ) : (
                                            <span className="text-xs text-neutral-400">Enter a lowercase name with hyphens</span>
                                        )}

                                        {slugInput !== settings.storeSlug && slugIsAvailable && (
                                            <button
                                                type="button"
                                                onClick={() => updateSettings({ storeSlug: slugInput })}
                                                className="text-xs font-semibold text-blue-600 hover:underline"
                                            >
                                                Apply New Slug
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-neutral-400">
                                        Share link: <code className="bg-neutral-100 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400">{storeUrl}</code>
                                    </p>
                                </div>
                            </div>

                            <Input
                                label="Contact Email"
                                value={settings.contactEmail}
                                onChange={(e) => updateSettings({ contactEmail: e.target.value })}
                                placeholder="hello@scribera.space"
                                leftIcon={<Mail className="w-4 h-4 text-blue-500" />}
                            />

                            <Input
                                label="Contact Phone Number"
                                value={settings.contactPhone}
                                onChange={(e) => updateSettings({ contactPhone: e.target.value })}
                                placeholder="+1 234 567 8900"
                                leftIcon={<Phone className="w-4 h-4 text-emerald-500" />}
                            />

                            <div className="md:col-span-2">
                                <Input
                                    label="Website URL"
                                    value={settings.websiteUrl || ''}
                                    onChange={(e) => updateSettings({ websiteUrl: e.target.value })}
                                    placeholder="www.scribera.space"
                                    leftIcon={<Globe className="w-4 h-4 text-purple-500" />}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <Textarea
                                    label="Storefront Welcome Bio / Description"
                                    value={settings.description}
                                    onChange={(e) => updateSettings({ description: e.target.value })}
                                    placeholder="Describe your store, products, or service offerings..."
                                    rows={3}
                                />
                            </div>

                            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-neutral-100 dark:border-neutral-700">
                                <ImageUploader
                                    label="Store Banner Image (WebP Compressed)"
                                    value={settings.bannerUrl || ''}
                                    onChange={(url) => updateSettings({ bannerUrl: url })}
                                    aspectRatio="banner"
                                    hint="Upload banner photo or paste direct image link"
                                />

                                <ImageUploader
                                    label="Store Logo Image (WebP Compressed)"
                                    value={settings.logoUrl || ''}
                                    onChange={(url) => updateSettings({ logoUrl: url })}
                                    aspectRatio="square"
                                    hint="Upload square logo or icon"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <Textarea
                                    label="Payment & Checkout Instructions"
                                    value={settings.paymentInstructions || ''}
                                    onChange={(e) => updateSettings({ paymentInstructions: e.target.value })}
                                    placeholder="e.g. Transfer to Bank XYZ Account 123456789. Invoices generated automatically upon checkout."
                                    rows={2}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Automated Merchant Bank Payout & Subaccount Provisioning */}
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-700">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-sm">
                                    <Building2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-[#2d3748] dark:text-white flex items-center gap-2">
                                        Merchant Bank Payout Account
                                        <span className="px-2.5 py-0.5 text-[10px] uppercase font-black rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                            Automated Subaccounts
                                        </span>
                                    </h2>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                        Enter your Nigerian bank account details. Payment subaccounts for Paystack & Monnify are provisioned automatically.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <Select
                                label="Settlement Bank"
                                value={settings.bankCode || '058'}
                                onChange={(val) => {
                                    const selectedBank = NIGERIAN_BANKS.find(b => b.code === val);
                                    updateSettings({
                                        bankCode: val,
                                        bankName: selectedBank?.name || ''
                                    });
                                }}
                                options={NIGERIAN_BANKS.map(b => ({ value: b.code, label: b.name }))}
                            />

                            <Input
                                label="Account Number"
                                value={settings.accountNumber || ''}
                                onChange={(e) => updateSettings({ accountNumber: e.target.value })}
                                placeholder="0123456789 (10 Digits)"
                            />

                            <Input
                                label="Account Name"
                                value={settings.accountName || ''}
                                onChange={(e) => updateSettings({ accountName: e.target.value })}
                                placeholder="e.g. Peter Babalola"
                            />
                        </div>

                        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-neutral-100 dark:border-neutral-700">
                            <div className="text-xs text-neutral-600 dark:text-neutral-400 space-y-1">
                                <p className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Active Subaccount Routing: Paystack ({settings.paystackSubAccountCode || 'Auto-Provisioned'}) | Monnify ({settings.monnifySubAccountCode || 'Auto-Provisioned'})
                                </p>
                            </div>
                            <Button
                                type="button"
                                onClick={async () => {
                                    if (!settings.accountNumber || settings.accountNumber.length < 10) {
                                        showToast('Please enter a valid 10-digit account number.', 'error');
                                        return;
                                    }
                                    const res = await autoGenerateVendorSubaccounts({
                                        storeName: settings.storeName || 'Storefront Vendor',
                                        bankCode: settings.bankCode || '058',
                                        accountNumber: settings.accountNumber,
                                        accountName: settings.accountName || '',
                                    });
                                    updateSettings({
                                        paystackSubAccountCode: res.paystackSubaccountCode,
                                        monnifySubAccountCode: res.monnifySubaccountCode,
                                    });
                                    if (res.success) {
                                        showToast(`Paystack Subaccount (${res.paystackSubaccountCode}) linked successfully!`, 'success');
                                    } else {
                                        showToast(`Paystack Notice: ${res.error || 'Check bank account details.'}`, 'error');
                                    }
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold shrink-0 text-xs"
                            >
                                Provision Subaccounts
                            </Button>
                        </div>
                    </div>

                    {/* Store Visual Theme Customizer */}
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl text-white">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-[#2d3748] dark:text-white">Store Visual Theme & Appearance</h2>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">Choose a theme preset or customize storefront header gradients and primary accent colors.</p>
                            </div>
                        </div>

                        {/* Theme Presets */}
                        <div className="space-y-3">
                            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Curated Theme Presets</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {THEME_PRESETS.map((preset) => {
                                    const isSelected = (settings.themePreset || 'slate-dark') === preset.id;
                                    return (
                                        <button
                                            key={preset.id}
                                            type="button"
                                            onClick={() => updateSettings({
                                                themePreset: preset.id as any,
                                                headerGradient: preset.headerGradient,
                                                primaryAccentColor: preset.primaryAccentColor,
                                                headerTextColor: preset.textColor
                                            })}
                                            className={`p-4 rounded-2xl border text-left transition-all duration-200 space-y-3 relative overflow-hidden ${isSelected
                                                ? 'border-blue-600 dark:border-blue-400 ring-2 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-900/10'
                                                : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-neutral-800'
                                                }`}
                                        >
                                            {isSelected && (
                                                <div className="absolute top-3 right-3 p-1 bg-blue-600 text-white rounded-full">
                                                    <Check className="w-3.5 h-3.5" />
                                                </div>
                                            )}

                                            <div className="flex items-center gap-1.5">
                                                {preset.previewSwatches.map((color, i) => (
                                                    <span
                                                        key={i}
                                                        className="w-5 h-5 rounded-full border border-black/10 shadow-sm"
                                                        style={{ backgroundColor: color }}
                                                    />
                                                ))}
                                            </div>

                                            <div>
                                                <p className="font-semibold text-sm text-[#2d3748] dark:text-white">{preset.name}</p>
                                                <p className="text-[11px] text-neutral-400">Gradient Header + Accent Color</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Color Direct Customizer */}
                        <div className="pt-4 border-t border-neutral-100 dark:border-neutral-700 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-300 mb-1">
                                    Primary Accent Color (Buttons & Badges)
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={settings.primaryAccentColor || '#2563eb'}
                                        onChange={(e) => updateSettings({ primaryAccentColor: e.target.value })}
                                        className="w-10 h-10 rounded-xl cursor-pointer border border-neutral-200 bg-transparent"
                                    />
                                    <Input
                                        value={settings.primaryAccentColor || '#2563eb'}
                                        onChange={(e) => updateSettings({ primaryAccentColor: e.target.value })}
                                        placeholder="#2563eb"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-300 mb-1">
                                    Header Text Color
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={settings.headerTextColor || '#ffffff'}
                                        onChange={(e) => updateSettings({ headerTextColor: e.target.value })}
                                        className="w-10 h-10 rounded-xl cursor-pointer border border-neutral-200 bg-transparent"
                                    />
                                    <Input
                                        value={settings.headerTextColor || '#ffffff'}
                                        onChange={(e) => updateSettings({ headerTextColor: e.target.value })}
                                        placeholder="#ffffff"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT PRODUCT MODAL WITH MULTI-IMAGE GALLERY */}
            {editingProduct && (
                <Modal
                    isOpen={!!editingProduct}
                    onClose={() => setEditingProduct(null)}
                    title={`Edit Store Info: ${editingProduct.name}`}
                    size="lg"
                >
                    <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
                        {/* Multi-Image Gallery Input */}
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-200 uppercase tracking-wider">
                                Product Photos
                            </label>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {(() => {
                                    const activeImages = productForm.images;
                                    let visibleCount = 1;
                                    for (let i = 1; i < 5; i++) {
                                        if (activeImages[i] && activeImages[i].trim() !== '') {
                                            visibleCount = i + 1;
                                        }
                                    }
                                    const displaySlotsCount = Math.min(5, visibleCount < activeImages.filter(Boolean).length ? activeImages.filter(Boolean).length : Math.max(1, activeImages.map(s => s.trim()).filter(Boolean).length + 1));
                                    const slotsToRender = Array(displaySlotsCount).fill(0).map((_, i) => i);

                                    return slotsToRender.map((idx) => (
                                        <ImageUploader
                                            key={idx}
                                            label={idx === 0 ? 'Cover Photo' : `Photo ${idx + 1}`}
                                            value={productForm.images[idx] || ''}
                                            onChange={(newUrl) => {
                                                const newImages = [...productForm.images];
                                                newImages[idx] = newUrl;
                                                setProductForm({ ...productForm, images: newImages });
                                            }}
                                            aspectRatio="square"
                                        />
                                    ));
                                })()}
                            </div>
                        </div>

                        {/* Pricing & Discount */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                            <div>
                                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-200 mb-1">
                                    Base Price
                                </label>
                                <div className="h-10 px-3.5 flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-xl text-sm font-bold text-[#2d3748] dark:text-white border border-neutral-200 dark:border-neutral-700">
                                    {formatCurrency(editingProduct.unitPrice, activeCurrency)}
                                </div>
                            </div>

                            <div>
                                {discounts.filter(d => d.isActive).length === 0 ? (
                                    <div>
                                        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-200 mb-1">
                                            Discount (optional)
                                        </label>
                                        <p className="text-xs text-neutral-400 py-2">
                                            No active discounts yet.{' '}
                                            <a href="/discounts" className="text-blue-500 underline">Create one</a>.
                                        </p>
                                    </div>
                                ) : (
                                    <Select
                                        label="Discount (optional)"
                                        value={productForm.discountId}
                                        onChange={(val) => setProductForm({ ...productForm, discountId: val })}
                                        options={[
                                            { value: '', label: '— No discount —' },
                                            ...discounts.filter(d => d.isActive).map(d => ({
                                                value: d.id,
                                                label: `${d.name} (${d.percentage}% off)`,
                                                description: editingProduct.unitPrice > 0
                                                    ? `Sale price: ${formatCurrency(editingProduct.unitPrice * (1 - d.percentage / 100), activeCurrency)}`
                                                    : undefined
                                            }))
                                        ]}
                                        placeholder="Select a discount..."
                                    />
                                )}
                            </div>
                        </div>

                        <Textarea
                            label="Storefront Description"
                            value={productForm.storeDescription}
                            onChange={(e) => setProductForm({ ...productForm, storeDescription: e.target.value })}
                            placeholder="Provide details about features, size, warranty..."
                            rows={3}
                        />

                        <div className="flex items-center gap-3 pt-1">
                            <input
                                type="checkbox"
                                id="isPublishedToStore"
                                checked={productForm.isPublishedToStore}
                                onChange={(e) => setProductForm({ ...productForm, isPublishedToStore: e.target.checked })}
                                className="w-4 h-4 text-blue-600 rounded border-neutral-300 focus:ring-blue-500"
                            />
                            <label htmlFor="isPublishedToStore" className="text-sm font-medium text-[#2d3748] dark:text-white cursor-pointer">
                                Publish product on public storefront
                            </label>
                        </div>
                    </div>

                    <ModalFooter>
                        <Button variant="ghost" onClick={() => setEditingProduct(null)}>Cancel</Button>
                        <Button onClick={handleSaveProductStoreInfo}>Save Changes</Button>
                    </ModalFooter>
                </Modal>
            )}

            {/* Sleek Floating Toast Notification */}
            {toastMessage && (
                <div className={`fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-[120] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-semibold animate-in fade-in slide-in-from-bottom-5 duration-200 ${
                    toastMessage.type === 'success'
                        ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-emerald-500/50 shadow-emerald-950/20'
                        : 'bg-rose-950 text-rose-100 border-rose-800 shadow-rose-950/20'
                }`}>
                    {toastMessage.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 dark:text-emerald-600 shrink-0" />
                    ) : (
                        <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    )}
                    <span>{toastMessage.message}</span>
                    <button onClick={() => setToastMessage(null)} className="ml-2 opacity-70 hover:opacity-100">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}
