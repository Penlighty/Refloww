"use client";

import { useParams, useRouter } from 'next/navigation';
import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useProductStore, useDocumentStore, useSettingsStore, DEFAULT_CATEGORIES } from '@/lib/store';
import { formatDate, formatCurrency } from '@/lib/utils';
import { getBatchExpiryStatus, calculateReorderMetrics } from '@/lib/utils/inventoryUtils';
import { Button, Modal, ModalFooter, Input, Textarea, EmptyState, Select, PageHelpModal, HelpTooltip } from '@/components/ui';
import { generateSkuFromCategory } from '@/lib/utils/productUtils';
import OcrBatchModal from '@/components/OcrBatchModal';
import { toast } from 'react-hot-toast';

import {
    ArrowLeft,
    Package,
    Hash,
    DollarSign,
    Tag,
    Edit2,
    Trash2,
    FileText,
    Receipt,
    Truck,
    Copy,
    TrendingUp,
    ShoppingCart,
    Plus,
    Minus,
    X,
    Check,
    ScanLine,
    Barcode as BarcodeIcon,
    Sparkles,
    Layers,
    History,
    RefreshCw,
    ShieldCheck,
    AlertTriangle,
    Calendar,
    Zap,
    FileCode,
    Lock,
    HelpCircle,
    ChevronDown
} from 'lucide-react';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';
import { AlternativeMatchType, ProductType, ProductFormData } from '@/lib/types';

