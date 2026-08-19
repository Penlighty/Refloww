"use client";

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

const DocumentDetail = dynamic(() => import('@/components/DocumentDetail'), { ssr: false });

export default function DeliveryNoteDetailClientWrapper({ id }: { id?: string }) {
  const params = useParams();
  const documentId = (params?.id as string) || id || '';

  return (
    <DocumentDetail
      type="delivery-note"
      documentId={documentId}
      backUrl="/delivery-notes"
    />
  );
}

