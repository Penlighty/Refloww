import { forwardRef, ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { Loader } from '@/components/icons';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'ink';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    fullWidth?: boolean;
    iconOnlyMobile?: boolean;
    iconOnlyTablet?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
    primary: 'bg-primary-500 text-on-primary hover:bg-primary-600 active:bg-primary-600 [--rf-accent:currentColor]',
    secondary: 'bg-paper text-ink border border-line-strong hover:bg-paper-2',
    ghost: 'bg-transparent text-ink-2 hover:bg-paper-2 hover:text-ink',
    outline: 'bg-transparent text-ink border border-line-strong hover:bg-paper-2',
    danger: 'bg-danger-solid text-white hover:brightness-95 [--rf-accent:currentColor]',
    ink: 'bg-ink text-paper hover:opacity-90',
};

const sizeStyles: Record<ButtonSize, string> = {
    sm: 'h-8 px-3 text-caption gap-1.5',
    md: 'h-10 px-4 text-body gap-2',
    lg: 'h-12 px-5 text-lead gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            variant = 'primary',
            size = 'md',
            isLoading = false,
            leftIcon,
            rightIcon,
            fullWidth = false,
            iconOnlyMobile = false,
            iconOnlyTablet = false,
            disabled,
            className,
            children,
            ...props
        },
        ref
    ) => {
        const isDisabled = disabled || isLoading;
        const hasIcon = Boolean(leftIcon || rightIcon || isLoading);

        return (
            <button
                ref={ref}
                disabled={isDisabled}
                className={clsx(
                    'inline-flex items-center justify-center font-semibold rounded-ctl whitespace-nowrap',
                    'transition-[color,background-color,border-color,transform] duration-150 ease-settle',
                    'active:scale-[0.985] disabled:opacity-45 disabled:pointer-events-none cursor-pointer',
                    variantStyles[variant],
                    sizeStyles[size],
                    iconOnlyMobile && hasIcon && 'px-2.5 sm:px-4',
                    iconOnlyTablet && hasIcon && 'px-2.5 md:px-4',
                    fullWidth && 'w-full',
                    className
                )}
                {...props}
            >
                {isLoading ? (
                    <Loader className="size-4 rf-spin shrink-0" />
                ) : (
                    leftIcon && <span className="shrink-0">{leftIcon}</span>
                )}
                {children && (
                    <span className={clsx(
                        iconOnlyMobile && hasIcon && 'hidden sm:inline',
                        iconOnlyTablet && hasIcon && 'hidden md:inline'
                    )}>
                        {children}
                    </span>
                )}
                {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
            </button>
        );
    }
);

Button.displayName = 'Button';
