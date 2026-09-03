// ============================================
// INFLOW - Type Definitions
// ============================================

// -------------------- Template Types --------------------

export type DocumentType = 'invoice' | 'receipt' | 'delivery-note';

export type UserRole = 'admin' | 'inventory_manager' | 'cashier';

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
    | 'amount-paid-in-words'
    | 'amount-paid'
    | 'amount-due'
    | 'link-button'
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
    customValues?: Record<string, any>; // For extra properties like link buttons
}

export interface Template {
    id: string;
    organizationId?: string;
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
    coverImage?: string;       // Optional cover image for template thumbnail
    isDefault: boolean;
    createdAt: string;         // ISO date string
    updatedAt: string;         // ISO date string
}

// -------------------- Customer Types --------------------

export interface Customer {
    id: string;
    organizationId?: string;
    customerNumber?: string;
    name: string;
    companyName?: string;
    email: string;
    phone: string;
    address: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}



// -------------------- Product Types --------------------

export type StorefrontLabel = 'in-stock' | 'flash-sale' | 'low-stock' | 'new' | 'out-of-stock' | 'best-seller';

export type InventoryStrategy = 'FIFO' | 'FEFO';

export type BatchStatus = 'active' | 'depleted' | 'expired' | 'quarantined';

export interface StockBatch {
    id: string;
    organizationId?: string;
    productId: string;
    batchNumber: string;
    receivedDate: string;        // ISO date (YYYY-MM-DD)
    expiryDate?: string;         // ISO date (YYYY-MM-DD)
    initialQuantity: number;
    remainingQuantity: number;
    costPrice?: number;          // Purchase cost price per unit
    supplier?: string;
    notes?: string;
    status: BatchStatus;
    createdAt: string;
    updatedAt: string;
}

export type MovementType =
    | 'purchase'        // Received new batch / stock
    | 'sale'            // Fulfilled via invoice/receipt
    | 'adjustment'      // Manual count adjustment
    | 'wastage_expiry'  // Written off due to damage/expiry
    | 'return'          // Customer or supplier return
    | 'transfer';       // Internal transfer

export interface StockMovement {
    id: string;
    organizationId?: string;
    productId: string;
    batchId?: string;
    batchNumber?: string;
    type: MovementType;
    quantity: number;           // Positive for addition, negative for deduction
    previousQuantity: number;
    newQuantity: number;
    date: string;               // ISO date string
    reason: string;
    referenceDocNumber?: string;
    costPrice?: number;
    performedBy?: string;
}

export type AlternativeMatchType = 'exact_equivalent' | 'similar_substitute';

export interface ProductAlternative {
    id: string;
    organizationId?: string;
    productId: string;
    alternativeProductId: string;
    matchType: AlternativeMatchType;
    notes?: string;
}

export interface ReorderMetrics {
    dailySalesVelocity: number;   // Average units sold per day
    leadTimeDays: number;         // Supplier lead time in days
    safetyStockDays: number;      // Safety buffer days
    calculatedReorderPoint: number; // ROP threshold
    suggestedReorderQuantity: number; // Recommended order size
    estimatedDaysUntilStockout: number; // Days remaining at current velocity
    isReorderNeeded: boolean;
}

export type ProductType = 'physical' | 'service' | 'digital';

export interface Product {
    id: string;
    organizationId?: string;
    name: string;
    sku: string;
    productType?: ProductType;   // 'physical' | 'service' | 'digital' (default: 'physical')
    barcode?: string;
    description: string;
    unitPrice: number;
    costPrice?: number;
    category?: string;
    inStock?: boolean;
    stockQuantity?: number;       // Optional — leave blank for services
    minReorderPoint?: number;     // Fixed reorder point fallback
    leadTimeDays?: number;        // Supplier lead time in days
    safetyStockDays?: number;     // Buffer days
    inventoryStrategy?: InventoryStrategy; // 'FIFO' or 'FEFO'
    expiryWarningDays?: number;   // Days before expiry to trigger alert (default 30)
    imageUrl?: string;
    images?: string[];
    discountedPrice?: number;
    discountId?: string;           // Links to a saved Discount
    storefrontLabel?: StorefrontLabel; // Badge shown on storefront card
    isPublishedToStore?: boolean;
    storeDescription?: string;
    createdAt: string;
    updatedAt: string;
}

// -------------------- Storefront Types --------------------

