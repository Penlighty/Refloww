"use client";

import DocumentForm from '@/components/DocumentForm';

export default function NewInvoicePage() {
    return (
        <DocumentForm
            type="invoice"
            title="Create Invoice"
            backUrl="/invoices"
        />
    );
}
