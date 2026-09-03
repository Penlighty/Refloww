import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Document, DocumentType, DocumentStatus, LineItem, DocumentFormData } from '@/lib/types';
import { useCustomerStore } from './customerStore';
import { useSettingsStore } from './settingsStore';
import { useTransactionStore } from './transactionStore';
import { getActiveOrgId, filterByActiveOrg, belongsToActiveOrg } from '@/lib/utils/orgIsolation';

interface DocumentState {
    documents: Document[];
    isLoading: boolean;
    activeDocumentId: string | null;

    // Counters for document numbers
    invoiceCounter: number;
    receiptCounter: number;
    deliveryNoteCounter: number;

    // Actions
    setActiveDocument: (id: string | null) => void;
    getFilteredDocuments: () => Document[];
    generateDocumentNumber: (type: DocumentType) => string;
    addDocument: (data: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>) => Document;
    createDocument: (type: DocumentType, data: DocumentFormData) => Document;
    updateDocument: (id: string, data: Partial<Document>) => void;
    deleteDocument: (id: string) => void;
    getDocumentById: (id: string) => Document | undefined;
    getDocumentsByType: (type: DocumentType) => Document[];
    getDocumentsByStatus: (status: DocumentStatus) => Document[];
    getDocumentsByCustomer: (customerId: string) => Document[];

    // Line items
    addLineItem: (documentId: string, item: Omit<LineItem, 'id' | 'subtotal'>) => void;
    updateLineItem: (documentId: string, itemId: string, data: Partial<LineItem>) => void;
    removeLineItem: (documentId: string, itemId: string) => void;

    // Status updates
    markAsSent: (id: string) => void;
    markAsPaid: (id: string) => void;
    markAsOverdue: (id: string) => void;

    // Conversion
    convertDocument: (id: string, toType: DocumentType) => Document;
    duplicateDocument: (id: string) => Document;

    // Calculations
    recalculateTotals: (documentId: string) => void;

    // Payment tracking & Refund helpers
    getPaymentsForInvoice: (invoiceId: string) => Document[];
    getTotalPaidForInvoice: (invoiceId: string) => number;
    refundDocument: (documentId: string, reason?: string) => void;
}

