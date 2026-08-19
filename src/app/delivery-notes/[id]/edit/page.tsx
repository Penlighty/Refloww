import EditDeliveryNoteClient from './EditDeliveryNoteClient';

export function generateStaticParams() {
  return [{ id: '1' }];
}

export default async function EditDeliveryNotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditDeliveryNoteClient id={id} />;
}


