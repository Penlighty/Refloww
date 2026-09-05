"use client";

import { useState, useMemo, useRef } from 'react';
import { useProductStore, useCustomerStore, useDocumentStore, useSettingsStore, useOrganizationStore } from '@/lib/store';
import { Product, Customer, LineItem } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';
import {
    Search,
    ShoppingCart,
    Plus,
    Minus,
    Trash2,
    CheckCircle2,
    Printer,
    User,
    CreditCard,
    DollarSign,
    Building2,
    X,
    Barcode,
    Tag,
    Zap,
    UserPlus,
    RefreshCw,
    Wallet,
    Lock,
    Hash,
    ArrowLeft,
    ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface CartItem {
    product: Product;
    quantity: number;
    unitPrice: number;
}

export default function POSPage() {
    const { products, getFilteredProducts, categories } = useProductStore();
    const { customers, getFilteredCustomers, addCustomer } = useCustomerStore();
    const { createDocument } = useDocumentStore();
    const activeOrgId = useOrganizationStore((state) => state.activeOrganizationId);
    const company = useSettingsStore(state => state.company);
    const currency = company.currency || 'USD';

    const displayProducts = useMemo(() => getFilteredProducts(), [products, activeOrgId, getFilteredProducts]);
    const displayCustomers = useMemo(() => getFilteredCustomers(), [customers, activeOrgId, getFilteredCustomers]);

    // UI States
    const [mobileTab, setMobileTab] = useState<'products' | 'cart'>('products');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [discountPercent, setDiscountPercent] = useState<number>(0);
    const [taxPercent, setTaxPercent] = useState<number>(0);
    const [notes, setNotes] = useState<string>('');

    // Modals
    const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
    const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);
    const [isCompletedModalOpen, setIsCompletedModalOpen] = useState(false);
    const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);

    // Add Customer Form States
    const [newCustName, setNewCustName] = useState('');
    const [newCustEmail, setNewCustEmail] = useState('');
    const [newCustPhone, setNewCustPhone] = useState('');
    const [newCustCompany, setNewCustCompany] = useState('');

    // Charge Screen Form States
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
    const [amountReceived, setAmountReceived] = useState<string>('');
    const [cardRef, setCardRef] = useState('');
    const [transferRef, setTransferRef] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Completed Receipt details
    const [lastIssuedReceiptId, setLastIssuedReceiptId] = useState<string | null>(null);
    const [lastIssuedReceiptNumber, setLastIssuedReceiptNumber] = useState<string>('');

    const searchInputRef = useRef<HTMLInputElement>(null);

    // Filter products
    const filteredProducts = useMemo(() => {
        let result = displayProducts;
        if (selectedCategory !== 'All') {
            result = result.filter(p => p.category === selectedCategory);
        }
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter(p =>
                p.name.toLowerCase().includes(query) ||
                (p.sku && p.sku.toLowerCase().includes(query)) ||
                (p.barcode && p.barcode.toLowerCase().includes(query))
            );
        }
        return result;
    }, [displayProducts, selectedCategory, searchQuery]);

    // Handle Enter key on search input
    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const query = searchQuery.trim().toLowerCase();
            if (!query) return;

            // Search for an exact match or first fuzzy match
            const matched = filteredProducts.find(p => 
                (p.barcode && p.barcode.trim().toLowerCase() === query) ||
                (p.sku && p.sku.trim().toLowerCase() === query) ||
                p.name.toLowerCase() === query
            ) || filteredProducts[0];

            if (matched) {
                addToCart(matched);
                setSearchQuery('');
                toast.success(`Added ${matched.name} to cart!`);
            } else {
                toast.error(`No matching product found for "${searchQuery}"`);
            }
        }
    };

    // Camera scanner barcode detection callback
    const handleCameraScan = (barcode: string) => {
        const query = barcode.trim().toLowerCase();
        if (!query) return;

        const matched = displayProducts.find(p => 
            p.barcode && p.barcode.trim().toLowerCase() === query
        );

        if (matched) {
            addToCart(matched);
            toast.success(`Scanned and added ${matched.name}!`);
        } else {
            toast.error(`Product not found with barcode: "${barcode}"`);
        }
    };

    // Handle Adding Product to Cart
    const addToCart = (product: Product) => {
        const availableStock = product.stockQuantity || 0;
        const existingIndex = cart.findIndex(item => item.product.id === product.id);

        const activeUnitPrice = (product.discountedPrice && product.discountedPrice > 0 && product.discountedPrice < product.unitPrice)
            ? product.discountedPrice
            : product.unitPrice;

        if (existingIndex > -1) {
            const currentQty = cart[existingIndex].quantity;
            if (product.productType === 'physical' && currentQty >= availableStock) {
                toast.error(`Only ${availableStock} unit(s) available in stock!`);
                return;
            }
            const updated = [...cart];
            updated[existingIndex].quantity += 1;
            updated[existingIndex].unitPrice = activeUnitPrice;
            setCart(updated);
        } else {
            if (product.productType === 'physical' && availableStock <= 0) {
                toast.error('Product is currently out of stock!');
                return;
            }
            setCart([...cart, { product, quantity: 1, unitPrice: activeUnitPrice }]);
        }
    };

    // Cart Quantity Controls
    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev => {
            return prev.map(item => {
                if (item.product.id !== productId) return item;
                const newQty = item.quantity + delta;
                if (newQty <= 0) return null;
                if (item.product.productType === 'physical' && newQty > (item.product.stockQuantity || 0)) {
                    toast.error(`Only ${item.product.stockQuantity} unit(s) available in stock!`);
                    return item;
                }
                return { ...item, quantity: newQty };
            }).filter(Boolean) as CartItem[];
        });
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.product.id !== productId));
    };

    const clearCart = () => {
        setCart([]);
        setDiscountPercent(0);
        setTaxPercent(0);
        setNotes('');
        setSelectedCustomer(null);
    };

    // Calculate totals
    const cartTotalCount = useMemo(() => {
        return cart.reduce((sum, item) => sum + item.quantity, 0);
    }, [cart]);

    const subtotal = useMemo(() => {
        return cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    }, [cart]);

    const discountAmount = useMemo(() => subtotal * (discountPercent / 100), [subtotal, discountPercent]);
    const taxable = useMemo(() => subtotal - discountAmount, [subtotal, discountAmount]);
    const taxAmount = useMemo(() => taxable * (taxPercent / 100), [taxable, taxPercent]);
    const grandTotal = useMemo(() => taxable + taxAmount, [taxable, taxAmount]);

    // Handle quick Add Customer
    const handleAddCustomer = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCustName.trim()) {
            toast.error('Customer name is required!');
            return;
        }

        try {
            const added = addCustomer({
                name: newCustName.trim(),
                email: newCustEmail.trim(),
                phone: newCustPhone.trim(),
                companyName: newCustCompany.trim() || undefined,
                address: '',
                notes: 'Created via POS Register counter checkout'
            });

            setSelectedCustomer(added);
            setIsAddCustomerModalOpen(false);
            setNewCustName('');
            setNewCustEmail('');
            setNewCustPhone('');
            setNewCustCompany('');
            toast.success(`Customer "${added.name}" added and selected!`);
        } catch (error) {
            toast.error('Failed to create customer');
        }
    };

    // Cash note shortcuts helper
    const getCashNoteSuggestions = useMemo(() => {
        const total = Math.ceil(grandTotal);
        const prefix = company.currency;
        const isNaira = prefix === 'NGN' || prefix === '₦';
        const baseNotes = isNaira 
            ? [500, 1000, 2000, 5000, 10000, 20000]
            : [5, 10, 20, 50, 100, 200];

        const filtered = baseNotes.filter(n => n >= total).slice(0, 4);
        if (!filtered.includes(total)) {
            filtered.unshift(total); // exact change
        }
        return filtered;
    }, [grandTotal, company.currency]);

    // Change Due
    const changeDue = useMemo(() => {
        const received = parseFloat(amountReceived) || 0;
        return Math.max(0, received - grandTotal);
    }, [amountReceived, grandTotal]);

    // Trigger Charge Modal
    const handleChargeClick = (method: 'cash' | 'card' | 'transfer') => {
        if (cart.length === 0) {
            toast.error('Please add items to cart before checking out!');
            return;
        }
        setPaymentMethod(method);
        setAmountReceived(grandTotal.toFixed(2));
        setCardRef('');
        setTransferRef('');
        setIsChargeModalOpen(true);
    };

    // Execute checkout document creation
    const executeCheckout = () => {
        if (paymentMethod === 'cash') {
            const received = parseFloat(amountReceived) || 0;
            if (received < grandTotal) {
                toast.error('Amount received cannot be less than the grand total!');
                return;
            }
        }

        setIsProcessing(true);

        setTimeout(() => {
            const lineItems: LineItem[] = cart.map(item => ({
                id: item.product.id,
                productId: item.product.id,
                productName: item.product.name,
                description: item.product.name,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                subtotal: item.quantity * item.unitPrice
            }));

            const customerId = selectedCustomer?.id || 'walk-in';
            const payRef = paymentMethod === 'cash' ? '' : (paymentMethod === 'card' ? cardRef : transferRef);

            const createdDoc = createDocument('receipt', {
                templateId: 'standard-default',
                customerId,
                date: new Date().toISOString().split('T')[0],
                dueDate: new Date().toISOString().split('T')[0],
                lineItems,
                discountPercent,
                taxPercent,
                notes: `POS Checkout (${paymentMethod.toUpperCase()})${payRef ? ` [Ref: ${payRef}]` : ''}`,
                amountPaid: grandTotal,
                status: 'paid',
                paidAt: new Date().toISOString()
            });

            setLastIssuedReceiptId(createdDoc.id);
            setLastIssuedReceiptNumber(createdDoc.documentNumber);
            setIsChargeModalOpen(false);
            setIsCompletedModalOpen(true);
            setIsProcessing(false);
            toast.success(`Receipt ${createdDoc.documentNumber} issued successfully!`);
        }, paymentMethod === 'cash' ? 100 : 1000);
    };

    const handleNewSale = () => {
        clearCart();
        setIsCompletedModalOpen(false);
        setLastIssuedReceiptId(null);
        setMobileTab('products');
        setTimeout(() => searchInputRef.current?.focus(), 100);
    };

    return (
        <div className="flex flex-col lg:flex-row gap-4 w-full h-auto lg:h-[calc(100vh-10rem)] min-h-0 lg:min-h-[580px] items-stretch overflow-visible lg:overflow-hidden pb-16 lg:pb-0 relative">
            
            {/* Mobile Segmented Tab Control */}
            <div className="flex lg:hidden items-center justify-between bg-neutral-100 dark:bg-neutral-800 p-1 rounded-2xl gap-1 border border-neutral-200/60 dark:border-neutral-700 shrink-0">
                <button
                    type="button"
                    onClick={() => setMobileTab('products')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        mobileTab === 'products'
                            ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                            : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800'
                    }`}
                >
                    <Tag className="w-3.5 h-3.5 text-[#fc6d2d]" />
                    <span>Products ({filteredProducts.length})</span>
                </button>
                <button
                    type="button"
                    onClick={() => setMobileTab('cart')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer relative ${
                        mobileTab === 'cart'
                            ? 'bg-[#fc6d2d] text-white shadow-sm'
                            : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800'
                    }`}
                >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Cart ({cartTotalCount})</span>
                    {cartTotalCount > 0 && mobileTab !== 'cart' && (
                        <span className="w-2 h-2 rounded-full bg-[#fc6d2d] animate-pulse"></span>
                    )}
                </button>
            </div>

            {/* Mobile Quick Floating Cart Sticky Banner */}
            {mobileTab === 'products' && cartTotalCount > 0 && (
                <div className="lg:hidden fixed bottom-20 left-4 right-4 z-20 bg-neutral-900/95 backdrop-blur-md text-white p-3 rounded-2xl shadow-xl flex items-center justify-between border border-neutral-800 animate-in fade-in slide-in-from-bottom-3">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#fc6d2d] flex items-center justify-center text-white font-bold text-xs">
                            {cartTotalCount}
                        </div>
                        <div>
                            <p className="text-[11px] text-neutral-400 font-medium">Cart Subtotal</p>
                            <p className="text-sm font-bold font-mono text-white">{formatCurrency(grandTotal, currency)}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setMobileTab('cart')}
                        className="px-4 py-2 bg-[#fc6d2d] hover:bg-[#ea500d] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 active:scale-95 transition-all shadow-md"
                    >
                        <span>View Cart</span>
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Left Column: Product Selection Grid */}
            <div className={`flex-1 min-w-0 flex-col bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 overflow-hidden shadow-sm h-full ${mobileTab === 'cart' ? 'hidden lg:flex' : 'flex'}`}>
                
                {/* Search & Category Filter Header */}
                <div className="p-4 border-b border-neutral-100 dark:border-neutral-700/80 space-y-3 bg-neutral-50/50 dark:bg-neutral-900">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-sm">
                                <Zap className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-base font-bold text-neutral-900 dark:text-white leading-tight">
                                    POS Register
                                </h1>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                    Fast counter checkouts and camera barcode scanning
                                </p>
                            </div>
                        </div>

                        {/* Search Input with Integrated Barcode Scan Button */}
                        <div className="relative flex-1 max-w-sm">
                            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                placeholder="Scan barcode or type name + Enter..."
                                className="w-full pl-9 pr-16 py-2 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-xl text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-blue-500 transition-colors shadow-sm"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-10 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                            <button
                                onClick={() => setIsBarcodeModalOpen(true)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-600 transition-colors"
                                title="Scan Barcode with Camera"
                            >
                                <Barcode className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Category Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                        <button
                            onClick={() => setSelectedCategory('All')}
                            className={`px-3 py-1.5 rounded-xl font-medium transition-colors shrink-0 ${
                                selectedCategory === 'All'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-white dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-600 border border-neutral-200/60 dark:border-neutral-600'
                            }`}
                        >
                            All Products ({displayProducts.length})
                        </button>
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-3 py-1.5 rounded-xl font-medium transition-colors shrink-0 ${
                                    selectedCategory === cat
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'bg-white dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-600 border border-neutral-200/60 dark:border-neutral-600'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Product Catalog list (Internal scroll) */}
                <div className="flex-1 overflow-y-auto p-4 pb-36 lg:pb-4">
                    {filteredProducts.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 text-neutral-400 dark:text-neutral-500">
                            <Tag className="w-10 h-10 mb-2 opacity-50" strokeWidth={1.5} />
                            <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                                No matching products found
                            </p>
                            <p className="text-xs max-w-xs mt-1">
                                Check barcode spelling or clear active category filters.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                            {filteredProducts.map((prod) => {
                                const stock = prod.stockQuantity || 0;
                                const isOutOfStock = prod.productType === 'physical' && stock <= 0;
                                const cartItem = cart.find(i => i.product.id === prod.id);
                                const cartQty = cartItem?.quantity || 0;
                                const hasDiscount = prod.discountedPrice && prod.discountedPrice < prod.unitPrice;
                                const activePrice = prod.discountedPrice || prod.unitPrice;

                                return (
                                    <div
                                        key={prod.id}
                                        onClick={() => !isOutOfStock && addToCart(prod)}
                                        className={`rounded-2xl border text-left transition-all relative flex flex-col justify-between group overflow-hidden ${
                                            isOutOfStock
                                                ? 'bg-neutral-100/70 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-700/55 opacity-65 cursor-not-allowed'
                                                : cartQty > 0
                                                ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-500/60 dark:border-blue-500/60 ring-2 ring-blue-500/20 cursor-pointer'
                                                : 'bg-white dark:bg-neutral-800 border-neutral-100 dark:border-neutral-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md cursor-pointer'
                                        }`}
                                    >
                                        {/* Product Image area */}
                                        <div className="w-full h-24 bg-neutral-100 dark:bg-neutral-700 overflow-hidden relative flex items-center justify-center border-b border-neutral-100 dark:border-neutral-700/60">
                                            {(() => {
                                                const getCategoryFallbackImage = (category?: string) => {
                                                    const cat = (category || '').toLowerCase();
                                                    if (cat.includes('logo') || cat.includes('design') || cat.includes('flyer')) {
                                                        return 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=200&q=80';
                                                    }
                                                    if (cat.includes('printable') || cat.includes('frame') || cat.includes('print')) {
                                                        return 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=200&q=80';
                                                    }
                                                    if (cat.includes('package') || cat.includes('packaging') || cat.includes('bag')) {
                                                        return 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=200&q=80';
                                                    }
                                                    if (cat.includes('elec') || cat.includes('gadget') || cat.includes('tech')) {
                                                        return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&q=80';
                                                    }
                                                    return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&q=80';
                                                };

                                                const coverPhoto = (prod.images && prod.images.length > 0 && prod.images[0]?.trim()) 
                                                    || (prod.imageUrl && prod.imageUrl.trim())
                                                    || getCategoryFallbackImage(prod.category);

                                                return (
                                                    <img
                                                        src={coverPhoto}
                                                        alt={prod.name}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                    />
                                                );
                                            })()}

                                            {/* Stock Indicator overlay */}
                                            {prod.productType === 'physical' && (
                                                <span className={`absolute bottom-2 left-2 text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm ${
                                                    stock <= 0
                                                        ? 'bg-red-500 text-white'
                                                        : stock <= (prod.minReorderPoint || 5)
                                                        ? 'bg-amber-500 text-white'
                                                        : 'bg-emerald-600 text-white'
                                                }`}>
                                                    {stock <= 0 ? 'Out of Stock' : `${stock} Left`}
                                                </span>
                                            )}
                                        </div>

                                        {/* Card text details */}
                                        <div className="p-3 w-full flex flex-col justify-between flex-1">
                                            <div>
                                                <span className="text-[8px] font-mono uppercase px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400">
                                                    {prod.sku || 'ITEM'}
                                                </span>
                                                <h3 className="text-xs sm:text-sm font-bold text-[#2d3748] dark:text-white line-clamp-2 mt-1 leading-tight">
                                                    {prod.name}
                                                </h3>
                                            </div>

                                            {/* Price Formatting (Storefront Match) & Add/Minus Controls */}
                                            <div className="mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-700/60 flex items-center justify-between gap-1">
                                                <div>
                                                    {hasDiscount ? (
                                                        <div className="flex flex-col leading-tight">
                                                            <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                                                {formatCurrency(activePrice, company.currency)}
                                                            </span>
                                                            <span className="text-[10px] text-neutral-400 line-through">
                                                                {formatCurrency(prod.unitPrice, company.currency)}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs sm:text-sm font-bold text-[#2d3748] dark:text-white">
                                                            {formatCurrency(prod.unitPrice, company.currency)}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Minus / Plus quantity controls directly on card */}
                                                {!isOutOfStock && (
                                                    cartQty > 0 ? (
                                                        <div 
                                                            className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-700/80 p-1 rounded-xl border border-neutral-200 dark:border-neutral-600 shadow-sm shrink-0"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    updateQuantity(prod.id, -1);
                                                                }}
                                                                className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-600 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-90"
                                                                title="Reduce unit"
                                                            >
                                                                <Minus className="w-3 h-3" />
                                                            </button>
                                                            <span className="text-xs font-bold font-mono px-0.5 text-neutral-900 dark:text-white">
                                                                {cartQty}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    addToCart(prod);
                                                                }}
                                                                className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-90"
                                                                title="Add unit"
                                                            >
                                                                <Plus className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                addToCart(prod);
                                                            }}
                                                            className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer shrink-0"
                                                            title="Add unit"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column: Checkout Cart */}
            <div className={`w-full lg:w-[380px] xl:w-[400px] shrink-0 flex-col bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 overflow-hidden shadow-sm h-full justify-between ${mobileTab === 'products' ? 'hidden lg:flex' : 'flex'}`}>
                
                {/* Mobile Back Button Header */}
                <div className="flex lg:hidden items-center justify-between p-3 border-b border-neutral-100 dark:border-neutral-700 bg-blue-50/50 dark:bg-blue-950/30">
                    <button
                        type="button"
                        onClick={() => setMobileTab('products')}
                        className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Products
                    </button>
                    <span className="text-xs font-bold text-neutral-500">
                        {cartTotalCount} item(s)
                    </span>
                </div>

                {/* Cart Header */}
                <div className="p-4 border-b border-neutral-100 dark:border-neutral-700/80 bg-neutral-50/80 dark:bg-neutral-900 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                                Current Cart ({cart.reduce((s, i) => s + i.quantity, 0)})
                            </h2>
                        </div>
                        {cart.length > 0 && (
                            <button
                                onClick={clearCart}
                                className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 font-bold hover:underline cursor-pointer"
                            >
                                Clear All
                            </button>
                        )}
                    </div>

                    {/* Customer Selection block */}
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <User className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <select
                                value={selectedCustomer?.id || ''}
                                onChange={(e) => {
                                    const cust = displayCustomers.find(c => c.id === e.target.value);
                                    setSelectedCustomer(cust || null);
                                }}
                                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium text-neutral-900 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                            >
                                <option value="">Walk-in Customer (Guest)</option>
                                {displayCustomers.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.name} {c.companyName ? `(${c.companyName})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={() => setIsAddCustomerModalOpen(true)}
                            className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-blue-600 dark:text-blue-400 transition-colors border border-neutral-200/60 dark:border-neutral-600 cursor-pointer shrink-0"
                            title="Create Customer Profile"
                        >
                            <UserPlus className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Cart Items List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white dark:bg-neutral-900/60">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center text-neutral-400 dark:text-neutral-500 py-12">
                            <ShoppingCart className="w-10 h-10 mb-2 stroke-1 opacity-40" />
                            <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                                Your cart is empty
                            </p>
                            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 max-w-[200px] mt-0.5">
                                Select products or click barcode scanner to begin counter checkout.
                            </p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.product.id} className="flex items-center justify-between p-3 rounded-xl bg-neutral-50/90 dark:bg-neutral-800/90 border border-neutral-200/60 dark:border-neutral-700/80 gap-2 shadow-xs">
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                                        {item.product.name}
                                    </h4>
                                    <p className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                                        {formatCurrency(item.unitPrice, company.currency)} each
                                    </p>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                        onClick={() => updateQuantity(item.product.id, -1)}
                                        className="p-1 rounded-lg bg-white dark:bg-neutral-700 text-neutral-600 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors border border-neutral-200/60 dark:border-neutral-600 cursor-pointer"
                                    >
                                        <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="w-6 text-center font-mono text-xs font-bold text-neutral-900 dark:text-white">
                                        {item.quantity}
                                    </span>
                                    <button
                                        onClick={() => updateQuantity(item.product.id, 1)}
                                        className="p-1 rounded-lg bg-white dark:bg-neutral-700 text-neutral-600 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors border border-neutral-200/60 dark:border-neutral-600 cursor-pointer"
                                    >
                                        <Plus className="w-3 h-3" />
                                    </button>
                                    <button
                                        onClick={() => removeFromCart(item.product.id)}
                                        className="p-1 text-red-500 hover:text-red-700 dark:hover:text-red-400 ml-1 transition-colors cursor-pointer"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Totals & Checkout Panel */}
                <div className="p-4 border-t border-neutral-200/80 dark:border-neutral-700/80 bg-neutral-50 dark:bg-neutral-900 space-y-3">
                    
                    {/* Inline Discounts & Taxes */}
                    <div className="grid grid-cols-2 gap-3 pb-2 border-b border-neutral-200/60 dark:border-neutral-700/60">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-300 flex items-center gap-1 uppercase tracking-wider">
                                <Tag className="w-3 h-3 text-neutral-400" />
                                Discount (%)
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={discountPercent || ''}
                                onChange={(e) => setDiscountPercent(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                                placeholder="0"
                                className="w-full px-2.5 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-mono font-bold text-neutral-900 dark:text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-300 flex items-center gap-1 uppercase tracking-wider">
                                <Zap className="w-3 h-3 text-neutral-400" />
                                Tax Rate (%)
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={taxPercent || ''}
                                onChange={(e) => setTaxPercent(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                                placeholder="0"
                                className="w-full px-2.5 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-mono font-bold text-neutral-900 dark:text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* Subtotal & Discount Row */}
                    <div className="space-y-1.5 text-xs text-neutral-600 dark:text-neutral-300">
                        <div className="flex justify-between">
                            <span className="text-neutral-600 dark:text-neutral-300">Subtotal</span>
                            <span className="font-mono font-semibold text-neutral-900 dark:text-white">
                                {formatCurrency(subtotal, company.currency)}
                            </span>
                        </div>
                        {discountPercent > 0 && (
                            <div className="flex justify-between text-amber-600 dark:text-amber-400">
                                <span>Discount ({discountPercent}%)</span>
                                <span className="font-mono font-semibold">
                                    -{formatCurrency(discountAmount, company.currency)}
                                </span>
                            </div>
                        )}
                        {taxPercent > 0 && (
                            <div className="flex justify-between text-blue-600 dark:text-blue-400">
                                <span>Tax ({taxPercent}%)</span>
                                <span className="font-mono font-semibold">
                                    +{formatCurrency(taxAmount, company.currency)}
                                </span>
                            </div>
                        )}
                        <div className="flex items-center justify-between pt-1 border-t border-neutral-200/60 dark:border-neutral-700/60">
                            <span className="font-bold text-sm text-neutral-900 dark:text-white">Total Due</span>
                            <span className="font-mono text-base font-extrabold text-blue-600 dark:text-blue-400">
                                {formatCurrency(grandTotal, company.currency)}
                            </span>
                        </div>
                    </div>

                    {/* Instant Checkout Action Buttons */}
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => handleChargeClick('cash')}
                            disabled={cart.length === 0}
                            className="py-2.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            <DollarSign className="w-4 h-4" />
                            <span>Cash</span>
                        </button>
                        <button
                            onClick={() => handleChargeClick('card')}
                            disabled={cart.length === 0}
                            className="py-2.5 px-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            <CreditCard className="w-4 h-4" />
                            <span>Card</span>
                        </button>
                        <button
                            onClick={() => handleChargeClick('transfer')}
                            disabled={cart.length === 0}
                            className="py-2.5 px-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            <Building2 className="w-4 h-4" />
                            <span>Transfer</span>
                        </button>
                    </div>
                </div>
            </div>



            {/* Quick Add Customer Modal */}
            {isAddCustomerModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-neutral-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-neutral-100 dark:border-neutral-700 animate-in zoom-in-95">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-bold text-[#2d3748] dark:text-white flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-blue-600" />
                                Add New Customer
                            </h3>
                            <button
                                onClick={() => setIsAddCustomerModalOpen(false)}
                                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-white cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <form onSubmit={handleAddCustomer} className="space-y-4 text-left">
                            <div>
                                <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
                                    Customer Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newCustName}
                                    onChange={(e) => setNewCustName(e.target.value)}
                                    placeholder="Jane Doe"
                                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={newCustEmail}
                                    onChange={(e) => setNewCustEmail(e.target.value)}
                                    placeholder="jane.doe@example.com"
                                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
                                    Phone Number
                                </label>
                                <input
                                    type="text"
                                    value={newCustPhone}
                                    onChange={(e) => setNewCustPhone(e.target.value)}
                                    placeholder="+234 803 123 4567"
                                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
                                    Company / Business
                                </label>
                                <input
                                    type="text"
                                    value={newCustCompany}
                                    onChange={(e) => setNewCustCompany(e.target.value)}
                                    placeholder="Acme Corp"
                                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div className="pt-2 flex gap-2 justify-end">
                                <button
                                    type="button"
                                    onClick={() => setIsAddCustomerModalOpen(false)}
                                    className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-neutral-700 dark:text-white font-bold text-xs cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer"
                                >
                                    Save Profile
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Charge Order Modal */}
            {isChargeModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-neutral-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-neutral-100 dark:border-neutral-700 animate-in zoom-in-95 flex flex-col">
                        
                        {/* Header */}
                        <div className="p-5 border-b border-neutral-100 dark:border-neutral-700 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900">
                            <div>
                                <h3 className="text-base font-bold text-[#2d3748] dark:text-white">
                                    Charge POS Checkout
                                </h3>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                                    Select payment type and complete receipt details
                                </p>
                            </div>
                            <button
                                onClick={() => setIsChargeModalOpen(false)}
                                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-white cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Payment Method Switcher Tabs */}
                        <div className="flex border-b border-neutral-100 dark:border-neutral-700">
                            <button
                                onClick={() => setPaymentMethod('cash')}
                                className={`flex-1 py-3 font-semibold text-xs flex items-center justify-center gap-1.5 border-b-2 cursor-pointer ${
                                    paymentMethod === 'cash'
                                        ? 'border-emerald-600 text-emerald-600 bg-emerald-50/10'
                                        : 'border-transparent text-neutral-500 hover:text-[#2d3748] dark:hover:text-white'
                                }`}
                            >
                                <DollarSign className="w-4 h-4" />
                                Cash Payment
                            </button>
                            <button
                                onClick={() => setPaymentMethod('card')}
                                className={`flex-1 py-3 font-semibold text-xs flex items-center justify-center gap-1.5 border-b-2 cursor-pointer ${
                                    paymentMethod === 'card'
                                        ? 'border-blue-600 text-blue-600 bg-blue-50/10'
                                        : 'border-transparent text-neutral-500 hover:text-[#2d3748] dark:hover:text-white'
                                }`}
                            >
                                <CreditCard className="w-4 h-4" />
                                Card POS Terminal
                            </button>
                            <button
                                onClick={() => setPaymentMethod('transfer')}
                                className={`flex-1 py-3 font-semibold text-xs flex items-center justify-center gap-1.5 border-b-2 cursor-pointer ${
                                    paymentMethod === 'transfer'
                                        ? 'border-purple-600 text-purple-600 bg-purple-50/10'
                                        : 'border-transparent text-neutral-500 hover:text-[#2d3748] dark:hover:text-white'
                                }`}
                            >
                                <Building2 className="w-4 h-4" />
                                Bank Transfer
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
                            
                            {/* Summary Totals Row */}
                            <div className="p-4 bg-neutral-50 dark:bg-neutral-750 rounded-2xl flex items-center justify-between">
                                <div>
                                    <span className="text-xs text-neutral-500 dark:text-neutral-400">Total Charged Amount</span>
                                    <h4 className="text-lg font-bold text-neutral-900 dark:text-white mt-0.5">
                                        {cart.reduce((s, i) => s + i.quantity, 0)} Items
                                    </h4>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Total Due</span>
                                    <div className="text-2xl font-mono font-black text-blue-600 dark:text-blue-400">
                                        {formatCurrency(grandTotal, company.currency)}
                                    </div>
                                </div>
                            </div>

                            {/* CASH TAB DETAILS */}
                            {paymentMethod === 'cash' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1.5">
                                            Amount Received / Tendered ({company.currency})
                                        </label>
                                        <input
                                            type="number"
                                            value={amountReceived}
                                            onChange={(e) => setAmountReceived(e.target.value)}
                                            onFocus={(e) => e.target.select()}
                                            placeholder="Enter cash received..."
                                            className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-xl text-sm font-mono font-bold text-neutral-900 dark:text-white focus:outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    {/* Note Shortcuts */}
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                                            Cash Note Quick shortcuts
                                        </span>
                                        <div className="flex flex-wrap gap-2">
                                            {getCashNoteSuggestions.map(note => (
                                                <button
                                                    key={note}
                                                    type="button"
                                                    onClick={() => setAmountReceived(note.toString())}
                                                    className={`py-1.5 px-3 rounded-lg border text-xs font-mono font-semibold transition-all cursor-pointer ${
                                                        amountReceived === note.toString()
                                                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                                                            : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                                                    }`}
                                                >
                                                    {formatCurrency(note, company.currency)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Change Due Indicator */}
                                    <div className="p-4 bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-2xl flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                            <div>
                                                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Change Due</p>
                                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Return to customer</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xl font-mono font-black text-emerald-600 dark:text-emerald-400">
                                                {formatCurrency(changeDue, company.currency)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* CARD TAB DETAILS */}
                            {paymentMethod === 'card' && (
                                <div className="space-y-4">
                                    <div className="p-4 bg-blue-500/10 dark:bg-blue-950/20 border border-blue-500/20 rounded-2xl flex items-center gap-3">
                                        <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-pulse" />
                                        <div className="text-left text-xs">
                                            <p className="font-bold text-blue-800 dark:text-blue-300">Insert Card / Tap contactless</p>
                                            <p className="text-blue-600 dark:text-blue-400">Use external bank POS terminal and record transaction reference below</p>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1.5">
                                            POS Terminal Transaction Reference / Auth Code
                                        </label>
                                        <input
                                            type="text"
                                            value={cardRef}
                                            onChange={(e) => setCardRef(e.target.value)}
                                            placeholder="e.g. STANBIC-8472901-POS"
                                            className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* TRANSFER TAB DETAILS */}
                            {paymentMethod === 'transfer' && (
                                <div className="space-y-4">
                                    {/* Bank account details card */}
                                    <div className="p-4 bg-purple-500/15 dark:bg-purple-950/30 border border-purple-500/20 rounded-2xl text-left space-y-2">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                            <span className="font-bold text-xs text-purple-800 dark:text-purple-300">
                                                Business Payout Bank Details
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <p className="text-neutral-500 dark:text-neutral-400">Bank Name</p>
                                                <p className="font-semibold text-neutral-900 dark:text-white">Zenith Bank Plc</p>
                                            </div>
                                            <div>
                                                <p className="text-neutral-500 dark:text-neutral-400">Account Number</p>
                                                <p className="font-mono font-bold text-neutral-900 dark:text-white select-all">1012903847</p>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-neutral-500 dark:text-neutral-400">Account Name</p>
                                                <p className="font-semibold text-neutral-900 dark:text-white">{company.name} POS Checkout</p>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-purple-600 dark:text-purple-400 pt-1">
                                            Ask the customer to transfer exact due sum and input reference below.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1.5">
                                            Transaction Reference / Bank Session ID
                                        </label>
                                        <input
                                            type="text"
                                            value={transferRef}
                                            onChange={(e) => setTransferRef(e.target.value)}
                                            placeholder="e.g. TXN-REF-ZENITH-92810"
                                            className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Footer Actions */}
                        <div className="p-5 border-t border-neutral-100 dark:border-neutral-700 flex items-center justify-end gap-3 bg-neutral-50/50 dark:bg-neutral-900">
                            <button
                                type="button"
                                onClick={() => setIsChargeModalOpen(false)}
                                className="py-2.5 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-neutral-700 dark:text-white font-bold text-xs cursor-pointer transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={executeCheckout}
                                disabled={isProcessing || (paymentMethod === 'cash' && (parseFloat(amountReceived) || 0) < grandTotal)}
                                className={`py-2.5 px-6 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                    paymentMethod === 'cash' ? 'bg-emerald-600 hover:bg-emerald-700' :
                                    paymentMethod === 'card' ? 'bg-blue-600 hover:bg-blue-700' :
                                    'bg-purple-600 hover:bg-purple-700'
                                }`}
                            >
                                {isProcessing ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        <span>Authorizing...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>Confirm Checkout</span>
                                    </>
                                )}
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {/* Sale Completed Modal */}
            {isCompletedModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-neutral-800 rounded-3xl p-6 max-w-md w-full text-center space-y-4 shadow-2xl border border-neutral-100 dark:border-neutral-700 animate-in zoom-in-95">
                        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-inner">
                            <CheckCircle2 className="w-10 h-10" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                                Payment Completed!
                            </h3>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                Receipt <strong>{lastIssuedReceiptNumber}</strong> has been created and stock has been automatically deducted.
                            </p>
                        </div>

                        <div className="pt-2 flex flex-col gap-2">
                            {lastIssuedReceiptId && (
                                <Link
                                    href={`/receipts/${lastIssuedReceiptId}`}
                                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
                                >
                                    <Printer className="w-4 h-4" />
                                    <span>Print / View Receipt</span>
                                </Link>
                            )}
                            <button
                                onClick={handleNewSale}
                                className="w-full py-2.5 px-4 rounded-xl bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-800 dark:text-white font-bold text-xs transition-colors cursor-pointer"
                            >
                                Start New Sale
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Barcode Camera Scanner Modal */}
            <BarcodeScannerModal
                isOpen={isBarcodeModalOpen}
                onClose={() => setIsBarcodeModalOpen(false)}
                onScan={handleCameraScan}
                mode="continuous"
                title="POS Camera Barcode Scanner"
            />
        </div>
    );
}
