"use client";

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useProductStore, useSettingsStore, useDiscountStore, useDocumentStore, useOrganizationStore, DEFAULT_CATEGORIES } from '@/lib/store';
import { Product, ProductFormData, StockBatch, StockMovement, ProductType } from '@/lib/types';
import { formatCurrency, formatDate, parseCSV, generateCSV, downloadCSV, readFileAsText } from '@/lib/utils';
import { calculateReorderMetrics, getBatchExpiryStatus, generateAutoBatchNumber } from '@/lib/utils/inventoryUtils';
import { Button, EmptyState, SearchInput, Modal, ModalFooter, Input, Textarea, Select, PageHelpModal, HelpTooltip, ImageUploader } from '@/components/ui';
import { toast } from 'react-hot-toast';
import { generateSkuFromCategory } from '@/lib/utils/productUtils';
import { validateContentPolicy } from '@/lib/utils/contentPolicy';
import OcrBatchModal from '@/components/OcrBatchModal';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';

import {
    Plus,
    Package,
    DollarSign,
    Hash,
    MoreVertical,
    Edit2,
    Trash2,
    ArrowUpDown,
    Tag,
    Copy,
    Upload,
    Download,
    AlertCircle,
    Check,
    Eye,
    Minus,
    X,
    ScanLine,
    Barcode as BarcodeIcon,
    Store,
    Layers,
    Calendar,
    AlertTriangle,
    TrendingUp,
    History,
    Sparkles,
    ShieldAlert,
    Clock,
    CheckSquare,
    Square,
    ChevronDown,
    Truck,
    Wand2,
    RefreshCw,
    Zap,
    FileCode,
    Lock,
    HelpCircle
} from 'lucide-react';

type SortField = 'name' | 'productType' | 'category' | 'unitPrice' | 'stockQuantity' | 'sku' | 'createdAt';
type SortOrder = 'asc' | 'desc';
type TabType = 'catalog' | 'batches' | 'reorder' | 'movements';

// CSV column mapping for product import
const productCSVMapping = {
    'name': 'name' as const,
    'product name': 'name' as const,
    'product': 'name' as const,
    'sku': 'sku' as const,
    'product sku': 'sku' as const,
    'code': 'sku' as const,
    'barcode': 'barcode' as const,
    'upc': 'barcode' as const,
    'ean': 'barcode' as const,
    'description': 'description' as const,
    'price': 'unitPrice' as const,
    'unit price': 'unitPrice' as const,
    'unitprice': 'unitPrice' as const,
    'category': 'category' as const,
};

