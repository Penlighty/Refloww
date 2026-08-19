import ReceiptEditClientWrapper from './ReceiptEditClientWrapper';

export function generateStaticParams() {
  return [{ id: '1' }];
}

export default async function EditReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReceiptEditClientWrapper id={id} />;
}


