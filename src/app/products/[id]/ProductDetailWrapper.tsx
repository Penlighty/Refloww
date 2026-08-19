"use client";

import dynamic from 'next/dynamic';

const ProductDetailClient = dynamic(() => import('./ProductDetailClient'), { ssr: false });

export default function ProductDetailWrapper() {
  return <ProductDetailClient />;
}
