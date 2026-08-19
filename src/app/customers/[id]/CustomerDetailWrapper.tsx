"use client";

import dynamic from 'next/dynamic';

const CustomerDetailClient = dynamic(() => import('./CustomerDetailClient'), { ssr: false });

export default function CustomerDetailWrapper() {
  return <CustomerDetailClient />;
}
