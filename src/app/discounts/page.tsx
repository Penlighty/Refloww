"use client";

import { useState, useMemo } from 'react';
import { useDiscountStore } from '@/lib/store';
import { Discount, DiscountFormData } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { Button, EmptyState, SearchInput, Modal, ModalFooter, Input, Select } from '@/components/ui';
import {
    Plus,
    Percent,
    Tag,
    MoreVertical,
    Edit2,
    Trash2,
    ArrowUpDown,
    CheckCircle,
    XCircle
} from 'lucide-react';

type SortField = 'name' | 'percentage' | 'isActive';
type SortOrder = 'asc' | 'desc';

export default function DiscountsPage() {
    const { discounts, addDiscount, updateDiscount, deleteDiscount } = useDiscountStore();

    // UI State
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
    const [discountToDelete, setDiscountToDelete] = useState<Discount | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState<DiscountFormData>({
        name: '',
        percentage: 0,
        isActive: true,
    });
    const [formErrors, setFormErrors] = useState<Partial<DiscountFormData>>({}); // Note: keyof DiscountFormData might be number, so manual error handling

    // Filter and sort discounts
    const filteredDiscounts = useMemo(() => {
        let result = discounts.filter((discount) => {
            const query = searchQuery.toLowerCase();
            return (
                discount.name.toLowerCase().includes(query)
            );
        });

        result.sort((a, b) => {
            const aVal = a[sortField];
            const bVal = b[sortField];
            // Handle boolean comparison for isActive
            if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
                // true > false?
                return sortOrder === 'asc' ? (aVal === bVal ? 0 : aVal ? -1 : 1) : (aVal === bVal ? 0 : aVal ? 1 : -1);
            }
            const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [discounts, searchQuery, sortField, sortOrder]);

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
        setEditingDiscount(null);
        setFormData({ name: '', percentage: 0, isActive: true });
        setFormErrors({});
        setIsModalOpen(true);
    };

    const openEditModal = (discount: Discount) => {
        setEditingDiscount(discount);
        setFormData({
            name: discount.name,
            percentage: discount.percentage,
            isActive: discount.isActive,
        });
        setFormErrors({});
        setIsModalOpen(true);
        setOpenMenuId(null);
    };

    const openDeleteModal = (discount: Discount) => {
        setDiscountToDelete(discount);
        setIsDeleteModalOpen(true);
        setOpenMenuId(null);
    };

    const validateForm = (): boolean => {
        const errors: any = {};

        if (!formData.name.trim()) {
            errors.name = 'Name is required';
        }
        if (formData.percentage < 0 || formData.percentage > 100) {
            // We might want to allow 0?
            errors.percentage = 'Percentage must be between 0 and 100';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = () => {
        if (!validateForm()) return;

        if (editingDiscount) {
            updateDiscount(editingDiscount.id, formData);
        } else {
            addDiscount(formData);
        }

        setIsModalOpen(false);
    };

    const handleDelete = () => {
        if (discountToDelete) {
            deleteDiscount(discountToDelete.id);
            setIsDeleteModalOpen(false);
            setDiscountToDelete(null);
        }
    };

    return (
        <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[#2d3748] dark:text-white">Discounts</h1>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                        Manage your promotional discounts
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openCreateModal}>
                        Add Discount
                    </Button>
                </div>
            </div>

            {/* Search and Stats */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search discounts..."
                    className="flex-1 max-w-md"
                />
                <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                        {discounts.length} {discounts.length === 1 ? 'discount' : 'discounts'}
                    </span>
                </div>
            </div>

            {/* Discount List */}
            {discounts.length === 0 ? (
                <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-12">
                    <EmptyState
                        icon={<Percent className="w-8 h-8 text-neutral-400" strokeWidth={1.5} />}
                        title="No discounts yet"
                        description="Create your first discount to apply to documents."
                        action={
                            <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openCreateModal}>
                                Add Discount
                            </Button>
                        }
                    />
                </div>
            ) : filteredDiscounts.length === 0 ? (
                <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-12">
                    <EmptyState
                        title="No discounts found"
                        description={`No discounts match "${searchQuery}".`}
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
                                        Name
                                        <ArrowUpDown className="w-3 h-3" />
                                    </button>
                                </th>
                                <th className="text-left px-6 py-4">
                                    <button
                                        onClick={() => handleSort('percentage')}
                                        className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                                    >
                                        Percentage
                                        <ArrowUpDown className="w-3 h-3" />
                                    </button>
                                </th>
                                <th className="text-left px-6 py-4">
                                    <button
                                        onClick={() => handleSort('isActive')}
                                        className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                                    >
                                        Status
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
                            {filteredDiscounts.map((discount) => (
                                <tr
                                    key={discount.id}
                                    className="border-b border-neutral-50 dark:border-neutral-700/50 last:border-b-0 hover:bg-neutral-50/50 dark:hover:bg-neutral-700/30 transition-colors"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                <Tag className="w-5 h-5" />
                                            </div>
                                            <span className="font-medium text-[#2d3748] dark:text-white">{discount.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-mono font-medium text-neutral-700 dark:text-neutral-300">{discount.percentage}%</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${discount.isActive
                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                                            }`}>
                                            {discount.isActive ? (
                                                <>
                                                    <CheckCircle className="w-3 h-3" /> Active
                                                </>
                                            ) : (
                                                <>
                                                    <XCircle className="w-3 h-3" /> Inactive
                                                </>
                                            )}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="relative inline-block">
                                            <button
                                                onClick={() => setOpenMenuId(openMenuId === discount.id ? null : discount.id)}
                                                className="p-2 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                                            >
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                            {openMenuId === discount.id && (
                                                <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 py-1 z-10">
                                                    <button
                                                        onClick={() => {
                                                            updateDiscount(discount.id, { isActive: !discount.isActive });
                                                            setOpenMenuId(null);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                                                    >
                                                        {discount.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                                        {discount.isActive ? 'Deactivate' : 'Activate'}
                                                    </button>
                                                    <button
                                                        onClick={() => openEditModal(discount)}
                                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                        Edit
                                                    </button>
                                                    <div className="h-px bg-neutral-100 dark:bg-neutral-700 my-1" />
                                                    <button
                                                        onClick={() => openDeleteModal(discount)}
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
                title={editingDiscount ? 'Edit Discount' : 'Add New Discount'}
                description={editingDiscount ? 'Update discount details' : 'Create a new discount promo'}
                size="md"
            >
                <div className="space-y-4">
                    <Input
                        label="Name"
                        placeholder="e.g. Summer Sale, VIP"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        error={formErrors.name as string}
                        leftIcon={<Tag className="w-4 h-4" />}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Percentage (%)"
                            type="number"
                            min="0"
                            max="100"
                            placeholder="0"
                            value={formData.percentage}
                            onChange={(e) => setFormData({ ...formData, percentage: parseFloat(e.target.value) || 0 })}
                            leftIcon={<Percent className="w-4 h-4" />}
                        />
                        <div>
                            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">Status</label>
                            <Select
                                options={[
                                    { value: 'active', label: 'Active' },
                                    { value: 'inactive', label: 'Inactive' }
                                ]}
                                value={formData.isActive ? 'active' : 'inactive'}
                                onChange={(v) => setFormData({ ...formData, isActive: v === 'active' })}
                            />
                        </div>
                    </div>
                </div>
                <ModalFooter>
                    <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit}>
                        {editingDiscount ? 'Update Discount' : 'Add Discount'}
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Discount"
                size="sm"
            >
                <p className="text-neutral-600">
                    Are you sure you want to delete <strong className="text-[#2d3748]">{discountToDelete?.name}</strong>?
                    This action cannot be undone.
                </p>
                <ModalFooter>
                    <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={handleDelete}>
                        Delete Discount
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
}
