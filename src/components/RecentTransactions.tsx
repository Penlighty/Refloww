"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useDocumentStore, useSettingsStore } from '@/lib/store';
import { formatDate, formatCurrency } from '@/lib/utils';
import { DocumentStatus } from '@/lib/types';

const statusConfig: Record<string, { label: string; bgClass: string; textClass: string; dotClass: string }> = {
    'paid': { label: 'Paid', bgClass: 'bg-emerald-50 dark:bg-emerald-900/30', textClass: 'text-emerald-600 dark:text-emerald-400', dotClass: 'bg-emerald-500' },
    'sent': { label: 'Sent', bgClass: 'bg-blue-50 dark:bg-blue-900/30', textClass: 'text-blue-600 dark:text-blue-400', dotClass: 'bg-blue-500' },
    'draft': { label: 'Draft', bgClass: 'bg-neutral-100 dark:bg-neutral-700', textClass: 'text-neutral-600 dark:text-neutral-300', dotClass: 'bg-neutral-400' },
    'overdue': { label: 'Overdue', bgClass: 'bg-red-50 dark:bg-red-900/30', textClass: 'text-red-600 dark:text-red-400', dotClass: 'bg-red-500' },
    'cancelled': { label: 'Cancelled', bgClass: 'bg-neutral-100 dark:bg-neutral-700', textClass: 'text-neutral-500 dark:text-neutral-400', dotClass: 'bg-neutral-400' },
};

// Generate avatar color based on client name
function getAvatarColor(name: string) {
    if (!name) return 'from-neutral-400 to-neutral-600';
    const colors = [
        'from-blue-400 to-blue-600',
        'from-emerald-400 to-emerald-600',
        'from-purple-400 to-purple-600',
        'from-amber-400 to-amber-600',
        'from-rose-400 to-rose-600',
        'from-cyan-400 to-cyan-600',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
}

export default function RecentTransactions() {
    const [mounted, setMounted] = useState(false);
    const { documents } = useDocumentStore();
    const { company } = useSettingsStore();

    useEffect(() => {
        setMounted(true);
    }, []);

    const currency = company.currency;

    // Get 5 most recent documents
    const recentDocs = mounted ? [...documents]
        .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
        .slice(0, 50) : [];

    if (!mounted) {
        return (
            <div className="xl:col-span-2 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-[#2d3748] dark:text-white">Recent Transactions</h3>
                </div>
                <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl h-64 animate-pulse"></div>
            </div>
        );
    }

    if (recentDocs.length === 0) {
        return (
            <div className="xl:col-span-2 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-[#2d3748] dark:text-white">Recent Transactions</h3>
                </div>
                <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-8 text-center">
                    <p className="text-neutral-400 dark:text-neutral-500">No transactions yet.</p>
                </div>
            </div>
        );
    }

    // ... (imports remain)
    return (
        <div className="xl:col-span-2 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#2d3748] dark:text-white">Recent Transactions</h3>
                <Link
                    href="/ledger"
                    className="group flex items-center gap-1.5 text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-[#2d3748] dark:hover:text-white transition-colors"
                >
                    View all
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={2} />
                </Link>
            </div>

            <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl overflow-hidden flex flex-col h-[400px]">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto overflow-y-auto custom-scrollbar flex-1">
                    <table className="w-full whitespace-nowrap relative">
                        <thead className="sticky top-0 z-10 bg-white dark:bg-neutral-800 shadow-sm">
                            <tr className="border-b border-neutral-100 dark:border-neutral-700">
                                <th className="text-left px-6 py-4 text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider bg-white dark:bg-neutral-800">Client</th>
                                <th className="text-left px-6 py-4 text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider bg-white dark:bg-neutral-800">Date</th>
                                <th className="text-left px-6 py-4 text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider bg-white dark:bg-neutral-800">Status</th>
                                <th className="text-right px-6 py-4 text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider bg-white dark:bg-neutral-800">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentDocs.map((doc) => (
                                <tr
                                    key={doc.id}
                                    className="border-b border-neutral-50 dark:border-neutral-700/50 last:border-b-0 hover:bg-neutral-50/50 dark:hover:bg-neutral-700/30 transition-colors"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(doc.customerName)} flex items-center justify-center text-white font-semibold text-sm flex-shrink-0`}>
                                                {doc.customerName ? doc.customerName.charAt(0) : '?'}
                                            </div>
                                            <span className="font-medium text-[#2d3748] dark:text-white">{doc.customerName || 'Unknown'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-neutral-500 dark:text-neutral-400">{formatDate(doc.date)}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[doc.status || 'draft'].bgClass} ${statusConfig[doc.status || 'draft'].textClass}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[doc.status || 'draft'].dotClass}`}></span>
                                            {statusConfig[doc.status || 'draft'].label}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-sm font-medium text-[#2d3748] dark:text-white">{formatCurrency(doc.grandTotal, currency)}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile List View */}
                <div className="md:hidden flex-1 overflow-y-auto custom-scrollbar p-2">
                    {recentDocs.map((doc) => (
                        <div key={doc.id} className="p-4 border-b border-neutral-50 dark:border-neutral-700/50 last:border-0 flex flex-col gap-3">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(doc.customerName)} flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 shadow-sm`}>
                                        {doc.customerName ? doc.customerName.charAt(0) : '?'}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-medium text-[#2d3748] dark:text-white text-sm truncate max-w-[150px] sm:max-w-[200px]">{doc.customerName || 'Unknown'}</span>
                                        <span className="text-xs text-neutral-400">{formatDate(doc.date)}</span>
                                    </div>
                                </div>
                                <span className="text-sm font-semibold text-[#2d3748] dark:text-white flex-shrink-0">{formatCurrency(doc.grandTotal, currency)}</span>
                            </div>
                            <div className="flex items-center justify-between pl-13">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[doc.status || 'draft'].bgClass} ${statusConfig[doc.status || 'draft'].textClass}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[doc.status || 'draft'].dotClass}`}></span>
                                    {statusConfig[doc.status || 'draft'].label}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
