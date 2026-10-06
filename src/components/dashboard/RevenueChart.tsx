"use client";

import { useMemo } from 'react';
import { useDocumentStore, useSettingsStore, useTemplateStore, useOrganizationStore, useTransactionStore } from '@/lib/store';
import { TrendingUp, TrendingDown, Minus } from '@/components/icons';
import { formatCurrency, getEffectiveGrandTotal } from '@/lib/utils';

interface ChartDataPoint {
    date: string;
    label: string;
    revenue: number;
}

export default function RevenueChart() {
    const { documents, getFilteredDocuments } = useDocumentStore();
    const { transactions, getFilteredTransactions } = useTransactionStore();
    const { company } = useSettingsStore();
    const activeOrgId = useOrganizationStore(state => state.activeOrganizationId);
    const currency = company.currency;

    const displayDocuments = useMemo(() => getFilteredDocuments(), [documents, activeOrgId, getFilteredDocuments]);
    const activeTransactions = useMemo(() => getFilteredTransactions(), [transactions, activeOrgId, getFilteredTransactions]);

    // Calculate last 7 days revenue data
    const chartData = useMemo(() => {
        const today = new Date();
        const data: ChartDataPoint[] = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            // Get cash revenue for this day from transactions
            const dayRevenue = activeTransactions
                .filter(t => t.date && t.date.split('T')[0] === dateStr)
                .reduce((sum, t) => sum + (t.amountPaid || 0), 0);

            data.push({
                date: dateStr,
                label: date.toLocaleDateString('en-US', { weekday: 'short' }),
                revenue: dayRevenue
            });
        }

        return data;
    }, [activeTransactions]);

    // Calculate stats
    const stats = useMemo(() => {
        const totalRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0);
        const maxRevenue = Math.max(...chartData.map(d => d.revenue), 1); // Min 1 to avoid division by zero

        // Compare to previous week (simplified - just compare first and last half)
        const firstHalf = chartData.slice(0, 3).reduce((sum, d) => sum + d.revenue, 0);
        const secondHalf = chartData.slice(4).reduce((sum, d) => sum + d.revenue, 0);
        const trend = secondHalf - firstHalf;
        const trendPercent = firstHalf > 0 ? ((trend / firstHalf) * 100).toFixed(0) : 0;

        return { totalRevenue, maxRevenue, trend, trendPercent };
    }, [chartData]);

    const TrendIcon = stats.trend > 0 ? TrendingUp : stats.trend < 0 ? TrendingDown : Minus;
    const trendColor = stats.trend > 0 ? 'text-status-paid' : stats.trend < 0 ? 'text-status-overdue' : 'text-ink-muted';

    return (
        <div className="panel bg-paper border border-line rounded-panel p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-sm font-bold font-display text-ink">Revenue Trend</h3>
                    <p className="text-xs text-ink-muted">Last 7 days</p>
                </div>
                <div className="flex items-center gap-1.5">
                    <TrendIcon className={`size-4 ${trendColor}`} />
                    <span className={`text-sm font-bold ${trendColor}`}>
                        {stats.trend >= 0 ? '+' : ''}{stats.trendPercent}%
                    </span>
                </div>
            </div>

            {/* Chart */}
            <div className="flex items-end gap-2 h-32">
                {chartData.map((day, index) => {
                    const height = stats.maxRevenue > 0
                        ? Math.max((day.revenue / stats.maxRevenue) * 100, 4)
                        : 4;
                    const isToday = index === chartData.length - 1;

                    return (
                        <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                            <div
                                className="w-full relative group"
                                style={{ height: '100%' }}
                            >
                                {/* Bar */}
                                <div
                                    className={`absolute bottom-0 left-0 right-0 rounded-t-ctl transition-colors ${isToday
                                        ? 'bg-primary-500'
                                        : 'bg-paper-2 border-t border-x border-line group-hover:bg-paper-3'
                                        }`}
                                    style={{ height: `${height}%` }}
                                />

                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                    <div className="bg-ink text-paper text-caption money px-2 py-1 rounded-ctl whitespace-nowrap shadow-pop">
                                        {formatCurrency(day.revenue, currency)}
                                    </div>
                                </div>
                            </div>
                            <span className={`text-xs ${isToday ? 'font-bold text-primary-text' : 'text-ink-muted'}`}>
                                {day.label}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Summary */}
            <div className="mt-4 pt-4 border-t border-line flex items-center justify-between">
                <span className="text-xs text-ink-muted">Total this week</span>
                <span className="text-sm font-bold money text-ink">
                    {formatCurrency(stats.totalRevenue, currency)}
                </span>
            </div>
        </div>
    );
}
