import { clsx } from 'clsx';
import { FileX } from 'lucide-react';

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
                'flex flex-col items-center justify-center py-12 px-6 text-center',
                className
            )}
        >
            <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center mb-4">
                {icon || <FileX className="w-8 h-8 text-neutral-400 dark:text-neutral-500" strokeWidth={1.5} />}
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">
                {title}
            </h3>
            {description && (
                <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mb-4">
                    {description}
                </p>
            )}
            {action}
        </div>
    );
}
