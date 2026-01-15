import { useState } from 'react';
import { NumberingSettings, useSettingsStore } from '@/lib/store/settingsStore';
import { generateDocumentNumber, parseFormat, getFormatPreview } from '@/lib/utils/numbering';
import { Input, Button } from '@/components/ui';
import { Hash, Calendar, Users, HelpCircle, Check, AlertTriangle, Trash2, Plus, Box, UserSquare, FileText } from 'lucide-react';

interface DocumentNumberingProps {
    value: NumberingSettings;
    onChange: (value: NumberingSettings) => void;
}

type DocType = 'invoice' | 'receipt' | 'deliveryNote' | 'customer' | 'product';

const PRESETS_MAP: Record<DocType, { name: string, format: string, label: string }[]> = {
    invoice: [
        { name: 'Standard', format: 'INV-YYYY-####', label: 'INV-2026-0001' },
        { name: 'Simple', format: 'INV-####', label: 'INV-0001' },
        { name: 'Date-based', format: 'INV-YYYYMM-####', label: 'INV-202601-0001' },
        { name: 'Customer', format: 'INV-CUST-####', label: 'INV-ABC-0001' },
    ],
    receipt: [
        { name: 'Standard', format: 'RCT-YYYY-####', label: 'RCT-2026-0001' },
        { name: 'Simple', format: 'RCT-####', label: 'RCT-0001' },
    ],
    deliveryNote: [
        { name: 'Standard', format: 'DN-YYYY-####', label: 'DN-2026-0001' },
        { name: 'Simple', format: 'DN-####', label: 'DN-0001' },
    ],
    customer: [
        { name: 'Standard', format: 'CUST-####', label: 'CUST-0001' },
        { name: 'Simple', format: '####', label: '0001' },
        { name: 'Initials', format: 'INIT-####', label: 'JD-0001' },
    ],
    product: [
        { name: 'Standard', format: 'SKU-####', label: 'SKU-0001' },
        { name: 'Category Based', format: 'CAT-####', label: 'DES-0001' },
        { name: 'Simple', format: '####', label: '0001' },
        { name: 'Prefixed', format: 'P-####', label: 'P-0001' },
    ]
};

const TAB_CONFIG: { id: DocType; label: string; icon: any }[] = [
    { id: 'invoice', label: 'Invoice', icon: FileText },
    { id: 'receipt', label: 'Receipt', icon: FileText },
    { id: 'deliveryNote', label: 'Delivery Note', icon: FileText },
    { id: 'customer', label: 'Customer', icon: Users },
    { id: 'product', label: 'Product', icon: Box },
];

