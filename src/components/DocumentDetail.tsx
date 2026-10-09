"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDocumentStore, useTemplateStore, useCustomerStore, useSettingsStore } from '@/lib/store';
import { formatCurrency, formatDate, downloadPdf, downloadPng, printDocument, shareDocument, formatAmountInWords, capturePreviewAsCanvas } from '@/lib/utils';
import { Button, Modal, ModalFooter, Tag } from '@/components/ui';
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
    Image,
    Plus,
    Share2,
    RotateCcw
} from '@/components/icons';

interface DocumentDetailProps {
    type: DocumentType;
    documentId: string;
    backUrl: string;
}

const statusTagVariant: Record<string, 'neutral' | 'info' | 'warning' | 'success' | 'danger'> = {
    'draft': 'neutral',
    'sent': 'info',
    'paid': 'success',
    'partially_paid': 'warning',
    'overdue': 'danger',
    'cancelled': 'neutral',
};

const statusLabel: Record<string, string> = {
    'draft': 'Draft',
    'sent': 'Sent',
    'paid': 'Paid',
    'partially_paid': 'Partial',
    'overdue': 'Overdue',
    'cancelled': 'Cancelled',
};

export default function DocumentDetail({ type, documentId, backUrl }: DocumentDetailProps) {
    const router = useRouter();
    const { getDocumentById, updateDocument, deleteDocument, duplicateDocument, convertDocument, refundDocument } = useDocumentStore();
    const { getTemplateById } = useTemplateStore();
    const { getCustomerById } = useCustomerStore();
    const { company } = useSettingsStore();

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
    const [refundReason, setRefundReason] = useState('');
    const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Loading states for actions
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
    const [isDownloadingPng, setIsDownloadingPng] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);

    // Multi-page PDF download states
    const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
    const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Get document
    const doc = getDocumentById(documentId);

    // Get template with Connected Logic
    const rawTemplate = doc ? getTemplateById(doc.templateId) : null;

    const template = (rawTemplate && doc && rawTemplate.mode === 'connected' && rawTemplate.variants?.[doc.type])
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

    // Gather all documents linked to the same Hub
    const hubId = doc ? (doc.type === 'invoice' ? doc.id : doc.sourceDocumentId) : undefined;
    const allDocs = useDocumentStore(state => state.documents);

    // Linked Invoice
    const linkedInvoice = doc ? (doc.type === 'invoice' ? doc : (hubId ? allDocs.find(d => d.id === hubId && d.type === 'invoice') : null)) : null;

    // Linked Receipts
    const linkedReceipts = doc ? (hubId
        ? allDocs.filter(d => d.sourceDocumentId === hubId && d.type === 'receipt')
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        : []) : [];
    if (doc && doc.type === 'receipt' && !linkedReceipts.find(r => r.id === doc.id)) {
        linkedReceipts.push(doc);
    }

    // Linked Delivery Note
    const linkedDelivery = doc ? (doc.type === 'delivery-note' ? doc : (hubId ? allDocs.find(d => d.sourceDocumentId === hubId && d.type === 'delivery-note') : null)) : null;

    const allLinkedDocs = [
        linkedInvoice,
        ...linkedReceipts,
        linkedDelivery
    ].filter(Boolean) as any[];

    // Template resolver for exporting different linked docs
    const getTemplateForDoc = (targetDoc: any) => {
        const rawT = getTemplateById(targetDoc.templateId);
        const docType = targetDoc.type as DocumentType;
        return (rawT && rawT.mode === 'connected' && rawT.variants?.[docType])
            ? {
                ...rawT,
                imageUrl: rawT.variants[docType]!.imageUrl,
                fields: rawT.variants[docType]!.fields,
                width: rawT.variants[docType]!.width,
                height: rawT.variants[docType]!.height,
                orientation: rawT.variants[docType]!.orientation
            }
            : rawT;
    };

    // Data resolver for rendering preview of different linked docs
    const getPreviewDataForDoc = (targetDoc: any) => {
        const docCustomer = getCustomerById(targetDoc.customerId);
        
        const docTemplate = getTemplateById(targetDoc.templateId);
        const hasLineItems = docTemplate?.fields?.some(f => f.type === 'line-items') ?? (targetDoc.lineItems && targetDoc.lineItems.length > 0);
        const hasDiscount = docTemplate?.fields?.some(f => f.type === 'discount') ?? true;
        const hasTax = docTemplate?.fields?.some(f => f.type === 'tax') ?? true;

        const subtotal = hasLineItems
            ? targetDoc.lineItems.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0)
            : targetDoc.subtotal;

        const discountAmount = hasDiscount ? subtotal * (targetDoc.discountPercent / 100) : 0;
        const taxableAmount = subtotal - discountAmount;
        const taxAmount = hasTax ? taxableAmount * (targetDoc.taxPercent / 100) : 0;
        const grandTotal = subtotal - discountAmount + taxAmount;

        const amountPaidInWords = targetDoc.customValues?.amountPaidInWords || formatAmountInWords(targetDoc.amountPaid || 0, company.currency);

        return {
            documentNumber: targetDoc.documentNumber,
            date: targetDoc.date,
            dueDate: targetDoc.dueDate,
            customerName: targetDoc.customerName,
            customerEmail: docCustomer?.email,
            customerPhone: docCustomer?.phone,
            customerAddress: docCustomer?.address,
            lineItems: targetDoc.lineItems,
            subtotal,
            discountAmount,
            discountName: targetDoc.discountName,
            taxAmount,
            grandTotal,
            notes: targetDoc.notes,
            customValues: targetDoc.customValues,
            amountInWords: formatAmountInWords(grandTotal, company.currency),
            amountPaid: targetDoc.amountPaid,
            amountPaidInWords,
            amountDue: targetDoc.amountDue ?? (grandTotal - (targetDoc.amountPaid || 0)),
        };
    };

    // Generate multi-page PDF bundle
    const generateMultiPagePdf = async (selectedIds: string[]) => {
        setIsDownloadingPdf(true);
        const toastId = toast.loading('Generating PDF bundle...');

        try {
            const jsPDF = (await import('jspdf')).default;
            const pxToMm = 0.352778;

            let pdfInstance: any = null;

            for (let i = 0; i < selectedIds.length; i++) {
                const id = selectedIds[i];
                const elementId = `export-preview-${id}`;
                
                await new Promise(resolve => setTimeout(resolve, 300));
                
                const element = document.getElementById(elementId);
                if (!element) continue;

                const widthMm = element.offsetWidth * pxToMm;
                const heightMm = element.offsetHeight * pxToMm;

                const canvas = await capturePreviewAsCanvas(elementId);
                const imgData = canvas.toDataURL('image/png', 1.0);

                if (!pdfInstance) {
                    pdfInstance = new jsPDF({
                        orientation: widthMm > heightMm ? 'landscape' : 'portrait',
                        unit: 'mm',
                        format: [widthMm, heightMm],
                        compress: true,
                    });
                } else {
                    pdfInstance.addPage([widthMm, heightMm], widthMm > heightMm ? 'landscape' : 'portrait');
                }

                pdfInstance.addImage(imgData, 'PNG', 0, 0, widthMm, heightMm);

                const linkElements = element.querySelectorAll('[data-pdf-link]');
                linkElements.forEach((el) => {
                    const url = (el as HTMLElement).getAttribute('data-pdf-link');
                    if (!url) return;

                    const rect = el.getBoundingClientRect();
                    const parentRect = element.getBoundingClientRect();

                    const relX = (rect.left - parentRect.left) / parentRect.width;
                    const relY = (rect.top - parentRect.top) / parentRect.height;
                    const relW = rect.width / parentRect.width;
                    const relH = rect.height / parentRect.height;

                    const xMm = relX * widthMm;
                    const yMm = relY * heightMm;
                    const wMm = relW * widthMm;
                    const hMm = relH * heightMm;

                    pdfInstance.link(xMm, yMm, wMm, hMm, { url });
                });
            }

            if (pdfInstance) {
                const filename = selectedIds.length === 1 
                    ? allLinkedDocs.find(d => d.id === selectedIds[0])?.documentNumber || 'document'
                    : `${doc!.documentNumber}_bundle`;
                
                const sanitizeFilename = (fn: string) => fn.replace(/[\\/:*?"<>|]/g, '_').trim();
                pdfInstance.save(`${sanitizeFilename(filename)}.pdf`);
                toast.success('PDF bundle downloaded successfully', { id: toastId });
            } else {
                toast.error('No pages were generated', { id: toastId });
            }
        } catch (error) {
            console.error('Multi-page PDF generation failed:', error);
            toast.error('Failed to generate PDF bundle', { id: toastId });
        } finally {
            setIsDownloadingPdf(false);
        }
    };

    if (!mounted) {
        return <div className="max-w-7xl mx-auto py-12 flex justify-center items-center min-h-[400px]">
            <div className="animate-pulse flex flex-col items-center space-y-4">
                <div className="h-4 w-32 bg-paper-2 rounded"></div>
                <div className="h-10 w-48 bg-paper-2 rounded"></div>
            </div>
        </div>;
    }

    if (!doc) {
        return (
            <div className="max-w-4xl mx-auto py-12 text-center panel p-8 space-y-4">
                <h2 className="text-xl font-bold text-ink">Document Not Found</h2>
                <Link href={backUrl}>
                    <Button variant="outline" leftIcon={<ArrowLeft className="size-4" />}>
                        Go Back
                    </Button>
                </Link>
            </div>
        );
    }

    const hasLineItems = template?.fields?.some(f => f.type === 'line-items') ?? (doc.lineItems && doc.lineItems.length > 0 && doc.lineItems[0].productName !== '');
    const hasDiscount = template?.fields?.some(f => f.type === 'discount') ?? true;
    const hasTax = template?.fields?.some(f => f.type === 'tax') ?? true;

    const calculatedSubtotal = hasLineItems
        ? doc.lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
        : doc.subtotal;

    const calculatedDiscountAmount = hasDiscount
        ? calculatedSubtotal * (doc.discountPercent / 100)
        : 0;

    const taxableAmount = calculatedSubtotal - calculatedDiscountAmount;
    const calculatedTaxAmount = hasTax
        ? taxableAmount * (doc.taxPercent / 100)
        : 0;

    const calculatedGrandTotal = calculatedSubtotal - calculatedDiscountAmount + calculatedTaxAmount;

    const previewData: DocumentData = {
        documentNumber: doc.documentNumber,
        date: doc.date,
        dueDate: doc.dueDate,
        customerName: doc.customerName,
        customerEmail: customer?.email,
        customerPhone: customer?.phone,
        customerAddress: customer?.address,
        lineItems: doc.lineItems,
        subtotal: calculatedSubtotal,
        discountAmount: calculatedDiscountAmount,
        taxAmount: calculatedTaxAmount,
        grandTotal: calculatedGrandTotal,
        notes: doc.notes,
        customValues: doc.customValues,
        amountInWords: formatAmountInWords(calculatedGrandTotal, company.currency),
        amountPaid: doc.amountPaid,
        amountDue: doc.amountDue ?? (calculatedGrandTotal - (doc.amountPaid || 0)),
    };

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

    const handleDownloadClick = () => {
        if (allLinkedDocs.length > 1) {
            setSelectedDocIds(allLinkedDocs.map(d => d.id));
            setIsDownloadModalOpen(true);
        } else {
            handleDownload();
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
                        className="p-2 rounded-ctl text-ink-muted hover:text-ink hover:bg-ground transition-colors"
                    >
                        <ArrowLeft className="size-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-mono font-bold text-ink">{doc.documentNumber}</h1>
                            <Tag variant={statusTagVariant[doc.status] || 'neutral'}>
                                {statusLabel[doc.status] || doc.status}
                            </Tag>
                        </div>
                        <p className="text-sm font-mono text-ink-muted mt-1">
                            Created on {formatDate(doc.createdAt)}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Button
                        variant="primary"
                        leftIcon={<Share2 className="size-4" />}
                        onClick={() => shareDocument('document-preview', doc.documentNumber, type.toUpperCase())}
                        disabled={isDownloadingPdf || isDownloadingPng || isPrinting}
                    >
                        Share
                    </Button>
                    <Link href={`/${type}s/${documentId}/edit`}>
                        <Button variant="outline" leftIcon={<Edit2 className="size-4" />}>
                            Edit
                        </Button>
                    </Link>
                    <Button
                        variant="outline"
                        leftIcon={<Download className="size-4" />}
                        onClick={handleDownloadClick}
                        isLoading={isDownloadingPdf}
                        disabled={isDownloadingPdf || isDownloadingPng || isPrinting}
                    >
                        PDF
                    </Button>
                    <Button
                        variant="outline"
                        leftIcon={<Image className="size-4" />}
                        onClick={handleDownloadPng}
                        isLoading={isDownloadingPng}
                        disabled={isDownloadingPdf || isDownloadingPng || isPrinting}
                    >
                        PNG
                    </Button>
                    <Button
                        variant="outline"
                        leftIcon={<Printer className="size-4" />}
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
                const hubId = doc.type === 'invoice' ? doc.id : doc.sourceDocumentId;
                const sourceIdForNew = hubId || doc.id;

                const supportsReceipt = rawTemplate?.type === 'receipt' || !!rawTemplate?.variants?.['receipt'];
                const supportsDelivery = rawTemplate?.type === 'delivery-note' || !!rawTemplate?.variants?.['delivery-note'];

                if (!supportsReceipt && !supportsDelivery) return null;

                const { getTotalPaidForInvoice } = useDocumentStore.getState();

                let invoiceTotal = 0;
                if (linkedInvoice) {
                    const invoiceTemplate = getTemplateById(linkedInvoice.templateId);
                    const invoiceSupportsTax = invoiceTemplate?.fields.some(f => f.type === 'tax') ?? false;
                    const invoiceSupportsDiscount = invoiceTemplate?.fields.some(f => f.type === 'discount') ?? false;

                    const invSubtotal = linkedInvoice.lineItems.reduce((sum, item) =>
                        sum + (item.quantity * item.unitPrice), 0);

                    const invDiscountAmount = invoiceSupportsDiscount && linkedInvoice.discountPercent > 0
                        ? invSubtotal * (linkedInvoice.discountPercent / 100)
                        : 0;
                    const invTaxableAmount = invSubtotal - invDiscountAmount;

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
                                    flex items-center gap-2 px-4 py-2 rounded-tag text-sm font-medium transition-colors
                                    ${doc.type === 'invoice' && doc.id === linkedInvoice.id
                                        ? 'bg-primary-500 text-on-primary font-bold'
                                        : 'bg-paper-2 text-ink-muted border border-line hover:text-ink hover:bg-ground'
                                    }
                                `}
                            >
                                <FileText className="size-4" />
                                Invoice
                            </button>
                        )}

                        {/* Receipt Tabs */}
                        {linkedReceipts.map((receipt, index) => {
                            const isActive = doc.type === 'receipt' && doc.id === receipt.id;
                            const label = linkedReceipts.length > 1 ? `Payment ${index + 1}` : 'Receipt';

                            return (
                                <button
                                    key={receipt.id}
                                    onClick={() => router.push(`/receipts/${receipt.id}`)}
                                    className={`
                                        flex items-center gap-2 px-4 py-2 rounded-tag text-sm font-medium transition-colors
                                        ${isActive
                                            ? 'bg-primary-500 text-on-primary font-bold'
                                            : 'bg-paper-2 text-ink-muted border border-line hover:text-ink hover:bg-ground'
                                        }
                                    `}
                                >
                                    <Receipt className="size-4" />
                                    {label}
                                </button>
                            );
                        })}

                        {/* Delivery Note Tab */}
                        {linkedDelivery && (
                            <button
                                onClick={() => router.push(`/delivery-notes/${linkedDelivery!.id}`)}
                                className={`
                                    flex items-center gap-2 px-4 py-2 rounded-tag text-sm font-medium transition-colors
                                    ${doc.type === 'delivery-note' && doc.id === linkedDelivery.id
                                        ? 'bg-primary-500 text-on-primary font-bold'
                                        : 'bg-paper-2 text-ink-muted border border-line hover:text-ink hover:bg-ground'
                                    }
                                `}
                            >
                                <Truck className="size-4" />
                                Delivery Note
                            </button>
                        )}

                        {/* Add Button */}
                        {(canAddMoreReceipts || (supportsDelivery && !linkedDelivery)) && (
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                                    className={`size-8 flex items-center justify-center rounded-tag border transition-colors ${
                                        isAddMenuOpen
                                            ? 'bg-primary-500/10 border-primary-500 text-primary-500'
                                            : 'bg-paper-2 border-line text-ink-muted hover:text-ink hover:border-primary-500'
                                    }`}
                                    title="Create Linked Document"
                                >
                                    <Plus className="size-4" />
                                </button>

                                {/* Backdrop overlay for closing dropdown on click outside */}
                                {isAddMenuOpen && (
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setIsAddMenuOpen(false)}
                                    />
                                )}

                                {/* Dropdown Menu */}
                                <div
                                    className={`absolute left-0 top-full mt-2 w-64 panel shadow-xl transition-all duration-200 z-50 overflow-hidden ${
                                        isAddMenuOpen ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95 pointer-events-none'
                                    }`}
                                >
                                    <div className="p-1.5 space-y-0.5">
                                        <div className="px-3 py-1.5 text-xs font-mono font-medium text-ink-muted uppercase tracking-wider">
                                            Create Linked Document
                                        </div>

                                        {canAddMoreReceipts && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsAddMenuOpen(false);
                                                    router.push(`/receipts/new?sourceId=${sourceIdForNew}&fromType=${doc.type}`);
                                                }}
                                                className="w-full flex items-center justify-between px-3 py-2 rounded-ctl text-sm hover:bg-ground transition-colors text-left"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div className="p-1.5 rounded-ctl bg-emerald-500/10 text-emerald-600">
                                                        <Receipt className="size-4" />
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-ink block">
                                                            {linkedReceipts.length > 0 ? `Add Payment ${linkedReceipts.length + 1}` : 'Create Receipt'}
                                                        </span>
                                                        <span className="text-xs font-mono text-ink-muted">
                                                            Remaining: {formatCurrency(remainingBalance, company.currency)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <Plus className="size-3.5 text-ink-muted" />
                                            </button>
                                        )}

                                        {supportsDelivery && !linkedDelivery && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsAddMenuOpen(false);
                                                    router.push(`/delivery-notes/new?sourceId=${sourceIdForNew}&fromType=${doc.type}`);
                                                }}
                                                className="w-full flex items-center justify-between px-3 py-2 rounded-ctl text-sm hover:bg-ground transition-colors text-left"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div className="p-1.5 rounded-ctl bg-primary-500/10 text-primary-500">
                                                        <Truck className="size-4" />
                                                    </div>
                                                    <span className="font-medium text-ink">
                                                        Delivery Note
                                                    </span>
                                                </div>
                                                <Plus className="size-3.5 text-ink-muted" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {linkedInvoice && remainingBalance === 0 && linkedReceipts.length > 0 && (
                            <Tag variant="success" className="ml-2">
                                Fully Paid
                            </Tag>
                        )}
                    </div>
                );
            })()}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Preview */}
                <div className="lg:col-span-2">
                    <div className="panel overflow-hidden min-h-[600px] bg-ground">
                        {template ? (
                            <DocumentPreviewWrapper
                                className="min-h-[600px] p-6"
                                padding={24}
                                width={template.width || (template.orientation === 'landscape' ? 842 : 595)}
                                height={template.height || (template.orientation === 'landscape' ? 595 : 842)}
                            >
                                <DocumentRenderer template={template} data={previewData} id="document-preview" />
                            </DocumentPreviewWrapper>
                        ) : (
                            <div className="aspect-[595/842] w-full flex items-center justify-center text-ink-muted text-sm font-mono">
                                Template not found
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column - Actions & Info */}
                <div className="space-y-6">
                    {/* Primary Actions */}
                    <div className="panel p-6 space-y-4">
                        <h3 className="text-sm font-mono font-medium text-ink-muted uppercase tracking-wider">Actions</h3>
                        <div className="space-y-2">
                            {doc.status !== 'paid' && type === 'invoice' && (
                                <Button fullWidth variant="primary" leftIcon={<Check className="size-4" />} onClick={handleMarkAsPaid}>
                                    Mark as Paid
                                </Button>
                            )}
                            {doc.status === 'draft' && type !== 'receipt' && (
                                <Button fullWidth variant="outline" leftIcon={<Send className="size-4" />} onClick={handleMarkAsSent}>
                                    Mark as Sent
                                </Button>
                            )}
                            {doc.status !== 'cancelled' && (
                                <Button fullWidth variant="outline" leftIcon={<RotateCcw className="size-4 text-amber-500" />} onClick={() => setIsRefundModalOpen(true)}>
                                    Process Return / Refund
                                </Button>
                            )}
                            <Button fullWidth variant="outline" leftIcon={<Copy className="size-4" />} onClick={handleDuplicate}>
                                Duplicate
                            </Button>
                            <Button fullWidth variant="danger" leftIcon={<Trash2 className="size-4" />} onClick={() => setIsDeleteModalOpen(true)}>
                                Delete
                            </Button>
                        </div>
                    </div>

                    {/* Refund Confirmation Modal */}
                    <Modal
                        isOpen={isRefundModalOpen}
                        onClose={() => setIsRefundModalOpen(false)}
                        title={`Process Return / Refund (${doc.documentNumber})`}
                        size="md"
                    >
                        <div className="space-y-4 py-2">
                            <p className="text-xs text-ink-muted leading-relaxed">
                                Processing a return will mark this {doc.type} as <strong>Cancelled/Refunded</strong> and automatically restore inventory stock for all returned line items.
                            </p>
                            <div>
                                <label className="block text-xs font-mono font-medium text-ink mb-1">
                                    Reason for Return / Notes (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={refundReason}
                                    onChange={(e) => setRefundReason(e.target.value)}
                                    placeholder="e.g. Customer returned damaged packaging, size exchange..."
                                    className="w-full px-3 py-2 bg-ground border border-line rounded-ctl text-xs text-ink focus:outline-none focus:border-primary-500 font-sans"
                                />
                            </div>
                        </div>
                        <ModalFooter>
                            <Button variant="outline" onClick={() => setIsRefundModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                onClick={() => {
                                    refundDocument(doc.id, refundReason);
                                    toast.success(`${doc.documentNumber} refunded and inventory restored`);
                                    setIsRefundModalOpen(false);
                                }}
                            >
                                Confirm Refund & Restore Stock
                            </Button>
                        </ModalFooter>
                    </Modal>

                    {/* Details Card */}
                    <div className="panel p-6 space-y-4">
                        <h3 className="text-sm font-mono font-medium text-ink-muted uppercase tracking-wider">Details</h3>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <User className="size-4 text-ink-muted mt-0.5" />
                                <div>
                                    <p className="text-xs text-ink-muted">Customer</p>
                                    <p className="text-sm font-medium text-ink">{doc.customerName}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Calendar className="size-4 text-ink-muted mt-0.5" />
                                <div>
                                    <p className="text-xs text-ink-muted">Date</p>
                                    <p className="text-sm font-mono font-medium text-ink">{formatDate(doc.date)}</p>
                                </div>
                            </div>
                            {doc.dueDate && (
                                <div className="flex items-start gap-3">
                                    <Calendar className="size-4 text-ink-muted mt-0.5" />
                                    <div>
                                        <p className="text-xs text-ink-muted">Due Date</p>
                                        <p className="text-sm font-mono font-medium text-ink">{formatDate(doc.dueDate)}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden export containers */}
            {isDownloadingPdf && (
                <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '2000px', height: '2000px', pointerEvents: 'none', overflow: 'hidden' }}>
                    {allLinkedDocs.map((linkedDoc) => (
                        <div 
                            key={linkedDoc.id} 
                            id={`export-preview-${linkedDoc.id}`}
                            style={{ 
                                width: `${getTemplateForDoc(linkedDoc)?.width || (getTemplateForDoc(linkedDoc)?.orientation === 'landscape' ? 842 : 595)}px`,
                                height: `${getTemplateForDoc(linkedDoc)?.height || (getTemplateForDoc(linkedDoc)?.orientation === 'landscape' ? 595 : 842)}px`,
                                background: '#ffffff',
                                overflow: 'hidden',
                                display: 'block'
                            }}
                        >
                            <DocumentRenderer
                                template={getTemplateForDoc(linkedDoc)!}
                                data={getPreviewDataForDoc(linkedDoc)}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* PDF Bundle Download Modal */}
            <Modal
                isOpen={isDownloadModalOpen}
                onClose={() => setIsDownloadModalOpen(false)}
                title="Download PDF"
                size="md"
            >
                <div className="space-y-4 py-2">
                    <p className="text-sm text-ink-muted">
                        This document has multiple linked records. Select the documents you want to export into a single PDF bundle:
                    </p>

                    <div className="space-y-2.5 max-h-[40dvh] overflow-y-auto pr-1">
                        {allLinkedDocs.map((linkedDoc) => {
                            const isSelected = selectedDocIds.includes(linkedDoc.id);
                            
                            let icon = <FileText className="size-5 text-primary-500" />;
                            let label = linkedDoc.documentNumber;
                            let subLabel = 'Invoice';
                            
                            if (linkedDoc.type === 'receipt') {
                                icon = <Receipt className="size-5 text-emerald-600" />;
                                const rIndex = linkedReceipts.findIndex(r => r.id === linkedDoc.id);
                                subLabel = linkedReceipts.length > 1 ? `Payment ${rIndex + 1}` : 'Receipt';
                            } else if (linkedDoc.type === 'delivery-note') {
                                icon = <Truck className="size-5 text-amber-600" />;
                                subLabel = 'Delivery Note';
                            }

                            return (
                                <label
                                    key={linkedDoc.id}
                                    className={`
                                        flex items-center justify-between p-3.5 rounded-ctl border cursor-pointer transition-colors bg-ground
                                        ${isSelected 
                                            ? 'border-primary-500 bg-primary-500/10' 
                                            : 'border-line hover:border-ink-muted'
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-ctl bg-paper flex items-center justify-center border border-line">
                                            {icon}
                                        </div>
                                        <div>
                                            <div className="text-sm font-mono font-bold text-ink">
                                                {label}
                                            </div>
                                            <div className="text-xs text-ink-muted font-medium">
                                                {subLabel}
                                            </div>
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => {
                                            if (isSelected) {
                                                setSelectedDocIds(prev => prev.filter(id => id !== linkedDoc.id));
                                            } else {
                                                setSelectedDocIds(prev => [...prev, linkedDoc.id]);
                                            }
                                        }}
                                        className="size-4 text-primary-500 border-line rounded focus:ring-primary-500"
                                    />
                                </label>
                            );
                        })}
                    </div>
                </div>
                <ModalFooter>
                    <Button variant="ghost" onClick={() => setIsDownloadModalOpen(false)}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={() => {
                            setIsDownloadModalOpen(false);
                            generateMultiPagePdf(selectedDocIds);
                        }}
                        disabled={selectedDocIds.length === 0}
                    >
                        Download PDF Bundle
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Delete Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title={`Delete ${type === 'delivery-note' ? 'Delivery Note' : type.charAt(0).toUpperCase() + type.slice(1)}`}
                size="sm"
            >
                <div className="p-1">
                    <p className="text-ink-muted text-sm mb-6">
                        Are you sure you want to delete <span className="font-mono font-bold text-ink">{doc.documentNumber}</span>? This action cannot be undone.
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

