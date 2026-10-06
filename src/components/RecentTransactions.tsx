"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight } from '@/components/icons';
import { useDocumentStore, useSettingsStore, useOrganizationStore } from '@/lib/store';
import { formatDate, formatCurrency } from '@/lib/utils';
import { DocumentStatus } from '@/lib/types';
import { useMemo } from 'react';

import { Tag, type TagTone } from '@/components/ui';

const statusConfig: Record<string, { label: string; tone: TagTone }> = {
    'paid': { label: 'Paid', tone: 'paid' },
    'partially_paid': { label: 'Partially Paid', tone: 'warning' },
    'sent': { label: 'Sent', tone: 'neutral' },
    'draft': { label: 'Draft', tone: 'neutral' },
    'overdue': { label: 'Overdue', tone: 'overdue' },
    'cancelled': { label: 'Cancelled', tone: 'neutral' },
};

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
                    <h3 className="text-lg font-bold font-display text-ink">Recent Transactions</h3>
                </div>
                <div className="bg-paper-2 border border-line rounded-panel h-64 animate-pulse"></div>
            </div>
        );
    }

    if (recentDocs.length === 0) {
        return (
            <div className="xl:col-span-2 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold font-display text-ink">Recent Transactions</h3>
                </div>
                <div className="panel p-8 text-center rounded-panel">
                    <p className="text-ink-muted">No transactions yet.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="xl:col-span-2 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold font-display text-ink">Recent Transactions</h3>
                <Link
                    href="/transactions"
                    className="group flex items-center gap-1.5 text-sm font-bold text-ink-muted hover:text-ink transition-colors"
                >
                    View all
                    <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
            </div>

            <div className="panel rounded-panel overflow-hidden flex flex-col h-[400px]">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto overflow-y-auto custom-scrollbar flex-1">
                    <table className="w-full whitespace-nowrap relative">
                        <thead className="sticky top-0 z-10 bg-paper-2 border-b border-line">
                            <tr>
                                <th className="th text-left px-6 py-3.5">Client & Document</th>
                                <th className="th text-left px-6 py-3.5">Date</th>
                                <th className="th text-left px-6 py-3.5">Status</th>
                                <th className="th text-right px-6 py-3.5">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                            {recentDocs.map((doc) => {
                                const statusKey = doc.status || 'draft';
                                const statusInfo = statusConfig[statusKey] || statusConfig['draft'];
                                const docTypeLabel = doc.type === 'receipt' ? 'Receipt' : doc.type === 'invoice' ? 'Invoice' : doc.type === 'delivery-note' ? 'Delivery Note' : 'Estimate';
                                const displayAmount = doc.type === 'receipt' ? (doc.amountPaid || doc.grandTotal) : doc.grandTotal;
                                const firstChar = doc.customerName ? doc.customerName.charAt(0).toUpperCase() : '?';

                                return (
                                    <tr
                                        key={doc.id}
                                        className="hover:bg-paper-2 transition-colors"
                                    >
                                        <td className="px-6 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="size-9 rounded-full bg-paper-2 border border-line flex items-center justify-center text-ink font-bold text-xs shrink-0">
                                                    {firstChar}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm text-ink">
                                                        {doc.customerName || 'Unknown Customer'}
                                                    </span>
                                                    <div className="flex items-center gap-1.5 text-xs text-ink-muted money">
                                                        <span className="px-1.5 py-0.5 rounded-tag text-[10px] font-bold uppercase bg-paper-2 border border-line">
                                                            {docTypeLabel}
                                                        </span>
                                                        <span>• {doc.documentNumber}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3.5">
                                            <span className="text-xs font-bold text-ink-muted">{formatDate(doc.date)}</span>
                                        </td>
                                        <td className="px-6 py-3.5">
                                            <Tag tone={statusInfo.tone}>
                                                {statusInfo.label}
                                            </Tag>
                                        </td>
                                        <td className="px-6 py-3.5 text-right">
                                            <span className="text-sm font-bold money text-ink">
                                                {displayAmount !== undefined ? formatCurrency(displayAmount, currency) : '-'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile List View */}
                <div className="md:hidden flex-1 overflow-y-auto custom-scrollbar p-2 divide-y divide-line">
                    {recentDocs.map((doc) => {
                        const statusKey = doc.status || 'draft';
                        const statusInfo = statusConfig[statusKey] || statusConfig['draft'];
                        const firstChar = doc.customerName ? doc.customerName.charAt(0).toUpperCase() : '?';

                        return (
                            <div key={doc.id} className="p-3.5 flex flex-col gap-2.5">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="size-9 rounded-full bg-paper-2 border border-line flex items-center justify-center text-ink font-bold text-xs shrink-0">
                                            {firstChar}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-bold text-ink text-xs truncate max-w-[150px] sm:max-w-[200px]">
                                                {doc.customerName || 'Unknown Customer'}
                                            </span>
                                            <span className="text-[11px] text-ink-muted">{formatDate(doc.date)}</span>
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold money text-ink shrink-0">
                                        {doc.grandTotal !== undefined ? formatCurrency(doc.grandTotal, currency) : '-'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between pl-12">
                                    <Tag tone={statusInfo.tone}>
                                        {statusInfo.label}
                                    </Tag>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
