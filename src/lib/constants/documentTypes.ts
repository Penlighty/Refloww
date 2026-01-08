import { DocumentType } from '@/lib/types';

export interface DocumentTypeConfig {
    type: DocumentType;
    label: string;
    labelPlural: string;
    description: string;
    icon: string;
    color: string;
    prefix: string;
}

export const DOCUMENT_TYPES: DocumentTypeConfig[] = [
    {
        type: 'invoice',
        label: 'Invoice',
        labelPlural: 'Invoices',
        description: 'Request for payment for goods or services',
        icon: 'FileText',
        color: '#137fec',
        prefix: 'INV',
    },
    {
        type: 'receipt',
        label: 'Receipt',
        labelPlural: 'Receipts',
        description: 'Proof of payment received',
        icon: 'Receipt',
        color: '#10b981',
        prefix: 'RCP',
    },
    {
        type: 'delivery-note',
        label: 'Delivery Note',
        labelPlural: 'Delivery Notes',
        description: 'Document accompanying delivered goods',
        icon: 'Truck',
        color: '#f59e0b',
        prefix: 'DN',
    },
];

export const getDocumentTypeConfig = (type: DocumentType): DocumentTypeConfig | undefined => {
    return DOCUMENT_TYPES.find((d) => d.type === type);
};

export const DOCUMENT_STATUSES = [
    { value: 'draft', label: 'Draft', color: '#94a3b8' },
    { value: 'sent', label: 'Sent', color: '#3b82f6' },
    { value: 'paid', label: 'Paid', color: '#10b981' },
    { value: 'overdue', label: 'Overdue', color: '#ef4444' },
    { value: 'cancelled', label: 'Cancelled', color: '#6b7280' },
] as const;

export const getStatusConfig = (status: string) => {
    return DOCUMENT_STATUSES.find((s) => s.value === status);
};
