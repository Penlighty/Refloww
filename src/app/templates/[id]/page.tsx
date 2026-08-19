import TemplateDetailWrapper from './TemplateDetailWrapper';

export function generateStaticParams() {
  return [{ id: '1' }];
}

export default async function TemplateDetailPage() {
  return <TemplateDetailWrapper />;
}


