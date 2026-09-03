"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTemplateStore, useSettingsStore } from '@/lib/store';
import { MappedField, FieldType, TextAlignment, DocumentType } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { compressImage } from '@/lib/utils/image-utils';
import { Button, Modal, ModalFooter, Input, Select, EmptyState } from '@/components/ui';
import { AutoFitText } from '@/components/AutoFitText';
import {
    ArrowLeft,
    Save,
    Plus,
    Trash2,
    Move,
    Type,
    Settings,
    Eye,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    Layers,
    MousePointer,
    Square,
    AlignLeft,
    AlignCenter,
    AlignRight,
    GripVertical,
    X,
    Check,
    Undo,
    Redo,
    ChevronDown,
    ChevronUp,
    Settings2,
    Maximize2,
    Copy,
    Clipboard,
    ClipboardPaste
} from 'lucide-react';

// Helper component for properties panel sections
const PropertySection = ({
    id,
    title,
    activeSection,
    setActiveSection,
    children,
    icon: Icon
}: {
    id: string;
    title: string;
    activeSection: string | null;
    setActiveSection: (id: string | null) => void;
    children: React.ReactNode;
    icon?: any;
}) => {
    const isOpen = activeSection === id;
    return (
        <div className="border-b border-neutral-100 dark:border-neutral-700 last:border-0">
            <button
                onClick={() => setActiveSection(isOpen ? null : id)}
                className={`w-full flex items-center justify-between p-4 text-left transition-all duration-200 ${isOpen ? 'bg-blue-50/40 dark:bg-blue-900/10' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/30'}`}
            >
                <div className="flex items-center gap-2.5">
                    {Icon && <Icon className={`w-4 h-4 ${isOpen ? 'text-blue-500' : 'text-neutral-400'}`} strokeWidth={2.5} />}
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${isOpen ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-500 dark:text-neutral-400'}`}>
                        {title}
                    </span>
                </div>
                {isOpen ? (
                    <ChevronUp className="w-3.5 h-3.5 text-blue-500" strokeWidth={3} />
                ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-neutral-400" strokeWidth={2} />
                )}
            </button>
            {isOpen && (
                <div className="p-4 space-y-5 animate-in slide-in-from-top-1 duration-200">
                    {children}
                </div>
            )}
        </div>
    );
};

// Field type options - Custom Field first, then alphabetically sorted
const fieldTypeOptions = [
    { value: 'custom', label: 'Custom Field' },
    { value: 'amount-due', label: 'Amount Due' },
    { value: 'amount-in-words', label: 'Amount in Words' },
    { value: 'amount-paid', label: 'Amount Paid' },
    { value: 'customer-address', label: 'Customer Address' },
    { value: 'customer-email', label: 'Customer Email' },
    { value: 'customer-name', label: 'Customer Name' },
    { value: 'customer-phone', label: 'Customer Phone' },
    { value: 'discount', label: 'Discount Amount' },
    { value: 'discount-name', label: 'Discount Name' },
    { value: 'document-number', label: 'Document Number' },
    { value: 'date', label: 'Document Date' },
    { value: 'due-date', label: 'Due Date' },
    { value: 'grand-total', label: 'Grand Total' },
    { value: 'line-items', label: 'Line Items Table' },
    { value: 'link-button', label: 'Link Button' },
    { value: 'notes', label: 'Notes' },
    { value: 'text', label: 'Static Text' },
    { value: 'subtotal', label: 'Subtotal' },
    { value: 'tax', label: 'Tax' },
];

// Sample data for preview
const initialSampleData: Record<string, string> = {
    'text': 'Sample Text',
    'date': 'Jan 4, 2026',
    'due-date': 'Jan 18, 2026',
    'document-number': 'INV-0001',
    'customer-name': 'Acme Corporation',
    'customer-email': 'contact@acme.com',
    'customer-phone': '(555) 123-4567',
    'customer-address': '123 Business St, City',
    'line-items': 'Product × Qty = Amount',
    'subtotal': '$1,000.00',
    'discount': '-$50.00',
    'discount-name': 'Holiday Promo (5%)',
    'tax': '$95.00',
    'grand-total': '$1,045.00',
    'amount-paid': '$45.00',
    'amount-due': '$1,000.00',
    'amount-in-words': 'One Thousand Forty-Five Only',
    'notes': 'Thank you for your business!',

    'custom': 'Custom Value',
    'link-button': 'Pay Now',
};

// Layout Constants
const ROW_HEIGHT_PX = 25;
const HEADER_HEIGHT_PX = 24; // approx 1.5em at 16px base font size or similar. Adjusted to match visual style.
// Since we used fontSize '0.8em', and height '1.5em'
// If fontSize is user defined, this is tricky.
// We will enforce a fixed row height for visualization to ensure "Strict Equality" as requested.


// Field type colors for visual distinction
const fieldTypeColors: Record<string, string> = {
    'text': 'border-neutral-400 bg-neutral-50/40 dark:bg-neutral-800/40',
    'date': 'border-blue-400 bg-blue-50/40 dark:bg-blue-900/20',
    'due-date': 'border-blue-400 bg-blue-50/40 dark:bg-blue-900/20',
    'document-number': 'border-violet-400 bg-violet-50/40 dark:bg-violet-900/20',
    'customer-name': 'border-emerald-400 bg-emerald-50/40 dark:bg-emerald-900/20',
    'customer-email': 'border-emerald-400 bg-emerald-50/40 dark:bg-emerald-900/20',
    'customer-phone': 'border-emerald-400 bg-emerald-50/40 dark:bg-emerald-900/20',
    'customer-address': 'border-emerald-400 bg-emerald-50/40 dark:bg-emerald-900/20',
    'line-items': 'border-transparent bg-amber-50/40 dark:bg-amber-900/20',
    'subtotal': 'border-rose-400 bg-rose-50/40 dark:bg-rose-900/20',
    'discount': 'border-rose-400 bg-rose-50/40 dark:bg-rose-900/20',
    'discount-name': 'border-rose-400 bg-rose-50/40 dark:bg-rose-900/20',
    'tax': 'border-rose-400 bg-rose-50/40 dark:bg-rose-900/20',
    'grand-total': 'border-rose-500 bg-rose-100/40 dark:bg-rose-900/30',
    'amount-in-words': 'border-indigo-400 bg-indigo-50/40 dark:bg-indigo-900/20',
    'amount-paid': 'border-rose-400 bg-rose-50/40 dark:bg-rose-900/20',
    'amount-due': 'border-rose-500 bg-rose-100/40 dark:bg-rose-900/30',
    'notes': 'border-neutral-400 bg-neutral-50/40 dark:bg-neutral-800/40',
    'custom': 'border-cyan-400 bg-cyan-50/40 dark:bg-cyan-900/20',
    'link-button': 'border-purple-400 bg-purple-50/40 dark:bg-purple-900/20',
};

// Smart Suggestions for Auto-Complete
const smartSuggestions: Array<{ label: string; type: FieldType }> = [
    { label: 'Invoice Number', type: 'document-number' },
    { label: 'Invoice Date', type: 'date' },
    { label: 'Due Date', type: 'due-date' },
    { label: 'Customer Name', type: 'customer-name' },
    { label: 'Client Name', type: 'customer-name' },
    { label: 'Bill To', type: 'customer-name' },
    { label: 'Shipping Address', type: 'customer-address' },
    { label: 'Billing Address', type: 'customer-address' },
    { label: 'Email', type: 'customer-email' },
    { label: 'Phone', type: 'customer-phone' },
    { label: 'Subtotal', type: 'subtotal' },
    { label: 'Tax', type: 'tax' },
    { label: 'VAT', type: 'tax' },
    { label: 'Discount', type: 'discount' },
    { label: 'Discount Name', type: 'discount-name' },
    { label: 'Promo Name', type: 'discount-name' },
    { label: 'Total', type: 'grand-total' },
    { label: 'Amount in Words', type: 'amount-in-words' },
    { label: 'Amount Paid', type: 'amount-paid' },
    { label: 'Deposit', type: 'amount-paid' },
    { label: 'Amount Due', type: 'amount-due' },
    { label: 'Balance Due', type: 'amount-due' },
    { label: 'Grand Total', type: 'grand-total' },
    { label: 'Notes', type: 'notes' },
    { label: 'Terms & Conditions', type: 'notes' },
    { label: 'Payment Instructions', type: 'notes' },
];

const SmartLabelInput = ({
    value,
    onChange,
    onSelectType,
    className
}: {
    value: string;
    onChange: (val: string) => void;
    onSelectType: (type: FieldType) => void;
    className?: string;
}) => {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filtered, setFiltered] = useState(smartSuggestions);

    // Update filtered suggestions when value changes
    useEffect(() => {
        if (!value) {
            setFiltered(smartSuggestions);
        } else {
            const lower = value.toLowerCase();
            setFiltered(smartSuggestions.filter(s =>
                s.label.toLowerCase().includes(lower) && s.label.toLowerCase() !== lower
            ));
        }
    }, [value]);

    return (
        <div className="relative group">
            <Input
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                    setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Start typing to see suggestions..."
                className={className}
                autoComplete="off"
            />
            {showSuggestions && (value.length > 0 ? filtered.length > 0 : true) && (
                <div className="absolute z-[100] w-full mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl rounded-xl max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-100 no-scrollbar">
                    {(value.length === 0 ? smartSuggestions.slice(0, 5) : filtered).map((s) => (
                        <button
                            key={s.label}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex flex-col gap-0.5 border-b border-neutral-100 dark:border-neutral-800 last:border-0"
                            onClick={() => {
                                onChange(s.label);
                                onSelectType(s.type);
                                setShowSuggestions(false);
                            }}
                        >
                            <span className="text-xs font-semibold text-[#2d3748] dark:text-neutral-200">{s.label}</span>
                            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono">{fieldTypeOptions.find(o => o.value === s.type)?.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

type Tool = 'select' | 'draw';

interface DragState {
    isDragging: boolean;
    isResizing: boolean;
    resizeHandle: string | null;
    startX: number;
    startY: number;
    startField: MappedField | null;
}

export default function TemplateEditorPage() {
    // Mobile bottom drawer state
    const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
    const params = useParams();
    const router = useRouter();
    const templateId = params.id as string;

    const { getTemplateById, updateField, deleteField, addField, updateTemplate } = useTemplateStore();
    const { getNextDocumentNumber, numbering, company } = useSettingsStore();
    const template = getTemplateById(templateId);

    // Connected Template State
    const [activeVariant, setActiveVariant] = useState<DocumentType>(
        (template?.type as DocumentType) || 'invoice'
    );
    const [isVariantUploadModalOpen, setIsVariantUploadModalOpen] = useState(false);
    const [variantUploadType, setVariantUploadType] = useState<DocumentType>('receipt');
    const [variantUploadFile, setVariantUploadFile] = useState<File | null>(null);
    const [variantUploadPreview, setVariantUploadPreview] = useState<string | null>(null);

    // Initialize active variant from template type on load, but detect if it was left in a different state
    const isInitialLoad = useRef(true);
    useEffect(() => {
        if (template && isInitialLoad.current) {
            isInitialLoad.current = false;

            // Detect which variant it represents by checking images
            // If the root image doesn't match the primary variant's image (if variants exist)
            // Or if another variant has this same image, use that variant's type.
            const primaryType = template.type;
            const variants = template.variants || {};
            const detectedVariant = (Object.keys(variants) as DocumentType[]).find(v =>
                variants[v]?.imageUrl === template.imageUrl
            );

            if (detectedVariant && detectedVariant !== primaryType) {
                // UI was left on a sub-variant, update active tab to match
                setActiveVariant(detectedVariant);
            } else {
                // Normal startup or primary variant
                setActiveVariant(primaryType);
            }
        }
    }, [template?.id]);

    // Dynamic Preview Data
    const [previewData, setPreviewData] = useState(initialSampleData);

    // Update preview data when template loads or settings change
    useEffect(() => {
        if (!template) return;

        // Determine document type for numbering mapping
        // We carefully map the template type to the settings key
        let docType: 'invoice' | 'receipt' | 'delivery-note';

        // Use activeVariant instead of template.type for preview data
        let numberingKey: 'invoice' | 'receipt' | 'deliveryNote';
        switch (activeVariant) {
            case 'receipt':
                numberingKey = 'receipt';
                break;
            case 'delivery-note':
                numberingKey = 'deliveryNote';
                break;
            case 'invoice':
            default:
                numberingKey = 'invoice';
                break;
        }

        // Get the next number based on settings
        const nextNum = getNextDocumentNumber(numberingKey);

        // Update preview data with dynamic currency values
        setPreviewData(prev => ({
            ...prev,
            'document-number': nextNum,
            'subtotal': formatCurrency(1000, company.currency),
            'discount': `-${formatCurrency(50, company.currency)}`,
            'tax': formatCurrency(95, company.currency),
            'grand-total': formatCurrency(1045, company.currency),
            'amount-paid': formatCurrency(45, company.currency),
            'amount-due': formatCurrency(1000, company.currency),
            'amount-in-words': 'One Thousand Forty-Five Only',
        }));
    }, [template, getNextDocumentNumber, numbering, activeVariant, company.currency]);

    // Handle Variant Switching
    const handleSwitchVariant = (newVariant: DocumentType) => {
        if (!template || newVariant === activeVariant) return;

        // 1. Save current fields to the correct location in store
        // If current variant is the main template type, it's stored in root fields
        // If it's a sub-variant, it's in template.variants
        // BUT `updateField` updates the STORE's state for the current view.
        // The store needs to know which "layer" we are editing.
        // Currently the store only knows `template.fields`. It doesn't know about variants editing.
        // We probably need to MANUALLY swapping fields in the `updateTemplate` call.

        // Actually, to support this without huge Refactor of Store:
        // When switching FROM 'A' TO 'B':
        // 1. Take current CANVAS fields (which are in `template.fields` in store memory if we used `updateField`)
        //    Wait, `updateField` updates `template.fields`.
        //    So `template.fields` currently holds the data for `activeVariant`.

        // So we need to:
        // 1. Identify where `activeVariant` data belongs.
        //    - If activeVariant === template.type => It belongs in root `fields`.
        //    - If activeVariant !== template.type => It belongs in `variants[activeVariant].fields`.
        // 2. Identify where `newVariant` data comes from.
        //    - If newVariant === template.type => Comes from root `fields` (but we might have overwritten it? No, we swap).

        // STRATEGY:
        // We will perform a "Swap" operation in the store via `updateTemplate`.
        // We need to construct the NEW `template` object state.

        const currentFields = template.fields; // These are the fields currently visible/edited
        const currentVariant = activeVariant;

        // Where should current fields be saved?
        let newVariants = { ...template.variants };

        if (currentVariant !== template.type) {
            // Save to variant storage
            newVariants[currentVariant] = {
                ...newVariants[currentVariant]!,
                fields: currentFields,
                // We should also look up if we need to update orientation/width/height/image
                // But those are usually static per variant unless we added editing for them.
                // For now, just fields.
            };
        } else {
            // It was the root. But we receive "currentFields" from template.fields, so they are already "there" in the object,
            // EXCEPT if we are about to overwrite `template.fields` with the new data.
            // So we don't need to "save" them elsewhere, they are already in `fields`.
        }

        // What fields + metadata should we load?
        let nextFields: MappedField[] = [];
        let nextImageUrl = template.imageUrl;
        let nextOrientation = template.orientation;
        let nextWidth = template.width;
        let nextHeight = template.height;

        if (newVariant !== template.type) {
            // Load from variant
            const variantData = template.variants?.[newVariant];
            if (variantData) {
                nextFields = variantData.fields || [];
                nextImageUrl = variantData.imageUrl;
                nextOrientation = variantData.orientation;
                nextWidth = variantData.width;
                nextHeight = variantData.height;
            }
        } else {
            // Load from root
            // WAIT! If we were editing a variant, `template.fields` currently holds VARIANT data.
            // We need to retrieve the ROOT data.
            // PROBLEM: We overwrote `template.fields` when we switched TO the variant previously.
            // We need a place to store "Root Fields" when they are swapped out.
            // Let's store them in `variants[template.type]` cleanly? No, duplicates.

            // BETTER ARCHITECTURE for this page:
            // When Mode is Connected:
            // ALWAYS rely on `variants` property as the source of truth for ALL types?
            // No, strictly follow the schema: Root is one, Variants are others.
            // When swapping:
            // 1. We take the `fields` currently in `template.fields` and save them to `variants[currentVariant]` (if current != root).
            //    If current == root, we need to save `template.fields` to... `template.fields`? Yes.
            //    BUT we are about to overwrite `template.fields` with the new data.
            //    So we assume `template.fields` IS the correct storage for Root.
            //    BUT if we entered "Receipt Mode" (Variant), we swapped Receipt fields INTO `template.fields`.
            //    So where did Invoice (Root) fields go?
            //    They MUST have been saved to `variants['invoice']` temporarily?
            //    OR `template` object structure in `types` implies `variants` is for *additional* types.
            //    The `template.fields` is defining the "currently active layout fields".
            //    The `variants` store the "inactive layout configurations".
            //
            //    SO:
            //    - `template.type` = 'invoice'
            //    - `template.fields` = (Currently displayed fields) (Could be Invoice OR Receipt fields)
            //    - `template.variants['receipt']` = { fields: (Receipt fields), ... }
            //    - `template.variants['invoice']` = { fields: (Invoice fields), ... } <-- REQUIRED if we swap.
        }

        // Implementation of Swap:
        const updatedVariants = { ...(template.variants || {}) };

        // 1. SAVE Current State to Storage
        updatedVariants[currentVariant] = {
            fields: currentFields,
            imageUrl: template.imageUrl,
            orientation: template.orientation,
            width: template.width,
            height: template.height,
        };

        // 2. LOAD Next State from Storage (or default/root if missing)
        // If nextVariant exists in variants, grab it.
        const nextData = updatedVariants[newVariant];

        if (nextData) {
            // Update the template state with new "Active" data
            updateTemplate(templateId, {
                fields: nextData.fields,
                imageUrl: nextData.imageUrl,
                width: nextData.width,
                height: nextData.height,
                orientation: nextData.orientation,
                variants: updatedVariants
            });
            setActiveVariant(newVariant);
        } else {
            // If next data missing, we don't switch (or we could prompt to add)
            // But since we filter for existingItem in tabs, it should be there.
            // Just in case, update variants to save what we have.
            updateTemplate(templateId, { variants: updatedVariants });
            setActiveVariant(newVariant);
        }
        // Note: Switching variants doesn't mark as "unsaved" since it's just UI navigation.
        // The actual field edits within a variant trigger hasUnsavedChanges.
    };

    // Helper to get current (pre-swap) values based on what we see
    // In the editor, `template.imageUrl` etc are always what is currently shown.
    const getCurrentImageUrl = (t: any, variant: string) => t.imageUrl;
    const getCurrentOrientation = (t: any, variant: string) => t.orientation;
    const getCurrentWidth = (t: any, variant: string) => t.width;
    const getCurrentHeight = (t: any, variant: string) => t.height;

    // Handle Uploading a New Variant
    const handleAddVariant = async () => {
        if (!variantUploadFile || !variantUploadType || !variantUploadPreview) return;

        // Detect dimensions
        const img = new window.Image();
        img.onload = () => {
            const isLandscape = img.width > img.height;
            const orientation = isLandscape ? 'landscape' : 'portrait';
            let width, height;

            if (isLandscape) {
                width = 842;
                height = Math.round(842 * (img.height / img.width));
            } else {
                width = 595;
                height = Math.round(595 * (img.height / img.width));
            }

            // Create new variant data
            const newVariantData = {
                imageUrl: variantUploadPreview,
                fields: [], // Start empty
                orientation,
                width,
                height
            };

            // Save CURRENT view to variants before switching
            const currentVariant = activeVariant;
            const updatedVariants = { ...(template?.variants || {}) };

            updatedVariants[currentVariant] = {
                fields: template?.fields || [],
                imageUrl: template?.imageUrl || '',
                orientation: template?.orientation || 'portrait',
                width: template?.width,
                height: template?.height
            };

            // Add new variant
            updatedVariants[variantUploadType] = newVariantData as any;

            // Switch to new variant (put it in main slots)
            updateTemplate(templateId, {
                fields: [],
                imageUrl: newVariantData.imageUrl,
                orientation: newVariantData.orientation as any,
                width: newVariantData.width,
                height: newVariantData.height,
                variants: updatedVariants,
                mode: 'connected' // Ensure we upgrade to connected mode
            });

            setHasUnsavedChanges(true);
            setActiveVariant(variantUploadType);
            setIsVariantUploadModalOpen(false);
            setVariantUploadFile(null);
            setVariantUploadPreview(null);
        };
        img.src = variantUploadPreview;
    };

    // Tabs UI Component
    const ConnectedTabs = () => {
        if (!template) return null;

        const tabs: { type: DocumentType, label: string }[] = [
            { type: 'invoice', label: 'Invoice' },
            { type: 'receipt', label: 'Receipt' },
            { type: 'delivery-note', label: 'Delivery Note' }
        ];

        const existingItems = tabs.filter(t => t.type === template.type || template.variants?.[t.type]);
        const missingItems = tabs.filter(t => !existingItems.includes(t));

        return (
            <div className="flex items-center gap-2 border-r border-neutral-200 dark:border-neutral-700 pr-4 mr-4">
                {/* Existing Tabs */}
                {existingItems.map(item => {
                    const isActive = activeVariant === item.type;
                    return (
                        <button
                            key={item.type}
                            onClick={() => handleSwitchVariant(item.type)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isActive
                                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm'
                                : 'bg-white dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                                }`}
                        >
                            {item.label}
                        </button>
                    );
                })}

                {/* Plus Button for Missing */}
                {missingItems.length > 0 && (
                    <div className="relative group">
                        <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all shadow-sm">
                            <Plus className="w-4 h-4" />
                        </button>

                        <div className="absolute left-0 top-full mt-2 w-48 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-100 dark:border-neutral-700 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-left z-50 overflow-hidden">
                            <div className="p-1">
                                <div className="px-3 py-2 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                                    Add Layout
                                </div>
                                {missingItems.map((item) => (
                                    <button
                                        key={item.type}
                                        onClick={() => {
                                            setVariantUploadType(item.type);
                                            setIsVariantUploadModalOpen(true);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors text-left text-neutral-700 dark:text-neutral-200"
                                    >
                                        <Plus className="w-3 h-3 text-neutral-400" />
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };
    const [history, setHistory] = useState<MappedField[][]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const isUndoing = useRef(false);

    // Initialize history
    useEffect(() => {
        if (template && history.length === 0) {
            setHistory([template.fields]);
            setHistoryIndex(0);
        }
    }, [template?.fields]); // Only on mount/initial load

    const pushHistory = useCallback((newFields: MappedField[]) => {
        if (isUndoing.current) return;

        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newFields);

        // Limit history size to 50
        if (newHistory.length > 50) {
            newHistory.shift();
        } else {
            setHistoryIndex(newHistory.length - 1);
        }
        setHistory(newHistory);
    }, [history, historyIndex]);

    const handleUndo = () => {
        if (historyIndex > 0) {
            isUndoing.current = true;
            const newIndex = historyIndex - 1;
            const previousFields = history[newIndex];

            // Update store
            updateTemplate(templateId, { fields: previousFields });
            setHistoryIndex(newIndex);

            setTimeout(() => {
                isUndoing.current = false;
            }, 100);
        }
    };

    const handleRedo = () => {
        if (historyIndex < history.length - 1) {
            isUndoing.current = true;
            const newIndex = historyIndex + 1;
            const nextFields = history[newIndex];

            // Update store
            updateTemplate(templateId, { fields: nextFields });
            setHistoryIndex(newIndex);

            setTimeout(() => {
                isUndoing.current = false;
            }, 100);
        }
    };

    // Wrap store actions to push history
    const handleUpdateField = (fieldId: string, data: Partial<MappedField>) => {
        if (!template) return;
        updateField(templateId, fieldId, data);

        // Calculate new state for history
        const newFields = template.fields.map(f => f.id === fieldId ? { ...f, ...data } : f);
        pushHistory(newFields);
        setHasUnsavedChanges(true);
    };

    const performAddField = (fieldData: any) => {
        if (!template) return;
        const newField = { id: uuidv4(), ...fieldData };
        // We need to match the store's addField behavior manually for history or trust the effect
        // Better: use the store and let the effect catch it? No, effect dependency is tricky.
        // Let's manually construct next state.

        addField(templateId, fieldData); // Store action generates ID internally, this is a mismatch risk.
        // Correction: The store generates the ID. We should probably rely on a subscription or just push the store's result?
        // Let's simplify: We'll push to history *after* the action.
        // But we can't get the result easily.
        // For now, let's just push the *presumed* next state or rely on a "save to history" effect that listens to template changes ONLY if not undoing.
        setHasUnsavedChanges(true);
    };

    // Better History Approach: Listen to template.fields changes
    useEffect(() => {
        if (template && !isUndoing.current) {
            // Check if different from current history head
            const currentHead = history[historyIndex];
            if (JSON.stringify(currentHead) !== JSON.stringify(template.fields)) {
                const newHistory = history.slice(0, historyIndex + 1);
                newHistory.push(template.fields);
                setHistory(newHistory);
                setHistoryIndex(newHistory.length - 1);
            }
        }
    }, [template?.fields]);

    // Canvas refs
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLDivElement>(null);

    // State
    const [activeTool, setActiveTool] = useState<Tool>('select');
    const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    // Mobile pan/zoom transform state & refs for ultra-smooth 60/120fps touch gestures
    const [mobileTransform, setMobileTransform] = useState({ zoom: 1, panX: 0, panY: 0 });
    const mobileTransformRef = useRef({ zoom: 1, panX: 0, panY: 0 });
    const mobileCanvasTransformRef = useRef<HTMLDivElement>(null);
    const mobileRafIdRef = useRef<number | null>(null);

    // Synchronize DOM transform directly on requestAnimationFrame for silky smooth gestures
    const syncMobileTransformDOM = useCallback(() => {
        if (mobileRafIdRef.current) cancelAnimationFrame(mobileRafIdRef.current);
        mobileRafIdRef.current = requestAnimationFrame(() => {
            if (mobileCanvasTransformRef.current) {
                const { zoom, panX, panY } = mobileTransformRef.current;
                mobileCanvasTransformRef.current.style.transform = `translate(calc(-50% + ${panX}px), calc(-50% + ${panY}px)) scale(${zoom})`;
            }
        });
    }, []);

    // Helper to update transform in ref, DOM, and optionally React state
    const updateMobileTransform = useCallback((newTransform: { zoom?: number; panX?: number; panY?: number }, syncState = true) => {
        mobileTransformRef.current = { ...mobileTransformRef.current, ...newTransform };
        syncMobileTransformDOM();
        if (syncState) {
            setMobileTransform({ ...mobileTransformRef.current });
        }
    }, [syncMobileTransformDOM]);

    const mobileGestureRef = useRef<{
        lastTouchDist: number;
        lastPanX: number;
        lastPanY: number;
        isPinching: boolean;
        isPanning: boolean;
    }>({
        lastTouchDist: 0,
        lastPanX: 0,
        lastPanY: 0,
        isPinching: false,
        isPanning: false,
    });

    const mobileFieldTouchRef = useRef<{
        isDragging: boolean;
        fieldId: string | null;
        startX: number;
        startY: number;
        startFieldX: number;
        startFieldY: number;
        startFieldW: number;
        startFieldH: number;
    }>({
        isDragging: false,
        fieldId: null,
        startX: 0,
        startY: 0,
        startFieldX: 0,
        startFieldY: 0,
        startFieldW: 0,
        startFieldH: 0,
    });
    const [showPreview, setShowPreview] = useState(true);
    const [showFieldPanel, setShowFieldPanel] = useState(true);
    const [activeSection, setActiveSection] = useState<string | null>('general');
    const [showMobileZoomMenu, setShowMobileZoomMenu] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showSavedToast, setShowSavedToast] = useState(false);
    const [showCopiedToast, setShowCopiedToast] = useState(false);
    const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Track the "snapshot" of template to detect real changes
    const savedSnapshotRef = useRef<string>('');

    // Initialize snapshot on mount
    useEffect(() => {
        if (template && !savedSnapshotRef.current) {
            savedSnapshotRef.current = JSON.stringify({
                fields: template.fields,
                variants: template.variants
            });
            setLastSavedTime(new Date());
        }
    }, [template?.id]);

    // Auto-fit template to mobile viewport on load
    useEffect(() => {
        if (!template) return;
        const isMobile = window.innerWidth < 768;
        if (!isMobile) return;

        // Wait for DOM to measure container
        const timer = setTimeout(() => {
            if (!containerRef.current) return;
            const containerW = containerRef.current.clientWidth;
            const containerH = containerRef.current.clientHeight;
            const templateW = template.width || (template.orientation === 'landscape' ? 842 : 595);
            const templateH = template.height || (template.orientation === 'landscape' ? 595 : 842);

            const margin = 20;
            const fitZoom = Math.min(
                (containerW - margin * 2) / templateW,
                (containerH - margin * 2) / templateH,
                1 // never zoom in beyond 100% on init
            );

            updateMobileTransform({
                zoom: Math.max(0.2, fitZoom),
                panX: 0,
                panY: 0
            });
        }, 100);

        return () => clearTimeout(timer);
    }, [template?.id, template?.width, template?.height, template?.orientation]);

    // Smart change detection - compare current state against snapshot
    const checkForRealChanges = useCallback(() => {
        if (!template) return false;
        const currentState = JSON.stringify({
            fields: template.fields,
            variants: template.variants
        });
        return currentState !== savedSnapshotRef.current;
    }, [template]);

    // Auto-save effect with debounce
    useEffect(() => {
        if (!template || !hasUnsavedChanges) return;

        const saveTimer = setTimeout(() => {
            // Perform the actual save (already synced to store, just update tracking)
            setIsSaving(true);

            // Update snapshot
            savedSnapshotRef.current = JSON.stringify({
                fields: template.fields,
                variants: template.variants
            });

            setTimeout(() => {
                setLastSavedTime(new Date());
                setHasUnsavedChanges(false);
                setIsSaving(false);
            }, 300); // Brief delay for visual feedback
        }, 1500); // 1.5s debounce

        return () => clearTimeout(saveTimer);
    }, [template?.fields, template?.variants, hasUnsavedChanges]);

    // Format the last saved time for display
    const formatLastSaved = useCallback(() => {
        if (!lastSavedTime) return null;
        const now = new Date();
        const diff = Math.floor((now.getTime() - lastSavedTime.getTime()) / 1000);

        if (diff < 5) return 'Just now';
        if (diff < 60) return `${diff}s ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        return lastSavedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }, [lastSavedTime]);

    // Update formatLastSaved every 10 seconds for "time ago" updates
    const [, forceUpdate] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => forceUpdate(p => p + 1), 10000);
        return () => clearInterval(interval);
    }, []);

    // Drawing state
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
    const [drawCurrent, setDrawCurrent] = useState({ x: 0, y: 0 });

    // Drag state
    const [dragState, setDragState] = useState<DragState>({
        isDragging: false,
        isResizing: false,
        resizeHandle: null,
        startX: 0,
        startY: 0,
        startField: null,
    });

    // Column resizing state
    const [resizingColumn, setResizingColumn] = useState<{
        fieldId: string;
        colIndex: number;
        startX: number;
        startWidth: number;
        nextColStartWidth: number;
    } | null>(null);

    // New field modal
    const [isNewFieldModalOpen, setIsNewFieldModalOpen] = useState(false);
    const [newFieldRect, setNewFieldRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const [newFieldType, setNewFieldType] = useState<FieldType>('text');
    const [newFieldLabel, setNewFieldLabel] = useState('');

    const selectedField = template?.fields.find(f => f.id === selectedFieldId);

    // Calculate canvas dimensions
    const getCanvasRect = useCallback(() => {
        if (!canvasRef.current) return { width: 0, height: 0, left: 0, top: 0 };
        const rect = canvasRef.current.getBoundingClientRect();
        return rect;
    }, []);

    // Convert screen coordinates to percentage
    const screenToPercent = useCallback((screenX: number, screenY: number) => {
        const rect = getCanvasRect();
        const x = ((screenX - rect.left) / rect.width) * 100;
        const y = ((screenY - rect.top) / rect.height) * 100;
        return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
    }, [getCanvasRect]);

    // Handle mouse down on canvas
    const handleCanvasMouseDown = (e: React.MouseEvent) => {
        if (!template || e.target !== canvasRef.current) return;

        if (activeTool === 'draw') {
            const { x, y } = screenToPercent(e.clientX, e.clientY);
            setIsDrawing(true);
            setDrawStart({ x, y });
            setDrawCurrent({ x, y });
            setSelectedFieldId(null);
        } else {
            setSelectedFieldId(null);
        }
    };

    // Handle mouse move on canvas
    const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
        if (isDrawing) {
            const { x, y } = screenToPercent(e.clientX, e.clientY);
            setDrawCurrent({ x, y });
        }

        if (dragState.isDragging && dragState.startField && template) {
            const rect = getCanvasRect();
            const deltaX = ((e.clientX - dragState.startX) / rect.width) * 100;
            const deltaY = ((e.clientY - dragState.startY) / rect.height) * 100;

            let newX = dragState.startField.x + deltaX;
            let newY = dragState.startField.y + deltaY;

            // Constrain to canvas
            newX = Math.max(0, Math.min(100 - dragState.startField.width, newX));
            newY = Math.max(0, Math.min(100 - dragState.startField.height, newY));

            updateField(templateId, dragState.startField.id, { x: newX, y: newY });
            setHasUnsavedChanges(true);
        }

        if (dragState.isResizing && dragState.startField && template) {
            const rect = getCanvasRect();
            const deltaX = ((e.clientX - dragState.startX) / rect.width) * 100;
            const deltaY = ((e.clientY - dragState.startY) / rect.height) * 100;

            let { x, y, width, height } = dragState.startField;

            switch (dragState.resizeHandle) {
                case 'se':
                    width = Math.max(5, dragState.startField.width + deltaX);
                    height = Math.max(2, dragState.startField.height + deltaY);
                    break;
                case 'sw':
                    x = Math.max(0, dragState.startField.x + deltaX);
                    width = Math.max(5, dragState.startField.width - deltaX);
                    height = Math.max(2, dragState.startField.height + deltaY);
                    break;
                case 'ne':
                    y = Math.max(0, dragState.startField.y + deltaY);
                    width = Math.max(5, dragState.startField.width + deltaX);
                    height = Math.max(2, dragState.startField.height - deltaY);
                    break;
                case 'nw':
                    x = Math.max(0, dragState.startField.x + deltaX);
                    y = Math.max(0, dragState.startField.y + deltaY);
                    width = Math.max(5, dragState.startField.width - deltaX);
                    height = Math.max(2, dragState.startField.height - deltaY);
                    break;
                case 'e':
                    width = Math.max(5, dragState.startField.width + deltaX);
                    break;
                case 'w':
                    x = Math.max(0, dragState.startField.x + deltaX);
                    width = Math.max(5, dragState.startField.width - deltaX);
                    break;
                case 'n':
                    y = Math.max(0, dragState.startField.y + deltaY);
                    height = Math.max(2, dragState.startField.height - deltaY);
                    break;
                case 's':
                    height = Math.max(2, dragState.startField.height + deltaY);
                    break;
            }

            // Constrain to canvas
            width = Math.min(width, 100 - x);
            height = Math.min(height, 100 - y);

            // Calculate max rows for line items
            // Calculate max rows for line items
            if (dragState.startField.type === 'line-items') {
                const rect = getCanvasRect();
                // We calculate rows based on the current dragged height

                // Current raw height in pixels
                const rawHeightPx = (height / 100) * rect.height;
                // Header is outside, so entire height is available for rows
                const availableForRows = Math.max(0, rawHeightPx);

                // Calculate max rows based on a minimum comfortable height (ROW_HEIGHT_PX)
                // We use floor to ensure we don't cram too many rows in
                let rows = Math.floor(availableForRows / ROW_HEIGHT_PX);
                rows = Math.max(1, rows);

                // We do NOT snap the height. The height is determined by the user's drag.
                // The renderer will stretch these 'rows' rows to fill the space.

                // Update maxRows
                updateField(templateId, dragState.startField.id, { x, y, width, height, maxRows: rows });
            } else {
                updateField(templateId, dragState.startField.id, { x, y, width, height });
            }

            setHasUnsavedChanges(true);
        }

        // Handle column resizing
        if (resizingColumn && template) {
            const field = template.fields.find(f => f.id === resizingColumn.fieldId);
            if (field && field.columns) {
                const rect = getCanvasRect();
                // Width of the field in pixels
                const fieldWidthPx = (field.width / 100) * rect.width;

                if (fieldWidthPx > 0) {
                    const deltaPx = e.clientX - resizingColumn.startX;
                    // Delta as percentage of the field width
                    const deltaPercent = (deltaPx / fieldWidthPx) * 100;

                    const newCols = [...field.columns];
                    const newWidth = resizingColumn.startWidth + deltaPercent;
                    const newNextWidth = resizingColumn.nextColStartWidth - deltaPercent;

                    // Min width constraint (5%)
                    if (newWidth >= 5 && newNextWidth >= 5) {
                        newCols[resizingColumn.colIndex] = { ...newCols[resizingColumn.colIndex], width: newWidth };
                        newCols[resizingColumn.colIndex + 1] = { ...newCols[resizingColumn.colIndex + 1], width: newNextWidth };

                        updateField(templateId, field.id, { columns: newCols });
                        setHasUnsavedChanges(true); // Consider debouncing if performance issues arise
                    }
                }
            }
        }
    }, [isDrawing, dragState, resizingColumn, template, templateId, screenToPercent, getCanvasRect, updateField]);

    // Handle mouse up on canvas
    const handleCanvasMouseUp = () => {
        if (isDrawing) {
            setIsDrawing(false);

            // Calculate the rectangle
            const x = Math.min(drawStart.x, drawCurrent.x);
            const y = Math.min(drawStart.y, drawCurrent.y);
            const width = Math.abs(drawCurrent.x - drawStart.x);
            const height = Math.abs(drawCurrent.y - drawStart.y);

            // Only create if significant size
            if (width > 2 && height > 1) {
                setNewFieldRect({ x, y, width, height });
                setNewFieldLabel('');
                setNewFieldType('text');
                setIsNewFieldModalOpen(true);
            }
        }

        setDragState({
            isDragging: false,
            isResizing: false,
            resizeHandle: null,
            startX: 0,
            startY: 0,
            startField: null,
        });
        setResizingColumn(null);
    };

    // Handle field drag start
    const handleFieldDragStart = (e: React.MouseEvent, field: MappedField) => {
        e.stopPropagation();
        setSelectedFieldId(field.id);
        setDragState({
            isDragging: true,
            isResizing: false,
            resizeHandle: null,
            startX: e.clientX,
            startY: e.clientY,
            startField: { ...field },
        });
    };

    // Handle resize start
    const handleResizeStart = (e: React.MouseEvent, field: MappedField, handle: string) => {
        e.stopPropagation();
        setDragState({
            isDragging: false,
            isResizing: true,
            resizeHandle: handle,
            startX: e.clientX,
            startY: e.clientY,
            startField: { ...field },
        });
    };

    // Handle column resize start
    const handleColumnResizeStart = (e: React.MouseEvent, field: MappedField, index: number) => {
        e.stopPropagation();
        e.preventDefault(); // Prevent text selection
        if (!field.columns) return;

        setResizingColumn({
            fieldId: field.id,
            colIndex: index,
            startX: e.clientX,
            startWidth: field.columns[index].width,
            nextColStartWidth: field.columns[index + 1].width
        });
    };

    // Create new field
    const handleCreateField = () => {
        // For line-items, we don't need a user-provided label, use default
        if (newFieldType !== 'line-items' && !newFieldLabel.trim()) return;

        const newField: any = {
            type: newFieldType,
            label: newFieldType === 'line-items' ? 'Line Items' : newFieldLabel,
            x: newFieldRect.x,
            y: newFieldRect.y,
            width: newFieldRect.width,
            height: newFieldRect.height,
            fontSize: 12,
            fontColor: '#2d3748',
            fontWeight: 'normal',
            alignment: 'left',
        };

        if (newFieldType === 'line-items') {
            newField.columns = [
                { id: uuidv4(), header: 'Item', width: 40, type: 'text', key: 'product' },
                { id: uuidv4(), header: 'Qty', width: 15, type: 'number', key: 'quantity' },
                { id: uuidv4(), header: 'Price', width: 20, type: 'currency', key: 'unitPrice' },
                { id: uuidv4(), header: 'Total', width: 25, type: 'currency', key: 'subtotal' }
            ];
        }

        addField(templateId, newField);

        setIsNewFieldModalOpen(false);
        setActiveTool('select');
        setHasUnsavedChanges(true);
    };

    // Update field property
    const handleFieldUpdate = (property: keyof MappedField, value: any) => {
        if (!selectedFieldId) return;
        updateField(templateId, selectedFieldId, { [property]: value });
        setHasUnsavedChanges(true);
    };

    // Delete selected field
    const handleDeleteField = () => {
        if (!selectedFieldId) return;
        deleteField(templateId, selectedFieldId);
        setSelectedFieldId(null);
        setHasUnsavedChanges(true);
    };

    // Clipboard state for copy/paste
    const [clipboardField, setClipboardField] = useState<MappedField | null>(null);

    // Nudge amount (percentage)
    const NUDGE_STEP = 0.5; // Normal step
    const NUDGE_STEP_FINE = 0.1; // Fine step with Shift

    // Handle nudging selected field with arrow keys
    const handleNudge = useCallback((direction: 'up' | 'down' | 'left' | 'right', fine: boolean) => {
        if (!selectedFieldId || !template) return;

        const field = template.fields.find(f => f.id === selectedFieldId);
        if (!field) return;

        const step = fine ? NUDGE_STEP_FINE : NUDGE_STEP;
        let { x, y } = field;

        switch (direction) {
            case 'up':
                y = Math.max(0, y - step);
                break;
            case 'down':
                y = Math.min(100 - field.height, y + step);
                break;
            case 'left':
                x = Math.max(0, x - step);
                break;
            case 'right':
                x = Math.min(100 - field.width, x + step);
                break;
        }

        updateField(templateId, selectedFieldId, { x, y });
        setHasUnsavedChanges(true);
    }, [selectedFieldId, template, templateId, updateField]);

    // Handle copy field
    const handleCopyField = useCallback(() => {
        if (!selectedFieldId || !template) return;

        const field = template.fields.find(f => f.id === selectedFieldId);
        if (field) {
            setClipboardField({ ...field });
            setShowCopiedToast(true);
            setTimeout(() => setShowCopiedToast(false), 1500);
        }
    }, [selectedFieldId, template]);

    // Handle paste field
    const handlePasteField = useCallback(() => {
        if (!clipboardField || !template) return;

        // Create new field with offset position and new ID
        const newField: MappedField = {
            ...clipboardField,
            id: uuidv4(),
            x: Math.min(100 - clipboardField.width, clipboardField.x + 2),
            y: Math.min(100 - clipboardField.height, clipboardField.y + 2),
            label: `${clipboardField.label} (Copy)`,
        };

        // For line-items, also regenerate column IDs
        if (newField.columns) {
            newField.columns = newField.columns.map(col => ({
                ...col,
                id: uuidv4()
            }));
        }

        addField(templateId, newField);
        setSelectedFieldId(newField.id);
        setHasUnsavedChanges(true);
    }, [clipboardField, template, templateId, addField]);

    // Handle duplicate field (copy + paste in one action)
    const handleDuplicateField = useCallback(() => {
        if (!selectedFieldId || !template) return;

        const field = template.fields.find(f => f.id === selectedFieldId);
        if (!field) return;

        // Create duplicated field with offset
        const newField: MappedField = {
            ...field,
            id: uuidv4(),
            x: Math.min(100 - field.width, field.x + 2),
            y: Math.min(100 - field.height, field.y + 2),
            label: `${field.label} (Copy)`,
        };

        // For line-items, also regenerate column IDs
        if (newField.columns) {
            newField.columns = newField.columns.map(col => ({
                ...col,
                id: uuidv4()
            }));
        }

        addField(templateId, newField);
        setSelectedFieldId(newField.id);
        setHasUnsavedChanges(true);
    }, [selectedFieldId, template, templateId, addField]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input or textarea
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return;
            }

            // Delete / Backspace - Delete selected field
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedFieldId && !isNewFieldModalOpen) {
                    e.preventDefault();
                    handleDeleteField();
                }
            }

            // Escape - Deselect
            if (e.key === 'Escape') {
                setSelectedFieldId(null);
                setActiveTool('select');
            }

            // Arrow keys - Nudge selected field
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                if (selectedFieldId && !isNewFieldModalOpen) {
                    e.preventDefault();
                    const direction = e.key.replace('Arrow', '').toLowerCase() as 'up' | 'down' | 'left' | 'right';
                    handleNudge(direction, e.shiftKey);
                }
            }

            // Ctrl+C - Copy
            if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                if (selectedFieldId) {
                    e.preventDefault();
                    handleCopyField();
                }
            }

            // Ctrl+V - Paste
            if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                if (clipboardField) {
                    e.preventDefault();
                    handlePasteField();
                }
            }

            // Ctrl+D - Duplicate
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                if (selectedFieldId) {
                    e.preventDefault();
                    handleDuplicateField();
                }
            }

            // Ctrl+Z - Undo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                handleUndo();
            }

            // Ctrl+Y or Ctrl+Shift+Z - Redo
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                handleRedo();
            }

            // V - Select tool
            if (e.key === 'v' && !e.ctrlKey && !e.metaKey) {
                setActiveTool('select');
            }

            // D - Draw tool
            if (e.key === 'd' && !e.ctrlKey && !e.metaKey) {
                setActiveTool('draw');
            }

            // P - Toggle preview
            if (e.key === 'p' && !e.ctrlKey && !e.metaKey) {
                setShowPreview(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedFieldId, isNewFieldModalOpen, clipboardField, handleNudge, handleCopyField, handlePasteField, handleDuplicateField, handleUndo, handleRedo]);

    if (!template) {
        return (
            <div className="min-h-screen bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center p-6">
                <div className="bg-white dark:bg-neutral-800 rounded-2xl p-12 max-w-md shadow-xl border border-neutral-100 dark:border-neutral-700">
                    <EmptyState
                        icon={<Layers className="w-8 h-8 text-neutral-400" strokeWidth={1.5} />}
                        title="Template not found"
                        description="The template you're looking for doesn't exist."
                        action={
                            <Button onClick={() => router.push('/templates')}>
                                Back to Templates
                            </Button>
                        }
                    />
                </div>
            </div>
        );
    }

    return (
        <div key={templateId} className="absolute inset-0 z-50 bg-neutral-50 dark:bg-neutral-900 flex flex-col overflow-hidden">
            {/* Mobile Bottom Drawer Overlay */}
            {isMobileDrawerOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/30 md:hidden"
                    onClick={() => setIsMobileDrawerOpen(false)}
                />
            )}
            {/* Header */}
            <header className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 px-3 py-2.5 md:px-4 md:py-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 md:gap-4 min-w-0">
                    <Link
                        href="/templates"
                        className="p-2 rounded-lg text-neutral-500 hover:text-[#2d3748] dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors shrink-0"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="min-w-0">
                        <h1 className="text-sm md:text-lg font-bold text-[#2d3748] dark:text-white truncate">{template.name}</h1>
                        <div className="hidden md:flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                            <span>{template.fields.length} field{template.fields.length !== 1 ? 's' : ''} mapped</span>
                            <span className="text-neutral-300 dark:text-neutral-600">•</span>
                            {isSaving ? (
                                <span className="flex items-center gap-1.5 text-blue-500 dark:text-blue-400">
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                                    Saving...
                                </span>
                            ) : hasUnsavedChanges ? (
                                <span className="flex items-center gap-1.5 text-amber-500 dark:text-amber-400">
                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                                    Unsaved changes
                                </span>
                            ) : (
                                <span className="flex items-center gap-1.5 text-emerald-500 dark:text-emerald-400">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                    {formatLastSaved() ? `Saved ${formatLastSaved()}` : 'All changes saved'}
                                </span>
                            )}
                        </div>
                        {/* Mobile save status dot */}
                        <div className="md:hidden">
                            {isSaving ? (
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse inline-block" />
                            ) : hasUnsavedChanges ? (
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full inline-block" />
                            ) : (
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" />
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                    {/* Connected Template Tabs - desktop only in header */}
                    <div className="hidden md:flex">
                        <ConnectedTabs />
                    </div>

                    {/* Zoom Controls - desktop only */}
                    <div className="hidden md:flex items-center gap-1 bg-neutral-100 dark:bg-neutral-900 rounded-lg p-1">
                        <button
                            onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-[#2d3748] dark:hover:text-white hover:bg-white dark:hover:bg-neutral-800 transition-colors"
                        >
                            <ZoomOut className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300 w-12 text-center">
                            {Math.round(zoom * 100)}%
                        </span>
                        <button
                            onClick={() => setZoom(Math.min(2, zoom + 0.25))}
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-[#2d3748] dark:hover:text-white hover:bg-white dark:hover:bg-neutral-800 transition-colors"
                        >
                            <ZoomIn className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setZoom(1)}
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-[#2d3748] dark:hover:text-white hover:bg-white dark:hover:bg-neutral-800 transition-colors"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="hidden md:block h-6 w-px bg-neutral-200 dark:bg-neutral-700" />

                    <div className="hidden md:flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={historyIndex <= 0}
                            onClick={handleUndo}
                            title="Undo (Ctrl+Z)"
                        >
                            <Undo className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={historyIndex >= history.length - 1}
                            onClick={handleRedo}
                            title="Redo (Ctrl+Y)"
                        >
                            <Redo className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Preview toggle - icon only on mobile */}
                    <button
                        className={`p-2 rounded-lg transition-colors ${
                            showPreview
                                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                                : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                        }`}
                        onClick={() => setShowPreview(!showPreview)}
                        title="Toggle Preview"
                    >
                        <Eye className="w-4 h-4 md:w-4 md:h-4" />
                    </button>

                    <Button
                        size="sm"
                        variant={hasUnsavedChanges ? 'danger' : 'primary'}
                        leftIcon={<Save className="w-4 h-4" />}
                        onClick={() => {
                            // ENSURE DATA SANITY:
                            // Sync current visual fields to the correct variant storage slot
                            if (template && template.mode === 'connected') {
                                const currentVariant = activeVariant;
                                const updatedVariants = { ...(template.variants || {}) };

                                updatedVariants[currentVariant] = {
                                    fields: template.fields,
                                    imageUrl: template.imageUrl,
                                    orientation: template.orientation,
                                    width: template.width,
                                    height: template.height,
                                };

                                updateTemplate(templateId, { variants: updatedVariants });
                            }

                            // Update snapshot to mark current state as "saved"
                            savedSnapshotRef.current = JSON.stringify({
                                fields: template?.fields,
                                variants: template?.variants
                            });
                            setLastSavedTime(new Date());
                            setHasUnsavedChanges(false);
                            setShowSavedToast(true);
                            setTimeout(() => setShowSavedToast(false), 2000);
                        }}
                    >
                        <span className="hidden sm:inline">{hasUnsavedChanges ? 'Save Changes' : 'Saved'}</span>
                        <span className="sm:hidden">Save</span>
                    </Button>
                </div>
            </header >

            {/* Mobile Sub-header: Connected Tabs */}
            {template.mode === 'connected' && (
                <div className="md:hidden bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 px-3 py-2 overflow-x-auto">
                    <ConnectedTabs />
                </div>
            )}

            {/* Saved Toast */}
            {
                showSavedToast && (
                    <div className="fixed top-20 right-6 z-50 bg-emerald-500 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-in slide-in-from-top-2 fade-in duration-200">
                        <Check className="w-4 h-4" />
                        <span className="text-sm font-medium">Saved to local storage!</span>
                    </div>
                )
            }

            {/* Copied Toast */}
            {
                showCopiedToast && (
                    <div className="fixed top-20 right-6 z-50 bg-blue-500 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-in slide-in-from-top-2 fade-in duration-200">
                        <Copy className="w-4 h-4" />
                        <span className="text-sm font-medium">Field copied!</span>
                    </div>
                )
            }

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Toolbar - hidden on mobile (shown in mobile bottom bar instead) */}
                <div className="hidden md:flex w-14 bg-white dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700 flex-col items-center py-4 gap-2">
                    <button
                        onClick={() => setActiveTool('select')}
                        className={`p-3 rounded-xl transition-colors ${activeTool === 'select'
                            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                            : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-[#2d3748] dark:hover:text-white'
                            }`}
                        title="Select Tool (V)"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    <button
                        onClick={() => setActiveTool('draw')}
                        className={`p-3 rounded-xl transition-colors ${activeTool === 'draw'
                            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                            : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-[#2d3748] dark:hover:text-white'
                            }`}
                        title="Draw Field (D)"
                    >
                        <Square className="w-5 h-5" />
                    </button>

                    <div className="h-px w-8 bg-neutral-200 dark:bg-neutral-700 my-2" />

                    <button
                        onClick={() => setShowFieldPanel(!showFieldPanel)}
                        className={`p-3 rounded-xl transition-colors ${showFieldPanel
                            ? 'bg-neutral-100 dark:bg-neutral-700 text-[#2d3748] dark:text-white'
                            : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-[#2d3748] dark:hover:text-white'
                            }`}
                        title="Toggle Field Panel"
                    >
                        <Layers className="w-5 h-5" />
                    </button>
                </div>

                {/* Canvas Area */}
                <div className="flex-1 bg-neutral-100 dark:bg-neutral-900 overflow-hidden relative">
                    {/* ── DESKTOP: scrollable canvas ── */}
                    <div
                        ref={containerRef}
                        className="absolute inset-0 hidden md:flex overflow-auto p-20 items-start justify-center canvas-grid-bg"
                    >
                        <div
                            ref={canvasRef}
                            className={`relative bg-white shadow-2xl rounded-lg overflow-hidden shrink-0 ${activeTool === 'draw' ? 'cursor-crosshair' : ''}`}
                            style={{
                                width: `${(template.width || (template.orientation === 'landscape' ? 842 : 595)) * zoom}px`,
                                height: `${(template.height || (template.orientation === 'landscape' ? 595 : 842)) * zoom}px`,
                                transform: `scale(1)`,
                                transformOrigin: 'top center',
                                cursor: activeTool === 'select' ? "url('/cursor-select.svg') 2 2, default" : undefined
                            }}
                            onMouseDown={handleCanvasMouseDown}
                            onMouseMove={handleCanvasMouseMove}
                            onMouseUp={handleCanvasMouseUp}
                            onMouseLeave={handleCanvasMouseUp}
                        >

                            {/* Template Image */}
                            {template.imageUrl && (
                                <img
                                    key={template.imageUrl}
                                    src={template.imageUrl}
                                    alt={template.name}
                                    className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none"
                                    draggable={false}
                                />
                            )}

                            {/* Mapped Fields */}
                            {template.fields.map((field) => (
                                <div
                                    key={field.id}
                                    className={`absolute border ${selectedFieldId === field.id
                                        ? 'border-blue-500 z-10'
                                        : fieldTypeColors[field.type]
                                        } ${activeTool === 'select' ? 'cursor-move' : 'cursor-crosshair'} transition-shadow select-none`}
                                    style={{
                                        left: `${field.x}%`,
                                        top: `${field.y}%`,
                                        width: `${field.width}%`,
                                        height: `${field.height}%`,
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedFieldId(field.id);
                                        // On mobile, open the properties drawer when a field is tapped
                                        if (window.innerWidth < 768) {
                                            setIsMobileDrawerOpen(true);
                                            setActiveSection('general-mob');
                                        }
                                    }}
                                    onMouseDown={(e) => activeTool === 'select' && handleFieldDragStart(e, field)}
                                >
                                    {/* Field Content */}
                                    <div
                                        className={`absolute inset-0.5 flex ${field.type === 'line-items' ? 'overflow-visible items-stretch' : 'items-center'} pointer-events-none`}
                                        style={{
                                            fontSize: `${field.fontSize * zoom}px`,
                                            color: field.fontColor,
                                            fontWeight: field.fontWeight === 'bold' ? 700 : field.fontWeight === 'semibold' ? 600 : field.fontWeight === 'medium' ? 500 : 400,
                                            textAlign: field.alignment,
                                            justifyContent: field.alignment === 'center' ? 'center' : field.alignment === 'right' ? 'flex-end' : 'flex-start',
                                        }}
                                    >
                                        {field.type === 'line-items' && field.columns ? (
                                            <>
                                                {/* Header Outside - Absolute Top */}
                                                {(field.showTableHeaders !== false || !showPreview) && (
                                                    <div
                                                        className={`absolute bottom-full left-0 w-full flex bg-neutral-300 text-neutral-900 border-b border-neutral-300 font-semibold items-center ${field.showTableHeaders === false ? 'opacity-50' : ''}`}
                                                        style={{ fontSize: '0.8em', height: '1.5em' }}
                                                    >
                                                        {field.columns.map((col, index) => (
                                                            <div
                                                                key={col.id}
                                                                style={{ width: `${col.width}%` }}
                                                                className="px-1 border-r border-neutral-300 last:border-0 truncate h-full flex items-center relative group/col"
                                                            >
                                                                {col.header}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Body - Fills the Box */}
                                                <div className="w-full h-full relative border-x border-b border-blue-300 bg-white/50 overflow-hidden">

                                                    {/* Row Grid (Horizontal Lines) */}
                                                    <div className="absolute inset-0 flex flex-col">
                                                        {field.type === 'line-items' && Array.from({ length: Math.min(50, field.maxRows || 1) }).map((_, i, arr) => (
                                                            <div
                                                                key={`row-${i}`}
                                                                className={`${i !== arr.length - 1 ? 'border-b border-blue-200' : ''} w-full flex-1`}
                                                            />
                                                        ))}
                                                    </div>

                                                    {/* Vertical Grid Lines (Flexbox for Alignment with Header) */}
                                                    <div className="absolute inset-0 flex pointer-events-none">
                                                        {field.columns.map((col, index) => (
                                                            <div
                                                                key={`vline-${col.id}`}
                                                                style={{ width: `${col.width}%` }}
                                                                className={`h-full border-r border-blue-200 ${index === field.columns!.length - 1 ? 'border-r-0' : ''}`}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>    {field.maxRows && (
                                                    <div className="absolute bottom-1 right-2 text-[10px] text-blue-400 font-medium z-10">
                                                        Max {field.maxRows} rows
                                                    </div>
                                                )}

                                                {/* Full Height Resize Handles */}
                                                {activeTool === 'select' && selectedFieldId === field.id && (
                                                    <div className="absolute inset-0 flex pointer-events-none z-50">
                                                        {field.columns.map((col, index) => {
                                                            if (index === field.columns!.length - 1) return <div key={col.id} style={{ width: `${col.width}%` }} />;

                                                            return (
                                                                <div key={`handle-container-${col.id}`} style={{ width: `${col.width}%` }} className="relative h-full">
                                                                    <div
                                                                        className="absolute right-0 top-0 bottom-0 w-4 translate-x-1/2 cursor-col-resize pointer-events-auto group/handle flex flex-col justify-center items-center hover:bg-blue-500/10 transition-colors"
                                                                        onMouseDown={(e) => handleColumnResizeStart(e, field, index)}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        {/* Visual Line on Hover */}
                                                                        <div className="w-0.5 h-full bg-blue-500/0 group-hover/handle:bg-blue-500 transition-colors shadow-sm" />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </>
                                        ) : field.type === 'link-button' ? (
                                            (() => {
                                                // @ts-ignore
                                                const buttonColor = field.customValues?.buttonColor || '#3b82f6';
                                                // @ts-ignore
                                                const borderRadius = field.customValues?.borderRadius || 'rounded';
                                                // @ts-ignore
                                                const variant = field.customValues?.variant || 'filled';

                                                const radiusMap: Record<string, string> = {
                                                    'sharp': '0px',
                                                    'rounded': '6px',
                                                    'pill': '999px'
                                                };

                                                const isOutline = variant === 'outline';
                                                const bgColor = isOutline ? 'transparent' : buttonColor;
                                                const borderColor = buttonColor;
                                                const textColor = field.fontColor || (isOutline ? buttonColor : '#ffffff');

                                                return (
                                                    <div
                                                        className="w-full h-full flex items-center justify-center transition-all box-border"
                                                        style={{
                                                            backgroundColor: bgColor,
                                                            border: isOutline ? `1.5px solid ${borderColor}` : 'none',
                                                            borderRadius: radiusMap[borderRadius] || '6px',
                                                            color: textColor,
                                                            fontSize: `${field.fontSize * zoom}px`,
                                                            fontWeight: field.fontWeight === 'bold' ? 700 : 500
                                                        }}
                                                    >
                                                        {field.label}
                                                    </div>
                                                );
                                            })()
                                        ) : (
                                            <AutoFitText
                                                value={(() => {
                                                    if (!showPreview) return field.label;
                                                    if (field.type === 'custom' && field.dataType === 'currency') {
                                                        return formatCurrency(1234.56, company.currency);
                                                    }
                                                    return previewData[field.type] || field.label;
                                                })()}
                                                fontSize={field.fontSize * zoom}
                                                fontWeight={field.fontWeight}
                                                alignment={field.alignment}
                                                fontColor={field.fontColor}
                                                isMultiLine={(field.type === 'notes' || field.type === 'customer-address') || (field.height > (field.fontSize * 1.8 / 842) * 100)}
                                                className={!showPreview ? "opacity-40" : ""}
                                            />
                                        )}
                                    </div>

                                    {/* Field Label Badge */}
                                    {!showPreview && (
                                        <div className="absolute -top-5 left-0 px-1.5 py-0.5 bg-[#2d3748] dark:bg-neutral-700 text-white text-[10px] font-medium rounded whitespace-nowrap">
                                            {field.label}
                                        </div>
                                    )}

                                    {/* Resize Handles - Clean Style */}
                                    {selectedFieldId === field.id && activeTool === 'select' && (
                                        <>
                                            <div className="absolute -top-1 -left-1 w-2 h-2 bg-white border border-blue-500 z-50 cursor-nw-resize" onMouseDown={(e) => handleResizeStart(e, field, 'nw')} />
                                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-white border border-blue-500 z-50 cursor-ne-resize" onMouseDown={(e) => handleResizeStart(e, field, 'ne')} />
                                            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-white border border-blue-500 z-50 cursor-sw-resize" onMouseDown={(e) => handleResizeStart(e, field, 'sw')} />
                                            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-white border border-blue-500 z-50 cursor-se-resize" onMouseDown={(e) => handleResizeStart(e, field, 'se')} />
                                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border border-blue-500 z-50 cursor-n-resize" onMouseDown={(e) => handleResizeStart(e, field, 'n')} />
                                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border border-blue-500 z-50 cursor-s-resize" onMouseDown={(e) => handleResizeStart(e, field, 's')} />
                                            <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-white border border-blue-500 z-50 cursor-w-resize" onMouseDown={(e) => handleResizeStart(e, field, 'w')} />
                                            <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-white border border-blue-500 z-50 cursor-e-resize" onMouseDown={(e) => handleResizeStart(e, field, 'e')} />
                                        </>
                                    )}
                                </div>
                            ))}

                            {/* Drawing Rectangle */}
                            {isDrawing && (
                                <div
                                    className="absolute border-2 border-dashed border-blue-500 bg-blue-500/10 pointer-events-none"
                                    style={{
                                        left: `${Math.min(drawStart.x, drawCurrent.x)}%`,
                                        top: `${Math.min(drawStart.y, drawCurrent.y)}%`,
                                        width: `${Math.abs(drawCurrent.x - drawStart.x)}%`,
                                        height: `${Math.abs(drawCurrent.y - drawStart.y)}%`,
                                    }}
                                />
                            )}
                        </div>
                    </div>

                    {/* ── MOBILE: transform-based zoom/pan canvas ── */}
                    <div
                        ref={containerRef}
                        className="absolute inset-0 md:hidden overflow-hidden canvas-grid-bg touch-none"
                        onTouchStart={(e) => {
                            const g = mobileGestureRef.current;
                            if (e.touches.length === 2) {
                                g.isPinching = true;
                                g.isPanning = false;
                                const dx = e.touches[0].clientX - e.touches[1].clientX;
                                const dy = e.touches[0].clientY - e.touches[1].clientY;
                                g.lastTouchDist = Math.sqrt(dx * dx + dy * dy);
                            } else if (e.touches.length === 1 && !mobileFieldTouchRef.current.isDragging) {
                                g.isPanning = true;
                                g.isPinching = false;
                                g.lastPanX = e.touches[0].clientX;
                                g.lastPanY = e.touches[0].clientY;
                            }
                        }}
                        onTouchMove={(e) => {
                            const g = mobileGestureRef.current;
                            if (mobileFieldTouchRef.current.isDragging) return;

                            const currentZoom = mobileTransformRef.current.zoom;
                            if (g.isPinching && e.touches.length === 2) {
                                e.preventDefault();
                                const dx = e.touches[0].clientX - e.touches[1].clientX;
                                const dy = e.touches[0].clientY - e.touches[1].clientY;
                                const dist = Math.sqrt(dx * dx + dy * dy);
                                const scale = dist / (g.lastTouchDist || dist);
                                g.lastTouchDist = dist;

                                const newZoom = Math.max(0.2, Math.min(4, currentZoom * scale));
                                updateMobileTransform({ zoom: newZoom });
                            } else if (g.isPanning && e.touches.length === 1) {
                                e.preventDefault();
                                const deltaX = (e.touches[0].clientX - g.lastPanX) / currentZoom;
                                const deltaY = (e.touches[0].clientY - g.lastPanY) / currentZoom;
                                g.lastPanX = e.touches[0].clientX;
                                g.lastPanY = e.touches[0].clientY;

                                updateMobileTransform({
                                    panX: mobileTransformRef.current.panX + deltaX,
                                    panY: mobileTransformRef.current.panY + deltaY,
                                });
                            }
                        }}
                        onTouchEnd={(e) => {
                            const g = mobileGestureRef.current;
                            if (e.touches.length < 2) g.isPinching = false;
                            if (e.touches.length === 0) {
                                g.isPanning = false;
                            }
                        }}
                    >
                        {/* Zoom controls */}
                        <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5">
                            {/* Zoom level dropdown */}
                            <div className="relative">
                                {/* Dropdown menu - uses fixed so it escapes overflow-hidden */}
                                {showMobileZoomMenu && (
                                    <>
                                        {/* Backdrop to close on tap outside */}
                                        <div
                                            className="fixed inset-0 z-[90]"
                                            onClick={() => setShowMobileZoomMenu(false)}
                                        />
                                        <div className="fixed top-14 right-2 z-[100] bg-neutral-900/98 backdrop-blur-md rounded-xl shadow-2xl border border-white/10 overflow-hidden min-w-[130px]">
                                            {/* "Fit to screen" at top */}
                                            <button
                                                className="w-full flex items-center justify-between px-3 py-2.5 text-[11px] font-medium text-emerald-400 hover:bg-white/10 active:bg-white/20 transition-colors border-b border-white/10"
                                                onClick={() => {
                                                    if (!containerRef.current || !template) return;
                                                    const containerW = containerRef.current.clientWidth;
                                                    const containerH = containerRef.current.clientHeight;
                                                    const templateW = template.width || (template.orientation === 'landscape' ? 842 : 595);
                                                    const templateH = template.height || (template.orientation === 'landscape' ? 595 : 842);
                                                    const margin = 20;
                                                    const fitZoom = Math.min(
                                                        (containerW - margin * 2) / templateW,
                                                        (containerH - margin * 2) / templateH,
                                                        1
                                                    );
                                                    updateMobileTransform({ zoom: Math.max(0.2, fitZoom), panX: 0, panY: 0 });
                                                    setShowMobileZoomMenu(false);
                                                }}
                                            >
                                                <span>Fit to screen</span>
                                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                                            </button>
                                            {/* Preset zoom levels */}
                                            {[25, 50, 75, 100, 125, 150, 200].map((level) => {
                                                const isActive = Math.round(mobileTransform.zoom * 100) === level;
                                                return (
                                                    <button
                                                        key={level}
                                                        className={`w-full flex items-center justify-between px-3 py-2.5 text-[11px] transition-colors ${
                                                            isActive
                                                                ? 'bg-blue-600/90 text-white font-semibold'
                                                                : 'text-neutral-200 hover:bg-white/10 active:bg-white/20'
                                                        }`}
                                                        onClick={() => {
                                                            updateMobileTransform({ zoom: level / 100 });
                                                            setShowMobileZoomMenu(false);
                                                        }}
                                                    >
                                                        <span>{level}%</span>
                                                        {isActive && (
                                                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M20 6L9 17l-5-5"/></svg>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}

                                {/* Zoom badge button */}
                                <button
                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold backdrop-blur-sm transition-colors ${
                                        showMobileZoomMenu
                                            ? 'bg-blue-600 text-white shadow-lg'
                                            : 'bg-black/60 text-white hover:bg-black/80'
                                    }`}
                                    onClick={() => setShowMobileZoomMenu(prev => !prev)}
                                >
                                    {Math.round(mobileTransform.zoom * 100)}%
                                    <svg className={`w-2.5 h-2.5 transition-transform ${showMobileZoomMenu ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M6 9l6 6 6-6"/></svg>
                                </button>
                            </div>
                        </div>

                        {/* Template canvas with transform */}
                        <div
                            ref={mobileCanvasTransformRef}
                            style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: `translate(calc(-50% + ${mobileTransform.panX}px), calc(-50% + ${mobileTransform.panY}px)) scale(${mobileTransform.zoom})`,
                                transformOrigin: 'center center',
                                willChange: 'transform',
                            }}
                        >
                            <div
                                ref={canvasRef as any}
                                className={`relative bg-white shadow-2xl rounded-lg overflow-hidden shrink-0 ${activeTool === 'draw' ? 'cursor-crosshair' : ''}`}
                                style={{
                                    width: `${template.width || (template.orientation === 'landscape' ? 842 : 595)}px`,
                                    height: `${template.height || (template.orientation === 'landscape' ? 595 : 842)}px`,
                                    cursor: activeTool === 'select' ? "default" : undefined
                                }}
                                onMouseDown={handleCanvasMouseDown}
                                onMouseMove={handleCanvasMouseMove}
                                onMouseUp={handleCanvasMouseUp}
                                onMouseLeave={handleCanvasMouseUp}
                            >
                                {/* Template Image */}
                                {template.imageUrl && (
                                    <img
                                        key={template.imageUrl + '-mob'}
                                        src={template.imageUrl}
                                        alt={template.name}
                                        className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none"
                                        draggable={false}
                                    />
                                )}

                                {/* Mapped Fields (same as desktop) */}
                                {template.fields.map((field) => (
                                    <div
                                        key={field.id + '-mob'}
                                        className={`absolute border ${selectedFieldId === field.id
                                            ? 'border-blue-500 z-10'
                                            : fieldTypeColors[field.type]
                                            } transition-shadow select-none`}
                                        style={{
                                            left: `${field.x}%`,
                                            top: `${field.y}%`,
                                            width: `${field.width}%`,
                                            height: `${field.height}%`,
                                        }}
                                        onTouchStart={(e) => {
                                            if (e.touches.length === 1 && activeTool === 'select') {
                                                const touch = e.touches[0];
                                                mobileFieldTouchRef.current = {
                                                    isDragging: true,
                                                    fieldId: field.id,
                                                    startX: touch.clientX,
                                                    startY: touch.clientY,
                                                    startFieldX: field.x,
                                                    startFieldY: field.y,
                                                    startFieldW: field.width,
                                                    startFieldH: field.height,
                                                };
                                                setSelectedFieldId(field.id);
                                            }
                                        }}
                                        onTouchMove={(e) => {
                                            const ft = mobileFieldTouchRef.current;
                                            if (ft.isDragging && ft.fieldId === field.id && e.touches.length === 1) {
                                                e.preventDefault();
                                                if (!canvasRef.current) return;
                                                const rect = canvasRef.current.getBoundingClientRect();
                                                if (rect.width <= 0 || rect.height <= 0) return;

                                                const touch = e.touches[0];
                                                const deltaX = ((touch.clientX - ft.startX) / rect.width) * 100;
                                                const deltaY = ((touch.clientY - ft.startY) / rect.height) * 100;

                                                const newX = Math.max(0, Math.min(100 - ft.startFieldW, ft.startFieldX + deltaX));
                                                const newY = Math.max(0, Math.min(100 - ft.startFieldH, ft.startFieldY + deltaY));

                                                updateField(templateId, field.id, { x: newX, y: newY });
                                                setHasUnsavedChanges(true);
                                            }
                                        }}
                                        onTouchEnd={() => {
                                            mobileFieldTouchRef.current.isDragging = false;
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedFieldId(field.id);
                                            setIsMobileDrawerOpen(true);
                                            setActiveSection('general-mob');
                                        }}
                                    >
                                        <div
                                            className={`absolute inset-0.5 flex ${field.type === 'line-items' ? 'overflow-visible items-stretch' : 'items-center'} pointer-events-none`}
                                            style={{
                                                fontSize: `${field.fontSize}px`,
                                                color: field.fontColor,
                                                fontWeight: field.fontWeight === 'bold' ? 700 : field.fontWeight === 'semibold' ? 600 : field.fontWeight === 'medium' ? 500 : 400,
                                                textAlign: field.alignment,
                                                justifyContent: field.alignment === 'center' ? 'center' : field.alignment === 'right' ? 'flex-end' : 'flex-start',
                                            }}
                                        >
                                            {field.type !== 'line-items' && field.type !== 'link-button' && (
                                                <span className={`truncate text-xs ${!showPreview ? 'opacity-40' : ''}`}>
                                                    {showPreview ? (previewData[field.type] || field.label) : field.label}
                                                </span>
                                            )}
                                            {field.type === 'link-button' && (
                                                <div className="w-full h-full flex items-center justify-center text-xs rounded"
                                                    style={{ backgroundColor: (field as any).customValues?.buttonColor || '#3b82f6', color: field.fontColor || '#fff' }}>
                                                    {field.label}
                                                </div>
                                            )}
                                        </div>
                                        {/* Simplified resize handles on mobile */}
                                        {selectedFieldId === field.id && (
                                            <>
                                                <div className="absolute -top-1 -left-1 w-3 h-3 bg-white border-2 border-blue-500 z-50 rounded-sm" />
                                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-white border-2 border-blue-500 z-50 rounded-sm" />
                                                <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white border-2 border-blue-500 z-50 rounded-sm" />
                                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border-2 border-blue-500 z-50 rounded-sm" />
                                            </>
                                        )}
                                    </div>
                                ))}

                                {/* Drawing Rectangle (mobile) */}
                                {isDrawing && (
                                    <div
                                        className="absolute border-2 border-dashed border-blue-500 bg-blue-500/10 pointer-events-none"
                                        style={{
                                            left: `${Math.min(drawStart.x, drawCurrent.x)}%`,
                                            top: `${Math.min(drawStart.y, drawCurrent.y)}%`,
                                            width: `${Math.abs(drawCurrent.x - drawStart.x)}%`,
                                            height: `${Math.abs(drawCurrent.y - drawStart.y)}%`,
                                        }}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>


                {/* Field Properties Panel - Desktop (right side) */}
                {showFieldPanel && (
                    <div className="hidden md:flex w-72 bg-white dark:bg-neutral-800 border-l border-neutral-200 dark:border-neutral-700 flex-col">
                        <div className="p-4 border-b border-neutral-100 dark:border-neutral-700">
                            <h3 className="text-sm font-semibold text-[#2d3748] dark:text-white">Field Properties</h3>
                        </div>

                        {selectedField ? (
                            <div className="flex-1 overflow-y-auto">
                                <PropertySection
                                    id="general"
                                    title="General"
                                    icon={Settings2}
                                    activeSection={activeSection}
                                    setActiveSection={setActiveSection}
                                >
                                    {/* Field Type */}
                                    <div className="space-y-1.5">
                                        <label className="block text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-tight">Type</label>
                                        <Select
                                            options={fieldTypeOptions}
                                            value={selectedField.type}
                                            onChange={(v) => {
                                                const newType = v as FieldType;
                                                handleFieldUpdate('type', newType);
                                                // Auto-fill label with the type's display name
                                                const typeLabel = fieldTypeOptions.find(opt => opt.value === newType)?.label;
                                                if (typeLabel) {
                                                    handleFieldUpdate('label', typeLabel);
                                                }
                                            }}
                                            className="w-full bg-neutral-50/50 dark:bg-neutral-900/50 border-neutral-200/50 dark:border-neutral-700/50"
                                        />
                                        {/* Value Preview for variable fields */}
                                        {['document-number', 'date', 'due-date', 'customer-name', 'grand-total'].includes(selectedField.type) && (
                                            <div className="flex items-center gap-2 px-2 py-1.5 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800">
                                                <Eye className="w-3 h-3 text-blue-500" />
                                                <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 truncate">
                                                    Preview: {previewData[selectedField.type] || 'N/A'}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Label */}
                                    <div className="space-y-1.5">
                                        <label className="block text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-tight">Label</label>
                                        <SmartLabelInput
                                            value={selectedField.label}
                                            onChange={(val) => handleFieldUpdate('label', val)}
                                            onSelectType={(type) => handleFieldUpdate('type', type)}
                                            className="bg-neutral-50/50 dark:bg-neutral-900/50 border-neutral-200/50 dark:border-neutral-700/50"
                                        />
                                    </div>

                                    {/* Data Type (Custom Fields Only) */}
                                    {selectedField.type === 'custom' && (
                                        <div className="space-y-1.5">
                                            <label className="block text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-tight">Data Type</label>
                                            <Select
                                                options={[
                                                    { value: 'text', label: 'Text' },
                                                    { value: 'number', label: 'Number' },
                                                    { value: 'currency', label: 'Currency' },
                                                ]}
                                                value={selectedField.dataType || 'text'}
                                                onChange={(v) => handleFieldUpdate('dataType', v)}
                                                className="w-full bg-neutral-50/50 dark:bg-neutral-900/50 border-neutral-200/50 dark:border-neutral-700/50"
                                            />
                                            <p className="text-[10px] text-neutral-400 px-1">
                                                {selectedField.dataType === 'currency'
                                                    ? 'Shows currency symbol.'
                                                    : selectedField.dataType === 'number'
                                                        ? 'Numeric formatting.'
                                                        : 'Plain text.'}
                                            </p>
                                        </div>
                                    )}

                                    {/* Link Button Properties */}
                                    {selectedField.type === 'link-button' && (
                                        <>
                                            <div className="space-y-1.5">
                                                <label className="block text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-tight">Target URL</label>
                                                <Input
                                                    placeholder="https://example.com"
                                                    // @ts-ignore
                                                    value={selectedField.customValues?.url || ''}
                                                    // @ts-ignore
                                                    onChange={(e) => handleFieldUpdate('customValues', { ...selectedField.customValues, url: e.target.value })}
                                                    className="bg-neutral-50/50 dark:bg-neutral-900/50 border-neutral-200/50 dark:border-neutral-700/50"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="block text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-tight">Button Color</label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="color"
                                                        // @ts-ignore
                                                        value={selectedField.customValues?.buttonColor || '#3b82f6'}
                                                        // @ts-ignore
                                                        onChange={(e) => handleFieldUpdate('customValues', { ...selectedField.customValues, buttonColor: e.target.value })}
                                                        className="h-8 w-8 rounded cursor-pointer border-0 p-0"
                                                    />
                                                    <Input
                                                        placeholder="#3b82f6"
                                                        // @ts-ignore
                                                        value={selectedField.customValues?.buttonColor || '#3b82f6'}
                                                        // @ts-ignore
                                                        onChange={(e) => handleFieldUpdate('customValues', { ...selectedField.customValues, buttonColor: e.target.value })}
                                                        className="flex-1 bg-neutral-50/50 dark:bg-neutral-900/50 border-neutral-200/50 dark:border-neutral-700/50"
                                                    />
                                                </div>
                                            </div>

                                            {/* Button Style (Border Radius) */}
                                            <div className="space-y-1.5">
                                                <label className="block text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-tight">Button Style</label>
                                                <div className="grid grid-cols-3 gap-1 bg-neutral-100/50 dark:bg-neutral-900/50 p-1 rounded-lg border border-neutral-200/50 dark:border-neutral-700/50">
                                                    {[
                                                        { value: 'sharp', label: 'Sharp' },
                                                        { value: 'rounded', label: 'Rounded' },
                                                        { value: 'pill', label: 'Pill' }
                                                    ].map((opt) => {
                                                        const current = selectedField.customValues?.borderRadius || 'rounded'; // Default to rounded
                                                        const isActive = current === opt.value;
                                                        return (
                                                            <button
                                                                type="button"
                                                                key={opt.value}
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    handleFieldUpdate('customValues', {
                                                                        ...selectedField.customValues,
                                                                        borderRadius: opt.value
                                                                    });
                                                                }}
                                                                className={`h-7 text-[10px] font-medium rounded transition-all flex items-center justify-center ${isActive
                                                                    ? 'bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-sm border border-neutral-200 dark:border-neutral-700'
                                                                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                                                                    }`}
                                                            >
                                                                {opt.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Button Variant (Fill/Outline) */}
                                            <div className="space-y-1.5">
                                                <label className="block text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-tight">Fill Style</label>
                                                <div className="grid grid-cols-2 gap-1 bg-neutral-100/50 dark:bg-neutral-900/50 p-1 rounded-lg border border-neutral-200/50 dark:border-neutral-700/50">
                                                    {[
                                                        { value: 'filled', label: 'Filled' },
                                                        { value: 'outline', label: 'Outline' }
                                                    ].map((opt) => {
                                                        const current = selectedField.customValues?.variant || 'filled';
                                                        const isActive = current === opt.value;
                                                        return (
                                                            <button
                                                                type="button"
                                                                key={opt.value}
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    handleFieldUpdate('customValues', {
                                                                        ...selectedField.customValues,
                                                                        variant: opt.value
                                                                    });
                                                                }}
                                                                className={`h-7 text-[10px] font-medium rounded transition-all flex items-center justify-center ${isActive
                                                                    ? 'bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-sm border border-neutral-200 dark:border-neutral-700'
                                                                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                                                                    }`}
                                                            >
                                                                {opt.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </PropertySection>

                                <PropertySection
                                    id="typography"
                                    title="Typography"
                                    icon={Type}
                                    activeSection={activeSection}
                                    setActiveSection={setActiveSection}
                                >
                                    {/* Font Size */}
                                    <div>
                                        <label className="block text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-tight mb-2">Font Size</label>
                                        <div className="flex flex-col gap-3 bg-neutral-50/50 dark:bg-neutral-900/50 p-3 rounded-xl border border-neutral-200/50 dark:border-neutral-700/50">
                                            <div className="flex gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <Input
                                                        type="number"
                                                        value={selectedField.fontSize}
                                                        onChange={(e) => handleFieldUpdate('fontSize', parseInt(e.target.value) || 0)}
                                                        className="h-9 bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                                                        min={1}
                                                        max={200}
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <Select
                                                        options={[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72].map(s => ({ label: `${s}px`, value: String(s) }))}
                                                        value={String(selectedField.fontSize)}
                                                        onChange={(v) => handleFieldUpdate('fontSize', Number(v))}
                                                        className="h-9 bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                                                    />
                                                </div>
                                            </div>
                                            <input
                                                type="range"
                                                min="8"
                                                max="72"
                                                value={selectedField.fontSize}
                                                onChange={(e) => handleFieldUpdate('fontSize', parseInt(e.target.value))}
                                                className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Font Color */}
                                    <div>
                                        <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">Font Color</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={selectedField.fontColor}
                                                onChange={(e) => handleFieldUpdate('fontColor', e.target.value)}
                                                className="w-10 h-10 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 cursor-pointer"
                                            />
                                            <Input
                                                value={selectedField.fontColor}
                                                onChange={(e) => handleFieldUpdate('fontColor', e.target.value)}
                                                className="flex-1"
                                            />
                                        </div>
                                    </div>

                                    {/* Font Weight */}
                                    <div>
                                        <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">Font Weight</label>
                                        <Select
                                            options={[
                                                { value: 'normal', label: 'Normal' },
                                                { value: 'medium', label: 'Medium' },
                                                { value: 'semibold', label: 'Semibold' },
                                                { value: 'bold', label: 'Bold' },
                                            ]}
                                            value={selectedField.fontWeight}
                                            onChange={(v) => handleFieldUpdate('fontWeight', v)}
                                        />
                                    </div>

                                    {/* Alignment */}
                                    <div>
                                        <label className="block text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-tight mb-2">Alignment</label>
                                        <div className="flex items-center gap-1.5 bg-neutral-100/50 dark:bg-neutral-900/50 rounded-xl p-1.5 border border-neutral-200/50 dark:border-neutral-700/50">
                                            {(['left', 'center', 'right'] as TextAlignment[]).map((align) => (
                                                <button
                                                    key={align}
                                                    onClick={() => handleFieldUpdate('alignment', align)}
                                                    className={`flex-1 flex items-center justify-center h-9 rounded-lg transition-all ${selectedField.alignment === align
                                                        ? 'bg-white dark:bg-neutral-800 text-blue-500 dark:text-blue-400 shadow-sm border border-neutral-200 dark:border-neutral-700'
                                                        : 'text-neutral-500 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                                                        }`}
                                                >
                                                    {align === 'left' && <AlignLeft className="w-4 h-4" />}
                                                    {align === 'center' && <AlignCenter className="w-4 h-4" />}
                                                    {align === 'right' && <AlignRight className="w-4 h-4" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </PropertySection>

                                <PropertySection
                                    id="layout"
                                    title="Position & Size"
                                    icon={Maximize2}
                                    activeSection={activeSection}
                                    setActiveSection={setActiveSection}
                                >
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                                <span className="text-[10px] font-bold text-blue-500/60 dark:text-blue-400/60 uppercase">X</span>
                                            </div>
                                            <div className="w-full bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200/50 dark:border-neutral-700/50 rounded-xl py-2 pl-7 pr-3 text-right">
                                                <span className="text-xs font-mono font-medium text-neutral-700 dark:text-neutral-200">{selectedField.x.toFixed(1)}%</span>
                                            </div>
                                        </div>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                                <span className="text-[10px] font-bold text-blue-500/60 dark:text-blue-400/60 uppercase">Y</span>
                                            </div>
                                            <div className="w-full bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200/50 dark:border-neutral-700/50 rounded-xl py-2 pl-7 pr-3 text-right">
                                                <span className="text-xs font-mono font-medium text-neutral-700 dark:text-neutral-200">{selectedField.y.toFixed(1)}%</span>
                                            </div>
                                        </div>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                                <span className="text-[10px] font-bold text-blue-500/60 dark:text-blue-400/60 uppercase">W</span>
                                            </div>
                                            <div className="w-full bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200/50 dark:border-neutral-700/50 rounded-xl py-2 pl-7 pr-3 text-right">
                                                <span className="text-xs font-mono font-medium text-neutral-700 dark:text-neutral-200">{selectedField.width.toFixed(1)}%</span>
                                            </div>
                                        </div>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                                <span className="text-[10px] font-bold text-blue-500/60 dark:text-blue-400/60 uppercase">H</span>
                                            </div>
                                            <div className="w-full bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200/50 dark:border-neutral-700/50 rounded-xl py-2 pl-7 pr-3 text-right">
                                                <span className="text-xs font-mono font-medium text-neutral-700 dark:text-neutral-200">{selectedField.height.toFixed(1)}%</span>
                                            </div>
                                        </div>
                                    </div>
                                </PropertySection>

                                {selectedField.type === 'line-items' && (
                                    <PropertySection
                                        id="table"
                                        title="Table Config"
                                        icon={Layers}
                                        activeSection={activeSection}
                                        setActiveSection={setActiveSection}
                                    >
                                        <div className="flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50 p-3 rounded-xl border border-neutral-200/50 dark:border-neutral-700/50">
                                            <span className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-tight">Show Header Row</span>
                                            <button
                                                onClick={() => handleFieldUpdate('showTableHeaders', selectedField.showTableHeaders === false)}
                                                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${selectedField.showTableHeaders !== false ? 'bg-blue-600' : 'bg-neutral-200 dark:bg-neutral-700'}`}
                                            >
                                                <span
                                                    aria-hidden="true"
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${selectedField.showTableHeaders !== false ? 'translate-x-5' : 'translate-x-0'}`}
                                                />
                                            </button>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">Max Rows</label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={selectedField.maxRows || ''}
                                                onChange={(e) => handleFieldUpdate('maxRows', parseInt(e.target.value) || undefined)}
                                                placeholder="Auto-calculated"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between mt-4 mb-2">
                                            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400">Column Configuration</label>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => {
                                                    const newCol = { id: uuidv4(), header: 'New Column', width: 20, type: 'text', key: `custom_${uuidv4()}` };
                                                    handleFieldUpdate('columns', [...(selectedField.columns || []), newCol]);
                                                }}
                                            >
                                                <Plus className="w-3 h-3 mr-1" /> Add
                                            </Button>
                                        </div>



                                        <div className="space-y-3">
                                            {(selectedField.columns || []).map((col, index) => (
                                                <div key={col.id} className="bg-neutral-50 dark:bg-neutral-900/50 p-2 rounded-lg space-y-2">
                                                    {/* Header & Delete */}
                                                    <div className="flex gap-2">
                                                        <Input
                                                            value={col.header}
                                                            onChange={(e) => {
                                                                const newCols = [...(selectedField.columns || [])];
                                                                newCols[index] = { ...col, header: e.target.value };
                                                                handleFieldUpdate('columns', newCols);
                                                            }}
                                                            placeholder="Header"
                                                            className="flex-1 h-8 text-xs"
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                const newCols = (selectedField.columns || []).filter(c => c.id !== col.id);
                                                                handleFieldUpdate('columns', newCols);
                                                            }}
                                                            className="text-neutral-400 dark:text-neutral-500 hover:text-red-500"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>

                                                    {/* Width & Data Map */}
                                                    <div className="flex gap-2">
                                                        <div className="flex items-center gap-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded px-2 h-8 flex-1">
                                                            <span className="text-xs text-neutral-400 dark:text-neutral-500">W:</span>
                                                            <input
                                                                type="number"
                                                                value={col.width}
                                                                onChange={(e) => {
                                                                    const newCols = [...(selectedField.columns || [])];
                                                                    newCols[index] = { ...col, width: parseInt(e.target.value) || 0 };
                                                                    handleFieldUpdate('columns', newCols);
                                                                }}
                                                                className="w-full bg-transparent text-xs outline-none text-neutral-700 dark:text-neutral-200"
                                                            />
                                                            <span className="text-xs text-neutral-400 dark:text-neutral-500">%</span>
                                                        </div>
                                                        <select
                                                            value={['description', 'quantity', 'unitPrice', 'subtotal', 'sn'].includes(col.key) ? col.key : 'custom'}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                const newCols = [...(selectedField.columns || [])];
                                                                if (val === 'custom') {
                                                                    if (['description', 'quantity', 'unitPrice', 'subtotal', 'sn'].includes(col.key)) {
                                                                        newCols[index] = { ...col, key: `custom_${uuidv4()}` };
                                                                    }
                                                                } else {
                                                                    newCols[index] = { ...col, key: val };
                                                                }
                                                                handleFieldUpdate('columns', newCols);
                                                            }}
                                                            className="h-8 text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded px-1 outline-none flex-1 text-neutral-700 dark:text-neutral-200"
                                                            title="Data Mapping"
                                                        >
                                                            <option value="description">Product</option>
                                                            <option value="quantity">Qty</option>
                                                            <option value="unitPrice">Unit Price</option>
                                                            <option value="subtotal">Total</option>
                                                            <option value="sn">S/N</option>
                                                            <option value="custom">Custom</option>
                                                        </select>
                                                    </div>

                                                    {/* Alignment Icons */}
                                                    <div className="flex gap-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded p-1">
                                                        {[
                                                            { align: 'left', Icon: AlignLeft },
                                                            { align: 'center', Icon: AlignCenter },
                                                            { align: 'right', Icon: AlignRight }
                                                        ].map(({ align, Icon }) => {
                                                            // Determine effective alignment for highlighting
                                                            const effectiveAlign = col.alignment || (
                                                                (col.key === 'sn' || col.key === 'quantity' || col.key === 'qty') ? 'center' :
                                                                    (col.key === 'unitPrice' || col.key === 'subtotal' || col.key === 'price' || col.key === 'total' || col.key === 'amount' || col.type === 'currency' || col.type === 'number') ? 'right' :
                                                                        'left'
                                                            );

                                                            const isActive = effectiveAlign === align;

                                                            return (
                                                                <button
                                                                    key={align}
                                                                    onClick={() => {
                                                                        const newCols = [...(selectedField.columns || [])];
                                                                        newCols[index] = { ...col, alignment: align as 'left' | 'center' | 'right' };
                                                                        handleFieldUpdate('columns', newCols);
                                                                    }}
                                                                    className={`p-1.5 rounded flex-1 flex items-center justify-center transition-all ${isActive
                                                                        ? 'bg-neutral-100 dark:bg-neutral-700 text-blue-600 dark:text-blue-400 font-medium shadow-sm'
                                                                        : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                                                                        }`}
                                                                    title={`Align ${align}`}
                                                                >
                                                                    <Icon className="w-4 h-4" strokeWidth={isActive ? 2.5 : 2} />
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                    </PropertySection>
                                )}

                                {/* Delete Field Button */}
                                <div className="p-4 mt-auto">
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        fullWidth
                                        leftIcon={<Trash2 className="w-4 h-4" />}
                                        onClick={handleDeleteField}
                                    >
                                        Delete Field
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto">
                                <PropertySection
                                    id="template-settings"
                                    title="Template Settings"
                                    icon={Settings}
                                    activeSection={activeSection || 'template-settings'}
                                    setActiveSection={setActiveSection}
                                >
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Template Name</label>
                                            <Input
                                                value={template.name}
                                                onChange={(e) => updateTemplate(template.id, { name: e.target.value })}
                                                className="bg-white dark:bg-neutral-800"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Document Type</label>
                                            <Select
                                                options={[
                                                    { value: 'invoice', label: 'Invoice' },
                                                    { value: 'receipt', label: 'Receipt' },
                                                    { value: 'delivery-note', label: 'Delivery Note' },
                                                ]}
                                                value={template.type}
                                                onChange={(v) => updateTemplate(template.id, { type: v as any })}
                                                className="bg-white dark:bg-neutral-800"
                                            />
                                            <p className="text-xs text-neutral-500 mt-1.5 px-1">
                                                Determines which numbering sequence (e.g. INV-001 vs REC-001) is used.
                                            </p>
                                        </div>

                                        <div className="pt-4 border-t border-neutral-100 dark:border-neutral-700">
                                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Cover Image (Optional)</label>
                                            <div className="relative group">
                                                <div
                                                    onClick={() => document.getElementById('template-cover-upload')?.click()}
                                                    className="w-full aspect-video bg-neutral-100 dark:bg-neutral-900 rounded-lg border-2 border-dashed border-neutral-200 dark:border-neutral-700 hover:border-blue-400 dark:hover:border-blue-600 cursor-pointer overflow-hidden flex items-center justify-center transition-colors"
                                                >
                                                    {template.coverImage ? (
                                                        <img src={template.coverImage} alt="Cover" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="text-center p-4">
                                                            <Plus className="w-6 h-6 mx-auto text-neutral-400 mb-2" />
                                                            <span className="text-xs text-neutral-500">Add Cover Image</span>
                                                        </div>
                                                    )}

                                                    {template.coverImage && (
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                            <span className="text-white text-xs font-medium bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm">
                                                                Change
                                                            </span>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    updateTemplate(template.id, { coverImage: undefined });
                                                                }}
                                                                className="text-white text-xs font-medium bg-red-500/80 px-3 py-1.5 rounded-full backdrop-blur-sm hover:bg-red-600"
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                                <input
                                                    id="template-cover-upload"
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            compressImage(file, 800, 0.7).then((result) => {
                                                                updateTemplate(template.id, { coverImage: result });
                                                            });
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <p className="text-xs text-neutral-500 mt-1.5 px-1">
                                                Used as thumbnail in template lists. Defaults to the first uploaded image.
                                            </p>
                                        </div>


                                        <div className="pt-4 border-t border-neutral-100 dark:border-neutral-700">
                                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Background Image</label>
                                            <div className="relative group">
                                                <div
                                                    onClick={() => document.getElementById('template-bg-upload')?.click()}
                                                    className="w-full aspect-video bg-neutral-100 dark:bg-neutral-900 rounded-lg border-2 border-dashed border-neutral-200 dark:border-neutral-700 hover:border-blue-400 dark:hover:border-blue-600 cursor-pointer overflow-hidden flex items-center justify-center transition-colors"
                                                >
                                                    {template.imageUrl ? (
                                                        <img src={template.imageUrl} alt="Background" className="w-full h-full object-contain" />
                                                    ) : (
                                                        <div className="text-center p-4">
                                                            <Plus className="w-6 h-6 mx-auto text-neutral-400 mb-2" />
                                                            <span className="text-xs text-neutral-500">Upload Image</span>
                                                        </div>
                                                    )}

                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <span className="text-white text-xs font-medium bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm">
                                                            Change Image
                                                        </span>
                                                    </div>
                                                </div>
                                                <input
                                                    id="template-bg-upload"
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            compressImage(file, 1920, 0.7).then((result) => {
                                                                // Load image to get dimensions
                                                                const img = new window.Image();
                                                                img.onload = () => {
                                                                    const isLandscape = img.width > img.height;
                                                                    // Update template with new image and dimensions
                                                                    updateTemplate(template.id, {
                                                                        imageUrl: result,
                                                                        width: isLandscape ? 842 : 595,
                                                                        height: isLandscape ? Math.round(842 * (img.height / img.width)) : Math.round(595 * (img.height / img.width)),
                                                                        orientation: isLandscape ? 'landscape' : 'portrait'
                                                                    });
                                                                };
                                                                img.src = result;
                                                            });
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <p className="text-xs text-neutral-500 mt-1.5 px-1">
                                                Replaces the background for the current document type only.
                                            </p>
                                        </div>
                                    </div>

                                </PropertySection>

                                <div className="p-6 text-center">
                                    <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-900 rounded-xl flex items-center justify-center mx-auto mb-3">
                                        <MousePointer className="w-6 h-6 text-neutral-400 dark:text-neutral-500" />
                                    </div>
                                    <p className="text-sm text-neutral-500">
                                        Select a field on the canvas to edit its properties.
                                    </p>
                                </div>
                            </div >
                        )
                        }

                        {/* Field List */}
                        <div className="border-t border-neutral-200 dark:border-neutral-700">
                            <div className="p-4 border-b border-neutral-100 dark:border-neutral-700 flex items-center justify-between">
                                <h4 className="text-xs font-semibold text-[#2d3748] dark:text-white uppercase tracking-wider">All Fields</h4>
                                <span className="text-xs text-neutral-400 dark:text-neutral-500">{template.fields.length}</span>
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                                {template.fields.length === 0 ? (
                                    <p className="p-4 text-sm text-neutral-400 text-center">No fields yet</p>
                                ) : (
                                    template.fields.map((field) => (
                                        <button
                                            key={field.id}
                                            onClick={() => setSelectedFieldId(field.id)}
                                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${selectedFieldId === field.id
                                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                                : 'hover:bg-neutral-50 dark:hover:bg-neutral-700/50 text-neutral-700 dark:text-neutral-300'
                                                }`}
                                        >
                                            <GripVertical className="w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600" />
                                            <span className="text-sm truncate flex-1">{field.label}</span>
                                            <span className="text-xs text-neutral-400 dark:text-neutral-500">{field.type}</span>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div >
                )
                }
            </div >

            {/* Mobile Bottom Action Bar */}
            <div className="md:hidden bg-white dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700 px-4 py-2 flex items-center justify-between gap-3" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 8px), 8px)' }}>
                {/* Tool Buttons */}
                <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-900 rounded-xl p-1">
                    <button
                        onClick={() => setActiveTool('select')}
                        className={`p-2.5 rounded-lg transition-colors ${
                            activeTool === 'select'
                                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                                : 'text-neutral-500 hover:bg-white dark:hover:bg-neutral-800'
                        }`}
                        title="Select Tool"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                            <path d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    <button
                        onClick={() => setActiveTool('draw')}
                        className={`p-2.5 rounded-lg transition-colors ${
                            activeTool === 'draw'
                                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                                : 'text-neutral-500 hover:bg-white dark:hover:bg-neutral-800'
                        }`}
                        title="Draw Field"
                    >
                        <Square className="w-5 h-5" />
                    </button>
                </div>

                {/* Undo/Redo */}
                <div className="flex items-center gap-1">
                    <button
                        disabled={historyIndex <= 0}
                        onClick={handleUndo}
                        className="p-2.5 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-30 transition-colors"
                    >
                        <Undo className="w-4 h-4" />
                    </button>
                    <button
                        disabled={historyIndex >= history.length - 1}
                        onClick={handleRedo}
                        className="p-2.5 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-30 transition-colors"
                    >
                        <Redo className="w-4 h-4" />
                    </button>
                </div>

                {/* Open Field Properties Drawer */}
                <button
                    onClick={() => setIsMobileDrawerOpen(true)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                        selectedField
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                    }`}
                >
                    <Settings2 className="w-4 h-4" />
                    <span>{selectedField ? 'Properties' : 'Settings'}</span>
                </button>
            </div>

            {/* Mobile Bottom Drawer - Field Properties */}
            <div
                className={`fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white dark:bg-neutral-800 rounded-t-2xl shadow-2xl border-t border-neutral-200 dark:border-neutral-700 flex flex-col transition-transform duration-300 ease-out ${
                    isMobileDrawerOpen ? 'translate-y-0' : 'translate-y-full'
                }`}
                style={{ maxHeight: '80vh', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
                {/* Drawer Handle & Header */}
                <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-neutral-100 dark:border-neutral-700 shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-1 bg-neutral-300 dark:bg-neutral-600 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
                        <h3 className="text-sm font-semibold text-[#2d3748] dark:text-white mt-2">
                            {selectedField ? 'Field Properties' : 'Template Settings'}
                        </h3>
                    </div>
                    <button
                        onClick={() => setIsMobileDrawerOpen(false)}
                        className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 mt-2"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Drawer Content - same as desktop panel, scrollable */}
                <div className="flex-1 overflow-y-auto">
                    {selectedField ? (
                        <div className="flex-1 overflow-y-auto">
                            <PropertySection
                                id="general-mob"
                                title="General"
                                icon={Settings2}
                                activeSection={activeSection}
                                setActiveSection={setActiveSection}
                            >
                                <div className="space-y-1.5">
                                    <label className="block text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-tight">Type</label>
                                    <Select
                                        options={fieldTypeOptions}
                                        value={selectedField.type}
                                        onChange={(v) => {
                                            const newType = v as FieldType;
                                            handleFieldUpdate('type', newType);
                                            const typeLabel = fieldTypeOptions.find(opt => opt.value === newType)?.label;
                                            if (typeLabel) handleFieldUpdate('label', typeLabel);
                                        }}
                                        className="w-full bg-neutral-50/50 dark:bg-neutral-900/50 border-neutral-200/50 dark:border-neutral-700/50"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-tight">Label</label>
                                    <SmartLabelInput
                                        value={selectedField.label}
                                        onChange={(val) => handleFieldUpdate('label', val)}
                                        onSelectType={(type) => handleFieldUpdate('type', type)}
                                        className="bg-neutral-50/50 dark:bg-neutral-900/50 border-neutral-200/50 dark:border-neutral-700/50"
                                    />
                                </div>
                            </PropertySection>
                            <PropertySection
                                id="typography-mob"
                                title="Typography"
                                icon={Type}
                                activeSection={activeSection}
                                setActiveSection={setActiveSection}
                            >
                                <div>
                                    <label className="block text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-tight mb-2">Font Size</label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="number"
                                            value={selectedField.fontSize}
                                            onChange={(e) => handleFieldUpdate('fontSize', parseInt(e.target.value) || 0)}
                                            className="h-9 bg-white dark:bg-neutral-800"
                                            min={1} max={200}
                                        />
                                        <Select
                                            options={[8,9,10,11,12,14,16,18,20,24,28,32].map(s => ({ label: `${s}px`, value: String(s) }))}
                                            value={String(selectedField.fontSize)}
                                            onChange={(v) => handleFieldUpdate('fontSize', Number(v))}
                                            className="h-9 bg-white dark:bg-neutral-800"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">Font Weight</label>
                                    <Select
                                        options={[
                                            { value: 'normal', label: 'Normal' },
                                            { value: 'medium', label: 'Medium' },
                                            { value: 'semibold', label: 'Semibold' },
                                            { value: 'bold', label: 'Bold' },
                                        ]}
                                        value={selectedField.fontWeight}
                                        onChange={(v) => handleFieldUpdate('fontWeight', v)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-tight mb-2">Alignment</label>
                                    <div className="flex items-center gap-1.5 bg-neutral-100/50 dark:bg-neutral-900/50 rounded-xl p-1.5 border border-neutral-200/50 dark:border-neutral-700/50">
                                        {(['left', 'center', 'right'] as TextAlignment[]).map((align) => (
                                            <button
                                                key={align}
                                                onClick={() => handleFieldUpdate('alignment', align)}
                                                className={`flex-1 flex items-center justify-center h-9 rounded-lg transition-all ${selectedField.alignment === align
                                                    ? 'bg-white dark:bg-neutral-800 text-blue-500 dark:text-blue-400 shadow-sm border border-neutral-200 dark:border-neutral-700'
                                                    : 'text-neutral-500 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                                                }`}
                                            >
                                                {align === 'left' && <AlignLeft className="w-4 h-4" />}
                                                {align === 'center' && <AlignCenter className="w-4 h-4" />}
                                                {align === 'right' && <AlignRight className="w-4 h-4" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </PropertySection>
                            <div className="p-4">
                                <Button
                                    variant="danger"
                                    size="sm"
                                    fullWidth
                                    leftIcon={<Trash2 className="w-4 h-4" />}
                                    onClick={() => { handleDeleteField(); setIsMobileDrawerOpen(false); }}
                                >
                                    Delete Field
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Template Name</label>
                                <Input
                                    value={template.name}
                                    onChange={(e) => updateTemplate(template.id, { name: e.target.value })}
                                    className="bg-white dark:bg-neutral-800"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Document Type</label>
                                <Select
                                    options={[
                                        { value: 'invoice', label: 'Invoice' },
                                        { value: 'receipt', label: 'Receipt' },
                                        { value: 'delivery-note', label: 'Delivery Note' },
                                    ]}
                                    value={template.type}
                                    onChange={(v) => updateTemplate(template.id, { type: v as any })}
                                    className="bg-white dark:bg-neutral-800"
                                />
                            </div>
                            {/* Field list for mobile */}
                            <div>
                                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">All Fields ({template.fields.length})</label>
                                <div className="space-y-1 max-h-48 overflow-y-auto">
                                    {template.fields.length === 0 ? (
                                        <p className="text-sm text-neutral-400 text-center py-3">No fields yet. Use Draw tool to add.</p>
                                    ) : (
                                        template.fields.map((field) => (
                                            <button
                                                key={field.id}
                                                onClick={() => {
                                                    setSelectedFieldId(field.id);
                                                    // Show field properties after selecting
                                                    setActiveSection('general-mob');
                                                }}
                                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                                                    selectedFieldId === field.id
                                                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                                        : 'hover:bg-neutral-50 dark:hover:bg-neutral-700/50 text-neutral-700 dark:text-neutral-300'
                                                }`}
                                            >
                                                <GripVertical className="w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600" />
                                                <span className="text-sm truncate flex-1">{field.label}</span>
                                                <span className="text-xs text-neutral-400">{field.type}</span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* New Field Modal */}
            < Modal
                isOpen={isNewFieldModalOpen}
                onClose={() => setIsNewFieldModalOpen(false)}
                title="Create New Field"
                size="sm"
            >
                <div className="space-y-4">
                    <Select
                        label="Field Type"
                        options={fieldTypeOptions}
                        value={newFieldType}
                        onChange={(v) => {
                            const type = v as FieldType;
                            setNewFieldType(type);
                            // Auto-fill label with the type's display name
                            const typeLabel = fieldTypeOptions.find(opt => opt.value === type)?.label;
                            if (typeLabel) {
                                setNewFieldLabel(typeLabel);
                            }
                        }}
                    />
                    {newFieldType !== 'line-items' && (
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Field Label</label>
                            <SmartLabelInput
                                value={newFieldLabel}
                                onChange={setNewFieldLabel}
                                onSelectType={setNewFieldType}
                                className="w-full"
                            />
                        </div>
                    )}
                </div>
                <ModalFooter>
                    <Button variant="ghost" onClick={() => setIsNewFieldModalOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreateField}
                        disabled={newFieldType !== 'line-items' && !newFieldLabel.trim()}
                    >
                        Create Field
                    </Button>
                </ModalFooter>
            </Modal >


            {/* New Variant Modal */}
            < Modal
                isOpen={isVariantUploadModalOpen}
                onClose={() => setIsVariantUploadModalOpen(false)}
                title={`Add ${variantUploadType === 'delivery-note' ? 'Delivery Note' : variantUploadType.charAt(0).toUpperCase() + variantUploadType.slice(1)} Layout`}
                description="Upload the background image for this document type."
                size="md"
            >
                <div className="space-y-4">
                    {variantUploadPreview ? (
                        <div className="relative aspect-video bg-neutral-100 dark:bg-neutral-900 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 group">
                            <img src={variantUploadPreview} alt="Preview" className="w-full h-full object-contain" />
                            <button
                                onClick={() => {
                                    setVariantUploadPreview(null);
                                    setVariantUploadFile(null);
                                }}
                                className="absolute top-2 right-2 p-1.5 bg-white/90 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div
                            onClick={() => document.getElementById('variant-file-upload')?.click()}
                            className="w-full aspect-video rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-700 hover:border-blue-400 dark:hover:border-blue-600 bg-neutral-50 dark:bg-neutral-900/50 flex flex-col items-center justify-center cursor-pointer transition-colors group"
                        >
                            <div className="w-12 h-12 rounded-full bg-white dark:bg-neutral-800 flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
                                <Plus className="w-6 h-6 text-neutral-400 dark:text-neutral-500" />
                            </div>
                            <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">Click to upload image</span>
                            <span className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">PNG, JPG, SVG</span>
                        </div>
                    )}
                    <input
                        id="variant-file-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                setVariantUploadFile(file);
                                compressImage(file, 1920, 0.7).then((result) => {
                                    setVariantUploadPreview(result);
                                });
                            }
                        }}
                    />
                </div>
                <ModalFooter>
                    <Button variant="ghost" onClick={() => setIsVariantUploadModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddVariant} disabled={!variantUploadPreview}>Create Layout</Button>
                </ModalFooter>
            </Modal >
        </div >
    );
}
