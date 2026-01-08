"use client";

import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui';

interface DateRangePickerProps {
    startDate: string | null;
    endDate: string | null;
    onStartDateChange: (date: string | null) => void;
    onEndDateChange: (date: string | null) => void;
}

const presets = [
    {
        label: 'Today', getValue: () => {
            const today = new Date().toISOString().split('T')[0];
            return { start: today, end: today };
        }
    },
    {
        label: 'Last 7 days', getValue: () => {
            const end = new Date();
            const start = new Date();
            start.setDate(start.getDate() - 7);
            return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
        }
    },
    {
        label: 'Last 30 days', getValue: () => {
            const end = new Date();
            const start = new Date();
            start.setDate(start.getDate() - 30);
            return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
        }
    },
    {
        label: 'This month', getValue: () => {
            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
        }
    },
    {
        label: 'Last month', getValue: () => {
            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const end = new Date(now.getFullYear(), now.getMonth(), 0);
            return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
        }
    },
    {
        label: 'This year', getValue: () => {
            const now = new Date();
            const start = new Date(now.getFullYear(), 0, 1);
            const end = new Date(now.getFullYear(), 11, 31);
            return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
        }
    },
];

export default function DateRangePicker({ startDate, endDate, onStartDateChange, onEndDateChange }: DateRangePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handlePresetClick = (preset: typeof presets[0]) => {
        const { start, end } = preset.getValue();
        onStartDateChange(start);
        onEndDateChange(end);
        setIsOpen(false);
    };

    const handleClear = () => {
        onStartDateChange(null);
        onEndDateChange(null);
    };

    const formatDisplayDate = (date: string | null) => {
        if (!date) return null;
        return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const hasDateRange = startDate || endDate;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors text-sm ${hasDateRange
                    ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                    : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600'
                    }`}
            >
                <Calendar className="w-4 h-4" />
                {hasDateRange ? (
                    <span>
                        {formatDisplayDate(startDate)} - {formatDisplayDate(endDate)}
                    </span>
                ) : (
                    <span>Date Range</span>
                )}
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {hasDateRange && (
                <button
                    onClick={handleClear}
                    className="absolute -right-2 -top-2 w-5 h-5 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-600 dark:text-neutral-300 rounded-full flex items-center justify-center transition-colors shadow-sm"
                >
                    <X className="w-3 h-3" />
                </button>
            )}

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 z-50 overflow-hidden">
                    {/* Presets */}
                    <div className="p-3 border-b border-neutral-100 dark:border-neutral-700">
                        <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">Quick Select</p>
                        <div className="flex flex-wrap gap-1.5">
                            {presets.map((preset) => (
                                <button
                                    key={preset.label}
                                    onClick={() => handlePresetClick(preset)}
                                    className="px-2.5 py-1 text-xs font-medium rounded-lg bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Date Inputs */}
                    <div className="p-3">
                        <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">Custom Range</p>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">From</label>
                                <input
                                    type="date"
                                    value={startDate || ''}
                                    onChange={(e) => onStartDateChange(e.target.value || null)}
                                    className="w-full px-2.5 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 focus:border-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">To</label>
                                <input
                                    type="date"
                                    value={endDate || ''}
                                    onChange={(e) => onEndDateChange(e.target.value || null)}
                                    className="w-full px-2.5 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 focus:border-blue-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-3 border-t border-neutral-100 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={handleClear}>
                            Clear
                        </Button>
                        <Button size="sm" onClick={() => setIsOpen(false)}>
                            Apply
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
