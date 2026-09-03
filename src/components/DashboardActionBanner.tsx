"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useProductStore, useDocumentStore, useSettingsStore, useOrganizationStore } from '@/lib/store';
import { calculateReorderMetrics } from '@/lib/utils/inventoryUtils';
import { formatCurrency } from '@/lib/utils';
import { AlertTriangle, Clock, ArrowRight, Package, DollarSign, CheckCircle2, ChevronDown, ChevronUp, Zap } from 'lucide-react';

export default function DashboardActionBanner() {
    const { products, getFilteredProducts } = useProductStore();
    const { documents, getFilteredDocuments } = useDocumentStore();
    const activeOrgId = useOrganizationStore((state) => state.activeOrganizationId);
    const company = useSettingsStore(state => state.company);
    const [isExpanded, setIsExpanded] = useState(false);

    const displayProducts = useMemo(() => getFilteredProducts(), [products, activeOrgId, getFilteredProducts]);
    const displayDocuments = useMemo(() => getFilteredDocuments(), [documents, activeOrgId, getFilteredDocuments]);

    // Calculate low stock items
    const lowStockItems = useMemo(() => {
        return displayProducts.filter(p => {
            if (p.productType && p.productType !== 'physical') return false;
            const metrics = calculateReorderMetrics(p, displayDocuments);
            return metrics.isReorderNeeded;
        });
    }, [displayProducts, displayDocuments]);

    // Calculate overdue invoices and total amount
    const overdueData = useMemo(() => {
        const overdueDocs = displayDocuments.filter(d => d.status === 'overdue');
        const totalOverdue = overdueDocs.reduce((sum, d) => {
            const due = (d.grandTotal || 0) - (d.amountPaid || 0);
            return sum + Math.max(0, due);
        }, 0);
        return {
            count: overdueDocs.length,
            total: totalOverdue,
            docs: overdueDocs
        };
    }, [displayDocuments]);

    const hasLowStock = lowStockItems.length > 0;
    const hasOverdue = overdueData.count > 0;
    const totalActions = (hasLowStock ? 1 : 0) + (hasOverdue ? 1 : 0);

    if (!hasLowStock && !hasOverdue) {
        return null; // Keep dashboard header clean when no actions needed
    }

    return (
        <div className="bg-white dark:bg-neutral-800 border border-amber-200/80 dark:border-amber-900/60 rounded-2xl p-3.5 shadow-sm transition-all duration-200">
            {/* Header / Toggle Bar */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
                        <Zap className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="text-xs font-bold text-neutral-900 dark:text-white">
                            Operational Actions Needed
                        </span>
                        {hasLowStock && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                <span>{lowStockItems.length} Low Stock</span>
                            </span>
                        )}
                        {hasOverdue && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{overdueData.count} Overdue</span>
                            </span>
                        )}
                    </div>
                </div>

                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-xl transition-colors shrink-0 cursor-pointer"
                >
                    <span>{isExpanded ? 'Hide Details' : `View Details (${totalActions})`}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
            </div>

            {/* Expandable Decision Cards Container */}
            {isExpanded && (
                <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700/60 grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Low Stock Decision Card */}
                    {hasLowStock && (
                        <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 rounded-xl flex flex-col justify-between">
                            <div className="flex items-start gap-2.5">
                                <div className="p-2 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-lg shrink-0">
                                    <AlertTriangle className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                                        Restock Required
                                    </h4>
                                    <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
                                        <strong>{lowStockItems[0].name}</strong> ({lowStockItems[0].stockQuantity || 0} left) and {lowStockItems.length - 1 > 0 ? `${lowStockItems.length - 1} other item(s)` : 'this item'} are below reorder level.
                                    </p>
                                </div>
                            </div>
                            <div className="mt-2.5 pt-2 border-t border-amber-200/50 dark:border-amber-800/40 flex justify-end">
                                <Link
                                    href="/products"
                                    className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 dark:text-amber-200 hover:underline"
                                >
                                    <span>Restock Now</span>
                                    <ArrowRight className="w-3 h-3" />
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Overdue Collection Decision Card */}
                    {hasOverdue && (
                        <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/60 rounded-xl flex flex-col justify-between">
                            <div className="flex items-start gap-2.5">
                                <div className="p-2 bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 rounded-lg shrink-0">
                                    <Clock className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200">
                                        Overdue Collection
                                    </h4>
                                    <p className="text-[11px] text-rose-800 dark:text-rose-300 mt-0.5 leading-relaxed">
                                        <strong className="font-mono">{formatCurrency(overdueData.total, company.currency)}</strong> across {overdueData.count} invoice(s) needs collection follow-up.
                                    </p>
                                </div>
                            </div>
                            <div className="mt-2.5 pt-2 border-t border-rose-200/50 dark:border-rose-800/40 flex justify-end">
                                <Link
                                    href="/invoices"
                                    className="inline-flex items-center gap-1 text-xs font-bold text-rose-900 dark:text-rose-200 hover:underline"
                                >
                                    <span>Send Reminders</span>
                                    <ArrowRight className="w-3 h-3" />
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
