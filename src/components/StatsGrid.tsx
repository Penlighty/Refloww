"use client";

import Link from 'next/link';
import { TrendingUp, Clock, FileText, DollarSign, ArrowUpRight, ArrowDownRight, BarChart2 } from 'lucide-react';
import { useDocumentStore, useSettingsStore } from '@/lib/store';
import { useMemo, useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';

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
        <div className={`${isFeatured
            ? 'bg-gradient-to-br from-[#2d3748] via-[#3d4a5c] to-[#4a5568] text-white'
            : 'bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700'
            } p-6 rounded-2xl transition-all duration-300`}>
            <div className="flex items-center justify-between mb-3">
                <p className={`text-sm font-medium ${isFeatured ? 'text-neutral-300' : 'text-neutral-500 dark:text-neutral-400'}`}>
                    {title}
                </p>
                <div className={`p-2 rounded-xl ${isFeatured
                    ? 'bg-white/10 text-white'
                    : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                    }`}>
                    {icon}
                </div>
            </div>
            <div className="flex items-baseline gap-2">
                <h3 className={`text-2xl font-bold ${isFeatured ? 'text-white' : 'text-neutral-900 dark:text-white'}`}>
                    {value}
                </h3>
                {subValue && (
                    <span className={`text-base font-normal ${isFeatured ? 'text-neutral-300' : 'text-neutral-500 dark:text-neutral-400'}`}>
                        {subValue}
                    </span>
                )}
            </div>
            {change && !hideChange && (
                <div className="flex items-center gap-1 mt-2">
                    <span className={`flex items-center gap-0.5 text-sm font-semibold ${isFeatured
                        ? change.positive ? 'text-emerald-300' : 'text-red-300'
                        : change.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                        }`}>
                        {change.positive ? (
                            <ArrowUpRight className="w-4 h-4" strokeWidth={2} />
                        ) : (
                            <ArrowDownRight className="w-4 h-4" strokeWidth={2} />
                        )}
                        {change.value}
                    </span>
                    <span className={`text-xs ${isFeatured ? 'text-neutral-400' : 'text-neutral-400 dark:text-neutral-500'}`}>
                        {note}
                    </span>
                </div>
            )}
            {(!change || hideChange) && (
                <p className={`text-xs mt-2 ${isFeatured ? 'text-neutral-400' : 'text-neutral-400 dark:text-neutral-500'}`}>
                    {note}
                </p>
            )}
        </div>
    );
}

export default function StatsGrid() {
    const [mounted, setMounted] = useState(false);
    const { documents } = useDocumentStore();
    const { company } = useSettingsStore();

    useEffect(() => {
        setMounted(true);
    }, []);

    const currency = company.currency;

    const stats = useMemo(() => {
        if (!mounted) return [];
        // Total Revenue (Paid Invoices)
        const paidInvoices = documents.filter(d => d.type === 'invoice' && d.status === 'paid');
        const totalRevenue = paidInvoices.reduce((sum, doc) => sum + doc.grandTotal, 0);

        // Outstanding Invoices (Sent or Overdue)
        const outstandingInvoices = documents.filter(d => d.type === 'invoice' && (d.status === 'sent' || d.status === 'overdue'));
        const outstandingAmount = outstandingInvoices.reduce((sum, doc) => sum + doc.grandTotal, 0);
        const overdueCount = outstandingInvoices.filter(d => d.status === 'overdue').length;

        // Total Documents
        const totalDocs = documents.length;
        // Find most recent doc date
        const lastDoc = documents.length > 0
            ? documents.reduce((latest, doc) => new Date(doc.createdAt) > new Date(latest.createdAt) ? doc : latest)
            : null;

        const lastActivity = lastDoc ? `Last: ${new Date(lastDoc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'No documents yet';

        return [
            {
                title: 'Total Revenue',
                value: formatCurrency(totalRevenue, currency),
                change: { value: '0%', positive: true },
                note: 'Lifetime earnings',
                icon: <DollarSign className="w-5 h-5" strokeWidth={2} />,
                variant: 'featured',
                hideChange: true,
            },
            {
                title: 'Outstanding Invoices',
                value: outstandingInvoices.length.toString(),
                subValue: `(${formatCurrency(outstandingAmount, currency)})`,
                note: `${overdueCount} overdue`,
                icon: <Clock className="w-5 h-5" strokeWidth={2} />,
                variant: 'default',
            },
            {
                title: 'Documents Created',
                value: totalDocs.toString(),
                subValue: 'files',
                note: lastActivity,
                icon: <FileText className="w-5 h-5" strokeWidth={2} />,
                variant: 'default',
            },
        ] as StatCardProps[];
    }, [documents, currency, mounted]);

    if (!mounted) {
        return <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[140px]">
            {[1, 2, 3].map(i => (
                <div key={i} className="bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded-2xl p-6"></div>
            ))}
        </div>;
    }

    return (
        <section>
            <div className="flex items-end justify-between mb-5">
                <div>
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Overview</h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">Your financial summary</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href="/analytics"
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors text-sm font-medium text-neutral-600 dark:text-neutral-300"
                    >
                        <BarChart2 className="w-4 h-4" strokeWidth={2} />
                        <span>Analytics</span>
                    </Link>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-sm font-medium text-neutral-600 dark:text-neutral-300">
                        <TrendingUp className="w-4 h-4" strokeWidth={2} />
                        <span>Real-time</span>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stats.map((stat, index) => (
                    <StatCard key={index} {...stat} />
                ))}
            </div>
        </section>
    );
}
