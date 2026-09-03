import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { 
    Transaction, 
    Document, 
    StorefrontOrder, 
    PaymentStatus, 
    FulfillmentStatus, 
    TransactionSource 
} from '@/lib/types';
import { getActiveOrgId, filterByActiveOrg, belongsToActiveOrg } from '@/lib/utils/orgIsolation';

interface TransactionState {
    transactions: Transaction[];
    transactionCounter: number;
    activeTransactionId: string | null;
    isLoading: boolean;

    // Actions
    setActiveTransaction: (id: string | null) => void;
    getFilteredTransactions: () => Transaction[];
    getTransactionById: (id: string) => Transaction | undefined;
    generateTransactionNumber: (dateStr?: string) => string;
    
    // Core Sync Methods
    syncDocumentToTransaction: (doc: Document) => Transaction;
    syncOrderToTransaction: (order: StorefrontOrder) => Transaction;
    backfillTransactionsFromDocuments: (documents: Document[]) => void;
    
    // Management
    updateTransaction: (id: string, updates: Partial<Transaction>) => void;
    deleteTransaction: (id: string) => void;
    updatePaymentStatus: (id: string, status: PaymentStatus, amountPaid?: number) => void;
    updateFulfillmentStatus: (id: string, status: FulfillmentStatus) => void;
}

export const formatTransactionNumber = (dateStr?: string, counter: number = 1001): string => {
    const dateObj = dateStr ? new Date(dateStr) : new Date();
    const validDate = isNaN(dateObj.getTime()) ? new Date() : dateObj;
    
    const day = String(validDate.getDate()).padStart(2, '0');
    const month = String(validDate.getMonth() + 1).padStart(2, '0');
    const year = validDate.getFullYear();
    const seq = String(counter).padStart(4, '0');
    
    return `TRX-${day}${month}${year}-${seq}`;
};

