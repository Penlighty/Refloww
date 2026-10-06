'use client';

import { useState, useRef, useEffect } from 'react';
import { HelpCircle, X, Analytics, Lightbulb } from '@/components/icons';
import { useSettingsStore } from '@/lib/store';
import { FINANCIAL_TERMS } from '@/lib/utils/financialTerms';

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

    if (!company.showFieldHelp) return null;

    const term = FINANCIAL_TERMS[termKey];
    if (!term) return null;

    useEffect(() => {
        if (isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const spaceAbove = rect.top;
            const spaceBelow = window.innerHeight - rect.bottom;
            setPosition(spaceBelow < 250 && spaceAbove > spaceBelow ? 'top' : 'bottom');
        }
    }, [isOpen]);

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

    const iconSize = size === 'sm' ? 'size-3.5' : 'size-4';

    return (
        <span className={`relative inline-flex items-center ${className}`}>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`${iconSize} text-ink-3 hover:text-primary-text transition-colors cursor-help`}
                aria-label={`Help: ${term.term}`}
            >
                <HelpCircle className="w-full h-full" />
            </button>

            {isOpen && (
                <div
                    ref={tooltipRef}
                    className={`
                        absolute z-50 w-72 p-4 
                        bg-paper border border-line
                        rounded-panel shadow-pop
                        ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}
                        left-1/2 -translate-x-1/2
                        animate-pop
                    `}
                >
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="absolute top-2 right-2 p-1 rounded-ctl text-ink-3 hover:text-ink hover:bg-paper-2 transition-colors"
                        aria-label="Close help"
                    >
                        <X className="size-3.5" />
                    </button>

                    <div className="space-y-2">
                        <h4 className="font-heading font-semibold text-body text-ink pr-6">
                            {term.term}
                        </h4>
                        <p className="text-caption text-ink-2 leading-relaxed">
                            {term.definition}
                        </p>

                        {term.calculation && (
                            <div className="pt-2 border-t border-line">
                                <div className="flex items-start gap-2">
                                    <Analytics className="size-3.5 text-ink-3 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="text-micro font-medium text-ink-3">Calculation</span>
                                        <p className="text-micro text-ink font-mono mt-0.5">
                                            {term.calculation}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {term.example && (
                            <div className="pt-2 border-t border-line">
                                <div className="flex items-start gap-2">
                                    <Lightbulb className="size-3.5 text-ink-3 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="text-micro font-medium text-ink-3">Example</span>
                                        <p className="text-micro text-ink-2 mt-0.5">
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
            {required && <span className="text-danger-text">*</span>}
            <HelpTooltip termKey={termKey} />
        </span>
    );
}

export default HelpTooltip;
