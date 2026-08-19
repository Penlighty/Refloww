"use client";

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

const DocumentForm = dynamic(() => import('@/components/DocumentForm'), { ssr: false });

export default function EditDeliveryNoteClient({ id }: { id?: string }) {
  const params = useParams();
  const documentId = (params?.id as string) || id || '';

  return (
    <DocumentForm
      type="delivery-note"
      title="Edit Delivery Note"
      backUrl={`/delivery-notes/${documentId}`}
      documentId={documentId}
    />
  );
}

