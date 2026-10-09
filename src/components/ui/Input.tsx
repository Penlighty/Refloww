import { forwardRef, InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { AlertTriangle } from '@/components/icons';

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
            <div className="flex flex-col gap-1.5 w-full">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="label"
                    >
                        {label}
                    </label>
                )}
                <div className="relative w-full">
                    {leftIcon && (
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-3">
                            {leftIcon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        id={inputId}
                        disabled={disabled}
                        aria-invalid={error ? 'true' : undefined}
                        className={clsx(
                            'w-full h-10 px-3 text-sm rounded-ctl border bg-paper text-ink transition-colors',
                            'placeholder:text-ink-3 hover:border-ink-4 placeholder:text-sm',
                            'focus-visible:outline-none focus-visible:border-ink focus-visible:ring-[3px] focus-visible:ring-primary-500/20',
                            error
                                ? 'border-danger-solid ring-1 ring-danger-solid/15'
                                : 'border-line-strong',
                            leftIcon && 'pl-9',
                            rightIcon && 'pr-9',
                            disabled && 'bg-paper-2 text-ink-4 cursor-not-allowed',
                            className
                        )}
                        {...props}
                    />
                    {rightIcon && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-ink-3">
                            {rightIcon}
                        </div>
                    )}
                </div>
                {error ? (
                    <p className="flex items-center gap-1 text-micro text-danger-text">
                        <AlertTriangle className="size-3.5 shrink-0" />
                        <span>{error}</span>
                    </p>
                ) : hint ? (
                    <p className="text-micro text-ink-3">{hint}</p>
                ) : null}
            </div>
        );
    }
);

Input.displayName = 'Input';
