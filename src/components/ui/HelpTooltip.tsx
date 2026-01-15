'use client';

import { useState, useRef, useEffect } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { useSettingsStore } from '@/lib/store';
import { FINANCIAL_TERMS, FinancialTermDefinition } from '@/lib/utils/financialTerms';

interface HelpTooltipProps {
    termKey: string;
    className?: string;
    size?: 'sm' | 'md';
}

export function HelpTooltip({ termKey, className = '', size = 'sm' }: HelpTooltipProps) {
    const { company } = useSettingsStore();
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState<'top' | 'bottom'>('top');
    const triggerRef = useRef<HTMLButtonElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    // Don't render if help is disabled in settings
    if (!company.showFieldHelp) return null;

    const term = FINANCIAL_TERMS[termKey];
    if (!term) return null;

    // Calculate position based on viewport
    useEffect(() => {
        if (isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const spaceAbove = rect.top;
            const spaceBelow = window.innerHeight - rect.bottom;
            setPosition(spaceBelow < 250 && spaceAbove > spaceBelow ? 'top' : 'bottom');
        }
    }, [isOpen]);

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (
                tooltipRef.current &&
                !tooltipRef.current.contains(e.target as Node) &&
                triggerRef.current &&
                !triggerRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

    return (
        <span className={`relative inline-flex items-center ${className}`}>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    ${iconSize} text-neutral-400 hover:text-blue-500 
                    dark:text-neutral-500 dark:hover:text-blue-400
                    transition-colors cursor-help
                `}
                aria-label={`Help: ${term.term}`}
            >
                <HelpCircle className="w-full h-full" />
            </button>

            {isOpen && (
                <div
                    ref={tooltipRef}
                    className={`
                        absolute z-50 w-72 p-4 
                        bg-white dark:bg-neutral-800 
                        border border-neutral-200 dark:border-neutral-700
                        rounded-xl shadow-xl
                        ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}
                        left-1/2 -translate-x-1/2
                        animate-in fade-in slide-in-from-bottom-2 duration-200
                    `}
                >
                    {/* Arrow */}
                    <div
                        className={`
                            absolute left-1/2 -translate-x-1/2 w-3 h-3 rotate-45
                            bg-white dark:bg-neutral-800
                            border-neutral-200 dark:border-neutral-700
                            ${position === 'top'
                                ? 'bottom-0 translate-y-1/2 border-r border-b'
                                : 'top-0 -translate-y-1/2 border-l border-t'}
                        `}
                    />

                    {/* Close button */}
                    <button
                        onClick={() => setIsOpen(false)}
                        className="absolute top-2 right-2 p-1 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>

                    {/* Content */}
                    <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-[#2d3748] dark:text-white pr-6">
                            {term.term}
                        </h4>
                        <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                            {term.definition}
                        </p>

                        {term.calculation && (
                            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700">
                                <div className="flex items-start gap-2">
                                    <span className="text-xs">📊</span>
                                    <div>
                                        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Calculation</span>
                                        <p className="text-xs text-neutral-700 dark:text-neutral-200 font-mono mt-0.5">
                                            {term.calculation}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {term.example && (
                            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700">
                                <div className="flex items-start gap-2">
                                    <span className="text-xs">💡</span>
                                    <div>
                                        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Example</span>
                                        <p className="text-xs text-neutral-700 dark:text-neutral-200 mt-0.5">
                                            {term.example}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </span>
    );
}

// Inline label with help tooltip
interface LabelWithHelpProps {
    label: string;
    termKey: string;
    required?: boolean;
    className?: string;
}

export function LabelWithHelp({ label, termKey, required, className = '' }: LabelWithHelpProps) {
    return (
        <span className={`inline-flex items-center gap-1.5 ${className}`}>
            <span>{label}</span>
            {required && <span className="text-red-500">*</span>}
            <HelpTooltip termKey={termKey} />
        </span>
    );
}

export default HelpTooltip;
