"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { ChevronDown, Check, Search, AlertTriangle } from '@/components/icons';

export interface SelectOption {
    value: string;
    label: string;
    description?: string;
    icon?: React.ReactNode;
    imageUrl?: string;
}

interface SelectProps {
    options: SelectOption[];
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    error?: string;
    searchable?: boolean;
    searchPlaceholder?: string;
    searchMatcher?: (option: SelectOption, query: string) => boolean;
    disabled?: boolean;
    className?: string;
    maxHeightClass?: string;
}

export function Select({
    options,
    value,
    onChange,
    placeholder = 'Select an option',
    label,
    error,
    searchable = false,
    searchPlaceholder = 'Search here...',
    searchMatcher,
    disabled = false,
    className,
    maxHeightClass = 'max-h-72',
}: SelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const typeSearchRef = useRef('');
    const typeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const selectedOption = options.find((opt) => opt.value === value);

    const filteredOptions = searchable
        ? options.filter((opt) => {
            if (searchMatcher) {
                return searchMatcher(opt, searchQuery);
            }
            return (
                opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                opt.description?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        })
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

        if (e.key === 'Enter' || (e.key === ' ' && !searchable && !isOpen)) {
            e.preventDefault();
            setIsOpen(!isOpen);
            return;
        }

        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            if (searchable && isOpen) return;

            e.preventDefault();

            typeSearchRef.current += e.key.toLowerCase();

            if (typeTimeoutRef.current) {
                clearTimeout(typeTimeoutRef.current);
            }

            typeTimeoutRef.current = setTimeout(() => {
                typeSearchRef.current = '';
            }, 500);

            const match = options.find(opt =>
                opt.label.toLowerCase().startsWith(typeSearchRef.current)
            );

            if (match) {
                onChange(match.value);

                if (isOpen) {
                    const el = document.getElementById(`select-option-${match.value}`);
                    el?.scrollIntoView({ block: 'nearest' });
                }
            }
        }
    };

    return (
        <div className={clsx('flex flex-col gap-1.5 w-full', className, isOpen && 'relative z-50')} ref={containerRef}>
            {label && (
                <label className="label">
                    {label}
                </label>
            )}
            <div className={clsx('relative w-full', isOpen && 'z-50')}>
                <button
                    type="button"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                    className={clsx(
                        'w-full h-10 px-3 text-sm rounded-ctl border bg-paper text-ink transition-colors flex items-center justify-between text-left cursor-pointer',
                        'placeholder:text-ink-3 hover:border-ink-4 placeholder:text-sm',
                        'focus-visible:outline-none focus-visible:border-ink focus-visible:ring-[3px] focus-visible:ring-primary-500/20',
                        error ? 'border-danger-solid ring-1 ring-danger-solid/15' : 'border-line-strong',
                        disabled && 'bg-paper-2 text-ink-4 cursor-not-allowed'
                    )}
                >
                    <div className="flex items-center gap-2.5 truncate">
                        {selectedOption?.icon && (
                            <span className="shrink-0 flex items-center justify-center text-ink-3">{selectedOption.icon}</span>
                        )}
                        {selectedOption?.imageUrl && (
                            <img src={selectedOption.imageUrl} alt="" className="size-5 rounded-full object-cover shrink-0" />
                        )}
                        <span className={selectedOption ? 'text-ink font-medium' : 'text-ink-3'}>
                            {selectedOption?.label || placeholder}
                        </span>
                    </div>
                    <ChevronDown
                        className={clsx(
                            'size-4 text-ink-3 transition-transform duration-150 shrink-0 ml-2',
                            isOpen && 'rotate-180 text-ink'
                        )}
                    />
                </button>

                {isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-paper border border-line rounded-panel shadow-pop p-1 animate-pop min-w-full">
                        {searchable && (
                            <div className="p-1 mb-1 border-b border-line">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-ink-3" />
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder={searchPlaceholder}
                                        className="w-full h-8 pl-8 pr-2.5 text-sm rounded-ctl border border-line bg-paper-2 text-ink focus-visible:outline-none focus-visible:border-ink placeholder:text-sm"
                                    />
                                </div>
                            </div>
                        )}
                        <div className={clsx("overflow-y-auto", maxHeightClass)}>
                            {filteredOptions.length === 0 ? (
                                <div className="px-3 py-3 text-caption text-ink-3 text-center">
                                    No options found
                                </div>
                            ) : (
                                filteredOptions.map((option) => {
                                    const isSelected = option.value === value;
                                    return (
                                        <button
                                            key={option.value}
                                            id={`select-option-${option.value}`}
                                            type="button"
                                            onClick={() => handleSelect(option.value)}
                                            className={clsx(
                                                'w-full min-h-[36px] px-2.5 py-1.5 rounded-ctl text-left text-sm flex items-center justify-between gap-2.5 transition-colors cursor-pointer',
                                                isSelected
                                                    ? 'bg-paper-2 text-ink font-medium'
                                                    : 'text-ink-2 hover:bg-paper-2 hover:text-ink'
                                            )}
                                        >
                                            <div className="flex items-center gap-2.5 truncate">
                                                {option.icon && (
                                                    <span className="shrink-0 flex items-center justify-center text-ink-3">{option.icon}</span>
                                                )}
                                                {option.imageUrl && (
                                                    <img src={option.imageUrl} alt="" className="size-5 rounded-full object-cover shrink-0" />
                                                )}
                                                <div className="truncate">
                                                    <div className="text-sm">{option.label}</div>
                                                    {option.description && (
                                                        <div className="text-micro text-ink-3 mt-0.5">
                                                            {option.description}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {isSelected && (
                                                <Check className="size-4 text-primary-500 shrink-0 ml-2" />
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>
            {error && (
                <p className="flex items-center gap-1 text-micro text-danger-text">
                    <AlertTriangle className="size-3.5 shrink-0" />
                    <span>{error}</span>
                </p>
            )}
        </div>
    );
}
