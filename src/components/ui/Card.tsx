import { clsx } from 'clsx';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    hover?: boolean;
}

const paddingStyles = {
    none: '',
    sm: 'p-3 md:p-4',
    md: 'p-4 md:p-5',
    lg: 'p-5 md:p-6',
};

export function Card({
    children,
    className,
    padding = 'md',
    hover = false,
}: CardProps) {
    return (
        <div
            className={clsx(
                'panel',
                hover && 'hover:border-line-strong transition-colors duration-150',
                paddingStyles[padding],
                className
            )}
        >
            {children}
        </div>
    );
}

interface CardHeaderProps {
    title: string;
    description?: string;
    action?: React.ReactNode;
    className?: string;
}

export function CardHeader({ title, description, action, className }: CardHeaderProps) {
    return (
        <div className={clsx('flex items-start justify-between gap-4 mb-4', className)}>
            <div className="min-w-0">
                <h3 className="font-heading text-lead font-semibold text-ink truncate">{title}</h3>
                {description && (
                    <p className="mt-1 text-caption text-ink-3">{description}</p>
                )}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}

interface CardContentProps {
    children: React.ReactNode;
    className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
    return <div className={className}>{children}</div>;
}
