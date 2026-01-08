"use client";

import DocumentForm from '@/components/DocumentForm';

export default function NewDeliveryNotePage() {
    return (
        <DocumentForm
            type="delivery-note"
            title="Create Delivery Note"
            backUrl="/delivery-notes"
        />
    );
}
