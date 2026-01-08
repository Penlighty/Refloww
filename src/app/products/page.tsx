"use client";

import { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useProductStore } from '@/lib/store';
import { Product, ProductFormData } from '@/lib/types';
import { formatCurrency, formatDate, parseCSV, generateCSV, downloadCSV, readFileAsText } from '@/lib/utils';
import { Button, EmptyState, SearchInput, Modal, ModalFooter, Input, Textarea } from '@/components/ui';
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
    Eye
} from 'lucide-react';

type SortField = 'name' | 'unitPrice' | 'sku' | 'createdAt';
type SortOrder = 'asc' | 'desc';

// CSV column mapping for product import
const productCSVMapping = {
    'name': 'name' as const,
    'product name': 'name' as const,
    'product': 'name' as const,
    'sku': 'sku' as const,
    'product sku': 'sku' as const,
    'code': 'sku' as const,
    'description': 'description' as const,
    'price': 'unitPrice' as const,
    'unit price': 'unitPrice' as const,
    'unitprice': 'unitPrice' as const,
    'category': 'category' as const,
};

export default function ProductsPage() {
    const { products, addProduct, updateProduct, deleteProduct } = useProductStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // UI State
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    // Import state
    const [importData, setImportData] = useState<ProductFormData[]>([]);
    const [importErrors, setImportErrors] = useState<string[]>([]);
    const [importSuccess, setImportSuccess] = useState(false);

    // Form State
    const [formData, setFormData] = useState<ProductFormData>({
        name: '',
        sku: '',
        description: '',
        unitPrice: 0,
        category: '',
    });
    const [formErrors, setFormErrors] = useState<Partial<Record<keyof ProductFormData, string>>>({});

    // Filter and sort products
    const filteredProducts = useMemo(() => {
        let result = products.filter((product) => {
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
    }, [products, searchQuery, sortField, sortOrder]);

    // Stats
    const totalValue = useMemo(() => {
        return products.reduce((sum, p) => sum + p.unitPrice, 0);
    }, [products]);

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

    // Handlers
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const openCreateModal = () => {
        setEditingProduct(null);
        setFormData({ name: '', sku: '', description: '', unitPrice: 0, category: '' });
        setFormErrors({});
        setIsModalOpen(true);
    };

    const openEditModal = (product: Product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            sku: product.sku,
            description: product.description,
            unitPrice: product.unitPrice,
            category: product.category || '',
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
            description: product.description,
            unitPrice: product.unitPrice,
            category: product.category,
        });
        setOpenMenuId(null);
    };

    const validateForm = (): boolean => {
        const errors: Partial<Record<keyof ProductFormData, string>> = {};

        if (!formData.name.trim()) {
            errors.name = 'Product name is required';
        }
        if (!formData.sku.trim()) {
            errors.sku = 'SKU is required';
        }
        if (formData.unitPrice <= 0) {
            errors.unitPrice = 'Price must be greater than 0';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = () => {
        if (!validateForm()) return;

        if (editingProduct) {
            updateProduct(editingProduct.id, formData);
        } else {
            addProduct(formData);
        }

        setIsModalOpen(false);
    };

    const handleDelete = () => {
        if (productToDelete) {
            deleteProduct(productToDelete.id);
            setIsDeleteModalOpen(false);
            setProductToDelete(null);
        }
    };

    // CSV Import handlers
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await readFileAsText(file);
            const parsed = parseCSV<ProductFormData>(text, productCSVMapping);

            // Validate parsed data
            const errors: string[] = [];
            const validData: ProductFormData[] = [];

            parsed.forEach((row, index) => {
                if (!row.name || typeof row.name !== 'string') {
                    errors.push(`Row ${index + 2}: Missing product name`);
                } else if (!row.sku || typeof row.sku !== 'string') {
                    errors.push(`Row ${index + 2}: Missing SKU`);
                } else if (!row.unitPrice || Number(row.unitPrice) <= 0) {
                    errors.push(`Row ${index + 2}: Invalid or missing price`);
                } else {
                    validData.push({
                        name: String(row.name || ''),
                        sku: String(row.sku || '').toUpperCase(),
                        description: String(row.description || ''),
                        unitPrice: Number(row.unitPrice) || 0,
                        category: String(row.category || ''),
                    });
                }
            });

            setImportData(validData);
            setImportErrors(errors);
            setImportSuccess(false);
            setIsImportModalOpen(true);
        } catch (error) {
            setImportErrors(['Failed to read file. Please make sure it is a valid CSV file.']);
            setImportData([]);
            setIsImportModalOpen(true);
        }

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleImportConfirm = () => {
        importData.forEach(product => addProduct(product));
        setImportSuccess(true);
    };

    const handleExportCSV = () => {
        const csv = generateCSV(products, [
            { key: 'name', header: 'Name' },
            { key: 'sku', header: 'SKU' },
            { key: 'description', header: 'Description' },
            { key: 'unitPrice', header: 'Price' },
            { key: 'category', header: 'Category' },
        ]);
        downloadCSV(csv, `products-${new Date().toISOString().split('T')[0]}.csv`);
    };

    return (
        <div className="max-w-7xl mx-auto">
            {/* Hidden file input */}
            <input
                type="file"
                ref={fileInputRef}
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
            />

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[#2d3748] dark:text-white">Products</h1>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                        Manage your product inventory
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" leftIcon={<Download className="w-4 h-4" />} onClick={handleExportCSV}>
                        Export
                    </Button>
                    <Button variant="outline" leftIcon={<Upload className="w-4 h-4" />} onClick={() => fileInputRef.current?.click()}>
                        Import CSV
                    </Button>
                    <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openCreateModal}>
                        Add Product
                    </Button>
                </div>
            </div>

            {/* Search and Stats */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search products by name, SKU, description..."
                    className="flex-1 max-w-md"
                />
                <div className="flex items-center gap-3">
                    <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                        {products.length} {products.length === 1 ? 'product' : 'products'}
                    </span>
                    {products.length > 0 && (
                        <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                            Avg: {formatCurrency(totalValue / products.length)}
                        </span>
                    )}
                </div>
            </div>

            {/* Product List */}
            {products.length === 0 ? (
                <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-12">
                    <EmptyState
                        icon={<Package className="w-8 h-8 text-neutral-400" strokeWidth={1.5} />}
                        title="No products yet"
                        description="Add your first product to start creating invoices and receipts."
                        action={
                            <div className="flex items-center gap-2">
                                <Button variant="outline" leftIcon={<Upload className="w-4 h-4" />} onClick={() => fileInputRef.current?.click()}>
                                    Import CSV
                                </Button>
                                <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openCreateModal}>
                                    Add Product
                                </Button>
                            </div>
                        }
                    />
                </div>
            ) : filteredProducts.length === 0 ? (
                <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-12">
                    <EmptyState
                        title="No products found"
                        description={`No products match "${searchQuery}". Try a different search term.`}
                    />
                </div>
            ) : (
                <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-neutral-100 dark:border-neutral-700">
                                <th className="text-left px-6 py-4">
                                    <button
                                        onClick={() => handleSort('name')}
                                        className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                                    >
                                        Product
                                        <ArrowUpDown className="w-3 h-3" />
                                    </button>
                                </th>
                                <th className="text-left px-6 py-4">
                                    <button
                                        onClick={() => handleSort('sku')}
                                        className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                                    >
                                        SKU
                                        <ArrowUpDown className="w-3 h-3" />
                                    </button>
                                </th>
                                <th className="text-left px-6 py-4 hidden lg:table-cell">
                                    <span className="text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                                        Category
                                    </span>
                                </th>
                                <th className="text-left px-6 py-4">
                                    <button
                                        onClick={() => handleSort('unitPrice')}
                                        className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                                    >
                                        Price
                                        <ArrowUpDown className="w-3 h-3" />
                                    </button>
                                </th>
                                <th className="text-left px-6 py-4 hidden md:table-cell">
                                    <button
                                        onClick={() => handleSort('createdAt')}
                                        className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                                    >
                                        Added
                                        <ArrowUpDown className="w-3 h-3" />
                                    </button>
                                </th>
                                <th className="text-right px-6 py-4">
                                    <span className="text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                                        Actions
                                    </span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map((product) => (
                                <tr
                                    key={product.id}
                                    className="border-b border-neutral-50 dark:border-neutral-700/50 last:border-b-0 hover:bg-neutral-50/50 dark:hover:bg-neutral-700/30 transition-colors"
                                >
                                    <td className="px-6 py-4">
                                        <Link href={`/products/${product.id}`} className="flex items-center gap-3 group">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white flex-shrink-0">
                                                <Package className="w-5 h-5" strokeWidth={1.75} />
                                            </div>
                                            <span className="font-medium text-[#2d3748] dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{product.name}</span>
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4">
                                        <code className="text-sm font-mono text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 px-2 py-0.5 rounded">
                                            {product.sku}
                                        </code>
                                    </td>
                                    <td className="px-6 py-4 hidden lg:table-cell">
                                        {product.category ? (
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getCategoryStyle(product.category)}`}>
                                                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50"></span>
                                                {product.category}
                                            </span>
                                        ) : (
                                            <span className="text-sm text-neutral-400">—</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-semibold text-[#2d3748] dark:text-white">{formatCurrency(product.unitPrice)}</span>
                                    </td>
                                    <td className="px-6 py-4 hidden md:table-cell">
                                        <span className="text-sm text-neutral-500 dark:text-neutral-400">{formatDate(product.createdAt)}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="relative inline-block">
                                            <button
                                                onClick={() => setOpenMenuId(openMenuId === product.id ? null : product.id)}
                                                className="p-2 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                                            >
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                            {openMenuId === product.id && (
                                                <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 py-1 z-10">
                                                    <Link
                                                        href={`/products/${product.id}`}
                                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                        View Details
                                                    </Link>
                                                    <button
                                                        onClick={() => openEditModal(product)}
                                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                        Edit Product
                                                    </button>
                                                    <button
                                                        onClick={() => duplicateProduct(product)}
                                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                        Duplicate
                                                    </button>
                                                    <div className="h-px bg-neutral-100 dark:bg-neutral-700 my-1" />
                                                    <button
                                                        onClick={() => openDeleteModal(product)}
                                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingProduct ? 'Edit Product' : 'Add New Product'}
                description={editingProduct ? 'Update product information' : 'Add a new product to your inventory'}
                size="lg"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Product Name"
                        placeholder="e.g. Premium Widget"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        error={formErrors.name}
                        leftIcon={<Package className="w-4 h-4" />}
                    />
                    <Input
                        label="SKU"
                        placeholder="e.g. PWD-001"
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                        error={formErrors.sku}
                        leftIcon={<Hash className="w-4 h-4" />}
                    />
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
                    <Input
                        label="Category"
                        placeholder="e.g. Electronics"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        leftIcon={<Tag className="w-4 h-4" />}
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
                    <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit}>
                        {editingProduct ? 'Update Product' : 'Add Product'}
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Product"
                size="sm"
            >
                <p className="text-neutral-600">
                    Are you sure you want to delete <strong className="text-[#2d3748]">{productToDelete?.name}</strong>?
                    This action cannot be undone.
                </p>
                <ModalFooter>
                    <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={handleDelete}>
                        Delete Product
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Import CSV Modal */}
            <Modal
                isOpen={isImportModalOpen}
                onClose={() => {
                    setIsImportModalOpen(false);
                    setImportData([]);
                    setImportErrors([]);
                    setImportSuccess(false);
                }}
                title="Import Products from CSV"
                size="lg"
            >
                {importSuccess ? (
                    <div className="text-center py-6">
                        <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                            <Check className="w-8 h-8 text-emerald-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-[#2d3748] mb-2">Import Successful!</h3>
                        <p className="text-neutral-600">
                            {importData.length} product{importData.length !== 1 ? 's' : ''} have been imported.
                        </p>
                    </div>
                ) : (
                    <>
                        {importErrors.length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-red-800 mb-1">
                                            {importErrors.length} error{importErrors.length !== 1 ? 's' : ''} found
                                        </p>
                                        <ul className="text-xs text-red-700 space-y-0.5">
                                            {importErrors.slice(0, 5).map((error, i) => (
                                                <li key={i}>{error}</li>
                                            ))}
                                            {importErrors.length > 5 && (
                                                <li>...and {importErrors.length - 5} more</li>
                                            )}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}

                        {importData.length > 0 ? (
                            <>
                                <p className="text-sm text-neutral-600 mb-4">
                                    Ready to import {importData.length} product{importData.length !== 1 ? 's' : ''}:
                                </p>
                                <div className="bg-neutral-50 rounded-xl p-4 max-h-60 overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-neutral-200">
                                                <th className="text-left py-2 text-xs font-medium text-neutral-400">Name</th>
                                                <th className="text-left py-2 text-xs font-medium text-neutral-400">SKU</th>
                                                <th className="text-right py-2 text-xs font-medium text-neutral-400">Price</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {importData.slice(0, 10).map((product, i) => (
                                                <tr key={i} className="border-b border-neutral-100 last:border-b-0">
                                                    <td className="py-2 text-[#2d3748] dark:text-white">{product.name}</td>
                                                    <td className="py-2 text-neutral-600 dark:text-neutral-300 font-mono">{product.sku}</td>
                                                    <td className="py-2 text-neutral-600 dark:text-neutral-300 text-right">{formatCurrency(product.unitPrice)}</td>
                                                </tr>
                                            ))}
                                            {importData.length > 10 && (
                                                <tr>
                                                    <td colSpan={3} className="py-2 text-neutral-400 text-center">
                                                        ...and {importData.length - 10} more
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        ) : (
                            <p className="text-sm text-neutral-500">No valid products found in the CSV file.</p>
                        )}
                    </>
                )}
                <ModalFooter>
                    <Button variant="ghost" onClick={() => {
                        setIsImportModalOpen(false);
                        setImportData([]);
                        setImportErrors([]);
                        setImportSuccess(false);
                    }}>
                        {importSuccess ? 'Close' : 'Cancel'}
                    </Button>
                    {!importSuccess && importData.length > 0 && (
                        <Button onClick={handleImportConfirm}>
                            Import {importData.length} Product{importData.length !== 1 ? 's' : ''}
                        </Button>
                    )}
                </ModalFooter>
            </Modal>
        </div>
    );
}
