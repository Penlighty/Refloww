"use client";

import dynamic from 'next/dynamic';

const TemplateDetailClient = dynamic(() => import('./TemplateDetailClient'), { ssr: false });

export default function TemplateDetailWrapper() {
  return <TemplateDetailClient />;
}
