"use client";

import { useState, useMemo, useEffect } from 'react';
import { useDocumentStore, useSettingsStore, useTemplateStore, useOrganizationStore, useTransactionStore } from '@/lib/store';
import { DocumentType, DocumentStatus } from '@/lib/types';
import LedgerTable from '@/components/ledger/LedgerTable';
import LedgerFilters from '@/components/ledger/LedgerFilters';
import ExportButtons from '@/components/ledger/ExportButtons';
import { DateRangePicker, Button, Modal, ModalFooter } from '@/components/ui';
import { Wallet, CheckSquare, Square, Trash2 } from 'lucide-react';
import { formatCurrency, getEffectiveGrandTotal, sumEffectiveGrandTotals } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

type SortField = 'date' | 'type' | 'documentNumber' | 'status' | 'grandTotal';
type SortOrder = 'asc' | 'desc';

export default function LedgerPage() {
    const { documents, getFilteredDocuments, deleteDocument } = useDocumentStore();
    const { transactions, getFilteredTransactions, backfillTransactionsFromDocuments } = useTransactionStore();
    const activeOrgId = useOrganizationStore((state) => state.activeOrganizationId);
    const displayDocuments = useMemo(() => getFilteredDocuments(), [documents, activeOrgId, getFilteredDocuments]);
    const activeTransactions = useMemo(() => getFilteredTransactions(), [transactions, activeOrgId, getFilteredTransactions]);
    const { company } = useSettingsStore();
    const { getTemplateById } = useTemplateStore();
    const currency = company.currency;

    // Ensure transactions are synced from documents
    useEffect(() => {
        if (displayDocuments.length > 0) {
            backfillTransactionsFromDocuments(displayDocuments);
        }
    }, [displayDocuments, backfillTransactionsFromDocuments]);

    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>('all');
    const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all');
    const [startDate, setStartDate] = useState<string | null>(null);
    const [endDate, setEndDate] = useState<string | null>(null);
    const [sortField, setSortField] = useState<SortField>('date');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    // Selection state
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Filter and sort
    const filteredDocuments = useMemo(() => {
        let result = displayDocuments.filter((doc) => {
            const query = searchQuery.toLowerCase();
            // Handle potentially undefined fields (encrypted documents may have partial data)
            const docNumber = doc.documentNumber || '';
            const customerName = doc.customerName || '';
            const matchesSearch =
                docNumber.toLowerCase().includes(query) ||
                customerName.toLowerCase().includes(query);
            const matchesType = typeFilter === 'all' || doc.type === typeFilter;
            const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;

            // Date range filter
            const docDate = (doc.date || '').split('T')[0];
            const matchesStartDate = !startDate || docDate >= startDate;
            const matchesEndDate = !endDate || docDate <= endDate;

            return matchesSearch && matchesType && matchesStatus && matchesStartDate && matchesEndDate;
        });

        result.sort((a, b) => {
            let aVal: any = a[sortField];
            let bVal: any = b[sortField];

            // Handle undefined values for encrypted documents
            if (aVal === undefined) aVal = '';
            if (bVal === undefined) bVal = '';

            if (sortField === 'date') {
                aVal = new Date(a.date || 0).getTime();
                bVal = new Date(b.date || 0).getTime();
            }

            const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [documents, searchQuery, typeFilter, statusFilter, startDate, endDate, sortField, sortOrder]);

    const isAllSelected = filteredDocuments.length > 0 && selectedDocIds.length === filteredDocuments.length;

    const toggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedDocIds([]);
        } else {
            setSelectedDocIds(filteredDocuments.map((d) => d.id));
        }
    };

    const toggleSelectRow = (id: string) => {
        setSelectedDocIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const handleBulkDelete = () => {
        selectedDocIds.forEach((id) => deleteDocument(id));
        toast.success(`Deleted ${selectedDocIds.length} transactions`);
        setSelectedDocIds([]);
        setIsSelectMode(false);
        setIsDeleteModalOpen(false);
    };

    // Stats calculated directly from filteredDocuments so table rows & cards match 100%
    const stats = useMemo(() => {
        const activeDocs = filteredDocuments.filter(d => d.status !== 'cancelled');
        const docIdSet = new Set(activeDocs.map(d => d.id));
        const docNumberSet = new Set(activeDocs.map(d => d.documentNumber).filter(Boolean));

        let realizedRevenue = 0;
        let totalFilteredAmount = 0;

        activeDocs.forEach(doc => {
            const effectiveTotal = getEffectiveGrandTotal(doc, getTemplateById(doc.templateId));
            const hasParentInFilter = doc.sourceDocumentId && (docIdSet.has(doc.sourceDocumentId) || docNumberSet.has(doc.sourceDocumentId));

            if (doc.type === 'invoice') {
                const paid = doc.amountPaid ?? (doc.status === 'paid' ? effectiveTotal : 0);
                realizedRevenue += paid;
                totalFilteredAmount += effectiveTotal;
            } else if (doc.type === 'receipt') {
                const paidVal = doc.amountPaid ?? effectiveTotal;
                if (!hasParentInFilter) {
                    realizedRevenue += paidVal;
                    totalFilteredAmount += effectiveTotal;
                }
            } else if (doc.type === 'delivery-note') {
                // Delivery notes are goods fulfillment records and do not generate cash revenue.
                // Only include in filtered volume if standalone (no parent invoice in filter).
                if (!hasParentInFilter) {
                    totalFilteredAmount += effectiveTotal;
                }
            } else {
                if (doc.status === 'paid') realizedRevenue += effectiveTotal;
                totalFilteredAmount += effectiveTotal;
            }
        });

        const count = filteredDocuments.length;
        return { realizedRevenue, totalFilteredAmount, count };
    }, [filteredDocuments, getTemplateById]);

    // Handlers
    const handleSort = (field: string) => {
        const f = field as SortField;
        if (sortField === f) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(f);
            setSortOrder('desc');
        }
    };

    const handleExportExcel = () => {
        const data = filteredDocuments.map(doc => ({
            Date: doc.date ? new Date(doc.date).toLocaleDateString() : '-',
            Type: (doc.type || '').toUpperCase(),
            Reference: doc.documentNumber || '(encrypted)',
            Customer: doc.customerName || '(encrypted)',
            Status: (doc.status || '').toUpperCase(),
            Amount: getEffectiveGrandTotal(doc, getTemplateById(doc.templateId)),
            Notes: doc.notes || ''
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Ledger");
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `Refloww_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleExportCSV = () => {
        const headers = ['Date', 'Type', 'Reference', 'Customer', 'Status', 'Amount', 'Notes'];
        const rows = filteredDocuments.map(doc => [
            doc.date ? new Date(doc.date).toLocaleDateString() : '-',
            (doc.type || '').toUpperCase(),
            doc.documentNumber || '(encrypted)',
            doc.customerName || '(encrypted)',
            (doc.status || '').toUpperCase(),
            getEffectiveGrandTotal(doc, getTemplateById(doc.templateId)).toFixed(2),
            doc.notes || ''
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        saveAs(blob, `Refloww_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    };

    return (
        <div className="w-full space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#2d3748] dark:text-white flex items-center gap-3">
                        <Wallet className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        General Ledger
                    </h1>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                        A centralized view of all your business transactions.
                    </p>
                </div>
                <ExportButtons
                    onExportExcel={handleExportExcel}
                    onExportCSV={handleExportCSV}
                />
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 p-4 rounded-2xl">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium uppercase tracking-wider mb-1">Total Volume</p>
                    <p className="text-2xl font-bold text-[#2d3748] dark:text-white">{stats.count}</p>
                </div>
                <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 p-4 rounded-2xl">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium uppercase tracking-wider mb-1">Realized Revenue (Paid)</p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.realizedRevenue, currency)}</p>
                </div>
                <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 p-4 rounded-2xl">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium uppercase tracking-wider mb-1">Total Amount (Filtered)</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(stats.totalFilteredAmount, currency)}</p>
                </div>
            </div>

            {/* Filters & Selection Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    <LedgerFilters
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        typeFilter={typeFilter}
                        onTypeFilterChange={setTypeFilter}
                        statusFilter={statusFilter}
                        onStatusFilterChange={setStatusFilter}
                    />
                    <DateRangePicker
                        startDate={startDate}
                        endDate={endDate}
                        onStartDateChange={setStartDate}
                        onEndDateChange={setEndDate}
                    />
                </div>

                {filteredDocuments.length > 0 && (
                    <div className="flex items-center gap-2">
                        {!isSelectMode ? (
                            <Button
                                variant="outline"
                                size="md"
                                leftIcon={<CheckSquare className="w-4 h-4 text-neutral-500" />}
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
                                        onClick={() => setIsDeleteModalOpen(true)}
                                    >
                                        Delete Selected ({selectedDocIds.length})
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Table */}
            <LedgerTable
                documents={filteredDocuments}
                sortField={sortField}
                sortOrder={sortOrder}
                onSort={handleSort as any}
                isSelectMode={isSelectMode}
                selectedDocIds={selectedDocIds}
                onToggleSelectDoc={toggleSelectRow}
                onToggleSelectAll={toggleSelectAll}
                isAllSelected={isAllSelected}
            />

            {/* Delete Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Transactions"
                size="sm"
            >
                <div className="space-y-4">
                    <p className="text-neutral-600 dark:text-neutral-300">
                        Are you sure you want to delete <strong className="text-red-600">{selectedDocIds.length}</strong> selected transaction(s)?
                    </p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">
                        Warning: This will delete the underlying documents (Invoices, Receipts, or Delivery Notes) and their associated records. This action cannot be undone.
                    </p>
                </div>
                <ModalFooter>
                    <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                    <Button variant="danger" onClick={handleBulkDelete}>Delete Selected</Button>
                </ModalFooter>
            </Modal>
        </div>
    );
}
