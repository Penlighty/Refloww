"use client";

import DocumentList from '@/components/DocumentList';

export default function DeliveryNotesPage() {
    return (
        <DocumentList
            type="delivery-note"
            title="Delivery Notes"
            newUrl="/delivery-notes/new"
            emptyTitle="No delivery notes yet"
            emptyDescription="Create a delivery note for dispatched goods."
        />
    );
}
