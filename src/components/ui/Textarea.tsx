import { forwardRef, TextareaHTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    (
        {
            label,
            error,
            hint,
            className,
            disabled,
            id,
            rows = 4,
            ...props
        },
        ref
    ) => {
        const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');

        return (
            <div className="flex flex-col gap-1.5">
                {label && (
                    <label
                        htmlFor={textareaId}
                        className="text-xs font-medium text-neutral-700 dark:text-neutral-300"
                    >
                        {label}
                    </label>
                )}
                <textarea
                    ref={ref}
                    id={textareaId}
                    disabled={disabled}
                    rows={rows}
                    className={clsx(
                        'w-full px-4 py-3 text-xs rounded-lg border transition-all duration-200 resize-none',
                        'bg-white dark:bg-neutral-800',
                        'text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500',
                        'focus:outline-none focus:ring-2 focus:ring-neutral-500/10 dark:focus:ring-neutral-400/10',
                        error
                            ? 'border-red-300 dark:border-red-500/50 focus:border-red-500'
                            : 'border-neutral-200 dark:border-neutral-700 focus:border-neutral-400 dark:focus:border-neutral-500',
                        disabled && 'opacity-50 cursor-not-allowed bg-neutral-50 dark:bg-neutral-900',
                        className
                    )}
                    {...props}
                />
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

Textarea.displayName = 'Textarea';