export const useTransactionStore = create<TransactionState>()(
    persist(
        (set, get) => ({
            transactions: [],
            transactionCounter: 1001,
            activeTransactionId: null,
            isLoading: false,

            setActiveTransaction: (id) => set({ activeTransactionId: id }),

            getFilteredTransactions: () => {
                return filterByActiveOrg(get().transactions);
            },

            getTransactionById: (id) => {
                const trx = get().transactions.find((t) => t.id === id);
                if (!trx || !belongsToActiveOrg(trx.organizationId)) return undefined;
                return trx;
            },

            generateTransactionNumber: (dateStr?: string) => {
                const currentCounter = get().transactionCounter || 1001;
                set({ transactionCounter: currentCounter + 1 });
                return formatTransactionNumber(dateStr, currentCounter);
            },

            syncDocumentToTransaction: (doc: Document) => {
                const now = new Date().toISOString();
                const targetOrgId = doc.organizationId || 'org-primary-default';
                const allTrxs = get().transactions;

                // 1. Try to find existing transaction strictly within the same organization
                let existingTrx: Transaction | undefined;

                existingTrx = allTrxs.find(t => {
                    const trxOrgId = t.organizationId || 'org-primary-default';
                    if (trxOrgId !== targetOrgId) return false;

                    if (doc.type === 'invoice') {
                        return t.invoiceId === doc.id || t.id === doc.sourceDocumentId;
                    } else {
                        return Boolean(
                            doc.sourceDocumentId && (
                                t.invoiceId === doc.sourceDocumentId || 
                                t.invoiceNumber === doc.sourceDocumentId ||
                                t.receiptIds?.includes(doc.sourceDocumentId) || 
                                t.id === doc.sourceDocumentId
                            )
                        );
                    }
                });

                if (existingTrx) {
                    // Update existing transaction
                    let updatedReceiptIds = [...(existingTrx.receiptIds || [])];
                    let updatedReceiptNumbers = [...(existingTrx.receiptNumbers || [])];
                    let updatedDeliveryIds = [...(existingTrx.deliveryNoteIds || [])];
                    let updatedDeliveryNumbers = [...(existingTrx.deliveryNoteNumbers || [])];

                    let newPaymentStatus = existingTrx.paymentStatus;
                    let newFulfillmentStatus = existingTrx.fulfillmentStatus;
                    let newAmountPaid = existingTrx.amountPaid;

                    if (doc.type === 'receipt') {
                        if (!updatedReceiptIds.includes(doc.id)) {
                            updatedReceiptIds.push(doc.id);
                            updatedReceiptNumbers.push(doc.documentNumber);
                        }
                        const receiptVal = (doc.amountPaid !== undefined && doc.amountPaid !== null && doc.amountPaid > 0) ? doc.amountPaid : doc.grandTotal;
                        newAmountPaid = (existingTrx.amountPaid || 0) + receiptVal;
                        if (doc.status === 'paid' || newAmountPaid >= existingTrx.grandTotal) {
                            newPaymentStatus = 'paid';
                        } else if (newAmountPaid > 0) {
                            newPaymentStatus = 'partially_paid';
                        }
                    } else if (doc.type === 'delivery-note') {
                        if (!updatedDeliveryIds.includes(doc.id)) {
                            updatedDeliveryIds.push(doc.id);
                            updatedDeliveryNumbers.push(doc.documentNumber);
                        }
                        newFulfillmentStatus = 'fulfilled';
                    } else if (doc.type === 'invoice') {
                        if (doc.status === 'paid') newPaymentStatus = 'paid';
                        else if (doc.status === 'cancelled') newPaymentStatus = 'refunded';
                        else if (doc.amountPaid && doc.amountPaid > 0) {
                            newPaymentStatus = doc.amountPaid >= doc.grandTotal ? 'paid' : 'partially_paid';
                        }
                    }

                    const updatedTrx: Transaction = {
                        ...existingTrx,
                        organizationId: targetOrgId,
                        invoiceId: doc.type === 'invoice' ? doc.id : existingTrx.invoiceId,
                        invoiceNumber: doc.type === 'invoice' ? doc.documentNumber : existingTrx.invoiceNumber,
                        receiptIds: updatedReceiptIds,
                        receiptNumbers: updatedReceiptNumbers,
                        deliveryNoteIds: updatedDeliveryIds,
                        deliveryNoteNumbers: updatedDeliveryNumbers,
                        amountPaid: newAmountPaid,
                        amountDue: Math.max(0, existingTrx.grandTotal - newAmountPaid),
                        paymentStatus: newPaymentStatus,
                        fulfillmentStatus: newFulfillmentStatus,
                        updatedAt: now,
                    };

                    set((state) => ({
                        transactions: state.transactions.map(t => t.id === existingTrx!.id ? updatedTrx : t)
                    }));

                    return updatedTrx;
                }

                // 2. Create new transaction if none exists
                const isReceipt = doc.type === 'receipt';
                const initialPaymentStatus: PaymentStatus = 
                    doc.status === 'paid' || isReceipt 
                        ? 'paid' 
                        : doc.status === 'cancelled' 
                        ? 'refunded' 
                        : (doc.amountPaid && doc.amountPaid > 0) 
                        ? (doc.amountPaid >= doc.grandTotal ? 'paid' : 'partially_paid') 
                        : 'unpaid';

                const initialFulfillmentStatus: FulfillmentStatus = 
                    doc.type === 'delivery-note' ? 'fulfilled' : 'unfulfilled';

                const amountPaid = isReceipt ? (doc.amountPaid || doc.grandTotal) : (doc.amountPaid || 0);

                const newTrx: Transaction = {
                    id: uuidv4(),
                    organizationId: targetOrgId,
                    transactionNumber: get().generateTransactionNumber(doc.date),
                    customerId: doc.customerId,
                    customerName: doc.customerName || 'Customer',
                    date: doc.date || now,
                    source: doc.type === 'receipt' ? 'receipt' : 'invoice',
                    invoiceId: doc.type === 'invoice' ? doc.id : undefined,
                    invoiceNumber: doc.type === 'invoice' ? doc.documentNumber : undefined,
                    receiptIds: isReceipt ? [doc.id] : [],
                    receiptNumbers: isReceipt ? [doc.documentNumber] : [],
                    deliveryNoteIds: doc.type === 'delivery-note' ? [doc.id] : [],
                    deliveryNoteNumbers: doc.type === 'delivery-note' ? [doc.documentNumber] : [],
                    lineItems: doc.lineItems || [],
                    subtotal: doc.subtotal || 0,
                    discountAmount: doc.discountAmount || 0,
                    taxAmount: doc.taxAmount || 0,
                    grandTotal: doc.grandTotal || 0,
                    amountPaid,
                    amountDue: Math.max(0, (doc.grandTotal || 0) - amountPaid),
                    paymentStatus: initialPaymentStatus,
                    fulfillmentStatus: initialFulfillmentStatus,
                    notes: doc.notes,
                    createdAt: now,
                    updatedAt: now,
                };

                set((state) => ({
                    transactions: [newTrx, ...state.transactions]
                }));

                return newTrx;
            },

            syncOrderToTransaction: (order: StorefrontOrder) => {
                const now = new Date().toISOString();
                const targetOrgId = order.organizationId || 'org-primary-default';
                const allTrxs = get().transactions;

                const existing = allTrxs.find(t => 
                    (t.organizationId || 'org-primary-default') === targetOrgId &&
                    t.storefrontOrderId === order.id
                );

                if (existing) {
                    const updated: Transaction = {
                        ...existing,
                        organizationId: targetOrgId,
                        paymentStatus: order.paymentStatus === 'paid' || order.status === 'completed' ? 'paid' : 'unpaid',
                        fulfillmentStatus: order.status === 'completed' ? 'fulfilled' : 'unfulfilled',
                        updatedAt: now
                    };
                    set(state => ({
                        transactions: state.transactions.map(t => t.id === existing.id ? updated : t)
                    }));
                    return updated;
                }

                const lineItems = order.items.map(item => ({
                    id: item.productId,
                    productId: item.productId,
                    productName: item.productName,
                    description: item.productName,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    subtotal: item.subtotal
                }));

                const isPaid = order.paymentStatus === 'paid' || order.status === 'completed';

                const newTrx: Transaction = {
                    id: uuidv4(),
                    organizationId: targetOrgId,
                    transactionNumber: get().generateTransactionNumber(),
                    customerId: order.customerEmail || order.id,
                    customerName: order.customerName || 'Store Customer',
                    date: order.createdAt || now,
                    source: 'storefront',
                    storefrontOrderId: order.id,
                    invoiceId: order.invoiceId,
                    receiptIds: order.receiptId ? [order.receiptId] : [],
                    lineItems,
                    subtotal: order.subtotal,
                    discountAmount: 0,
                    taxAmount: 0,
                    grandTotal: order.grandTotal,
                    amountPaid: isPaid ? order.grandTotal : 0,
                    amountDue: isPaid ? 0 : order.grandTotal,
                    paymentStatus: isPaid ? 'paid' : 'unpaid',
                    fulfillmentStatus: order.status === 'completed' ? 'fulfilled' : 'unfulfilled',
                    createdAt: now,
                    updatedAt: now
                };

                set(state => ({
                    transactions: [newTrx, ...state.transactions]
                }));

                return newTrx;
            },

            backfillTransactionsFromDocuments: (documents: Document[]) => {
                if (!documents) return;
                if (documents.length === 0) {
                    set({ transactions: [], transactionCounter: 1001 });
                    return;
                }

                // Group all documents strictly by their individual organization ID
                const docMapByOrg = new Map<string, Document[]>();
                documents.forEach(doc => {
                    const orgId = doc.organizationId || 'org-primary-default';
                    if (!docMapByOrg.has(orgId)) {
                        docMapByOrg.set(orgId, []);
                    }
                    docMapByOrg.get(orgId)!.push(doc);
                });

                const allNewTransactions: Transaction[] = [];

                docMapByOrg.forEach((orgDocs, orgId) => {
                    const currentTrxMap = new Map<string, Transaction>();

                    // First pass: Invoices create primary transaction entries
                    const invoices = orgDocs.filter(d => d.type === 'invoice');
                    invoices.forEach(inv => {
                        const isPaid = inv.status === 'paid';
                        const amountPaid = isPaid ? inv.grandTotal : (inv.amountPaid || 0);
                        const seqNumber = 1000 + allNewTransactions.length + currentTrxMap.size + 1;
                        currentTrxMap.set(inv.id, {
                            id: uuidv4(),
                            organizationId: orgId,
                            transactionNumber: formatTransactionNumber(inv.date, seqNumber),
                            customerId: inv.customerId,
                            customerName: inv.customerName,
                            date: inv.date,
                            source: 'invoice',
                            invoiceId: inv.id,
                            invoiceNumber: inv.documentNumber,
                            receiptIds: [],
                            receiptNumbers: [],
                            deliveryNoteIds: [],
                            deliveryNoteNumbers: [],
                            lineItems: inv.lineItems || [],
                            subtotal: inv.subtotal || 0,
                            discountAmount: inv.discountAmount || 0,
                            taxAmount: inv.taxAmount || 0,
                            grandTotal: inv.grandTotal || 0,
                            amountPaid,
                            amountDue: Math.max(0, inv.grandTotal - amountPaid),
                            paymentStatus: isPaid ? 'paid' : inv.status === 'cancelled' ? 'refunded' : amountPaid > 0 ? 'partially_paid' : 'unpaid',
                            fulfillmentStatus: 'unfulfilled',
                            notes: inv.notes,
                            createdAt: inv.createdAt,
                            updatedAt: inv.updatedAt
                        });
                    });

                    // Second pass: Receipts and Delivery Notes attach to primary transactions or create standalone entries
                    const nonInvoices = orgDocs.filter(d => d.type !== 'invoice');
                    nonInvoices.forEach(doc => {
                        let parentTrx: Transaction | undefined;

                        if (doc.sourceDocumentId) {
                            parentTrx = Array.from(currentTrxMap.values()).find(t =>
                                t.invoiceId === doc.sourceDocumentId ||
                                t.invoiceNumber === doc.sourceDocumentId ||
                                t.id === doc.sourceDocumentId
                            );
                        }

                        if (parentTrx) {
                            if (doc.type === 'receipt') {
                                if (!parentTrx.receiptIds?.includes(doc.id)) {
                                    parentTrx.receiptIds = [...(parentTrx.receiptIds || []), doc.id];
                                    parentTrx.receiptNumbers = [...(parentTrx.receiptNumbers || []), doc.documentNumber];
                                }
                                const receiptVal = (doc.amountPaid !== undefined && doc.amountPaid !== null && doc.amountPaid > 0) ? doc.amountPaid : doc.grandTotal;
                                const accumulated = (parentTrx.amountPaid || 0) + receiptVal;
                                parentTrx.amountPaid = Math.min(parentTrx.grandTotal, accumulated);
                                parentTrx.amountDue = Math.max(0, parentTrx.grandTotal - parentTrx.amountPaid);
                                parentTrx.paymentStatus = parentTrx.amountPaid >= parentTrx.grandTotal ? 'paid' : 'partially_paid';
                            } else if (doc.type === 'delivery-note') {
                                if (!parentTrx.deliveryNoteIds?.includes(doc.id)) {
                                    parentTrx.deliveryNoteIds = [...(parentTrx.deliveryNoteIds || []), doc.id];
                                    parentTrx.deliveryNoteNumbers = [...(parentTrx.deliveryNoteNumbers || []), doc.documentNumber];
                                }
                                parentTrx.fulfillmentStatus = 'fulfilled';
                            }
                        } else {
                            // Create standalone transaction for orphaned receipt or delivery note
                            const isReceipt = doc.type === 'receipt';
                            const seqNumber = 1000 + allNewTransactions.length + currentTrxMap.size + 1;
                            currentTrxMap.set(doc.id, {
                                id: uuidv4(),
                                organizationId: orgId,
                                transactionNumber: formatTransactionNumber(doc.date, seqNumber),
                                customerId: doc.customerId,
                                customerName: doc.customerName,
                                date: doc.date,
                                source: isReceipt ? 'receipt' : 'invoice',
                                receiptIds: isReceipt ? [doc.id] : [],
                                receiptNumbers: isReceipt ? [doc.documentNumber] : [],
                                deliveryNoteIds: doc.type === 'delivery-note' ? [doc.id] : [],
                                deliveryNoteNumbers: doc.type === 'delivery-note' ? [doc.documentNumber] : [],
                                lineItems: doc.lineItems || [],
                                subtotal: doc.subtotal || 0,
                                discountAmount: doc.discountAmount || 0,
                                taxAmount: doc.taxAmount || 0,
                                grandTotal: doc.grandTotal || 0,
                                amountPaid: isReceipt ? doc.grandTotal : 0,
                                amountDue: isReceipt ? 0 : doc.grandTotal,
                                paymentStatus: isReceipt ? 'paid' : 'unpaid',
                                fulfillmentStatus: doc.type === 'delivery-note' ? 'fulfilled' : 'unfulfilled',
                                notes: doc.notes,
                                createdAt: doc.createdAt,
                                updatedAt: doc.updatedAt
                            });
                        }
                    });

                    allNewTransactions.push(...Array.from(currentTrxMap.values()));
                });

                allNewTransactions.sort(
                    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );

                set({
                    transactions: allNewTransactions,
                    transactionCounter: 1000 + allNewTransactions.length + 1
                });
            },

            updateTransaction: (id, updates) => {
                set(state => ({
                    transactions: state.transactions.map(t => 
                        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
                    )
                }));
            },

            deleteTransaction: (id) => {
                set(state => ({
                    transactions: state.transactions.filter(t => t.id !== id)
                }));
            },

            updatePaymentStatus: (id, status, amountPaid) => {
                set(state => ({
                    transactions: state.transactions.map(t => {
                        if (t.id !== id) return t;
                        const newAmountPaid = amountPaid !== undefined ? amountPaid : (status === 'paid' ? t.grandTotal : t.amountPaid);
                        return {
                            ...t,
                            paymentStatus: status,
                            amountPaid: newAmountPaid,
                            amountDue: Math.max(0, t.grandTotal - newAmountPaid),
                            updatedAt: new Date().toISOString()
                        };
                    })
                }));
            },

            updateFulfillmentStatus: (id, status) => {
                set(state => ({
                    transactions: state.transactions.map(t => 
                        t.id === id ? { ...t, fulfillmentStatus: status, updatedAt: new Date().toISOString() } : t
                    )
                }));
            }
        }),
        {
            name: 'inflow-transactions-storage',
            onRehydrateStorage: () => (state) => {
                // Auto-repair any misassigned transaction organization IDs upon rehydration
                if (state && state.transactions && state.transactions.length > 0) {
                    try {
                        const { documents } = require('./documentStore').useDocumentStore.getState();
                        if (documents && documents.length > 0) {
                            const docMap = new Map<string, string>();
                            documents.forEach((d: Document) => {
                                docMap.set(d.id, d.organizationId || 'org-primary-default');
                            });

                            let modified = false;
                            const repaired = state.transactions.map(trx => {
                                const matchedDocOrg = trx.invoiceId ? docMap.get(trx.invoiceId) : undefined;
                                if (matchedDocOrg && matchedDocOrg !== (trx.organizationId || 'org-primary-default')) {
                                    modified = true;
                                    return { ...trx, organizationId: matchedDocOrg };
                                }
                                return trx;
                            });

                            if (modified) {
                                useTransactionStore.setState({ transactions: repaired });
                            }
                        }
                    } catch (e) {
                        // Ignore circular load error during early hydration
                    }
                }
            }
        }
    )
);
