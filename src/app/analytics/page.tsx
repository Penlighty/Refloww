"use client";
// Force Next.js dev server compilation trigger for analytics page


import React, { useMemo, useState } from 'react';
import { useDocumentStore, useSettingsStore, useTemplateStore, useOrganizationStore, useTransactionStore } from '@/lib/store';
import { formatCurrency, getEffectiveGrandTotal, calculatePaymentSpeedDistribution } from '@/lib/utils';
import { X, Lightbulb, DollarSign, Clock, FileText, Zap, TrendingUp } from 'lucide-react';
import { DocumentStatus } from '@/lib/types';
import RevenueChart from "@/components/dashboard/RevenueChart";
import ProductVelocityWidget from "@/components/ProductVelocityWidget";
import { PageHelpModal } from '@/components/ui';

// ==========================================
// Types & Interfaces
// ==========================================

interface SummaryMetric {
    label: string;
    value: string;
    description: string;
    icon: React.ReactNode;
    variant?: 'featured' | 'default';
    colorClass?: string;
}

// ==========================================
// Helper Components
// ==========================================

function SummaryCard({ metric }: { metric: SummaryMetric }) {
    const isFeatured = metric.variant === 'featured';

    return (
        <div className={`${isFeatured
            ? 'bg-gradient-to-br from-[#1A2232] via-[#222C3E] to-[#121722] text-white border border-neutral-700/60 shadow-md p-5 sm:p-6'
            : 'bg-white dark:bg-[#121620] border border-neutral-200/90 dark:border-neutral-800/80 shadow-xs p-3.5 sm:p-5 hover:border-neutral-300 dark:hover:border-neutral-700'
            } rounded-2xl transition-all duration-200`}>
            <div className="flex items-center justify-between mb-2">
                <p className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wider ${isFeatured ? 'text-neutral-300' : 'text-neutral-500 dark:text-neutral-400'}`}>
                    {metric.label}
                </p>
                <div className={`p-1.5 sm:p-2 rounded-xl ${isFeatured
                    ? 'bg-[#16A86B]/20 text-[#16A86B]'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                    }`}>
                    {metric.icon}
                </div>
            </div>
            <div className="flex flex-col gap-0.5">
                <h3 className={`${isFeatured ? 'text-2xl sm:text-3xl md:text-4xl text-[#16A86B]' : 'text-sm sm:text-lg md:text-xl text-neutral-900 dark:text-white'} font-extrabold font-money tracking-tight`}>
                    {metric.value}
                </h3>
                <p className={`text-[10px] sm:text-xs mt-1 ${isFeatured ? 'text-neutral-400' : 'text-neutral-400 dark:text-neutral-500'}`}>
                    {metric.description}
                </p>
            </div>
        </div>
    );
}

function StatusDonut({ counts }: { counts: Record<DocumentStatus, number> }) {
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const statuses: DocumentStatus[] = ['draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled'];
    const colors: Record<DocumentStatus, string> = {
        draft: '#e5e5e5',   // neutral-200
        sent: '#3b82f6',    // blue-500
        paid: '#10b981',    // emerald-500
        partially_paid: '#f59e0b', // amber-500
        overdue: '#ef4444', // red-500
        cancelled: '#737373' // neutral-500
    };

    if (total === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-neutral-400">
                <div className="w-32 h-32 rounded-full border-4 border-neutral-100 dark:border-neutral-800 mb-4"></div>
                <p className="text-sm">No data yet</p>
            </div>
        );
    }

    let cumulativePercent = 0;
    // Using Conic Gradient for the donut chart as it's cleaner in pure CSS/Tailwind than complex SVG calculations
    const conicGradient = statuses.map(s => {
        const count = counts[s] || 0;
        const percent = (count / total) * 100;
        return `${colors[s]} 0 ${percent}%`;
    }).join(', ');

    // Constructing complex conic gradient string
    let gradientString = 'conic-gradient(';
    let currentAngle = 0;
    statuses.forEach(s => {
        const count = counts[s] || 0;
        const percent = (count / total) * 360; // degrees
        if (percent > 0) {
            gradientString += `${colors[s]} ${currentAngle}deg ${currentAngle + percent}deg, `;
            currentAngle += percent;
        }
    });
    gradientString = gradientString.replace(/, $/, ')');

    return (
        <div className="flex flex-col sm:flex-row items-center gap-8">
            <div className="relative w-40 h-40 shrink-0">
                <div
                    className="w-full h-full rounded-full"
                    style={{ background: gradientString }}
                />
                <div className="absolute inset-4 bg-white dark:bg-neutral-800 rounded-full flex items-center justify-center">
                    <div className="text-center">
                        <span className="block text-2xl font-bold text-neutral-900 dark:text-white">{total}</span>
                        <span className="text-xs text-neutral-500 uppercase tracking-wider">Invoices</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 w-full space-y-3">
                {statuses.map(status => {
                    const count = counts[status] || 0;
                    if (count === 0 && status === 'cancelled') return null; // Only hide cancelled if 0
                    return (
                        <div key={status} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <span className="w-2 md:w-3 h-2 md:h-3 rounded-full" style={{ backgroundColor: colors[status] }}></span>
                                <span className="capitalize text-neutral-600 dark:text-neutral-300">{status}</span>
                            </div>
                            <span className="font-semibold text-neutral-900 dark:text-white">{count}</span>
                        </div>
                    )
                })}
            </div>
        </div>
    );
}

function HintCard({ title, description, badge, onClose }: { title: string, description: string, badge?: string, onClose: () => void }) {
    return (
        <div className="relative group bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/20 dark:to-neutral-800 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
            <button
                onClick={onClose}
                className="absolute top-3 right-3 p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-4">
                <div className="p-2 bg-white dark:bg-indigo-900/50 rounded-xl text-indigo-500 dark:text-indigo-300 shadow-sm">
                    <Lightbulb className="w-5 h-5" strokeWidth={2} />
                </div>
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-neutral-900 dark:text-white">{title}</h4>
                        {badge && <span className="text-[10px] uppercase font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/50 px-1.5 py-0.5 rounded">{badge}</span>}
                    </div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{description}</p>
                </div>
            </div>
        </div>
    );
}

// ==========================================
// Main Page Component
// ==========================================

export default function AnalyticsPage() {
    const { documents, getFilteredDocuments } = useDocumentStore();
    const { transactions, getFilteredTransactions } = useTransactionStore();
    const { company } = useSettingsStore();
    const { getTemplateById } = useTemplateStore();
    const activeOrgId = useOrganizationStore((state) => state.activeOrganizationId);
    const [hiddenHints, setHiddenHints] = useState<string[]>([]);

    const displayDocuments = useMemo(() => getFilteredDocuments(), [documents, activeOrgId, getFilteredDocuments]);
    const activeTransactions = useMemo(() => getFilteredTransactions(), [transactions, activeOrgId, getFilteredTransactions]);

    // ------------------------------------------
    // Logic extraction
    // ------------------------------------------
    const paymentSpeed = useMemo(() => {
        return calculatePaymentSpeedDistribution(displayDocuments);
    }, [displayDocuments]);

    const metrics = useMemo(() => {
        const invoices = displayDocuments.filter(d => d.type === 'invoice');
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // 1. Money Received (This Month) - collected cash across all transactions
        const paidThisMonth = activeTransactions.filter(t => {
            const dateStr = t.date;
            return dateStr && new Date(dateStr) >= startOfMonth;
        }).reduce((acc, t) => acc + (t.amountPaid || 0), 0);

        // 2. Money Waiting (Unpaid & Partially Paid Balance Due)
        const waiting = activeTransactions.filter(t =>
            t.paymentStatus === 'unpaid' || t.paymentStatus === 'partially_paid'
        ).reduce((acc, t) => acc + (t.amountDue || 0), 0);

        // 3. Invoices Sent / Issued (Active, not draft)
        const sentCount = displayDocuments.filter(d => d.type === 'invoice' && d.status !== 'draft').length;

        // 4. Avg Time to Pay (Invoices)
        const paidInvoices = invoices.filter(d => d.status === 'paid' && d.paidAt);
        let updatedAvgDays = 0;
        if (paidInvoices.length > 0) {
            const totalMilliseconds = paidInvoices.reduce((acc, d) => {
                const created = new Date(d.createdAt).getTime();
                const paid = new Date(d.paidAt!).getTime();
                return acc + (paid - created);
            }, 0);
            updatedAvgDays = Math.round((totalMilliseconds / paidInvoices.length) / (1000 * 60 * 60 * 24));
        }

        return {
            paidThisMonth,
            waiting,
            sentCount,
            avgDays: updatedAvgDays
        };
    }, [displayDocuments, activeTransactions]);

    const summaryMetrics: SummaryMetric[] = [
        {
            label: 'Money Received',
            value: formatCurrency(metrics.paidThisMonth, company.currency),
            description: 'This month',
            icon: <DollarSign className="w-4 h-4" strokeWidth={2} />,
            variant: 'featured'
        },
        {
            label: 'Money Waiting',
            value: formatCurrency(metrics.waiting, company.currency),
            description: 'Sent & Overdue Invoices',
            icon: <Clock className="w-4 h-4" strokeWidth={2} />
        },
        {
            label: 'Invoices Sent',
            value: metrics.sentCount.toString(),
            description: 'All time active',
            icon: <FileText className="w-4 h-4" strokeWidth={2} />
        },
        {
            label: 'Avg Payment Time',
            value: `${metrics.avgDays} Days`,
            description: 'From sent to paid',
            icon: <Zap className="w-4 h-4" strokeWidth={2} />
        }
    ];

    const statusCounts = useMemo(() => {
        return displayDocuments.reduce((acc, d) => {
            const effectiveStatus = (d.type === 'receipt' && d.status === 'draft') ? 'paid' : d.status;
            acc[effectiveStatus] = (acc[effectiveStatus] || 0) + 1;
            return acc;
        }, {} as Record<DocumentStatus, number>);
    }, [displayDocuments]);

    const customerInsights = useMemo(() => {
        const customerMap: Record<string, { name: string, total: number, count: number }> = {};

        displayDocuments.forEach(d => {
            if (d.status === 'paid') {
                if (!customerMap[d.customerId]) {
                    customerMap[d.customerId] = { name: d.customerName, total: 0, count: 0 };
                }
                customerMap[d.customerId].total += getEffectiveGrandTotal(d, getTemplateById(d.templateId));
                customerMap[d.customerId].count += 1;
            }
        });

        const sorted = Object.values(customerMap).sort((a, b) => b.total - a.total).slice(0, 5);

        // Late payers
        const latePayersCount = new Set(
            displayDocuments
                .filter(d => {
                    if (d.type !== 'invoice') return false;
                    if (d.status === 'overdue') return true;
                    if (d.paidAt && d.dueDate) {
                        const dueEnd = new Date(d.dueDate.includes('T') ? d.dueDate : `${d.dueDate}T23:59:59`).getTime();
                        const paidTime = new Date(d.paidAt).getTime();
                        return paidTime > dueEnd;
                    }
                    return false;
                })
                .map(d => d.customerId)
        ).size;

        return { top: sorted, lateCount: latePayersCount };
    }, [displayDocuments, getTemplateById]);

    const productInsights = useMemo(() => {
        const productStats: Record<string, { name: string, count: number, prices: number[] }> = {};

        displayDocuments.forEach(d => {
            if (d.status === 'paid') {
                d.lineItems.forEach(item => {
                    // Use productName or description as key
                    const key = item.productName || item.description;
                    if (!key) return;

                    if (!productStats[key]) {
                        productStats[key] = { name: key, count: 0, prices: [] };
                    }
                    productStats[key].count += item.quantity;
                    productStats[key].prices.push(item.unitPrice);
                });
            }
        });

        const topProducts = Object.values(productStats)
            .sort((a, b) => b.count - a.count)
            .slice(0, 3)
            .map(p => ({
                name: p.name,
                count: p.count,
                minPrice: Math.min(...p.prices),
                maxPrice: Math.max(...p.prices)
            }));

        return topProducts;
    }, [displayDocuments]);

    // Hints Logic
    const generatedHints = useMemo(() => {
        const hints = [];

        // Hint 1: Overdue
        const overdueCount = displayDocuments.filter(d => d.type === 'invoice' && d.status === 'overdue').length;
        if (overdueCount > 0) {
            hints.push({
                id: 'overdue-hint',
                title: 'Follow up needed',
                description: `You have ${overdueCount} overdue invoice${overdueCount > 1 ? 's' : ''}. Consider sending a friendly reminder.`,
                badge: 'Action'
            });
        }

        // Hint 2: Drafts
        const draftCount = displayDocuments.filter(d => d.type === 'invoice' && d.status === 'draft').length;
        if (draftCount > 2) {
            hints.push({
                id: 'draft-hint',
                title: 'Unsent Work',
                description: `You have ${draftCount} drafts waiting. Sending them sooner improves cashflow.`,
            });
        }

        // Hint 3: Positive reinforcement or Tip
        if (metrics.paidThisMonth > 0) {
            hints.push({
                id: 'success-hint',
                title: 'Great Month!',
                description: `You've collected ${formatCurrency(metrics.paidThisMonth, company.currency)} this month. Keep up the momentum.`,
            });
        } else if (metrics.waiting > 0) {
            hints.push({
                id: 'waiting-hint',
                title: 'Pending Payments',
                description: `You have ${formatCurrency(metrics.waiting, company.currency)} in pending invoices. Check your due dates.`,
            });
        }

        return hints.filter(h => !hiddenHints.includes(h.id)).slice(0, 3);
    }, [displayDocuments, metrics, hiddenHints, company.currency]);

    return (
        <main className="max-w-6xl mx-auto pb-20">
            {/* Header */}
            <header className="mb-6">
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white">Analytics</h1>
                    <PageHelpModal
                        title="Revenue & Cashflow Analytics"
                        description="Detailed insights into monthly revenue streams, pending payments, payment speed trends, top customers, and best-selling products."
                        terms={[
                            { term: 'Money Received', definition: 'Total paid invoice revenue collected this month.' },
                            { term: 'Money Waiting', definition: 'Sum of active invoices currently pending payment or overdue.' },
                            { term: 'Average Payment Time', definition: 'Average number of days clients take to pay from the date an invoice is issued.' }
                        ]}
                    />
                </div>
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">Quiet insights to help you invoice better.</p>
            </header>

            {/* 1. Top Summary Cards (Compressed 3-column row on mobile) */}
            <section className="flex flex-col md:grid md:grid-cols-4 gap-3 md:gap-4 mb-8">
                {/* Money Received (Hero card) */}
                <div className="w-full md:col-span-1">
                    <SummaryCard metric={summaryMetrics[0]} />
                </div>
                {/* Money Waiting, Invoices Sent, Avg Payment Time (Side by Side on mobile) */}
                <div className="w-full md:col-span-3 grid grid-cols-3 gap-2.5 sm:gap-4">
                    {summaryMetrics.slice(1).map((metric, index) => (
                        <SummaryCard key={index} metric={metric} />
                    ))}
                </div>
            </section>

            {/* Revenue Trend - Moved from Dashboard */}
            <section className="mb-12">
                <RevenueChart />
            </section>

            {/* Product Velocity: Top Bestsellers & Slow Moving */}
            <section className="mb-12">
                <ProductVelocityWidget />
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                {/* 2. Invoice Flow */}
                <section className="lg:col-span-2 bg-white dark:bg-neutral-800 p-6 rounded-2xl border border-neutral-100 dark:border-neutral-700">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Invoice Flow</h2>
                            <p className="text-sm text-neutral-500">Where are your invoices right now?</p>
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row gap-12">
                        <div className="flex-1">
                            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">Status Breakdown</h3>
                            <StatusDonut counts={statusCounts} />
                        </div>
                        <div className="flex-1 border-t md:border-t-0 md:border-l border-neutral-100 dark:border-neutral-700 pt-6 md:pt-0 md:pl-8">
                            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">Payment Speed</h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-neutral-600 dark:text-neutral-300">Fast (&le; 7 days)</span>
                                        <span className="font-medium text-neutral-900 dark:text-white">
                                            {paymentSpeed.fastCount} ({paymentSpeed.fastPercent}%)
                                        </span>
                                    </div>
                                    <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-400 transition-all duration-500"
                                            style={{ width: `${paymentSpeed.fastPercent}%` }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-neutral-600 dark:text-neutral-300">Average (8–30 days)</span>
                                        <span className="font-medium text-neutral-900 dark:text-white">
                                            {paymentSpeed.avgCount} ({paymentSpeed.avgPercent}%)
                                        </span>
                                    </div>
                                    <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-400 transition-all duration-500"
                                            style={{ width: `${paymentSpeed.avgPercent}%` }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-neutral-600 dark:text-neutral-300">Slow (&gt; 30 days)</span>
                                        <span className="font-medium text-neutral-900 dark:text-white">
                                            {paymentSpeed.slowCount} ({paymentSpeed.slowPercent}%)
                                        </span>
                                    </div>
                                    <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-orange-400 transition-all duration-500"
                                            style={{ width: `${paymentSpeed.slowPercent}%` }}
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-neutral-400 mt-2">
                                    {paymentSpeed.totalPaidInvoices > 0
                                        ? `Based on ${paymentSpeed.totalPaidInvoices} paid invoice(s). Overall avg payment time: ${paymentSpeed.avgDaysOverall} day(s).`
                                        : 'No paid invoice history yet to calculate payment speeds.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 5. Smart Hints (Stacked to right on large screens) */}
                <section className="space-y-4">
                    <div className="mb-4">
                        <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Smart Hints</h2>
                        <p className="text-sm text-neutral-500">Suggestions to improve cashflow</p>
                    </div>
                    {generatedHints.length > 0 ? (
                        generatedHints.map(hint => (
                            <HintCard
                                key={hint.id}
                                {...hint}
                                onClose={() => setHiddenHints(prev => [...prev, hint.id])}
                            />
                        ))
                    ) : (
                        <div className="p-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl text-center">
                            <p className="text-sm text-neutral-500">Everything looks good! No new suggestions.</p>
                        </div>
                    )}
                </section>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 3. Customers */}
                <section className="bg-white dark:bg-neutral-800 p-6 rounded-2xl border border-neutral-100 dark:border-neutral-700">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Customers</h2>
                            <p className="text-sm text-neutral-500">Who contributes to cashflow</p>
                        </div>
                        <div className="px-3 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-xs font-semibold rounded-full">
                            {customerInsights.lateCount} pay late usually
                        </div>
                    </div>
                    <div className="space-y-4">
                        {customerInsights.top.length > 0 ? customerInsights.top.map((c, i) => (
                            <div key={i} className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center text-xs font-bold text-neutral-500">
                                        {c.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <span className="font-medium text-neutral-700 dark:text-neutral-200 group-hover:text-neutral-900 transition-colors">
                                        {c.name}
                                    </span>
                                </div>
                                <span className="font-bold text-neutral-900 dark:text-white">
                                    {formatCurrency(c.total, company.currency)}
                                </span>
                            </div>
                        )) : (
                            <p className="text-sm text-neutral-400">No customer payment data yet.</p>
                        )}
                    </div>
                </section>

                {/* 4. Products / Services */}
                <section className="bg-white dark:bg-neutral-800 p-6 rounded-2xl border border-neutral-100 dark:border-neutral-700">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Products</h2>
                            <p className="text-sm text-neutral-500">What you sell most</p>
                        </div>
                    </div>
                    <div className="space-y-5">
                        {productInsights.length > 0 ? productInsights.map((p, i) => (
                            <div key={i}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium text-neutral-700 dark:text-neutral-200">{p.name}</span>
                                    <span className="text-sm font-semibold text-neutral-900 dark:text-white">{p.count} sold</span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-neutral-400">
                                    <span>Typical price range</span>
                                    <span>
                                        {formatCurrency(p.minPrice, company.currency)} - {formatCurrency(p.maxPrice, company.currency)}
                                    </span>
                                </div>
                            </div>
                        )) : (
                            <p className="text-sm text-neutral-400">No product sales data yet.</p>
                        )}
                    </div>
                </section>
            </div>
        </main>
    );
}
