"use client";

import { useMemo } from 'react';
import Link from 'next/link';
import { useProductStore, useDocumentStore, useSettingsStore, useOrganizationStore } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, AlertCircle, Package, ArrowUpRight, Flame, Hourglass } from 'lucide-react';

export default function ProductVelocityWidget() {
    const { products, getFilteredProducts } = useProductStore();
    const { documents, getFilteredDocuments } = useDocumentStore();
    const company = useSettingsStore(state => state.company);
    const activeOrgId = useOrganizationStore(state => state.activeOrganizationId);

    const displayProducts = useMemo(() => getFilteredProducts(), [products, activeOrgId, getFilteredProducts]);
    const displayDocuments = useMemo(() => getFilteredDocuments(), [documents, activeOrgId, getFilteredDocuments]);

    const { bestsellers, slowMoving } = useMemo(() => {
        const productSales: Record<string, { unitsSold: number; revenue: number }> = {};

        // Aggregate units sold from invoices and receipts
        displayDocuments.forEach(doc => {
            if (doc.status === 'cancelled') return;
            doc.lineItems?.forEach(item => {
                if (!item.productId) return;
                if (!productSales[item.productId]) {
                    productSales[item.productId] = { unitsSold: 0, revenue: 0 };
                }
                productSales[item.productId].unitsSold += item.quantity || 0;
                productSales[item.productId].revenue += item.subtotal || 0;
            });
        });

        // Map physical products with sales data
        const mappedProducts = displayProducts
            .filter(p => !p.productType || p.productType === 'physical')
            .map(p => ({
                ...p,
                unitsSold: productSales[p.id]?.unitsSold || 0,
                revenue: productSales[p.id]?.revenue || 0,
            }));

        // Bestsellers (top units sold)
        const sortedBestsellers = [...mappedProducts]
            .filter(p => p.unitsSold > 0)
            .sort((a, b) => b.unitsSold - a.unitsSold)
            .slice(0, 3);

        // Slow-moving (lowest or 0 units sold with positive stock)
        const sortedSlowMoving = [...mappedProducts]
            .filter(p => (p.stockQuantity || 0) > 0)
            .sort((a, b) => a.unitsSold - b.unitsSold)
            .slice(0, 3);

        return {
            bestsellers: sortedBestsellers,
            slowMoving: sortedSlowMoving
        };
    }, [displayProducts, displayDocuments]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bestsellers Card */}
            <div className="bg-white dark:bg-neutral-800 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-700/70 shadow-sm flex flex-col justify-between">
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl">
                                <Flame className="w-4 h-4" />
                            </div>
                            <h3 className="text-sm font-bold text-[#2d3748] dark:text-white">
                                Top Bestsellers
                            </h3>
                        </div>
                        <Link href="/analytics" className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">
                            Analytics
                        </Link>
                    </div>

                    {bestsellers.length === 0 ? (
                        <div className="py-6 text-center text-xs text-neutral-400 dark:text-neutral-500">
                            No product sales logged yet.
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {bestsellers.map((item, idx) => (
                                <div key={item.id} className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-700/50 border border-neutral-100 dark:border-neutral-700/50">
                                    <div className="flex items-center gap-3">
                                        <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center justify-center">
                                            #{idx + 1}
                                        </span>
                                        <div>
                                            <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                                                {item.name}
                                            </p>
                                            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                                                {item.unitsSold} unit(s) sold
                                            </p>
                                        </div>
                                    </div>
                                    <span className="font-mono text-xs font-bold text-neutral-800 dark:text-neutral-200">
                                        {formatCurrency(item.revenue, company.currency)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Slow Moving Products Card */}
            <div className="bg-white dark:bg-neutral-800 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-700/70 shadow-sm flex flex-col justify-between">
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
                                <Hourglass className="w-4 h-4" />
                            </div>
                            <h3 className="text-sm font-bold text-[#2d3748] dark:text-white">
                                Slow-Moving Products
                            </h3>
                        </div>
                        <Link href="/products" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                            Products
                        </Link>
                    </div>

                    {slowMoving.length === 0 ? (
                        <div className="py-6 text-center text-xs text-neutral-400 dark:text-neutral-500">
                            No slow-moving inventory detected.
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {slowMoving.map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-700/50 border border-neutral-100 dark:border-neutral-700/50">
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-lg text-neutral-500 dark:text-neutral-400">
                                            <Package className="w-3.5 h-3.5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                                                {item.name}
                                            </p>
                                            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                                                {item.stockQuantity} in stock • {item.unitsSold} sold
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 font-medium">
                                        Clearance candidate
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
