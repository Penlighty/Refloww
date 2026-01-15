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
