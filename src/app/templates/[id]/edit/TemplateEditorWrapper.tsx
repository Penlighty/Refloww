"use client";

import dynamic from 'next/dynamic';

const TemplateEditorPage = dynamic(() => import('./TemplateEditorClient'), { ssr: false });

export default function TemplateEditorWrapper() {
  return <TemplateEditorPage />;
}