export default function ProductsPage() {
    const {
        products,
        getFilteredProducts,
        categories,
        batches,
        movements,
        addProduct,
        updateProduct,
        deleteProduct,
        addCategory,
        removeCategory,
        writeOffWastage,
        deleteStockBatch
    } = useProductStore();

    const activeOrgId = useOrganizationStore((state) => state.activeOrganizationId);
    const displayProducts = useMemo(() => getFilteredProducts(), [products, activeOrgId, getFilteredProducts]);
    const displayMovements = useMemo(() => {
        return movements.filter(m => displayProducts.some(p => p.id === m.productId));
    }, [movements, displayProducts]);

    const { company, numbering } = useSettingsStore();
    const { discounts } = useDiscountStore();
    const { documents } = useDocumentStore();
    const searchParams = useSearchParams();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Active Tab state
    const [activeTab, setActiveTab] = useState<TabType>('catalog');

    // UI State
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
    const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
    const [isSelectMode, setIsSelectMode] = useState<boolean>(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
    const [showInventoryHelp, setShowInventoryHelp] = useState(false);

    // OCR & Batch Modal state
    const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
    const [selectedOcrProduct, setSelectedOcrProduct] = useState<{ id: string; name: string } | null>(null);

    // Wastage writeoff modal state
    const [isWastageModalOpen, setIsWastageModalOpen] = useState(false);
    const [targetWastageBatch, setTargetWastageBatch] = useState<StockBatch | null>(null);
    const [wastageQty, setWastageQty] = useState(1);
    const [wastageReason, setWastageReason] = useState('Expired stock write-off');

    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    // Auto-open modal if 'add' query param is present
    useEffect(() => {
        if (searchParams.get('add') === 'true') {
            openCreateModal();
        }
    }, [searchParams]);

    // Dynamic browser tab title
    useEffect(() => {
        document.title = 'Products & Inventory | Refloww';
    }, []);

    // Category Dropdown State
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

    // Form State
    const [formData, setFormData] = useState<ProductFormData>({
        name: '',
        sku: '',
        productType: 'physical',
        barcode: '',
        description: '',
        unitPrice: 0,
        costPrice: 0,
        category: '',
        imageUrl: '',
        stockQuantity: undefined,
        minReorderPoint: 5,
        leadTimeDays: 7,
        safetyStockDays: 3,
        inventoryStrategy: 'FEFO',
        expiryWarningDays: 30,
        discountedPrice: undefined,
        discountId: undefined,
        storefrontLabel: undefined,
        isPublishedToStore: true,
        storeDescription: '',
    });

    const [formErrors, setFormErrors] = useState<Partial<Record<keyof ProductFormData, string>>>({});

    // Filtered Products
    const filteredProducts = useMemo(() => {
        let result = displayProducts.filter((product) => {
            const query = searchQuery.toLowerCase();
            return (
                product.name.toLowerCase().includes(query) ||
                product.sku.toLowerCase().includes(query) ||
                product.description.toLowerCase().includes(query) ||
                product.category?.toLowerCase().includes(query)
            );
        });

        result.sort((a, b) => {
            const aVal = a[sortField];
            const bVal = b[sortField];
            if (aVal === undefined || bVal === undefined) return 0;
            const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [displayProducts, searchQuery, sortField, sortOrder]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const isAllSelected = filteredProducts.length > 0 && selectedProductIds.length === filteredProducts.length;

    const toggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedProductIds([]);
        } else {
            setSelectedProductIds(filteredProducts.map(p => p.id));
        }
    };

    const toggleSelectRow = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setSelectedProductIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleBulkDelete = () => {
        selectedProductIds.forEach(id => deleteProduct(id));
        toast.success(`Deleted ${selectedProductIds.length} product(s)`);
        setSelectedProductIds([]);
        setIsBulkDeleteModalOpen(false);
    };

    // Batch expiry overview calculations (physical products only)
    const batchExpiryInfoList = useMemo(() => {
        return batches
            .map(batch => {
                const product = displayProducts.find(p => p.id === batch.productId);
                // Services and Digital products do NOT have batches or expiry dates
                if (!product || (product.productType && product.productType !== 'physical')) {
                    return null;
                }

                const warningDays = product.expiryWarningDays || 30;
                const expiryInfo = getBatchExpiryStatus(batch.expiryDate, warningDays);
                return {
                    batch,
                    product,
                    expiryInfo
                };
            })
            .filter((item): item is { batch: StockBatch; product: Product; expiryInfo: ReturnType<typeof getBatchExpiryStatus> } => item !== null);
    }, [batches, displayProducts]);

    const isAllBatchesSelected = batchExpiryInfoList.length > 0 && selectedBatchIds.length === batchExpiryInfoList.length;

    const toggleSelectAllBatches = () => {
        if (isAllBatchesSelected) {
            setSelectedBatchIds([]);
        } else {
            setSelectedBatchIds(batchExpiryInfoList.map(b => b.batch.id));
        }
    };

    const toggleSelectBatchRow = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setSelectedBatchIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleBulkDeleteBatches = () => {
        selectedBatchIds.forEach(id => deleteStockBatch(id));
        toast.success(`Deleted ${selectedBatchIds.length} batch(es)`);
        setSelectedBatchIds([]);
    };

    const expiredBatchesCount = useMemo(() => {
        return batchExpiryInfoList.filter(b => b.expiryInfo.status === 'expired' && b.batch.remainingQuantity > 0).length;
    }, [batchExpiryInfoList]);

    const nearExpiryBatchesCount = useMemo(() => {
        return batchExpiryInfoList.filter(b => b.expiryInfo.status === 'near_expiry' && b.batch.remainingQuantity > 0).length;
    }, [batchExpiryInfoList]);

    // Smart reorder calculations (physical products only)
    const reorderProductList = useMemo(() => {
        return displayProducts
            .filter(p => !p.productType || p.productType === 'physical')
            .map(product => {
                const metrics = calculateReorderMetrics(product, documents);
                return {
                    product,
                    metrics
                };
            })
            .sort((a, b) => (b.metrics.isReorderNeeded ? 1 : 0) - (a.metrics.isReorderNeeded ? 1 : 0));
    }, [displayProducts, documents]);

    const reorderNeededCount = useMemo(() => {
        return reorderProductList.filter(r => r.metrics.isReorderNeeded).length;
    }, [reorderProductList]);

    // Average Supplier Lead Time calculation across physical products
    const averageLeadTimeDays = useMemo(() => {
        const physicalProducts = displayProducts.filter(p => !p.productType || p.productType === 'physical');
        if (physicalProducts.length === 0) return 7;
        const totalDays = physicalProducts.reduce((acc, curr) => acc + (curr.leadTimeDays || 7), 0);
        return Math.round(totalDays / physicalProducts.length);
    }, [displayProducts]);

    // Handlers
    const autoGenerateSku = (category?: string, name?: string): string => {
        let prefix = 'PRD';
        if (category && category.trim().length >= 2) {
            prefix = category.trim().substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
        } else if (name && name.trim().length >= 2) {
            prefix = name.trim().substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
        }
        const nextNum = 1000 + products.length + 1;
        return `${prefix}-${nextNum}`;
    };

    const openCreateModal = () => {
        setEditingProduct(null);
        const initialSku = autoGenerateSku('', '');
        setFormData({
            name: '',
            sku: initialSku,
            productType: 'physical',
            barcode: '',
            description: '',
            unitPrice: 0,
            costPrice: 0,
            category: '',
            imageUrl: '',
            images: ['', '', '', '', ''],
            stockQuantity: undefined,
            minReorderPoint: 5,
            leadTimeDays: 7,
            safetyStockDays: 3,
            inventoryStrategy: 'FEFO',
            expiryWarningDays: 30,
            discountedPrice: undefined,
            discountId: undefined,
            storefrontLabel: undefined,
            isPublishedToStore: true,
            storeDescription: ''
        });
        setFormErrors({});
        setIsModalOpen(true);
    };

    // Live auto-generate SKU when Category or Name changes during creation
    useEffect(() => {
        if (isModalOpen && !editingProduct) {
            const nextSku = autoGenerateSku(formData.category, formData.name);
            setFormData(prev => ({ ...prev, sku: nextSku }));
        }
    }, [isModalOpen, editingProduct, formData.category, formData.name]);

    const openEditModal = (product: Product) => {
        setEditingProduct(product);
        const existingImages = product.images && product.images.length > 0
            ? product.images
            : [product.imageUrl || ''];
        const imageSlots = Array(5).fill('').map((_, i) => existingImages[i] || '');

        setFormData({
            name: product.name,
            sku: product.sku,
            productType: product.productType || 'physical',
            barcode: product.barcode || '',
            description: product.description,
            unitPrice: product.unitPrice,
            costPrice: product.costPrice || 0,
            category: product.category || '',
            imageUrl: product.imageUrl || '',
            images: imageSlots,
            stockQuantity: product.stockQuantity,
            minReorderPoint: product.minReorderPoint || 5,
            leadTimeDays: product.leadTimeDays || 7,
            safetyStockDays: product.safetyStockDays || 3,
            inventoryStrategy: product.inventoryStrategy || 'FEFO',
            expiryWarningDays: product.expiryWarningDays || 30,
            discountedPrice: product.discountedPrice,
            discountId: product.discountId,
            storefrontLabel: product.storefrontLabel,
            isPublishedToStore: product.isPublishedToStore !== false,
            storeDescription: product.storeDescription || '',
        });
        setFormErrors({});
        setIsModalOpen(true);
        setOpenMenuId(null);
    };

    const openDeleteModal = (product: Product) => {
        setProductToDelete(product);
        setIsDeleteModalOpen(true);
        setOpenMenuId(null);
    };

    const duplicateProduct = (product: Product) => {
        addProduct({
            name: `${product.name} (Copy)`,
            sku: `${product.sku}-COPY`,
            productType: product.productType || 'physical',
            description: product.description,
            unitPrice: product.unitPrice,
            category: product.category,
        });
        setOpenMenuId(null);
        toast.success(`Product duplicated as "${product.name} (Copy)"`);
    };

    const validateForm = (skuOverride?: string): boolean => {
        const errors: Partial<Record<keyof ProductFormData, string>> = {};
        const skuToValidate = skuOverride || formData.sku;

        if (!formData.name.trim()) errors.name = 'Product name is required';
        if (!skuToValidate || !skuToValidate.trim()) errors.sku = 'SKU is required';
        if (formData.unitPrice <= 0) errors.unitPrice = 'Price must be greater than 0';

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = () => {
        let currentSku = formData.sku;
        if (!editingProduct && (!currentSku || !currentSku.trim())) {
            currentSku = autoGenerateSku(formData.category, formData.name);
            setFormData(prev => ({ ...prev, sku: currentSku }));
        }

        if (!validateForm(currentSku)) return;

        const policyCheck = validateContentPolicy({
            name: formData.name,
            description: formData.description,
            category: formData.category,
            storeDescription: formData.storeDescription,
        });

        if (!policyCheck.isValid) {
            toast.error(policyCheck.violationReason || 'Prohibited product content detected.', { duration: 6000 });
            return;
        }

        const validImages = (formData.images || []).map(img => img.trim()).filter(Boolean);
        const primaryImage = validImages[0] || formData.imageUrl || '';

        let computedDiscountedPrice = formData.discountedPrice;
        if (formData.discountId) {
            const selectedDiscount = discounts.find(d => d.id === formData.discountId);
            if (selectedDiscount) {
                computedDiscountedPrice = parseFloat(
                    (formData.unitPrice * (1 - selectedDiscount.percentage / 100)).toFixed(2)
                );
            }
        }

        // For non-physical products (Service / Digital), bypass stockQuantity
        const finalStockQty = (formData.productType && formData.productType !== 'physical')
            ? undefined
            : formData.stockQuantity;

        const payload: ProductFormData = {
            ...formData,
            stockQuantity: finalStockQty,
            imageUrl: primaryImage,
            images: validImages,
            discountedPrice: computedDiscountedPrice,
        };

        if (editingProduct) {
            updateProduct(editingProduct.id, payload);
            toast.success(`Product "${formData.name}" updated`);
        } else {
            addProduct(payload);
            toast.success(`Product "${formData.name}" added successfully!`);
        }

        setIsModalOpen(false);
    };

    const handleDelete = () => {
        if (productToDelete) {
            const name = productToDelete.name;
            deleteProduct(productToDelete.id);
            setIsDeleteModalOpen(false);
            setProductToDelete(null);
            toast.success(`Product "${name}" deleted`);
        }
    };

    const openOcrForProduct = (prodId?: string, prodName?: string) => {
        const targetProd = prodId ? products.find(p => p.id === prodId) : products.find(p => !p.productType || p.productType === 'physical');
        if (!targetProd) {
            toast.error('Please create a physical product first before adding stock batches.');
            return;
        }
        setSelectedOcrProduct({ id: targetProd.id, name: targetProd.name });
        setIsOcrModalOpen(true);
    };

    const handleExecuteWastage = () => {
        if (!targetWastageBatch || wastageQty <= 0) return;

        writeOffWastage(targetWastageBatch.id, wastageQty, wastageReason);
        toast.success(`Wrote off ${wastageQty} units from Batch #${targetWastageBatch.batchNumber}`);
        setIsWastageModalOpen(false);
        setTargetWastageBatch(null);
    };

    const handleExportCSV = () => {
        const csv = generateCSV(products, [
            { key: 'name', header: 'Name' },
            { key: 'sku', header: 'SKU' },
            { key: 'productType', header: 'Type' },
            { key: 'description', header: 'Description' },
            { key: 'unitPrice', header: 'Price' },
            { key: 'category', header: 'Category' },
        ]);
        downloadCSV(csv, `products-${new Date().toISOString().split('T')[0]}.csv`);
        toast.success(`Exported ${products.length} products to CSV`);
    };

    return (
        <div className="w-full">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold text-[#2d3748] dark:text-white">Inventory & Products Hub</h1>
                        <PageHelpModal
                            title="Inventory & Products Hub Overview"
                            description="Your central hub for managing physical goods, services, digital items, lot/batch tracking, sales velocity analytics, and stock audit logs."
                            terms={[
                                { term: 'Physical Goods', definition: 'Tangible products tracking physical stock quantity, lot numbers, expiration dates, supplier lead times, and reorder levels.', example: 'Headphones, Coffee Beans, Skincare' },
                                { term: 'Service / Labor', definition: 'Non-tangible services, hourly work, consulting, or labor where physical unit counts and expiry tracking are bypassed.', example: 'Design Service, Hourly Consulting, Repair Work' },
                                { term: 'Digital Product', definition: 'Software licenses, downloadable files, or e-books where physical inventory counts are bypassed.', example: 'Software License, PDF Template' },
                                { term: 'FEFO Strategy', definition: 'First Expiry, First Out — automatically deducts items from the batch closest to expiration to eliminate wastage.' }
                            ]}
                            tips={[
                                "Switch between tabs to inspect active product catalog, FEFO stock batches, smart velocity reorder alerts, and audit logs.",
                                "Use 'Scan Packaging / OCR Batch' to record batch details directly from photos of product boxes or supplier invoices."
                            ]}
                        />
                    </div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                        Manage physical inventory, services, batches, sales velocity, and product alternatives
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        leftIcon={<Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />}
                        iconOnlyMobile
                        onClick={() => openOcrForProduct()}
                    >
                        Scan Packaging / OCR Batch
                    </Button>
                    <Link href="/storefront">
                        <Button variant="outline" leftIcon={<Store className="w-4 h-4 text-blue-600" />} iconOnlyMobile>
                            Storefront
                        </Button>
                    </Link>
                    <Button variant="ghost" leftIcon={<Download className="w-4 h-4" />} iconOnlyMobile onClick={handleExportCSV}>
                        Export
                    </Button>
                    <Button leftIcon={<Plus className="w-4 h-4" />} iconOnlyMobile onClick={openCreateModal}>
                        Add Product / Service
                    </Button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-700 mb-6 overflow-x-auto pb-px">
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setActiveTab('catalog')}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                            activeTab === 'catalog'
                                ? 'border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400'
                                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                        }`}
                    >
                        <Package className="w-4 h-4" />
                        Products & Services ({displayProducts.length})
                    </button>
                    <PageHelpModal
                        title="Products & Services Catalog"
                        description="Browse, filter, edit, and manage all physical items and non-physical services offered by your business."
                        terms={[
                            { term: 'SKU (Stock Keeping Unit)', definition: 'A unique alphanumeric code assigned to identify each product in your catalog.', example: 'ELE-001, SRV-102' },
                            { term: 'Selling Price vs Cost Price', definition: 'Selling Price is what your customers pay; Cost Price is what you paid to produce or purchase the item.' }
                        ]}
                        tips={[
                            "Click 'Edit' on any product row to change item type, update prices, or set custom supplier lead times."
                        ]}
                    />
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setActiveTab('batches')}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                            activeTab === 'batches'
                                ? 'border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400'
                                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                        }`}
                    >
                        <Layers className="w-4 h-4" />
                        Batches & Expiry Tracker ({batchExpiryInfoList.length})
                        {(expiredBatchesCount > 0 || nearExpiryBatchesCount > 0) && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold">
                                {expiredBatchesCount + nearExpiryBatchesCount} Alerts
                            </span>
                        )}
                    </button>
                    <PageHelpModal
                        title="FEFO Batch & Expiry Tracker"
                        description="Tracks physical product stock by date received, lot batch number, and expiration date to prevent product shrinkage."
                        terms={[
                            { term: 'Stock Batch / Lot', definition: 'A specific shipment or group of products received on a given date with an assigned lot code and expiry date.' },
                            { term: 'Wastage Write-Off', definition: 'Action to record damaged or expired stock so it is deducted from inventory and logged in audit history.' }
                        ]}
                        tips={[
                            "Click 'Write Off' to remove expired stock and keep your available inventory count 100% accurate."
                        ]}
                    />
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setActiveTab('reorder')}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                            activeTab === 'reorder'
                                ? 'border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400'
                                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                        }`}
                    >
                        <TrendingUp className="w-4 h-4" />
                        Smart Reorder Insights
                        {reorderNeededCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold">
                                {reorderNeededCount} Low
                            </span>
                        )}
                    </button>
                    <PageHelpModal
                        title="Smart Reorder & Velocity Insights"
                        description="Automated replenishment calculations based on active sales velocity over the past 30 days and supplier delivery windows."
                        terms={[
                            { term: 'Daily Sales Velocity', definition: 'Average number of units sold per day calculated from paid invoices and receipts over the past 30 days.' },
                            { term: 'Supplier Lead Time', definition: 'Number of days it takes for a supplier to fulfill and deliver a restock order.' },
                            { term: 'Reorder Point (ROP)', definition: 'Threshold stock level. When current stock falls below this level, restock is recommended.' }
                        ]}
                        tips={[
                            "Customize Supplier Lead Time per product in the Product Edit Modal to get tailored reorder alerts."
                        ]}
                    />
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setActiveTab('movements')}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                            activeTab === 'movements'
                                ? 'border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400'
                                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                        }`}
                    >
                        <History className="w-4 h-4" />
                        Stock Movements & Audit ({displayMovements.length})
                    </button>
                    <PageHelpModal
                        title="Stock Movements Audit Log"
                        description="Complete audit log recording every inventory change, purchase, sale deduction, manual adjustment, and wastage write-off."
                        terms={[
                            { term: 'Movement Audit Log', definition: 'An immutable record showing date, item name, change amount, remaining balance, and reason for every stock adjustment.' }
                        ]}
                        tips={[
                            "Use movement logs to audit unexpected inventory losses or verify sales deductions."
                        ]}
                    />
                </div>
            </div>

            {/* TAB 1: CATALOG */}
            {activeTab === 'catalog' && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                        <SearchInput
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="Search by name, SKU, category..."
                            className="flex-1 max-w-md"
                        />
                        <div className="flex items-center gap-2">
                            {!isSelectMode ? (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    leftIcon={<CheckSquare className="w-4 h-4 text-neutral-500" />}
                                    onClick={() => setIsSelectMode(true)}
                                >
                                    Select
                                </Button>
                            ) : (
                                <>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        leftIcon={isAllSelected ? <CheckSquare className="w-4 h-4 text-violet-600 dark:text-violet-400" /> : <Square className="w-4 h-4" />}
                                        onClick={toggleSelectAll}
                                    >
                                        {isAllSelected ? `Deselect All (${filteredProducts.length})` : 'Select All'}
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setIsSelectMode(false);
                                            setSelectedProductIds([]);
                                        }}
                                    >
                                        Done
                                    </Button>

                                    {selectedProductIds.length > 0 && (
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            leftIcon={<Trash2 className="w-4 h-4" />}
                                            onClick={() => setIsBulkDeleteModalOpen(true)}
                                        >
                                            Delete Selected ({selectedProductIds.length})
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {filteredProducts.length === 0 ? (
                        <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-12 text-center">
                            <EmptyState
                                icon={<Package className="w-8 h-8 text-neutral-400" strokeWidth={1.5} />}
                                title="No products found"
                                description="Try adjusting your search or add a new product or service."
                                action={
                                    <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openCreateModal}>
                                        Add Product / Service
                                    </Button>
                                }
                            />
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl pb-16 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-neutral-100 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50">
                                            {isSelectMode && (
                                                <th className="px-4 py-4 w-10 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={isAllSelected}
                                                        onChange={toggleSelectAll}
                                                        className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 text-violet-600 focus:ring-violet-500 cursor-pointer"
                                                    />
                                                </th>
                                            )}
                                            <th className="text-left px-6 py-4">
                                                <button
                                                    onClick={() => handleSort('name')}
                                                    className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 uppercase tracking-wider hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                                                >
                                                    Item
                                                    <ArrowUpDown className="w-3 h-3" />
                                                </button>
                                            </th>
                                            <th className="text-left px-6 py-4">
                                                <button
                                                    onClick={() => handleSort('productType')}
                                                    className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 uppercase tracking-wider hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                                                >
                                                    Type
                                                    <ArrowUpDown className="w-3 h-3" />
                                                </button>
                                            </th>
                                            <th className="text-left px-6 py-4">
                                                <button
                                                    onClick={() => handleSort('category')}
                                                    className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 uppercase tracking-wider hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                                                >
                                                    Category
                                                    <ArrowUpDown className="w-3 h-3" />
                                                </button>
                                            </th>
                                            <th className="text-left px-6 py-4">
                                                <button
                                                    onClick={() => handleSort('unitPrice')}
                                                    className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 uppercase tracking-wider hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                                                >
                                                    Price
                                                    <ArrowUpDown className="w-3 h-3" />
                                                </button>
                                            </th>
                                            <th className="text-left px-6 py-4">
                                                <button
                                                    onClick={() => handleSort('stockQuantity')}
                                                    className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 uppercase tracking-wider hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                                                >
                                                    Stock Level
                                                    <ArrowUpDown className="w-3 h-3" />
                                                </button>
                                            </th>
                                            <th className="text-right px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredProducts.map((product) => {
                                            const isService = product.productType === 'service' || product.productType === 'digital';
                                            const stockQty = product.stockQuantity;
                                            const isLow = !isService && stockQty !== undefined && stockQty <= (product.minReorderPoint || 5);
                                            const isOut = !isService && stockQty !== undefined && stockQty === 0;
                                            const isRowSelected = selectedProductIds.includes(product.id);

                                            return (
                                                <tr key={product.id} className={`border-b border-neutral-50 dark:border-neutral-700/50 hover:bg-neutral-50/50 dark:hover:bg-neutral-700/30 transition-colors ${isRowSelected ? 'bg-violet-50/40 dark:bg-violet-900/20' : ''}`}>
                                                    {isSelectMode && (
                                                        <td className="px-4 py-4 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={isRowSelected}
                                                                onChange={(e) => toggleSelectRow(product.id, e as any)}
                                                                className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 text-violet-600 focus:ring-violet-500 cursor-pointer"
                                                            />
                                                        </td>
                                                    )}
                                                    <td className="px-6 py-4">
                                                        <Link href={`/products/${product.id}`} className="flex items-center gap-3 group">
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 overflow-hidden ${
                                                                product.productType === 'service'
                                                                    ? 'bg-gradient-to-br from-emerald-400 to-teal-600'
                                                                    : product.productType === 'digital'
                                                                        ? 'bg-gradient-to-br from-blue-400 to-indigo-600'
                                                                        : 'bg-gradient-to-br from-violet-400 to-violet-600'
                                                            }`}>
                                                                {product.imageUrl ? (
                                                                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                                                ) : product.productType === 'service' ? (
                                                                    <Zap className="w-5 h-5" />
                                                                ) : product.productType === 'digital' ? (
                                                                    <FileCode className="w-5 h-5" />
                                                                ) : (
                                                                    <Package className="w-5 h-5" strokeWidth={1.75} />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <span className="font-medium text-[#2d3748] dark:text-white group-hover:text-violet-600 transition-colors block">
                                                                    {product.name}
                                                                </span>
                                                                <code className="text-[11px] font-mono text-neutral-400">{product.sku}</code>
                                                            </div>
                                                        </Link>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                            product.productType === 'service'
                                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                                                : product.productType === 'digital'
                                                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                                                    : 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300'
                                                        }`}>
                                                            {product.productType === 'service' ? 'Service' : product.productType === 'digital' ? 'Digital' : 'Physical'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-300">
                                                        {product.category || '—'}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-semibold text-neutral-900 dark:text-white">
                                                        {formatCurrency(product.unitPrice, company.currency)}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {isService ? (
                                                            <span className="text-xs text-neutral-400 italic font-medium">N/A (Service)</span>
                                                        ) : stockQty !== undefined ? (
                                                            <div className="flex items-center gap-2">
                                                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                                    isOut
                                                                        ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                                                                        : isLow
                                                                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                                                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                                }`}>
                                                                    {stockQty} units
                                                                </span>
                                                                {isLow && <span title="Below reorder point"><AlertTriangle className="w-4 h-4 text-amber-500" /></span>}
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-neutral-400 italic">Not Tracked</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {(!product.productType || product.productType === 'physical') && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => openOcrForProduct(product.id, product.name)}
                                                                    title="Add batch or scan packaging OCR"
                                                                >
                                                                    + Batch
                                                                </Button>
                                                            )}
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => openEditModal(product)}
                                                                leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                                                            >
                                                                Edit
                                                            </Button>
                                                            <Link href={`/products/${product.id}`}>
                                                                <Button size="sm" variant="ghost">View</Button>
                                                            </Link>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: BATCHES & EXPIRY TRACKER */}
            {activeTab === 'batches' && (
                <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-4 bg-[#2d3748] dark:bg-neutral-800 text-white rounded-2xl p-6 shadow-md border border-neutral-700/40">
                        <div>
                            <h3 className="text-lg font-bold text-white">FEFO Batch & Expiry Management</h3>
                            <p className="text-xs text-neutral-300 mt-1">
                                Stock is automatically picked First-Expiry First-Out (FEFO) to eliminate inventory shrinkage and expired wastage.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                className="px-4 py-2.5 rounded-xl bg-white hover:bg-neutral-100 text-[#2d3748] font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
                                onClick={() => openOcrForProduct()}
                            >
                                <Sparkles className="w-4 h-4 text-violet-600 shrink-0" />
                                <span className="text-[#2d3748] font-bold">Scan Packaging / OCR Batch</span>
                            </button>
                        </div>
                    </div>

                    {/* Bulk Action Bar for Batches */}
                    {selectedBatchIds.length > 0 && (
                        <div className="flex items-center justify-between bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-800 p-3.5 rounded-2xl mb-4 animate-fade-in">
                            <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                                {selectedBatchIds.length} batch(es) selected
                            </span>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setSelectedBatchIds([])}>
                                    Cancel
                                </Button>
                                <Button
                                    variant="danger"
                                    size="sm"
                                    leftIcon={<Trash2 className="w-4 h-4" />}
                                    onClick={handleBulkDeleteBatches}
                                >
                                    Delete Selected ({selectedBatchIds.length})
                                </Button>
                            </div>
                        </div>
                    )}

                    {batchExpiryInfoList.length === 0 ? (
                        <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-12 text-center">
                            <EmptyState
                                icon={<Layers className="w-8 h-8 text-neutral-400" strokeWidth={1.5} />}
                                title="No active stock batches"
                                description="Scan product packaging or delivery notes to record your first batch."
                                action={
                                    <Button leftIcon={<Sparkles className="w-4 h-4" />} onClick={() => openOcrForProduct()}>
                                        Scan Packaging OCR
                                    </Button>
                                }
                            />
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-neutral-100 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50">
                                            <th className="px-4 py-4 w-10 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={isAllBatchesSelected}
                                                    onChange={toggleSelectAllBatches}
                                                    className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 text-violet-600 focus:ring-violet-500 cursor-pointer"
                                                />
                                            </th>
                                            <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Batch #</th>
                                            <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Product</th>
                                            <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Received</th>
                                            <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Expiry Date</th>
                                            <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Status</th>
                                            <th className="text-right px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Qty Remaining</th>
                                            <th className="text-right px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {batchExpiryInfoList.map(({ batch, product, expiryInfo }) => {
                                            const isRowSelected = selectedBatchIds.includes(batch.id);
                                            return (
                                            <tr key={batch.id} className={`border-b border-neutral-50 dark:border-neutral-700/50 hover:bg-neutral-50/50 dark:hover:bg-neutral-700/30 ${isRowSelected ? 'bg-violet-50/40 dark:bg-violet-900/20' : ''}`}>
                                                <td className="px-4 py-4 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={isRowSelected}
                                                        onChange={(e) => toggleSelectBatchRow(batch.id, e as any)}
                                                        className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 text-violet-600 focus:ring-violet-500 cursor-pointer"
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <code className="text-xs font-mono font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 px-2 py-1 rounded">
                                                        {batch.batchNumber}
                                                    </code>
                                                </td>
                                                <td className="px-6 py-4 text-sm font-semibold text-neutral-900 dark:text-white">
                                                    {product?.name || (products.length > 0 ? products[0].name : 'Product')}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-neutral-500">
                                                    {formatDate(batch.receivedDate)}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium">
                                                    {batch.expiryDate ? formatDate(batch.expiryDate) : '—'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${expiryInfo.badgeClass}`}>
                                                        {expiryInfo.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right text-sm font-bold text-neutral-900 dark:text-white">
                                                    {batch.remainingQuantity} / {batch.initialQuantity}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {batch.remainingQuantity > 0 && (
                                                        <Button
                                                            size="sm"
                                                            variant="danger"
                                                            onClick={() => {
                                                                setTargetWastageBatch(batch);
                                                                setWastageQty(batch.remainingQuantity);
                                                                setIsWastageModalOpen(true);
                                                            }}
                                                        >
                                                            Write Off
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 3: SMART REORDER INSIGHTS */}
            {activeTab === 'reorder' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-5 bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl">
                            <div className="flex items-center gap-3 text-amber-500 mb-2">
                                <AlertTriangle className="w-5 h-5" />
                                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Reorder Required</span>
                            </div>
                            <p className="text-3xl font-bold text-neutral-900 dark:text-white">{reorderNeededCount}</p>
                            <p className="text-xs text-neutral-400 mt-1">Physical items below reorder threshold</p>
                        </div>
                        <div className="p-5 bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl">
                            <div className="flex items-center gap-3 text-emerald-500 mb-2">
                                <TrendingUp className="w-5 h-5" />
                                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Active Velocity</span>
                            </div>
                            <p className="text-3xl font-bold text-neutral-900 dark:text-white">
                                {reorderProductList.filter(r => r.metrics.dailySalesVelocity > 0).length}
                            </p>
                            <p className="text-xs text-neutral-400 mt-1">Active daily sales recorded</p>
                        </div>
                        <div className="p-5 bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl">
                            <div className="flex items-center gap-3 text-blue-500 mb-2">
                                <Truck className="w-5 h-5" />
                                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Avg Lead Time</span>
                            </div>
                            <p className="text-3xl font-bold text-neutral-900 dark:text-white">
                                {averageLeadTimeDays} {averageLeadTimeDays === 1 ? 'Day' : 'Days'}
                            </p>
                            <p className="text-xs text-neutral-400 mt-1">Estimated supplier delivery window</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-neutral-100 dark:border-neutral-700">
                                        <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Product</th>
                                        <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Daily Velocity</th>
                                        <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Lead Time</th>
                                        <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Reorder Point</th>
                                        <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Current Stock</th>
                                        <th className="text-right px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Suggested Order</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reorderProductList.map(({ product, metrics }) => (
                                        <tr key={product.id} className="border-b border-neutral-50 dark:border-neutral-700/50 hover:bg-neutral-50/50 dark:hover:bg-neutral-700/30">
                                            <td className="px-6 py-4">
                                                <span className="font-semibold text-sm text-neutral-900 dark:text-white block">{product.name}</span>
                                                <code className="text-[11px] font-mono text-neutral-400">{product.sku}</code>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-neutral-700 dark:text-neutral-300">
                                                <strong>{metrics.dailySalesVelocity}</strong> units/day
                                            </td>
                                            <td className="px-6 py-4 text-sm text-neutral-500">
                                                {metrics.leadTimeDays} days
                                            </td>
                                            <td className="px-6 py-4 text-sm font-semibold text-amber-600 dark:text-amber-400">
                                                {metrics.calculatedReorderPoint} units
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                    metrics.isReorderNeeded
                                                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                                                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                }`}>
                                                    {product.stockQuantity ?? 0} units
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="font-bold text-sm text-violet-600 dark:text-violet-400">
                                                    +{metrics.suggestedReorderQuantity} units
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: STOCK MOVEMENTS & AUDIT LOG */}
            {activeTab === 'movements' && (
                <div className="space-y-6">
                    {displayMovements.length === 0 ? (
                        <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-12 text-center">
                            <EmptyState
                                icon={<History className="w-8 h-8 text-neutral-400" strokeWidth={1.5} />}
                                title="No stock movements recorded yet"
                                description="Stock movements are logged automatically when sales, purchases, or adjustments occur."
                            />
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-neutral-100 dark:border-neutral-700">
                                            <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Date</th>
                                            <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Product</th>
                                            <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Type</th>
                                            <th className="text-left px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Reason / Ref</th>
                                            <th className="text-right px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Change</th>
                                            <th className="text-right px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">New Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {displayMovements.map((mov) => {
                                            const prod = displayProducts.find(p => p.id === mov.productId);
                                            const isPositive = mov.quantity > 0;

                                            return (
                                                <tr key={mov.id} className="border-b border-neutral-50 dark:border-neutral-700/50 hover:bg-neutral-50/50 dark:hover:bg-neutral-700/30">
                                                    <td className="px-6 py-4 text-xs text-neutral-500">
                                                        {formatDate(mov.date)}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-semibold text-neutral-900 dark:text-white">
                                                        {prod?.name || 'Product'}
                                                        {mov.batchNumber && (
                                                            <span className="block text-[11px] font-mono text-neutral-400 font-normal">
                                                                Batch: {mov.batchNumber}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                                                            mov.type === 'purchase'
                                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                                                : mov.type === 'sale'
                                                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                                        }`}>
                                                            {mov.type}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-300">
                                                        {mov.reason}
                                                    </td>
                                                    <td className={`px-6 py-4 text-right font-bold text-sm ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                        {isPositive ? `+${mov.quantity}` : mov.quantity}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-sm text-neutral-900 dark:text-white">
                                                        {mov.newQuantity}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* OCR Scanner / Batch Modal */}
            {selectedOcrProduct && (
                <OcrBatchModal
                    isOpen={isOcrModalOpen}
                    onClose={() => setIsOcrModalOpen(false)}
                    productId={selectedOcrProduct.id}
                    productName={selectedOcrProduct.name}
                />
            )}

            {/* Wastage Writeoff Modal */}
            <Modal
                isOpen={isWastageModalOpen}
                onClose={() => setIsWastageModalOpen(false)}
                title={`Write Off Wastage / Expired Stock — Batch #${targetWastageBatch?.batchNumber}`}
                size="sm"
            >
                <div className="space-y-4">
                    <p className="text-xs text-neutral-500">
                        Recording wastage will remove stock from available inventory and log an audit entry under Stock Movements.
                    </p>

                    <Input
                        label="Quantity to Write Off"
                        type="number"
                        min="1"
                        max={targetWastageBatch?.remainingQuantity || 1}
                        value={wastageQty}
                        onChange={(e) => setWastageQty(parseInt(e.target.value, 10) || 1)}
                    />

                    <Textarea
                        label="Reason for Write Off"
                        value={wastageReason}
                        onChange={(e) => setWastageReason(e.target.value)}
                        rows={2}
                    />
                </div>
                <ModalFooter>
                    <Button variant="ghost" onClick={() => setIsWastageModalOpen(false)}>Cancel</Button>
                    <Button variant="danger" onClick={handleExecuteWastage}>Confirm Write Off</Button>
                </ModalFooter>
            </Modal>

            {/* Edit / Create Product Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingProduct ? 'Edit Product / Service' : 'Add New Product or Service'}
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

                    {/* Product Image */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                            Product Image
                        </label>
                        <ImageUploader
                            value={formData.imageUrl || ''}
                            onChange={(url) => setFormData({ ...formData, imageUrl: url })}
                            aspectRatio="square"
                        />
                    </div>

                    {/* Product Name */}
                    <Input
                        label="Item Name *"
                        placeholder={formData.productType === 'service' ? "e.g. Consulting Session" : "e.g. Premium Headphones"}
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        error={formErrors.name}
                        leftIcon={<Package className="w-4 h-4" />}
                    />

                    {/* SKU (Auto-generated) */}
                    <div className="pointer-events-none select-none opacity-80">
                        <Input
                            label="SKU / Code (Auto-generated)"
                            value={formData.sku || (editingProduct ? editingProduct.sku : 'SKU-Auto')}
                            readOnly
                            disabled
                            tabIndex={-1}
                            className="bg-neutral-100 dark:bg-neutral-800 text-neutral-500 font-mono cursor-not-allowed border-neutral-200 dark:border-neutral-700"
                            leftIcon={<Lock className="w-4 h-4 text-neutral-400" />}
                        />
                    </div>

                    {/* Barcode */}
                    <div className="flex items-end gap-2">
                        <div className="flex-1">
                            <Input
                                label="Barcode / Service Code"
                                placeholder="Scan or enter..."
                                value={formData.barcode || ''}
                                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                leftIcon={<BarcodeIcon className="w-4 h-4" />}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsScannerOpen(true)}
                            className="h-10 px-4 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors border border-neutral-200 dark:border-neutral-700 flex items-center justify-center shrink-0"
                            title="Scan Barcode"
                        >
                            <ScanLine className="w-4 h-4" />
                        </button>
                    </div>

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

                    {/* Cost Price - Hidden for Cashiers */}
                    {useSettingsStore.getState().staffRole !== 'cashier' && (
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
                    )}

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
                                label="Initial Stock Quantity (Simple Mode)"
                                type="number"
                                placeholder="e.g. 50"
                                value={formData.stockQuantity !== undefined ? formData.stockQuantity : ''}
                                onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                                hint="For simple tracking. Overridden automatically if batches are added."
                            />

                            <Select
                                label="Auto Picking Strategy (Batch Mode)"
                                options={[
                                    { value: 'FEFO', label: 'FEFO (First Expiry, First Out)' },
                                    { value: 'FIFO', label: 'FIFO (First In, First Out)' }
                                ]}
                                value={formData.inventoryStrategy || 'FEFO'}
                                onChange={(val) => setFormData({ ...formData, inventoryStrategy: val as any })}
                            />

                            <Input
                                label="Supplier Lead Time (Days)"
                                type="number"
                                min="1"
                                placeholder="7"
                                value={formData.leadTimeDays || ''}
                                onChange={(e) => setFormData({ ...formData, leadTimeDays: parseInt(e.target.value, 10) || 7 })}
                                hint="Estimated days for supplier to deliver restock"
                                leftIcon={<Truck className="w-4 h-4 text-blue-500" />}
                            />

                            <Input
                                label="Min Reorder Threshold (Units)"
                                type="number"
                                min="1"
                                placeholder="5"
                                value={formData.minReorderPoint || ''}
                                onChange={(e) => setFormData({ ...formData, minReorderPoint: parseInt(e.target.value, 10) || 5 })}
                                hint="Static baseline stock trigger level"
                                leftIcon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
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
                    <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmit}>Save Item</Button>
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
                    Are you sure you want to delete <strong className="text-[#2d3748]">{productToDelete?.name}</strong>?
                    This will also remove associated stock batches and history.
                </p>
                <ModalFooter>
                    <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                    <Button variant="danger" onClick={handleDelete}>Delete Product</Button>
                </ModalFooter>
            </Modal>

            {/* Bulk Delete Modal */}
            <Modal
                isOpen={isBulkDeleteModalOpen}
                onClose={() => setIsBulkDeleteModalOpen(false)}
                title="Delete Selected Items"
                size="sm"
            >
                <p className="text-neutral-600">
                    Are you sure you want to delete <strong>{selectedProductIds.length}</strong> selected item(s)? This will also remove associated stock batches and history.
                </p>
                <ModalFooter>
                    <Button variant="ghost" onClick={() => setIsBulkDeleteModalOpen(false)}>Cancel</Button>
                    <Button variant="danger" onClick={handleBulkDelete}>Delete All Selected ({selectedProductIds.length})</Button>
                </ModalFooter>
            </Modal>
            {/* Barcode Scanner Modal */}
            <BarcodeScannerModal
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                onScan={(barcode) => {
                    setFormData({ ...formData, barcode });
                    setIsScannerOpen(false);
                }}
            />
        </div>
    );
}
