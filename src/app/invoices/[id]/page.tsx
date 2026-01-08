"use client";

import DocumentDetail from '@/components/DocumentDetail';

import { useParams } from 'next/navigation';

export default function InvoiceDetailPage() {
    const params = useParams();
    const id = params.id as string;
    return (
        <DocumentDetail
            type="invoice"
            documentId={id}
            backUrl="/invoices"
        />
    );
}
