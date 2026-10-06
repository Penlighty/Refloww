"use client";

import { clsx } from 'clsx';
import { Search, X } from '@/components/icons';
import { useState } from 'react';

interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export function SearchInput({
    value,
    onChange,
    placeholder = 'Search...',
    className,
}: SearchInputProps) {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <div
            className={clsx(
                'relative flex items-center w-full',
                className
            )}
        >
            <Search
                className={clsx(
                    'absolute left-3 size-4 transition-colors shrink-0',
                    isFocused ? 'text-ink' : 'text-ink-3'
                )}
            />
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder}
                className={clsx(
                    'w-full h-10 pl-9 pr-9 text-body rounded-ctl border bg-paper text-ink transition-colors',
                    'placeholder:text-ink-3 hover:border-ink-4',
                    'focus-visible:outline-none focus-visible:border-ink focus-visible:ring-[3px] focus-visible:ring-primary-500/20',
                    'border-line-strong'
                )}
            />
            {value && (
                <button
                    type="button"
                    onClick={() => onChange('')}
                    className="absolute right-2.5 p-1 rounded-ctl text-ink-3 hover:text-ink hover:bg-paper-2 transition-colors cursor-pointer"
                    aria-label="Clear search"
                >
                    <X className="size-3.5" />
                </button>
            )}
        </div>
    );
}
