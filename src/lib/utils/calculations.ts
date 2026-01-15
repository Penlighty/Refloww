import { LineItem, Template, Document } from '@/lib/types';

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

// -------------------- Template-Aware Calculations --------------------



/**
 * Calculate the EFFECTIVE grand total for a document based on what its template actually supports.
 * 
 * This is critical because documents may have been saved with tax/discount calculated
 * even when the template doesn't have those fields. This function recalculates to get
 * the TRUE grand total that matches what the user sees on the rendered document.
 * 
 * @param doc - The document to calculate for
 * @param template - The document's template (pass null if not available, will use stored value)
 * @returns The correctly calculated grand total
 */
export const getEffectiveGrandTotal = (doc: Document, template: Template | null | undefined): number => {
    // If no template info, fall back to stored value (best we can do)
    if (!template) {
        return doc.grandTotal || 0;
    }

    // Check what the template supports (handle encrypted/undefined fields)
    const fields = template.fields || [];
    const supportsTax = fields.some(f => f.type === 'tax');
    const supportsDiscount = fields.some(f => f.type === 'discount');

    // Calculate subtotal from line items (defensive check for undefined)
    const subtotal = (doc.lineItems || []).reduce((sum, item) =>
        sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0);

    // Apply discount only if template supports it
    const discountAmount = supportsDiscount && (doc.discountPercent || 0) > 0
        ? subtotal * ((doc.discountPercent || 0) / 100)
        : 0;
    const taxableAmount = subtotal - discountAmount;

    // Apply tax only if template supports it
    const taxAmount = supportsTax && (doc.taxPercent || 0) > 0
        ? taxableAmount * ((doc.taxPercent || 0) / 100)
        : 0;

    return Math.round((taxableAmount + taxAmount) * 100) / 100;
};

/**
 * Batch calculate effective grand totals for multiple documents.
 * Useful for dashboard stats, charts, etc.
 * 
 * @param documents - Array of documents
 * @param getTemplate - Function to get template by ID
 * @returns Total of all effective grand totals
 */
export const sumEffectiveGrandTotals = (
    documents: Document[],
    getTemplate: (templateId: string) => Template | null | undefined
): number => {
    return documents.reduce((sum, doc) => {
        const template = getTemplate(doc.templateId);
        return sum + getEffectiveGrandTotal(doc, template);
    }, 0);
};
