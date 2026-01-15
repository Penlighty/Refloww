// ============================================
// FINANCIAL TERMS - Definitions & Explanations
// ============================================

export interface FinancialTermDefinition {
    term: string;
    definition: string;
    calculation?: string;
    example?: string;
}

// Financial term definitions for help tooltips
export const FINANCIAL_TERMS: Record<string, FinancialTermDefinition> = {
    // Line Item Terms
    'line-items': {
        term: 'Line Items',
        definition: 'Individual products or services being billed, each with quantity and unit price.',
        calculation: 'Each line: Quantity × Unit Price = Line Total',
        example: '5 × $20.00 = $100.00'
    },
    'quantity': {
        term: 'Quantity',
        definition: 'The number of units of a product or service being purchased.',
        calculation: 'User specified count',
    },
    'unit-price': {
        term: 'Unit Price',
        definition: 'The price for one unit of the product or service.',
        calculation: 'Price per single item',
    },

    // Summary Terms
    'subtotal': {
        term: 'Subtotal',
        definition: 'The sum of all line item totals before any discounts or taxes are applied.',
        calculation: 'Subtotal = Σ(Quantity × Unit Price)',
        example: 'Item 1: $100 + Item 2: $50 = Subtotal: $150'
    },
    'discount': {
        term: 'Discount',
        definition: 'A reduction applied to the subtotal, usually as a percentage. Applied BEFORE tax calculation.',
        calculation: 'Discount Amount = Subtotal × (Discount % ÷ 100)',
        example: 'Subtotal $150, Discount 10% = $15 off'
    },
    'discount-name': {
        term: 'Discount Name',
        definition: 'The name or description of the discount being applied (e.g., "Early Bird Discount", "Bulk Order").',
    },
    'tax': {
        term: 'Tax',
        definition: 'Government-mandated charge (VAT, Sales Tax, etc.) applied to the taxable amount (subtotal minus discount).',
        calculation: 'Tax Amount = (Subtotal - Discount) × (Tax % ÷ 100)',
        example: 'Taxable $135, Tax 10% = $13.50'
    },
    'grand-total': {
        term: 'Grand Total',
        definition: 'The final amount the customer owes. This is the total after all discounts are subtracted and taxes are added.',
        calculation: 'Grand Total = (Subtotal - Discount) + Tax',
        example: '$150 - $15 + $13.50 = $148.50'
    },

    // Payment Terms (Invoice context)
    'amount-paid': {
        term: 'Amount Paid',
        definition: 'The cumulative total of all payments received against this invoice.',
        calculation: 'Sum of all payment receipts linked to this invoice',
        example: 'Receipt 1: $50 + Receipt 2: $48.50 = Amount Paid: $98.50'
    },
    'amount-due': {
        term: 'Amount Due',
        definition: 'The outstanding balance remaining to be paid on this invoice.',
        calculation: 'Amount Due = Grand Total - Amount Paid',
        example: 'Grand Total $148.50 - Paid $98.50 = Due $50.00'
    },

    // Receipt-specific Terms
    'invoice-total': {
        term: 'Invoice Total',
        definition: 'The grand total from the source invoice that this receipt is paying against.',
        calculation: 'Pulled automatically from the linked invoice',
    },
    'previous-payments': {
        term: 'Previous Payments',
        definition: 'The sum of all prior receipts/payments made against the same invoice before this one.',
        calculation: 'Sum of all earlier receipt amounts for this invoice',
        example: 'Payment 1: $50 + Payment 2: $30 = Previous Payments: $80'
    },
    'this-payment': {
        term: 'This Payment',
        definition: 'The amount being paid in THIS specific receipt transaction.',
        calculation: 'User enters the payment amount',
    },
    'remaining-balance': {
        term: 'Remaining Balance',
        definition: 'The amount still owed after this payment is applied.',
        calculation: 'Remaining = Invoice Total - Previous Payments - This Payment',
        example: 'Invoice $148.50 - Previous $50 - This $48.50 = Remaining $50'
    },

    // Other Fields
    'amount-in-words': {
        term: 'Amount in Words',
        definition: 'The grand total written out in words for clarity and fraud prevention.',
        example: 'One Hundred Forty-Eight Dollars and Fifty Cents'
    },
    'document-number': {
        term: 'Document Number',
        definition: 'A unique identifier for this document, used for tracking and reference.',
        example: 'INV-2026-0001'
    },
    'date': {
        term: 'Date',
        definition: 'The date when this document was created or issued.',
    },
    'due-date': {
        term: 'Due Date',
        definition: 'The date by which payment should be made.',
        calculation: 'Usually: Issue Date + Payment Terms (e.g., 30 days)',
    },
    'notes': {
        term: 'Notes',
        definition: 'Additional information, terms and conditions, or special instructions.',
    },

    // Customer Fields
    'customer-name': {
        term: 'Customer Name',
        definition: 'The name of the customer or business being billed.',
    },
    'customer-email': {
        term: 'Customer Email',
        definition: 'The email address of the customer for correspondence.',
    },
    'customer-phone': {
        term: 'Customer Phone',
        definition: 'The phone number of the customer.',
    },
    'customer-address': {
        term: 'Customer Address',
        definition: 'The billing or shipping address of the customer.',
    },
};

// Get a term definition by key
export function getTermDefinition(key: string): FinancialTermDefinition | null {
    return FINANCIAL_TERMS[key] || null;
}

// Format a help tooltip content
export function formatHelpContent(term: FinancialTermDefinition): string {
    let content = term.definition;
    if (term.calculation) {
        content += `\n\n📊 Calculation: ${term.calculation}`;
    }
    if (term.example) {
        content += `\n\n💡 Example: ${term.example}`;
    }
    return content;
}
