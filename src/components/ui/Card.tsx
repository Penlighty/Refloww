import { clsx } from 'clsx';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    hover?: boolean;
}

const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
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
                'bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700',
                hover && 'hover:border-neutral-200 dark:hover:border-neutral-600 transition-all duration-200',
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
}

export function CardHeader({ title, description, action }: CardHeaderProps) {
    return (
        <div className="flex items-start justify-between mb-6">
            <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{title}</h3>
                {description && (
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
                )}
            </div>
            {action}
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
