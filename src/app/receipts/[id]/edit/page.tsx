"use client";

import DocumentForm from '@/components/DocumentForm';
import { useParams } from 'next/navigation';

export default function EditReceiptPage() {
    const params = useParams();
    const id = params.id as string;

    return (
        <DocumentForm
            type="receipt"
            title="Edit Receipt"
            backUrl="/receipts"
            documentId={id}
        />
    );
}
