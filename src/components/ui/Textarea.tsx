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
                        className="text-sm font-medium text-neutral-700"
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
                        'w-full px-4 py-3 text-sm rounded-lg border transition-all duration-200 resize-none',
                        'bg-white',
                        'text-neutral-900 placeholder-neutral-400',
                        'focus:outline-none focus:ring-2 focus:ring-neutral-500/10',
                        error
                            ? 'border-red-300 focus:border-red-500'
                            : 'border-neutral-200 focus:border-neutral-400',
                        disabled && 'opacity-50 cursor-not-allowed bg-neutral-50',
                        className
                    )}
                    {...props}
                />
                {error && (
                    <p className="text-xs text-red-500">{error}</p>
                )}
                {hint && !error && (
                    <p className="text-xs text-neutral-500">{hint}</p>
                )}
            </div>
        );
    }
);

Textarea.displayName = 'Textarea';
