import { StockBatch, InventoryStrategy, Document, Product, ReorderMetrics } from '@/lib/types';

/**
 * Auto-generates a unique batch number in format "BATCH-YYYYMMDD-XX"
 */
export function generateAutoBatchNumber(existingBatches: StockBatch[] = []): string {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const prefix = `BATCH-${dateStr}`;

    const sameDayBatches = existingBatches.filter(b => b.batchNumber.startsWith(prefix));
    const nextSeq = (sameDayBatches.length + 1).toString().padStart(2, '0');

    return `${prefix}-${nextSeq}`;
}

export interface BatchAllocation {
    batchId: string;
    batchNumber: string;
    allocatedQuantity: number;
    remainingAfter: number;
}

export interface StockAllocationResult {
    allocations: BatchAllocation[];
    totalAllocated: number;
    unfulfilledQuantity: number;
}

/**
 * Allocates requested quantity from available stock batches based on FIFO or FEFO rules.
 */
export function allocateStockFromBatches(
    batches: StockBatch[],
    quantityNeeded: number,
    strategy: InventoryStrategy = 'FEFO'
): StockAllocationResult {
    // Filter active batches with remaining quantity
    const activeBatches = batches
        .filter(b => b.status === 'active' && b.remainingQuantity > 0)
        .map(b => ({ ...b }));

    if (strategy === 'FEFO') {
        // Sort by expiry date ascending (earliest expiry first). Batches without expiry fall back to receivedDate.
        activeBatches.sort((a, b) => {
            if (a.expiryDate && b.expiryDate) {
                return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
            }
            if (a.expiryDate && !b.expiryDate) return -1;
            if (!a.expiryDate && b.expiryDate) return 1;
            return new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime();
        });
    } else {
        // FIFO: Sort by received date ascending (earliest received first)
        activeBatches.sort((a, b) => new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime());
    }

    const allocations: BatchAllocation[] = [];
    let remainingToAllocate = quantityNeeded;
    let totalAllocated = 0;

    for (const batch of activeBatches) {
        if (remainingToAllocate <= 0) break;

        const take = Math.min(batch.remainingQuantity, remainingToAllocate);
        if (take > 0) {
            allocations.push({
                batchId: batch.id,
                batchNumber: batch.batchNumber,
                allocatedQuantity: take,
                remainingAfter: batch.remainingQuantity - take,
            });

            totalAllocated += take;
            remainingToAllocate -= take;
        }
    }

    return {
        allocations,
        totalAllocated,
        unfulfilledQuantity: remainingToAllocate,
    };
}

/**
 * Calculates daily sales velocity for a product over a given days window (default 30 days).
 */
export function calculateSalesVelocity(
    productId: string,
    documents: Document[],
    daysWindow: number = 30
): number {
    if (!productId || !documents.length) return 0;

    const now = new Date();
    const cutoff = new Date(now.getTime() - daysWindow * 24 * 60 * 60 * 1000);

    let totalQuantitySold = 0;

    documents.forEach(doc => {
        // Count paid/sent invoices and receipts
        if (doc.status !== 'cancelled' && new Date(doc.date) >= cutoff) {
            doc.lineItems.forEach(item => {
                if (item.productId === productId) {
                    totalQuantitySold += item.quantity;
                }
            });
        }
    });

    const velocity = totalQuantitySold / daysWindow;
    return parseFloat(velocity.toFixed(2));
}

/**
 * Computes intelligent dynamic reorder point and metrics for a product.
 */
export function calculateReorderMetrics(
    product: Product,
    documents: Document[],
    daysWindow: number = 30
): ReorderMetrics {
    const dailySalesVelocity = calculateSalesVelocity(product.id, documents, daysWindow);
    const leadTimeDays = product.leadTimeDays || 7;       // Default 7 days lead time
    const safetyStockDays = product.safetyStockDays || 3; // Default 3 days buffer

    // Formula: ROP = (Velocity * LeadTime) + (Velocity * SafetyBuffer)
    const rawRop = (dailySalesVelocity * leadTimeDays) + (dailySalesVelocity * safetyStockDays);
    const staticMin = product.minReorderPoint || 5;

    // Calculated Reorder Point (greater of dynamic ROP or static min)
    const calculatedReorderPoint = Math.max(Math.ceil(rawRop), staticMin);

    const currentStock = product.stockQuantity ?? 0;
    const isReorderNeeded = currentStock <= calculatedReorderPoint;

    // Estimate days until stockout at current velocity
    const estimatedDaysUntilStockout = dailySalesVelocity > 0
        ? Math.round(currentStock / dailySalesVelocity)
        : currentStock > 0 ? 999 : 0;

    // Suggested reorder quantity (e.g. 30 days of sales stock - current stock)
    const target30DaysStock = Math.ceil(dailySalesVelocity * 30);
    const suggestedReorderQuantity = Math.max(
        target30DaysStock > 0 ? target30DaysStock - currentStock : 10,
        1
    );

    return {
        dailySalesVelocity,
        leadTimeDays,
        safetyStockDays,
        calculatedReorderPoint,
        suggestedReorderQuantity,
        estimatedDaysUntilStockout,
        isReorderNeeded,
    };
}

export type ExpiryStatusType = 'expired' | 'near_expiry' | 'healthy' | 'no_expiry';

export interface BatchExpiryInfo {
    status: ExpiryStatusType;
    daysRemaining: number | null;
    badgeClass: string;
    label: string;
}

/**
 * Returns expiry status and days remaining for a batch.
 */
export function getBatchExpiryStatus(
    expiryDate?: string,
    warningDays: number = 30
): BatchExpiryInfo {
    if (!expiryDate) {
        return {
            status: 'no_expiry',
            daysRemaining: null,
            badgeClass: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
            label: 'No Expiry',
        };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const exp = new Date(expiryDate);
    exp.setHours(0, 0, 0, 0);

    const diffTime = exp.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysRemaining <= 0) {
        return {
            status: 'expired',
            daysRemaining,
            badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border border-red-200 dark:border-red-800',
            label: daysRemaining === 0 ? 'Expires Today' : `Expired (${Math.abs(daysRemaining)}d ago)`,
        };
    }

    if (daysRemaining <= warningDays) {
        return {
            status: 'near_expiry',
            daysRemaining,
            badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
            label: `Expires in ${daysRemaining}d`,
        };
    }

    return {
        status: 'healthy',
        daysRemaining,
        badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        label: `${daysRemaining}d left`,
    };
}
