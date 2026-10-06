"use client";

import Link from 'next/link';
import { Document } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { FileText, Receipt, Truck, ArrowUpDown, CheckSquare, Square, Lock } from '@/components/icons';
import { Tag } from '@/components/ui';
import { useSettingsStore } from '@/lib/store';

interface LedgerTableProps {
    documents: Document[];
    sortField: keyof Document;
    sortOrder: 'asc' | 'desc';
    onSort: (field: keyof Document) => void;
    isSelectMode?: boolean;
    selectedDocIds?: string[];
    onToggleSelectDoc?: (id: string) => void;
    onToggleSelectAll?: () => void;
    isAllSelected?: boolean;
}

const statusTagVariant: Record<string, 'neutral' | 'info' | 'warning' | 'success' | 'danger'> = {
    'draft': 'neutral',
    'sent': 'info',
    'partially_paid': 'warning',
    'paid': 'success',
    'overdue': 'danger',
    'cancelled': 'neutral',
};

const statusLabel: Record<string, string> = {
    'draft': 'Draft',
    'sent': 'Sent',
    'partially_paid': 'Partially Paid',
    'paid': 'Paid',
    'overdue': 'Overdue',
    'cancelled': 'Cancelled',
};

const typeConfig = {
    'invoice': { icon: FileText, color: 'text-primary-500', bg: 'bg-primary-500/10' },
    'receipt': { icon: Receipt, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    'delivery-note': { icon: Truck, color: 'text-[#0284c7]', bg: 'bg-[#0284c7]/10' },
};

export default function LedgerTable({
    documents,
    sortField,
    sortOrder,
    onSort,
    isSelectMode = false,
    selectedDocIds = [],
    onToggleSelectDoc,
    onToggleSelectAll,
    isAllSelected = false,
}: LedgerTableProps) {
    const { company } = useSettingsStore();
    const currency = company.currency;

    if (documents.length === 0) {
        return (
            <div className="panel p-12 text-center">
                <p className="text-ink-muted text-sm">No transactions found matching your criteria.</p>
            </div>
        );
    }

    return (
        <div className="panel overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full whitespace-nowrap text-left border-collapse">
                    <thead>
                        <tr className="border-b border-line bg-paper-2/60">
                            {isSelectMode && (
                                <th className="px-6 py-3.5 w-10">
                                    <button
                                        onClick={onToggleSelectAll}
                                        className="p-1 rounded text-ink-muted hover:text-ink transition-colors"
                                    >
                                        {isAllSelected ? (
                                            <CheckSquare className="size-4 text-primary-500" />
                                        ) : (
                                            <Square className="size-4" />
                                        )}
                                    </button>
                                </th>
                            )}
                            <th className="px-6 py-3.5">
                                <button
                                    onClick={() => onSort('date')}
                                    className="flex items-center gap-1.5 text-xs font-mono font-medium uppercase tracking-wider text-ink-muted hover:text-ink transition-colors"
                                >
                                    Date
                                    <ArrowUpDown className="size-3.5" />
                                </button>
                            </th>
                            <th className="px-6 py-3.5">
                                <button
                                    onClick={() => onSort('type')}
                                    className="flex items-center gap-1.5 text-xs font-mono font-medium uppercase tracking-wider text-ink-muted hover:text-ink transition-colors"
                                >
                                    Type
                                    <ArrowUpDown className="size-3.5" />
                                </button>
                            </th>
                            <th className="px-6 py-3.5">
                                <button
                                    onClick={() => onSort('documentNumber')}
                                    className="flex items-center gap-1.5 text-xs font-mono font-medium uppercase tracking-wider text-ink-muted hover:text-ink transition-colors"
                                >
                                    Reference
                                    <ArrowUpDown className="size-3.5" />
                                </button>
                            </th>
                            <th className="px-6 py-3.5">
                                <button
                                    onClick={() => onSort('customerName' as keyof Document)}
                                    className="flex items-center gap-1.5 text-xs font-mono font-medium uppercase tracking-wider text-ink-muted hover:text-ink transition-colors"
                                >
                                    Customer
                                    <ArrowUpDown className="size-3.5" />
                                </button>
                            </th>
                            <th className="px-6 py-3.5">
                                <button
                                    onClick={() => onSort('status')}
                                    className="flex items-center gap-1.5 text-xs font-mono font-medium uppercase tracking-wider text-ink-muted hover:text-ink transition-colors"
                                >
                                    Status
                                    <ArrowUpDown className="size-3.5" />
                                </button>
                            </th>
                            <th className="px-6 py-3.5 text-right">
                                <button
                                    onClick={() => onSort('grandTotal')}
                                    className="flex items-center gap-1.5 text-xs font-mono font-medium uppercase tracking-wider text-ink-muted hover:text-ink transition-colors ml-auto"
                                >
                                    Amount
                                    <ArrowUpDown className="size-3.5" />
                                </button>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                        {documents.map((doc) => {
                            const variant = statusTagVariant[doc.status] || 'neutral';
                            const label = statusLabel[doc.status] || doc.status;
                            const TypeConfig = typeConfig[doc.type] || typeConfig['invoice'];
                            const TypeIcon = TypeConfig.icon;
                            const isLocked = (doc as any)._isLocked === true;
                            const customerName = doc.customerName || (isLocked ? 'Encrypted' : '-');
                            const rowAmount = doc.type === 'receipt' ? (doc.amountPaid || doc.grandTotal || 0) : (doc.grandTotal || 0);

                            return (
                                <tr key={doc.id} className="hover:bg-ground/50 transition-colors group">
                                    {isSelectMode && (
                                        <td className="px-6 py-4 w-10">
                                            <button
                                                onClick={() => onToggleSelectDoc?.(doc.id)}
                                                className="p-1 rounded text-ink-muted hover:text-ink transition-colors"
                                            >
                                                {selectedDocIds.includes(doc.id) ? (
                                                    <CheckSquare className="size-4 text-primary-500" />
                                                ) : (
                                                    <Square className="size-4" />
                                                )}
                                            </button>
                                        </td>
                                    )}
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-mono text-ink-muted">{formatDate(doc.date || '')}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className={`p-1.5 rounded-ctl ${TypeConfig.bg} ${TypeConfig.color}`}>
                                                <TypeIcon className="size-4" />
                                            </div>
                                            <span className="text-sm font-medium text-ink capitalize">
                                                {(doc.type || '').replace('-', ' ')}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Link
                                            href={`/${doc.type}s/${doc.id}`}
                                            className="text-sm font-mono font-medium text-ink hover:text-primary-500 transition-colors inline-flex items-center gap-1"
                                        >
                                            {isLocked && <Lock className="size-3.5 text-ink-muted" />}
                                            {doc.documentNumber || (isLocked ? 'Encrypted' : 'Untitled')}
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="size-6 rounded-full bg-paper-2 border border-line flex items-center justify-center text-xs font-medium text-ink-muted">
                                                {doc.customerName ? doc.customerName.charAt(0) : '?'}
                                            </div>
                                            <span className="text-sm text-ink">
                                                {customerName}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Tag variant={variant}>{label}</Tag>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`text-sm font-mono font-medium ${doc.status === 'cancelled' ? 'text-ink-muted line-through' : 'text-ink'}`}>
                                            {formatCurrency(rowAmount, currency)}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

