import { LineItem } from '@/lib/types';

// -------------------- Line Item Calculations --------------------

export const calculateLineItemSubtotal = (quantity: number, unitPrice: number): number => {
    return Math.round(quantity * unitPrice * 100) / 100;
};

export const calculateSubtotal = (lineItems: LineItem[]): number => {
    return lineItems.reduce((sum, item) => sum + item.subtotal, 0);
};

// -------------------- Document Calculations --------------------

export interface DocumentTotals {
    subtotal: number;
    discountAmount: number;
    taxableAmount: number;
    taxAmount: number;
    grandTotal: number;
}

export const calculateDocumentTotals = (
    lineItems: LineItem[],
    discountPercent: number = 0,
    taxPercent: number = 0
): DocumentTotals => {
    const subtotal = calculateSubtotal(lineItems);
    const discountAmount = Math.round(subtotal * (discountPercent / 100) * 100) / 100;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = Math.round(taxableAmount * (taxPercent / 100) * 100) / 100;
    const grandTotal = Math.round((taxableAmount + taxAmount) * 100) / 100;

    return {
        subtotal,
        discountAmount,
        taxableAmount,
        taxAmount,
        grandTotal,
    };
};

// -------------------- Percentage Calculations --------------------

export const calculatePercentage = (value: number, total: number): number => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100 * 100) / 100;
};

export const calculateValueFromPercentage = (percentage: number, total: number): number => {
    return Math.round(total * (percentage / 100) * 100) / 100;
};

// -------------------- Statistical Calculations --------------------

export const sum = (values: number[]): number => {
    return values.reduce((acc, val) => acc + val, 0);
};

export const average = (values: number[]): number => {
    if (values.length === 0) return 0;
    return sum(values) / values.length;
};

export const getGrowthPercentage = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100 * 100) / 100;
};
