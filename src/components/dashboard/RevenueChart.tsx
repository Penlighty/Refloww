"use client";

import { useMemo } from 'react';
import { useDocumentStore, useSettingsStore } from '@/lib/store';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface ChartDataPoint {
    date: string;
    label: string;
    revenue: number;
}

export default function RevenueChart() {
    const { documents } = useDocumentStore();
    const { company } = useSettingsStore();
    const currency = company.currency;

    // Calculate last 7 days revenue data
    const chartData = useMemo(() => {
        const today = new Date();
        const data: ChartDataPoint[] = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            // Get revenue for this day (paid invoices only)
            const dayRevenue = documents
                .filter(doc =>
                    doc.status === 'paid' &&
                    doc.date.split('T')[0] === dateStr
                )
                .reduce((sum, doc) => sum + doc.grandTotal, 0);

            data.push({
                date: dateStr,
                label: date.toLocaleDateString('en-US', { weekday: 'short' }),
                revenue: dayRevenue
            });
        }

        return data;
    }, [documents]);

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
    const trendColor = stats.trend > 0 ? 'text-emerald-500' : stats.trend < 0 ? 'text-red-500' : 'text-neutral-400';

    return (
        <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-6 transition-colors">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-sm font-semibold text-[#2d3748] dark:text-white">Revenue Trend</h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Last 7 days</p>
                </div>
                <div className="flex items-center gap-1.5">
                    <TrendIcon className={`w-4 h-4 ${trendColor}`} />
                    <span className={`text-sm font-medium ${trendColor}`}>
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
                                    className={`absolute bottom-0 left-0 right-0 rounded-t-lg transition-all duration-300 ${isToday
                                        ? 'bg-gradient-to-t from-blue-500 to-blue-400'
                                        : 'bg-gradient-to-t from-neutral-200 dark:from-neutral-600 to-neutral-100 dark:to-neutral-500 group-hover:from-blue-300 group-hover:to-blue-200 dark:group-hover:from-blue-600 dark:group-hover:to-blue-500'
                                        }`}
                                    style={{ height: `${height}%` }}
                                />

                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                    <div className="bg-[#2d3748] dark:bg-neutral-700 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                        {formatCurrency(day.revenue, currency)}
                                    </div>
                                </div>
                            </div>
                            <span className={`text-xs ${isToday ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-neutral-400 dark:text-neutral-500'}`}>
                                {day.label}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Summary */}
            <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-700 flex items-center justify-between">
                <span className="text-xs text-neutral-500 dark:text-neutral-400">Total this week</span>
                <span className="text-sm font-bold text-[#2d3748] dark:text-white">
                    {formatCurrency(stats.totalRevenue, currency)}
                </span>
            </div>
        </div>
    );
}
