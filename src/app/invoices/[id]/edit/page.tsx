import InvoiceEditClientWrapper from './InvoiceEditClientWrapper';

export function generateStaticParams() {
  return [{ id: '1' }];
}

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InvoiceEditClientWrapper id={id} />;
}


