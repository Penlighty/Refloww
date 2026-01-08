"use client";

import { DocumentType, DocumentStatus } from '@/lib/types';
import { SearchInput, Select } from '@/components/ui';

interface LedgerFiltersProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    typeFilter: DocumentType | 'all';
    onTypeFilterChange: (type: DocumentType | 'all') => void;
    statusFilter: DocumentStatus | 'all';
    onStatusFilterChange: (status: DocumentStatus | 'all') => void;
}

export default function LedgerFilters({
    searchQuery,
    onSearchChange,
    typeFilter,
    onTypeFilterChange,
    statusFilter,
    onStatusFilterChange,
}: LedgerFiltersProps) {
    return (
        <>
            <SearchInput
                value={searchQuery}
                onChange={onSearchChange}
                placeholder="Search ledger..."
                className="flex-1 max-w-xs"
            />
            <Select
                options={[
                    { value: 'all', label: 'All Types' },
                    { value: 'invoice', label: 'Invoices' },
                    { value: 'receipt', label: 'Receipts' },
                    { value: 'delivery-note', label: 'Delivery Notes' },
                ]}
                value={typeFilter}
                onChange={(val) => onTypeFilterChange(val as any)}
                className="w-36"
            />
            <Select
                options={[
                    { value: 'all', label: 'All Status' },
                    { value: 'draft', label: 'Draft' },
                    { value: 'sent', label: 'Sent' },
                    { value: 'paid', label: 'Paid' },
                    { value: 'overdue', label: 'Overdue' },
                    { value: 'cancelled', label: 'Cancelled' },
                ]}
                value={statusFilter}
                onChange={(val) => onStatusFilterChange(val as any)}
                className="w-36"
            />
        </>
    );
}
