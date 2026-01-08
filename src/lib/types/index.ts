// ============================================
// INFLOW - Type Definitions
// ============================================

// -------------------- Template Types --------------------

export type DocumentType = 'invoice' | 'receipt' | 'delivery-note';

export type FieldType =
    | 'text'
    | 'date'
    | 'due-date'
    | 'document-number'
    | 'customer-name'
    | 'customer-email'
    | 'customer-phone'
    | 'customer-address'
    | 'line-items'
    | 'subtotal'
    | 'discount'
    | 'discount-name'
    | 'tax'
    | 'grand-total'


    | 'notes'
    | 'amount-in-words'
    | 'amount-paid'
    | 'amount-due'
    | 'custom';

export type TextAlignment = 'left' | 'center' | 'right';

export interface TemplateTableColumn {
    id: string;
    header: string;
    width: number; // Percentage
    type: 'text' | 'number' | 'currency';
    key: string; // 'description', 'quantity', 'unitPrice', 'subtotal', or custom
    alignment?: 'left' | 'center' | 'right';
}

export interface MappedField {
    id: string;
    type: FieldType;
    label: string;
    x: number;           // Percentage position (0-100)
    y: number;           // Percentage position (0-100)
    width: number;       // Percentage width (0-100)
    height: number;      // Percentage height (0-100)
    fontSize: number;    // px
    fontColor: string;   // hex
    fontWeight: 'normal' | 'medium' | 'semibold' | 'bold';
    alignment: TextAlignment;
    columns?: TemplateTableColumn[]; // For line-items
    showTableHeaders?: boolean; // Toggle header visibility
    maxRows?: number; // Maximum number of rows allowed for line-items
    dataType?: 'text' | 'number' | 'currency'; // Data type for custom fields
}

export interface Template {
    id: string;
    name: string;
    type: DocumentType;
    imageUrl: string;          // Base64 or blob URL
    originalFileName: string;
    fields: MappedField[];
    orientation: 'portrait' | 'landscape';
    mode?: 'single' | 'connected';
    variants?: Partial<Record<DocumentType, {
        imageUrl: string;
        fields: MappedField[];
        width?: number;
        height?: number;
        orientation: 'portrait' | 'landscape';
    }>>;
    width?: number;
    height?: number;
    isDefault: boolean;
    createdAt: string;         // ISO date string
    updatedAt: string;         // ISO date string
}

// -------------------- Customer Types --------------------

export interface Customer {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

// -------------------- Product Types --------------------

export interface Product {
    id: string;
    name: string;
    sku: string;
    description: string;
    unitPrice: number;
    category?: string;
    inStock?: boolean;
    createdAt: string;
    updatedAt: string;
}

// -------------------- Discount Types --------------------

export interface Discount {
    id: string;
    name: string;
    percentage: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface DiscountFormData {
    name: string;
    percentage: number;
    isActive: boolean;
}

// -------------------- Document Types --------------------

export type DocumentStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface LineItem {
    id: string;
    productId: string;
    productName: string;
    description: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    customValues?: Record<string, string | number>;
}

export interface Document {
    id: string;
    type: DocumentType;
    templateId: string;
    documentNumber: string;
    customerId: string;
    customerName: string;       // Denormalized for quick access
    date: string;               // ISO date string
    dueDate?: string;           // ISO date string
    lineItems: LineItem[];
    subtotal: number;
    discountPercent: number;
    discountAmount: number;
    discountName?: string;
    taxPercent: number;
    taxAmount: number;
    grandTotal: number;
    amountPaid?: number;
    amountDue?: number;
    status: DocumentStatus;
    notes?: string;
    customValues?: Record<string, string>;
    paidAt?: string;            // ISO date string
    sourceDocumentId?: string;  // ID of the document this was created from
    createdAt: string;
    updatedAt: string;
}

export interface DocumentFormData {
    templateId: string;
    customerId: string;
    date: string;
    dueDate?: string;
    lineItems: LineItem[];
    discountPercent: number;
    discountName?: string;
    taxPercent: number;
    amountPaid?: number;
    notes?: string;
    customValues?: Record<string, string>;
    sourceDocumentId?: string;
}

// -------------------- Ledger Types --------------------

export interface LedgerEntry {
    id: string;
    documentId: string;
    documentType: DocumentType;
    documentNumber: string;
    customerId: string;
    customerName: string;
    date: string;
    amount: number;
    status: DocumentStatus;
    createdAt: string;
}

// -------------------- UI Types --------------------

export interface SelectOption {
    value: string;
    label: string;
}

export interface TableColumn<T> {
    key: keyof T | string;
    header: string;
    sortable?: boolean;
    width?: string;
    render?: (item: T) => React.ReactNode;
}

export interface FilterOption {
    id: string;
    label: string;
    value: string | boolean | number;
}

// -------------------- Form Types --------------------

export interface CustomerFormData {
    name: string;
    email: string;
    phone: string;
    address: string;
    notes?: string;
}

export interface ProductFormData {
    name: string;
    sku: string;
    description: string;
    unitPrice: number;
    category?: string;
}

export interface DocumentFormData {
    templateId: string;
    customerId: string;
    date: string;
    dueDate?: string;
    lineItems: LineItem[];
    discountPercent: number;
    discountName?: string;
    taxPercent: number;
    notes?: string;
    sourceDocumentId?: string;
}

// -------------------- Settings Types --------------------

export interface BusinessSettings {
    businessName: string;
    businessLogo?: string;
    businessAddress: string;
    businessEmail: string;
    businessPhone: string;
    defaultTaxRate: number;
    currency: string;
    invoicePrefix: string;
    receiptPrefix: string;
    deliveryNotePrefix: string;
}

export interface AppSettings {
    theme: 'light' | 'dark' | 'system';
    autoSave: boolean;
    showNotifications: boolean;
}
