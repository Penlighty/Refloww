'use client';

import { useState } from 'react';
import { Info, X, Sparkles, BookOpen, Lightbulb, HelpCircle } from 'lucide-react';
import { Modal, ModalFooter, Button } from '@/components/ui';
import { useSettingsStore } from '@/lib/store';

export interface HelpTerm {
    term: string;
    definition: string;
    example?: string;
}

export interface PageHelpModalProps {
    title: string;
    description: string;
    terms?: HelpTerm[];
    tips?: string[];
    buttonSize?: 'sm' | 'md';
    className?: string;
}

export function PageHelpModal({
    title,
    description,
    terms = [],
    tips = [],
    buttonSize = 'sm',
    className = '',
}: PageHelpModalProps) {
    const { company } = useSettingsStore();
    const [isOpen, setIsOpen] = useState(false);

    // Respect user's settings preference: hide if help icons are disabled in Settings
    if (company.showFieldHelp === false) {
        return null;
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className={`inline-flex items-center justify-center transition-colors cursor-pointer text-neutral-400 hover:text-blue-500 dark:text-neutral-500 dark:hover:text-blue-400 shrink-0 ${
                    buttonSize === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
                } ${className}`}
                title={`Help & Details: ${title}`}
                aria-label={`Help: ${title}`}
            >
                <HelpCircle className="w-full h-full" />
            </button>

            <Modal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                title={title}
                size="md"
            >
                <div className="space-y-5">
                    {/* Description Banner */}
                    <div className="p-4 bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/40 rounded-xl text-xs text-violet-900 dark:text-violet-200 leading-relaxed flex items-start gap-3">
                        <Info className="w-5 h-5 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-sm mb-1">{title}</p>
                            <p>{description}</p>
                        </div>
                    </div>

                    {/* Key Terms */}
                    {terms.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                                <BookOpen className="w-4 h-4 text-indigo-500" />
                                Key Terms & Definitions
                            </h4>
                            <div className="space-y-2">
                                {terms.map((item, idx) => (
                                    <div key={idx} className="p-3 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-700/60 rounded-xl text-xs space-y-1">
                                        <p className="font-semibold text-neutral-900 dark:text-white">
                                            {item.term}
                                        </p>
                                        <p className="text-neutral-600 dark:text-neutral-300">
                                            {item.definition}
                                        </p>
                                        {item.example && (
                                            <p className="text-[11px] text-violet-600 dark:text-violet-400 italic">
                                                💡 Example: {item.example}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Pro Tips */}
                    {tips.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                                <Lightbulb className="w-4 h-4 text-amber-500" />
                                Useful Tips & Best Practices
                            </h4>
                            <ul className="space-y-1.5 text-xs text-neutral-700 dark:text-neutral-300">
                                {tips.map((tip, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                        <span className="text-amber-500 font-bold">•</span>
                                        <span>{tip}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <ModalFooter>
                    <Button onClick={() => setIsOpen(false)}>Got it</Button>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default PageHelpModal;
