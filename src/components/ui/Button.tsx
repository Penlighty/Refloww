import { forwardRef, ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
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
    primary: 'bg-[#fc6d2d] hover:bg-[#ea500d] text-white shadow-sm active:scale-[0.98]',
    secondary: 'bg-[#2d3748] dark:bg-neutral-700 hover:bg-[#1a202c] dark:hover:bg-neutral-600 text-white dark:text-neutral-100',
    ghost: 'bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    outline: 'bg-transparent border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 text-[#2d3748] dark:text-neutral-200',
};

const sizeStyles: Record<ButtonSize, string> = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-10 px-4 text-sm gap-2',
    lg: 'h-12 px-6 text-base gap-2.5',
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
                    'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap',
                    'focus:outline-none focus:ring-2 focus:ring-neutral-500/20 focus:ring-offset-2',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
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
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
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
