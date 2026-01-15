"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDocumentStore, useTemplateStore, useCustomerStore, useSettingsStore } from '@/lib/store';
import { formatCurrency, formatDate, downloadPdf, downloadPng, printDocument, formatAmountInWords } from '@/lib/utils';
import { Button, Modal, ModalFooter } from '@/components/ui';
import { DocumentType } from '@/lib/types';
import { toast } from 'react-hot-toast';
import DocumentRenderer, { DocumentData } from '@/components/DocumentRenderer';
import DocumentPreviewWrapper from '@/components/DocumentPreviewWrapper';
import {
    ArrowLeft,
    Edit2,
    Download,
    Send,
    Check,
    Trash2,
    Printer,
    Copy,
    FileText,
    Receipt,
    Truck,
    Calendar,
    User,
    Mail,
    Phone,
    MapPin,
    Image,
    Plus
} from 'lucide-react';

interface DocumentDetailProps {
    type: DocumentType;
    documentId: string;
    backUrl: string;
}

const statusConfig = {
    'draft': { label: 'Draft', bgClass: 'bg-neutral-100', textClass: 'text-neutral-600', dotClass: 'bg-neutral-400' },
    'sent': { label: 'Sent', bgClass: 'bg-blue-50', textClass: 'text-blue-600', dotClass: 'bg-blue-500' },
    'paid': { label: 'Paid', bgClass: 'bg-emerald-50', textClass: 'text-emerald-600', dotClass: 'bg-emerald-500' },
    'overdue': { label: 'Overdue', bgClass: 'bg-red-50', textClass: 'text-red-600', dotClass: 'bg-red-500' },
    'cancelled': { label: 'Cancelled', bgClass: 'bg-neutral-100', textClass: 'text-neutral-500', dotClass: 'bg-neutral-400' },
};

