import React from 'react';

export type TagTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'paid' | 'overdue';

interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: TagTone;
  variant?: TagTone;
  icon?: React.ComponentType<any>;
  children: React.ReactNode;
}

const toneStyles: Record<TagTone, string> = {
  neutral: 'border-line-strong text-ink-2 bg-paper-2',
  success: 'bg-success-tint text-success-text border-success-text/20',
  paid: 'bg-success-tint text-success-text border-success-text/20',
  warning: 'bg-warning-tint text-warning-text border-warning-text/20',
  danger: 'bg-danger-tint text-danger-text border-danger-text/20',
  overdue: 'bg-danger-tint text-danger-text border-danger-text/20',
  info: 'bg-info-tint text-info-text border-info-text/20',
  brand: 'bg-primary-50 text-primary-text border-primary-200 dark:bg-primary-500/15',
};

export function Tag({ tone, variant, icon: Icon, className = '', children, ...props }: TagProps) {
  const resolvedTone = tone || variant || 'neutral';
  return (
    <span
      className={`inline-flex items-center gap-1 h-[22px] px-2 rounded-tag border text-micro font-medium ${toneStyles[resolvedTone]} ${className}`}
      {...props}
    >
      {Icon && <Icon className="size-3 shrink-0" />}
      <span>{children}</span>
    </span>
  );
}

export default Tag;
