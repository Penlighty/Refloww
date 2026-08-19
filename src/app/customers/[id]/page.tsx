import CustomerDetailWrapper from './CustomerDetailWrapper';

export function generateStaticParams() {
  return [{ id: '1' }];
}

export default async function CustomerDetailPage() {
  return <CustomerDetailWrapper />;
}


