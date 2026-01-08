"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useDocumentStore, useCustomerStore, useSettingsStore } from '@/lib/store';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button, EmptyState, SearchInput, Select, Modal, ModalFooter } from '@/components/ui';
import { DocumentType } from '@/lib/types';
import {
    Plus,
    FileText,
    MoreVertical,
    Eye,
    Download,
    Send,
    Check,
    Clock,
    AlertCircle,
    Trash2,
    ArrowUpDown,
    Receipt,
    Truck,
    Edit2,
    Copy,
} from 'lucide-react';

interface DocumentListProps {
    type: DocumentType;
    title: string;
    newUrl: string;
    emptyTitle: string;
    emptyDescription: string;
}

const statusConfig = {
    'draft': { label: 'Draft', bgClass: 'bg-neutral-100 dark:bg-neutral-700', textClass: 'text-neutral-600 dark:text-neutral-300', dotClass: 'bg-neutral-400', icon: FileText },
    'sent': { label: 'Sent', bgClass: 'bg-blue-50 dark:bg-blue-900/30', textClass: 'text-blue-600 dark:text-blue-400', dotClass: 'bg-blue-500', icon: Send },
    'paid': { label: 'Paid', bgClass: 'bg-emerald-50 dark:bg-emerald-900/30', textClass: 'text-emerald-600 dark:text-emerald-400', dotClass: 'bg-emerald-500', icon: Check },
    'overdue': { label: 'Overdue', bgClass: 'bg-red-50 dark:bg-red-900/30', textClass: 'text-red-600 dark:text-red-400', dotClass: 'bg-red-500', icon: AlertCircle },
    'cancelled': { label: 'Cancelled', bgClass: 'bg-neutral-100 dark:bg-neutral-700', textClass: 'text-neutral-500 dark:text-neutral-400', dotClass: 'bg-neutral-400', icon: Trash2 },
};

type SortField = 'documentNumber' | 'date' | 'grandTotal' | 'status';
type SortOrder = 'asc' | 'desc';

