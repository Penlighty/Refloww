"use client";

import DocumentList from '@/components/DocumentList';

export default function ReceiptsPage() {
    return (
        <DocumentList
            type="receipt"
            title="Receipts"
            newUrl="/receipts/new"
            emptyTitle="No receipts yet"
            emptyDescription="Create a receipt to acknowledge payment."
        />
    );
}
