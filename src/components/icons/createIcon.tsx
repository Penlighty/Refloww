import { forwardRef, type ReactNode, type SVGProps, type ForwardRefExoticComponent, type RefAttributes } from 'react';

/** Stroke weights. Regular is the house weight; bold is for active/selected states. */
export const ICON_WEIGHT = { light: 1.5, regular: 1.75, bold: 2.25 } as const;

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'ref'> {
    size?: number | string;
    /** Overrides weight. Prefer `weight`; avoid ad-hoc numbers. */
    strokeWidth?: number | string;
    weight?: keyof typeof ICON_WEIGHT;
    /** Accessible name. Omit for decorative icons (default: aria-hidden). */
    title?: string;
}

export type IconComponent = ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;

export function createIcon(displayName: string, children: ReactNode): IconComponent {
    const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon(
        { size = 24, strokeWidth, weight = 'regular', className, title, ...rest },
        ref
    ) {
        return (
            <svg
                ref={ref}
                xmlns="http://www.w3.org/2000/svg"
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={className ? `rf-icon ${className}` : 'rf-icon'}
                role={title ? 'img' : undefined}
                aria-hidden={title ? undefined : true}
                {...rest}
            >
                {title ? <title>{title}</title> : null}
                {children}
            </svg>
        );
    });
    Icon.displayName = displayName;
    return Icon;
}
