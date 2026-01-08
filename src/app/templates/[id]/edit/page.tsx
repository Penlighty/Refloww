"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTemplateStore, useSettingsStore } from '@/lib/store';
import { MappedField, FieldType, TextAlignment, DocumentType } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
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
    Maximize2
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

// Field type options
const fieldTypeOptions = [
    { value: 'text', label: 'Static Text' },
    { value: 'date', label: 'Document Date' },
    { value: 'due-date', label: 'Due Date' },
    { value: 'document-number', label: 'Document Number' },
    { value: 'customer-name', label: 'Customer Name' },
    { value: 'customer-email', label: 'Customer Email' },
    { value: 'customer-phone', label: 'Customer Phone' },
    { value: 'customer-address', label: 'Customer Address' },
    { value: 'line-items', label: 'Line Items Table' },
    { value: 'subtotal', label: 'Subtotal' },
    { value: 'discount', label: 'Discount Amount' },
    { value: 'discount-name', label: 'Discount Name' },
    { value: 'tax', label: 'Tax' },
    { value: 'grand-total', label: 'Grand Total' },
    { value: 'amount-in-words', label: 'Amount in Words' },
    { value: 'amount-paid', label: 'Amount Paid' },
    { value: 'amount-due', label: 'Amount Due' },
    { value: 'notes', label: 'Notes' },
    { value: 'custom', label: 'Custom Field' },
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
    'notes': 'Thank you for your business!',
    'custom': 'Custom Value',
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
    const params = useParams();
    const router = useRouter();
    const templateId = params.id as string;

    const { templates, updateField, deleteField, addField, updateTemplate } = useTemplateStore();
    const { getNextDocumentNumber, numbering, company } = useSettingsStore();
    const template = templates.find(t => t.id === templateId);

    // Connected Template State
    const [activeVariant, setActiveVariant] = useState<DocumentType>(
        (template?.type as DocumentType) || 'invoice'
    );
    const [isVariantUploadModalOpen, setIsVariantUploadModalOpen] = useState(false);
    const [variantUploadType, setVariantUploadType] = useState<DocumentType>('receipt');
    const [variantUploadFile, setVariantUploadFile] = useState<File | null>(null);
    const [variantUploadPreview, setVariantUploadPreview] = useState<string | null>(null);

    // Initialize active variant from template type on load
    useEffect(() => {
        if (template) {
            setActiveVariant(template.type);
        }
    }, [template?.id]); // Only when ID changes (new template loaded)

    // Dynamic Preview Data
    const [previewData, setPreviewData] = useState(initialSampleData);

    // Update preview data when template loads or settings change
    useEffect(() => {
        if (!template) return;

        // Determine document type for numbering mapping
        // We carefully map the template type to the settings key
        let docType: 'invoice' | 'receipt' | 'delivery-note';

        // Use activeVariant instead of template.type for preview data
        switch (activeVariant) {
            case 'receipt':
                docType = 'receipt';
                break;
            case 'delivery-note':
                docType = 'delivery-note';
                break;
            case 'invoice':
            default:
                docType = 'invoice';
                break;
        }

        // Get the next number based on settings
        const nextNum = getNextDocumentNumber(docType);

        setPreviewData(prev => {
            // Only update if the value is different to avoid unnecessary re-renders
            if (prev['document-number'] === nextNum) return prev;
            return {
                ...prev,
                'document-number': nextNum
            };
        });
    }, [template, getNextDocumentNumber, numbering, activeVariant]);

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
            // EXCEPT if we are about to overwrite `template.fields` with the new variant's fields.
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
            // Solution: When `activeVariant` is NOT `template.type`, the Root Fields must be stored somewhere.
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
            imageUrl: getCurrentImageUrl(template, currentVariant),
            orientation: getCurrentOrientation(template, currentVariant),
            width: getCurrentWidth(template, currentVariant),
            height: getCurrentHeight(template, currentVariant),
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
        }
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

            setActiveVariant(variantUploadType);
            setIsVariantUploadModalOpen(false);
            setVariantUploadFile(null);
            setVariantUploadPreview(null);
        };
        img.src = variantUploadPreview;
    };

    // Tabs UI Component
    const ConnectedTabs = () => {
        // We now allow ANY template to see these tabs to enable "upgrading" to connected mode
        // if (template?.mode !== 'connected') return null;

        if (!template) return null;

        const tabs: DocumentType[] = ['invoice', 'receipt', 'delivery-note'];

        return (
            <div className="flex items-center gap-2 border-r border-neutral-200 dark:border-neutral-700 pr-4 mr-4">
                {tabs.map(type => {
                    // Check if this variant exists (either as root type or in variants)
                    // The "Root" type always exists. Others check variants.
                    const exists = type === template.type || template.variants?.[type];
                    const isActive = activeVariant === type;

                    if (!exists) return null;

                    return (
                        <button
                            key={type}
                            onClick={() => handleSwitchVariant(type)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isActive
                                ? 'bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 shadow-sm'
                                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                                }`}
                        >
                            {type === 'delivery-note' ? 'Delivery Note' : type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                    );
                })}
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
    const [showPreview, setShowPreview] = useState(false);
    const [showFieldPanel, setShowFieldPanel] = useState(true);
    const [activeSection, setActiveSection] = useState<string | null>('general');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showSavedToast, setShowSavedToast] = useState(false);

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
            fontSize: 14,
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

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input or textarea
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return;
            }

            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedFieldId && !isNewFieldModalOpen) {
                    handleDeleteField();
                }
            }
            if (e.key === 'Escape') {
                setSelectedFieldId(null);
                setActiveTool('select');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedFieldId, isNewFieldModalOpen]);

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
            {/* Header */}
            <header className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/templates"
                        className="p-2 rounded-lg text-neutral-500 hover:text-[#2d3748] dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-lg font-bold text-[#2d3748] dark:text-white">{template.name}</h1>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            {template.fields.length} field{template.fields.length !== 1 ? 's' : ''} mapped
                            <span className="text-emerald-500 dark:text-emerald-400 ml-2">• Auto-saving enabled</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Connected Template Tabs */}
                    <ConnectedTabs />

                    {/* Zoom Controls */}
                    <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-900 rounded-lg p-1">
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

                    <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-700" />

                    <div className="flex items-center gap-1">
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

                    <Button
                        variant={showPreview ? 'primary' : 'outline'}
                        size="sm"
                        leftIcon={<Eye className="w-4 h-4" />}
                        onClick={() => setShowPreview(!showPreview)}
                    >
                        Preview
                    </Button>

                    <Button
                        size="sm"
                        leftIcon={<Save className="w-4 h-4" />}
                        onClick={() => {
                            setHasUnsavedChanges(false);
                            setShowSavedToast(true);
                            setTimeout(() => setShowSavedToast(false), 2000);
                        }}
                    >
                        Save
                    </Button>
                </div>
            </header >

            {/* Saved Toast */}
            {
                showSavedToast && (
                    <div className="fixed top-20 right-6 z-50 bg-emerald-500 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-in slide-in-from-top-2 fade-in duration-200">
                        <Check className="w-4 h-4" />
                        <span className="text-sm font-medium">Saved to local storage!</span>
                    </div>
                )
            }

            <div className="flex-1 flex overflow-hidden">
                {/* Toolbar */}
                <div className="w-14 bg-white dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700 flex flex-col items-center py-4 gap-2">
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
                    <div
                        ref={containerRef}
                        className="absolute inset-0 overflow-auto p-20 flex items-start justify-center canvas-grid-bg"
                    >
                        <div
                            ref={canvasRef}
                            className={`relative bg-white dark:bg-neutral-900 shadow-2xl rounded-lg overflow-hidden shrink-0 ${activeTool === 'draw' ? 'cursor-crosshair' : ''}`}
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
                                                        className={`absolute bottom-full left-0 w-full flex bg-neutral-300 dark:bg-neutral-600 text-neutral-900 dark:text-gray-100 border-b border-neutral-300 dark:border-neutral-700 font-semibold items-center ${field.showTableHeaders === false ? 'opacity-50' : ''}`}
                                                        style={{ fontSize: '0.8em', height: '1.5em' }}
                                                    >
                                                        {field.columns.map((col, index) => (
                                                            <div
                                                                key={col.id}
                                                                style={{ width: `${col.width}%` }}
                                                                className="px-1 border-r border-neutral-300 dark:border-neutral-700 last:border-0 truncate h-full flex items-center relative group/col"
                                                            >
                                                                {col.header}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Body - Fills the Box */}
                                                <div className="w-full h-full relative border-x border-b border-blue-300 dark:border-blue-700 bg-white/50 dark:bg-neutral-900/50 overflow-hidden">

                                                    {/* Row Grid (Horizontal Lines) */}
                                                    <div className="absolute inset-0 flex flex-col">
                                                        {field.type === 'line-items' && Array.from({ length: Math.min(50, field.maxRows || 1) }).map((_, i, arr) => (
                                                            <div
                                                                key={`row-${i}`}
                                                                className={`${i !== arr.length - 1 ? 'border-b border-blue-200 dark:border-blue-800' : ''} w-full flex-1`}
                                                            />
                                                        ))}
                                                    </div>

                                                    {/* Vertical Grid Lines (Flexbox for Alignment with Header) */}
                                                    <div className="absolute inset-0 flex pointer-events-none">
                                                        {field.columns.map((col, index) => (
                                                            <div
                                                                key={`vline-${col.id}`}
                                                                style={{ width: `${col.width}%` }}
                                                                className={`h-full border-r border-blue-200 dark:border-blue-800 ${index === field.columns!.length - 1 ? 'border-r-0' : ''}`}
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
                </div>

                {/* Field Properties Panel */}
                {showFieldPanel && (
                    <div className="w-72 bg-white dark:bg-neutral-800 border-l border-neutral-200 dark:border-neutral-700 flex flex-col">
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
                                            onChange={(v) => handleFieldUpdate('type', v as FieldType)}
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
                                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Page Orientation</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    onClick={() => updateTemplate(template.id, { orientation: 'portrait' })}
                                                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${template.orientation === 'portrait'
                                                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                                                        : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                                                        }`}
                                                >
                                                    <span className="w-3 h-4 border-2 border-current rounded-sm"></span>
                                                    Portrait
                                                </button>
                                                <button
                                                    onClick={() => updateTemplate(template.id, { orientation: 'landscape' })}
                                                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${template.orientation === 'landscape'
                                                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                                                        : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                                                        }`}
                                                >
                                                    <span className="w-4 h-3 border-2 border-current rounded-sm"></span>
                                                    Landscape
                                                </button>
                                            </div>
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
                                                            const reader = new FileReader();
                                                            reader.onload = (ev) => {
                                                                const result = ev.target?.result as string;
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
                                                            };
                                                            reader.readAsDataURL(file);
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
                        onChange={(v) => setNewFieldType(v as FieldType)}
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
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                    setVariantUploadPreview(ev.target?.result as string);
                                };
                                reader.readAsDataURL(file);
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
