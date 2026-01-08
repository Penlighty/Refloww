"use client";

import { useState } from 'react';
import { NumberingSettings } from '@/lib/store/settingsStore';
import { generateDocumentNumber, parseFormat } from '@/lib/utils/numbering';
import { Input, Button } from '@/components/ui';
import { Hash, Calendar, Users, HelpCircle, Check, AlertTriangle } from 'lucide-react';

interface DocumentNumberingProps {
    value: NumberingSettings;
    onChange: (value: NumberingSettings) => void;
}

type DocType = 'invoice' | 'receipt' | 'deliveryNote';

const PRESETS = [
    { name: 'Standard', format: 'INV-YYYY-####', label: 'INV-2026-0001' },
    { name: 'Simple', format: 'INV-####', label: 'INV-0001' },
    { name: 'Date-based', format: 'INV-YYYYMM-####', label: 'INV-202601-0001' },
    { name: 'Customer', format: 'INV-CUST-####', label: 'INV-ABC-0001' },
];

export default function DocumentNumbering({ value, onChange }: DocumentNumberingProps) {
    const [activeTab, setActiveTab] = useState<DocType>('invoice');

    const updateFormat = (type: DocType, newFormat: string) => {
        onChange({
            ...value,
            [type]: { ...value[type], format: newFormat }
        });
    };

    const updateNextNumber = (type: DocType, num: number) => {
        onChange({
            ...value,
            [type]: { ...value[type], nextNumber: num }
        });
    };

    const insertToken = (token: string) => {
        const currentFormat = value[activeTab].format;
        updateFormat(activeTab, currentFormat + (currentFormat.endsWith('-') ? '' : '-') + token);
    };

    const currentSettings = value[activeTab];
    const preview = generateDocumentNumber(currentSettings.format, currentSettings.nextNumber, {
        details: { date: new Date(), customerCode: 'ABC' }
    });

    // Safety check
    const isValid = currentSettings.format.includes('#');

    return (
        <section className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-lg">
                    <Hash className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-[#2d3748] dark:text-white">Document Numbering</h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        Configure how your document numbers are generated.
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-neutral-100 dark:border-neutral-700 mb-6">
                {(['invoice', 'receipt', 'deliveryNote'] as DocType[]).map((type) => (
                    <button
                        key={type}
                        onClick={() => setActiveTab(type)}
                        className={`pb-2 px-1 text-sm font-medium transition-colors relative ${activeTab === type
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300'
                            }`}
                    >
                        {type === 'deliveryNote' ? 'Delivery Note' : type.charAt(0).toUpperCase() + type.slice(1)}
                        {activeTab === type && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />
                        )}
                    </button>
                ))}
            </div>

            <div className="space-y-6">
                {/* Format Editor */}
                <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Number Format
                    </label>
                    <div className="flex gap-2 mb-3">
                        <Input
                            value={currentSettings.format}
                            onChange={(e) => updateFormat(activeTab, e.target.value)}
                            placeholder="e.g. INV-YYYY-####"
                            className="font-mono text-sm"
                        />
                    </div>

                    {/* Token Buttons */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        <TokenButton icon={Calendar} label="YYYY" onClick={() => insertToken('YYYY')} tooltip="Year (2026)" />
                        <TokenButton icon={Calendar} label="MM" onClick={() => insertToken('MM')} tooltip="Month (01)" />
                        <TokenButton icon={Calendar} label="DD" onClick={() => insertToken('DD')} tooltip="Day (06)" />
                        <TokenButton icon={Users} label="CUST" onClick={() => insertToken('CUST')} tooltip="Customer Code (ABC)" />
                        <TokenButton icon={Hash} label="####" onClick={() => insertToken('####')} tooltip="Sequence Number" />
                    </div>

                    {!isValid && (
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                            <AlertTriangle className="w-4 h-4" />
                            <span>Format must include a sequence number (e.g., ####) to function correctly.</span>
                        </div>
                    )}
                </div>

                {/* Configuration Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                            Next Sequence Number
                        </label>
                        <Input
                            type="number"
                            value={currentSettings.nextNumber}
                            onChange={(e) => updateNextNumber(activeTab, parseInt(e.target.value) || 1)}
                            min={1}
                        />
                        <p className="text-xs text-neutral-500 mt-1.5">
                            The next document generated will use this sequence number.
                        </p>
                    </div>

                    <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4 border border-neutral-100 dark:border-neutral-700">
                        <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                            PREVIEW
                        </label>
                        <div className="flex items-center justify-between">
                            <span className="text-xl font-mono font-medium text-[#2d3748] dark:text-white tracking-tight">
                                {preview}
                            </span>
                            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full font-medium">
                                <Check className="w-3 h-3" />
                                Valid Format
                            </div>
                        </div>
                        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2">
                            This is how your next {activeTab === 'deliveryNote' ? 'delivery note' : activeTab} will look.
                        </p>
                    </div>
                </div>

                {/* Recommended Presets */}
                <div>
                    <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
                        Recommended Presets
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {PRESETS.map((preset) => {
                            // Adjust preset prefix based on tab
                            const prefix = activeTab === 'invoice' ? 'INV' : activeTab === 'receipt' ? 'REC' : 'DN';
                            const adaptedFormat = preset.format.replace(/^INV/, prefix);
                            const adaptedLabel = preset.label.replace(/^INV/, prefix);

                            return (
                                <button
                                    key={preset.name}
                                    onClick={() => updateFormat(activeTab, adaptedFormat)}
                                    className="text-left p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group"
                                >
                                    <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                        {preset.name}
                                    </div>
                                    <div className="text-sm font-mono font-medium text-neutral-700 dark:text-neutral-300">
                                        {adaptedLabel}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}

function TokenButton({ icon: Icon, label, onClick, tooltip }: any) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-md text-xs font-medium hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors border border-transparent hover:border-neutral-300 dark:hover:border-neutral-500"
            title={tooltip}
        >
            <Icon className="w-3.5 h-3.5" />
            {label}
        </button>
    );
}
