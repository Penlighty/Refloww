import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Document, DocumentType, DocumentStatus, LineItem, DocumentFormData } from '@/lib/types';
import { useCustomerStore } from './customerStore';

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
                const state = get();
                const prefixes = {
                    'invoice': 'INV',
                    'receipt': 'RCP',
                    'delivery-note': 'DN',
                };
                const counterKey = {
                    'invoice': 'invoiceCounter',
                    'receipt': 'receiptCounter',
                    'delivery-note': 'deliveryNoteCounter',
                }[type] as 'invoiceCounter' | 'receiptCounter' | 'deliveryNoteCounter';

                const counter = state[counterKey];
                const paddedNumber = counter.toString().padStart(5, '0');
                const documentNumber = `${prefixes[type]}-${paddedNumber}`;

                // Increment counter
                set({ [counterKey]: counter + 1 });

                return documentNumber;
            },

            addDocument: (data) => {
                const now = new Date().toISOString();
                const newDocument: Document = {
                    ...data,
                    id: uuidv4(),
                    createdAt: now,
                    updatedAt: now,
                };

                set((state) => ({
                    documents: [...state.documents, newDocument],
                }));

                return newDocument;
            },

            createDocument: (type, data) => {
                const now = new Date().toISOString();
                const customer = useCustomerStore.getState().getCustomerById(data.customerId);

                // Calculate totals
                const subtotal = data.lineItems.reduce((sum, item) => sum + item.subtotal, 0);
                const discountAmount = subtotal * (data.discountPercent / 100);
                const taxableAmount = subtotal - discountAmount;
                const taxAmount = taxableAmount * (data.taxPercent / 100);
                const grandTotal = taxableAmount + taxAmount;

                const newDocument: Document = {
                    id: uuidv4(),
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
                    taxPercent: data.taxPercent,
                    taxAmount,
                    grandTotal,

                    status: 'draft',
                    notes: data.notes,
                    customValues: data.customValues,
                    sourceDocumentId: data.sourceDocumentId,
                    createdAt: now,
                    updatedAt: now,
                };

                set((state) => ({
                    documents: [...state.documents, newDocument],
                }));

                return newDocument;
            },

            updateDocument: (id, data) => {
                set((state) => ({
                    documents: state.documents.map((doc) =>
                        doc.id === id
                            ? { ...doc, ...data, updatedAt: new Date().toISOString() }
                            : doc
                    ),
                }));

                // Recalculate totals if line items changed
                if (data.lineItems) {
                    get().recalculateTotals(id);
                }
            },

            deleteDocument: (id) => {
                set((state) => ({
                    documents: state.documents.filter((doc) => doc.id !== id),
                }));
            },

            getDocumentById: (id) => {
                return get().documents.find((doc) => doc.id === id);
            },

            getDocumentsByType: (type) => {
                return get().documents.filter((doc) => doc.type === type);
            },

            getDocumentsByStatus: (status) => {
                return get().documents.filter((doc) => doc.status === status);
            },

            getDocumentsByCustomer: (customerId) => {
                return get().documents.filter((doc) => doc.customerId === customerId);
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
                const convertedDoc: Document = {
                    ...sourceDoc,
                    id: uuidv4(),
                    type: toType,
                    documentNumber: get().generateDocumentNumber(toType),
                    status: 'draft',
                    createdAt: now,
                    updatedAt: now,
                };

                set((state) => ({
                    documents: [...state.documents, convertedDoc],
                }));

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
        }),
        {
            name: 'inflow-documents',
        }
    )
);
