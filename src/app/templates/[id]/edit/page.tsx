import TemplateEditorWrapper from './TemplateEditorWrapper';

export function generateStaticParams() {
  return [{ id: '1' }];
}

export default async function TemplateEditorPageWrapper() {
  return <TemplateEditorWrapper />;
}


