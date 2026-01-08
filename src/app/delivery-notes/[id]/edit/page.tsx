"use client";

import DocumentForm from '@/components/DocumentForm';
import { useParams } from 'next/navigation';

export default function EditDeliveryNotePage() {
    const params = useParams();
    const id = params.id as string;

    return (
        <DocumentForm
            type="delivery-note"
            title="Edit Delivery Note"
            backUrl="/delivery-notes"
            documentId={id}
        />
    );
}
