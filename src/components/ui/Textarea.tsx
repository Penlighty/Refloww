import { forwardRef, TextareaHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { AlertTriangle } from '@/components/icons';

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
            <div className="flex flex-col gap-1.5 w-full">
                {label && (
                    <label
                        htmlFor={textareaId}
                        className="label"
                    >
                        {label}
                    </label>
                )}
                <textarea
                    ref={ref}
                    id={textareaId}
                    disabled={disabled}
                    rows={rows}
                    aria-invalid={error ? 'true' : undefined}
                    className={clsx(
                        'w-full px-3 py-2.5 text-body rounded-ctl border bg-paper text-ink transition-colors resize-none',
                        'placeholder:text-ink-3 hover:border-ink-4',
                        'focus-visible:outline-none focus-visible:border-ink focus-visible:ring-[3px] focus-visible:ring-primary-500/20',
                        error
                            ? 'border-danger-solid ring-1 ring-danger-solid/15'
                            : 'border-line-strong',
                        disabled && 'bg-paper-2 text-ink-4 cursor-not-allowed',
                        className
                    )}
                    {...props}
                />
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

Textarea.displayName = 'Textarea';
