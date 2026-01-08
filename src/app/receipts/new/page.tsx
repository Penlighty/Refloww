"use client";

import DocumentForm from '@/components/DocumentForm';

export default function NewReceiptPage() {
    return (
        <DocumentForm
            type="receipt"
            title="Create Receipt"
            backUrl="/receipts"
        />
    );
}
