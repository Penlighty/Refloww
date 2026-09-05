"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useDocumentStore, useSettingsStore, useOrganizationStore } from '@/lib/store';
import { formatDate, formatCurrency } from '@/lib/utils';
import { DocumentStatus } from '@/lib/types';
import { useMemo } from 'react';

const statusConfig: Record<string, { label: string; bgClass: string; textClass: string; dotClass: string }> = {
    'paid': { label: 'Paid', bgClass: 'bg-emerald-50 dark:bg-emerald-900/30', textClass: 'text-emerald-600 dark:text-emerald-400', dotClass: 'bg-emerald-500' },
    'partially_paid': { label: 'Partially Paid', bgClass: 'bg-amber-50 dark:bg-amber-900/30', textClass: 'text-amber-600 dark:text-amber-400', dotClass: 'bg-amber-500' },
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
    const { documents, getFilteredDocuments } = useDocumentStore();
    const activeOrgId = useOrganizationStore((state) => state.activeOrganizationId);
    const { company } = useSettingsStore();

    useEffect(() => {
        setMounted(true);
    }, []);

    const displayDocuments = useMemo(() => getFilteredDocuments(), [documents, activeOrgId, getFilteredDocuments]);
    const currency = company.currency;

    // Get 50 most recent documents
    const recentDocs = useMemo(() => {
        if (!mounted) return [];
        return [...displayDocuments]
            .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
            .slice(0, 50);
    }, [displayDocuments, mounted]);

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

    return (
        <div className="xl:col-span-2 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#2d3748] dark:text-white">Recent Transactions</h3>
                <Link
                    href="/transactions"
                    className="group flex items-center gap-1.5 text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-[#2d3748] dark:hover:text-white transition-colors"
                >
                    View all
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={2} />
                </Link>
            </div>

            <div className="bg-white dark:bg-[#121620] border border-neutral-200/90 dark:border-neutral-800/80 rounded-2xl overflow-hidden flex flex-col h-[400px] shadow-xs">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto overflow-y-auto custom-scrollbar flex-1">
                    <table className="w-full whitespace-nowrap relative">
                        <thead className="sticky top-0 z-10 bg-neutral-50/80 dark:bg-[#161a26] border-b border-neutral-200/80 dark:border-neutral-800/80">
                            <tr>
                                <th className="text-left px-6 py-3.5 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Client & Document</th>
                                <th className="text-left px-6 py-3.5 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Date</th>
                                <th className="text-left px-6 py-3.5 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Status</th>
                                <th className="text-right px-6 py-3.5 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentDocs.map((doc) => {
                                const statusKey = doc.status || 'draft';
                                const statusStyle = statusConfig[statusKey] || statusConfig['draft'];
                                const docTypeLabel = doc.type === 'receipt' ? 'Receipt' : doc.type === 'invoice' ? 'Invoice' : doc.type === 'delivery-note' ? 'Delivery Note' : 'Estimate';
                                const docTypeBadgeColor = doc.type === 'receipt' ? 'bg-violet-100/80 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300' : doc.type === 'invoice' ? 'bg-blue-100/80 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300';
                                const displayAmount = doc.type === 'receipt' ? (doc.amountPaid || doc.grandTotal) : doc.grandTotal;

                                return (
                                    <tr
                                        key={doc.id}
                                        className="border-b border-neutral-100 dark:border-neutral-800/50 last:border-b-0 hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors"
                                    >
                                        <td className="px-6 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarColor(doc.customerName || '')} flex items-center justify-center text-white font-semibold text-xs shrink-0 shadow-xs`}>
                                                    {doc.customerName ? doc.customerName.charAt(0) : (doc as any)._isLocked ? '🔒' : '?'}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-sm text-[#2d3748] dark:text-white">
                                                        {doc.customerName || ((doc as any)._isLocked ? 'Encrypted' : 'Unknown')}
                                                    </span>
                                                    <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-mono">
                                                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase ${docTypeBadgeColor}`}>
                                                            {docTypeLabel}
                                                        </span>
                                                        <span>• {doc.documentNumber}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3.5">
                                            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{formatDate(doc.date)}</span>
                                        </td>
                                        <td className="px-6 py-3.5">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyle.bgClass} ${statusStyle.textClass}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dotClass}`}></span>
                                                {statusStyle.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3.5 text-right">
                                            <span className="text-sm font-bold font-mono text-[#2d3748] dark:text-white">
                                                {displayAmount !== undefined ? formatCurrency(displayAmount, currency) : ((doc as any)._isLocked ? '🔒 Locked' : '-')}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile List View */}
                <div className="md:hidden flex-1 overflow-y-auto custom-scrollbar p-2">
                    {recentDocs.map((doc) => (
                        <div key={doc.id} className="p-3.5 border-b border-neutral-100 dark:border-neutral-800/60 last:border-0 flex flex-col gap-2.5">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarColor(doc.customerName || '')} flex items-center justify-center text-white font-semibold text-xs shrink-0 shadow-xs`}>
                                        {doc.customerName ? doc.customerName.charAt(0) : (doc as any)._isLocked ? '🔒' : '?'}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-semibold text-neutral-900 dark:text-white text-xs truncate max-w-[150px] sm:max-w-[200px]">
                                            {doc.customerName || ((doc as any)._isLocked ? 'Encrypted Document' : 'Unknown')}
                                        </span>
                                        <span className="text-[11px] text-neutral-400">{formatDate(doc.date)}</span>
                                    </div>
                                </div>
                                <span className="text-xs font-bold font-mono text-[#2d3748] dark:text-white shrink-0">
                                    {doc.grandTotal !== undefined ? formatCurrency(doc.grandTotal, currency) : ((doc as any)._isLocked ? '🔒 Locked' : '-')}
                                </span>
                            </div>
                            <div className="flex items-center justify-between pl-12">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${statusConfig[doc.status || 'draft'].bgClass} ${statusConfig[doc.status || 'draft'].textClass}`}>
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
