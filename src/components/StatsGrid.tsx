"use client";

import Link from 'next/link';
import { TrendingUp, Clock, FileText, DollarSign, ArrowUpRight, ArrowDownRight, BarChart2 } from '@/components/icons';
import { useDocumentStore, useSettingsStore, useTemplateStore, useOrganizationStore, useTransactionStore } from '@/lib/store';
import { useMemo, useState, useEffect } from 'react';
import { formatCurrency, sumEffectiveGrandTotals } from '@/lib/utils';

import { PageHelpModal } from '@/components/ui';

interface StatCardProps {
    title: string;
    value: string;
    subValue?: string;
    change?: {
        value: string;
        positive: boolean;
    };
    note: string;
    icon: React.ReactNode;
    variant?: 'default' | 'featured';
    hideChange?: boolean;
}

function StatCard({ title, value, subValue, change, note, icon, variant = 'default', hideChange = false }: StatCardProps) {
    const isFeatured = variant === 'featured';

    return (
        <div className={`panel ${isFeatured ? 'bg-paper border-2 border-line-heavy' : 'bg-paper border border-line'} p-5 sm:p-6 rounded-panel`}>
            <div className="flex items-center justify-between mb-3">
                <p className="label">
                    {title}
                </p>
                <div className="p-2.5 rounded-ctl bg-paper-2 border border-line text-ink">
                    {icon}
                </div>
            </div>
            <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap min-w-0">
                    <h3 className={`font-money font-bold tracking-tight text-ink truncate w-full ${isFeatured ? 'text-xl sm:text-2xl lg:text-metric' : 'text-lg sm:text-xl lg:text-headline'}`}>
                        {value}
                    </h3>
                </div>
                {subValue && (
                    <span className="text-caption money text-ink-muted truncate block">
                        {subValue}
                    </span>
                )}
            </div>
            {change && !hideChange && (
                <div className="flex items-center gap-1.5 mt-3">
                    <span className={`flex items-center gap-0.5 text-caption font-bold px-2 py-0.5 rounded-tag ${
                        change.positive ? 'bg-paper-2 text-status-paid border border-line' : 'bg-paper-2 text-status-overdue border border-line'
                    }`}>
                        {change.positive ? (
                            <ArrowUpRight className="size-3.5" />
                        ) : (
                            <ArrowDownRight className="size-3.5" />
                        )}
                        {change.value}
                    </span>
                    <span className="text-caption text-ink-muted">
                        {note}
                    </span>
                </div>
            )}
            {(!change || hideChange) && (
                <p className="text-caption text-ink-muted mt-3">
                    {note}
                </p>
            )}
        </div>
    );
}

export default function StatsGrid() {
    const [mounted, setMounted] = useState(false);
    const { documents, getFilteredDocuments } = useDocumentStore();
    const { transactions, getFilteredTransactions, backfillTransactionsFromDocuments } = useTransactionStore();
    const activeOrgId = useOrganizationStore((state) => state.activeOrganizationId);
    const { company } = useSettingsStore();

    useEffect(() => {
        setMounted(true);
    }, []);

    const displayDocuments = useMemo(() => getFilteredDocuments(), [documents, activeOrgId, getFilteredDocuments]);
    const activeTransactions = useMemo(() => getFilteredTransactions(), [transactions, activeOrgId, getFilteredTransactions]);
    const currency = company.currency;

    // Ensure transactions are backfilled from documents
    useEffect(() => {
        if (mounted && displayDocuments.length > 0) {
            backfillTransactionsFromDocuments(displayDocuments);
        }
    }, [mounted, displayDocuments, backfillTransactionsFromDocuments]);

    const stats = useMemo(() => {
        if (!mounted) return [];
        
        // Total Billed Volume vs Total Realized Cash Revenue
        const totalBilled = activeTransactions.reduce((sum, t) => sum + (t.grandTotal || 0), 0);
        const totalPaid = activeTransactions.reduce((sum, t) => sum + (t.amountPaid || 0), 0);

        // Outstanding Amount (Actual balance due on unpaid/partially paid invoices/transactions)
        const pendingTransactions = activeTransactions.filter(t => t.paymentStatus === 'unpaid' || t.paymentStatus === 'partially_paid');
        const outstandingAmount = pendingTransactions.reduce((sum, t) => sum + (t.amountDue || 0), 0);
        
        const overdueCount = displayDocuments.filter(d => d.type === 'invoice' && d.status === 'overdue').length;

        // Total Documents Count
        const totalDocs = displayDocuments.length;
        const lastDoc = displayDocuments.length > 0
            ? displayDocuments.reduce((latest, doc) => new Date(doc.createdAt) > new Date(latest.createdAt) ? doc : latest)
            : null;

        const lastActivity = lastDoc ? `Last: ${new Date(lastDoc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'No documents yet';

        return [
            {
                title: 'Total Revenue',
                value: formatCurrency(totalPaid, currency),
                subValue: totalBilled > 0 ? `of ${formatCurrency(totalBilled, currency)} billed` : undefined,
                change: { value: '0%', positive: true },
                note: 'Actual payments received',
                icon: <DollarSign className="size-5" />,
                variant: 'featured',
                hideChange: true,
            },
            {
                title: 'Unpaid Invoices',
                value: pendingTransactions.length.toString(),
                subValue: `(${formatCurrency(outstandingAmount, currency)})`,
                note: `${overdueCount} overdue`,
                icon: <Clock className="size-5" />,
                variant: 'default',
            },
            {
                title: 'Documents',
                value: totalDocs.toString(),
                subValue: 'files',
                note: lastActivity,
                icon: <FileText className="size-5" />,
                variant: 'default',
            },
        ] as StatCardProps[];
    }, [displayDocuments, activeTransactions, currency, mounted]);

    if (!mounted) {
        return <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[140px]">
            {[1, 2, 3].map(i => (
                <div key={i} className="bg-paper-2 animate-pulse rounded-panel p-6 border border-line"></div>
            ))}
        </div>;
    }

    return (
        <section>
            <div className="flex items-end justify-between mb-5">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold font-display text-ink">Overview</h2>
                        <PageHelpModal
                            title="Dashboard Overview & Financial Summary"
                            description="Real-time financial breakdown of total revenue earned, pending/overdue invoices, and total document activity."
                            terms={[
                                { term: 'Total Revenue', definition: 'Sum of all paid invoice totals.' },
                                { term: 'Outstanding Invoices', definition: 'Invoices sent to customers that are pending payment or overdue.' }
                            ]}
                        />
                    </div>
                    <p className="text-sm text-ink-muted mt-0.5">Your financial summary</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href="/analytics"
                        className="flex items-center gap-2 px-3 py-1.5 rounded-ctl bg-paper-2 border border-line hover:bg-paper-3 transition-colors text-sm font-bold text-ink"
                    >
                        <BarChart2 className="size-4" />
                        <span>Analytics</span>
                    </Link>
                </div>
            </div>
            <div className="flex flex-col md:grid md:grid-cols-3 gap-3 md:gap-4">
                {/* 1. Featured Total Revenue Hero Card (Full width on mobile) */}
                {stats[0] && (
                    <div className="w-full md:col-span-1">
                        <StatCard {...stats[0]} />
                    </div>
                )}

                {/* 2. Responsive Side-by-Side Cards on Mobile */}
                <div className="w-full md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    {stats.slice(1).map((stat, index) => (
                        <StatCard key={index} {...stat} />
                    ))}
                </div>
            </div>
        </section>
    );
}
