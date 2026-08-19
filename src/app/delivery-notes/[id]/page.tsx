import DeliveryNoteDetailClientWrapper from './DeliveryNoteDetailClientWrapper';

export function generateStaticParams() {
  return [{ id: '1' }];
}

export default async function DeliveryNoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DeliveryNoteDetailClientWrapper id={id} />;
}


