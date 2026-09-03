"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useDocumentStore, useCustomerStore, useSettingsStore, useTemplateStore, useOrganizationStore, useTransactionStore } from '@/lib/store';
import { formatCurrency, formatDate, sumEffectiveGrandTotals, downloadPdf, shareDocument, formatAmountInWords } from '@/lib/utils';
import { Button, EmptyState, SearchInput, Select, Modal, ModalFooter, PageHelpModal } from '@/components/ui';
import { DocumentType, Document } from '@/lib/types';
import { toast } from 'react-hot-toast';
import DocumentRenderer from '@/components/DocumentRenderer';
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
    Share2,
    Hash,
    CheckSquare,
    Square
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
    'partially_paid': { label: 'Partial', bgClass: 'bg-amber-50 dark:bg-amber-900/30', textClass: 'text-amber-600 dark:text-amber-400', dotClass: 'bg-amber-500', icon: Clock },
    'overdue': { label: 'Overdue', bgClass: 'bg-red-50 dark:bg-red-900/30', textClass: 'text-red-600 dark:text-red-400', dotClass: 'bg-red-500', icon: AlertCircle },
    'cancelled': { label: 'Cancelled', bgClass: 'bg-neutral-100 dark:bg-neutral-700', textClass: 'text-neutral-500 dark:text-neutral-400', dotClass: 'bg-neutral-400', icon: Trash2 },
};

type SortField = 'documentNumber' | 'transactionNumber' | 'customerName' | 'date' | 'status' | 'grandTotal';
type SortOrder = 'asc' | 'desc';