export default function DocumentNumbering({ value, onChange }: DocumentNumberingProps) {
    const { customNumberingFormats, addCustomNumberingFormat, removeCustomNumberingFormat } = useSettingsStore();
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
        const currentFormat = value[activeTab]?.format || '';
        updateFormat(activeTab, currentFormat + (currentFormat.endsWith('-') ? '' : '-') + token);
    };

    const currentSettings = value[activeTab];

    // Guard against undefined settings (e.g. during migration)
    if (!currentSettings) {
        return <div className="p-4 text-center text-neutral-500">Settings not available for this type.</div>;
    }

    const preview = generateDocumentNumber(currentSettings.format, currentSettings.nextNumber, {
        details: { date: new Date(), customerCode: 'ABC', customerName: 'John Doe' }
    });

    // Safety check
    const isValid = currentSettings.format.includes('#');

    // Get presets for current tab
    const standardPresets = (PRESETS_MAP[activeTab] || []).map(p => ({
        ...p,
        isCustom: false
    }));

    const customPresets = (customNumberingFormats[activeTab] || []).map(format => ({
        name: 'Custom',
        format: format,
        label: getFormatPreview(format, 1), // Generate preview for label
        isCustom: true
    }));

    const allPresets = [...standardPresets, ...customPresets];

    const isCurrentFormatInPresets = allPresets.some(p => p.format === currentSettings.format);

    return (
        <section className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-lg">
                    <Hash className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-[#2d3748] dark:text-white">ID & Numbering</h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        Configure how new IDs are generated for documents, customers, and products.
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-neutral-100 dark:border-neutral-700 mb-6 overflow-x-auto pb-1">
                {TAB_CONFIG.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`pb-2 px-3 text-sm font-medium transition-colors relative flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300'
                                }`}
                        >
                            {(activeTab === tab.id) && <Icon className="w-4 h-4" />}
                            {tab.label}
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />
                            )}
                        </button>
                    )
                })}
            </div>

            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300" key={activeTab}>
                {/* Format Editor */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                            Format Pattern
                        </label>
                        {!isCurrentFormatInPresets && isValid && (
                            <button
                                onClick={() => addCustomNumberingFormat(activeTab, currentSettings.format)}
                                className="text-xs flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
                            >
                                <Plus className="w-3 h-3" />
                                Save as Preset
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2 mb-3">
                        <Input
                            value={currentSettings.format}
                            onChange={(e) => updateFormat(activeTab, e.target.value)}
                            placeholder={activeTab === 'customer' ? 'CUST-####' : 'INV-YYYY-####'}
                            className="font-mono text-sm"
                        />
                    </div>

                    {/* Token Buttons */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        <TokenButton icon={Hash} label="####" onClick={() => insertToken('####')} tooltip="Sequence Number (Required)" />

                        {(activeTab !== 'customer' && activeTab !== 'product') && (
                            <>
                                <TokenButton icon={Calendar} label="YYYY" onClick={() => insertToken('YYYY')} tooltip="Year (2026)" />
                                <TokenButton icon={Calendar} label="MM" onClick={() => insertToken('MM')} tooltip="Month (01)" />
                                <TokenButton icon={Calendar} label="DD" onClick={() => insertToken('DD')} tooltip="Day (06)" />
                                <TokenButton icon={Users} label="CUST" onClick={() => insertToken('CUST')} tooltip="Customer Code (ABC)" />
                            </>
                        )}

                        {activeTab === 'customer' && (
                            <>
                                <TokenButton icon={UserSquare} label="INIT" onClick={() => insertToken('INIT')} tooltip="Customer Initials (JD)" />
                                <TokenButton icon={Users} label="CUST" onClick={() => insertToken('CUST')} tooltip="Custom Code" />
                            </>
                        )}

                        {activeTab === 'product' && (
                            <div className="text-xs text-neutral-400 flex items-center ml-2">
                                * Simple layouts recommended for IDs
                            </div>
                        )}
                    </div>

                    {!isValid && (
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                            <AlertTriangle className="w-4 h-4" />
                            <span>Format must include a sequence number (e.g., ####).</span>
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
                            The next {TAB_CONFIG.find(t => t.id === activeTab)?.label.toLowerCase()} will use this number.
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
                                Valid
                            </div>
                        </div>
                        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2">
                            Example of generated ID.
                        </p>
                    </div>
                </div>

                {/* Recommended Presets */}
                <div>
                    <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
                        Presets
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {allPresets.map((preset, index) => {
                            const isSelected = preset.format === currentSettings.format;

                            return (
                                <button
                                    key={`${preset.name}-${index}`}
                                    onClick={() => updateFormat(activeTab, preset.format)}
                                    // Persistent highlight logic
                                    className={`relative text-left p-3 rounded-lg border transition-all group ${isSelected
                                        ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/10'
                                        : 'border-neutral-200 dark:border-neutral-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10'
                                        }`}
                                >
                                    <div className={`text-xs font-medium mb-1 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-500 dark:text-neutral-400'}`}>
                                        {preset.name}
                                    </div>
                                    <div className={`text-sm font-mono font-medium ${isSelected ? 'text-[#2d3748] dark:text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>
                                        {preset.label}
                                    </div>

                                    {/* Delete button only for custom presets */}
                                    {preset.isCustom && (
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeCustomNumberingFormat(activeTab, preset.format);
                                            }}
                                            className="absolute top-1 right-1 p-1 rounded-full text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Remove Preset"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </div>
                                    )}
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
