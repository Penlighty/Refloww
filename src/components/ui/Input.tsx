import { forwardRef, InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    (
        {
            label,
            error,
            hint,
            leftIcon,
            rightIcon,
            className,
            disabled,
            id,
            ...props
        },
        ref
    ) => {
        const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

        return (
            <div className="flex flex-col gap-1.5">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
                    >
                        {label}
                    </label>
                )}
                <div className="relative">
                    {leftIcon && (
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
                            {leftIcon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        id={inputId}
                        disabled={disabled}
                        className={clsx(
                            'w-full h-10 px-4 text-sm rounded-lg border transition-all duration-200',
                            'bg-white dark:bg-neutral-800',
                            'text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500',
                            'focus:outline-none focus:ring-2 focus:ring-neutral-500/10 dark:focus:ring-neutral-400/10',
                            error
                                ? 'border-red-300 dark:border-red-500/50 focus:border-red-500'
                                : 'border-neutral-200 dark:border-neutral-700 focus:border-neutral-400 dark:focus:border-neutral-500',
                            leftIcon && 'pl-10',
                            rightIcon && 'pr-10',
                            disabled && 'opacity-50 cursor-not-allowed bg-neutral-50 dark:bg-neutral-900',
                            className
                        )}
                        {...props}
                    />
                    {rightIcon && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-neutral-400 dark:text-neutral-500">
                            {rightIcon}
                        </div>
                    )}
                </div>
                {error && (
                    <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
                )}
                {hint && !error && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';
