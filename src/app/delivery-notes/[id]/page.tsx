"use client";

import DocumentDetail from '@/components/DocumentDetail';

import { useParams } from 'next/navigation';

export default function DeliveryNoteDetailPage() {
    const params = useParams();
    const id = params.id as string;
    return (
        <DocumentDetail
            type="delivery-note"
            documentId={id}
            backUrl="/delivery-notes"
        />
    );
}
