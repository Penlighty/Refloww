"use client";

import { useState, useEffect, useMemo } from 'react';
import { 
    Search, 
    Filter, 
    ArrowLeftRight, 
    ArrowUpDown,
    FileText, 
    Receipt, 
    Truck, 
    DollarSign, 
    CheckCircle2, 
    Clock, 
    AlertCircle,
    Eye,
    Trash2,
    RefreshCw,
    Plus,
    ChevronRight,
    CheckSquare,
    Square,
    ShoppingBag,
    Zap
} from 'lucide-react';
import { useTransactionStore, useDocumentStore, useSettingsStore, useOrganizationStore } from '@/lib/store';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Transaction, PaymentStatus, FulfillmentStatus, TransactionSource } from '@/lib/types';
import { Button, Modal, ModalFooter } from '@/components/ui';
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
            <div className="p-8 max-w-7xl mx-auto space-y-8 animate-pulse">
                <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded-lg w-48" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-28 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-[#2d3748] dark:text-white tracking-tight">
                        Transactions
                    </h1>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                        Track complete commercial transaction lifecycles, payments, and delivery fulfillments.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleManualSync}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 transition-colors shadow-sm"
                    >
                        <RefreshCw className="w-4 h-4 text-neutral-500" />
                        Sync Lifecycle
                    </button>
                </div>
            </div>

            {/* Metric Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-neutral-800 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-700 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                        <ArrowLeftRight className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Total Volume</p>
                        <h3 className="text-xl font-bold text-[#2d3748] dark:text-white mt-0.5">
                            {formatCurrency(stats.totalRevenue, currency)}
                        </h3>
                        <p className="text-xs text-neutral-400">{stats.totalCount} Transactions</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-neutral-800 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-700 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Collected Paid</p>
                        <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                            {formatCurrency(stats.totalPaid, currency)}
                        </h3>
                        <p className="text-xs text-neutral-400">Total Payments</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-neutral-800 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-700 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Unpaid Balance</p>
                        <h3 className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                            {formatCurrency(stats.totalUnpaid, currency)}
                        </h3>
                        <p className="text-xs text-neutral-400">Pending Invoices</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-neutral-800 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-700 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
                        <Truck className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Fulfillments</p>
                        <h3 className="text-xl font-bold text-[#2d3748] dark:text-white mt-0.5">
                            {stats.fulfilledCount} / {stats.totalCount}
                        </h3>
                        <p className="text-xs text-neutral-400">{stats.pendingFulfillment} Pending Delivery</p>
                    </div>
                </div>
            </div>

            {/* Filter & Toolbar */}
            <div className="bg-white dark:bg-neutral-800 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-700 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
                {/* Search */}
                <div className="relative w-full md:w-80">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search transaction ID, customer, doc..."
                        className="w-full pl-10 pr-4 py-2 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-[#2d3748] dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                    {/* Payment Status Filter */}
                    <select
                        value={paymentFilter}
                        onChange={(e) => setPaymentFilter(e.target.value)}
                        className="px-3 py-2 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="px-3 py-2 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All Delivery Statuses</option>
                        <option value="fulfilled">Fulfilled</option>
                        <option value="unfulfilled">Unfulfilled</option>
                    </select>

                    {/* Source Filter */}
                    <select
                        value={sourceFilter}
                        onChange={(e) => setSourceFilter(e.target.value)}
                        className="px-3 py-2 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                leftIcon={isAllSelected ? <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" /> : <Square className="w-4 h-4" />}
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
                                    leftIcon={<Trash2 className="w-4 h-4" />}
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
            <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 shadow-sm overflow-hidden">
                {filteredTransactions.length === 0 ? (
                    <div className="p-12 text-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-700/50 text-neutral-400 flex items-center justify-center mx-auto">
                            <ArrowLeftRight className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-bold text-[#2d3748] dark:text-white">No transactions found</h3>
                        <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                            Create an invoice, receipt, delivery note, or store sale to see your commercial transactions here.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Mobile Card List View (< 768px) */}
                        <div className="md:hidden divide-y divide-neutral-100 dark:divide-neutral-800">
                            {filteredTransactions.map((trx) => (
                                <div 
                                    key={trx.id}
                                    onClick={() => setSelectedTransactionId(trx.id)}
                                    className="p-4 flex flex-col gap-2.5 active:bg-neutral-50 dark:active:bg-neutral-800/60 transition-colors"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm font-mono text-neutral-900 dark:text-white">
                                                {trx.transactionNumber}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                                                trx.source === 'storefront' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                                                trx.source === 'pos' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                                                'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                            }`}>
                                                {trx.source}
                                            </span>
                                        </div>
                                        <span className="text-base font-bold font-mono text-neutral-900 dark:text-white">
                                            {formatCurrency(trx.grandTotal, currency)}
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                                        <span className="font-medium text-neutral-800 dark:text-neutral-200">{trx.customerName}</span>
                                        <span>{formatDate(trx.date)}</span>
                                    </div>

                                    <div className="flex items-center justify-between pt-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                trx.paymentStatus === 'paid' ? 'bg-emerald-50 text-[#16A86B] dark:bg-emerald-950/60 dark:text-emerald-400' :
                                                trx.paymentStatus === 'partially_paid' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                                                trx.paymentStatus === 'refunded' ? 'bg-neutral-100 text-neutral-500' :
                                                'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                    trx.paymentStatus === 'paid' ? 'bg-[#16A86B]' :
                                                    trx.paymentStatus === 'partially_paid' ? 'bg-amber-500' :
                                                    'bg-red-500'
                                                }`} />
                                                {trx.paymentStatus === 'paid' ? 'Paid' : trx.paymentStatus === 'partially_paid' ? 'Partial' : trx.paymentStatus === 'refunded' ? 'Refunded' : 'Unpaid'}
                                            </span>
                                            
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                                trx.fulfillmentStatus === 'fulfilled' ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-400'
                                            }`}>
                                                {trx.fulfillmentStatus === 'fulfilled' ? 'Delivered' : 'Pending Delivery'}
                                            </span>
                                        </div>

                                        <ChevronRight className="w-4 h-4 text-neutral-400" />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table View (>= 768px) */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-neutral-50/80 dark:bg-neutral-900/60 border-b border-neutral-100 dark:border-neutral-700 text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                                    <tr>
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
                                        <th className="px-6 py-4">
                                            <button
                                                onClick={() => handleSort('transactionNumber')}
                                                className="flex items-center gap-1.5 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                                            >
                                                Transaction ID
                                                <ArrowUpDown className="w-3 h-3" />
                                            </button>
                                        </th>
                                        <th className="px-6 py-4">
                                            <button
                                                onClick={() => handleSort('customerName')}
                                                className="flex items-center gap-1.5 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                                            >
                                                Customer
                                                <ArrowUpDown className="w-3 h-3" />
                                            </button>
                                        </th>
                                        <th className="px-6 py-4">
                                            <button
                                                onClick={() => handleSort('source')}
                                                className="flex items-center gap-1.5 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                                            >
                                                Source
                                                <ArrowUpDown className="w-3 h-3" />
                                            </button>
                                        </th>
                                        <th className="px-6 py-4">Connected Documents</th>
                                        <th className="px-6 py-4">
                                            <button
                                                onClick={() => handleSort('paymentStatus')}
                                                className="flex items-center gap-1.5 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                                            >
                                                Payment
                                                <ArrowUpDown className="w-3 h-3" />
                                            </button>
                                        </th>
                                        <th className="px-6 py-4">
                                            <button
                                                onClick={() => handleSort('fulfillmentStatus')}
                                                className="flex items-center gap-1.5 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                                            >
                                                Delivery
                                                <ArrowUpDown className="w-3 h-3" />
                                            </button>
                                        </th>
                                        <th className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleSort('grandTotal')}
                                                className="flex items-center gap-1.5 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors ml-auto"
                                            >
                                                Amount
                                                <ArrowUpDown className="w-3 h-3" />
                                            </button>
                                        </th>
                                        <th className="px-6 py-4 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/60 text-sm">
                                    {filteredTransactions.map((trx) => {
                                        const isRowSelected = selectedTrxIds.includes(trx.id);
                                        return (
                                        <tr 
                                            key={trx.id}
                                            onClick={() => setSelectedTransactionId(trx.id)}
                                            className={`hover:bg-neutral-50/60 dark:hover:bg-neutral-700/30 transition-colors cursor-pointer group ${isRowSelected ? 'bg-blue-50/40 dark:bg-blue-900/20' : ''}`}
                                        >
                                            {isSelectMode && (
                                                <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isRowSelected}
                                                        onChange={(e) => toggleSelectRow(trx.id, e as any)}
                                                        className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                    />
                                                </td>
                                            )}
                                            {/* TRX ID & Date */}
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-[#2d3748] dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                    {trx.transactionNumber}
                                                </div>
                                                <div className="text-xs text-neutral-400">
                                                    {formatDate(trx.date)}
                                                </div>
                                            </td>

                                            {/* Customer */}
                                            <td className="px-6 py-4 font-semibold text-[#2d3748] dark:text-white">
                                                {trx.customerName}
                                            </td>

                                            {/* Source */}
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                                                    trx.source === 'storefront' ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                                                    trx.source === 'pos' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                                                    'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                                }`}>
                                                    {trx.source}
                                                </span>
                                            </td>

                                            {/* Connected Documents Badges */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    {trx.invoiceNumber && (
                                                        <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-xs font-semibold flex items-center gap-1">
                                                            <FileText className="w-3 h-3" />
                                                            {trx.invoiceNumber}
                                                        </span>
                                                    )}
                                                    {trx.receiptNumbers?.map(r => (
                                                        <span key={r} className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1">
                                                            <Receipt className="w-3 h-3" />
                                                            {r}
                                                        </span>
                                                    ))}
                                                    {trx.deliveryNoteNumbers?.map(d => (
                                                        <span key={d} className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300 text-xs font-semibold flex items-center gap-1">
                                                            <Truck className="w-3 h-3" />
                                                            {d}
                                                        </span>
                                                    ))}
                                                    {!trx.invoiceNumber && (!trx.receiptNumbers || trx.receiptNumbers.length === 0) && (!trx.deliveryNoteNumbers || trx.deliveryNoteNumbers.length === 0) && (
                                                        <span className="text-xs text-neutral-400 italic">No docs linked</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Payment Status */}
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                    trx.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                    trx.paymentStatus === 'partially_paid' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                                                    trx.paymentStatus === 'refunded' ? 'bg-neutral-100 text-neutral-500 dark:bg-neutral-700' :
                                                    'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                                        trx.paymentStatus === 'paid' ? 'bg-emerald-500' :
                                                        trx.paymentStatus === 'partially_paid' ? 'bg-amber-500' :
                                                        'bg-red-500'
                                                    }`} />
                                                    {trx.paymentStatus === 'paid' ? 'Paid' :
                                                     trx.paymentStatus === 'partially_paid' ? 'Partial' :
                                                     trx.paymentStatus === 'refunded' ? 'Refunded' : 'Unpaid'}
                                                </span>
                                            </td>

                                            {/* Delivery Status */}
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                    trx.fulfillmentStatus === 'fulfilled' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                    'bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400'
                                                }`}>
                                                    {trx.fulfillmentStatus === 'fulfilled' ? (
                                                        <>
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            Fulfilled
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Clock className="w-3 h-3" />
                                                            Unfulfilled
                                                        </>
                                                    )}
                                                </span>
                                            </td>

                                            {/* Amount */}
                                            <td className="px-6 py-4 text-right font-bold text-[#2d3748] dark:text-white">
                                                {formatCurrency(trx.grandTotal, currency)}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => setSelectedTransactionId(trx.id)}
                                                        className="p-1.5 rounded-lg text-neutral-400 hover:text-blue-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(trx.id, trx.transactionNumber)}
                                                        className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                                                        title="Delete Transaction"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
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
                <p className="text-neutral-600">
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
