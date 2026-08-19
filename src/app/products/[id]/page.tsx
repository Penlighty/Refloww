import ProductDetailWrapper from './ProductDetailWrapper';

export function generateStaticParams() {
  return [{ id: '1' }];
}

export default async function ProductDetailPage() {
  return <ProductDetailWrapper />;
}