export const useDocumentStore = create<DocumentState>()(
    persist(
        (set, get) => ({
            documents: [],
            isLoading: false,
            activeDocumentId: null,
            invoiceCounter: 1,
            receiptCounter: 1,
            deliveryNoteCounter: 1,

            setActiveDocument: (id) => set({ activeDocumentId: id }),

            generateDocumentNumber: (type) => {
                const { getNextDocumentNumber, incrementDocumentNumber } = useSettingsStore.getState();
                const numberingKey = type === 'invoice' ? 'invoice' : type === 'receipt' ? 'receipt' : 'deliveryNote';
                const docNum = getNextDocumentNumber(numberingKey);
                incrementDocumentNumber(numberingKey);
                return docNum;
            },

            getFilteredDocuments: () => {
                const rawDocs = filterByActiveOrg(get().documents);
                return rawDocs.map(doc => {
                    if (doc.type === 'receipt' && doc.status !== 'paid' && doc.status !== 'cancelled') {
                        return { ...doc, status: 'paid' as DocumentStatus };
                    }
                    if (doc.type === 'invoice') {
                        const receipts = rawDocs.filter(r => 
                            r.type === 'receipt' && r.status !== 'cancelled' &&
                            (r.sourceDocumentId === doc.id || r.sourceDocumentId === doc.documentNumber)
                        );
                        if (receipts.length > 0) {
                            const totalPaid = receipts.reduce((sum, r) => sum + (r.amountPaid ?? r.grandTotal ?? 0), 0);
                            const newStatus: DocumentStatus = totalPaid >= doc.grandTotal ? 'paid' : totalPaid > 0 ? 'partially_paid' : doc.status;
                            const newAmountPaid = Math.min(doc.grandTotal, totalPaid);
                            const newAmountDue = Math.max(0, doc.grandTotal - newAmountPaid);
                            return {
                                ...doc,
                                amountPaid: newAmountPaid,
                                amountDue: newAmountDue,
                                status: newStatus
                            };
                        }
                    }
                    return doc;
                });
            },

            addDocument: (data) => {
                const now = new Date().toISOString();
                const activeOrgId = getActiveOrgId();
                const finalDocStatus: DocumentStatus = data.type === 'receipt' ? 'paid' : (data.status || 'draft');
                const newDocument: Document = {
                    ...data,
                    id: uuidv4(),
                    organizationId: data.organizationId || activeOrgId,
                    status: finalDocStatus,
                    createdAt: now,
                    updatedAt: now,
                };

                set((state) => {
                    let updatedDocs = [...state.documents, newDocument];
                    if (newDocument.type === 'receipt' && newDocument.sourceDocumentId) {
                        const parentDoc = updatedDocs.find(d => 
                            d.id === newDocument.sourceDocumentId || d.documentNumber === newDocument.sourceDocumentId
                        );
                        if (parentDoc) {
                            const allReceipts = updatedDocs.filter(d => 
                                d.type === 'receipt' && 
                                (d.sourceDocumentId === parentDoc.id || d.sourceDocumentId === parentDoc.documentNumber)
                            );
                            const totalPaid = allReceipts.reduce((sum, r) => sum + (r.amountPaid ?? r.grandTotal ?? 0), 0);
                            const updatedParentStatus: DocumentStatus = totalPaid >= parentDoc.grandTotal ? 'paid' : totalPaid > 0 ? 'partially_paid' : parentDoc.status;
                            updatedDocs = updatedDocs.map(d => d.id === parentDoc.id ? {
                                ...d,
                                amountPaid: Math.min(d.grandTotal, totalPaid),
                                amountDue: Math.max(0, d.grandTotal - Math.min(d.grandTotal, totalPaid)),
                                status: updatedParentStatus,
                                updatedAt: now
                            } : d);
                        }
                    }
                    return { documents: updatedDocs };
                });

                try {
                    useTransactionStore.getState().syncDocumentToTransaction(newDocument);
                } catch (e) {
                    console.error('Error syncing document to transaction:', e);
                }

                // Auto deduct stock if document is marked paid or is a receipt
                if (newDocument.status === 'paid' || newDocument.type === 'receipt') {
                    try {
                        const { useProductStore } = require('./productStore');
                        const productStore = useProductStore.getState();
                        newDocument.lineItems?.forEach((item) => {
                            if (item.productId) {
                                productStore.deductStockForSale(item.productId, item.quantity, newDocument.documentNumber);
                            }
                        });
                    } catch (e) {
                        console.error('Error deducting stock on addDocument:', e);
                    }
                }

                return newDocument;
            },

            createDocument: (type, data) => {
                const now = new Date().toISOString();
                const activeOrgId = getActiveOrgId();
                const customer = useCustomerStore.getState().getCustomerById(data.customerId);

                // Calculate totals
                const subtotal = data.lineItems.reduce((sum, item) => sum + item.subtotal, 0);
                const discountAmount = subtotal * (data.discountPercent / 100);
                const taxableAmount = subtotal - discountAmount;
                const taxAmount = taxableAmount * (data.taxPercent / 100);
                const grandTotal = taxableAmount + taxAmount;

                // Determine initial status & payment timestamps
                const isPaidType = type === 'receipt';
                const initialStatus: DocumentStatus = isPaidType ? 'paid' : (data.status || 'draft');
                const isPaid = initialStatus === 'paid';
                const paidAt = data.paidAt || (isPaid ? now : undefined);
                const amountPaid = data.amountPaid ?? (isPaid ? grandTotal : 0);
                const amountDue = isPaid ? 0 : Math.max(0, grandTotal - amountPaid);

                const newDocument: Document = {
                    id: uuidv4(),
                    organizationId: data.organizationId || activeOrgId,
                    type,
                    templateId: data.templateId,
                    documentNumber: get().generateDocumentNumber(type),
                    customerId: data.customerId,
                    customerName: customer?.name || 'Unknown Customer',
                    date: data.date,
                    dueDate: data.dueDate,
                    lineItems: data.lineItems,
                    subtotal,
                    discountPercent: data.discountPercent,
                    discountAmount,
                    discountName: data.discountName,
                    discountId: data.discountId,
                    taxPercent: data.taxPercent,
                    taxAmount,
                    grandTotal,
                    amountPaid,
                    amountDue,

                    status: initialStatus,
                    paidAt,
                    notes: data.notes,
                    customValues: data.customValues,
                    sourceDocumentId: data.sourceDocumentId,
                    storefrontOrderId: data.storefrontOrderId,
                    createdAt: now,
                    updatedAt: now,
                };

                set((state) => ({
                    documents: [...state.documents, newDocument],
                }));

                try {
                    useTransactionStore.getState().syncDocumentToTransaction(newDocument);
                } catch (e) {
                    console.error('Error syncing document to transaction:', e);
                }

                // Auto deduct stock if document is created as paid or is a receipt
                if (isPaid || isPaidType) {
                    try {
                        const { useProductStore } = require('./productStore');
                        const productStore = useProductStore.getState();
                        data.lineItems.forEach((item) => {
                            if (item.productId) {
                                productStore.deductStockForSale(item.productId, item.quantity, newDocument.documentNumber);
                            }
                        });
                    } catch (e) {
                        console.error('Error deducting stock on createDocument:', e);
                    }
                }

                return newDocument;
            },


            updateDocument: (id, data) => {
                set((state) => ({
                    documents: state.documents.map((doc) => {
                        if (doc.id !== id) return doc;
                        // Prevent changing documentNumber once created
                        const { documentNumber, ...restData } = data;
                        return {
                            ...doc,
                            ...restData,
                            updatedAt: new Date().toISOString(),
                        };
                    }),
                }));

                // Recalculate totals if line items changed
                if (data.lineItems) {
                    get().recalculateTotals(id);
                }
            },

            deleteDocument: (id) => {
                const newDocs = get().documents.filter((doc) => doc.id !== id);
                set({ documents: newDocs });
                useTransactionStore.getState().backfillTransactionsFromDocuments(newDocs);
            },

            getDocumentById: (id) => {
                const doc = get().documents.find((doc) => doc.id === id);
                if (!doc || !belongsToActiveOrg(doc.organizationId)) return undefined;
                return doc;
            },

            getDocumentsByType: (type) => {
                const activeDocs = filterByActiveOrg(get().documents);
                return activeDocs.filter((doc) => doc.type === type);
            },

            getDocumentsByStatus: (status) => {
                const activeDocs = filterByActiveOrg(get().documents);
                return activeDocs.filter((doc) => doc.status === status);
            },

            getDocumentsByCustomer: (customerId) => {
                const activeDocs = filterByActiveOrg(get().documents);
                return activeDocs.filter((doc) => doc.customerId === customerId);
            },

            addLineItem: (documentId, item) => {
                const newItem: LineItem = {
                    id: uuidv4(),
                    ...item,
                    subtotal: item.quantity * item.unitPrice,
                };

                set((state) => ({
                    documents: state.documents.map((doc) =>
                        doc.id === documentId
                            ? { ...doc, lineItems: [...doc.lineItems, newItem] }
                            : doc
                    ),
                }));

                get().recalculateTotals(documentId);
            },

            updateLineItem: (documentId, itemId, data) => {
                set((state) => ({
                    documents: state.documents.map((doc) =>
                        doc.id === documentId
                            ? {
                                ...doc,
                                lineItems: doc.lineItems.map((item) => {
                                    if (item.id !== itemId) return item;
                                    const updated = { ...item, ...data };
                                    updated.subtotal = updated.quantity * updated.unitPrice;
                                    return updated;
                                }),
                            }
                            : doc
                    ),
                }));

                get().recalculateTotals(documentId);
            },

            removeLineItem: (documentId, itemId) => {
                set((state) => ({
                    documents: state.documents.map((doc) =>
                        doc.id === documentId
                            ? { ...doc, lineItems: doc.lineItems.filter((item) => item.id !== itemId) }
                            : doc
                    ),
                }));

                get().recalculateTotals(documentId);
            },

            markAsSent: (id) => {
                get().updateDocument(id, { status: 'sent' });
            },

            markAsPaid: (id) => {
                const doc = get().getDocumentById(id);
                if (doc && doc.status !== 'paid') {
                    try {
                        const { useProductStore } = require('./productStore');
                        const productStore = useProductStore.getState();
                        doc.lineItems?.forEach((item) => {
                            if (item.productId) {
                                productStore.deductStockForSale(item.productId, item.quantity, doc.documentNumber);
                            }
                        });
                    } catch (e) {
                        console.error('Error deducting stock on markAsPaid:', e);
                    }
                }
                get().updateDocument(id, {
                    status: 'paid',
                    paidAt: new Date().toISOString()
                });
            },

            markAsOverdue: (id) => {
                get().updateDocument(id, { status: 'overdue' });
            },

            convertDocument: (id, toType) => {
                const sourceDoc = get().getDocumentById(id);
                if (!sourceDoc) throw new Error('Document not found');

                const now = new Date().toISOString();

                // Determine the source document ID for linking
                // If converting from an invoice, use the invoice as source
                // If converting from a receipt/delivery-note, use their source (the invoice)
                const sourceDocumentId = sourceDoc.type === 'invoice'
                    ? sourceDoc.id
                    : sourceDoc.sourceDocumentId;

                const convertedDoc: Document = {
                    ...sourceDoc,
                    id: uuidv4(),
                    type: toType,
                    documentNumber: get().generateDocumentNumber(toType),
                    sourceDocumentId, // Link back to source invoice
                    status: 'draft',
                    createdAt: now,
                    updatedAt: now,
                };

                set((state) => ({
                    documents: [...state.documents, convertedDoc],
                }));

                try {
                    useTransactionStore.getState().syncDocumentToTransaction(convertedDoc);
                } catch (e) {
                    console.error('Error syncing converted document to transaction:', e);
                }

                return convertedDoc;
            },

            duplicateDocument: (id) => {
                const sourceDoc = get().getDocumentById(id);
                if (!sourceDoc) throw new Error('Document not found');

                const now = new Date().toISOString();
                const duplicatedDoc: Document = {
                    ...sourceDoc,
                    id: uuidv4(),
                    documentNumber: get().generateDocumentNumber(sourceDoc.type),
                    sourceDocumentId: undefined, // Clear link - duplicate is standalone
                    amountPaid: undefined,       // Clear payment info
                    paidAt: undefined,           // Clear paid date
                    status: 'draft',
                    createdAt: now,
                    updatedAt: now,
                };

                set((state) => ({
                    documents: [...state.documents, duplicatedDoc],
                }));

                return duplicatedDoc;
            },

            recalculateTotals: (documentId) => {
                set((state) => ({
                    documents: state.documents.map((doc) => {
                        if (doc.id !== documentId) return doc;

                        const subtotal = doc.lineItems.reduce((sum, item) => sum + item.subtotal, 0);
                        const discountAmount = subtotal * (doc.discountPercent / 100);
                        const taxableAmount = subtotal - discountAmount;
                        const taxAmount = taxableAmount * (doc.taxPercent / 100);
                        const grandTotal = taxableAmount + taxAmount;

                        return {
                            ...doc,
                            subtotal,
                            discountAmount,
                            taxAmount,
                            grandTotal,
                            updatedAt: new Date().toISOString(),
                        };
                    }),
                }));
            },

            // Get all receipts that reference this invoice
            getPaymentsForInvoice: (invoiceId) => {
                return get().documents.filter(
                    doc => doc.type === 'receipt' && doc.sourceDocumentId === invoiceId
                );
            },

            // Get total amount paid against an invoice (sum of all linked receipts)
            getTotalPaidForInvoice: (invoiceId) => {
                const payments = get().getPaymentsForInvoice(invoiceId);
                return payments.reduce((sum, receipt) => sum + (receipt.amountPaid || receipt.grandTotal), 0);
            },

            refundDocument: (documentId, reason) => {
                const doc = get().documents.find(d => d.id === documentId);
                if (!doc || doc.status === 'cancelled') return;

                // Dynamically import product store to prevent circular dependency
                const { useProductStore } = require('./productStore');
                const productStore = useProductStore.getState();

                // Restore inventory stock for returned line items
                doc.lineItems?.forEach((item: LineItem) => {
                    if (!item.productId) return;
                    const prod = productStore.getProductById(item.productId);
                    if (prod) {
                        const newStock = (prod.stockQuantity || 0) + (item.quantity || 0);
                        productStore.adjustStock(
                            item.productId,
                            undefined,
                            newStock,
                            `Refund for ${doc.documentNumber}: ${reason || 'Customer Return'}`,
                            'adjustment'
                        );
                    }
                });

                // Update document status to cancelled/refunded
                set((state) => ({
                    documents: state.documents.map(d =>
                        d.id === documentId
                            ? {
                                ...d,
                                status: 'cancelled',
                                notes: d.notes ? `${d.notes}\n[REFUNDED: ${reason || 'Customer Return'}]` : `[REFUNDED: ${reason || 'Customer Return'}]`,
                                updatedAt: new Date().toISOString()
                            }
                            : d
                    )
                }));
            },
        }),
        {
            name: 'inflow-documents',
        }
    )
);
