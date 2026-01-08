"use client";

import DocumentList from '@/components/DocumentList';

export default function InvoicesPage() {
    return (
        <DocumentList
            type="invoice"
            title="Invoices"
            newUrl="/invoices/new"
            emptyTitle="No invoices yet"
            emptyDescription="Create your first invoice to start tracking your business revenue."
        />
    );
}