export default function DocumentList({ type, title, newUrl, emptyTitle, emptyDescription }: DocumentListProps) {
    const { documents, updateDocument, deleteDocument, duplicateDocument, convertDocument } = useDocumentStore();
    const { company } = useSettingsStore();
    const currency = company.currency;

    // Filter by type
    const typedDocuments = documents.filter(d => d.type === type);

    // UI State
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [sortField, setSortField] = useState<SortField>('date');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [openStatusMenuId, setOpenStatusMenuId] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

    // Icon based on type
    const TypeIcon = type === 'invoice' ? FileText : type === 'receipt' ? Receipt : Truck;

    // Filter and sort
    const filteredDocuments = useMemo(() => {
        let result = typedDocuments.filter((doc) => {
            const query = searchQuery.toLowerCase();
            const matchesSearch =
                doc.documentNumber.toLowerCase().includes(query) ||
                doc.customerName.toLowerCase().includes(query);
            const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
            return matchesSearch && matchesStatus;
        });

        result.sort((a, b) => {
            let aVal: any = a[sortField];
            let bVal: any = b[sortField];

            if (sortField === 'date') {
                aVal = new Date(a.date).getTime();
                bVal = new Date(b.date).getTime();
            }

            const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [typedDocuments, searchQuery, statusFilter, sortField, sortOrder]);

    // Stats
    const stats = useMemo(() => {
        // Exclude cancelled documents from the total amount
        const activeDocs = typedDocuments.filter(doc => doc.status !== 'cancelled');
        const total = activeDocs.reduce((sum, doc) => sum + doc.grandTotal, 0);

        const paid = typedDocuments.filter(doc => doc.status === 'paid').reduce((sum, doc) => sum + doc.grandTotal, 0);
        const pending = typedDocuments.filter(doc => doc.status === 'sent' || doc.status === 'draft').reduce((sum, doc) => sum + doc.grandTotal, 0);
        const count = typedDocuments.length;
        return { total, paid, pending, count };
    }, [typedDocuments]);

    // Handlers
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const handleMarkAsPaid = (id: string) => {
        updateDocument(id, { status: 'paid', paidAt: new Date().toISOString() });
        setOpenMenuId(null);
    };

    const handleSend = (id: string) => {
        updateDocument(id, { status: 'sent' });
        setOpenMenuId(null);
    };

    const handleStatusChange = (id: string, newStatus: string) => {
        updateDocument(id, { status: newStatus as any });
        // If changing to paid, set paidAt
        if (newStatus === 'paid') {
            updateDocument(id, { paidAt: new Date().toISOString() });
        }
        setOpenStatusMenuId(null);
    };

    const openDeleteModal = (id: string) => {
        setDocumentToDelete(id);
        setIsDeleteModalOpen(true);
        setOpenMenuId(null);
    };

    const handleDelete = () => {
        if (documentToDelete) {
            deleteDocument(documentToDelete);
            setIsDeleteModalOpen(false);
            setDocumentToDelete(null);
        }
    };

    return (
        <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[#2d3748] dark:text-white">{title}</h1>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                        Manage your {title.toLowerCase()}
                    </p>
                </div>
                <Link href={newUrl}>
                    <Button leftIcon={<Plus className="w-4 h-4" />}>
                        New {title.slice(0, -1)}
                    </Button>
                </Link>
            </div>

            {/* Stats Cards */}
            {typedDocuments.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-4">
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Total Amount</p>
                        <p className="text-xl font-bold text-[#2d3748] dark:text-white">{formatCurrency(stats.total, currency)}</p>
                    </div>
                    {type === 'invoice' && (
                        <>
                            <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-4">
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Paid</p>
                                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.paid, currency)}</p>
                            </div>
                            <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-4">
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Pending</p>
                                <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(stats.pending, currency)}</p>
                            </div>
                        </>
                    )}
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-4">
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Total Count</p>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{stats.count}</p>
                    </div>
                </div>
            )}

            {/* Filters */}
            {typedDocuments.length > 0 && (
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <SearchInput
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="Search by number or customer..."
                        className="flex-1 max-w-md"
                    />
                    <div className="flex items-center gap-3">
                        <Select
                            options={[
                                { value: 'all', label: 'All Status' },
                                { value: 'draft', label: 'Draft' },
                                { value: 'sent', label: 'Sent' },
                                { value: 'paid', label: 'Paid' },
                                { value: 'cancelled', label: 'Cancelled' },
                            ]}
                            value={statusFilter}
                            onChange={setStatusFilter}
                            className="w-36"
                        />
                    </div>
                </div>
            )}

            {/* Document List */}
            {typedDocuments.length === 0 ? (
                <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-12">
                    <EmptyState
                        icon={<TypeIcon className="w-8 h-8 text-neutral-400" strokeWidth={1.5} />}
                        title={emptyTitle}
                        description={emptyDescription}
                        action={
                            <Link href={newUrl}>
                                <Button leftIcon={<Plus className="w-4 h-4" />}>
                                    Create {title.slice(0, -1)}
                                </Button>
                            </Link>
                        }
                    />
                </div>
            ) : filteredDocuments.length === 0 ? (
                <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-12">
                    <EmptyState
                        title="No documents found"
                        description="Try adjusting your search or filters."
                    />
                </div>
            ) : (
                <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-neutral-100 dark:border-neutral-700">
                                <th className="text-left px-6 py-4">
                                    <button
                                        onClick={() => handleSort('documentNumber')}
                                        className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                                    >
                                        ID
                                        <ArrowUpDown className="w-3 h-3" />
                                    </button>
                                </th>
                                <th className="text-left px-6 py-4">
                                    <span className="text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Customer</span>
                                </th>
                                <th className="text-left px-6 py-4 hidden md:table-cell">
                                    <button
                                        onClick={() => handleSort('date')}
                                        className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                                    >
                                        Date
                                        <ArrowUpDown className="w-3 h-3" />
                                    </button>
                                </th>
                                <th className="text-left px-6 py-4">
                                    <button
                                        onClick={() => handleSort('status')}
                                        className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                                    >
                                        Status
                                        <ArrowUpDown className="w-3 h-3" />
                                    </button>
                                </th>
                                <th className="text-right px-6 py-4">
                                    <button
                                        onClick={() => handleSort('grandTotal')}
                                        className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors ml-auto"
                                    >
                                        Amount
                                        <ArrowUpDown className="w-3 h-3" />
                                    </button>
                                </th>
                                <th className="text-right px-6 py-4">
                                    <span className="text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDocuments.map((doc) => {
                                const config = statusConfig[doc.status];
                                return (
                                    <tr key={doc.id} className="border-b border-neutral-50 dark:border-neutral-700/50 last:border-b-0 hover:bg-neutral-50/50 dark:hover:bg-neutral-700/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <Link href={`/${type}s/${doc.id}`} className="flex items-center gap-3 group">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white">
                                                    <TypeIcon className="w-5 h-5" strokeWidth={1.75} />
                                                </div>
                                                <span className="font-semibold text-[#2d3748] dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                    {doc.documentNumber}
                                                </span>
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-neutral-600 dark:text-neutral-300">{doc.customerName}</span>
                                        </td>
                                        <td className="px-6 py-4 hidden md:table-cell">
                                            <span className="text-sm text-neutral-500 dark:text-neutral-400">{formatDate(doc.date)}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="relative inline-block">
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        setOpenStatusMenuId(openStatusMenuId === doc.id ? null : doc.id);
                                                    }}
                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${config.bgClass} ${config.textClass}`}
                                                >
                                                    <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`}></span>
                                                    {config.label}
                                                </button>

                                                {openStatusMenuId === doc.id && (
                                                    <div className="absolute left-0 top-full mt-1 w-36 bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 py-1 z-50">
                                                        {Object.entries(statusConfig).map(([statusKey, status]) => (
                                                            <button
                                                                key={statusKey}
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    handleStatusChange(doc.id, statusKey);
                                                                }}
                                                                className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors ${doc.status === statusKey ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium' : 'text-neutral-600 dark:text-neutral-300'}`}
                                                            >
                                                                <span className={`w-1.5 h-1.5 rounded-full ${status.dotClass}`}></span>
                                                                {status.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-semibold text-[#2d3748] dark:text-white">{formatCurrency(doc.grandTotal, currency)}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="relative inline-block">
                                                <button
                                                    onClick={() => setOpenMenuId(openMenuId === doc.id ? null : doc.id)}
                                                    className="p-2 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                                                >
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>
                                                {openMenuId === doc.id && (
                                                    <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 py-1 z-10 z-[100]">
                                                        <Link
                                                            href={`/${type}s/${doc.id}/edit`}
                                                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                            Edit
                                                        </Link>
                                                        <Link
                                                            href={`/${type}s/${doc.id}`}
                                                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                            View Details
                                                        </Link>
                                                        <button
                                                            onClick={() => {
                                                                duplicateDocument(doc.id);
                                                                setOpenMenuId(null);
                                                            }}
                                                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                                                        >
                                                            <Copy className="w-4 h-4" />
                                                            Duplicate
                                                        </button>

                                                        {/* Conversion Options */}
                                                        {type === 'invoice' && (
                                                            <>
                                                                <button
                                                                    onClick={() => {
                                                                        convertDocument(doc.id, 'receipt');
                                                                        setOpenMenuId(null);
                                                                    }}
                                                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors whitespace-nowrap text-left"
                                                                >
                                                                    <Receipt className="w-4 h-4 flex-shrink-0" />
                                                                    Convert to Receipt
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        convertDocument(doc.id, 'delivery-note');
                                                                        setOpenMenuId(null);
                                                                    }}
                                                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors whitespace-nowrap text-left"
                                                                >
                                                                    <Truck className="w-4 h-4 flex-shrink-0" />
                                                                    Convert to Delivery Note
                                                                </button>
                                                            </>
                                                        )}

                                                        <button className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors">
                                                            <Download className="w-4 h-4" />
                                                            Download PDF
                                                        </button>
                                                        {doc.status === 'draft' && type !== 'receipt' && (
                                                            <button
                                                                onClick={() => handleSend(doc.id)}
                                                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                                                            >
                                                                <Send className="w-4 h-4" />
                                                                Mark Sent
                                                            </button>
                                                        )}
                                                        {doc.status !== 'paid' && doc.status !== 'cancelled' && type === 'invoice' && (
                                                            <button
                                                                onClick={() => handleMarkAsPaid(doc.id)}
                                                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-emerald-600 hover:bg-emerald-50 transition-colors"
                                                            >
                                                                <Check className="w-4 h-4" />
                                                                Mark as Paid
                                                            </button>
                                                        )}
                                                        <div className="h-px bg-neutral-100 dark:bg-neutral-700 my-1" />
                                                        <button
                                                            onClick={() => openDeleteModal(doc.id)}
                                                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                            Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Delete Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title={`Delete ${title.slice(0, -1)}`}
                size="sm"
            >
                <p className="text-neutral-600">
                    Are you sure you want to delete this {title.toLowerCase().slice(0, -1)}? This action cannot be undone.
                </p>
                <ModalFooter>
                    <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                    <Button variant="danger" onClick={handleDelete}>Delete</Button>
                </ModalFooter>
            </Modal>
        </div>
    );
}
