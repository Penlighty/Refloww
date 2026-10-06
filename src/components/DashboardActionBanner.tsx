"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useProductStore, useDocumentStore, useSettingsStore, useOrganizationStore } from '@/lib/store';
import { calculateReorderMetrics } from '@/lib/utils/inventoryUtils';
import { formatCurrency } from '@/lib/utils';
import { AlertTriangle, Clock, ArrowRight, Package, DollarSign, CheckCircle2, ChevronDown, ChevronUp, Zap, X } from '@/components/icons';

import { Tag } from '@/components/ui';

export default function DashboardActionBanner() {
    const { products, getFilteredProducts } = useProductStore();
    const { documents, getFilteredDocuments } = useDocumentStore();
    const activeOrgId = useOrganizationStore((state) => state.activeOrganizationId);
    const company = useSettingsStore(state => state.company);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

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

    if (isDismissed || (!hasLowStock && !hasOverdue)) {
        return null; // Keep dashboard header clean when dismissed or no actions needed
    }

    return (
        <div className="panel bg-paper-2 border border-line rounded-panel p-3.5">
            {/* Header / Toggle Bar */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 sm:p-2 bg-paper border border-line text-ink rounded-ctl shrink-0">
                        <Zap className="size-4" />
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        <span className="text-xs font-bold text-ink truncate">
                            Actions Needed
                        </span>
                        {hasLowStock && (
                            <Tag tone="warning" icon={AlertTriangle}>
                                {lowStockItems.length} Low Stock
                            </Tag>
                        )}
                        {hasOverdue && (
                            <Tag tone="overdue" icon={Clock}>
                                {overdueData.count} Overdue
                            </Tag>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-ink bg-paper border border-line hover:bg-paper-3 rounded-ctl transition-colors cursor-pointer"
                    >
                        <span>{isExpanded ? 'Hide' : `Details (${totalActions})`}</span>
                        {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                    </button>

                    <button
                        type="button"
                        onClick={() => setIsDismissed(true)}
                        className="p-1.5 text-ink-muted hover:text-ink hover:bg-paper-3 rounded-ctl transition-colors"
                        title="Dismiss banner"
                    >
                        <X className="size-3.5" />
                    </button>
                </div>
            </div>

            {/* Expandable Decision Cards Container */}
            {isExpanded && (
                <div className="mt-3 pt-3 border-t border-line grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Low Stock Decision Card */}
                    {hasLowStock && (
                        <div className="p-3.5 bg-paper border border-line rounded-ctl flex flex-col justify-between">
                            <div className="flex items-start gap-2.5">
                                <div className="p-2 bg-paper-2 border border-line text-status-warning rounded-ctl shrink-0">
                                    <AlertTriangle className="size-4" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-ink">
                                        Restock Required
                                    </h4>
                                    <p className="text-[11px] text-ink-muted mt-0.5 leading-relaxed">
                                        <strong>{lowStockItems[0].name}</strong> ({lowStockItems[0].stockQuantity || 0} left) and {lowStockItems.length - 1 > 0 ? `${lowStockItems.length - 1} other item(s)` : 'this item'} are below reorder level.
                                    </p>
                                </div>
                            </div>
                            <div className="mt-2.5 pt-2 border-t border-line flex justify-end">
                                <Link
                                    href="/products"
                                    className="inline-flex items-center gap-1 text-xs font-bold text-primary-text hover:underline"
                                >
                                    <span>Restock Now</span>
                                    <ArrowRight className="size-3.5" />
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Overdue Collection Decision Card */}
                    {hasOverdue && (
                        <div className="p-3.5 bg-paper border border-line rounded-ctl flex flex-col justify-between">
                            <div className="flex items-start gap-2.5">
                                <div className="p-2 bg-paper-2 border border-line text-status-overdue rounded-ctl shrink-0">
                                    <Clock className="size-4" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-ink">
                                        Overdue Collection
                                    </h4>
                                    <p className="text-[11px] text-ink-muted mt-0.5 leading-relaxed">
                                        <strong className="money font-bold text-ink">{formatCurrency(overdueData.total, company.currency)}</strong> across {overdueData.count} invoice(s) needs collection follow-up.
                                    </p>
                                </div>
                            </div>
                            <div className="mt-2.5 pt-2 border-t border-line flex justify-end">
                                <Link
                                    href="/invoices"
                                    className="inline-flex items-center gap-1 text-xs font-bold text-status-overdue hover:underline"
                                >
                                    <span>Send Reminders</span>
                                    <ArrowRight className="size-3.5" />
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
