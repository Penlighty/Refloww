"use client";

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

const DocumentDetail = dynamic(() => import('@/components/DocumentDetail'), { ssr: false });

export default function ReceiptDetailClientWrapper({ id }: { id?: string }) {
  const params = useParams();
  const documentId = (params?.id as string) || id || '';

  return (
    <DocumentDetail
      type="receipt"
      documentId={documentId}
      backUrl="/receipts"
    />
  );
}

