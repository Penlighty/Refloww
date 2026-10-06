import { Tag, TagTone } from './Tag';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline' | 'brand';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
    children: React.ReactNode;
    variant?: BadgeVariant;
    size?: BadgeSize;
    className?: string;
    dot?: boolean;
}

const variantToneMap: Record<BadgeVariant, TagTone> = {
    default: 'neutral',
    outline: 'neutral',
    success: 'success',
    warning: 'warning',
    danger: 'danger',
    info: 'info',
    brand: 'brand',
};

const dotColors: Record<BadgeVariant, string> = {
    default: 'bg-ink-3',
    outline: 'bg-ink-4',
    success: 'bg-success-text',
    warning: 'bg-warning-text',
    danger: 'bg-danger-solid',
    info: 'bg-info-text',
    brand: 'bg-primary-500',
};

export function Badge({
    children,
    variant = 'default',
    className,
    dot = false,
}: BadgeProps) {
    const tone = variantToneMap[variant] || 'neutral';
    return (
        <Tag tone={tone} className={className}>
            {dot && (
                <span className={`size-1.5 rounded-full ${dotColors[variant]}`} />
            )}
            {children}
        </Tag>
    );
}

export { Tag };
export default Badge;
