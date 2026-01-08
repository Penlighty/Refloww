"use client";

import { clsx } from 'clsx';
import { Search, X } from 'lucide-react';
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
                'relative flex items-center transition-all duration-200',
                className
            )}
        >
            <Search
                className={clsx(
                    'absolute left-3 w-4 h-4 transition-colors duration-200',
                    isFocused ? 'text-neutral-600 dark:text-neutral-300' : 'text-neutral-400 dark:text-neutral-500'
                )}
                strokeWidth={2}
            />
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder}
                className={clsx(
                    'w-full h-10 pl-10 pr-10 text-sm rounded-lg border transition-all duration-200',
                    'bg-white dark:bg-neutral-800',
                    'text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500',
                    'focus:outline-none focus:ring-2 focus:ring-neutral-500/10 dark:focus:ring-neutral-400/10 focus:border-neutral-400 dark:focus:border-neutral-500',
                    'border-neutral-200 dark:border-neutral-700'
                )}
            />
            {value && (
                <button
                    onClick={() => onChange('')}
                    className="absolute right-3 p-1 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                >
                    <X className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
            )}
        </div>
    );
}
