"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
    X, 
    FileText, 
    Receipt, 
    Truck, 
    CheckCircle2, 
    Clock, 
    AlertCircle, 
    Plus, 
    ArrowRight,
    ShoppingBag,
    Zap,
    ExternalLink,
    Calendar,
    User,
    DollarSign
} from 'lucide-react';
import { useTransactionStore, useDocumentStore, useSettingsStore } from '@/lib/store';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Transaction, DocumentType } from '@/lib/types';
import toast from 'react-hot-toast';

interface TransactionDetailModalProps {
    transactionId: string | null;
    onClose: () => void;
}

export default function TransactionDetailModal({ transactionId, onClose }: TransactionDetailModalProps) {
    const router = useRouter();
    const { getTransactionById, updatePaymentStatus, updateFulfillmentStatus } = useTransactionStore();
    const { documents, convertDocument, getDocumentById } = useDocumentStore();
    const { company } = useSettingsStore();

    if (!transactionId) return null;

    const transaction = getTransactionById(transactionId);
    if (!transaction) return null;

    const currency = company.currency || 'USD';

    // Find linked document objects
    const linkedInvoice = transaction.invoiceId ? getDocumentById(transaction.invoiceId) : undefined;
    const linkedReceipts = (transaction.receiptIds || [])
        .map(id => getDocumentById(id))
        .filter((d): d is NonNullable<typeof d> => Boolean(d));
    const linkedDeliveryNotes = (transaction.deliveryNoteIds || [])
        .map(id => getDocumentById(id))
        .filter((d): d is NonNullable<typeof d> => Boolean(d));

    // Handle Quick Conversion
    const handleGenerateDocument = (targetType: DocumentType) => {
        try {
            if (transaction.invoiceId) {
                const newDoc = convertDocument(transaction.invoiceId, targetType);
                toast.success(`Generated ${targetType === 'receipt' ? 'Receipt' : 'Delivery Note'} ${newDoc.documentNumber}`);
                if (targetType === 'receipt') {
                    updatePaymentStatus(transaction.id, 'paid');
                } else if (targetType === 'delivery-note') {
                    updateFulfillmentStatus(transaction.id, 'fulfilled');
                }
            } else if (linkedReceipts.length > 0) {
                const newDoc = convertDocument(linkedReceipts[0].id, targetType);
                toast.success(`Generated ${targetType === 'receipt' ? 'Receipt' : 'Delivery Note'} ${newDoc.documentNumber}`);
            } else {
                toast.error('No base document available to generate from.');
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to generate document');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
            <div 
                className="bg-white dark:bg-neutral-800 rounded-3xl border border-neutral-100 dark:border-neutral-700 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col my-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-neutral-100 dark:border-neutral-700 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-neutral-800/90 backdrop-blur-md z-20">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-700/60 flex items-center justify-center text-[#2d3748] dark:text-white font-bold text-lg">
                            TRX
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold text-[#2d3748] dark:text-white">
                                    {transaction.transactionNumber}
                                </h2>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                                    transaction.source === 'storefront' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                                    transaction.source === 'pos' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                                    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                }`}>
                                    {transaction.source}
                                </span>
                            </div>
                            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5 flex items-center gap-3">
                                <span className="flex items-center gap-1">
                                    <User className="w-3.5 h-3.5" />
                                    {transaction.customerName}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {formatDate(transaction.date)}
                                </span>
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-neutral-400 hover:text-neutral-600 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-8 flex-1">
                    {/* Lifecycle Pipeline Visual Stepper */}
                    <div className="bg-neutral-50 dark:bg-neutral-900/40 p-6 rounded-2xl border border-neutral-100 dark:border-neutral-700/60">
                        <h4 className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-4">
                            Transaction Lifecycle Flow
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
                            {/* Step 1: Invoice */}
                            <div className="flex items-center gap-3 bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200/60 dark:border-neutral-700 shadow-sm">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    transaction.invoiceId ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-400'
                                }`}>
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs text-neutral-400 font-medium">1. Invoice</p>
                                    <p className="text-sm font-semibold text-[#2d3748] dark:text-white truncate">
                                        {transaction.invoiceNumber || 'No Invoice'}
                                    </p>
                                </div>
                                {transaction.invoiceId && (
                                    <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
                                )}
                            </div>

                            {/* Step 2: Payment Receipt */}
                            <div className="flex items-center gap-3 bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200/60 dark:border-neutral-700 shadow-sm">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    transaction.paymentStatus === 'paid' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' : 
                                    transaction.paymentStatus === 'partially_paid' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400' : 
                                    'bg-neutral-100 dark:bg-neutral-700 text-neutral-400'
                                }`}>
                                    <Receipt className="w-5 h-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs text-neutral-400 font-medium">2. Payment</p>
                                    <p className="text-sm font-semibold text-[#2d3748] dark:text-white truncate">
                                        {transaction.paymentStatus === 'paid' ? 'Paid Full' :
                                         transaction.paymentStatus === 'partially_paid' ? 'Partial' : 'Unpaid'}
                                    </p>
                                </div>
                                {transaction.paymentStatus === 'paid' ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                ) : (
                                    <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
                                )}
                            </div>

                            {/* Step 3: Delivery Note */}
                            <div className="flex items-center gap-3 bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200/60 dark:border-neutral-700 shadow-sm">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    transaction.fulfillmentStatus === 'fulfilled' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-400'
                                }`}>
                                    <Truck className="w-5 h-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs text-neutral-400 font-medium">3. Delivery</p>
                                    <p className="text-sm font-semibold text-[#2d3748] dark:text-white truncate">
                                        {transaction.fulfillmentStatus === 'fulfilled' ? 'Fulfilled' : 'Pending Delivery'}
                                    </p>
                                </div>
                                {transaction.fulfillmentStatus === 'fulfilled' ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                ) : (
                                    <Clock className="w-5 h-5 text-neutral-400 flex-shrink-0" />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Connected Documents Section */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-bold text-[#2d3748] dark:text-white">
                                Linked Commercial Documents
                            </h4>
                            <div className="flex items-center gap-2">
                                {transaction.paymentStatus !== 'paid' && (
                                    <button
                                        onClick={() => handleGenerateDocument('receipt')}
                                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-colors"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Generate Receipt
                                    </button>
                                )}
                                {transaction.fulfillmentStatus !== 'fulfilled' && (
                                    <button
                                        onClick={() => handleGenerateDocument('delivery-note')}
                                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Generate Delivery Note
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Invoice Card */}
                            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex flex-col justify-between gap-3">
                                <div>
                                    <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                                        <span className="font-semibold text-blue-600 dark:text-blue-400">Invoice</span>
                                        {linkedInvoice ? <span>{formatDate(linkedInvoice.date)}</span> : <span>-</span>}
                                    </div>
                                    <p className="font-bold text-[#2d3748] dark:text-white text-base">
                                        {transaction.invoiceNumber || 'None'}
                                    </p>
                                </div>
                                {linkedInvoice ? (
                                    <button
                                        onClick={() => {
                                            onClose();
                                            router.push(`/invoices`);
                                        }}
                                        className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                        View Invoice Details <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                ) : (
                                    <span className="text-xs text-neutral-400 italic">No invoice generated</span>
                                )}
                            </div>

                            {/* Receipts Card */}
                            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex flex-col justify-between gap-3">
                                <div>
                                    <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">Receipt(s)</span>
                                        <span>{linkedReceipts.length} Issued</span>
                                    </div>
                                    <p className="font-bold text-[#2d3748] dark:text-white text-base truncate">
                                        {transaction.receiptNumbers?.length ? transaction.receiptNumbers.join(', ') : 'None'}
                                    </p>
                                </div>
                                {linkedReceipts.length > 0 ? (
                                    <button
                                        onClick={() => {
                                            onClose();
                                            router.push(`/receipts`);
                                        }}
                                        className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                                    >
                                        View Receipts <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                ) : (
                                    <span className="text-xs text-neutral-400 italic">Payment receipt pending</span>
                                )}
                            </div>

                            {/* Delivery Notes Card */}
                            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex flex-col justify-between gap-3">
                                <div>
                                    <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                                        <span className="font-semibold text-amber-600 dark:text-amber-400">Delivery Note(s)</span>
                                        <span>{linkedDeliveryNotes.length} Issued</span>
                                    </div>
                                    <p className="font-bold text-[#2d3748] dark:text-white text-base truncate">
                                        {transaction.deliveryNoteNumbers?.length ? transaction.deliveryNoteNumbers.join(', ') : 'None'}
                                    </p>
                                </div>
                                {linkedDeliveryNotes.length > 0 ? (
                                    <button
                                        onClick={() => {
                                            onClose();
                                            router.push(`/delivery-notes`);
                                        }}
                                        className="flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                                    >
                                        View Delivery Notes <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                ) : (
                                    <span className="text-xs text-neutral-400 italic">Delivery note pending</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Line Items Table */}
                    <div>
                        <h4 className="text-sm font-bold text-[#2d3748] dark:text-white mb-3">
                            Purchased Line Items
                        </h4>
                        <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-neutral-50 dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-500 uppercase">
                                    <tr>
                                        <th className="p-3 pl-4">Item Name</th>
                                        <th className="p-3 text-center">Qty</th>
                                        <th className="p-3 text-right">Unit Price</th>
                                        <th className="p-3 pr-4 text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/60">
                                    {transaction.lineItems.map((item, idx) => (
                                        <tr key={item.id || idx}>
                                            <td className="p-3 pl-4 font-medium text-[#2d3748] dark:text-white">
                                                {item.productName || item.description}
                                            </td>
                                            <td className="p-3 text-center text-neutral-500 dark:text-neutral-400">
                                                {item.quantity}
                                            </td>
                                            <td className="p-3 text-right text-neutral-500 dark:text-neutral-400">
                                                {formatCurrency(item.unitPrice, currency)}
                                            </td>
                                            <td className="p-3 pr-4 text-right font-semibold text-[#2d3748] dark:text-white">
                                                {formatCurrency(item.subtotal, currency)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Financial Summary Breakdown */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200/60 dark:border-neutral-700/60">
                        <div className="space-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                            {transaction.notes && (
                                <p><span className="font-semibold text-neutral-700 dark:text-neutral-300">Notes:</span> {transaction.notes}</p>
                            )}
                            <p><span className="font-semibold text-neutral-700 dark:text-neutral-300">Created:</span> {formatDate(transaction.createdAt)}</p>
                        </div>

                        <div className="w-full md:w-64 space-y-2 text-sm">
                            <div className="flex justify-between text-neutral-500 dark:text-neutral-400">
                                <span>Subtotal:</span>
                                <span className="font-medium text-[#2d3748] dark:text-white">{formatCurrency(transaction.subtotal, currency)}</span>
                            </div>
                            {transaction.discountAmount > 0 && (
                                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                                    <span>Discount:</span>
                                    <span>-{formatCurrency(transaction.discountAmount, currency)}</span>
                                </div>
                            )}
                            {transaction.taxAmount > 0 && (
                                <div className="flex justify-between text-neutral-500 dark:text-neutral-400">
                                    <span>Tax:</span>
                                    <span>+{formatCurrency(transaction.taxAmount, currency)}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold text-base text-[#2d3748] dark:text-white pt-2 border-t border-neutral-200 dark:border-neutral-700">
                                <span>Grand Total:</span>
                                <span>{formatCurrency(transaction.grandTotal, currency)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400">
                                <span>Amount Paid:</span>
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(transaction.amountPaid, currency)}</span>
                            </div>
                            {transaction.amountDue > 0 && (
                                <div className="flex justify-between text-xs text-red-500 font-medium">
                                    <span>Amount Due:</span>
                                    <span>{formatCurrency(transaction.amountDue, currency)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