export default function DocumentList({ type, title, newUrl, emptyTitle, emptyDescription }: DocumentListProps) {
    const { documents, getFilteredDocuments, updateDocument, deleteDocument, duplicateDocument } = useDocumentStore();
    const { transactions } = useTransactionStore();
    const activeOrgId = useOrganizationStore((state) => state.activeOrganizationId);
    const displayDocuments = useMemo(() => getFilteredDocuments(), [documents, activeOrgId, getFilteredDocuments]);
    const { company } = useSettingsStore();
    const { getTemplateById } = useTemplateStore();
    const { getCustomerById } = useCustomerStore();
    const currency = company.currency;

    // Helper lookup for transaction number corresponding to a document
    const getTrxForDoc = (doc: Document) => {
        return transactions.find(t =>
            (doc.type === 'invoice' && (t.invoiceId === doc.id || t.invoiceNumber === doc.documentNumber)) ||
            (doc.type === 'receipt' && (t.receiptIds?.includes(doc.id) || t.receiptNumbers?.includes(doc.documentNumber))) ||
            (doc.type === 'delivery-note' && (t.deliveryNoteIds?.includes(doc.id) || t.deliveryNoteNumbers?.includes(doc.documentNumber))) ||
            (doc.sourceDocumentId && (t.invoiceId === doc.sourceDocumentId || t.invoiceNumber === doc.sourceDocumentId))
        );
    };

    // Filter by type & active organization
    const typedDocuments = useMemo(() => displayDocuments.filter(d => d.type === type), [displayDocuments, type]);

    // UI State
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [sortField, setSortField] = useState<SortField>('date');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [openStatusMenuId, setOpenStatusMenuId] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
    const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
    const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
    const [isSelectMode, setIsSelectMode] = useState<boolean>(false);
    const [activePdfDoc, setActivePdfDoc] = useState<any | null>(null);

    // PDF and Share helpers for document list items
    const getTemplateForDoc = (targetDoc: any) => {
        const rawT = getTemplateById(targetDoc.templateId);
        const docType = targetDoc.type as DocumentType;
        return (rawT && rawT.mode === 'connected' && rawT.variants?.[docType])
            ? {
                ...rawT,
                imageUrl: rawT.variants[docType]!.imageUrl,
                fields: rawT.variants[docType]!.fields,
                width: rawT.variants[docType]!.width,
                height: rawT.variants[docType]!.height,
                orientation: rawT.variants[docType]!.orientation
            }
            : rawT;
    };

    const getPreviewDataForDoc = (targetDoc: any) => {
        const docCustomer = getCustomerById(targetDoc.customerId);
        const docTemplate = getTemplateById(targetDoc.templateId);
        const hasLineItems = docTemplate?.fields?.some(f => f.type === 'line-items') ?? (targetDoc.lineItems && targetDoc.lineItems.length > 0);
        const hasDiscount = docTemplate?.fields?.some(f => f.type === 'discount') ?? true;
        const hasTax = docTemplate?.fields?.some(f => f.type === 'tax') ?? true;

        const subtotal = hasLineItems
            ? targetDoc.lineItems.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0)
            : targetDoc.subtotal;

        const discountAmount = hasDiscount ? subtotal * (targetDoc.discountPercent / 100) : 0;
        const taxableAmount = subtotal - discountAmount;
        const taxAmount = hasTax ? taxableAmount * (targetDoc.taxPercent / 100) : 0;
        const grandTotal = subtotal - discountAmount + taxAmount;

        return {
            documentNumber: targetDoc.documentNumber,
            date: targetDoc.date,
            dueDate: targetDoc.dueDate,
            customerName: targetDoc.customerName,
            customerEmail: docCustomer?.email,
            customerPhone: docCustomer?.phone,
            customerAddress: docCustomer?.address,
            lineItems: targetDoc.lineItems,
            subtotal,
            discountAmount,
            discountName: targetDoc.discountName,
            taxAmount,
            grandTotal,
            notes: targetDoc.notes,
            customValues: targetDoc.customValues,
            amountInWords: formatAmountInWords(grandTotal, company.currency),
            amountPaid: targetDoc.amountPaid,
            amountDue: targetDoc.amountDue ?? (grandTotal - (targetDoc.amountPaid || 0)),
        };
    };

    const handleDownloadPdf = async (targetDoc: any) => {
        setOpenMenuId(null);
        setActivePdfDoc(targetDoc);
        setTimeout(async () => {
            await downloadPdf(`document-list-preview-${targetDoc.id}`, targetDoc.documentNumber);
            setActivePdfDoc(null);
        }, 250);
    };

    const handleShareDoc = async (targetDoc: any) => {
        setOpenMenuId(null);
        setActivePdfDoc(targetDoc);
        setTimeout(async () => {
            await shareDocument(`document-list-preview-${targetDoc.id}`, targetDoc.documentNumber, title.slice(0, -1));
            setActivePdfDoc(null);
        }, 250);
    };

    // Icon based on type
    const TypeIcon = type === 'invoice' ? FileText : type === 'receipt' ? Receipt : Truck;

    // Filter and sort
    const filteredDocuments = useMemo(() => {
        let result = typedDocuments.filter((doc) => {
            const query = searchQuery.toLowerCase();
            const docNumber = doc.documentNumber || '';
            const customerName = doc.customerName || '';
            const linkedTrx = getTrxForDoc(doc);
            const trxNum = linkedTrx?.transactionNumber || '';
            const matchesSearch =
                docNumber.toLowerCase().includes(query) ||
                customerName.toLowerCase().includes(query) ||
                trxNum.toLowerCase().includes(query);
            const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
            return matchesSearch && matchesStatus;
        });

        result.sort((a, b) => {
            let aVal: any = a[sortField as keyof Document];
            let bVal: any = b[sortField as keyof Document];

            if (sortField === 'transactionNumber') {
                aVal = getTrxForDoc(a)?.transactionNumber || '';
                bVal = getTrxForDoc(b)?.transactionNumber || '';
            } else if (sortField === 'customerName') {
                aVal = (a.customerName || '').toLowerCase();
                bVal = (b.customerName || '').toLowerCase();
            } else if (sortField === 'date') {
                aVal = new Date(a.date || 0).getTime();
                bVal = new Date(b.date || 0).getTime();
            }

            if (aVal === undefined) aVal = '';
            if (bVal === undefined) bVal = '';

            const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [typedDocuments, searchQuery, statusFilter, sortField, sortOrder, transactions]);

    // Multi-select handlers
    const isAllSelected = filteredDocuments.length > 0 && selectedDocIds.length === filteredDocuments.length;

    const toggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedDocIds([]);
        } else {
            setSelectedDocIds(filteredDocuments.map(d => d.id));
        }
    };

    const toggleSelectRow = (id: string) => {
        setSelectedDocIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleBulkDelete = () => {
        selectedDocIds.forEach(id => deleteDocument(id));
        toast.success(`Deleted ${selectedDocIds.length} ${title.toLowerCase()}`);
        setSelectedDocIds([]);
        setIsBulkDeleteModalOpen(false);
    };

    // Stats
    const stats = useMemo(() => {
        const activeDocs = typedDocuments.filter(doc => doc.status !== 'cancelled');
        const total = sumEffectiveGrandTotals(activeDocs, getTemplateById);
        const paidDocs = typedDocuments.filter(doc => doc.status === 'paid');
        const paid = sumEffectiveGrandTotals(paidDocs, getTemplateById);
        const pendingDocs = typedDocuments.filter(doc => doc.status === 'sent' || doc.status === 'draft');
        const pending = sumEffectiveGrandTotals(pendingDocs, getTemplateById);
        const count = typedDocuments.length;
        return { total, paid, pending, count };
    }, [typedDocuments, getTemplateById]);

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
        const doc = documents.find(d => d.id === id);
        updateDocument(id, { status: 'paid', paidAt: new Date().toISOString() });
        setOpenMenuId(null);
        toast.success(`${doc?.documentNumber || title.slice(0, -1)} marked as paid`);
    };

    const handleSend = (id: string) => {
        const doc = documents.find(d => d.id === id);
        updateDocument(id, { status: 'sent' });
        setOpenMenuId(null);
        toast.success(`${doc?.documentNumber || title.slice(0, -1)} marked as sent`);
    };

    const handleStatusChange = (id: string, newStatus: string) => {
        const doc = documents.find(d => d.id === id);
        updateDocument(id, { status: newStatus as any });
        if (newStatus === 'paid') {
            updateDocument(id, { paidAt: new Date().toISOString() });
        }
        setOpenStatusMenuId(null);
        toast.success(`Status changed to ${statusConfig[newStatus as keyof typeof statusConfig]?.label || newStatus}`);
    };

    const openDeleteModal = (id: string) => {
        setDocumentToDelete(id);
        setIsDeleteModalOpen(true);
        setOpenMenuId(null);
    };

    const handleDelete = () => {
        if (documentToDelete) {
            const doc = documents.find(d => d.id === documentToDelete);
            deleteDocument(documentToDelete);
            setIsDeleteModalOpen(false);
            setDocumentToDelete(null);
            toast.success(`${doc?.documentNumber || title.slice(0, -1)} deleted`);
        }
    };

    return (
        <div className="w-full">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold text-[#2d3748] dark:text-white">{title}</h1>
                        <PageHelpModal
                            title={`${title} Overview`}
                            description={`Create, manage, track status, download PDFs, and share ${title.toLowerCase()} with your clients.`}
                            terms={[
                                { term: 'Draft', definition: 'Saved document not yet sent or finalized.' },
                                { term: 'Sent', definition: 'Document sent to customer, awaiting payment or delivery confirmation.' },
                                { term: 'Paid', definition: 'Transaction complete and full payment received.' },
                                { term: 'Overdue', definition: 'Payment due date has passed without recorded payment.' }
                            ]}
                            tips={[
                                "Click the 3-dots actions menu on any row to download PDF, share via WhatsApp, or duplicate the document."
                            ]}
                        />
                    </div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                        Manage your {title.toLowerCase()}
                    </p>
                </div>
                <Link href={newUrl}>
                    <Button leftIcon={<Plus className="w-4 h-4" />} iconOnlyMobile>
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

            {/* Filters & Selection Toolbar */}
            {typedDocuments.length > 0 && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
                    <div className="flex flex-1 items-center gap-3 max-w-md">
                        <SearchInput
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="Search by doc number, TRX ID or customer..."
                            className="w-full"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Select
                            options={
                                type === 'invoice'
                                    ? [
                                        { value: 'all', label: 'All Status' },
                                        { value: 'draft', label: 'Draft' },
                                        { value: 'sent', label: 'Sent' },
                                        { value: 'paid', label: 'Paid' },
                                        { value: 'overdue', label: 'Overdue' },
                                        { value: 'cancelled', label: 'Cancelled' },
                                    ]
                                    : [
                                        { value: 'all', label: 'All Status' },
                                        { value: 'draft', label: 'Draft' },
                                        { value: 'sent', label: 'Sent' },
                                        { value: 'cancelled', label: 'Cancelled' },
                                    ]
                            }
                            value={statusFilter}
                            onChange={setStatusFilter}
                            className="w-36"
                        />

                        {/* Select Mode Toolbar Controls */}
                        {!isSelectMode ? (
                            <Button
                                variant="outline"
                                size="md"
                                leftIcon={<CheckSquare className="w-4 h-4 text-neutral-500" />}
                                iconOnlyMobile
                                onClick={() => setIsSelectMode(true)}
                            >
                                Select
                            </Button>
                        ) : (
                            <>
                                <Button
                                    variant="secondary"
                                    size="md"
                                    leftIcon={isAllSelected ? <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" /> : <Square className="w-4 h-4" />}
                                    iconOnlyMobile
                                    onClick={toggleSelectAll}
                                >
                                    {isAllSelected ? `Deselect All (${filteredDocuments.length})` : 'Select All'}
                                </Button>

                                <Button
                                    variant="ghost"
                                    size="md"
                                    onClick={() => {
                                        setIsSelectMode(false);
                                        setSelectedDocIds([]);
                                    }}
                                >
                                    Done
                                </Button>

                                {selectedDocIds.length > 0 && (
                                    <Button
                                        variant="danger"
                                        size="md"
                                        leftIcon={<Trash2 className="w-4 h-4" />}
                                        iconOnlyMobile
                                        onClick={() => setIsBulkDeleteModalOpen(true)}
                                    >
                                        Delete ({selectedDocIds.length})
                                    </Button>
                                )}
                            </>
                        )}
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
                <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl pb-16">
                    <div className="overflow-x-auto min-h-[300px]">
                        <table className="w-full min-w-[700px] md:min-w-full">
                        <thead>
                            <tr className="border-b border-neutral-100 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50">
                                {isSelectMode && (
                                    <th className="px-4 py-4 w-10 text-center">
                                        <input
                                            type="checkbox"
                                            checked={isAllSelected}
                                            onChange={toggleSelectAll}
                                            className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        />
                                    </th>
                                )}
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
                                    <button
                                        onClick={() => handleSort('transactionNumber')}
                                        className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                                    >
                                        Transaction ID
                                        <ArrowUpDown className="w-3 h-3" />
                                    </button>
                                </th>
                                <th className="text-left px-6 py-4">
                                    <button
                                        onClick={() => handleSort('customerName')}
                                        className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                                    >
                                        Customer
                                        <ArrowUpDown className="w-3 h-3" />
                                    </button>
                                </th>
                                <th className="text-left px-6 py-4">
                                    <span className="text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Links</span>
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
                            {filteredDocuments.map((doc, index) => {
                                const config = statusConfig[doc.status] || statusConfig['draft'];
                                const isLocked = (doc as any)._isLocked === true;
                                const isNearBottom = index >= Math.max(0, filteredDocuments.length - 2) || filteredDocuments.length <= 2;
                                const popupPosClass = isNearBottom ? 'bottom-full mb-1' : 'top-full mt-1';
                                const linkedTrx = getTrxForDoc(doc);
                                const isMenuOpen = openMenuId === doc.id || openStatusMenuId === doc.id;
                                const isRowSelected = selectedDocIds.includes(doc.id);

                                return (
                                    <tr key={doc.id} className={`border-b border-neutral-50 dark:border-neutral-700/50 last:border-b-0 hover:bg-neutral-50/50 dark:hover:bg-neutral-700/30 transition-colors ${isRowSelected ? 'bg-blue-50/40 dark:bg-blue-900/20' : ''} ${isMenuOpen ? 'relative z-30 bg-neutral-50/80 dark:bg-neutral-700/50' : ''}`}>
                                        {isSelectMode && (
                                            <td className="px-4 py-4 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={isRowSelected}
                                                    onChange={() => toggleSelectRow(doc.id)}
                                                    className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                />
                                            </td>
                                        )}
                                        <td className="px-6 py-4">
                                            <Link href={`/${type}s/${doc.id}`} className="flex items-center gap-3 group">
                                                <div className={`w-10 h-10 rounded-xl ${isLocked ? 'bg-gradient-to-br from-amber-400 to-amber-600' : 'bg-gradient-to-br from-blue-400 to-blue-600'} flex items-center justify-center text-white flex-shrink-0`}>
                                                    <TypeIcon className="w-5 h-5" strokeWidth={1.75} />
                                                </div>
                                                <span className="font-semibold text-[#2d3748] dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                    {doc.documentNumber || (isLocked ? '🔒 Encrypted' : 'Untitled')}
                                                </span>
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4">
                                            {linkedTrx ? (
                                                <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-[#2d3748] dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-700/60 px-2.5 py-1 rounded-lg border border-neutral-200/60 dark:border-neutral-600/50">
                                                    {linkedTrx.transactionNumber}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-neutral-400 dark:text-neutral-500 font-mono">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-neutral-600 dark:text-neutral-300">
                                                {doc.customerName || (isLocked ? '🔒 Unlock to view' : '-')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {/* Linked Document Indicators */}
                                            {(() => {
                                                // Always include self
                                                const linkedTypes = new Set<string>([doc.type]);

                                                if (doc.type === 'invoice') {
                                                    documents.forEach(d => {
                                                        if (d.sourceDocumentId === doc.id) linkedTypes.add(d.type);
                                                    });
                                                } else if (doc.sourceDocumentId) {
                                                    const parent = documents.find(d => d.id === doc.sourceDocumentId);
                                                    if (parent) linkedTypes.add(parent.type);
                                                    documents.forEach(d => {
                                                        if (d.sourceDocumentId === doc.sourceDocumentId && d.id !== doc.id) linkedTypes.add(d.type);
                                                    });
                                                }

                                                return (
                                                    <div className="flex items-center gap-1.5">
                                                        {linkedTypes.has('invoice') && (
                                                            <div title="Invoice" className={`p-1 rounded-md ${doc.type === 'invoice' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/20' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500'}`}>
                                                                <FileText className="w-3.5 h-3.5" />
                                                            </div>
                                                        )}
                                                        {linkedTypes.has('receipt') && (
                                                            <div title="Receipt" className={`p-1 rounded-md ${doc.type === 'receipt' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500'}`}>
                                                                <Receipt className="w-3.5 h-3.5" />
                                                            </div>
                                                        )}
                                                        {linkedTypes.has('delivery-note') && (
                                                            <div title="Delivery Note" className={`p-1 rounded-md ${doc.type === 'delivery-note' ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 ring-1 ring-orange-500/20' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500'}`}>
                                                                <Truck className="w-3.5 h-3.5" />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}
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
                                                    <div className={`absolute left-0 ${popupPosClass} w-36 bg-white dark:bg-neutral-800 rounded-lg shadow-2xl border border-neutral-200 dark:border-neutral-700 py-1 z-[100]`}>
                                                        {Object.entries(statusConfig)
                                                            .filter(([statusKey]) => {
                                                                // Filter statuses based on document type
                                                                if (type === 'receipt' || type === 'delivery-note') {
                                                                    // Receipts and Delivery Notes don't have Paid or Overdue
                                                                    return !['paid', 'overdue'].includes(statusKey);
                                                                }
                                                                return true; // Invoices get all statuses
                                                            })
                                                            .map(([statusKey, status]) => (
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
                                            <span className="font-semibold text-[#2d3748] dark:text-white">
                                                {doc.grandTotal !== undefined
                                                    ? formatCurrency(doc.grandTotal, currency)
                                                    : (isLocked ? '🔒 Locked' : '-')}
                                            </span>
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
                                                    <div className={`absolute right-0 ${popupPosClass} w-64 bg-white dark:bg-neutral-800 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 py-1.5 z-[100]`}>
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
                                                                toast.success(`${doc.documentNumber || title.slice(0, -1)} duplicated`);
                                                            }}
                                                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                                                        >
                                                            <Copy className="w-4 h-4" />
                                                            Duplicate
                                                        </button>

                                                        {/* Conversion Options */}
                                                        {type === 'invoice' && (
                                                            <>
                                                                <Link
                                                                    href={`/receipts/new?sourceId=${doc.id}&fromType=invoice`}
                                                                    onClick={() => setOpenMenuId(null)}
                                                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors whitespace-nowrap text-left"
                                                                >
                                                                    <Receipt className="w-4 h-4 flex-shrink-0" />
                                                                    Create Receipt
                                                                </Link>
                                                                <Link
                                                                    href={`/delivery-notes/new?sourceId=${doc.id}&fromType=invoice`}
                                                                    onClick={() => setOpenMenuId(null)}
                                                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors whitespace-nowrap text-left"
                                                                >
                                                                    <Truck className="w-4 h-4 flex-shrink-0" />
                                                                    Create Delivery Note
                                                                </Link>
                                                            </>
                                                        )}

                                                        <button
                                                            onClick={() => handleDownloadPdf(doc)}
                                                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                            Download PDF
                                                        </button>

                                                        <button
                                                            onClick={() => handleShareDoc(doc)}
                                                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-blue-600 dark:text-blue-400 font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                                        >
                                                            <Share2 className="w-4 h-4" />
                                                            Share
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
            </div>
            )}

            {/* Offscreen element for generating PDF / Native Share from document list */}
            {activePdfDoc && (
                <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', pointerEvents: 'none' }}>
                    <div id={`document-list-preview-${activePdfDoc.id}`} style={{ width: '595px', height: '842px', background: '#ffffff' }}>
                        {getTemplateForDoc(activePdfDoc) && (
                            <DocumentRenderer
                                template={getTemplateForDoc(activePdfDoc)!}
                                data={getPreviewDataForDoc(activePdfDoc)}
                            />
                        )}
                    </div>
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

            {/* Bulk Delete Modal */}
            <Modal
                isOpen={isBulkDeleteModalOpen}
                onClose={() => setIsBulkDeleteModalOpen(false)}
                title={`Delete Selected ${title}`}
                size="sm"
            >
                <p className="text-neutral-600">
                    Are you sure you want to delete <strong>{selectedDocIds.length}</strong> selected {title.toLowerCase()}? This action cannot be undone.
                </p>
                <ModalFooter>
                    <Button variant="ghost" onClick={() => setIsBulkDeleteModalOpen(false)}>Cancel</Button>
                    <Button variant="danger" onClick={handleBulkDelete}>Delete All Selected ({selectedDocIds.length})</Button>
                </ModalFooter>
            </Modal>
        </div>
    );
}
