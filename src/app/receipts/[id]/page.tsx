"use client";

import DocumentDetail from '@/components/DocumentDetail';

import { useParams } from 'next/navigation';

export default function ReceiptDetailPage() {
    const params = useParams();
    const id = params.id as string;
    return (
        <DocumentDetail
            type="receipt"
            documentId={id}
            backUrl="/receipts"
        />
    );
}
