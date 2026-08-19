import ReceiptDetailClientWrapper from './ReceiptDetailClientWrapper';

export function generateStaticParams() {
  return [{ id: '1' }];
}

export default async function ReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReceiptDetailClientWrapper id={id} />;
}


