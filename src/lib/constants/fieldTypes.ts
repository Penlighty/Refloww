import { FieldType } from '@/lib/types';

export interface FieldTypeConfig {
    type: FieldType;
    label: string;
    description: string;
    icon: string;
    group: 'document' | 'customer' | 'financial' | 'other';
    isTableField?: boolean;
}

export const FIELD_TYPES: FieldTypeConfig[] = [
    // Document fields
    {
        type: 'document-number',
        label: 'Document Number',
        description: 'Auto-generated invoice/receipt number',
        icon: 'Hash',
        group: 'document',
    },
    {
        type: 'date',
        label: 'Date',
        description: 'Document creation date',
        icon: 'Calendar',
        group: 'document',
    },
    {
        type: 'due-date',
        label: 'Due Date',
        description: 'Payment due date',
        icon: 'CalendarClock',
        group: 'document',
    },

    // Customer fields
    {
        type: 'customer-name',
        label: 'Customer Name',
        description: 'Customer full name or company',
        icon: 'User',
        group: 'customer',
    },
    {
        type: 'customer-email',
        label: 'Customer Email',
        description: 'Customer email address',
        icon: 'Mail',
        group: 'customer',
    },
    {
        type: 'customer-phone',
        label: 'Customer Phone',
        description: 'Customer phone number',
        icon: 'Phone',
        group: 'customer',
    },
    {
        type: 'customer-address',
        label: 'Customer Address',
        description: 'Customer billing/shipping address',
        icon: 'MapPin',
        group: 'customer',
    },

    // Financial fields
    {
        type: 'line-items',
        label: 'Line Items Table',
        description: 'Product list with quantities and prices',
        icon: 'Table',
        group: 'financial',
        isTableField: true,
    },
    {
        type: 'subtotal',
        label: 'Subtotal',
        description: 'Sum of all line items',
        icon: 'Calculator',
        group: 'financial',
    },
    {
        type: 'discount',
        label: 'Discount',
        description: 'Discount amount or percentage',
        icon: 'Percent',
        group: 'financial',
    },
    {
        type: 'tax',
        label: 'Tax',
        description: 'Tax amount',
        icon: 'Receipt',
        group: 'financial',
    },
    {
        type: 'grand-total',
        label: 'Grand Total',
        description: 'Final amount after discounts and tax',
        icon: 'DollarSign',
        group: 'financial',
    },

    // Other fields
    {
        type: 'text',
        label: 'Static Text',
        description: 'Fixed text that appears on every document',
        icon: 'Type',
        group: 'other',
    },
    {
        type: 'notes',
        label: 'Notes',
        description: 'Additional notes or terms',
        icon: 'FileText',
        group: 'other',
    },
    {
        type: 'custom',
        label: 'Custom Field',
        description: 'User-defined custom field',
        icon: 'Settings',
        group: 'other',
    },
];

export const getFieldTypeConfig = (type: FieldType): FieldTypeConfig | undefined => {
    return FIELD_TYPES.find((f) => f.type === type);
};

export const getFieldTypesByGroup = (group: FieldTypeConfig['group']): FieldTypeConfig[] => {
    return FIELD_TYPES.filter((f) => f.group === group);
};
