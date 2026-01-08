"use client";

import DocumentForm from '@/components/DocumentForm';

import { useParams } from 'next/navigation';

export default function EditInvoicePage() {
    const params = useParams();
    const id = params.id as string;
    return (
        <DocumentForm
            type="invoice"
            title="Edit Invoice"
            backUrl="/invoices"
            documentId={id}
        />
    );
}
