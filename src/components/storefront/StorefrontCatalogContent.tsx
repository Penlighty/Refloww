"use client";

import { useState, useMemo, useEffect } from 'react';
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
    ShieldCheck
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
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [addedToastProduct, setAddedToastProduct] = useState<{ product: Product; qty: number } | null>(null);
    const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

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
                badges.push({ text: '✕ Out of Stock', bg: '#ef4444' });
            } else if (p.stockQuantity !== undefined && p.stockQuantity !== null && p.stockQuantity > 0 && p.stockQuantity <= 5) {
                badges.push({ text: 'Low Stock', bg: '#f59e0b' });
            } else if (p.stockQuantity !== undefined && p.stockQuantity !== null && p.stockQuantity > 5) {
                badges.push({ text: '✓ In Stock', bg: '#10b981' });
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
                badges.push({ text: '★ New', bg: '#2563eb' });
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
            // Items remain in cart until user manually removes them
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
                onSuccess: (trxRef) => {
                    processOrderCreation(trxRef || ref, 'paid');
                },
                onCancel: () => {
                    setIsProcessingPayment(false);
                }
            });
            return;
        }

        if (paymentMethod === 'monnify' && settings.enableMonnifyPayment !== false) {
            setIsProcessingPayment(true);
            const ref = `MNFY_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            payWithMonnify({
                amount: feeBreakdown.totalAmountPayable,
                customerName: customerForm.name.trim(),
                customerEmail: customerForm.email.trim(),
                paymentReference: ref,
                apiKey: settings.monnifyApiKey,
                contractCode: settings.monnifyContractCode,
                subAccountCode: settings.monnifySubAccountCode,
                onSuccess: (trxRef) => {
                    processOrderCreation(trxRef || ref, 'paid');
                },
                onCancel: () => {
                    setIsProcessingPayment(false);
                }
            });
            return;
        }

        // Pay on Delivery fallback
        processOrderCreation(`POD_${Date.now()}`, 'pending');
    };

    return (
        <div className={`min-h-screen bg-[#0d1117] text-neutral-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white ${isEmbedded ? 'rounded-2xl overflow-hidden border border-neutral-800' : ''}`}>
            
            {/* Storefront Navigation Bar */}
            <header className="sticky top-0 z-30 bg-[#161b22]/90 backdrop-blur-md border-b border-neutral-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xl">
                <div className="flex items-center gap-3">
                    {!isEmbedded && (
                        <Link href="/dashboard" className="p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                        </Link>
                    )}
                    <div className="flex items-center gap-3">
                        {settings.logoUrl ? (
                            <img src={settings.logoUrl} alt={settings.storeName} className="h-9 w-9 rounded-xl object-contain bg-neutral-800 p-1 border border-neutral-700/60" />
                        ) : (
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
                                <Store className="w-5 h-5" />
                            </div>
                        )}
                        <div>
                            <h1 className="text-base font-bold text-white leading-tight flex items-center gap-2">
                                {settings.storeName || company.name || 'Store Catalog'}
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Verified</span>
                            </h1>
                            {settings.tagline && (
                                <p className="text-xs text-neutral-400 truncate max-w-xs">{settings.tagline}</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* User Profile state indicator */}
                    {user ? (
                        <div className="hidden sm:flex items-center gap-2 bg-neutral-800/80 border border-neutral-700/80 rounded-xl px-3 py-1.5 text-xs text-neutral-300">
                            <UserCheck className="w-4 h-4 text-emerald-400" />
                            <span className="font-semibold text-white truncate max-w-[120px]">{profile?.displayName || user.displayName || user.email}</span>
                        </div>
                    ) : (
                        <Link href="/login" className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-white transition-colors bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700/60 px-3 py-1.5 rounded-xl">
                            <LogIn className="w-4 h-4" />
                            <span>Sign In</span>
                        </Link>
                    )}

                    {/* Cart Trigger Button */}
                    <button
                        onClick={() => setIsCartOpen(true)}
                        className="relative p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-lg hover:shadow-blue-500/20 flex items-center gap-2 font-semibold text-xs cursor-pointer active:scale-95"
                    >
                        <ShoppingBag className="w-4 h-4" />
                        <span className="hidden sm:inline">Cart</span>
                        {cartTotalCount > 0 && (
                            <span className="w-5 h-5 rounded-full bg-white text-blue-600 font-extrabold text-[11px] flex items-center justify-center shadow-sm">
                                {cartTotalCount}
                            </span>
                        )}
                    </button>
                </div>
            </header>

            {/* Announcement Banner */}
            {settings.announcement && (
                <div className="bg-gradient-to-r from-blue-900/60 via-indigo-900/60 to-purple-900/60 border-b border-blue-800/40 text-blue-200 py-2 px-4 text-xs text-center font-medium flex items-center justify-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>{settings.announcement}</span>
                </div>
            )}

            {/* Main Content Area */}
            <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
                
                {/* Store Header Banner */}
                <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-neutral-900 via-neutral-850 to-neutral-900 border border-neutral-800/80 p-6 sm:p-10 shadow-2xl">
                    <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
                    
                    <div className="relative z-10 max-w-2xl space-y-3">
                        <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 inline-block">
                            STOREFRONT CATALOG
                        </span>
                        <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                            {settings.storeName || company.name || 'Digital Storefront'}
                        </h2>
                        <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                            {settings.storeDescription || 'Browse available products, add items to cart, and checkout instantly with split payments or pay on delivery.'}
                        </p>

                        {/* Contact details */}
                        <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-neutral-400">
                            {(settings.contactPhone || company.phone) && (
                                <div className="flex items-center gap-1.5">
                                    <Phone className="w-3.5 h-3.5 text-blue-400" />
                                    <span>{settings.contactPhone || company.phone}</span>
                                </div>
                            )}
                            {(settings.contactEmail || company.email) && (
                                <div className="flex items-center gap-1.5">
                                    <Mail className="w-3.5 h-3.5 text-blue-400" />
                                    <span>{settings.contactEmail || company.email}</span>
                                </div>
                            )}
                            {(settings.contactAddress || company.address) && (
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                                    <span>{settings.contactAddress || company.address}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Search & Category Filtering */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search products by name, SKU or category..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#161b22] border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors shadow-inner"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Category Filter Pills */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
                        <button
                            onClick={() => setSelectedCategory('all')}
                            className={`px-3.5 py-2 rounded-xl font-semibold transition-all shrink-0 cursor-pointer ${
                                selectedCategory === 'all'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-[#161b22] text-neutral-400 hover:text-white border border-neutral-800'
                            }`}
                        >
                            All ({publishedProducts.length})
                        </button>
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-3.5 py-2 rounded-xl font-semibold transition-all shrink-0 cursor-pointer ${
                                    selectedCategory === cat
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'bg-[#161b22] text-neutral-400 hover:text-white border border-neutral-800'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Product Catalog Grid */}
                {filteredProducts.length === 0 ? (
                    <div className="bg-[#161b22] border border-neutral-800/80 rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-3">
                        <div className="w-16 h-16 rounded-full bg-neutral-800/60 flex items-center justify-center text-neutral-500">
                            <ShoppingBag className="w-8 h-8 stroke-1" />
                        </div>
                        <h3 className="text-base font-bold text-white">No Matching Products Found</h3>
                        <p className="text-xs text-neutral-400 max-w-sm">
                            {publishedProducts.length === 0
                                ? 'No products have been published to the storefront catalog yet. Go to Products menu to publish items.'
                                : 'Try adjusting your search query or clear the active category filter.'}
                        </p>
                        {searchQuery && (
                            <Button size="sm" variant="secondary" onClick={() => setSearchQuery('')}>
                                Clear Search
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredProducts.map((prod) => {
                            const cartItem = cart.find(i => i.product.id === prod.id);
                            const cartQty = cartItem?.quantity || 0;
                            const hasDiscount = prod.discountedPrice && prod.discountedPrice < prod.unitPrice;
                            const activePrice = prod.discountedPrice || prod.unitPrice;
                            const isOutOfStock = prod.stockQuantity === 0;

                            const badges = computedBadges[prod.id] || [];

                            return (
                                <div
                                    key={prod.id}
                                    className={`bg-[#161b22] rounded-3xl border transition-all flex flex-col justify-between overflow-hidden group hover:shadow-2xl relative ${
                                        cartQty > 0
                                            ? 'border-blue-500/80 shadow-blue-500/10'
                                            : 'border-neutral-800/80 hover:border-neutral-700'
                                    }`}
                                >
                                    {/* Badges Container */}
                                    {badges.length > 0 && (
                                        <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1 max-w-[85%]">
                                            {badges.map((b, idx) => (
                                                <span
                                                    key={idx}
                                                    style={{ backgroundColor: b.bg }}
                                                    className="text-[9px] font-mono font-bold uppercase tracking-wider text-white px-2 py-0.5 rounded-full shadow-md backdrop-blur-md"
                                                >
                                                    {b.text}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <div>
                                        {/* Product Cover Image Container */}
                                        <div 
                                            onClick={() => setSelectedProduct(prod)}
                                            className="w-full h-48 bg-neutral-900 overflow-hidden relative cursor-pointer group/img"
                                        >
                                            {(() => {
                                                const getCategoryFallbackImage = (category?: string) => {
                                                    const cat = (category || '').toLowerCase();
                                                    if (cat.includes('logo') || cat.includes('design') || cat.includes('flyer')) {
                                                        return 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=600&q=80';
                                                    }
                                                    if (cat.includes('printable') || cat.includes('frame') || cat.includes('print')) {
                                                        return 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&q=80';
                                                    }
                                                    if (cat.includes('package') || cat.includes('packaging') || cat.includes('bag')) {
                                                        return 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=600&q=80';
                                                    }
                                                    if (cat.includes('elec') || cat.includes('gadget') || cat.includes('tech')) {
                                                        return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80';
                                                    }
                                                    return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80';
                                                };

                                                const coverPhoto = (prod.images && prod.images.length > 0 && prod.images[0]?.trim()) 
                                                    || (prod.imageUrl && prod.imageUrl.trim())
                                                    || getCategoryFallbackImage(prod.category);

                                                return (
                                                    <img
                                                        src={coverPhoto}
                                                        alt={prod.name}
                                                        className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500"
                                                    />
                                                );
                                            })()}

                                            {/* Quick Preview Hover Overlay */}
                                            <div className="absolute inset-0 bg-neutral-950/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                                <span className="px-3 py-1.5 rounded-xl bg-white/20 backdrop-blur-md text-white font-bold text-xs flex items-center gap-1.5 shadow-lg">
                                                    <Info className="w-3.5 h-3.5" /> View Details
                                                </span>
                                            </div>

                                            {/* Multi-image indicator badge */}
                                            {prod.images && prod.images.length > 1 && (
                                                <span className="absolute bottom-2 right-2 bg-neutral-950/70 text-white text-[10px] font-mono px-2 py-0.5 rounded-full backdrop-blur-sm flex items-center gap-1">
                                                    <ImageIcon className="w-3 h-3 text-blue-400" />
                                                    {prod.images.length}
                                                </span>
                                            )}
                                        </div>

                                        {/* Card Text Content */}
                                        <div className="p-5 space-y-3">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-400 border border-neutral-700/60">
                                                    {prod.category || 'Product'}
                                                </span>
                                                <span className="text-[10px] font-mono text-neutral-500">
                                                    SKU: {prod.sku}
                                                </span>
                                            </div>

                                            <div>
                                                <h3 
                                                    onClick={() => setSelectedProduct(prod)}
                                                    className="text-sm font-bold text-white hover:text-blue-400 transition-colors line-clamp-1 cursor-pointer"
                                                >
                                                    {prod.name}
                                                </h3>
                                                <p className="text-xs text-neutral-400 line-clamp-2 mt-1 leading-relaxed">
                                                    {prod.storeDescription || prod.description || 'No description provided.'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Price & Cart Actions Footer */}
                                    <div className="p-5 pt-0 border-t border-neutral-800/60 mt-3 flex items-center justify-between gap-2">
                                        <div>
                                            <span className="text-[10px] text-neutral-500 font-mono block uppercase">Price</span>
                                            {hasDiscount ? (
                                                <div className="flex items-baseline gap-1.5">
                                                    <span className="text-base font-extrabold text-emerald-400 font-mono">
                                                        {formatCurrency(activePrice, currency)}
                                                    </span>
                                                    <span className="text-xs font-mono text-neutral-500 line-through">
                                                        {formatCurrency(prod.unitPrice, currency)}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-base font-extrabold text-white font-mono">
                                                    {formatCurrency(prod.unitPrice, currency)}
                                                </span>
                                            )}
                                        </div>

                                        {/* Cart Stepper / Add Button */}
                                        {isOutOfStock ? (
                                            <Button disabled size="sm" variant="secondary" className="opacity-50 text-xs">
                                                Out of Stock
                                            </Button>
                                        ) : cartQty > 0 ? (
                                            <div className="flex items-center gap-1 bg-neutral-800 p-1 rounded-xl border border-neutral-700 shadow-inner">
                                                <button
                                                    onClick={() => updateCartQuantity(prod.id, cartQty - 1)}
                                                    className="p-1 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-white transition-colors cursor-pointer"
                                                    title="Decrease quantity"
                                                >
                                                    <Minus className="w-3.5 h-3.5" />
                                                </button>
                                                <span className="w-6 text-center font-mono font-bold text-xs text-white">
                                                    {cartQty}
                                                </span>
                                                <button
                                                    onClick={() => updateCartQuantity(prod.id, cartQty + 1)}
                                                    className="p-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer"
                                                    title="Increase quantity"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <Button
                                                size="sm"
                                                onClick={() => handleAddToCartWithFeedback(prod)}
                                                leftIcon={<Plus className="w-3.5 h-3.5" />}
                                                className="bg-blue-600 hover:bg-blue-500 text-white shadow-md cursor-pointer text-xs"
                                            >
                                                Add
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Added to Cart Floating Toast Notification */}
            {addedToastProduct && (
                <div className="fixed bottom-6 right-6 z-50 bg-neutral-900/95 border border-emerald-500/40 text-white px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-in slide-in-from-bottom-5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="text-xs">
                        <p className="font-bold text-emerald-400">Added to Cart!</p>
                        <p className="text-neutral-300">
                            {addedToastProduct.product.name} ({addedToastProduct.qty} in cart)
                        </p>
                    </div>
                    <button
                        onClick={() => setIsCartOpen(true)}
                        className="ml-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer"
                    >
                        View Cart
                    </button>
                </div>
            )}

            {/* Cart Slide-over Drawer Modal */}
            <Modal
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
                title="Your Shopping Cart"
                size="md"
            >
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                    {cart.length === 0 ? (
                        <div className="py-12 text-center text-neutral-400 space-y-2">
                            <ShoppingBag className="w-12 h-12 mx-auto stroke-1 text-neutral-600" />
                            <p className="text-sm font-semibold text-white">Your cart is currently empty</p>
                            <p className="text-xs max-w-xs mx-auto text-neutral-500">
                                Browse products in the catalog and click &quot;Add&quot; to begin building your order.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {cart.map((item) => {
                                const activePrice = item.product.discountedPrice || item.product.unitPrice;
                                const itemTotal = activePrice * item.quantity;

                                return (
                                    <div
                                        key={item.product.id}
                                        className="p-3.5 rounded-2xl bg-neutral-900/80 border border-neutral-800 flex items-center justify-between gap-3"
                                    >
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            {item.product.imageUrl ? (
                                                <img src={item.product.imageUrl} alt={item.product.name} className="w-12 h-12 rounded-xl object-cover bg-neutral-800 shrink-0" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center text-neutral-500 shrink-0">
                                                    <Tag className="w-5 h-5" />
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <h4 className="text-xs font-bold text-white truncate">{item.product.name}</h4>
                                                <p className="text-[11px] font-mono text-neutral-400">
                                                    {formatCurrency(activePrice, currency)} each
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                            <div className="flex items-center gap-1 bg-neutral-800 p-1 rounded-xl border border-neutral-700">
                                                <button
                                                    onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                                                    className="p-1 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-white transition-colors cursor-pointer"
                                                >
                                                    <Minus className="w-3 h-3" />
                                                </button>
                                                <span className="w-6 text-center font-mono font-bold text-xs text-white">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                                                    className="p-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                </button>
                                            </div>

                                            <span className="text-xs font-bold font-mono text-white w-16 text-right">
                                                {formatCurrency(itemTotal, currency)}
                                            </span>

                                            <button
                                                onClick={() => removeFromCart(item.product.id)}
                                                className="p-1.5 text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
                                                title="Remove item"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {cart.length > 0 && (
                    <div className="pt-4 mt-4 border-t border-neutral-800 space-y-4">
                        <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between text-neutral-400">
                                <span>Cart Subtotal</span>
                                <span className="font-mono font-bold text-white">{formatCurrency(cartSubtotal, currency)}</span>
                            </div>
                            <div className="flex justify-between text-neutral-400">
                                <span>Gateway Processing Fee</span>
                                <span className="font-mono text-neutral-300">+{formatCurrency(feeBreakdown.customerFee, currency)}</span>
                            </div>
                            <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-neutral-800">
                                <span>Total Amount Payable</span>
                                <span className="font-mono text-emerald-400">{formatCurrency(feeBreakdown.totalAmountPayable, currency)}</span>
                            </div>
                        </div>

                        <ModalFooter className="px-0 pb-0">
                            <Button variant="secondary" onClick={clearCart} className="text-xs text-red-400 hover:text-red-300">
                                Clear Cart
                            </Button>
                            <Button
                                onClick={() => {
                                    setIsCartOpen(false);
                                    setIsCheckoutOpen(true);
                                }}
                                rightIcon={<ArrowRight className="w-4 h-4" />}
                                className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg"
                            >
                                Proceed to Checkout
                            </Button>
                        </ModalFooter>
                    </div>
                )}
            </Modal>

            {/* Checkout & Payment Modal */}
            <Modal
                isOpen={isCheckoutOpen}
                onClose={() => setIsCheckoutOpen(false)}
                title="Customer Checkout & Order Payment"
                size="lg"
            >
                <div className="space-y-6">
                    {/* Customer Information Form */}
                    <div className="space-y-4 bg-neutral-900/60 p-4 rounded-2xl border border-neutral-800">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-blue-400" />
                            Customer Contact Details
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <Input
                                    label="Full Name *"
                                    placeholder="e.g. John Doe"
                                    value={customerForm.name}
                                    onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                                />
                                {formErrors.name && <p className="text-[10px] text-red-400 mt-1">{formErrors.name}</p>}
                            </div>
                            <div>
                                <Input
                                    label="Email Address *"
                                    type="email"
                                    placeholder="e.g. john@example.com"
                                    value={customerForm.email}
                                    onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                                />
                                {formErrors.email && <p className="text-[10px] text-red-400 mt-1">{formErrors.email}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <Input
                                    label="Phone Number *"
                                    placeholder="e.g. +234 801 234 5678"
                                    value={customerForm.phone}
                                    onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                                />
                                {formErrors.phone && <p className="text-[10px] text-red-400 mt-1">{formErrors.phone}</p>}
                            </div>
                            <div>
                                <Input
                                    label="Delivery / Billing Address"
                                    placeholder="e.g. 123 Commercial Ave, Lagos"
                                    value={customerForm.address}
                                    onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <Textarea
                                label="Special Order Notes (Optional)"
                                placeholder="Any custom requests or instructions..."
                                rows={2}
                                value={customerForm.notes}
                                onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Payment Gateway Selection */}
                    <div className="space-y-3 bg-neutral-900/60 p-4 rounded-2xl border border-neutral-800">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-emerald-400" />
                            Select Payment Method
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* Paystack Payment Gateway */}
                            {settings.enablePaystackPayment !== false && (
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('paystack')}
                                    className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                                        paymentMethod === 'paystack'
                                            ? 'bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/20 text-white'
                                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-extrabold text-blue-400">Paystack</span>
                                        {paymentMethod === 'paystack' && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                                    </div>
                                    <p className="text-[10px] text-neutral-400 mt-2 leading-tight">
                                        Cards, Bank Transfers, USSD & Apple Pay
                                    </p>
                                </button>
                            )}

                            {/* Monnify Split Payment */}
                            {settings.enableMonnifyPayment !== false && (
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('monnify')}
                                    className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                                        paymentMethod === 'monnify'
                                            ? 'bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/20 text-white'
                                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-extrabold text-blue-400">Monnify</span>
                                        {paymentMethod === 'monnify' && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                                    </div>
                                    <p className="text-[10px] text-neutral-400 mt-2 leading-tight">
                                        Instant Bank Transfer & Cards
                                    </p>
                                </button>
                            )}

                            {/* Pay on Delivery */}
                            <button
                                type="button"
                                onClick={() => setPaymentMethod('cash')}
                                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                                    paymentMethod === 'cash'
                                        ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/20 text-white'
                                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-extrabold text-emerald-400">Pay on Delivery</span>
                                    {paymentMethod === 'cash' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                                </div>
                                <p className="text-[10px] text-neutral-400 mt-2 leading-tight">
                                    Pay upon receiving your items
                                </p>
                            </button>
                        </div>
                    </div>

                    {/* Order Summary & Total Breakdown */}
                    <div className="bg-neutral-900/90 p-4 rounded-2xl border border-neutral-800 space-y-2 text-xs">
                        <div className="flex justify-between text-neutral-400">
                            <span>Subtotal ({cartTotalCount} items)</span>
                            <span className="font-mono font-bold text-white">{formatCurrency(cartSubtotal, currency)}</span>
                        </div>
                        <div className="flex justify-between text-neutral-400">
                            <span>Processing & Service Fee</span>
                            <span className="font-mono text-neutral-300">+{formatCurrency(feeBreakdown.customerFee, currency)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-neutral-800">
                            <span>Total Amount Due</span>
                            <span className="font-mono text-emerald-400 text-base">{formatCurrency(feeBreakdown.totalAmountPayable, currency)}</span>
                        </div>
                    </div>

                    <ModalFooter className="px-0 pb-0">
                        <Button variant="secondary" onClick={() => setIsCheckoutOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCheckoutSubmit}
                            isLoading={isProcessingPayment}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg font-bold"
                        >
                            {paymentMethod === 'cash' ? 'Place Order (Pay on Delivery)' : 'Pay Now & Complete Order'}
                        </Button>
                    </ModalFooter>
                </div>
            </Modal>

            {/* Order Confirmation Success Modal */}
            <Modal
                isOpen={!!completedOrder}
                onClose={() => setCompletedOrder(null)}
                title="🎉 Order Successfully Placed!"
                size="md"
            >
                {completedOrder && (
                    <div className="space-y-5 text-center py-2">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                            <CheckCircle2 className="w-10 h-10" />
                        </div>

                        <div className="space-y-1">
                            <h4 className="text-base font-extrabold text-white">Order Reference: {completedOrder.orderNumber}</h4>
                            <p className="text-xs text-neutral-400">
                                Thank you, <span className="text-white font-semibold">{completedOrder.customerName}</span>! Your order has been registered.
                            </p>
                        </div>

                        <div className="bg-neutral-900 p-4 rounded-2xl border border-neutral-800 space-y-2 text-xs text-left">
                            <div className="flex justify-between text-neutral-400">
                                <span>Payment Status:</span>
                                <span className={`font-semibold uppercase font-mono ${completedOrder.paymentStatus === 'paid' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                    {completedOrder.paymentStatus}
                                </span>
                            </div>
                            <div className="flex justify-between text-neutral-400">
                                <span>Total Paid:</span>
                                <span className="font-mono font-bold text-white">{formatCurrency(completedOrder.grandTotal, currency)}</span>
                            </div>
                            {completedOrder.invoiceId && (
                                <div className="flex justify-between text-neutral-400">
                                    <span>Issued Invoice ID:</span>
                                    <span className="font-mono text-blue-400">{completedOrder.invoiceId}</span>
                                </div>
                            )}
                        </div>

                        <ModalFooter className="justify-center px-0 pb-0">
                            <Button
                                onClick={() => setCompletedOrder(null)}
                                className="bg-blue-600 hover:bg-blue-500 text-white font-bold"
                            >
                                Continue Shopping
                            </Button>
                        </ModalFooter>
                    </div>
                )}
            </Modal>

            {/* Product Detail Modal */}
            {(() => {
                if (!selectedProduct) return null;
                const activePrice = selectedProduct.discountedPrice || selectedProduct.unitPrice;
                const hasDiscount = selectedProduct.discountedPrice && selectedProduct.discountedPrice < selectedProduct.unitPrice;
                const allImages = selectedProduct.images && selectedProduct.images.length > 0 
                    ? selectedProduct.images 
                    : [selectedProduct.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80'];

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
                        <div className="space-y-6">
                            {/* Product Image Gallery */}
                            <div className="space-y-3">
                                <div className="w-full h-64 sm:h-80 bg-neutral-900 rounded-3xl overflow-hidden relative border border-neutral-800">
                                    <img
                                        src={allImages[activeImageIndex] || allImages[0]}
                                        alt={selectedProduct.name}
                                        className="w-full h-full object-cover"
                                    />
                                    {hasDiscount && (
                                        <span className="absolute top-4 left-4 bg-rose-600 text-white text-xs font-mono font-bold px-3 py-1 rounded-full shadow-lg">
                                            Flash Sale
                                        </span>
                                    )}
                                </div>

                                {/* Thumbnail Selector */}
                                {allImages.length > 1 && (
                                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                        {allImages.map((img, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setActiveImageIndex(idx)}
                                                className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                                                    activeImageIndex === idx ? 'border-blue-500 scale-105 shadow-md' : 'border-neutral-800 opacity-60 hover:opacity-100'
                                                }`}
                                            >
                                                <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Product Info & Specifications */}
                            <div className="space-y-4 bg-neutral-900/60 p-4 rounded-2xl border border-neutral-800 text-xs">
                                <div className="flex items-baseline justify-between">
                                    <div>
                                        <span className="text-[10px] text-neutral-500 uppercase font-mono block">Unit Price</span>
                                        {hasDiscount ? (
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-xl font-extrabold text-emerald-400 font-mono">
                                                    {formatCurrency(activePrice, currency)}
                                                </span>
                                                <span className="text-xs font-mono text-neutral-500 line-through">
                                                    {formatCurrency(selectedProduct.unitPrice, currency)}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-xl font-extrabold text-white font-mono">
                                                {formatCurrency(selectedProduct.unitPrice, currency)}
                                            </span>
                                        )}
                                    </div>

                                    <div className="text-right">
                                        <span className="text-[10px] text-neutral-500 uppercase font-mono block">Availability</span>
                                        <span className={`font-mono font-bold ${selectedProduct.stockQuantity === 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                            {selectedProduct.stockQuantity === 0 ? 'Out of Stock' : `${selectedProduct.stockQuantity || 'In'} Stock`}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <h4 className="font-bold text-white">Description</h4>
                                    <p className="text-neutral-300 leading-relaxed">
                                        {selectedProduct.storeDescription || selectedProduct.description || 'No detailed description available for this product.'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <ModalFooter className="px-0 pb-0">
                            <Button variant="secondary" onClick={() => setSelectedProduct(null)}>
                                Close
                            </Button>
                            <Button
                                disabled={selectedProduct.stockQuantity === 0}
                                onClick={() => {
                                    handleAddToCartWithFeedback(selectedProduct);
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
