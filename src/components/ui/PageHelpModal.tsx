'use client';

import { useState } from 'react';
import { Info, BookOpen, Lightbulb, HelpCircle } from '@/components/icons';
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

    if (company.showFieldHelp === false) {
        return null;
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className={`inline-flex items-center justify-center transition-colors cursor-pointer text-ink-3 hover:text-ink shrink-0 ${
                    buttonSize === 'sm' ? 'size-4' : 'size-5'
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
                <div className="space-y-4">
                    {/* Description Banner */}
                    <div className="panel-sunken p-4 text-body text-ink leading-relaxed flex items-start gap-3">
                        <Info className="size-5 text-ink-3 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-body mb-1">{title}</p>
                            <p className="text-caption text-ink-2">{description}</p>
                        </div>
                    </div>

                    {/* Key Terms */}
                    {terms.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="th flex items-center gap-1.5">
                                <BookOpen className="size-4 text-ink-3" />
                                Key Terms & Definitions
                            </h4>
                            <div className="space-y-2">
                                {terms.map((item, idx) => (
                                    <div key={idx} className="panel-sunken p-3 text-body space-y-1">
                                        <p className="font-semibold text-ink">
                                            {item.term}
                                        </p>
                                        <p className="text-caption text-ink-2">
                                            {item.definition}
                                        </p>
                                        {item.example && (
                                            <p className="text-micro text-primary-text font-mono mt-1">
                                                Example: {item.example}
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
                            <h4 className="th flex items-center gap-1.5">
                                <Lightbulb className="size-4 text-ink-3" />
                                Best Practices
                            </h4>
                            <ul className="space-y-1.5 text-caption text-ink-2">
                                {tips.map((tip, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                        <span className="text-primary-500 font-bold">•</span>
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
