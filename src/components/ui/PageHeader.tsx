import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  subtitle?: string;
  count?: number;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  subtitle,
  count,
  actions,
  children,
  className = '',
}: PageHeaderProps) {
  const desc = description || subtitle;
  const actionElements = actions || children;

  return (
    <header className={`flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 md:pb-6 ${className}`}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="font-heading text-title md:text-headline font-semibold tracking-[-0.02em] text-ink truncate">
            {title}
          </h1>
          {count !== undefined && (
            <span className="text-micro font-medium money text-ink-3 px-2 py-0.5 rounded-tag bg-paper-2 border border-line">
              {count}
            </span>
          )}
        </div>
        {desc && <p className="text-body text-ink-3 mt-1">{desc}</p>}
      </div>
      {actionElements && <div className="flex items-center gap-2 shrink-0">{actionElements}</div>}
    </header>
  );
}

export default PageHeader;
