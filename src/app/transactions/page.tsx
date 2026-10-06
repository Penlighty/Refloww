"use client";

import { useState, useEffect, useMemo } from 'react';
import { 
    Search, 
    ArrowLeftRight, 
    ArrowUpDown,
    FileText, 
    Receipt, 
    Truck, 
    CheckCircle2, 
    Clock, 
    Eye,
    Trash2,
    RefreshCw,
    ChevronRight,
    CheckSquare,
    Square
} from '@/components/icons';
import { useTransactionStore, useDocumentStore, useSettingsStore, useOrganizationStore } from '@/lib/store';
import { formatDate, formatCurrency } from '@/lib/utils';
import { PageHeader, StatBand, Tag, Button, Modal, ModalFooter } from '@/components/ui';
import TransactionDetailModal from '@/components/TransactionDetailModal';
import toast from 'react-hot-toast';

export default function TransactionsPage() {
    const [mounted, setMounted] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [paymentFilter, setPaymentFilter] = useState<string>('all');
    const [fulfillmentFilter, setFulfillmentFilter] = useState<string>('all');
    const [sourceFilter, setSourceFilter] = useState<string>('all');
    const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
    const [selectedTrxIds, setSelectedTrxIds] = useState<string[]>([]);
    const [isSelectMode, setIsSelectMode] = useState<boolean>(false);
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
    const [sortField, setSortField] = useState<string>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const { 
        transactions, 
        getFilteredTransactions, 
        backfillTransactionsFromDocuments, 
        deleteTransaction 
    } = useTransactionStore();
    const { documents } = useDocumentStore();
    const activeOrgId = useOrganizationStore((state) => state.activeOrganizationId);
    const { company } = useSettingsStore();

    const activeTransactions = useMemo(() => getFilteredTransactions(), [transactions, activeOrgId, getFilteredTransactions]);
    const currency = company.currency || 'USD';

    useEffect(() => {
        setMounted(true);
    }, []);

    // Auto-backfill documents on load to guarantee 100% synchronization with document store
    useEffect(() => {
        if (mounted && documents.length > 0) {
            backfillTransactionsFromDocuments(documents);
        }
    }, [mounted, documents, backfillTransactionsFromDocuments]);

    // Filtering & Sorting logic
    const filteredTransactions = useMemo(() => {
        let result = activeTransactions.filter((trx) => {
            const query = searchQuery.toLowerCase().trim();
            const matchesSearch = !query || 
                trx.transactionNumber.toLowerCase().includes(query) ||
                trx.customerName.toLowerCase().includes(query) ||
                (trx.invoiceNumber && trx.invoiceNumber.toLowerCase().includes(query)) ||
                (trx.receiptNumbers && trx.receiptNumbers.some(r => r.toLowerCase().includes(query))) ||
                (trx.deliveryNoteNumbers && trx.deliveryNoteNumbers.some(d => d.toLowerCase().includes(query)));

            const matchesPayment = paymentFilter === 'all' || trx.paymentStatus === paymentFilter;
            const matchesFulfillment = fulfillmentFilter === 'all' || trx.fulfillmentStatus === fulfillmentFilter;
            const matchesSource = sourceFilter === 'all' || trx.source === sourceFilter;

            return matchesSearch && matchesPayment && matchesFulfillment && matchesSource;
        });

        result.sort((a, b) => {
            let aVal: any = (a as any)[sortField];
            let bVal: any = (b as any)[sortField];

            if (sortField === 'date') {
                aVal = new Date(a.date || 0).getTime();
                bVal = new Date(b.date || 0).getTime();
            }

            if (aVal === undefined) aVal = '';
            if (bVal === undefined) bVal = '';

            const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [activeTransactions, searchQuery, paymentFilter, fulfillmentFilter, sourceFilter, sortField, sortOrder]);

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
    };

    const isAllSelected = filteredTransactions.length > 0 && selectedTrxIds.length === filteredTransactions.length;

    const toggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedTrxIds([]);
        } else {
            setSelectedTrxIds(filteredTransactions.map(t => t.id));
        }
    };

    const toggleSelectRow = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedTrxIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleBulkDelete = () => {
        selectedTrxIds.forEach(id => deleteTransaction(id));
        toast.success(`Deleted ${selectedTrxIds.length} transaction(s)`);
        setSelectedTrxIds([]);
        setIsBulkDeleteModalOpen(false);
    };

    // Calculate Summary Stats based on filtered transactions
    const stats = useMemo(() => {
        const totalCount = filteredTransactions.length;
        const totalRevenue = filteredTransactions.reduce((sum, t) => sum + (t.grandTotal || 0), 0);
        const totalPaid = filteredTransactions.reduce((sum, t) => sum + (t.amountPaid || 0), 0);
        const totalUnpaid = filteredTransactions.reduce((sum, t) => sum + (t.amountDue || 0), 0);
        const fulfilledCount = filteredTransactions.filter(t => t.fulfillmentStatus === 'fulfilled').length;
        const pendingFulfillment = totalCount - fulfilledCount;

        return {
            totalCount,
            totalRevenue,
            totalPaid,
            totalUnpaid,
            fulfilledCount,
            pendingFulfillment
        };
    }, [filteredTransactions]);

    const handleDelete = (id: string, trxNum: string) => {
        if (confirm(`Are you sure you want to delete transaction ${trxNum}?`)) {
            deleteTransaction(id);
            toast.success(`Transaction ${trxNum} deleted.`);
        }
    };

    const handleManualSync = () => {
        backfillTransactionsFromDocuments(documents);
        toast.success('Synced transactions from commercial documents.');
    };

    if (!mounted) {
        return (
            <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-pulse">
                <div className="h-10 bg-paper-2 rounded-panel w-64" />
                <div className="h-24 bg-paper-2 rounded-panel" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <PageHeader
                title="Transactions"
                subtitle="Track complete commercial transaction lifecycles, payments, and delivery fulfillments."
                actions={
                    <Button
                        variant="outline"
                        leftIcon={<RefreshCw className="size-4" />}
                        onClick={handleManualSync}
                    >
                        Sync Lifecycle
                    </Button>
                }
            />

            {/* Metric Stats Cards */}
            <StatBand
                stats={[
                    {
                        label: 'Total Volume',
                        value: formatCurrency(stats.totalRevenue, currency),
                        subtext: `${stats.totalCount} Transactions`,
                    },
                    {
                        label: 'Collected Paid',
                        value: formatCurrency(stats.totalPaid, currency),
                        subtext: 'Total Payments',
                        intent: 'success',
                    },
                    {
                        label: 'Unpaid Balance',
                        value: formatCurrency(stats.totalUnpaid, currency),
                        subtext: 'Pending Invoices',
                        intent: 'warning',
                    },
                    {
                        label: 'Fulfillments',
                        value: `${stats.fulfilledCount} / ${stats.totalCount}`,
                        subtext: `${stats.pendingFulfillment} Pending Delivery`,
                    },
                ]}
            />

            {/* Filter & Toolbar */}
            <div className="panel p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
                {/* Search */}
                <div className="relative w-full md:w-80">
                    <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search transaction ID, customer, doc..."
                        className="w-full pl-9 pr-4 py-2 bg-ground border border-line rounded-ctl text-sm text-ink placeholder-ink-muted focus:outline-none focus:border-primary-500 font-sans"
                    />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                    {/* Payment Status Filter */}
                    <select
                        value={paymentFilter}
                        onChange={(e) => setPaymentFilter(e.target.value)}
                        className="px-3 py-2 bg-ground border border-line rounded-ctl text-xs font-mono text-ink focus:outline-none focus:border-primary-500"
                    >
                        <option value="all">All Payment Statuses</option>
                        <option value="paid">Paid</option>
                        <option value="partially_paid">Partially Paid</option>
                        <option value="unpaid">Unpaid</option>
                        <option value="refunded">Refunded</option>
                    </select>

                    {/* Fulfillment Filter */}
                    <select
                        value={fulfillmentFilter}
                        onChange={(e) => setFulfillmentFilter(e.target.value)}
                        className="px-3 py-2 bg-ground border border-line rounded-ctl text-xs font-mono text-ink focus:outline-none focus:border-primary-500"
                    >
                        <option value="all">All Delivery Statuses</option>
                        <option value="fulfilled">Fulfilled</option>
                        <option value="unfulfilled">Unfulfilled</option>
                    </select>

                    {/* Source Filter */}
                    <select
                        value={sourceFilter}
                        onChange={(e) => setSourceFilter(e.target.value)}
                        className="px-3 py-2 bg-ground border border-line rounded-ctl text-xs font-mono text-ink focus:outline-none focus:border-primary-500"
                    >
                        <option value="all">All Sources</option>
                        <option value="invoice">Direct Invoice</option>
                        <option value="receipt">Direct Receipt</option>
                        <option value="storefront">Online Storefront</option>
                        <option value="pos">POS Register</option>
                    </select>

                    {/* Select Mode Toolbar Controls */}
                    {!isSelectMode ? (
                        <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<CheckSquare className="size-4" />}
                            onClick={() => setIsSelectMode(true)}
                        >
                            Select
                        </Button>
                    ) : (
                        <>
                            <Button
                                variant="secondary"
                                size="sm"
                                leftIcon={isAllSelected ? <CheckSquare className="size-4 text-primary-500" /> : <Square className="size-4" />}
                                onClick={toggleSelectAll}
                            >
                                {isAllSelected ? `Deselect All (${filteredTransactions.length})` : 'Select All'}
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setIsSelectMode(false);
                                    setSelectedTrxIds([]);
                                }}
                            >
                                Done
                            </Button>

                            {selectedTrxIds.length > 0 && (
                                <Button
                                    variant="danger"
                                    size="sm"
                                    leftIcon={<Trash2 className="size-4" />}
                                    onClick={() => setIsBulkDeleteModalOpen(true)}
                                >
                                    Delete Selected ({selectedTrxIds.length})
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Transactions Data Table (Desktop & Mobile Views) */}
            <div className="panel overflow-hidden">
                {filteredTransactions.length === 0 ? (
                    <div className="p-12 text-center space-y-3">
                        <div className="size-12 rounded-panel bg-ground text-ink-muted flex items-center justify-center mx-auto border border-line">
                            <ArrowLeftRight className="size-6" />
                        </div>
                        <h3 className="text-base font-bold text-ink">No transactions found</h3>
                        <p className="text-xs text-ink-muted max-w-sm mx-auto">
                            Create an invoice, receipt, delivery note, or store sale to see your commercial transactions here.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Mobile Card List View (< 768px) */}
                        <div className="md:hidden divide-y divide-line">
                            {filteredTransactions.map((trx) => (
                                <div 
                                    key={trx.id}
                                    onClick={() => setSelectedTransactionId(trx.id)}
                                    className="p-4 flex flex-col gap-2.5 active:bg-ground transition-colors"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-sm text-ink">
                                                {trx.transactionNumber}
                                            </span>
                                            <Tag variant="neutral">{trx.source}</Tag>
                                        </div>
                                        <span className="text-base font-mono font-bold text-ink">
                                            {formatCurrency(trx.grandTotal, currency)}
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between text-xs text-ink-muted">
                                        <span className="font-medium text-ink">{trx.customerName}</span>
                                        <span className="font-mono">{formatDate(trx.date)}</span>
                                    </div>

                                    <div className="flex items-center justify-between pt-1">
                                        <div className="flex items-center gap-2">
                                            <Tag variant={
                                                trx.paymentStatus === 'paid' ? 'success' :
                                                trx.paymentStatus === 'partially_paid' ? 'warning' :
                                                trx.paymentStatus === 'refunded' ? 'neutral' : 'danger'
                                            }>
                                                {trx.paymentStatus === 'paid' ? 'Paid' : trx.paymentStatus === 'partially_paid' ? 'Partial' : trx.paymentStatus === 'refunded' ? 'Refunded' : 'Unpaid'}
                                            </Tag>
                                            
                                            <span className="text-xs text-ink-muted">
                                                {trx.fulfillmentStatus === 'fulfilled' ? 'Delivered' : 'Pending Delivery'}
                                            </span>
                                        </div>

                                        <ChevronRight className="size-4 text-ink-muted" />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table View (>= 768px) */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left whitespace-nowrap border-collapse">
                                <thead className="bg-paper-2/60 border-b border-line text-xs font-mono font-medium text-ink-muted uppercase tracking-wider">
                                    <tr>
                                        {isSelectMode && (
                                            <th className="px-4 py-3.5 w-10 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={isAllSelected}
                                                    onChange={toggleSelectAll}
                                                    className="size-4 rounded border-line text-primary-500 focus:ring-primary-500 cursor-pointer"
                                                />
                                            </th>
                                        )}
                                        <th className="px-6 py-3.5">
                                            <button
                                                onClick={() => handleSort('transactionNumber')}
                                                className="flex items-center gap-1.5 hover:text-ink transition-colors"
                                            >
                                                Transaction ID
                                                <ArrowUpDown className="size-3.5" />
                                            </button>
                                        </th>
                                        <th className="px-6 py-3.5">
                                            <button
                                                onClick={() => handleSort('customerName')}
                                                className="flex items-center gap-1.5 hover:text-ink transition-colors"
                                            >
                                                Customer
                                                <ArrowUpDown className="size-3.5" />
                                            </button>
                                        </th>
                                        <th className="px-6 py-3.5">
                                            <button
                                                onClick={() => handleSort('source')}
                                                className="flex items-center gap-1.5 hover:text-ink transition-colors"
                                            >
                                                Source
                                                <ArrowUpDown className="size-3.5" />
                                            </button>
                                        </th>
                                        <th className="px-6 py-3.5">Connected Documents</th>
                                        <th className="px-6 py-3.5">
                                            <button
                                                onClick={() => handleSort('paymentStatus')}
                                                className="flex items-center gap-1.5 hover:text-ink transition-colors"
                                            >
                                                Payment
                                                <ArrowUpDown className="size-3.5" />
                                            </button>
                                        </th>
                                        <th className="px-6 py-3.5">
                                            <button
                                                onClick={() => handleSort('fulfillmentStatus')}
                                                className="flex items-center gap-1.5 hover:text-ink transition-colors"
                                            >
                                                Delivery
                                                <ArrowUpDown className="size-3.5" />
                                            </button>
                                        </th>
                                        <th className="px-6 py-3.5 text-right">
                                            <button
                                                onClick={() => handleSort('grandTotal')}
                                                className="flex items-center gap-1.5 hover:text-ink transition-colors ml-auto"
                                            >
                                                Amount
                                                <ArrowUpDown className="size-3.5" />
                                            </button>
                                        </th>
                                        <th className="px-6 py-3.5 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-line text-sm">
                                    {filteredTransactions.map((trx) => {
                                        const isRowSelected = selectedTrxIds.includes(trx.id);
                                        return (
                                        <tr 
                                            key={trx.id}
                                            onClick={() => setSelectedTransactionId(trx.id)}
                                            className={`hover:bg-ground/50 transition-colors cursor-pointer group ${isRowSelected ? 'bg-primary-500/10' : ''}`}
                                        >
                                            {isSelectMode && (
                                                <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isRowSelected}
                                                        onChange={(e) => toggleSelectRow(trx.id, e as any)}
                                                        className="size-4 rounded border-line text-primary-500 focus:ring-primary-500 cursor-pointer"
                                                    />
                                                </td>
                                            )}
                                            {/* TRX ID & Date */}
                                            <td className="px-6 py-4">
                                                <div className="font-mono font-bold text-ink group-hover:text-primary-500 transition-colors">
                                                    {trx.transactionNumber}
                                                </div>
                                                <div className="text-xs font-mono text-ink-muted">
                                                    {formatDate(trx.date)}
                                                </div>
                                            </td>

                                            {/* Customer */}
                                            <td className="px-6 py-4 font-medium text-ink">
                                                {trx.customerName}
                                            </td>

                                            {/* Source */}
                                            <td className="px-6 py-4">
                                                <Tag variant="neutral">{trx.source}</Tag>
                                            </td>

                                            {/* Connected Documents Badges */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 flex-wrap font-mono">
                                                    {trx.invoiceNumber && (
                                                        <span className="px-2 py-0.5 rounded-ctl bg-primary-500/10 text-primary-500 text-xs font-medium flex items-center gap-1">
                                                            <FileText className="size-3.5" />
                                                            {trx.invoiceNumber}
                                                        </span>
                                                    )}
                                                    {trx.receiptNumbers?.map(r => (
                                                        <span key={r} className="px-2 py-0.5 rounded-ctl bg-emerald-500/10 text-emerald-600 text-xs font-medium flex items-center gap-1">
                                                            <Receipt className="size-3.5" />
                                                            {r}
                                                        </span>
                                                    ))}
                                                    {trx.deliveryNoteNumbers?.map(d => (
                                                        <span key={d} className="px-2 py-0.5 rounded-ctl bg-amber-500/10 text-amber-600 text-xs font-medium flex items-center gap-1">
                                                            <Truck className="size-3.5" />
                                                            {d}
                                                        </span>
                                                    ))}
                                                    {!trx.invoiceNumber && (!trx.receiptNumbers || trx.receiptNumbers.length === 0) && (!trx.deliveryNoteNumbers || trx.deliveryNoteNumbers.length === 0) && (
                                                        <span className="text-xs text-ink-muted italic font-sans">No docs linked</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Payment Status */}
                                            <td className="px-6 py-4">
                                                <Tag variant={
                                                    trx.paymentStatus === 'paid' ? 'success' :
                                                    trx.paymentStatus === 'partially_paid' ? 'warning' :
                                                    trx.paymentStatus === 'refunded' ? 'neutral' : 'danger'
                                                }>
                                                    {trx.paymentStatus === 'paid' ? 'Paid' :
                                                     trx.paymentStatus === 'partially_paid' ? 'Partial' :
                                                     trx.paymentStatus === 'refunded' ? 'Refunded' : 'Unpaid'}
                                                </Tag>
                                            </td>

                                            {/* Delivery Status */}
                                            <td className="px-6 py-4">
                                                <Tag variant={trx.fulfillmentStatus === 'fulfilled' ? 'success' : 'neutral'}>
                                                    {trx.fulfillmentStatus === 'fulfilled' ? 'Fulfilled' : 'Unfulfilled'}
                                                </Tag>
                                            </td>

                                            {/* Amount */}
                                            <td className="px-6 py-4 text-right font-mono font-bold text-ink">
                                                {formatCurrency(trx.grandTotal, currency)}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => setSelectedTransactionId(trx.id)}
                                                        className="p-1.5 rounded-ctl text-ink-muted hover:text-ink hover:bg-ground transition-colors"
                                                        title="View Details"
                                                    >
                                                        <Eye className="size-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(trx.id, trx.transactionNumber)}
                                                        className="p-1.5 rounded-ctl text-ink-muted hover:text-rose-600 hover:bg-ground transition-colors"
                                                        title="Delete Transaction"
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {/* Transaction Detail Drawer Modal */}
            <TransactionDetailModal
                transactionId={selectedTransactionId}
                onClose={() => setSelectedTransactionId(null)}
            />

            {/* Bulk Delete Modal */}
            <Modal
                isOpen={isBulkDeleteModalOpen}
                onClose={() => setIsBulkDeleteModalOpen(false)}
                title="Delete Selected Transactions"
                size="sm"
            >
                <p className="text-ink-muted text-sm">
                    Are you sure you want to delete <strong>{selectedTrxIds.length}</strong> selected transaction(s)? This action cannot be undone.
                </p>
                <ModalFooter>
                    <Button variant="ghost" onClick={() => setIsBulkDeleteModalOpen(false)}>Cancel</Button>
                    <Button variant="danger" onClick={handleBulkDelete}>Delete All Selected ({selectedTrxIds.length})</Button>
                </ModalFooter>
            </Modal>
        </div>
    );
}

