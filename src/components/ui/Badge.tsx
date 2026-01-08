import { clsx } from 'clsx';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
    children: React.ReactNode;
    variant?: BadgeVariant;
    size?: BadgeSize;
    className?: string;
    dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
    default: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400',
    success: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    danger: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    info: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    outline: 'bg-transparent border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400',
};

const dotColors: Record<BadgeVariant, string> = {
    default: 'bg-neutral-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    info: 'bg-blue-500',
    outline: 'bg-neutral-400',
};

const sizeStyles: Record<BadgeSize, string> = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
};

export function Badge({
    children,
    variant = 'default',
    size = 'sm',
    className,
    dot = false,
}: BadgeProps) {
    return (
        <span
            className={clsx(
                'inline-flex items-center gap-1.5 font-medium rounded-full',
                variantStyles[variant],
                sizeStyles[size],
                className
            )}
        >
            {dot && (
                <span className={clsx('w-1.5 h-1.5 rounded-full', dotColors[variant])} />
            )}
            {children}
        </span>
    );
}
