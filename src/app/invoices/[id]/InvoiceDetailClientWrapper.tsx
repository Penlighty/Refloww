"use client";

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

const DocumentDetail = dynamic(() => import('@/components/DocumentDetail'), { ssr: false });

export default function InvoiceDetailClientWrapper({ id }: { id?: string }) {
  const params = useParams();
  const documentId = (params?.id as string) || id || '';

  return (
    <DocumentDetail
      type="invoice"
      documentId={documentId}
      backUrl="/invoices"
    />
  );
}

