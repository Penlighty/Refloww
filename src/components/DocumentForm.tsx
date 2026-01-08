"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTemplateStore, useCustomerStore, useProductStore, useDocumentStore, useSettingsStore, useDiscountStore } from '@/lib/store';
import { formatCurrency, formatDate, downloadPdf, downloadPng, printDocument, formatAmountInWords } from '@/lib/utils';
import { Button, Modal, ModalFooter, Input, Select, Textarea } from '@/components/ui';
import { LineItem, DocumentType } from '@/lib/types';
import DocumentRenderer, { DocumentData } from '@/components/DocumentRenderer';
import DocumentPreviewWrapper from '@/components/DocumentPreviewWrapper';
import {
    ArrowLeft,
    FileText,
    Save,
    Eye,
    Download,
    Plus,
    Trash2,
    Printer,
    Check,
    Hash,
    Percent,
    Tag,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface DocumentFormProps {
    type: DocumentType;
    title: string;
    backUrl: string;
    documentId?: string; // If present, we are in edit mode
}

export default function DocumentForm({ type, title, backUrl, documentId }: DocumentFormProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Stores
    const { templates, getTemplateById } = useTemplateStore();
    const { customers } = useCustomerStore();
    const { products } = useProductStore();
    const { discounts } = useDiscountStore();
    const { company, getNextDocumentNumber, incrementDocumentNumber, updateNumbering } = useSettingsStore();
    const currency = company.currency;
    const { addDocument, updateDocument, getDocumentById, getDocumentsByType } = useDocumentStore();

    // State
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [documentDate, setDocumentDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState('');
    const [documentNumber, setDocumentNumber] = useState('');
    const [notes, setNotes] = useState('');
    const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
    const [sourceDocumentId, setSourceDocumentId] = useState<string | undefined>(undefined);

    // Form control state
    const [isInitialized, setIsInitialized] = useState(false);

    // Line Items
    const [lineItems, setLineItems] = useState<LineItem[]>([
        { id: uuidv4(), productId: '', productName: '', description: '', quantity: 1, unitPrice: 0, subtotal: 0 }
    ]);

    // Tax & Discount
    const [discountPercent, setDiscountPercent] = useState(0);
    const [taxPercent, setTaxPercent] = useState(0);
    const [discountName, setDiscountName] = useState('');
    const [manualSubtotal, setManualSubtotal] = useState(0);
    const [amountInWords, setAmountInWords] = useState('');
    const [amountPaid, setAmountPaid] = useState(0);

    // UI State
    const [showPreview, setShowPreview] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // --- INITIALIZATION ---
    useEffect(() => {
        if (isInitialized) return;

        if (documentId) {
            // EDIT MODE
            const doc = getDocumentById(documentId);
            if (doc) {
                setSelectedTemplateId(doc.templateId);
                setSelectedCustomerId(doc.customerId);
                setDocumentNumber(doc.documentNumber);
                setDocumentDate(doc.date.split('T')[0]); // Ensure YYYY-MM-DD
                if (doc.dueDate) setDueDate(doc.dueDate.split('T')[0]);
                setLineItems(doc.lineItems.length > 0 ? doc.lineItems : [{ id: uuidv4(), productId: '', productName: '', description: '', quantity: 1, unitPrice: 0, subtotal: 0 }]);
                setDiscountPercent(doc.discountPercent);
                setTaxPercent(doc.taxPercent);
                if (doc.discountName) setDiscountName(doc.discountName);
                if (doc.notes) setNotes(doc.notes);
                if (doc.customValues) setCustomFieldValues(doc.customValues);
                if (doc.amountPaid) setAmountPaid(doc.amountPaid);

                // If template is loaded (synchronously derived below, but we need to check here or in a separate effect)
                // Since selectedTemplate is derived from selectedTemplateId, and we just set it... 
                // We might need to rely on the derived subtotal logic to pick up the doc.subtotal if manual.
                // But doc.subtotal is just a number. 
                // We'll set manualSubtotal to doc.subtotal so it's ready.
                // But doc.subtotal is just a number. 
                // We'll set manualSubtotal to doc.subtotal so it's ready.
                setManualSubtotal(doc.subtotal);

                // Set amount in words if present in doc (we assume we might save it later, currently doc type doesn't have it but we can use customValues or just recalculate)
                // Actually, let's just recalculate it to be safe, or check if we store it.
                // The Document interface doesn't strictly have 'amountInWords', so it might be in customValues if we save it there.
                // For now, let's recalculate it on load to ensure consistency.
            } else {
                console.error("Document not found");
                router.push(backUrl);
            }
        } else {
            // CHECK FOR SOURCE DOCUMENT (Conversion Flow)
            const sourceIdParam = searchParams.get('sourceId');
            if (sourceIdParam) {
                const sourceDoc = getDocumentById(sourceIdParam);
                if (sourceDoc) {
                    setSourceDocumentId(sourceDoc.id);
                    setSelectedTemplateId(sourceDoc.templateId); // Keep same template suite
                    setSelectedCustomerId(sourceDoc.customerId);

                    // Clone line items to new IDs
                    const clonedItems = sourceDoc.lineItems.map(item => ({
                        ...item,
                        id: uuidv4()
                    }));
                    setLineItems(clonedItems);

                    // Financials
                    setDiscountPercent(sourceDoc.discountPercent);
                    setTaxPercent(sourceDoc.taxPercent);
                    if (sourceDoc.discountName) setDiscountName(sourceDoc.discountName);

                    // Smart Defaults based on Type
                    if (type === 'receipt') {
                        // Inherit full payment by default, or remaining due?
                        // User said "confirm payment", implying paying off the invoice.
                        // Default to the source's Current Amount Due (or Grand Total if fully unpaid)
                        const due = sourceDoc.amountDue ?? (sourceDoc.grandTotal - (sourceDoc.amountPaid || 0));
                        setAmountPaid(due > 0 ? due : sourceDoc.grandTotal);

                        // Notes: Add reference
                        setNotes(`Payment for ${sourceDoc.documentNumber}`);
                    } else if (type === 'delivery-note') {
                        // Notes: Add reference
                        setNotes(`Delivery for ${sourceDoc.documentNumber}`);
                    }

                    // Copy custom values
                    if (sourceDoc.customValues) setCustomFieldValues(sourceDoc.customValues);
                }
            }

            // CREATE MODE - Generate new number
            let numberingType: 'invoice' | 'receipt' | 'delivery-note';
            switch (type) {
                case 'invoice': numberingType = 'invoice'; break;
                case 'receipt': numberingType = 'receipt'; break;
                case 'delivery-note': numberingType = 'delivery-note'; break;
                // Fallback for safety
                default: numberingType = 'invoice';
            }

            // Smart Numbering: Check for collisions with existing documents
            const existingDocs = getDocumentsByType(type);
            let nextNum = getNextDocumentNumber(numberingType);

            // If the generated number already exists, keep incrementing the settings
            // This "fast-forwards" the settings until we find a free gap.
            // We use a safety limit to prevent infinite loops.
            let safetyCounter = 0;
            while (existingDocs.some(d => d.documentNumber === nextNum) && safetyCounter < 100) {
                incrementDocumentNumber(numberingType);
                nextNum = getNextDocumentNumber(numberingType);
                safetyCounter++;
            }

            setDocumentNumber(nextNum);
            setTaxPercent(company.taxRate || 0);

            // Auto-set Due Date based on default days
            const days = company.defaultDueDateDays ?? 30;
            // Use UTC logic to match the date string format (YYYY-MM-DD treated as UTC)
            const todayStr = new Date().toISOString().split('T')[0];
            const d = new Date(todayStr);
            d.setUTCDate(d.getUTCDate() + days);
            setDueDate(d.toISOString().split('T')[0]);
        }

        setIsInitialized(true);
    }, [documentId, getDocumentById, type, backUrl, router, isInitialized, company.taxRate, company.defaultDueDateDays, getNextDocumentNumber, incrementDocumentNumber, getDocumentsByType]);

    // Auto-update Due Date when Document Date changes (if initialized)
    useEffect(() => {
        if (!isInitialized || !documentDate) return;

        // Only auto-update if we are in CREATE mode or if the user is actively editing dates
        // We assume if the user changes the document date, they want the terms to apply.
        // We use the store setting.
        const days = company.defaultDueDateDays ?? 30;
        // Parse date as UTC (default for YYYY-MM-DD strings)
        const d = new Date(documentDate);
        if (!isNaN(d.getTime())) {
            d.setUTCDate(d.getUTCDate() + days);
            setDueDate(d.toISOString().split('T')[0]);
        }
    }, [documentDate, company.defaultDueDateDays, isInitialized]);

    // Get selected entities
    // Get selected entities with Connected Template Logic
    const rawTemplate = selectedTemplateId ? getTemplateById(selectedTemplateId) : null;

    // If connected template and type differs, swap to variant
    const selectedTemplate = (rawTemplate && type !== rawTemplate.type && rawTemplate.mode === 'connected' && rawTemplate.variants?.[type])
        ? {
            ...rawTemplate,
            imageUrl: rawTemplate.variants[type]!.imageUrl,
            fields: rawTemplate.variants[type]!.fields,
            width: rawTemplate.variants[type]!.width,
            height: rawTemplate.variants[type]!.height,
            orientation: rawTemplate.variants[type]!.orientation
        }
        : rawTemplate;
    const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

    // Feature Flags based on Template
    const hasLineItems = selectedTemplate ? selectedTemplate.fields.some(f => f.type === 'line-items') : true; // Default true to show controls until template selected? Or false? 
    // Actually, if selectedTemplate is null, we show nothing or default. Let's default to true so it behaves normally during loading or initial creation if logic falls through.
    // But logically, if no template selected, we shouldn't assume.
    // The previous code had `const lineItemsField = selectedTemplate?.fields.find...`

    // Notes:
    const hasNotes = selectedTemplate ? selectedTemplate.fields.some(f => f.type === 'notes') : true;
    const hasDiscount = selectedTemplate ? selectedTemplate.fields.some(f => f.type === 'discount') : true;
    const hasTax = selectedTemplate ? selectedTemplate.fields.some(f => f.type === 'tax') : true;
    const hasDueDate = selectedTemplate ? selectedTemplate.fields.some(f => f.type === 'due-date') : true;
    const hasAmountInWords = selectedTemplate ? selectedTemplate.fields.some(f => f.type === 'amount-in-words') : false;
    const hasAmountPaid = selectedTemplate ? selectedTemplate.fields.some(f => f.type === 'amount-paid') : false;
    const hasAmountDue = selectedTemplate ? selectedTemplate.fields.some(f => f.type === 'amount-due') : false;


    // Calculate totals
    const subtotal = hasLineItems
        ? lineItems.reduce((sum, item) => sum + item.subtotal, 0)
        : manualSubtotal;

    const discountAmount = hasDiscount ? subtotal * (discountPercent / 100) : 0;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = hasTax ? taxableAmount * (taxPercent / 100) : 0;
    const grandTotal = taxableAmount + taxAmount;
    const amountDue = grandTotal - amountPaid;

    // Auto-update Amount in Words
    useEffect(() => {
        setAmountInWords(formatAmountInWords(grandTotal, currency));
    }, [grandTotal, currency]);

    // Intelligent Sync: Auto-fill custom fields based on label matching (Forward Sync)
    useEffect(() => {
        if (!selectedTemplate) return;

        setCustomFieldValues(prev => {
            const next = { ...prev };
            let changed = false;

            selectedTemplate.fields.forEach(field => {
                if (field.type === 'text' || field.type === 'custom') {
                    const label = field.label.toLowerCase();

                    // Amount Due (Always calculated)
                    if (label.includes('due') || label.includes('balance')) {
                        const formatted = formatCurrency(amountDue, currency);
                        if (next[field.id] !== formatted) {
                            next[field.id] = formatted;
                            changed = true;
                        }
                    }
                    // Amount Paid (Sync if system field exists, otherwise it's manual input)
                    else if (hasAmountPaid && (label.includes('paid') || label === 'deposit')) {
                        const formatted = formatCurrency(amountPaid, currency);
                        if (next[field.id] !== formatted) {
                            next[field.id] = formatted;
                            changed = true;
                        }
                    }
                    // Grand Total (Sync if calculated via line items)
                    else if (hasLineItems && (label === 'total' || label === 'grand total' || label === 'amount' || label === 'total amount')) {
                        const formatted = formatCurrency(grandTotal, currency);
                        if (next[field.id] !== formatted) {
                            next[field.id] = formatted;
                            changed = true;
                        }
                    }
                }
            });

            return changed ? next : prev;
        });
    }, [grandTotal, amountPaid, amountDue, selectedTemplate, currency, hasLineItems, hasAmountPaid]);

    // Template options
    // Template options logic:
    // 1. Direct match (t.type === type)
    // 2. Connected template with a valid variant for this type
    const templateOptions = templates
        .filter(t => t.type === type || (t.mode === 'connected' && t.variants?.[type]))
        .map(t => ({ value: t.id, label: t.name }));

    // Get Line Items Configuration
    const lineItemsField = selectedTemplate?.fields.find(f => f.type === 'line-items');
    // Default columns if not defined in template
    const tableColumns = lineItemsField?.columns || [
        { id: 'sn', header: 'S/N', width: 8, type: 'text', key: 'sn' } as const,
        { id: 'item', header: 'Item', width: 42, type: 'text', key: 'product' } as const,
        { id: 'qty', header: 'Qty', width: 15, type: 'number', key: 'quantity' } as const,
        { id: 'price', header: 'Unit Price', width: 15, type: 'currency', key: 'unitPrice' } as const,
        { id: 'total', header: 'Sub Total', width: 20, type: 'currency', key: 'subtotal' } as const
    ];

    // Customer options
    const customerOptions = customers.map(c => ({ value: c.id, label: c.name }));

    // --- LINE ITEM HANDLERS ---
    const addLineItem = () => {
        // Enforce max rows
        if (lineItemsField?.maxRows && lineItems.length >= lineItemsField.maxRows) {
            return;
        }

        setLineItems([
            ...lineItems,
            { id: uuidv4(), productId: '', productName: '', description: '', quantity: 1, unitPrice: 0, subtotal: 0 }
        ]);
    };

    const removeLineItem = (id: string) => {
        if (lineItems.length > 1) {
            setLineItems(lineItems.filter(item => item.id !== id));
        }
    };

    const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
        setLineItems(lineItems.map(item => {
            if (item.id !== id) return item;

            const updated = { ...item, [field]: value };

            // If product changed, update price and name
            if (field === 'productId') {
                const product = products.find(p => p.id === value);
                if (product) {
                    updated.productName = product.name;
                    updated.description = product.description;
                    updated.unitPrice = product.unitPrice;
                }
            }

            // Recalculate subtotal
            updated.subtotal = updated.quantity * updated.unitPrice;

            return updated;
        }));
    };

    // --- FORM SUBMISSION ---
    const handleSubmit = async () => {
        if (!selectedTemplateId || !selectedCustomerId) return;

        setIsSubmitting(true);

        const docData = {
            templateId: selectedTemplateId,
            documentNumber,
            customerId: selectedCustomerId,
            customerName: selectedCustomer?.name || '',
            date: documentDate,
            dueDate: dueDate || undefined,
            lineItems,
            subtotal,
            discountPercent,
            discountAmount,
            discountName,
            taxPercent,
            taxAmount,
            grandTotal,
            amountPaid,
            amountDue,
            notes: notes || undefined,
            sourceDocumentId: sourceDocumentId, // Link to source
            customValues: {
                ...customFieldValues,
                // We can save amountInWords in customValues if we want to persist it explicitly, 
                // or just rely on the template mapping.
                // If the template has a field with type 'amount-in-words', the renderer will look for `data.amountInWords`.
                // The renderer gets `data` from `DocumentData`.
                // But where is it saved in the database? The `Document` type doesn't have it.
                // We should save it in customValues to be safe if we want to persist manual edits to it.
                ...(hasAmountInWords ? { 'amountInWords': amountInWords } : {})
            },
        };

        try {
            if (documentId) {
                // Update
                updateDocument(documentId, docData);
            } else {
                // Create
                addDocument({
                    type,
                    ...docData,
                    status: 'draft',
                });

                // Increment sequence number in settings
                let numberingType: 'invoice' | 'receipt' | 'delivery-note';
                switch (type) {
                    case 'invoice': numberingType = 'invoice'; break;
                    case 'receipt': numberingType = 'receipt'; break;
                    case 'delivery-note': numberingType = 'delivery-note'; break;
                    default: numberingType = 'invoice';
                }
                incrementDocumentNumber(numberingType);
            }

            setShowSuccess(true);
            setTimeout(() => {
                router.push(backUrl);
            }, 1000);
        } catch (error) {
            console.error('Error saving document:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Prepare preview data
    const previewData: DocumentData = {
        documentNumber,
        date: documentDate,
        dueDate,
        customerName: selectedCustomer?.name || '',
        customerEmail: selectedCustomer?.email,
        customerPhone: selectedCustomer?.phone,
        customerAddress: selectedCustomer?.address,
        lineItems,
        subtotal,
        discountAmount,
        discountName,
        taxAmount,
        grandTotal,
        amountPaid,
        amountDue,
        amountInWords,
        notes,
        customValues: customFieldValues
    };

    return (
        <div className="max-w-6xl mx-auto pb-12">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Link
                        href={backUrl}
                        className="p-2 rounded-lg text-neutral-500 hover:text-[#2d3748] dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-[#2d3748] dark:text-white">{title}</h1>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{documentId ? 'Update details' : 'Fill in the details to generate your document'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        leftIcon={<Eye className="w-4 h-4" />}
                        onClick={() => setShowPreview(true)}
                        disabled={!selectedTemplateId}
                    >
                        Preview
                    </Button>
                    <Button
                        leftIcon={<Save className="w-4 h-4" />}
                        onClick={handleSubmit}
                        disabled={!selectedTemplateId || !selectedCustomerId || isSubmitting}
                        isLoading={isSubmitting}
                    >
                        {documentId ? 'Update Document' : 'Create Document'}
                    </Button>
                </div>
            </div>

            {/* No Templates Warning */}
            {templateOptions.length === 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 mb-6">
                    <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-1">No Templates Found</h3>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">You need to upload and configure a {type.replace('-', ' ')} template first.</p>
                    <Link href="/templates">
                        <Button size="sm" variant="outline">Go to Templates</Button>
                    </Link>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Form */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Template & Basic Info */}
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-6">
                        <h2 className="text-sm font-semibold text-[#2d3748] dark:text-white mb-4">Document Details</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Select
                                label="Template"
                                options={templateOptions}
                                value={selectedTemplateId}
                                onChange={setSelectedTemplateId}
                                placeholder="Select a template..."
                            />

                            <Input
                                label="Document Number"
                                value={documentNumber}
                                onChange={(e) => setDocumentNumber(e.target.value)}
                                leftIcon={<Hash className="w-4 h-4" />}
                            />

                            <Input
                                label="Date"
                                type="date"
                                value={documentDate}
                                onChange={(e) => setDocumentDate(e.target.value)}
                            />

                            {(type === 'invoice' || type === 'delivery-note') && hasDueDate && (
                                <Input
                                    label="Due Date"
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                />
                            )}
                        </div>

                        {/* Custom Fields Inputs */}
                        {selectedTemplate && selectedTemplate.fields.filter(f => f.type === 'custom' || f.type === 'text').length > 0 && (
                            <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-700 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <h3 className="col-span-1 md:col-span-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Mapped Custom Fields</h3>
                                {selectedTemplate.fields.filter(f => f.type === 'custom' || f.type === 'text').map(field => (
                                    <Input
                                        key={field.id}
                                        label={field.label}
                                        value={customFieldValues[field.id] || ''}
                                        placeholder={field.label}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setCustomFieldValues({ ...customFieldValues, [field.id]: val });

                                            // Intelligent Sync: If this field is "Amount" or "Total", sync to manualSubtotal
                                            const label = field.label.toLowerCase();
                                            if (!hasLineItems) {
                                                if (['amount', 'total', 'grand total', 'price', 'sum'].includes(label)) {
                                                    // Strip non-numeric except dot
                                                    const num = parseFloat(val.replace(/[^0-9.]/g, ''));
                                                    if (!isNaN(num)) {
                                                        setManualSubtotal(num);
                                                    }
                                                }
                                            }

                                            // Sync Amount Paid (Reverse)
                                            if (label.includes('paid') || label === 'deposit') {
                                                const num = parseFloat(val.replace(/[^0-9.]/g, ''));
                                                if (!isNaN(num)) setAmountPaid(num);
                                            }
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Customer Selection */}
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-6">
                        <h2 className="text-sm font-semibold text-[#2d3748] dark:text-white mb-4">Customer</h2>

                        <Select
                            label="Select Customer"
                            options={customerOptions}
                            value={selectedCustomerId}
                            onChange={setSelectedCustomerId}
                            placeholder="Choose a customer..."
                        />

                        {selectedCustomer && (
                            <div className="mt-4 p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                                        {selectedCustomer.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-[#2d3748] dark:text-white">{selectedCustomer.name}</p>
                                        <p className="text-sm text-neutral-500 dark:text-neutral-400">{selectedCustomer.email}</p>
                                        {selectedCustomer.phone && (
                                            <p className="text-sm text-neutral-500 dark:text-neutral-400">{selectedCustomer.phone}</p>
                                        )}
                                        {selectedCustomer.address && (
                                            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{selectedCustomer.address}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Line Items Table */}
                    {hasLineItems && (
                        <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-700 flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-[#2d3748] dark:text-white">Line Items</h2>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    leftIcon={<Plus className="w-4 h-4" />}
                                    onClick={addLineItem}
                                    disabled={lineItemsField?.maxRows ? lineItems.length >= lineItemsField.maxRows : false}
                                >
                                    Add Item
                                </Button>
                            </div>

                            {/* Table Header - Desktop Only */}
                            <div className="hidden md:flex px-6 py-3 bg-secondary text-neutral-900 text-xs font-semibold uppercase tracking-wider relative">
                                <div className="flex-1 flex">
                                    {tableColumns.map((col: any) => (
                                        <div key={col.id} style={{ width: `${col.width}%`, flexShrink: 0 }} className={`px-2 ${col.type === 'number' || col.type === 'currency' ? 'text-right' : 'text-left'}`}>
                                            {col.header}
                                        </div>
                                    ))}
                                </div>
                                {/* Spacer for delete button alignment */}
                                <div className="w-8 ml-2"></div>
                            </div>

                            {/* Table Body - Desktop Only */}
                            <div className="hidden md:block divide-y divide-neutral-100 dark:divide-neutral-700">
                                {lineItems.map((item, index) => (
                                    <div key={item.id} className="flex px-6 py-3 items-start group hover:bg-neutral-50 dark:hover:bg-neutral-700/50 relative">
                                        <div className="flex-1 flex">
                                            {tableColumns.map((col: any) => {
                                                // 1. S/N
                                                if (col.key === 'sn') {
                                                    return (
                                                        <div key={col.id} style={{ width: `${col.width}%`, flexShrink: 0 }} className="pt-2.5 px-2 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                                                            {index + 1}
                                                        </div>
                                                    );
                                                }
                                                // 2. Product Selection
                                                if (col.key === 'product' || col.key === 'productName' || col.key === 'description') {
                                                    return (
                                                        <div key={col.id} style={{ width: `${col.width}%`, flexShrink: 0 }} className="px-1">
                                                            <select
                                                                value={item.productId}
                                                                onChange={(e) => updateLineItem(item.id, 'productId', e.target.value)}
                                                                className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                                                            >
                                                                <option value="">Select item...</option>
                                                                {products.map(p => (
                                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    );
                                                }
                                                // 3. Quantity
                                                if (col.key === 'quantity') {
                                                    return (
                                                        <div key={col.id} style={{ width: `${col.width}%`, flexShrink: 0 }} className="px-1">
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                value={item.quantity}
                                                                onChange={(e) => updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                                                                className="w-full px-3 py-2 text-sm text-center border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                                                            />
                                                        </div>
                                                    );
                                                }
                                                // 4. Unit Price
                                                if (col.key === 'unitPrice') {
                                                    return (
                                                        <div key={col.id} style={{ width: `${col.width}%`, flexShrink: 0 }} className="px-1">
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                value={item.unitPrice || ''}
                                                                onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                                className="w-full px-3 py-2 text-sm text-right border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                                                            />
                                                        </div>
                                                    );
                                                }
                                                // 5. Subtotal
                                                if (col.key === 'subtotal') {
                                                    return (
                                                        <div key={col.id} style={{ width: `${col.width}%`, flexShrink: 0 }} className="px-2 pt-2.5 flex items-center justify-end">
                                                            <span className="text-sm font-medium text-[#2d3748] dark:text-white">
                                                                {formatCurrency(item.subtotal, currency)}
                                                            </span>
                                                        </div>
                                                    );
                                                }

                                                // 6. Custom Columns
                                                return (
                                                    <div key={col.id} style={{ width: `${col.width}%`, flexShrink: 0 }} className="px-1">
                                                        <input
                                                            type={col.type === 'number' || col.type === 'currency' ? 'number' : 'text'}
                                                            value={item.customValues?.[col.key] || ''}
                                                            onChange={(e) => {
                                                                const newVal = e.target.value;
                                                                setLineItems(prev => prev.map(pi => {
                                                                    if (pi.id !== item.id) return pi;
                                                                    return {
                                                                        ...pi,
                                                                        customValues: { ...(pi.customValues || {}), [col.key]: newVal }
                                                                    };
                                                                }));
                                                            }}
                                                            className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                                                            placeholder={col.header}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Delete Button */}
                                        <button
                                            onClick={() => removeLineItem(item.id)}
                                            className="w-8 ml-2 p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"
                                            title="Remove Item"
                                            disabled={lineItems.length === 1}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Mobile Card View (md:hidden) */}
                            <div className="md:hidden flex flex-col gap-4 p-4">
                                {lineItems.map((item, index) => (
                                    <div key={item.id} className="bg-neutral-50 dark:bg-neutral-700/30 border border-neutral-100 dark:border-neutral-700 rounded-xl p-4 relative">
                                        {/* Header with Delete */}
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-bold text-neutral-400 uppercase">Item #{index + 1}</span>
                                            <button
                                                onClick={() => removeLineItem(item.id)}
                                                className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                title="Remove Item"
                                                disabled={lineItems.length === 1}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="space-y-4">
                                            {tableColumns.map((col: any) => {
                                                if (col.key === 'sn') return null; // Skip S/N in body

                                                // 2. Product Selection
                                                if (col.key === 'product' || col.key === 'productName' || col.key === 'description') {
                                                    return (
                                                        <div key={col.id} className="space-y-1">
                                                            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{col.header}</label>
                                                            <select
                                                                value={item.productId}
                                                                onChange={(e) => updateLineItem(item.id, 'productId', e.target.value)}
                                                                className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                                                            >
                                                                <option value="">Select item...</option>
                                                                {products.map(p => (
                                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    );
                                                }
                                                // 3. Quantity
                                                if (col.key === 'quantity') {
                                                    return (
                                                        <div key={col.id} className="space-y-1">
                                                            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{col.header}</label>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                value={item.quantity}
                                                                onChange={(e) => updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                                                                className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                                                            />
                                                        </div>
                                                    );
                                                }
                                                // 4. Unit Price
                                                if (col.key === 'unitPrice') {
                                                    return (
                                                        <div key={col.id} className="space-y-1">
                                                            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{col.header}</label>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                value={item.unitPrice || ''}
                                                                onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                                className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                                                            />
                                                        </div>
                                                    );
                                                }
                                                // 5. Subtotal
                                                if (col.key === 'subtotal') {
                                                    return (
                                                        <div key={col.id} className="flex justify-between items-center pt-2 border-t border-neutral-100 dark:border-neutral-700 mt-2">
                                                            <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{col.header}</span>
                                                            <span className="text-base font-bold text-[#2d3748] dark:text-white">
                                                                {formatCurrency(item.subtotal, currency)}
                                                            </span>
                                                        </div>
                                                    );
                                                }

                                                // 6. Custom Columns
                                                return (
                                                    <div key={col.id} className="space-y-1">
                                                        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{col.header}</label>
                                                        <input
                                                            type={col.type === 'number' || col.type === 'currency' ? 'number' : 'text'}
                                                            value={item.customValues?.[col.key] || ''}
                                                            onChange={(e) => {
                                                                const newVal = e.target.value;
                                                                setLineItems(prev => prev.map(pi => {
                                                                    if (pi.id !== item.id) return pi;
                                                                    return {
                                                                        ...pi,
                                                                        customValues: { ...(pi.customValues || {}), [col.key]: newVal }
                                                                    };
                                                                }));
                                                            }}
                                                            className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                                                            placeholder={col.header}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Add Row Button */}
                            <button
                                onClick={addLineItem}
                                disabled={lineItemsField?.maxRows ? lineItems.length >= lineItemsField.maxRows : false}
                                className="w-full px-6 py-3 text-sm text-neutral-500 dark:text-neutral-400 hover:text-[#2d3748] dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 border-t border-neutral-100 dark:border-neutral-700"
                            >
                                <Plus className="w-4 h-4" />
                                {lineItemsField?.maxRows && lineItems.length >= lineItemsField.maxRows ? 'Max Rows Reached' : 'Add another item'}
                            </button>
                        </div>
                    )}

                    {/* Notes */}
                    {hasNotes && (
                        <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-6">
                            <h2 className="text-sm font-semibold text-[#2d3748] dark:text-white mb-4">Notes</h2>
                            <Textarea
                                placeholder="Add any notes or payment terms..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                            />
                        </div>
                    )}
                </div>

                {/* Right Column - Summary */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-6 sticky top-6">
                        <h2 className="text-sm font-semibold text-[#2d3748] dark:text-white mb-4">Summary</h2>

                        {/* Discount & Tax Inputs */}
                        <div className="space-y-3 mb-6">
                            {!hasLineItems && (
                                <Input
                                    label="Amount"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={manualSubtotal || ''}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        setManualSubtotal(val);

                                        // Reverse Sync: Update left-side custom field if it exists
                                        if (!hasLineItems) {
                                            const amountField = selectedTemplate?.fields.find(f =>
                                                (f.type === 'custom' || f.type === 'text') &&
                                                ['amount', 'total', 'grand total', 'price', 'sum'].includes(f.label.toLowerCase())
                                            );

                                            if (amountField) {
                                                // Format nicely for text input
                                                // using en-US for standard comma separation, or maybe just raw?
                                                // User screenshot showed commas "30,000.00"
                                                const formatted = val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                                setCustomFieldValues(prev => ({
                                                    ...prev,
                                                    [amountField.id]: formatted
                                                }));
                                            }
                                        }
                                    }}
                                // leftIcon={<span className="text-neutral-500 font-sans">{currency}</span>} // Currency icon usually complex, using text prefix if supported or just standard input
                                />
                            )}

                            {hasDiscount && (
                                <div className="space-y-2">
                                    {discounts.some(d => d.isActive) && (
                                        <Select
                                            options={[
                                                { label: 'Select Promo...', value: '' },
                                                ...discounts
                                                    .filter(d => d.isActive)
                                                    .map(d => ({ label: `${d.name} (${d.percentage}%)`, value: d.percentage.toString() }))
                                            ]}
                                            value={discounts.find(d => d.isActive && d.percentage === discountPercent)?.percentage.toString() || ''}
                                            onChange={(v) => {
                                                if (!v) return;
                                                const d = discounts.find(d => d.percentage.toString() === v && d.isActive);
                                                if (d) {
                                                    setDiscountPercent(d.percentage);
                                                    setDiscountName(d.name);
                                                }
                                            }}
                                            className="text-xs"
                                        />
                                    )}
                                    <Input
                                        label="Discount %"
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        value={discountPercent || ''}
                                        onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                                        leftIcon={<Percent className="w-4 h-4" />}
                                    />
                                    {discountPercent > 0 && (
                                        <Input
                                            label="Discount Name"
                                            value={discountName}
                                            onChange={(e) => setDiscountName(e.target.value)}
                                            placeholder="e.g. Winter Sale"
                                            leftIcon={<Tag className="w-4 h-4" />}
                                        />
                                    )}
                                </div>
                            )}

                            {hasTax && (
                                <div className="flex items-center gap-2">
                                    <Input
                                        label="Tax %"
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={taxPercent || ''}
                                        onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                                        leftIcon={<Percent className="w-4 h-4" />}
                                    />
                                </div>
                            )}

                            {hasAmountInWords && (
                                <Input
                                    label="Amount in Words"
                                    value={amountInWords}
                                    onChange={(e) => setAmountInWords(e.target.value)}
                                    placeholder="Amount in words"
                                // Make it look slightly different or read-only if we enforced it, 
                                // but user asked for "automatically fills", implying editable.
                                />
                            )}

                            {hasAmountPaid && (
                                <Input
                                    label="Amount Paid"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={amountPaid || ''}
                                    onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                                // leftIcon={<span className="text-neutral-500 text-xs font-sans">{currency}</span>}
                                />
                            )}
                        </div>

                        {/* Totals */}
                        <div className="space-y-3 pt-4 border-t border-neutral-100 dark:border-neutral-700">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-neutral-500 dark:text-neutral-400">Subtotal</span>
                                <span className="text-sm font-medium text-[#2d3748] dark:text-white">{formatCurrency(subtotal, currency)}</span>
                            </div>
                            {discountPercent > 0 && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-neutral-500">Discount ({discountPercent}%)</span>
                                    <span className="text-sm font-medium text-red-500">-{formatCurrency(discountAmount, currency)}</span>
                                </div>
                            )}
                            {taxPercent > 0 && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-neutral-500 dark:text-neutral-400">Tax ({taxPercent}%)</span>
                                    <span className="text-sm font-medium text-[#2d3748] dark:text-white">{formatCurrency(taxAmount, currency)}</span>
                                </div>
                            )}
                            <div className="flex items-center justify-between pt-3 border-t border-neutral-200 dark:border-neutral-700">
                                <span className="text-base font-semibold text-[#2d3748] dark:text-white">Grand Total</span>
                                <span className="text-xl font-bold text-[#2d3748] dark:text-white">{formatCurrency(grandTotal, currency)}</span>
                            </div>

                            {hasAmountPaid && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-neutral-500 dark:text-neutral-400">Amount Paid</span>
                                    <span className="text-sm font-medium text-emerald-600">-{formatCurrency(amountPaid, currency)}</span>
                                </div>
                            )}

                            {(hasAmountPaid || hasAmountDue) && (
                                <div className="flex items-center justify-between pt-2 border-t border-dashed border-neutral-200 dark:border-neutral-700">
                                    <span className="text-sm font-medium text-[#2d3748] dark:text-white">Amount Due</span>
                                    <span className="text-lg font-bold text-[#2d3748] dark:text-white">{formatCurrency(amountDue, currency)}</span>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="mt-6 space-y-2">
                            <Button
                                fullWidth
                                leftIcon={<Save className="w-4 h-4" />}
                                onClick={handleSubmit}
                                disabled={!selectedTemplateId || !selectedCustomerId || isSubmitting}
                                isLoading={isSubmitting}
                            >
                                {documentId ? 'Update Document' : 'Create Document'}
                            </Button>
                            <Button
                                variant="outline"
                                fullWidth
                                leftIcon={<Eye className="w-4 h-4" />}
                                onClick={() => setShowPreview(true)}
                                disabled={!selectedTemplateId}
                            >
                                Preview Document
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Success Modal */}
            <Modal
                isOpen={showSuccess}
                onClose={() => { }}
                title=""
                size="sm"
            >
                <div className="text-center py-6">
                    <div className="w-16 h-16 mx-auto bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
                        <Check className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-[#2d3748] dark:text-white mb-2">{documentId ? 'Document Updated!' : 'Document Created!'}</h3>
                    <p className="text-neutral-600 dark:text-neutral-400">Redirecting to list...</p>
                </div>
            </Modal>

            {/* Preview Modal */}
            <Modal
                isOpen={showPreview}
                onClose={() => setShowPreview(false)}
                title="Document Preview"
                size="full"
                footer={
                    <ModalFooter>
                        <Button variant="ghost" onClick={() => setShowPreview(false)}>Close</Button>
                        <Button
                            leftIcon={<Download className="w-4 h-4" />}
                            onClick={() => downloadPdf('document-preview-modal', documentNumber)}
                        >
                            Download PDF
                        </Button>
                        <Button
                            leftIcon={<Printer className="w-4 h-4" />}
                            onClick={() => printDocument('document-preview-modal')}
                        >
                            Print
                        </Button>
                    </ModalFooter>
                }
            >
                {selectedTemplate && (
                    <DocumentPreviewWrapper
                        className="bg-neutral-100 dark:bg-neutral-900 rounded-lg min-h-[500px] w-full"
                        padding={32}
                        width={selectedTemplate.width || (selectedTemplate.orientation === 'landscape' ? 842 : 595)}
                        height={selectedTemplate.height || (selectedTemplate.orientation === 'landscape' ? 595 : 842)}
                        fit="width"
                    >
                        <DocumentRenderer
                            template={selectedTemplate}
                            data={previewData}
                            id="document-preview-modal"
                        />
                    </DocumentPreviewWrapper>
                )}
            </Modal>
        </div>
    );
}
