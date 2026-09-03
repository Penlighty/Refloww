import { Customer, Document } from '@/lib/types';

export interface CustomerSegmentMetrics {
    lifetimeSpend: number;
    completedOrdersCount: number;
    daysSinceLastPurchase: number | null;
    lastPurchaseDate: string | null;
    isHighValue: boolean;
    isRepeat: boolean;
    isDormant: boolean;
    badges: { label: string; icon: string; bgClass: string; textClass: string }[];
}

export function calculateCustomerSegmentMetrics(
    customer: Customer,
    allDocuments: Document[],
    allCustomers: Customer[] = []
): CustomerSegmentMetrics {
    // Filter documents for this customer
    const customerDocs = allDocuments.filter(
        d => d.customerId === customer.id && d.status !== 'cancelled'
    );

    const completedOrdersCount = customerDocs.length;

    const lifetimeSpend = customerDocs.reduce((sum, d) => {
        return sum + (d.grandTotal || 0);
    }, 0);

    // Sort docs by date descending
    const sortedDocs = [...customerDocs].sort(
        (a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()
    );

    const lastDoc = sortedDocs[0];
    const lastPurchaseDate = lastDoc ? (lastDoc.date || lastDoc.createdAt) : null;

    let daysSinceLastPurchase: number | null = null;
    if (lastPurchaseDate) {
        const diffMs = new Date().getTime() - new Date(lastPurchaseDate).getTime();
        daysSinceLastPurchase = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }

    // High value threshold: spend > 300,000 or top 15% spend
    const isHighValue = lifetimeSpend >= 300000;
    const isRepeat = completedOrdersCount >= 3;
    const isDormant = daysSinceLastPurchase !== null && daysSinceLastPurchase >= 60;

    const badges: { label: string; icon: string; bgClass: string; textClass: string }[] = [];

    if (isHighValue) {
        badges.push({
            label: 'High Value',
            icon: 'Award',
            bgClass: 'bg-amber-100 dark:bg-amber-950/60',
            textClass: 'text-amber-800 dark:text-amber-200'
        });
    }

    if (isRepeat) {
        badges.push({
            label: 'Repeat Customer',
            icon: 'RotateCcw',
            bgClass: 'bg-blue-100 dark:bg-blue-950/60',
            textClass: 'text-blue-800 dark:text-blue-200'
        });
    }

    if (isDormant) {
        badges.push({
            label: 'Dormant',
            icon: 'Clock',
            bgClass: 'bg-rose-100 dark:bg-rose-950/60',
            textClass: 'text-rose-800 dark:text-rose-200'
        });
    }

    return {
        lifetimeSpend,
        completedOrdersCount,
        daysSinceLastPurchase,
        lastPurchaseDate,
        isHighValue,
        isRepeat,
        isDormant,
        badges
    };
}
