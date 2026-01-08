"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { ChevronDown, Check, Search } from 'lucide-react';

interface SelectOption {
    value: string;
    label: string;
    description?: string;
}

interface SelectProps {
    options: SelectOption[];
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    error?: string;
    searchable?: boolean;
    disabled?: boolean;
    className?: string;
}

export function Select({
    options,
    value,
    onChange,
    placeholder = 'Select an option',
    label,
    error,
    searchable = false,
    disabled = false,
    className,
}: SelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Type-ahead state
    const typeSearchRef = useRef('');
    const typeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const selectedOption = options.find((opt) => opt.value === value);

    const filteredOptions = searchable
        ? options.filter(
            (opt) =>
                opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                opt.description?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : options;

    const handleClickOutside = useCallback((e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
            setIsOpen(false);
            setSearchQuery('');
        }
    }, []);

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [handleClickOutside]);

    useEffect(() => {
        if (isOpen && searchable && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen, searchable]);

    // Clear timeout on unmount
    useEffect(() => {
        return () => {
            if (typeTimeoutRef.current) clearTimeout(typeTimeoutRef.current);
        };
    }, []);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
        setSearchQuery('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return;

        // Space or Enter to open/close
        if (e.key === 'Enter' || (e.key === ' ' && !searchable && !isOpen)) {
            e.preventDefault();
            setIsOpen(!isOpen);
            return;
        }

        // Arrow keys for navigation if we added that, but for now just Type-Ahead
        // Only capture single characters, not special keys
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            // If searchable is on and open, don't hijack typing from the input
            if (searchable && isOpen) return;

            e.preventDefault(); // Prevent default if necessary, though mostly for page scroll on Space

            // Append char
            typeSearchRef.current += e.key.toLowerCase();

            // Clear previous timeout
            if (typeTimeoutRef.current) {
                clearTimeout(typeTimeoutRef.current);
            }

            // Set new timeout to clear buffer
            typeTimeoutRef.current = setTimeout(() => {
                typeSearchRef.current = '';
            }, 500); // 500ms delay to consider typing "finished"

            // Find match
            const match = options.find(opt =>
                opt.label.toLowerCase().startsWith(typeSearchRef.current)
            );

            if (match) {
                onChange(match.value);

                // Optional: Scroll into view if open
                if (isOpen) {
                    const el = document.getElementById(`select-option-${match.value}`);
                    el?.scrollIntoView({ block: 'nearest' });
                }
            }
        }
    };

    return (
        <div className={clsx('flex flex-col gap-1.5', className)} ref={containerRef}>
            {label && (
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    {label}
                </label>
            )}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                    className={clsx(
                        'w-full h-10 px-4 text-sm text-left rounded-xl border transition-all duration-200 flex items-center justify-between',
                        'bg-white dark:bg-neutral-800/50',
                        'focus:outline-none focus:ring-2 focus:ring-blue-500/20',
                        error
                            ? 'border-red-300 dark:border-red-500/50 focus:border-red-500'
                            : 'border-neutral-200 dark:border-neutral-700/80 focus:border-blue-500',
                        disabled && 'opacity-50 cursor-not-allowed bg-neutral-50 dark:bg-neutral-800',
                        !disabled && 'cursor-pointer'
                    )}
                >
                    <span className={selectedOption ? 'text-neutral-900 dark:text-white' : 'text-neutral-400'}>
                        {selectedOption?.label || placeholder}
                    </span>
                    <ChevronDown
                        className={clsx(
                            'w-4 h-4 text-neutral-400 transition-transform duration-200',
                            isOpen && 'rotate-180'
                        )}
                    />
                </button>

                {isOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl overflow-hidden">
                        {searchable && (
                            <div className="p-2 border-b border-neutral-100 dark:border-neutral-700">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search..."
                                        className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                            </div>
                        )}
                        <div className="max-h-60 overflow-y-auto py-1">
                            {filteredOptions.length === 0 ? (
                                <div className="px-4 py-3 text-sm text-neutral-500 text-center">
                                    No options found
                                </div>
                            ) : (
                                filteredOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        id={`select-option-${option.value}`}
                                        type="button"
                                        onClick={() => handleSelect(option.value)}
                                        className={clsx(
                                            'w-full px-4 py-2.5 text-left text-sm flex items-center justify-between transition-colors',
                                            option.value === value
                                                ? 'bg-[#A4F5A6]/30 dark:bg-[#A4F5A6]/20 text-neutral-900 dark:text-neutral-100 font-medium'
                                                : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/50'
                                        )}
                                    >
                                        <div>
                                            <div className="font-medium">{option.label}</div>
                                            {option.description && (
                                                <div className="text-xs text-neutral-500 mt-0.5">
                                                    {option.description}
                                                </div>
                                            )}
                                        </div>
                                        {option.value === value && (
                                            <Check className="w-4 h-4 text-neutral-900 dark:text-neutral-100" />
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
            {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
        </div>
    );
}
