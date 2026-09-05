"use client";

import { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
    useProductStore,
    useStorefrontStore,
    useCustomerStore,
    useDocumentStore,
    useSettingsStore,
    useTemplateStore
} from '@/lib/store';
import { Button, Input, Textarea, Modal, ModalFooter } from '@/components/ui';
import { formatCurrency, formatDate, calculateMonnifySplitFee, payWithMonnify, payWithPaystack } from '@/lib/utils';
import { Product, StorefrontOrder } from '@/lib/types';
import { validateContentPolicy } from '@/lib/utils/contentPolicy';
import { getActiveOrgId, belongsToActiveOrg } from '@/lib/utils/orgIsolation';
import {
    ShoppingBag,
    Search,
    Plus,
    Minus,
    Trash2,
    X,
    CheckCircle2,
    Store,
    Phone,
    Mail,
    MapPin,
    ArrowRight,
    FileText,
    Receipt as ReceiptIcon,
    Tag,
    Image as ImageIcon,
    Info,
    ChevronRight,
    ShoppingBasket,
    UserCheck,
    LogIn,
    ChevronLeft,
    Globe,
    CreditCard,
    ShieldCheck,
    Clock,
    History,
    ExternalLink
} from 'lucide-react';

export function StorefrontCatalogContent({ isEmbedded = false, storeSlug = undefined }: { isEmbedded?: boolean, storeSlug?: string }) {
    const searchParams = useSearchParams();
    const storeSlugParam = storeSlug || searchParams.get('store');
    const { user, profile } = useAuth();

    const { products } = useProductStore();
    const { 
        settings: globalSettings, 
        cart, 
        addToCart, 
        removeFromCart, 
        updateCartQuantity, 
        clearCart, 
        addOrder, 
        orders,
        getSettingsForSlug 
    } = useStorefrontStore();

    const settings = useMemo(() => {
        if (storeSlugParam) {
            const matched = getSettingsForSlug(storeSlugParam);
            if (matched) return matched;
        }
        return globalSettings;
    }, [storeSlugParam, globalSettings, getSettingsForSlug]);

    const storeOrgId = useMemo(() => {
        return settings.organizationId || getActiveOrgId();
    }, [settings]);

    const displayProducts = useMemo(() => {
        return products.filter(p => belongsToActiveOrg(p.organizationId, storeOrgId));
    }, [products, storeOrgId]);

    const displayOrders = useMemo(() => {
        return orders.filter(o => belongsToActiveOrg(o.organizationId, storeOrgId));
    }, [orders, storeOrgId]);

    const { addCustomer, customers } = useCustomerStore();
    const { createDocument, markAsPaid } = useDocumentStore();
    const { company } = useSettingsStore();
    const { templates } = useTemplateStore();

    // Use global business settings currency strictly across the storefront
    const currency = company.currency || 'USD';

    // Real-time synchronization of storefront settings across window/iframe boundaries
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'inflow-storefront-storage') {
                useStorefrontStore.persist.rehydrate();
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    // Dynamic browser tab title
    useEffect(() => {
        document.title = `${settings.storeName || company.name || 'Store Catalog'} | Refloww`;
    }, [settings.storeName, company.name]);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isPurchaseHistoryOpen, setIsPurchaseHistoryOpen] = useState(false);
    const [historySearchQuery, setHistorySearchQuery] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [addedToastProduct, setAddedToastProduct] = useState<{ product: Product; qty: number } | null>(null);
    const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

    const userOrders = useMemo(() => {
        const userEmail = user?.email?.toLowerCase() || '';
        const userPhone = (user as any)?.phoneNumber || '';
        const q = historySearchQuery.trim().toLowerCase();

        return displayOrders.filter(o => {
            const matchesUser = Boolean(
                (userEmail && o.customerEmail.toLowerCase() === userEmail) ||
                (userPhone && o.customerPhone && o.customerPhone === userPhone)
            );

            if (!q) {
                return user ? matchesUser : true;
            }

            return (
                o.orderNumber.toLowerCase().includes(q) ||
                o.customerEmail.toLowerCase().includes(q) ||
                (o.customerPhone && o.customerPhone.includes(q)) ||
                o.customerName.toLowerCase().includes(q)
            );
        });
    }, [displayOrders, user, historySearchQuery]);

    const computedBadges = useMemo(() => {
        const salesMap: Record<string, number> = {};
        const seedSales: Record<string, number> = {
            'prod-1': 15,
            'prod-2': 22,
            'prod-5': 18,
            'prod-10': 12,
        };
        Object.assign(salesMap, seedSales);

        displayOrders.forEach(order => {
            if (order.items) {
                order.items.forEach(item => {
                    salesMap[item.productId] = (salesMap[item.productId] || 0) + item.quantity;
                });
            }
        });

        const activeProductsWithSales = displayProducts.filter(p => (salesMap[p.id] || 0) > 0);
        const sortedSales = activeProductsWithSales.map(p => salesMap[p.id]).sort((a, b) => b - a);
        const thresholdIndex = Math.floor(sortedSales.length * 0.25);
        const minBestSellerQty = sortedSales[thresholdIndex] || 5;

        const badgeData: Record<string, { text: string; bg: string }[]> = {};

        displayProducts.forEach(p => {
            const badges: { text: string; bg: string }[] = [];

            if (p.stockQuantity === 0) {
                badges.push({ text: '❌ Out of Stock', bg: '#ef4444' });
            } else if (p.stockQuantity !== undefined && p.stockQuantity !== null && p.stockQuantity > 0 && p.stockQuantity <= 5) {
                badges.push({ text: 'Low Stock', bg: '#f59e0b' });
            } else if (p.stockQuantity !== undefined && p.stockQuantity !== null && p.stockQuantity > 5) {
                badges.push({ text: '✅ In Stock', bg: '#10b981' });
            }

            if ((salesMap[p.id] || 0) >= minBestSellerQty) {
                badges.push({ text: '🏆 Best Seller', bg: '#7c3aed' });
            }

            if (p.discountedPrice && p.discountedPrice < p.unitPrice) {
                const percentOff = Math.round(((p.unitPrice - p.discountedPrice) / p.unitPrice) * 100);
                badges.push({ text: `🔥 Flash Sale (${percentOff}% OFF)`, bg: '#e11d48' });
            }

            const isSeedNew = p.id === 'prod-4' || p.id === 'prod-9' || p.id === 'prod-12';
            const isCreatedRecently = p.createdAt ? (Date.now() - new Date(p.createdAt).getTime()) < 14 * 24 * 60 * 60 * 1000 : false;
            if (isSeedNew || isCreatedRecently) {
                badges.push({ text: '⭐ New', bg: '#2563eb' });
            }

            badgeData[p.id] = badges;
        });

        return badgeData;
    }, [displayProducts, displayOrders]);

    const handleAddToCartWithFeedback = (product: Product, count = 1) => {
        addToCart(product, count);
        const existing = cart.find(i => i.product.id === product.id);
        const newQty = (existing?.quantity || 0) + count;
        setAddedToastProduct({ product, qty: newQty });
    };

    useEffect(() => {
        if (addedToastProduct) {
            const timer = setTimeout(() => {
                setAddedToastProduct(null);
            }, 3500);
            return () => clearTimeout(timer);
        }
    }, [addedToastProduct]);

    // Customer Checkout Form
    const [customerForm, setCustomerForm] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        notes: '',
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [completedOrder, setCompletedOrder] = useState<StorefrontOrder | null>(null);

    // Dual Gateway Payment Selection States
    const [paymentMethod, setPaymentMethod] = useState<'paystack' | 'monnify' | 'cash'>('paystack');
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);

    // Auto-fill logged-in customer info
    useEffect(() => {
        if (user) {
            const userPhone = (user as { phoneNumber?: string | null }).phoneNumber || '';
            setCustomerForm((prev) => ({
                ...prev,
                name: prev.name || user.displayName || profile?.displayName || '',
                email: prev.email || user.email || '',
                phone: prev.phone || userPhone,
                address: prev.address || '',
            }));
        }
    }, [user, profile]);

    // Filter storefront published products and enforce Content Safety Policy
    const publishedProducts = useMemo(() => {
        return displayProducts.filter(p => {
            if (p.isPublishedToStore === false) return false;
            const policyCheck = validateContentPolicy({
                name: p.name,
                description: p.description,
                category: p.category,
                storeDescription: p.storeDescription,
            });
            return policyCheck.isValid;
        });
    }, [displayProducts]);

    const categories = useMemo(() => {
        const cats = new Set<string>();
        publishedProducts.forEach(p => { if (p.category) cats.add(p.category); });
        return Array.from(cats);
    }, [publishedProducts]);

    const filteredProducts = useMemo(() => {
        return publishedProducts.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [publishedProducts, searchQuery, selectedCategory]);

    const cartTotalCount = useMemo(() => {
        return cart.reduce((total, item) => total + item.quantity, 0);
    }, [cart]);

    const cartSubtotal = useMemo(() => {
        return cart.reduce((total, item) => {
            const price = item.product.discountedPrice || item.product.unitPrice;
            return total + (price * item.quantity);
        }, 0);
    }, [cart]);

    const feeBreakdown = useMemo(() => {
        return calculateMonnifySplitFee(
            cartSubtotal,
            'local',
            'storefront'
        );
    }, [cartSubtotal]);

    const handleCheckoutSubmit = () => {
        if (!customerForm.name.trim() || !customerForm.email.trim() || !customerForm.phone.trim()) {
            setFormErrors({
                name: !customerForm.name.trim() ? 'Full Name is required' : '',
                email: !customerForm.email.trim() ? 'Email Address is required' : '',
                phone: !customerForm.phone.trim() ? 'Phone Number is required' : '',
            });
            return;
        }
        if (cart.length === 0) return;

        const processOrderCreation = (paymentRef = '', status: 'paid' | 'pending' = 'paid') => {
            let existingCustomer = customers.find(
                c => c.email.toLowerCase() === customerForm.email.toLowerCase() ||
                    c.phone === customerForm.phone
            );

            let customerId = existingCustomer?.id;
            if (!existingCustomer) {
                const newCustomer = addCustomer({
                    name: customerForm.name.trim(),
                    email: customerForm.email.trim(),
                    phone: customerForm.phone.trim(),
                    address: customerForm.address.trim() || 'Online Storefront Order',
                    notes: `Registered via Storefront Order`,
                    organizationId: storeOrgId,
                });
                customerId = newCustomer.id;
            }

            const lineItems = cart.map((item, index) => {
                const unitPrice = item.product.discountedPrice || item.product.unitPrice;
                return {
                    id: `li-sf-${Date.now()}-${index}`,
                    productId: item.product.id,
                    productName: item.product.name,
                    description: item.product.storeDescription || item.product.description || '',
                    quantity: item.quantity,
                    unitPrice: unitPrice,
                    subtotal: unitPrice * item.quantity,
                };
            });

            const storeTemplates = templates.filter(t => t.organizationId === storeOrgId);
            const invoiceTemplate = storeTemplates.find(t => t.type === 'invoice' && t.isDefault) || storeTemplates.find(t => t.type === 'invoice') || storeTemplates[0];
            const receiptTemplate = storeTemplates.find(t => t.type === 'receipt' && t.isDefault) || storeTemplates.find(t => t.type === 'receipt') || storeTemplates[0];

            const todayIso = new Date().toISOString().split('T')[0];

            const orderId = `order-${Date.now()}`;

            const newInvoice = createDocument('invoice', {
                templateId: invoiceTemplate?.id || '',
                customerId: customerId!,
                date: todayIso,
                dueDate: todayIso,
                lineItems: lineItems,
                discountPercent: 0,
                taxPercent: 0,
                notes: `Storefront Order (${paymentMethod === 'monnify' ? 'Paid via Monnify' : 'Pay on Delivery'}). ${customerForm.notes || ''}`.trim(),
                organizationId: storeOrgId,
                storefrontOrderId: orderId,
            });
            if (status === 'paid') markAsPaid(newInvoice.id);

            let receiptId: string | undefined = undefined;
            if (status === 'paid') {
                const newReceipt = createDocument('receipt', {
                    templateId: receiptTemplate?.id || '',
                    customerId: customerId!,
                    date: todayIso,
                    lineItems: lineItems,
                    discountPercent: 0,
                    taxPercent: 0,
                    notes: `Paid via Monnify Online Payment. Payment Ref: ${paymentRef || newInvoice.documentNumber}`,
                    sourceDocumentId: newInvoice.id,
                    organizationId: storeOrgId,
                    storefrontOrderId: orderId,
                });
                markAsPaid(newReceipt.id);
                receiptId = newReceipt.id;
            }

            const orderRecord: StorefrontOrder = {
                id: orderId,
                organizationId: storeOrgId,
                orderNumber: `ORD-${Math.floor(100000 + Math.random() * 900000)}`,
                customerName: customerForm.name.trim(),
                customerEmail: customerForm.email.trim(),
                customerPhone: customerForm.phone.trim(),
                customerAddress: customerForm.address.trim(),
                items: lineItems.map(li => ({
                    productId: li.productId,
                    productName: li.productName,
                    quantity: li.quantity,
                    unitPrice: li.unitPrice,
                    subtotal: li.subtotal,
                })),
                subtotal: cartSubtotal,
                grandTotal: feeBreakdown.totalAmountPayable,
                status: status === 'paid' ? 'completed' : 'pending',
                invoiceId: newInvoice.id,
                receiptId,
                createdAt: new Date().toISOString(),
                paymentMethod,
                paymentReference: paymentRef || `MNFY_${Date.now()}`,
                paymentFee: feeBreakdown.customerFee,
                monnifyCost: feeBreakdown.monnifyCost,
                platformProfit: feeBreakdown.platformProfit,
                merchantPayout: feeBreakdown.merchantPayout,
                paymentStatus: status,
            };

            addOrder(orderRecord);
            setCompletedOrder(orderRecord);
            clearCart(); // Empty shopping cart after successful checkout
            setIsCheckoutOpen(false);
            setIsCartOpen(false);
            setIsProcessingPayment(false);
        };

        if (paymentMethod === 'paystack' && settings.enablePaystackPayment !== false) {
            setIsProcessingPayment(true);
            const ref = `PSTK_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            payWithPaystack({
                amount: feeBreakdown.totalAmountPayable,
                customerName: customerForm.name.trim(),
                customerEmail: customerForm.email.trim(),
                customerPhone: customerForm.phone.trim(),
                paymentReference: ref,
                publicKey: settings.paystackPublicKey,
                subaccount: settings.paystackSubAccountCode,
                onSuccess: (res) => {
                    const transactionRef = res?.reference || res?.trans || ref;
                    processOrderCreation(transactionRef, 'paid');
                },
                onClose: () => {
                    setIsProcessingPayment(false);
                }
            });
        } else if (paymentMethod === 'monnify' && settings.enableMonnifyPayment !== false) {
            setIsProcessingPayment(true);
            const ref = `MNFY_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            payWithMonnify({
                amount: feeBreakdown.totalAmountPayable,
                customerName: customerForm.name.trim(),
                customerEmail: customerForm.email.trim(),
                customerPhone: customerForm.phone.trim(),
                paymentReference: ref,
                paymentDescription: `Storefront Order for ${settings.storeName || 'Refloww Store'}`,
                apiKey: settings.monnifyApiKey,
                contractCode: settings.monnifyContractCode,
                subAccountCode: settings.monnifySubAccountCode,
                environment: settings.monnifyEnvironment || 'sandbox',
                onSuccess: (res) => {
                    const transactionRef = res?.transactionReference || res?.paymentReference || ref;
                    processOrderCreation(transactionRef, 'paid');
                },
                onClose: () => {
                    setIsProcessingPayment(false);
                }
            });
        } else {
            processOrderCreation('', 'pending');
        }
    };

    const primaryAccent = settings.primaryAccentColor || '#2563eb';
    const hasCustomBanner = Boolean(settings.bannerUrl && settings.bannerUrl.trim() !== '');

    // Banner URL (custom merchant upload or store hero fallback)
    const displayBannerUrl = hasCustomBanner 
        ? settings.bannerUrl 
        : 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&q=80';

    return (
        <div className="w-full flex-1 overflow-y-auto overflow-x-hidden min-h-screen bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 font-sans pb-24">
            {/* 1600x400 (4:1) Banner Cover Image */}
            <div className="relative w-full overflow-hidden shadow-sm bg-neutral-200 dark:bg-neutral-800" style={{ aspectRatio: '4 / 1' }}>
                <img 
                    src={displayBannerUrl} 
                    alt="Store Cover Banner" 
                    className="absolute inset-0 w-full h-full object-cover" 
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/10 pointer-events-none" />
            </div>

            {/* Floating Store Info Header Card */}
            <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 md:-mt-14 relative z-10">
                <div className="bg-white dark:bg-neutral-800 rounded-3xl p-5 md:p-6 shadow-xl border border-neutral-100 dark:border-neutral-700 flex flex-col md:flex-row md:items-end justify-between gap-5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                        {/* Store Logo Avatar (Overlapping Banner) */}
                        <div className="-mt-12 md:-mt-16 flex-shrink-0">
                            {settings.logoUrl ? (
                                <img 
                                    src={settings.logoUrl} 
                                    alt="Logo" 
                                    className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-2xl object-cover shadow-lg border-4 border-white dark:border-neutral-800 bg-white" 
                                />
                            ) : (
                                <div
                                    className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 text-white rounded-2xl flex items-center justify-center font-bold text-2xl md:text-3xl shadow-lg border-4 border-white dark:border-neutral-800"
                                    style={{ backgroundColor: primaryAccent }}
                                >
                                    <Store className="w-8 h-8 md:w-10 md:h-10" />
                                </div>
                            )}
                        </div>

                        {/* Store Name & Description */}
                        <div className="space-y-1 pt-1">
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#1a202c] dark:text-white tracking-tight">
                                {settings.storeName || company.name}
                            </h1>
                            <p className="text-xs md:text-sm text-neutral-600 dark:text-neutral-300 max-w-2xl line-clamp-2">
                                {settings.description || 'Discover our premium collection of products and services available for order.'}
                            </p>
                        </div>
                    </div>

                    {/* Store Contact Info Pills */}
                    <div className="flex flex-wrap items-center gap-2.5 text-xs md:text-sm pt-1 md:pt-0">
                        {settings.contactPhone && (
                            <a
                                href={`tel:${settings.contactPhone.replace(/\s/g, '')}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-700/60 border border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200 shadow-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 transition-colors cursor-pointer"
                            >
                                <Phone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                <span>{settings.contactPhone}</span>
                            </a>
                        )}
                        {settings.contactEmail && (() => {
                            const isUrl = settings.contactEmail.startsWith('http') || settings.contactEmail.startsWith('www') || !settings.contactEmail.includes('@');
                            const href = settings.contactEmail.startsWith('http') 
                                ? settings.contactEmail 
                                : settings.contactEmail.includes('@') 
                                    ? `mailto:${settings.contactEmail}` 
                                    : `https://${settings.contactEmail}`;
                            return (
                                <a
                                    href={href}
                                    target={isUrl ? '_blank' : undefined}
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-700/60 border border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200 shadow-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 transition-colors cursor-pointer"
                                >
                                    {isUrl ? <Globe className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> : <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                                    <span>{settings.contactEmail}</span>
                                </a>
                            );
                        })()}
                        {settings.websiteUrl && (
                            <a
                                href={settings.websiteUrl.startsWith('http') ? settings.websiteUrl : `https://${settings.websiteUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-700/60 border border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200 shadow-sm font-medium hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300 dark:hover:border-purple-700 transition-colors cursor-pointer"
                            >
                                <Globe className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                <span>{settings.websiteUrl}</span>
                            </a>
                        )}

                        <button
                            type="button"
                            onClick={() => setIsPurchaseHistoryOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-300 shadow-sm font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors cursor-pointer"
                        >
                            <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Purchase History ({userOrders.length})</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Search & Category Filter Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-neutral-800 p-4 rounded-2xl shadow-sm border border-neutral-100 dark:border-neutral-700">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search products by name or category..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 text-sm bg-neutral-50 dark:bg-neutral-700/50 border border-neutral-200 dark:border-neutral-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-[#2d3748] dark:text-white placeholder:text-neutral-400"
                        />
                    </div>

                    {/* Category Filter Pills */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                        <button
                            onClick={() => setSelectedCategory('all')}
                            style={selectedCategory === 'all' ? { backgroundColor: primaryAccent, color: '#ffffff' } : {}}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all text-nowrap ${selectedCategory === 'all'
                                    ? 'shadow-md'
                                    : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
                                }`}
                        >
                            All Products ({publishedProducts.length})
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                style={selectedCategory === cat ? { backgroundColor: primaryAccent, color: '#ffffff' } : {}}
                                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all text-nowrap ${selectedCategory === cat
                                        ? 'shadow-md'
                                        : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Published Products Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                    {filteredProducts.map(product => {
                        const cartItem = cart.find(item => item.product.id === product.id);
                        const hasDiscount = product.discountedPrice && product.discountedPrice < product.unitPrice;
                        const activePrice = product.discountedPrice || product.unitPrice;

                        return (
                            <div
                                key={product.id}
                                className="group bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between"
                            >
                                <div>
                                    {/* Product Image */}
                                    <div
                                        className="relative h-36 sm:h-52 bg-neutral-100 dark:bg-neutral-700 overflow-hidden cursor-pointer flex items-center justify-center"
                                        onClick={() => setSelectedProduct(product)}
                                    >
                                        {(() => {
                                            const getCategoryFallbackImage = (category?: string) => {
                                                const cat = (category || '').toLowerCase();
                                                if (cat.includes('logo') || cat.includes('design') || cat.includes('flyer')) {
                                                    return 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&q=80';
                                                }
                                                if (cat.includes('printable') || cat.includes('frame') || cat.includes('print')) {
                                                    return 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&q=80';
                                                }
                                                if (cat.includes('package') || cat.includes('packaging') || cat.includes('bag')) {
                                                    return 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&q=80';
                                                }
                                                if (cat.includes('elec') || cat.includes('gadget') || cat.includes('tech')) {
                                                    return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80';
                                                }
                                                return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80';
                                            };

                                            const coverPhoto = (product.images && product.images.length > 0 && product.images[0]?.trim()) 
                                                || (product.imageUrl && product.imageUrl.trim())
                                                || getCategoryFallbackImage(product.category);

                                            return (
                                                <img
                                                    src={coverPhoto}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            );
                                        })()}

                                        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 items-start">
                                            {(computedBadges[product.id] || []).map((badge, idx) => (
                                                <span
                                                    key={idx}
                                                    style={{ backgroundColor: badge.bg, color: '#ffffff' }}
                                                    className="px-2.5 py-1 font-extrabold text-[9px] uppercase tracking-wider rounded-lg shadow-md border border-white/10"
                                                >
                                                    {badge.text}
                                                </span>
                                            ))}
                                        </div>
                                        {product.stockQuantity !== undefined && (
                                            <span
                                                style={
                                                    product.stockQuantity === 0
                                                        ? { backgroundColor: '#fee2e2', color: '#dc2626' }
                                                        : product.stockQuantity <= 5
                                                            ? { backgroundColor: '#fef3c7', color: '#b45309' }
                                                            : { backgroundColor: '#1e293b', color: '#ffffff' }
                                                }
                                                className="absolute top-3 right-3 px-2.5 py-1 text-[10px] font-extrabold rounded-full shadow-md z-10 border border-white/20"
                                            >
                                                {product.stockQuantity === 0 ? 'Out of stock' : `${product.stockQuantity} left`}
                                            </span>
                                        )}
                                    </div>

                                    {/* Product Info */}
                                    <div className="p-3 sm:p-5 space-y-1.5 sm:space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] sm:text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{product.category || 'General'}</span>
                                            <span className="text-[10px] sm:text-xs text-neutral-400 font-mono hidden sm:inline">{product.sku}</span>
                                        </div>

                                        <h3
                                            onClick={() => setSelectedProduct(product)}
                                            className="text-sm sm:text-base font-bold text-[#2d3748] dark:text-white line-clamp-1 cursor-pointer hover:text-blue-600 transition-colors"
                                        >
                                            {product.name}
                                        </h3>

                                        <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">
                                            {product.storeDescription || product.description || 'High quality item from our store.'}
                                        </p>
                                    </div>
                                </div>

                                {/* Footer & Add to Cart */}
                                <div className="p-3 sm:p-5 pt-0 flex items-center justify-between gap-2">
                                    <div>
                                        {hasDiscount ? (
                                            <div className="flex flex-col items-start leading-tight">
                                                <span style={{ fontWeight: 700 }} className="text-base text-emerald-600 dark:text-emerald-400">
                                                    {formatCurrency(activePrice, currency)}
                                                </span>
                                                <span style={{ fontWeight: 600 }} className="text-xs text-neutral-400 line-through mt-0.5">
                                                    {formatCurrency(product.unitPrice, currency)}
                                                </span>
                                            </div>
                                        ) : (
                                            <span style={{ fontWeight: 700 }} className="text-base text-[#2d3748] dark:text-white">
                                                {formatCurrency(product.unitPrice, currency)}
                                            </span>
                                        )}
                                    </div>

                                    {cartItem ? (
                                        <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-700/80 p-1 rounded-xl border border-neutral-200 dark:border-neutral-600 shadow-sm shrink-0">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    updateCartQuantity(product.id, cartItem.quantity - 1);
                                                }}
                                                className="w-7 h-7 rounded-lg bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-600 flex items-center justify-center transition-transform active:scale-90 shadow-xs"
                                                title="Reduce quantity"
                                            >
                                                <Minus className="w-3.5 h-3.5" />
                                            </button>

                                            <input
                                                type="number"
                                                min="1"
                                                max={product.stockQuantity || 999}
                                                value={cartItem.quantity}
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value);
                                                    if (!isNaN(val) && val > 0) {
                                                        updateCartQuantity(product.id, val);
                                                    }
                                                }}
                                                onBlur={(e) => {
                                                    const val = parseInt(e.target.value);
                                                    if (isNaN(val) || val <= 0) {
                                                        updateCartQuantity(product.id, 1);
                                                    }
                                                }}
                                                className="w-9 text-center text-xs font-extrabold bg-transparent text-[#2d3748] dark:text-white focus:outline-none focus:bg-white dark:focus:bg-neutral-800 rounded py-0.5"
                                                title="Click to enter custom quantity"
                                            />

                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAddToCartWithFeedback(product, 1);
                                                }}
                                                className="w-7 h-7 rounded-lg bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-600 flex items-center justify-center transition-transform active:scale-90 shadow-xs"
                                                title="Increase quantity"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleAddToCartWithFeedback(product, 1);
                                            }}
                                            style={{ backgroundColor: primaryAccent, color: '#ffffff' }}
                                            className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform active:scale-95 flex-shrink-0 shadow-md hover:opacity-90"
                                            title="Add to Cart"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>

            {/* Non-Intrusive Aesthetic Cart Feedback Toast Card */}
            {addedToastProduct && (
                <div className="fixed bottom-24 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <div className="bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border border-emerald-200 dark:border-emerald-800/60 shadow-2xl rounded-2xl p-3.5 flex items-center gap-3.5 max-w-sm">
                        <div className="w-11 h-11 rounded-xl bg-neutral-100 dark:bg-neutral-800 overflow-hidden shrink-0 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center">
                            {addedToastProduct.product.imageUrl ? (
                                <img src={addedToastProduct.product.imageUrl} alt={addedToastProduct.product.name} className="w-full h-full object-cover" />
                            ) : (
                                <ShoppingBag className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Added to cart! ({addedToastProduct.qty} in cart)</span>
                            </div>
                            <h4 className="text-xs font-semibold text-[#2d3748] dark:text-white truncate">
                                {addedToastProduct.product.name}
                            </h4>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setIsCartOpen(true);
                                setAddedToastProduct(null);
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0 flex items-center gap-1"
                        >
                            <span>Cart</span>
                            <ArrowRight className="w-3 h-3" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setAddedToastProduct(null)}
                            className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg shrink-0"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Floating Shopping Cart Card */}
            {cartTotalCount > 0 && (
                <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-[90] animate-in slide-in-from-bottom-4 duration-300">
                    <div
                        onClick={() => setIsCartOpen(true)}
                        className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-2xl rounded-2xl p-3 pl-4 flex items-center gap-4 cursor-pointer hover:border-blue-400 dark:hover:border-neutral-500 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                    >
                        <div className="flex items-center gap-3">
                            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 shrink-0">
                                <ShoppingBag className="w-5 h-5" />
                                <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-black min-w-[20px] h-[20px] px-1 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-neutral-900">
                                    {cartTotalCount}
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Subtotal ({cartTotalCount} {cartTotalCount === 1 ? 'item' : 'items'})</span>
                                <span style={{ fontWeight: 700 }} className="text-lg text-[#2d3748] dark:text-white tracking-tight leading-none">
                                    {formatCurrency(cartSubtotal, currency)}
                                </span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsCartOpen(true);
                            }}
                            style={{ backgroundColor: primaryAccent, color: '#ffffff' }}
                            className="px-4 py-2.5 rounded-xl font-bold text-xs shadow-md flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition-all shrink-0"
                        >
                            <span>View Cart</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* CART DRAWER MODAL */}
            <Modal
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
                title="Your Shopping Cart"
                size="md"
            >
                {cart.length === 0 ? (
                    <div className="p-8 text-center space-y-3">
                        <ShoppingBag className="w-12 h-12 text-neutral-300 mx-auto" />
                        <p className="text-sm text-neutral-500">Your shopping cart is empty.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="divide-y divide-neutral-100 dark:divide-neutral-700 max-h-80 overflow-y-auto pr-1">
                            {cart.map(item => {
                                const price = item.product.discountedPrice || item.product.unitPrice;
                                return (
                                    <div key={item.product.id} className="py-3.5 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            {item.product.imageUrl ? (
                                                <img src={item.product.imageUrl} alt={item.product.name} className="w-12 h-12 rounded-xl object-cover" />
                                            ) : (
                                                <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-700 rounded-xl flex items-center justify-center text-neutral-400">
                                                    <ShoppingBag className="w-5 h-5" />
                                                </div>
                                            )}
                                            <div>
                                                <h4 className="font-semibold text-sm text-[#2d3748] dark:text-white line-clamp-1">{item.product.name}</h4>
                                                <p className="text-xs text-neutral-400">{formatCurrency(price, currency)} each</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden bg-neutral-50 dark:bg-neutral-800">
                                                <button
                                                    onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                                                    className="p-1.5 text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition-colors"
                                                >
                                                    <Minus className="w-3.5 h-3.5" />
                                                </button>
                                                <span className="px-2.5 text-xs font-bold text-[#2d3748] dark:text-white">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                                                    className="p-1.5 text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition-colors"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                </button>
                                            </div>

                                            <span className="text-sm font-bold text-[#2d3748] dark:text-white min-w-[60px] text-right">
                                                {formatCurrency(price * item.quantity, currency)}
                                            </span>

                                            <button
                                                onClick={() => removeFromCart(item.product.id)}
                                                className="p-1 text-neutral-400 hover:text-rose-500 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Order Summary Box */}
                        <div className="p-4 bg-neutral-50 dark:bg-neutral-800/80 rounded-2xl space-y-2 border border-neutral-200/60 dark:border-neutral-700/60">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-neutral-500">Subtotal</span>
                                <span className="font-semibold text-[#2d3748] dark:text-white">{formatCurrency(cartSubtotal, currency)}</span>
                            </div>
                            <div className="flex items-center justify-between text-base font-bold pt-2 border-t border-neutral-200 dark:border-neutral-700">
                                <span>Total Amount</span>
                                <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(cartSubtotal, currency)}</span>
                            </div>
                        </div>
                    </div>
                )}

                <ModalFooter>
                    <Button variant="ghost" onClick={() => setIsCartOpen(false)}>Continue Browsing</Button>
                    {cart.length > 0 && (
                        <Button
                            variant="primary"
                            onClick={() => {
                                setIsCartOpen(false);
                                setIsCheckoutOpen(true);
                            }}
                            rightIcon={<ArrowRight className="w-4 h-4" />}
                        >
                            Proceed to Checkout
                        </Button>
                    )}
                </ModalFooter>
            </Modal>

            {/* CHECKOUT CUSTOMER DETAILS MODAL */}
            <Modal
                isOpen={isCheckoutOpen}
                onClose={() => setIsCheckoutOpen(false)}
                title="Customer Checkout"
                size="md"
            >
                <div className="space-y-4">
                    {user ? (
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                                <UserCheck className="w-4 h-4 text-emerald-600" />
                                <span>Auto-filled for logged-in buyer ({user.email})</span>
                            </div>
                        </div>
                    ) : (
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-between text-xs">
                            <span className="text-blue-800 dark:text-blue-200 font-medium">Already have an Inflow account?</span>
                            <Link href="/login" className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 hover:underline">
                                <LogIn className="w-3.5 h-3.5" /> Sign In
                            </Link>
                        </div>
                    )}

                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Please confirm your contact details to receive your instant Invoice & Official Receipt.
                    </p>

                    <Input
                        label="Full Name *"
                        value={customerForm.name}
                        onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                        placeholder="John Doe"
                        error={formErrors.name}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Email Address *"
                            type="email"
                            value={customerForm.email}
                            onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                            placeholder="john@example.com"
                            error={formErrors.email}
                        />

                        <Input
                            label="Phone Number *"
                            value={customerForm.phone}
                            onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                            placeholder="+1 234 567 890"
                            error={formErrors.phone}
                        />
                    </div>

                    <Textarea
                        label="Delivery / Billing Address"
                        value={customerForm.address}
                        onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                        placeholder="123 Street Name, City, Country"
                        rows={2}
                    />

                    <Textarea
                        label="Order Notes (Optional)"
                        value={customerForm.notes}
                        onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })}
                        placeholder="Special delivery instructions..."
                        rows={2}
                    />

                    {/* Payment Method Selector & Fee Summary */}
                    <div className="pt-2 space-y-3">
                        <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 block">
                            Select Payment Option *
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <button
                                type="button"
                                onClick={() => setPaymentMethod('paystack')}
                                className={`p-3 rounded-2xl border text-left flex flex-col justify-between gap-2 transition-all ${
                                    paymentMethod === 'paystack'
                                        ? 'border-cyan-500 bg-cyan-50/40 dark:bg-cyan-950/20 ring-2 ring-cyan-500/20'
                                        : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800'
                                }`}
                            >
                                <div className="p-1.5 bg-cyan-600 text-white rounded-xl w-fit">
                                    <CreditCard className="w-4 h-4" />
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-xs font-bold text-[#2d3748] dark:text-white block">
                                        Pay with Card / Apple Pay
                                    </span>
                                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block">
                                        Instant Paystack Checkout
                                    </span>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setPaymentMethod('monnify')}
                                className={`p-3 rounded-2xl border text-left flex flex-col justify-between gap-2 transition-all ${
                                    paymentMethod === 'monnify'
                                        ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20'
                                        : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800'
                                }`}
                            >
                                <div className="p-1.5 bg-emerald-600 text-white rounded-xl w-fit">
                                    <Store className="w-4 h-4" />
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-xs font-bold text-[#2d3748] dark:text-white block">
                                        Pay with Bank Transfer
                                    </span>
                                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block">
                                        Monnify Low-Fee Account
                                    </span>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setPaymentMethod('cash')}
                                className={`p-3 rounded-2xl border text-left flex flex-col justify-between gap-2 transition-all ${
                                    paymentMethod === 'cash'
                                        ? 'border-neutral-500 bg-neutral-100 dark:bg-neutral-700/60 ring-2 ring-neutral-500/20'
                                        : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800'
                                }`}
                            >
                                <div className="p-1.5 bg-neutral-700 text-white rounded-xl w-fit">
                                    <ShoppingBag className="w-4 h-4" />
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-xs font-bold text-[#2d3748] dark:text-white block">
                                        Pay on Delivery / Cash
                                    </span>
                                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block">
                                        Cash collection upon delivery
                                    </span>
                                </div>
                            </button>
                        </div>

                        {/* Order Summary Card */}
                        <div className="p-4 bg-neutral-100/70 dark:bg-neutral-900/60 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-xs space-y-2">
                            <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                                <span>Items Subtotal:</span>
                                <span className="font-semibold">{formatCurrency(cartSubtotal, currency)}</span>
                            </div>
                            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 flex justify-between items-center font-bold text-sm text-[#2d3748] dark:text-white">
                                <span>Total Payable:</span>
                                <span style={{ fontWeight: 900 }} className="text-emerald-600 dark:text-emerald-400 text-base">
                                    {formatCurrency(cartSubtotal, currency)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {settings.paymentInstructions && (
                        <div className="p-3.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/50 rounded-2xl flex items-start gap-3">
                            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                            <div className="text-xs text-blue-900 dark:text-blue-200 space-y-1">
                                <span className="font-semibold block">Payment Instructions:</span>
                                <span>{settings.paymentInstructions}</span>
                            </div>
                        </div>
                    )}
                </div>

                <ModalFooter>
                    <Button variant="ghost" onClick={() => setIsCheckoutOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleCheckoutSubmit}
                        disabled={isProcessingPayment}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                        {isProcessingPayment
                            ? 'Processing Payment...'
                            : paymentMethod === 'paystack'
                                ? `Pay with Paystack (${formatCurrency(cartSubtotal, currency)})`
                                : paymentMethod === 'monnify'
                                    ? `Pay with Monnify (${formatCurrency(cartSubtotal, currency)})`
                                    : `Place Order (${formatCurrency(cartSubtotal, currency)})`}
                    </Button>
                </ModalFooter>
            </Modal>

            {/* ORDER CONFIRMATION MODAL */}
            {completedOrder && (
                <Modal
                    isOpen={!!completedOrder}
                    onClose={() => setCompletedOrder(null)}
                    title="Order Confirmation"
                    size="md"
                >
                    <div className="p-4 text-center space-y-4">
                        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-10 h-10" />
                        </div>

                        <div>
                            <h3 className="text-xl font-extrabold text-[#2d3748] dark:text-white">Order Successfully Placed!</h3>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                Order Reference: <strong className="font-mono text-neutral-800 dark:text-neutral-200">{completedOrder.orderNumber}</strong>
                            </p>
                        </div>

                        <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl text-left text-xs space-y-2 border border-neutral-200 dark:border-neutral-700">
                            <div className="flex justify-between">
                                <span className="text-neutral-500">Customer:</span>
                                <span className="font-semibold text-[#2d3748] dark:text-white">{completedOrder.customerName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-neutral-500">Total Paid:</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(completedOrder.grandTotal, currency)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-neutral-500">Items:</span>
                                <span className="text-neutral-700 dark:text-neutral-300">{completedOrder.items.length} product(s)</span>
                            </div>
                        </div>

                        <div className="pt-2 flex flex-col gap-2">
                            {completedOrder.invoiceId && (
                                <Link href={`/invoices/${completedOrder.invoiceId}`} target="_blank">
                                    <Button variant="outline" className="w-full" leftIcon={<FileText className="w-4 h-4 text-blue-500" />}>
                                        View & Download Invoice
                                    </Button>
                                </Link>
                            )}

                            {completedOrder.receiptId && (
                                <Link href={`/receipts/${completedOrder.receiptId}`} target="_blank">
                                    <Button variant="primary" className="w-full bg-emerald-600 hover:bg-emerald-700" leftIcon={<ReceiptIcon className="w-4 h-4" />}>
                                        View Official Receipt
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>

                    <ModalFooter>
                        <Button variant="ghost" onClick={() => setCompletedOrder(null)}>Done</Button>
                    </ModalFooter>
                </Modal>
            )}

            {/* BUYER PURCHASE HISTORY MODAL */}
            <Modal
                isOpen={isPurchaseHistoryOpen}
                onClose={() => setIsPurchaseHistoryOpen(false)}
                title="My Purchase History"
                size="lg"
            >
                <div className="space-y-4">
                    {/* Search / Filter Orders Input */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search orders by order number, email, or phone..."
                            value={historySearchQuery}
                            onChange={(e) => setHistorySearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-[#2d3748] dark:text-white"
                        />
                    </div>

                    {userOrders.length === 0 ? (
                        <div className="p-8 text-center space-y-2 border border-neutral-100 dark:border-neutral-800 rounded-2xl bg-neutral-50/50 dark:bg-neutral-900/40">
                            <History className="w-10 h-10 text-neutral-300 mx-auto" />
                            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">No purchase records found</p>
                            <p className="text-xs text-neutral-400">
                                {historySearchQuery ? `No orders matching "${historySearchQuery}".` : "You haven't placed any orders yet."}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                            {userOrders.map((order) => (
                                <div
                                    key={order.id}
                                    className="p-4 bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 rounded-2xl space-y-3 shadow-xs"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-sm text-[#2d3748] dark:text-white">{order.orderNumber}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                order.status === 'completed' || order.paymentStatus === 'paid'
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                            }`}>
                                                {order.status === 'completed' || order.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                                            </span>
                                        </div>
                                        <span className="text-xs text-neutral-400">{formatDate(order.createdAt)}</span>
                                    </div>

                                    <div className="text-xs space-y-1 bg-neutral-50 dark:bg-neutral-900/60 p-2.5 rounded-xl">
                                        {order.items.map((item, idx) => (
                                            <div key={idx} className="flex justify-between text-neutral-600 dark:text-neutral-300">
                                                <span>{item.quantity}x {item.productName}</span>
                                                <span className="font-mono font-semibold">{formatCurrency(item.subtotal, currency)}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex items-center justify-between pt-1">
                                        <div className="text-xs">
                                            <span className="text-neutral-400">Total Paid: </span>
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                                                {formatCurrency(order.grandTotal, currency)}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {order.invoiceId && (
                                                <Link href={`/invoices/${order.invoiceId}`} target="_blank">
                                                    <Button size="sm" variant="outline" leftIcon={<FileText className="w-3.5 h-3.5 text-blue-500" />}>
                                                        Invoice
                                                    </Button>
                                                </Link>
                                            )}
                                            {order.receiptId && (
                                                <Link href={`/receipts/${order.receiptId}`} target="_blank">
                                                    <Button size="sm" variant="primary" className="bg-emerald-600 hover:bg-emerald-700" leftIcon={<ReceiptIcon className="w-3.5 h-3.5" />}>
                                                        Receipt
                                                    </Button>
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <ModalFooter>
                    <Button variant="ghost" onClick={() => setIsPurchaseHistoryOpen(false)}>Close</Button>
                </ModalFooter>
            </Modal>

            {/* PRODUCT QUICK VIEW MODAL WITH MULTI-IMAGE CAROUSEL */}
            {selectedProduct && (() => {
                const productImages = selectedProduct.images && selectedProduct.images.length > 0
                    ? selectedProduct.images.filter(Boolean)
                    : [selectedProduct.imageUrl || ''].filter(Boolean);
                const currentImg = productImages[activeImageIndex] || selectedProduct.imageUrl;

                return (
                    <Modal
                        isOpen={!!selectedProduct}
                        onClose={() => {
                            setSelectedProduct(null);
                            setActiveImageIndex(0);
                        }}
                        title={selectedProduct.name}
                        size="lg"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Gallery Main Box & Thumbnails */}
                            <div className="space-y-3">
                                <div className="relative h-64 bg-neutral-100 dark:bg-neutral-700 rounded-2xl overflow-hidden flex items-center justify-center border border-neutral-200 dark:border-neutral-600">
                                    {currentImg ? (
                                        <img src={currentImg} alt={selectedProduct.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-neutral-400 flex flex-col items-center gap-2">
                                            <ImageIcon className="w-12 h-12" />
                                            <span className="text-xs font-medium">No Image</span>
                                        </div>
                                    )}
                                </div>

                                {productImages.length > 1 && (
                                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                        {productImages.map((imgUrl, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => setActiveImageIndex(idx)}
                                                className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${activeImageIndex === idx
                                                        ? 'border-blue-600 dark:border-blue-400 scale-105 shadow-md'
                                                        : 'border-transparent opacity-60 hover:opacity-100'
                                                    }`}
                                            >
                                                <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4 flex flex-col justify-between">
                                <div className="space-y-3">
                                    <div>
                                        <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">{selectedProduct.category || 'General'}</span>
                                        <h3 className="text-xl font-extrabold text-[#2d3748] dark:text-white mt-1">{selectedProduct.name}</h3>
                                        <code className="text-xs text-neutral-400 font-mono bg-neutral-100 dark:bg-neutral-700 px-2 py-0.5 rounded mt-1 inline-block">
                                            {selectedProduct.sku}
                                        </code>
                                    </div>

                                    <p className="text-sm text-neutral-600 dark:text-neutral-300">
                                        {selectedProduct.storeDescription || selectedProduct.description || 'No detailed description available.'}
                                    </p>
                                </div>

                                <div className="pt-4 border-t border-neutral-100 dark:border-neutral-700">
                                    {selectedProduct.discountedPrice ? (
                                        <div className="flex items-baseline gap-3">
                                            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                                                {formatCurrency(selectedProduct.discountedPrice, currency)}
                                            </span>
                                            <span className="text-sm text-neutral-400 line-through font-bold">
                                                {formatCurrency(selectedProduct.unitPrice, currency)}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-3xl font-black text-[#1a202c] dark:text-white tracking-tight">
                                            {formatCurrency(selectedProduct.unitPrice, currency)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <ModalFooter>
                            <Button variant="ghost" onClick={() => {
                                setSelectedProduct(null);
                                setActiveImageIndex(0);
                            }}>
                                Close
                            </Button>
                            <Button
                                onClick={() => {
                                    addToCart(selectedProduct);
                                    setSelectedProduct(null);
                                    setActiveImageIndex(0);
                                }}
                                leftIcon={<Plus className="w-4 h-4" />}
                            >
                                Add to Shopping Cart
                            </Button>
                        </ModalFooter>
                    </Modal>
                );
            })()}
        </div>
    );
}
