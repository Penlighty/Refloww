import { clsx } from 'clsx';
import { FileX } from '@/components/icons';

interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
    className?: string;
}

export function EmptyState({
    icon,
    title,
    description,
    action,
    className,
}: EmptyStateProps) {
    return (
        <div
            className={clsx(
                'flex flex-col items-center text-center py-12 md:py-16 px-6',
                className
            )}
        >
            <div className="grid place-items-center size-14 rounded-panel border border-dashed border-line-strong bg-paper-2 text-ink-2 [--rf-accent:var(--color-primary-500)]">
                {icon || <FileX className="size-7" />}
            </div>
            <h3 className="font-heading text-lead font-semibold text-ink mt-4">
                {title}
            </h3>
            {description && (
                <p className="text-body text-ink-3 mt-1 max-w-sm">
                    {description}
                </p>
            )}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}
