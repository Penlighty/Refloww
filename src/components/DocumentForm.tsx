"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTemplateStore, useCustomerStore, useProductStore, useDocumentStore, useSettingsStore, useDiscountStore, useOrganizationStore } from '@/lib/store';
import { formatCurrency, formatDate, downloadPdf, downloadPng, printDocument, formatAmountInWords } from '@/lib/utils';
import { Button, Modal, ModalFooter, Input, Select, Textarea, HelpTooltip } from '@/components/ui';
import { LineItem, DocumentType } from '@/lib/types';
import { toast } from 'react-hot-toast';
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
    Lock,
    Percent,
    Tag,
    Truck,
    Receipt,
    LayoutGrid,
    List,
    ChevronDown,
    ChevronUp,
    ScanLine,
    Barcode as BarcodeIcon
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';
import { playScanBeep } from '@/lib/utils/audio';

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
    const { templates, getFilteredTemplates, getTemplateById } = useTemplateStore();
    const { customers, getFilteredCustomers } = useCustomerStore();
    const { products, getFilteredProducts, getProductByBarcode, adjustStock } = useProductStore();
    const { discounts, getFilteredDiscounts } = useDiscountStore();
    const { company, getNextDocumentNumber, incrementDocumentNumber, updateNumbering } = useSettingsStore();
    const activeOrgId = useOrganizationStore(state => state.activeOrganizationId);
    const currency = company.currency;
    const { addDocument, updateDocument, getDocumentById, getDocumentsByType, getTotalPaidForInvoice } = useDocumentStore();

    const displayTemplates = useMemo(() => getFilteredTemplates(), [templates, activeOrgId, getFilteredTemplates]);
    const displayCustomers = useMemo(() => getFilteredCustomers(), [customers, activeOrgId, getFilteredCustomers]);
    const displayProducts = useMemo(() => getFilteredProducts(), [products, activeOrgId, getFilteredProducts]);
    const displayDiscounts = useMemo(() => getFilteredDiscounts(), [discounts, activeOrgId, getFilteredDiscounts]);

    // State
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [documentDate, setDocumentDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState('');
    const [documentNumber, setDocumentNumber] = useState('');
    const [notes, setNotes] = useState('');
    const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
    const [sourceDocumentId, setSourceDocumentId] = useState<string | undefined>(undefined);
    const [sourceGrandTotal, setSourceGrandTotal] = useState<number>(0); // Tracks source invoice's grand total for receipts
    const [previousPayments, setPreviousPayments] = useState<number>(0); // Sum of prior receipts against source invoice

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
    const [discountId, setDiscountId] = useState<string | undefined>(undefined);
    const [manualSubtotal, setManualSubtotal] = useState(0);
    const [amountInWords, setAmountInWords] = useState('');
    const [amountPaidInWords, setAmountPaidInWords] = useState('');
    const [amountPaid, setAmountPaid] = useState(0); // For receipts: this is "This Payment" amount

    // UI State
    const [showPreview, setShowPreview] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [isVisualTemplatePickerOpen, setIsVisualTemplatePickerOpen] = useState(false);
    const [tempSelectedTemplateId, setTempSelectedTemplateId] = useState<string>('');
    const [pickerViewMode, setPickerViewMode] = useState<'grid' | 'list'>('grid');
    const [expandedLineItemId, setExpandedLineItemId] = useState<string | null>(null);
    const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
    const [quickBarcodeQuery, setQuickBarcodeQuery] = useState('');
    const [restockQtyMap, setRestockQtyMap] = useState<{ [productId: string]: number }>({});

    // Helper: Determine if a physical product is out of stock
    const isProductOutOfStock = (product?: { productType?: string; inStock?: boolean; stockQuantity?: number }) => {
        if (!product) return false;
        const isPhysical = !product.productType || product.productType === 'physical';
        if (!isPhysical) return false;
        if (product.inStock === false) return true;
        if (product.stockQuantity !== undefined && product.stockQuantity <= 0) return true;
        return false;
    };

    // Helper: Handle quick restock right from the document line items form
    const handleQuickRestock = (productId: string, qtyToAdd: number) => {
        if (!qtyToAdd || qtyToAdd <= 0) {
            toast.error('Please enter a valid restock quantity (greater than 0)');
            return;
        }
        const product = displayProducts.find(p => p.id === productId);
        if (!product) return;

        const currentStock = Math.max(0, product.stockQuantity || 0);
        const newStock = currentStock + qtyToAdd;
        adjustStock(productId, undefined, newStock, 'Quick restock from invoice form', 'adjustment');
        toast.success(`Restocked ${product.name}! New stock: ${newStock} unit(s)`);
    };

    // 4. Reactive Defaults (Apply when store loads)
    const hasAppliedDefaultTax = useRef(false);
    useEffect(() => {
        // Only for NEW documents (not edit, not conversion)
        if (documentId || searchParams.get('sourceId')) return;

        if (!hasAppliedDefaultTax.current && company.taxRate > 0) {
            setTaxPercent(company.taxRate);
            hasAppliedDefaultTax.current = true;
        }
    }, [company.taxRate, documentId, searchParams]);
 
    // Auto-select default template when templates load (for new documents only)
    useEffect(() => {
        if (documentId || searchParams.get('sourceId') || selectedTemplateId) return;
 
        const defaultTemp = displayTemplates.find(t => t.isDefault && (t.type === type || (t.mode === 'connected' && t.variants?.[type])));
        if (defaultTemp) {
            setSelectedTemplateId(defaultTemp.id);
        }
    }, [displayTemplates, type, documentId, searchParams, selectedTemplateId]);

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
                setDocumentDate(doc.date.split('T')[0]);
                if (doc.dueDate) setDueDate(doc.dueDate.split('T')[0]);
                const loadedItems = doc.lineItems.length > 0 ? doc.lineItems : [{ id: uuidv4(), productId: '', productName: '', description: '', quantity: 1, unitPrice: 0, subtotal: 0 }];
                setLineItems(loadedItems);
                setExpandedLineItemId(loadedItems[0]?.id || null);
                setDiscountPercent(doc.discountPercent);
                setTaxPercent(doc.taxPercent);
                if (doc.discountName) setDiscountName(doc.discountName);
                if (doc.discountId) setDiscountId(doc.discountId);
                setNotes(doc.notes || '');
                setCustomFieldValues(doc.customValues || {});
                setAmountPaid(doc.amountPaid || 0);
                setManualSubtotal(doc.subtotal);
            } else {
                router.push(backUrl);
            }
        } else {
            // CREATE MODE (New or Conversion)
            const sourceIdParam = searchParams.get('sourceId');
            if (sourceIdParam) {
                const sourceDoc = getDocumentById(sourceIdParam);
                if (sourceDoc) {
                    setSourceDocumentId(sourceDoc.id);
                    setSelectedTemplateId(sourceDoc.templateId);
                    setSelectedCustomerId(sourceDoc.customerId);
                    const convertedItems = sourceDoc.lineItems.map(item => ({ ...item, id: uuidv4() }));
                    setLineItems(convertedItems);
                    setExpandedLineItemId(convertedItems[0]?.id || null);
                    setDiscountPercent(sourceDoc.discountPercent);
                    setTaxPercent(sourceDoc.taxPercent);
                    setDiscountName(sourceDoc.discountName || '');
                    setDiscountId(sourceDoc.discountId);

                    if (type === 'receipt') {
                        // IMPORTANT: Recalculate the proper grand total based on source template capabilities
                        // The stored grandTotal might include tax even if the template doesn't show it
                        const sourceTemplate = getTemplateById(sourceDoc.templateId);
                        const sourceSupportsTax = sourceTemplate?.fields.some(f => f.type === 'tax') ?? false;
                        const sourceSupportsDiscount = sourceTemplate?.fields.some(f => f.type === 'discount') ?? false;

                        // Calculate the ACTUAL subtotal from line items
                        const sourceSubtotal = sourceDoc.lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

                        // Apply discount only if template supports it
                        const sourceDiscountAmount = sourceSupportsDiscount && sourceDoc.discountPercent > 0
                            ? sourceSubtotal * (sourceDoc.discountPercent / 100)
                            : 0;
                        const sourceTaxableAmount = sourceSubtotal - sourceDiscountAmount;

                        // Apply tax only if template supports it
                        const sourceTaxAmount = sourceSupportsTax && sourceDoc.taxPercent > 0
                            ? sourceTaxableAmount * (sourceDoc.taxPercent / 100)
                            : 0;

                        // Correctly calculated grand total
                        const correctGrandTotal = sourceTaxableAmount + sourceTaxAmount;

                        // Store the correctly calculated source grand total
                        setSourceGrandTotal(correctGrandTotal);

                        // Get sum of all previous receipts linked to this invoice
                        const alreadyPaid = getTotalPaidForInvoice(sourceDoc.id);
                        setPreviousPayments(alreadyPaid);

                        // Outstanding balance = Invoice Total - Previous Payments
                        const outstanding = Math.max(0, correctGrandTotal - alreadyPaid);

                        // Pre-fill with remaining outstanding amount
                        // If this is the first receipt and the source invoice had an initial amount paid (e.g. deposit), inherit that amount.
                        // Otherwise, default to the full outstanding balance.
                        const initialAmountPaid = (alreadyPaid === 0 && sourceDoc.amountPaid && sourceDoc.amountPaid > 0)
                            ? sourceDoc.amountPaid
                            : outstanding;
                        setAmountPaid(initialAmountPaid);
                        setNotes(`Payment for ${sourceDoc.documentNumber}`);
                    } else if (type === 'delivery-note') {
                        setNotes(`Delivery for ${sourceDoc.documentNumber}`);
                    }
                    setCustomFieldValues(sourceDoc.customValues || {});
                }
            } else {
                // BRAND NEW (Initial apply)
                const customerIdParam = searchParams.get('customerId');
                if (customerIdParam) setSelectedCustomerId(customerIdParam);

                const newId = uuidv4();
                setLineItems([{ id: newId, productId: '', productName: '', description: '', quantity: 1, unitPrice: 0, subtotal: 0 }]);
                setExpandedLineItemId(newId);

                // Set default tax rate if we have one ready
                if (company.taxRate > 0) {
                    setTaxPercent(company.taxRate);
                    hasAppliedDefaultTax.current = true;
                }
            }

            // Handle Numbering
            let numberingType: 'invoice' | 'receipt' | 'deliveryNote';
            switch (type) {
                case 'receipt': numberingType = 'receipt'; break;
                case 'delivery-note': numberingType = 'deliveryNote'; break;
                default: numberingType = 'invoice';
            }

            const existingDocs = getDocumentsByType(type);
            let nextNum = getNextDocumentNumber(numberingType);
            let safetyCounter = 0;
            while (existingDocs.some(d => d.documentNumber === nextNum) && safetyCounter < 100) {
                incrementDocumentNumber(numberingType);
                nextNum = getNextDocumentNumber(numberingType);
                safetyCounter++;
            }
            setDocumentNumber(nextNum);

            // Default Due Date
            const days = company.defaultDueDateDays ?? 30;
            const d = new Date();
            d.setDate(d.getDate() + days);
            setDueDate(d.toISOString().split('T')[0]);
        }
        setIsInitialized(true);
    }, [documentId, getDocumentById, type, searchParams, company.taxRate, company.defaultDueDateDays, isInitialized, getNextDocumentNumber, incrementDocumentNumber, getDocumentsByType, backUrl, router]);

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
    // If connected template, always check variants first to avoid mashed root data
    const selectedTemplate = (rawTemplate && rawTemplate.mode === 'connected' && rawTemplate.variants?.[type])
        ? {
            ...rawTemplate,
            imageUrl: rawTemplate.variants[type]!.imageUrl,
            fields: rawTemplate.variants[type]!.fields,
            width: rawTemplate.variants[type]!.width,
            height: rawTemplate.variants[type]!.height,
            orientation: rawTemplate.variants[type]!.orientation
        }
        : rawTemplate;
    const selectedCustomer = displayCustomers.find(c => c.id === selectedCustomerId);

    // Feature Flags based on Template
    // Default to false when no template selected - fields only show if explicitly mapped in template
    const hasLineItems = selectedTemplate ? selectedTemplate.fields.some(f => f.type === 'line-items') : false;
    const hasNotes = selectedTemplate ? selectedTemplate.fields.some(f => f.type === 'notes') : false;
    const hasDiscount = selectedTemplate ? selectedTemplate.fields.some(f => f.type === 'discount') : false;
    const hasTax = selectedTemplate ? selectedTemplate.fields.some(f => f.type === 'tax') : false;
    const hasDueDate = selectedTemplate ? selectedTemplate.fields.some(f => f.type === 'due-date') : false;
    const hasAmountInWords = selectedTemplate ? selectedTemplate.fields.some(f => f.type === 'amount-in-words') : false;
    const hasAmountPaidInWords = selectedTemplate ? selectedTemplate.fields.some(f => f.type === 'amount-paid-in-words') : false;
    const hasAmountPaid = selectedTemplate ? selectedTemplate.fields.some(f => f.type === 'amount-paid') : false;
    const hasAmountDue = selectedTemplate ? selectedTemplate.fields.some(f => f.type === 'amount-due') : false;

    // Calculate totals
    // Subtotal is either from line items or manual entry
    const calculatedSubtotal = hasLineItems
        ? lineItems.reduce((sum, item) => sum + item.subtotal, 0)
        : manualSubtotal;

    // Only apply discount if template has discount field mapped AND discount is set
    const discountAmount = hasDiscount && discountPercent > 0 ? calculatedSubtotal * (discountPercent / 100) : 0;
    const taxableAmount = calculatedSubtotal - discountAmount;

    // Only apply tax if template has tax field mapped AND tax is set
    const taxAmount = hasTax && taxPercent > 0 ? taxableAmount * (taxPercent / 100) : 0;
    const calculatedGrandTotal = taxableAmount + taxAmount;

    // ============================================
    // FINANCIAL CALCULATIONS BY DOCUMENT TYPE
    // ============================================

    let grandTotal: number;
    let subtotal: number;
    let amountDue: number;

    if (type === 'receipt') {
        // RECEIPT CALCULATIONS
        if (sourceGrandTotal > 0) {
            // Receipt FROM SOURCE INVOICE
            // Invoice Total = pulled from source invoice
            // Previous Payments = sum of all prior receipts for this invoice
            // This Payment = amountPaid (user input)
            // Remaining Balance = Invoice Total - Previous Payments - This Payment

            grandTotal = sourceGrandTotal; // This is the Invoice Total (for display)
            subtotal = sourceGrandTotal;

            // Remaining Balance after this payment
            amountDue = Math.max(0, sourceGrandTotal - previousPayments - amountPaid);
        } else {
            // STANDALONE RECEIPT (no source invoice)
            // User enters the receipt amount directly
            // Amount Paid = user input (what was paid)
            // If they enter both amount and paid separately, Amount Due = amount - paid
            // But typically for standalone receipt: Amount = Paid = Full Amount

            grandTotal = manualSubtotal; // The total amount for this receipt
            subtotal = manualSubtotal;
            amountDue = Math.max(0, manualSubtotal - amountPaid);
        }
    } else {
        // INVOICE / DELIVERY NOTE CALCULATIONS
        // Standard calculation: Line Items → Subtotal → -Discount → +Tax → Grand Total
        // Amount Due = Grand Total - Amount Paid

        grandTotal = calculatedGrandTotal;
        subtotal = calculatedSubtotal;
        amountDue = Math.max(0, grandTotal - amountPaid);
    }

    // Auto-update Amount in Words
    useEffect(() => {
        setAmountInWords(formatAmountInWords(grandTotal, currency));
    }, [grandTotal, currency]);

    // Auto-update Amount Paid in Words
    useEffect(() => {
        setAmountPaidInWords(formatAmountInWords(amountPaid, currency));
    }, [amountPaid, currency]);

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

    const templateOptions = displayTemplates
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
    const customerOptions = displayCustomers.map(c => ({ value: c.id, label: c.name }));

    // --- POS BARCODE SCANNING HANDLER ---
    const handleBarcodeScan = (scannedCode: string) => {
        if (!scannedCode) return;
        const matchedProduct = getProductByBarcode(scannedCode);
        if (!matchedProduct) {
            toast.error(`No product found for barcode: "${scannedCode}"`);
            return;
        }

        if (isProductOutOfStock(matchedProduct)) {
            toast.error(`Cannot add "${matchedProduct.name}": Item is out of stock (0 remaining). Please restock unit before adding.`);
            return;
        }

        playScanBeep();

        setLineItems(prevItems => {
            const existingIndex = prevItems.findIndex(item => item.productId === matchedProduct.id);

            if (existingIndex >= 0) {
                const updated = [...prevItems];
                const item = updated[existingIndex];
                const newQty = item.quantity + 1;
                updated[existingIndex] = {
                    ...item,
                    quantity: newQty,
                    subtotal: newQty * item.unitPrice
                };
                toast.success(`Scanned: ${matchedProduct.name} (+1, Qty: ${newQty})`);
                return updated;
            }

            const emptyIndex = prevItems.findIndex(item => !item.productId && item.unitPrice === 0);
            const newItem: LineItem = {
                id: emptyIndex >= 0 ? prevItems[emptyIndex].id : uuidv4(),
                productId: matchedProduct.id,
                productName: matchedProduct.name,
                description: matchedProduct.description,
                quantity: 1,
                unitPrice: matchedProduct.unitPrice,
                subtotal: matchedProduct.unitPrice
            };

            toast.success(`Added: ${matchedProduct.name}`);

            if (emptyIndex >= 0) {
                const updated = [...prevItems];
                updated[emptyIndex] = newItem;
                return updated;
            } else {
                return [...prevItems, newItem];
            }
        });
    };

    // --- LINE ITEM HANDLERS ---
    const addLineItem = () => {
        // Enforce max rows
        if (lineItemsField?.maxRows && lineItems.length >= lineItemsField.maxRows) {
            return;
        }

        const newId = uuidv4();
        setLineItems([
            ...lineItems,
            { id: newId, productId: '', productName: '', description: '', quantity: 1, unitPrice: 0, subtotal: 0 }
        ]);
        setExpandedLineItemId(newId);
    };

    const removeLineItem = (id: string) => {
        if (lineItems.length > 1) {
            const updated = lineItems.filter(item => item.id !== id);
            setLineItems(updated);
            if (expandedLineItemId === id && updated.length > 0) {
                setExpandedLineItemId(updated[0].id);
            }
        }
    };

    const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
        setLineItems(lineItems.map(item => {
            if (item.id !== id) return item;

            const updated = { ...item, [field]: value };

            // If product changed, update price and name
            if (field === 'productId') {
                const product = displayProducts.find(p => p.id === value);
                if (product) {
                    updated.productName = product.name;
                    updated.description = product.description;
                    updated.unitPrice = product.unitPrice;

                    if (isProductOutOfStock(product)) {
                        toast.error(`"${product.name}" is out of stock (0 remaining). Use "Restock Unit" to add inventory.`, { id: `out-of-stock-${product.id}` });
                    }
                }
            }

            if (field === 'quantity') {
                const product = displayProducts.find(p => p.id === item.productId);
                if (product && (!product.productType || product.productType === 'physical') && product.stockQuantity !== undefined) {
                    if (value > product.stockQuantity) {
                        toast.error(`Only ${product.stockQuantity} unit(s) available in stock for ${product.name}!`, { id: `stock-limit-${product.id}` });
                    }
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

        // Guard: Check if any line item contains an unrestocked out-of-stock product
        for (const item of lineItems) {
            if (item.productId) {
                const product = displayProducts.find(p => p.id === item.productId);
                if (product && isProductOutOfStock(product)) {
                    toast.error(`Cannot save document: "${product.name}" is out of stock (0 remaining). Please click "Restock Unit" or remove the item.`);
                    setIsSubmitting(false);
                    return;
                }
                if (product && (!product.productType || product.productType === 'physical') && product.stockQuantity !== undefined && item.quantity > product.stockQuantity) {
                    toast.error(`Cannot save document: "${product.name}" quantity (${item.quantity}) exceeds available stock (${product.stockQuantity}).`);
                    setIsSubmitting(false);
                    return;
                }
            }
        }

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
            discountId,
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
                ...(hasAmountInWords ? { 'amountInWords': amountInWords } : {}),
                ...(hasAmountPaidInWords ? { 'amountPaidInWords': amountPaidInWords } : {})
            },
        };

        try {
            let targetUrl = backUrl; // Default: go back to where we came from

            if (documentId) {
                // Update existing document
                updateDocument(documentId, docData);
                toast.success(`${documentNumber || title.replace('Edit ', '')} updated successfully!`);
                // backUrl already points to detail page for edit mode
            } else {
                // Create new document
                const newDoc = addDocument({
                    type,
                    ...docData,
                    status: 'draft',
                });

                // Increment sequence number in settings
                let numberingType: 'invoice' | 'receipt' | 'deliveryNote';
                switch (type) {
                    case 'invoice': numberingType = 'invoice'; break;
                    case 'receipt': numberingType = 'receipt'; break;
                    case 'delivery-note': numberingType = 'deliveryNote'; break;
                    default: numberingType = 'invoice';
                }
                incrementDocumentNumber(numberingType);

                // Navigate to the newly created document's detail page
                const basePath = type === 'delivery-note' ? 'delivery-notes' : `${type}s`;
                targetUrl = `/${basePath}/${newDoc.id}`;
                toast.success(`${documentNumber} created successfully!`);
            }

            setShowSuccess(true);
            setTimeout(() => {
                router.push(targetUrl);
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
        amountPaidInWords,
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
                        iconOnlyMobile
                        onClick={() => setShowPreview(true)}
                        disabled={!selectedTemplateId}
                    >
                        Preview
                    </Button>
                    <Button
                        leftIcon={<Save className="w-4 h-4" />}
                        iconOnlyMobile
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
                            <div className="flex flex-col gap-1.5 md:col-span-2">
                                <div className="flex items-end gap-3">
                                    <div className="flex-1">
                                        <Select
                                            label="Template"
                                            options={templateOptions}
                                            value={selectedTemplateId}
                                            onChange={setSelectedTemplateId}
                                            placeholder="Select a template..."
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setTempSelectedTemplateId(selectedTemplateId);
                                            setIsVisualTemplatePickerOpen(true);
                                        }}
                                        className="h-10 px-4 shrink-0"
                                        leftIcon={<Eye className="w-4 h-4" />}
                                        iconOnlyMobile
                                    >
                                        View Templates
                                    </Button>
                                </div>
                            </div>

                            <div className="pointer-events-none select-none opacity-80">
                                <Input
                                    label="Document Number (Auto-Generated)"
                                    value={documentNumber}
                                    readOnly
                                    disabled
                                    tabIndex={-1}
                                    className="bg-neutral-100 dark:bg-neutral-800 text-neutral-500 font-mono cursor-not-allowed border-neutral-200 dark:border-neutral-700"
                                    leftIcon={<Lock className="w-4 h-4 text-neutral-400" />}
                                />
                            </div>

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
                        {selectedTemplate && selectedTemplate.fields.filter(f => f.type === 'custom' || f.type === 'text' || f.type === 'link-button').length > 0 && (
                            <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-700 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <h3 className="col-span-1 md:col-span-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Mapped Custom Fields</h3>
                                {selectedTemplate.fields.filter(f => f.type === 'custom' || f.type === 'text' || f.type === 'link-button').map(field => (
                                    <Input
                                        key={field.id}
                                        label={field.label}
                                        // Use the document-specific value if set, otherwise fallback to template value (for display in input, we typically show what will be used)
                                        // However, for input, we usually want empty if not set locally, UNLESS we want to pre-fill.
                                        // Let's pre-fill with template default if local is empty.
                                        // Actually, if we just show empty, the user might think there is no link.
                                        // Better to show the template default as placeholder or initial value.
                                        value={customFieldValues[field.id] !== undefined ? customFieldValues[field.id] : (field.type === 'link-button' ? (field as any).customValues?.url || '' : '')}
                                        placeholder={field.type === 'link-button' ? 'https://example.com' : field.label}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setCustomFieldValues({ ...customFieldValues, [field.id]: val });

                                            // Link buttons don't need sync logic
                                            if (field.type === 'link-button') return;

                                            // Intelligent Sync for other fields
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

                            {/* Quick POS Barcode Scan Bar */}
                            <div className="px-6 py-3 bg-blue-50/70 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                                <div className="flex items-center gap-2 text-xs font-semibold text-blue-900 dark:text-blue-200 shrink-0">
                                    <BarcodeIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    <span>POS Quick Scan</span>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            if (quickBarcodeQuery.trim()) {
                                                handleBarcodeScan(quickBarcodeQuery.trim());
                                                setQuickBarcodeQuery('');
                                            }
                                        }}
                                        className="flex-1 flex gap-1.5"
                                    >
                                        <Input
                                            placeholder="Scan barcode or USB scanner input..."
                                            value={quickBarcodeQuery}
                                            onChange={(e) => setQuickBarcodeQuery(e.target.value)}
                                            className="h-9 text-xs"
                                            leftIcon={<BarcodeIcon className="w-3.5 h-3.5" />}
                                        />
                                        <Button type="submit" size="sm" variant="secondary" className="h-9 px-3 shrink-0 text-xs">
                                            Scan
                                        </Button>
                                    </form>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setIsBarcodeModalOpen(true)}
                                        leftIcon={<ScanLine className="w-3.5 h-3.5 text-blue-600" />}
                                        className="h-9 px-3 shrink-0 text-xs border-blue-200 dark:border-blue-800 bg-white dark:bg-neutral-900"
                                    >
                                        Camera Scanner
                                    </Button>
                                </div>
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
                                                    const product = displayProducts.find(p => p.id === item.productId);
                                                    const isOutOfStock = isProductOutOfStock(product);

                                                    return (
                                                        <div key={col.id} style={{ width: `${col.width}%`, flexShrink: 0 }} className="px-1">
                                                            <select
                                                                value={item.productId}
                                                                onChange={(e) => updateLineItem(item.id, 'productId', e.target.value)}
                                                                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-neutral-900 ${
                                                                    isOutOfStock
                                                                        ? 'border-amber-400 text-amber-900 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/20 font-medium'
                                                                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100'
                                                                }`}
                                                            >
                                                                <option value="">Select item...</option>
                                                                {displayProducts.map(p => {
                                                                    const outOfStock = isProductOutOfStock(p);
                                                                    return (
                                                                        <option key={p.id} value={p.id}>
                                                                            {p.name} {outOfStock ? `— ⚠️ Out of Stock (0 remaining)` : (p.stockQuantity !== undefined ? `(${p.stockQuantity} in stock)` : '')}
                                                                        </option>
                                                                    );
                                                                })}
                                                            </select>

                                                            {product && isOutOfStock && (
                                                                <div className="mt-1.5 p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 gap-2">
                                                                    <div className="flex items-center gap-1 font-medium">
                                                                        <span className="shrink-0 text-amber-600 dark:text-amber-400 font-bold">⚠️ Out of Stock</span>
                                                                        <span className="hidden xl:inline text-[11px]">Restock required to issue document</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                                        <input
                                                                            type="number"
                                                                            min="1"
                                                                            placeholder="Qty"
                                                                            value={restockQtyMap[product.id] || ''}
                                                                            onChange={(e) => setRestockQtyMap({ ...restockQtyMap, [product.id]: parseInt(e.target.value) || 0 })}
                                                                            className="w-14 px-1.5 py-0.5 text-xs border border-amber-300 dark:border-amber-700 rounded bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-center font-bold"
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const qty = restockQtyMap[product.id] || 10;
                                                                                handleQuickRestock(product.id, qty);
                                                                            }}
                                                                            className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-[11px] transition-colors shrink-0 shadow-sm"
                                                                        >
                                                                            Restock Unit
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
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
                            <div className="md:hidden flex flex-col gap-2 p-2">
                                {lineItems.map((item, index) => {
                                    const isExpanded = expandedLineItemId === item.id;
                                    const product = displayProducts.find(p => p.id === item.productId);
                                    const isOutOfStock = isProductOutOfStock(product);
                                    const displayName = product ? product.name : 'Select item...';

                                    return (
                                        <div 
                                            key={item.id} 
                                            className={`
                                                border rounded-xl transition-all duration-200 bg-white dark:bg-neutral-800 overflow-hidden
                                                ${isOutOfStock
                                                    ? 'border-amber-400 ring-1 ring-amber-400/30'
                                                    : isExpanded 
                                                        ? 'border-blue-500 shadow-sm ring-1 ring-blue-500/20' 
                                                        : 'border-neutral-200 dark:border-neutral-700'
                                                }
                                            `}
                                        >
                                            {/* Accordion Header / Collapsed Summary */}
                                            <div 
                                                onClick={() => setExpandedLineItemId(isExpanded ? null : item.id)}
                                                className="flex items-center justify-between p-3 cursor-pointer select-none hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors"
                                            >
                                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                                    <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 shrink-0">#{index + 1}</span>
                                                    <span className={`text-xs font-semibold truncate ${product ? (isOutOfStock ? 'text-amber-600 dark:text-amber-400' : 'text-[#2d3748] dark:text-white') : 'text-neutral-400 dark:text-neutral-500'}`}>
                                                        {displayName}
                                                    </span>
                                                    {isOutOfStock ? (
                                                        <span className="text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded font-bold shrink-0">
                                                            ⚠️ Out of Stock
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] bg-neutral-100 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-neutral-500 dark:text-neutral-400 shrink-0">
                                                            Qty: {item.quantity}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 ml-3 shrink-0">
                                                    <span className="text-xs font-bold text-[#2d3748] dark:text-white">
                                                        {formatCurrency(item.subtotal, currency)}
                                                    </span>
                                                    {isExpanded ? (
                                                        <ChevronUp className="w-4 h-4 text-neutral-400" />
                                                    ) : (
                                                        <ChevronDown className="w-4 h-4 text-neutral-400" />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Accordion Content (Edit Fields) */}
                                            {isExpanded && (
                                                <div className="p-3.5 border-t border-neutral-100 dark:border-neutral-700/60 bg-neutral-50/50 dark:bg-neutral-900/10 space-y-3">
                                                    {/* Top Row: Title & Delete */}
                                                    <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800/60">
                                                        <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Editing Item #{index + 1}</span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                removeLineItem(item.id);
                                                            }}
                                                            className="p-1 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors flex items-center gap-1 text-[10px] font-semibold"
                                                            title="Remove Item"
                                                            disabled={lineItems.length === 1}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                            Delete
                                                        </button>
                                                    </div>

                                                    {/* 1. Product select dropdown (Full width) */}
                                                    {tableColumns.some((col: any) => col.key === 'product' || col.key === 'productName' || col.key === 'description') && (
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase">Item Description</label>
                                                            <select
                                                                value={item.productId}
                                                                onChange={(e) => updateLineItem(item.id, 'productId', e.target.value)}
                                                                className={`w-full px-2.5 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-neutral-900 ${
                                                                    isOutOfStock
                                                                        ? 'border-amber-400 text-amber-900 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/20 font-medium'
                                                                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100'
                                                                }`}
                                                            >
                                                                <option value="">Select item...</option>
                                                                {displayProducts.map(p => {
                                                                    const outOfStock = isProductOutOfStock(p);
                                                                    return (
                                                                        <option key={p.id} value={p.id}>
                                                                            {p.name} {outOfStock ? `— ⚠️ Out of Stock (0 remaining)` : (p.stockQuantity !== undefined ? `(${p.stockQuantity} in stock)` : '')}
                                                                        </option>
                                                                    );
                                                                })}
                                                            </select>

                                                            {product && isOutOfStock && (
                                                                <div className="mt-2 p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between text-xs text-amber-900 dark:text-amber-200 gap-2">
                                                                    <div className="flex items-center gap-1.5 font-medium">
                                                                        <span className="shrink-0 text-amber-600 dark:text-amber-400 font-bold">⚠️ Out of Stock</span>
                                                                        <span className="text-[11px]">Restock required before saving</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                                                                        <input
                                                                            type="number"
                                                                            min="1"
                                                                            placeholder="Qty"
                                                                            value={restockQtyMap[product.id] || ''}
                                                                            onChange={(e) => setRestockQtyMap({ ...restockQtyMap, [product.id]: parseInt(e.target.value) || 0 })}
                                                                            className="w-20 px-2 py-1 text-xs border border-amber-300 dark:border-amber-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-center font-bold"
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const qty = restockQtyMap[product.id] || 10;
                                                                                handleQuickRestock(product.id, qty);
                                                                            }}
                                                                            className="flex-1 sm:flex-none px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs transition-colors shadow-sm"
                                                                        >
                                                                            Restock Unit
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* 2. Quantity, Price, Custom Columns grid (Compact 2 columns) */}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {tableColumns.map((col: any) => {
                                                            if (col.key === 'sn' || col.key === 'product' || col.key === 'productName' || col.key === 'description' || col.key === 'subtotal') {
                                                                return null;
                                                            }

                                                            if (col.key === 'quantity') {
                                                                return (
                                                                    <div key={col.id} className="space-y-1">
                                                                        <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase">{col.header}</label>
                                                                        <input
                                                                            type="number"
                                                                            min="1"
                                                                            value={item.quantity}
                                                                            onChange={(e) => updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                                                                            className="w-full px-2.5 py-1.5 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                                                                        />
                                                                    </div>
                                                                );
                                                            }

                                                            if (col.key === 'unitPrice') {
                                                                return (
                                                                    <div key={col.id} className="space-y-1">
                                                                        <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase">{col.header}</label>
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            min="0"
                                                                            value={item.unitPrice || ''}
                                                                            onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                                            className="w-full px-2.5 py-1.5 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                                                                        />
                                                                    </div>
                                                                );
                                                            }

                                                            // Custom Columns
                                                            return (
                                                                <div key={col.id} className="space-y-1">
                                                                    <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase">{col.header}</label>
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
                                                                        className="w-full px-2.5 py-1.5 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                                                                        placeholder={col.header}
                                                                    />
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
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
                            {/* For receipts from source invoice: show source total (read-only) */}
                            {type === 'receipt' && sourceGrandTotal > 0 && (
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                                        Invoice Total
                                        <HelpTooltip termKey="invoice-total" />
                                    </label>
                                    <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl">
                                        <span className="text-lg font-bold text-blue-700 dark:text-blue-300">{formatCurrency(sourceGrandTotal, currency)}</span>
                                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Pulled from source invoice</p>
                                        {previousPayments > 0 && (
                                            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                                                Previous payments: {formatCurrency(previousPayments, currency)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* For standalone receipts or documents without line items: allow manual amount entry */}
                            {!hasLineItems && !(type === 'receipt' && sourceGrandTotal > 0) && (
                                <Input
                                    label={type === 'receipt' ? 'Receipt Amount' : 'Amount'}
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={manualSubtotal || ''}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        setManualSubtotal(val);

                                        // Reverse Sync: Update left-side custom field if it exists
                                        const amountField = selectedTemplate?.fields.find(f =>
                                            (f.type === 'custom' || f.type === 'text') &&
                                            ['amount', 'total', 'grand total', 'price', 'sum'].includes(f.label.toLowerCase())
                                        );

                                        if (amountField) {
                                            const formatted = val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                            setCustomFieldValues(prev => ({
                                                ...prev,
                                                [amountField.id]: formatted
                                            }));
                                        }
                                    }}
                                />
                            )}

                            {hasDiscount && (
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                                        Discount
                                        <HelpTooltip termKey="discount" />
                                    </label>
                                    <Select
                                        options={[
                                            { label: 'No Discount', value: '' },
                                            ...displayDiscounts
                                                .filter(d => d.isActive)
                                                .map(d => ({ label: `${d.name} (${d.percentage}%)`, value: d.id }))
                                        ]}
                                        value={discountId || displayDiscounts.find(d => d.isActive && d.percentage === discountPercent && d.name === discountName)?.id || ''}
                                        onChange={(v) => {
                                            if (!v) {
                                                setDiscountPercent(0);
                                                setDiscountName('');
                                                setDiscountId(undefined);
                                                return;
                                            }
                                            const d = displayDiscounts.find(d => d.id === v);
                                            if (d) {
                                                setDiscountPercent(d.percentage);
                                                setDiscountName(d.name);
                                                setDiscountId(d.id);
                                            }
                                        }}
                                        className="text-sm"
                                    />
                                    {discountPercent > 0 && (
                                        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800">
                                            <Tag className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                                                {discountName} applied: {discountPercent}% off
                                            </span>
                                        </div>
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
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                                        {type === 'receipt' ? 'This Payment' : 'Amount Paid'}
                                        <HelpTooltip termKey={type === 'receipt' ? 'this-payment' : 'amount-paid'} />
                                    </label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={amountPaid || ''}
                                        onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Totals */}
                        <div className="space-y-3 pt-4 border-t border-neutral-100 dark:border-neutral-700">
                            {/* Only show subtotal if different from grand total (i.e., has discount or tax) */}
                            {(hasDiscount || hasTax) && type !== 'receipt' && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                                        Subtotal
                                        <HelpTooltip termKey="subtotal" />
                                    </span>
                                    <span className="text-sm font-medium text-[#2d3748] dark:text-white">{formatCurrency(subtotal, currency)}</span>
                                </div>
                            )}
                            {hasDiscount && discountPercent > 0 && type !== 'receipt' && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-neutral-500 flex items-center gap-1">
                                        Discount ({discountPercent}%)
                                        <HelpTooltip termKey="discount" />
                                    </span>
                                    <span className="text-sm font-medium text-red-500">-{formatCurrency(discountAmount, currency)}</span>
                                </div>
                            )}
                            {hasTax && taxPercent > 0 && type !== 'receipt' && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                                        Tax ({taxPercent}%)
                                        <HelpTooltip termKey="tax" />
                                    </span>
                                    <span className="text-sm font-medium text-[#2d3748] dark:text-white">{formatCurrency(taxAmount, currency)}</span>
                                </div>
                            )}

                            {/* Grand Total / Invoice Total */}
                            <div className="flex items-center justify-between pt-3 border-t border-neutral-200 dark:border-neutral-700">
                                <span className="text-base font-semibold text-[#2d3748] dark:text-white flex items-center gap-1.5">
                                    {type === 'receipt' && sourceGrandTotal > 0 ? 'Invoice Total' : 'Grand Total'}
                                    <HelpTooltip termKey={type === 'receipt' && sourceGrandTotal > 0 ? 'invoice-total' : 'grand-total'} />
                                </span>
                                <span className="text-xl font-bold text-[#2d3748] dark:text-white">{formatCurrency(grandTotal, currency)}</span>
                            </div>

                            {/* Previous Payments - only for receipts with source invoice */}
                            {type === 'receipt' && sourceGrandTotal > 0 && previousPayments > 0 && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                                        Previous Payments
                                        <HelpTooltip termKey="previous-payments" />
                                    </span>
                                    <span className="text-sm font-medium text-emerald-600">-{formatCurrency(previousPayments, currency)}</span>
                                </div>
                            )}

                            {/* This Payment / Amount Paid */}
                            {hasAmountPaid && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                                        {type === 'receipt' ? 'This Payment' : 'Amount Paid'}
                                        <HelpTooltip termKey={type === 'receipt' ? 'this-payment' : 'amount-paid'} />
                                    </span>
                                    <span className="text-sm font-medium text-emerald-600">
                                        {type === 'receipt' ? formatCurrency(amountPaid, currency) : `-${formatCurrency(amountPaid, currency)}`}
                                    </span>
                                </div>
                            )}

                            {/* Amount Due / Remaining Balance */}
                            {(hasAmountPaid || hasAmountDue) && (
                                <div className="flex items-center justify-between pt-2 border-t border-dashed border-neutral-200 dark:border-neutral-700">
                                    <span className="text-sm font-medium text-[#2d3748] dark:text-white flex items-center gap-1.5">
                                        {type === 'receipt' ? 'Remaining Balance' : 'Amount Due'}
                                        <HelpTooltip termKey={type === 'receipt' ? 'remaining-balance' : 'amount-due'} />
                                    </span>
                                    <span className={`text-lg font-bold ${amountDue === 0 ? 'text-emerald-600' : 'text-[#2d3748] dark:text-white'}`}>
                                        {formatCurrency(amountDue, currency)}
                                    </span>
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

            {/* Visual Template Picker Modal */}
            <Modal
                isOpen={isVisualTemplatePickerOpen}
                onClose={() => setIsVisualTemplatePickerOpen(false)}
                title="Select Document Template"
                size="full"
                footer={
                    <ModalFooter className="w-full flex items-center justify-between">
                        <Link href="/templates">
                            <Button variant="outline" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                                Create New
                            </Button>
                        </Link>
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={() => setIsVisualTemplatePickerOpen(false)}>
                                Cancel
                            </Button>
                            {displayTemplates.length > 0 && (
                                <Button
                                    onClick={() => {
                                        if (tempSelectedTemplateId) {
                                            setSelectedTemplateId(tempSelectedTemplateId);
                                            setIsVisualTemplatePickerOpen(false);
                                            toast.success("Template selected!");
                                        }
                                    }}
                                    disabled={!tempSelectedTemplateId}
                                >
                                    Proceed
                                </Button>
                            )}
                        </div>
                    </ModalFooter>
                }
            >
                {(() => {
                    if (displayTemplates.length === 0) {
                        return (
                            <div className="text-center py-16">
                                <div className="w-16 h-16 mx-auto bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
                                    <FileText className="w-8 h-8 text-neutral-400 dark:text-neutral-500" />
                                </div>
                                <h3 className="text-lg font-semibold text-[#2d3748] dark:text-white mb-2">No Templates Found</h3>
                                <p className="text-neutral-600 dark:text-neutral-400 mb-6 max-w-md mx-auto">
                                    You don't have any templates set up yet. Upload or create a template to get started.
                                </p>
                            </div>
                        );
                    }

                    return (
                        <div className="flex flex-col gap-4">
                            {/* Toggle view mode */}
                            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-700/60">
                                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">View Preference</span>
                                <div className="flex rounded-lg bg-neutral-100 dark:bg-neutral-800 p-0.5 border border-neutral-200/50 dark:border-neutral-700/50">
                                    <button
                                        type="button"
                                        onClick={() => setPickerViewMode('grid')}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                                            pickerViewMode === 'grid'
                                                ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-white shadow-sm'
                                                : 'text-neutral-600 dark:text-neutral-400 hover:text-[#2d3748] dark:hover:text-white'
                                        }`}
                                    >
                                        <LayoutGrid className="w-3.5 h-3.5" />
                                        Grid
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPickerViewMode('list')}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                                            pickerViewMode === 'list'
                                                ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-white shadow-sm'
                                                : 'text-neutral-600 dark:text-neutral-400 hover:text-[#2d3748] dark:hover:text-white'
                                        }`}
                                    >
                                        <List className="w-3.5 h-3.5" />
                                        List
                                    </button>
                                </div>
                            </div>

                            {pickerViewMode === 'grid' ? (
                                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-1 max-h-[60vh] overflow-y-auto">
                                    {displayTemplates.map((t) => {
                                        const isVariant = t.mode === 'connected' && t.variants?.[type];
                                        const imageUrl = isVariant ? t.variants?.[type]?.imageUrl : t.imageUrl;
                                        const isSelected = tempSelectedTemplateId === t.id;

                                        // Format display names beautifully: e.g. "Connected Template" or "Invoice"
                                        const formattedType = t.mode === 'connected'
                                            ? 'Connected Template'
                                            : (t.type === 'delivery-note' ? 'Delivery Note' : `${t.type.charAt(0).toUpperCase() + t.type.slice(1)}`);

                                        return (
                                            <div
                                                key={t.id}
                                                onClick={() => setTempSelectedTemplateId(t.id)}
                                                className={`
                                                    cursor-pointer rounded-xl border-2 p-2 transition-all duration-200 bg-white dark:bg-neutral-800 flex flex-col group/picker
                                                    ${isSelected
                                                        ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                                                        : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:shadow-sm'
                                                    }
                                                `}
                                            >
                                                <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-700/80 mb-2">
                                                    {imageUrl ? (
                                                        <img
                                                            src={imageUrl}
                                                            alt={t.name}
                                                            className="w-full h-full object-cover group-hover/picker:scale-105 transition-transform duration-200"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <FileText className="w-10 h-10 text-neutral-300 dark:text-neutral-600" />
                                                        </div>
                                                    )}
                                                    
                                                    {/* Format Indicators (badges on top left) */}
                                                    <div className="absolute top-2 left-2 flex gap-1 bg-black/60 backdrop-blur-sm p-1 rounded-lg z-10">
                                                        {(t.type === 'invoice' || t.variants?.['invoice']) && (
                                                            <span title="Invoice format supported">
                                                                <FileText className="w-3.5 h-3.5 text-blue-400" />
                                                            </span>
                                                        )}
                                                        {(t.type === 'receipt' || t.variants?.['receipt']) && (
                                                            <span title="Receipt format supported">
                                                                <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                                                            </span>
                                                        )}
                                                        {(t.type === 'delivery-note' || t.variants?.['delivery-note']) && (
                                                            <span title="Delivery Note format supported">
                                                                <Truck className="w-3.5 h-3.5 text-amber-400" />
                                                            </span>
                                                        )}
                                                    </div>

                                                    {isSelected && (
                                                        <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1 shadow z-10">
                                                            <Check className="w-4 h-4" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="px-1 py-0.5">
                                                    <p className="font-semibold text-xs text-neutral-900 dark:text-white truncate">
                                                        {t.name}
                                                    </p>
                                                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase mt-0.5 font-bold tracking-tight">
                                                        {formattedType}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2 p-1 max-h-[60vh] overflow-y-auto">
                                    {displayTemplates.map((t) => {
                                        const isVariant = t.mode === 'connected' && t.variants?.[type];
                                        const imageUrl = isVariant ? t.variants?.[type]?.imageUrl : t.imageUrl;
                                        const isSelected = tempSelectedTemplateId === t.id;

                                        const formattedType = t.mode === 'connected'
                                            ? 'Connected Template'
                                            : (t.type === 'delivery-note' ? 'Delivery Note' : `${t.type.charAt(0).toUpperCase() + t.type.slice(1)}`);

                                        return (
                                            <div
                                                key={t.id}
                                                onClick={() => setTempSelectedTemplateId(t.id)}
                                                className={`
                                                    cursor-pointer rounded-xl border-2 p-3 transition-all duration-200 bg-white dark:bg-neutral-800 flex items-center justify-between gap-4 group/picker
                                                    ${isSelected
                                                        ? 'border-blue-500 bg-blue-50/10 dark:bg-blue-900/10 ring-2 ring-blue-500/20 shadow-sm'
                                                        : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:shadow-xs'
                                                    }
                                                `}
                                            >
                                                <div className="flex items-center gap-4 min-w-0">
                                                    {/* Thumbnail */}
                                                    <div className="relative w-12 h-16 rounded-lg overflow-hidden bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-700/80 shrink-0">
                                                        {imageUrl ? (
                                                            <img
                                                                src={imageUrl}
                                                                alt={t.name}
                                                                className="w-full h-full object-cover group-hover/picker:scale-105 transition-transform duration-200"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <FileText className="w-6 h-6 text-neutral-300 dark:text-neutral-600" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* Text details */}
                                                    <div className="min-w-0 flex-1">
                                                        <h4 className="font-semibold text-sm text-neutral-900 dark:text-white truncate">
                                                            {t.name}
                                                        </h4>
                                                        <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase font-bold tracking-tight mt-0.5">
                                                            {formattedType}
                                                        </p>
                                                        {/* Supported Format Icons Inline */}
                                                        <div className="flex gap-2 mt-1 flex-wrap">
                                                            {(t.type === 'invoice' || t.variants?.['invoice']) && (
                                                                <span className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                                                                    <FileText className="w-3 h-3" /> Invoice
                                                                </span>
                                                            )}
                                                            {(t.type === 'receipt' || t.variants?.['receipt']) && (
                                                                <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                                                    <Receipt className="w-3 h-3" /> Receipt
                                                                </span>
                                                            )}
                                                            {(t.type === 'delivery-note' || t.variants?.['delivery-note']) && (
                                                                <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                                                    <Truck className="w-3 h-3" /> Delivery
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Selection Status */}
                                                <div className="shrink-0 flex items-center justify-center">
                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                                        isSelected
                                                            ? 'border-blue-500 bg-blue-500 text-white'
                                                            : 'border-neutral-300 dark:border-neutral-600'
                                                    }`}>
                                                        {isSelected && <Check className="w-3 h-3" />}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })()}
            </Modal>

            {/* Barcode Camera Scanner Modal */}
            <BarcodeScannerModal
                isOpen={isBarcodeModalOpen}
                onClose={() => setIsBarcodeModalOpen(false)}
                onScan={(scannedCode) => {
                    handleBarcodeScan(scannedCode);
                }}
                mode="continuous"
                title="POS Camera Barcode Scanner"
            />
        </div>
    );
}
