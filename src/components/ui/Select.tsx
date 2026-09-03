"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { ChevronDown, Check, Search } from 'lucide-react';

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

        // Only capture single characters, not special keys
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
        <div className={clsx('flex flex-col gap-1.5', className, isOpen && 'relative z-50')} ref={containerRef}>
            {label && (
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                    {label}
                </label>
            )}
            <div className={clsx('relative', isOpen && 'z-50')}>
                <button
                    type="button"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                    className={clsx(
                        'dropdown-trigger',
                        isOpen && 'dropdown-trigger-open',
                        error && '!border-red-500 !ring-red-500/20',
                        disabled && 'opacity-50 cursor-not-allowed'
                    )}
                >
                    <div className="flex items-center gap-2.5 truncate">
                        {selectedOption?.icon && (
                            <span className="shrink-0 flex items-center justify-center">{selectedOption.icon}</span>
                        )}
                        {selectedOption?.imageUrl && (
                            <img src={selectedOption.imageUrl} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                        )}
                        <span className={selectedOption ? 'text-neutral-900 dark:text-white font-medium' : 'text-neutral-400'}>
                            {selectedOption?.label || placeholder}
                        </span>
                    </div>
                    <ChevronDown
                        className={clsx(
                            'w-4 h-4 text-neutral-400 transition-transform duration-200 shrink-0 ml-2',
                            isOpen && 'rotate-180 text-[#fc6d2d]'
                        )}
                    />
                </button>

                {isOpen && (
                    <div className="dropdown-menu-panel">
                        {searchable && (
                            <div className="dropdown-search-container">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder={searchPlaceholder}
                                        className="dropdown-search-input"
                                    />
                                </div>
                            </div>
                        )}
                        <div className="dropdown-options-list max-h-60 overflow-y-auto py-1">
                            {filteredOptions.length === 0 ? (
                                <div className="px-4 py-3.5 text-xs text-neutral-400 dark:text-neutral-500 text-center">
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
                                                'dropdown-option-item',
                                                isSelected && 'dropdown-option-item-selected'
                                            )}
                                        >
                                            <div className="flex items-center gap-3 truncate">
                                                {option.icon && (
                                                    <span className="shrink-0 flex items-center justify-center text-base">{option.icon}</span>
                                                )}
                                                {option.imageUrl && (
                                                    <img src={option.imageUrl} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                                                )}
                                                <div className="truncate">
                                                    <div className="font-medium text-xs">{option.label}</div>
                                                    {option.description && (
                                                        <div className="text-[11px] text-neutral-400 mt-0.5 font-normal">
                                                            {option.description}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {isSelected && (
                                                <Check className="w-4 h-4 text-[#fc6d2d] shrink-0 ml-2" />
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>
            {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
        </div>
    );
}