export default function ProductDetailClient() {
    const params = useParams();
    const router = useRouter();
    const productId = params.id as string;

    // Store
    const {
        products,
        categories,
        batches,
        movements,
        alternatives,
        updateProduct,
        deleteProduct,
        addProduct,
        addCategory,
        removeCategory,
        addAlternative,
        removeAlternative,
        getProductBatches,
        getProductMovements,
        getProductAlternatives
    } = useProductStore();

    const { documents } = useDocumentStore();
    const { company } = useSettingsStore();
    const currency = company.currency;

    const product = products.find(p => p.id === productId);

    // UI State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
    const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
    const [showInventoryHelp, setShowInventoryHelp] = useState(false);

    // Add Alternative Modal state
    const [isAltModalOpen, setIsAltModalOpen] = useState(false);
    const [selectedAltProdId, setSelectedAltProdId] = useState('');
    const [altMatchType, setAltMatchType] = useState<AlternativeMatchType>('exact_equivalent');
    const [altNotes, setAltNotes] = useState('');

    const [formData, setFormData] = useState<ProductFormData>({
        name: product?.name || '',
        sku: product?.sku || '',
        productType: product?.productType || 'physical',
        barcode: product?.barcode || '',
        description: product?.description || '',
        unitPrice: product?.unitPrice || 0,
        costPrice: product?.costPrice || 0,
        category: product?.category || '',
        stockQuantity: product?.stockQuantity,
        inventoryStrategy: product?.inventoryStrategy || 'FEFO',
    });

    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [isCategoryListOpen, setIsCategoryListOpen] = useState(false);
    const categoryContainerRef = useRef<HTMLDivElement>(null);

    // Close category list when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (categoryContainerRef.current && !categoryContainerRef.current.contains(event.target as Node)) {
                setIsCategoryListOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const allCategories = useMemo(() => {
        const customCats = products.map(p => p.category).filter(Boolean) as string[];
        const combined = Array.from(new Set([...(DEFAULT_CATEGORIES || []), ...(categories || []), ...customCats]));
        return combined.sort();
    }, [products, categories]);

    // Get batches, movements, and alternatives for this product
    const productBatches = useMemo(() => getProductBatches(productId), [productId, batches]);
    const productMovements = useMemo(() => getProductMovements(productId), [productId, movements]);
    const productAlternatives = useMemo(() => getProductAlternatives(productId), [productId, alternatives]);

    // Calculate smart reorder metrics
    const reorderMetrics = useMemo(() => {
        if (!product || (product.productType && product.productType !== 'physical')) return null;
        return calculateReorderMetrics(product, documents);
    }, [product, documents]);

    const isService = product?.productType === 'service' || product?.productType === 'digital';

    if (!product) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="bg-white border border-neutral-100 rounded-2xl p-12">
                    <EmptyState
                        icon={<Package className="w-8 h-8 text-neutral-400" strokeWidth={1.5} />}
                        title="Product not found"
                        description="The product you're looking for doesn't exist or has been deleted."
                        action={
                            <Button onClick={() => router.push('/products')}>
                                Back to Products
                            </Button>
                        }
                    />
                </div>
            </div>
        );
    }

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};
        if (!formData.name.trim()) errors.name = 'Name is required';
        if (!formData.sku.trim()) errors.sku = 'SKU is required';
        if (formData.unitPrice <= 0) errors.unitPrice = 'Price must be greater than 0';
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleUpdate = () => {
        if (!validateForm()) return;

        const finalStock = (formData.productType && formData.productType !== 'physical')
            ? undefined
            : formData.stockQuantity;

        updateProduct(productId, { ...formData, stockQuantity: finalStock });
        setIsEditModalOpen(false);
        toast.success('Product updated!');
    };

    const handleDelete = () => {
        deleteProduct(productId);
        router.push('/products');
    };

    const handleDuplicate = () => {
        addProduct({
            name: `${product.name} (Copy)`,
            sku: `${product.sku}-COPY`,
            productType: product.productType || 'physical',
            description: product.description,
            unitPrice: product.unitPrice,
            category: product.category,
        });
        router.push('/products');
    };

    const handleAddAlternative = () => {
        if (!selectedAltProdId) return;
        addAlternative(productId, selectedAltProdId, altMatchType, altNotes);
        toast.success('Linked product alternative successfully!');
        setIsAltModalOpen(false);
        setSelectedAltProdId('');
        setAltNotes('');
    };

    const openEditModal = () => {
        setFormData({
            name: product.name,
            sku: product.sku,
            productType: product.productType || 'physical',
            barcode: product.barcode || '',
            description: product.description,
            unitPrice: product.unitPrice,
            costPrice: product.costPrice || 0,
            category: product.category || '',
            stockQuantity: product.stockQuantity,
            inventoryStrategy: product.inventoryStrategy || 'FEFO',
        });
        setFormErrors({});
        setIsEditModalOpen(true);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Back Link */}
            <Link
                href="/products"
                className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-[#2d3748] transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Inventory
            </Link>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shrink-0 overflow-hidden ${
                        product.productType === 'service'
                            ? 'bg-gradient-to-br from-emerald-400 to-teal-600'
                            : product.productType === 'digital'
                                ? 'bg-gradient-to-br from-blue-400 to-indigo-600'
                                : 'bg-gradient-to-br from-violet-400 to-violet-600'
                    }`}>
                        {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                        ) : product.productType === 'service' ? (
                            <Zap className="w-8 h-8" />
                        ) : product.productType === 'digital' ? (
                            <FileCode className="w-8 h-8" />
                        ) : (
                            <Package className="w-8 h-8" strokeWidth={1.5} />
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-[#2d3748] dark:text-white">{product.name}</h1>
                            <PageHelpModal
                                title={`Product Details: ${product.name}`}
                                description="Detailed overview showing stock level, active FEFO batches, sales velocity calculations, stock movement timeline, and linked alternative substitutes."
                                terms={[
                                    { term: 'Product Alternatives', definition: 'Linked substitute items (exact equivalents or similar products) suggested when this item is out of stock.' },
                                    { term: 'FEFO Strategy', definition: 'First Expiry, First Out — automatically picks the batch closest to expiration date during sales.' }
                                ]}
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                            <code className="text-sm font-mono text-neutral-600 bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300 px-2 py-0.5 rounded">
                                {product.sku}
                            </code>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                product.productType === 'service'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : product.productType === 'digital'
                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                        : 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300'
                            }`}>
                                {product.productType === 'service' ? 'Service' : product.productType === 'digital' ? 'Digital' : 'Physical Goods'}
                            </span>
                            {product.category && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                                    {product.category}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {(!product.productType || product.productType === 'physical') && (
                        <Button
                            variant="outline"
                            leftIcon={<Sparkles className="w-4 h-4 text-violet-600" />}
                            onClick={() => setIsOcrModalOpen(true)}
                        >
                            Scan Packaging / Add Batch
                        </Button>
                    )}
                    <Button variant="ghost" leftIcon={<Copy className="w-4 h-4" />} onClick={handleDuplicate}>
                        Duplicate
                    </Button>
                    <Button variant="outline" leftIcon={<Edit2 className="w-4 h-4" />} onClick={openEditModal}>
                        Edit Item
                    </Button>
                    <Button variant="danger" leftIcon={<Trash2 className="w-4 h-4" />} onClick={() => setIsDeleteModalOpen(true)}>
                        Delete
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="space-y-6 lg:col-span-1">
                    {/* Price & Stock Banner */}
                    <div className="bg-gradient-to-br from-[#2d3748] via-[#3d4a5c] to-[#4a5568] text-white rounded-2xl p-6 shadow-lg">
                        <p className="text-xs text-neutral-300 uppercase tracking-wider mb-1">
                            {isService ? 'Service Rate' : 'Unit Selling Price'}
                        </p>
                        <p className="text-3xl font-bold">{formatCurrency(product.unitPrice, currency)}</p>

                        <div className="mt-4 pt-4 border-t border-neutral-600/50 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-neutral-300">Stock Availability</p>
                                <p className="text-xl font-bold text-emerald-400">
                                    {isService ? 'Unlimited (Service)' : `${product.stockQuantity ?? 0} units`}
                                </p>
                            </div>
                            {reorderMetrics?.isReorderNeeded && (
                                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-400 text-amber-950 flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5" /> Low Stock
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Reorder & Velocity Stats (Physical Only) */}
                    {reorderMetrics && !isService && (
                        <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-6 space-y-4">
                            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-violet-600" />
                                Smart Reorder Metrics
                            </h3>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl">
                                    <span className="text-neutral-400 block mb-1">Daily Sales Velocity</span>
                                    <strong className="text-base text-neutral-900 dark:text-white">{reorderMetrics.dailySalesVelocity}</strong> units/day
                                </div>
                                <div className="p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl">
                                    <span className="text-neutral-400 block mb-1">Calculated ROP</span>
                                    <strong className="text-base text-amber-600 dark:text-amber-400">{reorderMetrics.calculatedReorderPoint}</strong> units
                                </div>
                                <div className="p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl col-span-2">
                                    <span className="text-neutral-400 block mb-1">Suggested Reorder Quantity</span>
                                    <strong className="text-base text-violet-600 dark:text-violet-400">+{reorderMetrics.suggestedReorderQuantity} units</strong>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Alternatives Card */}
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                                <RefreshCw className="w-4 h-4 text-blue-600" />
                                Linked Alternatives ({productAlternatives.length})
                            </h3>
                            <Button size="sm" variant="outline" onClick={() => setIsAltModalOpen(true)}>+ Link</Button>
                        </div>

                        {productAlternatives.length === 0 ? (
                            <p className="text-xs text-neutral-400 text-center py-4">No linked alternatives yet. Click "+ Link" to connect equivalent items.</p>
                        ) : (
                            <div className="space-y-2">
                                {productAlternatives.map(alt => {
                                    const altTargetId = alt.productId === productId ? alt.alternativeProductId : alt.productId;
                                    const altProd = products.find(p => p.id === altTargetId);
                                    if (!altProd) return null;

                                    return (
                                        <div key={alt.id} className="p-3 rounded-xl border border-neutral-100 dark:border-neutral-700 flex items-center justify-between gap-2">
                                            <div>
                                                <span className="font-semibold text-xs text-neutral-900 dark:text-white block">{altProd.name}</span>
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300">
                                                    {alt.matchType === 'exact_equivalent' ? 'Exact Match' : 'Similar'}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => removeAlternative(alt.id)}
                                                className="text-neutral-400 hover:text-red-500 text-xs"
                                                title="Remove alternative link"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Details & Batches / Movements */}
                <div className="space-y-6 lg:col-span-2">
                    {/* Item Description & Information */}
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-6">
                        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-4">Item Details</h3>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                                <span className="text-neutral-400 block mb-1">SKU / Item Code</span>
                                <code className="font-mono text-neutral-900 dark:text-white font-bold">{product.sku}</code>
                            </div>
                            {product.barcode && (
                                <div>
                                    <span className="text-neutral-400 block mb-1">Barcode / UPC</span>
                                    <span className="font-mono text-neutral-900 dark:text-white font-medium">{product.barcode}</span>
                                </div>
                            )}
                            {product.costPrice ? (
                                <div>
                                    <span className="text-neutral-400 block mb-1">Cost / Expense Rate</span>
                                    <span className="font-bold text-neutral-900 dark:text-white">{formatCurrency(product.costPrice, currency)}</span>
                                </div>
                            ) : null}
                            {product.category && (
                                <div>
                                    <span className="text-neutral-400 block mb-1">Category</span>
                                    <span className="font-medium text-neutral-900 dark:text-white">{product.category}</span>
                                </div>
                            )}
                            {product.description && (
                                <div className="col-span-2 pt-3 border-t border-neutral-100 dark:border-neutral-700">
                                    <span className="text-neutral-400 block mb-1">Description</span>
                                    <p className="text-neutral-700 dark:text-neutral-300 text-sm leading-relaxed">{product.description}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Active Batches Table (Physical Only) */}
                    {!isService && (
                        <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-violet-600" />
                                    Stock Batches ({productBatches.length})
                                </h3>
                                <Button size="sm" leftIcon={<Sparkles className="w-3.5 h-3.5" />} onClick={() => setIsOcrModalOpen(true)}>
                                    Scan / Add Batch
                                </Button>
                            </div>

                            {productBatches.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-xs text-neutral-400 mb-3">No specific batches recorded for this physical product yet.</p>
                                    <Button size="sm" variant="outline" onClick={() => setIsOcrModalOpen(true)}>Add First Batch</Button>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-neutral-100 dark:border-neutral-700 text-neutral-400 uppercase">
                                                <th className="text-left py-2">Batch #</th>
                                                <th className="text-left py-2">Received</th>
                                                <th className="text-left py-2">Expiry Date</th>
                                                <th className="text-left py-2">Status</th>
                                                <th className="text-right py-2">Remaining Qty</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {productBatches.map(b => {
                                                const statusInfo = getBatchExpiryStatus(b.expiryDate, product.expiryWarningDays || 30);
                                                return (
                                                    <tr key={b.id} className="border-b border-neutral-50 dark:border-neutral-700/50">
                                                        <td className="py-2.5 font-mono font-bold text-violet-600">{b.batchNumber}</td>
                                                        <td className="py-2.5 text-neutral-500">{formatDate(b.receivedDate)}</td>
                                                        <td className="py-2.5 font-medium">{b.expiryDate ? formatDate(b.expiryDate) : '—'}</td>
                                                        <td className="py-2.5">
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusInfo.badgeClass}`}>
                                                                {statusInfo.label}
                                                            </span>
                                                        </td>
                                                        <td className="py-2.5 text-right font-bold text-neutral-900 dark:text-white">
                                                            {b.remainingQuantity} / {b.initialQuantity}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Stock Movements History */}
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-6">
                        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                            <History className="w-4 h-4 text-blue-600" />
                            Movement History Timeline ({productMovements.length})
                        </h3>

                        {productMovements.length === 0 ? (
                            <p className="text-xs text-neutral-400 py-6 text-center">No movement events logged for this item.</p>
                        ) : (
                            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                                {productMovements.map(m => (
                                    <div key={m.id} className="p-3 bg-neutral-50 dark:bg-neutral-700/40 rounded-xl flex items-center justify-between gap-3 text-xs">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-1.5 py-0.5 rounded uppercase font-bold text-[10px] ${
                                                    m.quantity > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                                }`}>
                                                    {m.type}
                                                </span>
                                                <span className="font-medium text-neutral-900 dark:text-white">{m.reason}</span>
                                            </div>
                                            <span className="text-[11px] text-neutral-400 mt-0.5 block">{formatDate(m.date)}</span>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className={`font-bold ${m.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                                            </span>
                                            <span className="text-neutral-400 block text-[10px]">Bal: {m.newQuantity}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* OCR Batch Modal */}
            <OcrBatchModal
                isOpen={isOcrModalOpen}
                onClose={() => setIsOcrModalOpen(false)}
                productId={productId}
                productName={product.name}
            />

            {/* Add Alternative Modal */}
            <Modal
                isOpen={isAltModalOpen}
                onClose={() => setIsAltModalOpen(false)}
                title={`Link Product Alternative for ${product.name}`}
                size="sm"
            >
                <div className="space-y-4">
                    <Select
                        label="Select Alternative Product *"
                        options={products
                            .filter(p => p.id !== productId)
                            .map(p => ({ value: p.id, label: `${p.name} (${p.sku})` }))
                        }
                        value={selectedAltProdId}
                        onChange={(val) => setSelectedAltProdId(val)}
                    />

                    <Select
                        label="Classification *"
                        options={[
                            { value: 'exact_equivalent', label: 'Exact Equivalent (Same spec / generic)' },
                            { value: 'similar_substitute', label: 'Similar Substitute (Related function)' }
                        ]}
                        value={altMatchType}
                        onChange={(val) => setAltMatchType(val as any)}
                    />

                    <Textarea
                        label="Substitution Notes"
                        placeholder="e.g. 500mg vs 250mg x 2"
                        value={altNotes}
                        onChange={(e) => setAltNotes(e.target.value)}
                        rows={2}
                    />
                </div>
                <ModalFooter>
                    <Button variant="ghost" onClick={() => setIsAltModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddAlternative}>Link Alternative</Button>
                </ModalFooter>
            </Modal>

            {/* Edit Product Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Edit Product / Service"
                size="lg"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Product Type Segmented Selector */}
                    <div className="md:col-span-2">
                        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5 block">
                            Product Type *
                        </label>
                        <div className="grid grid-cols-3 gap-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, productType: 'physical' })}
                                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                                    (!formData.productType || formData.productType === 'physical')
                                        ? 'bg-white dark:bg-neutral-700 text-violet-600 dark:text-violet-400 shadow-sm'
                                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                                }`}
                            >
                                <Package className="w-3.5 h-3.5" />
                                Physical Goods
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, productType: 'service', stockQuantity: undefined })}
                                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                                    formData.productType === 'service'
                                        ? 'bg-white dark:bg-neutral-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                                }`}
                            >
                                <Zap className="w-3.5 h-3.5" />
                                Service / Labor
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, productType: 'digital', stockQuantity: undefined })}
                                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                                    formData.productType === 'digital'
                                        ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                                }`}
                            >
                                <FileCode className="w-3.5 h-3.5" />
                                Digital Product
                            </button>
                        </div>
                    </div>

                    {formData.productType && formData.productType !== 'physical' && (
                        <div className="md:col-span-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                            <Zap className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>This is a non-tangible <strong>{formData.productType}</strong> item. Physical inventory counts, batch tracking, and reorder alerts are bypassed.</span>
                        </div>
                    )}

                    {/* Category Combobox */}
                    <div className="relative" ref={categoryContainerRef}>
                        <Input
                            label="Category"
                            placeholder="Select or type a category..."
                            value={formData.category}
                            onChange={(e) => {
                                setFormData({ ...formData, category: e.target.value });
                                setIsCategoryListOpen(true);
                            }}
                            onFocus={() => setIsCategoryListOpen(true)}
                            leftIcon={<Tag className="w-4 h-4 text-blue-500" />}
                            rightIcon={<ChevronDown className="w-4 h-4 text-neutral-400" />}
                        />

                        {isCategoryListOpen && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-2xl z-50 max-h-36 overflow-y-auto p-1.5 text-xs divide-y divide-neutral-100 dark:divide-neutral-700/50">
                                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                                    Product Categories ({allCategories.length})
                                </div>
                                {allCategories.filter(cat => 
                                    !formData.category || cat.toLowerCase().includes(formData.category.toLowerCase())
                                ).map((cat) => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                            setFormData({ ...formData, category: cat });
                                            setIsCategoryListOpen(false);
                                        }}
                                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                                            formData.category === cat
                                                ? 'bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 font-semibold'
                                                : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/60'
                                        }`}
                                    >
                                        <span>{cat}</span>
                                        {formData.category === cat && <Check className="w-3.5 h-3.5 text-violet-600" />}
                                    </button>
                                ))}
                                {allCategories.filter(cat => !formData.category || cat.toLowerCase().includes(formData.category.toLowerCase())).length === 0 && (
                                    <div className="px-3 py-2 text-neutral-400 italic">
                                        Using custom category "{formData.category}"
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Product Name */}
                    <Input
                        label="Item Name *"
                        placeholder="e.g. Premium Headphones"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        error={formErrors.name}
                        leftIcon={<Package className="w-4 h-4" />}
                    />

                    {/* SKU (Auto-generated) */}
                    <div className="pointer-events-none select-none opacity-80">
                        <Input
                            label="SKU / Code (Auto-generated)"
                            value={product.sku || ''}
                            readOnly
                            disabled
                            tabIndex={-1}
                            className="bg-neutral-100 dark:bg-neutral-800 text-neutral-500 font-mono cursor-not-allowed border-neutral-200 dark:border-neutral-700"
                            leftIcon={<Lock className="w-4 h-4 text-neutral-400" />}
                        />
                    </div>

                    {/* Barcode */}
                    <Input
                        label="Barcode / Service Code"
                        placeholder="Scan or enter..."
                        value={formData.barcode || ''}
                        onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                        leftIcon={<BarcodeIcon className="w-4 h-4" />}
                    />

                    {/* Unit Selling Price */}
                    <Input
                        label={`Unit / Hourly Price (${company.currency}) *`}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={formData.unitPrice || ''}
                        onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
                        error={formErrors.unitPrice}
                        leftIcon={<DollarSign className="w-4 h-4 text-emerald-500" />}
                    />

                    {/* Cost Price */}
                    <Input
                        label={`Cost / Expense Rate (${company.currency})`}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={formData.costPrice || ''}
                        onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                        leftIcon={<DollarSign className="w-4 h-4 text-amber-500" />}
                    />

                    {/* Physical inventory fields only shown if Physical Product */}
                    {(!formData.productType || formData.productType === 'physical') && (
                        <>
                            <div className="md:col-span-2 flex items-center justify-between pt-1 pb-0.5 border-t border-neutral-100 dark:border-neutral-700/60 mt-1">
                                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                                    <Layers className="w-3.5 h-3.5 text-violet-500" />
                                    Physical Inventory Setup
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setShowInventoryHelp(!showInventoryHelp)}
                                    className="flex items-center gap-1 text-xs text-neutral-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors py-0.5 px-2 rounded-md hover:bg-violet-50 dark:hover:bg-violet-950/40"
                                    title="Toggle inventory info"
                                >
                                    <HelpCircle className="w-3.5 h-3.5" />
                                    <span className="text-[11px] font-medium">{showInventoryHelp ? 'Hide info' : 'What is this?'}</span>
                                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showInventoryHelp ? 'rotate-180' : ''}`} />
                                </button>
                            </div>

                            {/* Inline Slide-Down Info Panel */}
                            {showInventoryHelp && (
                                <div className="md:col-span-2 p-3.5 bg-violet-50/80 dark:bg-violet-950/40 border border-violet-200/80 dark:border-violet-800/60 rounded-xl text-xs space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="flex items-center justify-between font-semibold text-violet-900 dark:text-violet-200">
                                        <span className="flex items-center gap-1.5">
                                            <Layers className="w-3.5 h-3.5 text-violet-600" />
                                            Simple Mode vs. Batch Mode
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setShowInventoryHelp(false)}
                                            className="text-violet-400 hover:text-violet-600 dark:hover:text-violet-200 p-0.5 rounded"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <p className="text-violet-700 dark:text-violet-300 leading-relaxed">
                                        <strong>Simple Mode:</strong> Type total stock count directly into the field below (e.g. 50 units). Ideal for fast inventory tracking without lot details.
                                    </p>
                                    <p className="text-violet-700 dark:text-violet-300 leading-relaxed">
                                        <strong>Batch Mode:</strong> Add stock via <strong>Batches / OCR Scanning</strong> (+ Batch button or packaging scan). Whenever batches exist, total stock is calculated automatically from active batch totals.
                                    </p>
                                </div>
                            )}
                            <Input
                                label="Stock Quantity (Simple mode)"
                                type="number"
                                placeholder="0"
                                value={formData.stockQuantity !== undefined ? formData.stockQuantity : ''}
                                onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                                hint="If using batch mode, batch sum will override this automatically"
                            />

                            <Select
                                label="Inventory Picking Strategy"
                                options={[
                                    { value: 'FEFO', label: 'FEFO (First Expiry, First Out)' },
                                    { value: 'FIFO', label: 'FIFO (First In, First Out)' }
                                ]}
                                value={formData.inventoryStrategy || 'FEFO'}
                                onChange={(val) => setFormData({ ...formData, inventoryStrategy: val as any })}
                            />
                        </>
                    )}

                    <div className="md:col-span-2">
                        <Textarea
                            label="Description"
                            placeholder="Brief description..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={2}
                        />
                    </div>
                </div>

                <ModalFooter>
                    <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleUpdate}>Save Changes</Button>
                </ModalFooter>
            </Modal>

            {/* Delete Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Item"
                size="sm"
            >
                <p className="text-neutral-600">
                    Are you sure you want to delete <strong className="text-[#2d3748]">{product.name}</strong>?
                </p>
                <ModalFooter>
                    <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                    <Button variant="danger" onClick={handleDelete}>Delete Product</Button>
                </ModalFooter>
            </Modal>
        </div>
    );
}
