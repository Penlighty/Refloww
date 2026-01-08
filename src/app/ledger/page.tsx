"use client";

import { useState, useMemo } from 'react';
import { useDocumentStore, useSettingsStore } from '@/lib/store';
import { DocumentType, DocumentStatus } from '@/lib/types';
import LedgerTable from '@/components/ledger/LedgerTable';
import LedgerFilters from '@/components/ledger/LedgerFilters';
import ExportButtons from '@/components/ledger/ExportButtons';
import { DateRangePicker } from '@/components/ui';
import { Wallet } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

type SortField = 'date' | 'type' | 'documentNumber' | 'status' | 'grandTotal';
type SortOrder = 'asc' | 'desc';

export default function LedgerPage() {
    const { documents } = useDocumentStore();
    const { company } = useSettingsStore();
    const currency = company.currency;

    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>('all');
    const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all');
    const [startDate, setStartDate] = useState<string | null>(null);
    const [endDate, setEndDate] = useState<string | null>(null);
    const [sortField, setSortField] = useState<SortField>('date');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    // Filter and sort
    const filteredDocuments = useMemo(() => {
        let result = documents.filter((doc) => {
            const query = searchQuery.toLowerCase();
            const matchesSearch =
                doc.documentNumber.toLowerCase().includes(query) ||
                doc.customerName.toLowerCase().includes(query);
            const matchesType = typeFilter === 'all' || doc.type === typeFilter;
            const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;

            // Date range filter
            const docDate = doc.date.split('T')[0];
            const matchesStartDate = !startDate || docDate >= startDate;
            const matchesEndDate = !endDate || docDate <= endDate;

            return matchesSearch && matchesType && matchesStatus && matchesStartDate && matchesEndDate;
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
    }, [documents, searchQuery, typeFilter, statusFilter, startDate, endDate, sortField, sortOrder]);

    // Stats
    const stats = useMemo(() => {
        const activeDocs = filteredDocuments.filter(d => d.status !== 'cancelled');
        const totalRevenue = activeDocs.reduce((sum, doc) => sum + doc.grandTotal, 0);
        const count = filteredDocuments.length;
        return { totalRevenue, count };
    }, [filteredDocuments]);

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
            Date: new Date(doc.date).toLocaleDateString(),
            Type: doc.type.toUpperCase(),
            Reference: doc.documentNumber,
            Customer: doc.customerName,
            Status: doc.status.toUpperCase(),
            Amount: doc.grandTotal,
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
            new Date(doc.date).toLocaleDateString(),
            doc.type.toUpperCase(),
            doc.documentNumber,
            doc.customerName,
            doc.status.toUpperCase(),
            doc.grandTotal.toFixed(2),
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
        <div className="max-w-7xl mx-auto space-y-8">
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
                <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 p-4 rounded-2xl sm:col-span-2">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium uppercase tracking-wider mb-1">Total Revenue (Filtered)</p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.totalRevenue, currency)}</p>
                </div>
            </div>

            {/* Filters */}
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

            {/* Table */}
            <LedgerTable
                documents={filteredDocuments}
                sortField={sortField}
                sortOrder={sortOrder}
                onSort={handleSort as any}
            />
        </div>
    );
}
