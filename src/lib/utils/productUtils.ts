import { Product } from '@/lib/types';
import { generateDocumentNumber } from '@/lib/utils/numbering';

export const generateSkuFromCategory = (category: string, products: Product[], formatStr: string = 'SKU-####'): string => {
    if (!category || category.length < 3) return '';

    // If format doesn't have sequence, return as is (or handle error)
    if (!formatStr.includes('#')) return formatStr;

    // 1. Prepare Regex to find existing items matching this format
    // We need to replace user-tokens with specific values for this category, 
    // but keep the #### as a capture group (\d+)

    const catPrefix = category.substring(0, 3).toUpperCase();

    // Create a regex pattern from the format string
    // Escape special regex chars, then replace tokens
    let regexPattern = formatStr
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape regex chars
        .replace(/CAT/g, catPrefix)              // Fix category for this specific check
        .replace(/YYYY/g, '\\d{4}')              // Allow any year
        .replace(/MM/g, '\\d{2}')                // Allow any month
        .replace(/DD/g, '\\d{2}')                // Allow any day
        .replace(/#+/g, '(\\d+)');               // Capture the number

    const pattern = new RegExp(`^${regexPattern}$`);

    let maxNumber = 0;

    products.forEach(p => {
        const match = p.sku.match(pattern);
        if (match) {
            // The capture group should be the number
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNumber) {
                maxNumber = num;
            }
        }
    });

    // 2. Generate next number
    const nextNumber = maxNumber + 1;

    // 3. Return formatted string
    return generateDocumentNumber(formatStr, nextNumber, {
        details: { category }
    });
};

export interface StockColorCue {
    badgeClass: string;
    dotClass: string;
    label: string;
    shortLabel: string;
    status: 'green' | 'amber' | 'red' | 'unlimited';
}

export const getStockColorCue = (
    stockQty: number | undefined,
    minReorderPoint: number = 5,
    isService: boolean = false
): StockColorCue => {
    if (isService) {
        return {
            badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-bold',
            dotClass: 'bg-emerald-500',
            label: 'Unlimited (Service)',
            shortLabel: 'Unlimited',
            status: 'unlimited'
        };
    }

    const qty = stockQty ?? 0;
    const limit = minReorderPoint || 5;

    // 1. RED: Below or equal to set limit to restock (or 0)
    if (qty <= limit) {
        return {
            badgeClass: 'bg-red-100 text-red-700 dark:bg-red-950/90 dark:text-red-300 border border-red-200 dark:border-red-800/60 font-bold shadow-sm',
            dotClass: 'bg-red-500 animate-pulse',
            label: qty === 0 ? 'Out of Stock (0)' : `Below Limit (${qty}/${limit})`,
            shortLabel: qty === 0 ? 'Out of Stock (0)' : `Below Limit (${qty})`,
            status: 'red'
        };
    }

    // 2. AMBER: Getting low to limit (nearing limit threshold)
    const lowThreshold = Math.max(limit + 5, Math.ceil(limit * 1.8));
    if (qty <= lowThreshold) {
        return {
            badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/90 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-bold shadow-sm',
            dotClass: 'bg-amber-500',
            label: `Getting Low (${qty}/${limit})`,
            shortLabel: `Getting Low (${qty})`,
            status: 'amber'
        };
    }

    // 3. GREEN: Above stock limit
    return {
        badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-bold shadow-sm',
        dotClass: 'bg-emerald-500',
        label: `In Stock (${qty})`,
        shortLabel: `In Stock (${qty})`,
        status: 'green'
    };
};