export default function DocumentDetail({ type, documentId, backUrl }: DocumentDetailProps) {
    const router = useRouter();
    const { getDocumentById, updateDocument, deleteDocument, duplicateDocument, convertDocument } = useDocumentStore();
    const { getTemplateById } = useTemplateStore();
    const { getCustomerById } = useCustomerStore();
    const { company } = useSettingsStore();

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Loading states for actions
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
    const [isDownloadingPng, setIsDownloadingPng] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Get document
    const doc = getDocumentById(documentId);

    // Get template with Connected Logic
    const rawTemplate = doc ? getTemplateById(doc.templateId) : null;

    // If connected template and type differs (e.g. Invoice Template used for Receipt), swap to variant
    const template = (rawTemplate && doc && doc.type !== rawTemplate.type && rawTemplate.mode === 'connected' && rawTemplate.variants?.[doc.type])
        ? {
            ...rawTemplate,
            imageUrl: rawTemplate.variants[doc.type]!.imageUrl,
            fields: rawTemplate.variants[doc.type]!.fields,
            width: rawTemplate.variants[doc.type]!.width,
            height: rawTemplate.variants[doc.type]!.height,
            orientation: rawTemplate.variants[doc.type]!.orientation
        }
        : rawTemplate;

    // Get customer
    const customer = doc ? getCustomerById(doc.customerId) : null;

    if (!mounted) {
        return <div className="max-w-7xl mx-auto py-12 flex justify-center items-center min-h-[400px]">
            <div className="animate-pulse flex flex-col items-center">
                <div className="h-4 w-32 bg-neutral-200 rounded mb-4"></div>
                <div className="h-10 w-48 bg-neutral-100 rounded"></div>
            </div>
        </div>;
    }

    if (!doc) {
        return (
            <div className="max-w-4xl mx-auto py-12 text-center">
                <h2 className="text-xl font-semibold text-[#2d3748] mb-2">Document Not Found</h2>
                <Link href={backUrl}>
                    <Button variant="outline" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                        Go Back
                    </Button>
                </Link>
            </div>
        );
    }

    const config = statusConfig[doc.status];

    // Recalculate totals for consistency (SOURCE OF TRUTH: Line Items & Settings)
    // CRITICAL: Only apply Tax/Discount if the template actually supports/shows them.
    // Otherwise, we get "invisible" math that confuses the user (e.g. 10% tax applied but not shown).

    // 1. Feature Flags based on Template
    const hasLineItems = template?.fields?.some(f => f.type === 'line-items') ?? (doc.lineItems && doc.lineItems.length > 0 && doc.lineItems[0].productName !== '');
    const hasDiscount = template?.fields?.some(f => f.type === 'discount') ?? true; // Default true if no template string (safety), but usually template exists
    const hasTax = template?.fields?.some(f => f.type === 'tax') ?? true;

    // 2. Calculate Subtotal
    const calculatedSubtotal = hasLineItems
        ? doc.lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
        : doc.subtotal;

    // 3. Calculate Discount (Only if template has discount field)
    const calculatedDiscountAmount = hasDiscount
        ? calculatedSubtotal * (doc.discountPercent / 100)
        : 0;

    // 4. Calculate Tax (Only if template has tax field)
    // Tax is usually applied on (Subtotal - Discount)
    const taxableAmount = calculatedSubtotal - calculatedDiscountAmount;
    const calculatedTaxAmount = hasTax
        ? taxableAmount * (doc.taxPercent / 100)
        : 0;

    // 5. Calculate Grand Total
    const calculatedGrandTotal = calculatedSubtotal - calculatedDiscountAmount + calculatedTaxAmount;

    // Prepare preview data
    const previewData: DocumentData = {
        documentNumber: doc.documentNumber,
        date: doc.date,
        dueDate: doc.dueDate,
        customerName: doc.customerName,
        customerEmail: customer?.email,
        customerPhone: customer?.phone,
        customerAddress: customer?.address,
        lineItems: doc.lineItems,
        subtotal: calculatedSubtotal,         // Use calculated
        discountAmount: calculatedDiscountAmount, // Use calculated
        taxAmount: calculatedTaxAmount,       // Use calculated
        grandTotal: calculatedGrandTotal,     // Use calculated
        notes: doc.notes,
        customValues: doc.customValues,
        amountInWords: formatAmountInWords(calculatedGrandTotal, company.currency), // Use calculated
        amountPaid: doc.amountPaid,
        amountDue: doc.amountDue ?? (calculatedGrandTotal - (doc.amountPaid || 0)),
    };

    // Handlers
    const handleDelete = () => {
        const docNumber = doc.documentNumber;
        deleteDocument(doc.id);
        toast.success(`${docNumber} deleted`);
        router.push(backUrl);
    };

    const handleMarkAsPaid = () => {
        updateDocument(doc.id, { status: 'paid', paidAt: new Date().toISOString() });
        toast.success(`${doc.documentNumber} marked as paid`);
    };

    const handleMarkAsSent = () => {
        updateDocument(doc.id, { status: 'sent' });
        toast.success(`${doc.documentNumber} marked as sent`);
    };

    const handleDuplicate = () => {
        const newDoc = duplicateDocument(doc.id);
        toast.success(`${doc.documentNumber} duplicated`);
        router.push(`/${newDoc.type}s/${newDoc.id}/edit`);
    };

    const handleDownload = async () => {
        setIsDownloadingPdf(true);
        try {
            await downloadPdf('document-preview', `${doc.documentNumber}`);
            toast.success('PDF downloaded');
        } finally {
            setIsDownloadingPdf(false);
        }
    };

    const handleDownloadPng = async () => {
        setIsDownloadingPng(true);
        try {
            await downloadPng('document-preview', `${doc.documentNumber}`);
            toast.success('Image downloaded');
        } finally {
            setIsDownloadingPng(false);
        }
    };

    const handlePrint = async () => {
        setIsPrinting(true);
        try {
            await printDocument('document-preview');
        } finally {
            setIsPrinting(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <Link
                        href={backUrl}
                        className="p-2 rounded-lg text-neutral-500 hover:text-[#2d3748] dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-[#2d3748] dark:text-white">{doc.documentNumber}</h1>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bgClass} ${config.textClass}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`}></span>
                                {config.label}
                            </span>
                        </div>
                        <p className="text-sm text-neutral-500 mt-1">
                            Created on {formatDate(doc.createdAt)}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link href={`/${type}s/${documentId}/edit`}>
                        <Button variant="outline" leftIcon={<Edit2 className="w-4 h-4" />}>
                            Edit
                        </Button>
                    </Link>
                    <Button
                        variant="outline"
                        leftIcon={<Download className="w-4 h-4" />}
                        onClick={handleDownload}
                        isLoading={isDownloadingPdf}
                        disabled={isDownloadingPdf || isDownloadingPng || isPrinting}
                    >
                        PDF
                    </Button>
                    <Button
                        variant="outline"
                        leftIcon={<Image className="w-4 h-4" />}
                        onClick={handleDownloadPng}
                        isLoading={isDownloadingPng}
                        disabled={isDownloadingPdf || isDownloadingPng || isPrinting}
                    >
                        PNG
                    </Button>
                    <Button
                        variant="outline"
                        leftIcon={<Printer className="w-4 h-4" />}
                        onClick={handlePrint}
                        isLoading={isPrinting}
                        disabled={isDownloadingPdf || isDownloadingPng || isPrinting}
                    >
                        Print
                    </Button>
                </div>
            </div>

            {/* Connected Document Navigation */}
            {(() => {
                // Determine the "Hub" (The Invoice that connects everything)
                const hubId = doc.type === 'invoice' ? doc.id : doc.sourceDocumentId;
                const sourceIdForNew = hubId || doc.id;

                // Determine valid types based on Template
                const supportsReceipt = rawTemplate?.type === 'receipt' || !!rawTemplate?.variants?.['receipt'];
                const supportsDelivery = rawTemplate?.type === 'delivery-note' || !!rawTemplate?.variants?.['delivery-note'];

                if (!supportsReceipt && !supportsDelivery) return null;

                // Find existing docs related to the Hub
                const allDocs = useDocumentStore.getState().documents;
                const { getTotalPaidForInvoice } = useDocumentStore.getState();

                // Invoice
                let linkedInvoice = hubId ? allDocs.find(d => d.id === hubId && d.type === 'invoice') : null;
                if (doc.type === 'invoice') linkedInvoice = doc;

                // Receipts - Find ALL receipts linked to this invoice
                const linkedReceipts = hubId
                    ? allDocs.filter(d => d.sourceDocumentId === hubId && d.type === 'receipt')
                        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                    : [];
                if (doc.type === 'receipt' && !linkedReceipts.find(r => r.id === doc.id)) {
                    linkedReceipts.push(doc);
                }

                // Delivery Note - only one per invoice typically
                let linkedDelivery = hubId ? allDocs.find(d => d.sourceDocumentId === hubId && d.type === 'delivery-note') : null;
                if (doc.type === 'delivery-note') linkedDelivery = doc;

                // Calculate payment status for showing "Add Receipt" option
                // IMPORTANT: Recalculate invoice total based on template capabilities
                // The stored grandTotal might include tax even if template doesn't show it
                let invoiceTotal = 0;
                if (linkedInvoice) {
                    const invoiceTemplate = getTemplateById(linkedInvoice.templateId);
                    const invoiceSupportsTax = invoiceTemplate?.fields.some(f => f.type === 'tax') ?? false;
                    const invoiceSupportsDiscount = invoiceTemplate?.fields.some(f => f.type === 'discount') ?? false;

                    // Calculate actual subtotal from line items
                    const invSubtotal = linkedInvoice.lineItems.reduce((sum, item) =>
                        sum + (item.quantity * item.unitPrice), 0);

                    // Apply discount only if template supports it
                    const invDiscountAmount = invoiceSupportsDiscount && linkedInvoice.discountPercent > 0
                        ? invSubtotal * (linkedInvoice.discountPercent / 100)
                        : 0;
                    const invTaxableAmount = invSubtotal - invDiscountAmount;

                    // Apply tax only if template supports it
                    const invTaxAmount = invoiceSupportsTax && linkedInvoice.taxPercent > 0
                        ? invTaxableAmount * (linkedInvoice.taxPercent / 100)
                        : 0;

                    invoiceTotal = invTaxableAmount + invTaxAmount;
                }

                const totalPaid = hubId ? getTotalPaidForInvoice(hubId) : 0;
                const remainingBalance = Math.max(0, invoiceTotal - totalPaid);
                const canAddMoreReceipts = supportsReceipt && remainingBalance > 0;

                return (
                    <div className="flex items-center gap-2 mb-8 flex-wrap">
                        {/* Invoice Tab */}
                        {linkedInvoice && (
                            <button
                                onClick={() => router.push(`/invoices/${linkedInvoice!.id}`)}
                                className={`
                                    flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold tracking-tight transition-all shadow-sm
                                    ${doc.type === 'invoice' && doc.id === linkedInvoice.id
                                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-neutral-500/10 z-10'
                                        : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                                    }
                                `}
                            >
                                <FileText className="w-4 h-4" />
                                Invoice
                            </button>
                        )}

                        {/* Receipt Tabs - Multiple Receipts */}
                        {linkedReceipts.map((receipt, index) => {
                            const isActive = doc.type === 'receipt' && doc.id === receipt.id;
                            const label = linkedReceipts.length > 1 ? `Payment ${index + 1}` : 'Receipt';

                            return (
                                <button
                                    key={receipt.id}
                                    onClick={() => router.push(`/receipts/${receipt.id}`)}
                                    className={`
                                        flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold tracking-tight transition-all shadow-sm
                                        ${isActive
                                            ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-neutral-500/10 z-10'
                                            : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                                        }
                                    `}
                                >
                                    <Receipt className="w-4 h-4" />
                                    {label}
                                </button>
                            );
                        })}

                        {/* Delivery Note Tab */}
                        {linkedDelivery && (
                            <button
                                onClick={() => router.push(`/delivery-notes/${linkedDelivery!.id}`)}
                                className={`
                                    flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold tracking-tight transition-all shadow-sm
                                    ${doc.type === 'delivery-note' && doc.id === linkedDelivery.id
                                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-neutral-500/10 z-10'
                                        : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                                    }
                                `}
                            >
                                <Truck className="w-4 h-4" />
                                Delivery Note
                            </button>
                        )}

                        {/* Add Button - Always show if there are options */}
                        {(canAddMoreReceipts || (supportsDelivery && !linkedDelivery)) && (
                            <div className="relative group">
                                <button className="w-8 h-8 flex items-center justify-center rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all shadow-sm">
                                    <Plus className="w-5 h-5" />
                                </button>

                                {/* Dropdown Menu */}
                                <div className="absolute left-0 top-full mt-2 w-64 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-100 dark:border-neutral-700 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-left z-50 overflow-hidden">
                                    <div className="p-1.5 space-y-0.5">
                                        <div className="px-3 py-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                                            Create Linked Document
                                        </div>

                                        {/* Add Receipt Option */}
                                        {canAddMoreReceipts && (
                                            <button
                                                onClick={() => router.push(`/receipts/new?sourceId=${sourceIdForNew}&fromType=${doc.type}`)}
                                                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors text-left"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                                                        <Receipt className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-neutral-900 dark:text-neutral-100 block">
                                                            {linkedReceipts.length > 0 ? `Add Payment ${linkedReceipts.length + 1}` : 'Create Receipt'}
                                                        </span>
                                                        <span className="text-xs text-neutral-500">
                                                            Remaining: {formatCurrency(remainingBalance, company.currency)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <Plus className="w-3.5 h-3.5 text-neutral-400" />
                                            </button>
                                        )}

                                        {/* Add Delivery Note Option */}
                                        {supportsDelivery && !linkedDelivery && (
                                            <button
                                                onClick={() => router.push(`/delivery-notes/new?sourceId=${sourceIdForNew}&fromType=${doc.type}`)}
                                                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors text-left"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div className="p-1.5 rounded-md bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                                                        <Truck className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-medium text-neutral-900 dark:text-neutral-100">
                                                        Delivery Note
                                                    </span>
                                                </div>
                                                <Plus className="w-3.5 h-3.5 text-neutral-400" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Paid Badge - Show when fully paid */}
                        {linkedInvoice && remainingBalance === 0 && linkedReceipts.length > 0 && (
                            <span className="ml-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-semibold">
                                ✓ Fully Paid
                            </span>
                        )}
                    </div>
                );
            })()}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Preview */}
                <div className="lg:col-span-2">
                    <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden min-h-[600px]">
                        {template ? (
                            <DocumentPreviewWrapper
                                className="bg-neutral-200 dark:bg-neutral-950/50 min-h-[600px]"
                                padding={24}
                                width={template.width || (template.orientation === 'landscape' ? 842 : 595)}
                                height={template.height || (template.orientation === 'landscape' ? 595 : 842)}
                            >
                                <DocumentRenderer template={template} data={previewData} id="document-preview" />
                            </DocumentPreviewWrapper>
                        ) : (
                            <div className="aspect-[595/842] w-full flex items-center justify-center bg-neutral-50 dark:bg-neutral-800 text-neutral-400">
                                Template not found
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column - Actions & Info */}
                <div className="space-y-6">
                    {/* Primary Actions */}
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-6">
                        <h3 className="text-sm font-semibold text-[#2d3748] dark:text-white mb-4">Actions</h3>
                        <div className="space-y-2">
                            {doc.status !== 'paid' && type === 'invoice' && (
                                <Button fullWidth variant="primary" leftIcon={<Check className="w-4 h-4" />} onClick={handleMarkAsPaid}>
                                    Mark as Paid
                                </Button>
                            )}
                            {doc.status === 'draft' && type !== 'receipt' && (
                                <Button fullWidth variant="outline" leftIcon={<Send className="w-4 h-4" />} onClick={handleMarkAsSent}>
                                    Mark as Sent
                                </Button>
                            )}
                            <Button fullWidth variant="outline" leftIcon={<Copy className="w-4 h-4" />} onClick={handleDuplicate}>
                                Duplicate
                            </Button>
                            <Button fullWidth variant="danger" leftIcon={<Trash2 className="w-4 h-4" />} onClick={() => setIsDeleteModalOpen(true)}>
                                Delete
                            </Button>
                        </div>
                    </div>

                    {/* Details Card */}
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-6">
                        <h3 className="text-sm font-semibold text-[#2d3748] dark:text-white mb-4">Details</h3>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <User className="w-4 h-4 text-neutral-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Customer</p>
                                    <p className="text-sm font-medium text-[#2d3748] dark:text-white">{doc.customerName}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Calendar className="w-4 h-4 text-neutral-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Date</p>
                                    <p className="text-sm font-medium text-[#2d3748] dark:text-white">{formatDate(doc.date)}</p>
                                </div>
                            </div>
                            {doc.dueDate && (
                                <div className="flex items-start gap-3">
                                    <Calendar className="w-4 h-4 text-neutral-400 mt-0.5" />
                                    <div>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Due Date</p>
                                        <p className="text-sm font-medium text-[#2d3748] dark:text-white">{formatDate(doc.dueDate)}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title={`Delete ${type === 'delivery-note' ? 'Delivery Note' : type.charAt(0).toUpperCase() + type.slice(1)}`}
                size="sm"
            >
                <div className="p-1">
                    <p className="text-neutral-600 dark:text-neutral-300 mb-6">
                        Are you sure you want to delete <span className="font-semibold text-[#2d3748] dark:text-white">{doc.documentNumber}</span>? This action cannot be undone.
                    </p>
                    <ModalFooter>
                        <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                        <Button variant="danger" onClick={handleDelete}>Delete Permanently</Button>
                    </ModalFooter>
                </div>
            </Modal>
        </div>
    );
}
