"use client";

import { useParams, useRouter } from 'next/navigation';
import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useProductStore, useDocumentStore, useSettingsStore } from '@/lib/store';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Button, Modal, ModalFooter, Input, Textarea, EmptyState } from '@/components/ui';
import { generateSkuFromCategory } from '@/lib/utils/productUtils';


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
    Barcode as BarcodeIcon
} from 'lucide-react';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';

export default function ProductDetailClient() {
    const params = useParams();
    const router = useRouter();
    const productId = params.id as string;

    // Store
    const { products, categories, updateProduct, deleteProduct, addProduct, addCategory, removeCategory } = useProductStore();
    const { documents } = useDocumentStore();
    const { company } = useSettingsStore();
    const currency = company.currency;

    const product = products.find(p => p.id === productId);

    // UI State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: product?.name || '',
        sku: product?.sku || '',
        barcode: product?.barcode || '',
        description: product?.description || '',
        unitPrice: product?.unitPrice || 0,
        category: product?.category || '',
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

    // Get product usage in documents
    const productUsage = useMemo(() => {
        let totalQuantity = 0;
        let totalRevenue = 0;
        let documentCount = 0;
        const recentDocuments: Array<{
            id: string;
            documentNumber: string;
            type: 'invoice' | 'receipt' | 'delivery-note';
            date: string;
            quantity: number;
            subtotal: number;
        }> = [];

        documents.forEach(doc => {
            doc.lineItems.forEach(item => {
                if (item.productId === productId) {
                    totalQuantity += item.quantity;
                    totalRevenue += item.subtotal;
                    if (!recentDocuments.find(d => d.id === doc.id)) {
                        documentCount++;
                        recentDocuments.push({
                            id: doc.id,
                            documentNumber: doc.documentNumber,
                            type: doc.type,
                            date: doc.date,
                            quantity: item.quantity,
                            subtotal: item.subtotal,
                        });
                    }
                }
            });
        });

        // Sort by date descending
        recentDocuments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return { totalQuantity, totalRevenue, documentCount, recentDocuments };
    }, [documents, productId]);

    // Document type config
    const docTypeConfig = {
        'invoice': { icon: FileText, label: 'Invoice', bgClass: 'bg-blue-50', textClass: 'text-blue-600' },
        'receipt': { icon: Receipt, label: 'Receipt', bgClass: 'bg-emerald-50', textClass: 'text-emerald-600' },
        'delivery-note': { icon: Truck, label: 'Delivery Note', bgClass: 'bg-amber-50', textClass: 'text-amber-600' },
    };

    // Category badge colors
    const getCategoryStyle = (category: string) => {
        const styles: Record<string, string> = {
            'Electronics': 'bg-blue-50 text-blue-600',
            'Services': 'bg-emerald-50 text-emerald-600',
            'Software': 'bg-purple-50 text-purple-600',
            'Hardware': 'bg-amber-50 text-amber-600',
        };
        return styles[category] || 'bg-neutral-100 text-neutral-600';
    };

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
        updateProduct(productId, formData);
        setIsEditModalOpen(false);
    };

    const handleDelete = () => {
        deleteProduct(productId);
        router.push('/products');
    };

    const handleDuplicate = () => {
        addProduct({
            name: `${product.name} (Copy)`,
            sku: `${product.sku}-COPY`,
            description: product.description,
            unitPrice: product.unitPrice,
            category: product.category,
        });
        router.push('/products');
    };

    const openEditModal = () => {
        setFormData({
            name: product.name,
            sku: product.sku,
            barcode: product.barcode || '',
            description: product.description,
            unitPrice: product.unitPrice,
            category: product.category || '',
        });
        setFormErrors({});
        setIsEditModalOpen(true);
    };

    return (
        <div className="max-w-6xl mx-auto">
            {/* Back Link */}
            <Link
                href="/products"
                className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-[#2d3748] transition-colors mb-6"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Products
            </Link>

            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white">
                        <Package className="w-8 h-8" strokeWidth={1.5} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-[#2d3748]">{product.name}</h1>
                        <div className="flex items-center gap-3 mt-1">
                            <code className="text-sm font-mono text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded">
                                {product.sku}
                            </code>
                            {product.category && (
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getCategoryStyle(product.category)}`}>
                                    {product.category}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" leftIcon={<Copy className="w-4 h-4" />} onClick={handleDuplicate}>
                        Duplicate
                    </Button>
                    <Button variant="outline" leftIcon={<Edit2 className="w-4 h-4" />} onClick={openEditModal}>
                        Edit
                    </Button>
                    <Button variant="danger" leftIcon={<Trash2 className="w-4 h-4" />} onClick={() => setIsDeleteModalOpen(true)}>
                        Delete
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Product Info */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Price Card */}
                    <div className="bg-gradient-to-br from-[#2d3748] via-[#3d4a5c] to-[#4a5568] text-white rounded-2xl p-6">
                        <p className="text-sm text-neutral-300 mb-1">Unit Price</p>
                        <p className="text-3xl font-bold">{formatCurrency(product.unitPrice, currency)}</p>
                    </div>

                    {/* Details Card */}
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-6">
                        <h3 className="text-sm font-semibold text-[#2d3748] dark:text-white mb-4">Product Details</h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-1">SKU</p>
                                <code className="text-sm font-mono text-[#2d3748] dark:text-white">{product.sku}</code>
                            </div>
                            {product.barcode && (
                                <div>
                                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-1">Registered Barcode</p>
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-700 text-xs font-mono font-semibold text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-600">
                                        <BarcodeIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                        <span>{product.barcode}</span>
                                    </div>
                                </div>
                            )}
                            {product.category && (
                                <div>
                                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-1">Category</p>
                                    <p className="text-sm text-[#2d3748] dark:text-white">{product.category}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-1">Created</p>
                                <p className="text-sm text-[#2d3748] dark:text-white">{formatDate(product.createdAt)}</p>
                            </div>
                            {product.description && (
                                <div className="pt-4 border-t border-neutral-100 dark:border-neutral-700">
                                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-2">Description</p>
                                    <p className="text-sm text-neutral-600 dark:text-neutral-300">{product.description}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stats Card */}
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-6">
                        <h3 className="text-sm font-semibold text-[#2d3748] dark:text-white mb-4">Sales Statistics</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl">
                                <div className="flex items-center gap-2 mb-1">
                                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                                    <p className="text-xs text-neutral-400 dark:text-neutral-500">Revenue</p>
                                </div>
                                <p className="text-lg font-bold text-[#2d3748] dark:text-white">{formatCurrency(productUsage.totalRevenue, currency)}</p>
                            </div>
                            <div className="p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl">
                                <div className="flex items-center gap-2 mb-1">
                                    <ShoppingCart className="w-3.5 h-3.5 text-blue-500" />
                                    <p className="text-xs text-neutral-400 dark:text-neutral-500">Qty Sold</p>
                                </div>
                                <p className="text-lg font-bold text-[#2d3748] dark:text-white">{productUsage.totalQuantity}</p>
                            </div>
                            <div className="col-span-2 p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl">
                                <div className="flex items-center gap-2 mb-1">
                                    <FileText className="w-3.5 h-3.5 text-violet-500" />
                                    <p className="text-xs text-neutral-400 dark:text-neutral-500">Documents</p>
                                </div>
                                <p className="text-lg font-bold text-[#2d3748] dark:text-white">{productUsage.documentCount}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Recent Usage */}
                <div className="lg:col-span-2 h-[calc(100vh-140px)] min-h-[500px]">
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl overflow-hidden h-full flex flex-col">
                        <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-700 flex-shrink-0">
                            <h3 className="text-sm font-semibold text-[#2d3748] dark:text-white">Recent Usage</h3>
                        </div>

                        <div className="flex-1 overflow-y-auto">

                            {productUsage.recentDocuments.length === 0 ? (
                                <div className="p-12">
                                    <EmptyState
                                        icon={<ShoppingCart className="w-8 h-8 text-neutral-400" strokeWidth={1.5} />}
                                        title="No sales yet"
                                        description="This product hasn't been used in any documents yet."
                                    />
                                </div>
                            ) : (
                                <table className="w-full relative">
                                    <thead className="sticky top-0 bg-white dark:bg-neutral-800 z-10 shadow-sm shadow-neutral-100 dark:shadow-neutral-900/50">
                                        <tr className="border-b border-neutral-100 dark:border-neutral-700">
                                            <th className="text-left px-6 py-3 text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Document</th>
                                            <th className="text-left px-6 py-3 text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Date</th>
                                            <th className="text-right px-6 py-3 text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Quantity</th>
                                            <th className="text-right px-6 py-3 text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {productUsage.recentDocuments.map((doc) => {
                                            const TypeIcon = docTypeConfig[doc.type].icon;
                                            return (
                                                <tr key={doc.id} className="border-b border-neutral-50 dark:border-neutral-700/50 last:border-b-0 hover:bg-neutral-50/50 dark:hover:bg-neutral-700/30 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`p-2 rounded-lg ${docTypeConfig[doc.type].bgClass} ${docTypeConfig[doc.type].textClass}`}>
                                                                <TypeIcon className="w-4 h-4" strokeWidth={1.75} />
                                                            </div>
                                                            <div>
                                                                <span className="font-medium text-[#2d3748] dark:text-white block">{doc.documentNumber}</span>
                                                                <span className="text-xs text-neutral-500 dark:text-neutral-400">{docTypeConfig[doc.type].label}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm text-neutral-500 dark:text-neutral-400">{formatDate(doc.date)}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="text-sm font-medium text-[#2d3748] dark:text-white">{doc.quantity}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="font-semibold text-[#2d3748] dark:text-white">{formatCurrency(doc.subtotal, currency)}</span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)
                }
                title="Edit Product"
                size="lg"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Category (FIRST) */}
                    <div className="relative" ref={categoryContainerRef}>
                        <Input
                            label="Category"
                            placeholder="e.g. Electronics & Gadgets"
                            value={formData.category}
                            onChange={(e) => {
                                const newCat = e.target.value;
                                const generatedSku = (!formData.sku || formData.sku.startsWith('SKU-'))
                                    ? generateSkuFromCategory(newCat, products)
                                    : formData.sku;
                                setFormData({ ...formData, category: newCat, sku: generatedSku });
                            }}
                            onFocus={() => setIsCategoryListOpen(true)}
                            onBlur={() => {
                                if (formData.category.trim() && !categories.includes(formData.category.trim())) {
                                    const cat = formData.category.trim();
                                    addCategory(cat);

                                    if (!formData.sku || formData.sku.startsWith('SKU-')) {
                                        const generatedSku = generateSkuFromCategory(cat, products);
                                        setFormData(prev => ({ ...prev, category: cat, sku: generatedSku }));
                                    }
                                }
                            }}
                            leftIcon={<Tag className="w-4 h-4 text-blue-500" />}
                        />

                        {isCategoryListOpen && (
                            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {categories.filter(c => c.toLowerCase().includes(formData.category.toLowerCase())).length === 0 ? (
                                    <div className="px-4 py-2 text-sm text-neutral-500 dark:text-neutral-400">
                                        Type to create "{formData.category}"
                                    </div>
                                ) : (
                                    categories
                                        .filter(c => c.toLowerCase().includes(formData.category.toLowerCase()))
                                        .map((category) => (
                                            <div
                                                key={category}
                                                className="flex items-center justify-between px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-700/50 cursor-pointer group"
                                                onClick={() => {
                                                    const generatedSku = (!formData.sku || formData.sku.startsWith('SKU-'))
                                                        ? generateSkuFromCategory(category, products)
                                                        : formData.sku;

                                                    setFormData({ ...formData, category, sku: generatedSku });
                                                    setIsCategoryListOpen(false);
                                                }}
                                            >
                                                <span className="text-neutral-700 dark:text-neutral-200">{category}</span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (confirm(`Remove "${category}" from options?`)) {
                                                            removeCategory(category);
                                                        }
                                                    }}
                                                    className="p-1 text-neutral-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Remove from list"
                                                >
                                                    <Minus className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Product Name */}
                    <Input
                        label="Product Name"
                        placeholder="e.g. Premium Wireless Headphones"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        error={formErrors.name}
                        leftIcon={<Package className="w-4 h-4" />}
                    />

                    {/* SKU (Stock Keeping Unit) */}
                    <Input
                        label="SKU (Stock Keeping Unit)"
                        placeholder="e.g. ELE-001"
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                        error={formErrors.sku}
                        hint="Stock Keeping Unit — Unique code for inventory tracking (Auto-filled by category)"
                        leftIcon={<Hash className="w-4 h-4" />}
                    />

                    {/* Barcode / UPC */}
                    <div className="flex items-end gap-2">
                        <div className="flex-1">
                            <Input
                                label="Barcode / UPC"
                                placeholder="Scan or enter barcode..."
                                value={formData.barcode || ''}
                                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                leftIcon={<BarcodeIcon className="w-4 h-4" />}
                            />
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsBarcodeScannerOpen(true)}
                            className="h-10 px-3 shrink-0"
                            title="Scan barcode with camera"
                            leftIcon={<ScanLine className="w-4 h-4 text-blue-600" />}
                        >
                            Scan
                        </Button>
                    </div>

                    {/* Unit Price */}
                    <Input
                        label="Unit Price"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={formData.unitPrice || ''}
                        onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
                        error={formErrors.unitPrice}
                        leftIcon={<DollarSign className="w-4 h-4" />}
                    />
                    <div className="md:col-span-2">
                        <Textarea
                            label="Description"
                            placeholder="Brief description of the product..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                        />
                    </div>
                </div>
                <ModalFooter>
                    <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleUpdate}>Save Changes</Button>
                </ModalFooter>
            </Modal >

            {/* Delete Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Product"
                size="sm"
            >
                <p className="text-neutral-600">
                    Are you sure you want to delete <strong className="text-[#2d3748]">{product.name}</strong>?
                    This action cannot be undone.
                </p>
                <ModalFooter>
                    <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                    <Button variant="danger" onClick={handleDelete}>Delete Product</Button>
                </ModalFooter>
            </Modal >

            {/* Barcode Camera Scanner Modal */}
            <BarcodeScannerModal
                isOpen={isBarcodeScannerOpen}
                onClose={() => setIsBarcodeScannerOpen(false)}
                onScan={(code) => {
                    setFormData(prev => ({ ...prev, barcode: code }));
                }}
                mode="single"
                title="Register Product Barcode"
            />
        </div >
    );
}
