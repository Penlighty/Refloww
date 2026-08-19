import InvoiceDetailClientWrapper from './InvoiceDetailClientWrapper';

export function generateStaticParams() {
  return [{ id: '1' }];
}

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InvoiceDetailClientWrapper id={id} />;
}