export interface StorefrontSettings {
    organizationId?: string;
    storeName: string;
    storeSlug: string;
    description: string;
    bannerUrl?: string;
    logoUrl?: string;
    contactEmail: string;
    contactPhone: string;
    websiteUrl?: string;
    address: string;
    currency: string;
    isActive: boolean;
    paymentInstructions?: string;
    allowDirectCheckout: boolean;
    themePreset?: 'slate-dark' | 'ocean-blue' | 'emerald-green' | 'royal-purple' | 'sunset-rose' | 'clean-light';
    headerGradient?: string;
    primaryAccentColor?: string;
    headerTextColor?: string;
    // Monnify Gateway Integration Configuration
    enableMonnifyPayment?: boolean;
    monnifyApiKey?: string;
    monnifySecretKey?: string;
    monnifyContractCode?: string;
    monnifySubAccountCode?: string;
    monnifyEnvironment?: 'sandbox' | 'live';
    
    // Paystack Gateway Integration Configuration
    enablePaystackPayment?: boolean;
    paystackPublicKey?: string;
    paystackSubAccountCode?: string;

    // Merchant Payout Bank Account Details (Automated Subaccounts)
    bankName?: string;
    bankCode?: string;
    accountNumber?: string;
    accountName?: string;

    feeBearer?: 'customer' | 'storefront';
}

export interface StorefrontCartItem {
    product: Product;
    quantity: number;
}

export interface StorefrontOrder {
    id: string;
    organizationId?: string;
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerAddress: string;
    items: {
        productId: string;
        productName: string;
        quantity: number;
        unitPrice: number;
        subtotal: number;
    }[];
    subtotal: number;
    grandTotal: number;
    status: 'pending' | 'completed' | 'cancelled';
    invoiceId: string;
    receiptId?: string;
    createdAt: string;
    // Payment & Monnify Fee Split Details
    paymentMethod?: 'paystack' | 'monnify' | 'cash';
    paymentReference?: string;
    paymentFee?: number;
    monnifyCost?: number;
    platformProfit?: number;
    merchantPayout?: number;
    paymentStatus?: 'paid' | 'pending' | 'failed';
}


// -------------------- Discount Types --------------------

export interface Discount {
    id: string;
    organizationId?: string;
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

export type DocumentStatus = 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';

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
    organizationId?: string;
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
    discountId?: string;        // Back-reference to Discount entity for audit trail
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
    storefrontOrderId?: string; // Back-reference to StorefrontOrder for bidirectional linkage
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
    discountId?: string;
    taxPercent: number;
    amountPaid?: number;
    notes?: string;
    customValues?: Record<string, string>;
    sourceDocumentId?: string;
    storefrontOrderId?: string;
    organizationId?: string;
    status?: DocumentStatus;
    paidAt?: string;
}

// -------------------- Ledger Types --------------------

export interface LedgerEntry {
    id: string;
    organizationId?: string;
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

// -------------------- Transaction Types --------------------

export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'refunded';
export type FulfillmentStatus = 'unfulfilled' | 'partially_fulfilled' | 'fulfilled' | 'cancelled';
export type TransactionSource = 'invoice' | 'receipt' | 'pos' | 'storefront';

export interface Transaction {
    id: string;
    organizationId?: string;
    transactionNumber: string; // e.g. TRX-1001
    customerId: string;
    customerName: string;
    date: string; // ISO date string
    source: TransactionSource;
    
    // Connected Document References
    invoiceId?: string;
    invoiceNumber?: string;
    receiptIds?: string[];
    receiptNumbers?: string[];
    deliveryNoteIds?: string[];
    deliveryNoteNumbers?: string[];
    storefrontOrderId?: string;
    
    // Items & Financials
    lineItems: LineItem[];
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    grandTotal: number;
    amountPaid: number;
    amountDue: number;
    
    // Statuses
    paymentStatus: PaymentStatus;
    fulfillmentStatus: FulfillmentStatus;
    
    notes?: string;
    createdAt: string;
    updatedAt: string;
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
    customerNumber?: string;
    name: string;
    companyName?: string;
    email: string;
    phone: string;
    address: string;
    notes?: string;
    organizationId?: string;
}

export interface ProductFormData {
    name: string;
    sku: string;
    productType?: ProductType;
    barcode?: string;
    description: string;
    unitPrice: number;
    costPrice?: number;
    category?: string;
    imageUrl?: string;
    images?: string[];
    stockQuantity?: number;
    minReorderPoint?: number;
    leadTimeDays?: number;
    safetyStockDays?: number;
    inventoryStrategy?: InventoryStrategy;
    expiryWarningDays?: number;
    discountedPrice?: number;
    discountId?: string;
    storefrontLabel?: StorefrontLabel;
    isPublishedToStore?: boolean;
    storeDescription?: string;
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
