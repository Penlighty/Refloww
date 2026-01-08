"use client";

import Link from 'next/link';
import { Document } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { FileText, Receipt, Truck, ArrowUpDown } from 'lucide-react';

interface LedgerTableProps {
    documents: Document[];
    sortField: keyof Document;
    sortOrder: 'asc' | 'desc';
    onSort: (field: keyof Document) => void;
}

const statusConfig = {
    'draft': { label: 'Draft', bgClass: 'bg-neutral-100 dark:bg-neutral-700', textClass: 'text-neutral-600 dark:text-neutral-300', dotClass: 'bg-neutral-400' },
    'sent': { label: 'Sent', bgClass: 'bg-blue-50 dark:bg-blue-900/30', textClass: 'text-blue-600 dark:text-blue-400', dotClass: 'bg-blue-500' },
    'paid': { label: 'Paid', bgClass: 'bg-emerald-50 dark:bg-emerald-900/30', textClass: 'text-emerald-600 dark:text-emerald-400', dotClass: 'bg-emerald-500' },
    'overdue': { label: 'Overdue', bgClass: 'bg-red-50 dark:bg-red-900/30', textClass: 'text-red-600 dark:text-red-400', dotClass: 'bg-red-500' },
    'cancelled': { label: 'Cancelled', bgClass: 'bg-neutral-100 dark:bg-neutral-700', textClass: 'text-neutral-500 dark:text-neutral-400', dotClass: 'bg-neutral-400' },
};

const typeConfig = {
    'invoice': { icon: FileText, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' },
    'receipt': { icon: Receipt, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/30' },
    'delivery-note': { icon: Truck, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/30' },
};

import { useSettingsStore } from '@/lib/store';

export default function LedgerTable({ documents, sortField, sortOrder, onSort }: LedgerTableProps) {
    const { company } = useSettingsStore();
    const currency = company.currency;

    if (documents.length === 0) {
        return (
            <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-12 text-center">
                <p className="text-neutral-400 dark:text-neutral-500">No transactions found matching your criteria.</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full whitespace-nowrap">
                    <thead>
                        <tr className="border-b border-neutral-100 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50">
                            <th className="text-left px-6 py-4">
                                <button
                                    onClick={() => onSort('date')}
                                    className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                                >
                                    Date
                                    <ArrowUpDown className="w-3 h-3" />
                                </button>
                            </th>
                            <th className="text-left px-6 py-4">
                                <button
                                    onClick={() => onSort('type')}
                                    className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                                >
                                    Type
                                    <ArrowUpDown className="w-3 h-3" />
                                </button>
                            </th>
                            <th className="text-left px-6 py-4">
                                <button
                                    onClick={() => onSort('documentNumber')}
                                    className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                                >
                                    Reference
                                    <ArrowUpDown className="w-3 h-3" />
                                </button>
                            </th>
                            <th className="text-left px-6 py-4">
                                <span className="text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Customer</span>
                            </th>
                            <th className="text-left px-6 py-4">
                                <button
                                    onClick={() => onSort('status')}
                                    className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                                >
                                    Status
                                    <ArrowUpDown className="w-3 h-3" />
                                </button>
                            </th>
                            <th className="text-right px-6 py-4">
                                <button
                                    onClick={() => onSort('grandTotal')}
                                    className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors ml-auto"
                                >
                                    Amount
                                    <ArrowUpDown className="w-3 h-3" />
                                </button>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                        {documents.map((doc) => {
                            const StatusIcon = statusConfig[doc.status];
                            const TypeIcon = typeConfig[doc.type].icon;

                            return (
                                <tr key={doc.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-neutral-500 dark:text-neutral-400">{formatDate(doc.date)}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className={`p-1.5 rounded-md ${typeConfig[doc.type].bg} ${typeConfig[doc.type].color}`}>
                                                <TypeIcon className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 capitalize">
                                                {doc.type.replace('-', ' ')}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Link
                                            href={`/${doc.type}s/${doc.id}`}
                                            className="text-sm font-medium text-[#2d3748] dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                        >
                                            {doc.documentNumber}
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-700 dark:to-neutral-600 flex items-center justify-center text-xs font-medium text-neutral-600 dark:text-neutral-300">
                                                {doc.customerName.charAt(0)}
                                            </div>
                                            <span className="text-sm text-neutral-600 dark:text-neutral-300">{doc.customerName}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${StatusIcon.bgClass} ${StatusIcon.textClass}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${StatusIcon.dotClass}`}></span>
                                            {StatusIcon.label}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`text-sm font-medium ${doc.status === 'cancelled' ? 'text-neutral-400 dark:text-neutral-500 line-through' : 'text-[#2d3748] dark:text-white'}`}>
                                            {formatCurrency(doc.grandTotal, currency)}
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
