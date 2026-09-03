import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import {
    Product,
    ProductFormData,
    StockBatch,
    StockMovement,
    ProductAlternative,
    MovementType,
    AlternativeMatchType
} from '@/lib/types';
import { allocateStockFromBatches } from '@/lib/utils/inventoryUtils';
import { useSettingsStore } from './settingsStore';

import { getActiveOrgId, filterByActiveOrg, belongsToActiveOrg } from '@/lib/utils/orgIsolation';

interface ProductState {
    products: Product[];
    categories: string[];
    batches: StockBatch[];
    movements: StockMovement[];
    alternatives: ProductAlternative[];
    isLoading: boolean;
    searchQuery: string;

    // Actions
    setSearchQuery: (query: string) => void;
    getFilteredProducts: () => Product[];
    addProduct: (data: ProductFormData) => Product;
    updateProduct: (id: string, data: Partial<ProductFormData>) => void;
    deleteProduct: (id: string) => void;
    getProductById: (id: string) => Product | undefined;
    getProductByBarcode: (barcode: string) => Product | undefined;
    searchProducts: (query: string) => Product[];
    addCategory: (category: string) => void;
    removeCategory: (category: string) => void;

    // Batch Management Actions
    addStockBatch: (productId: string, batchData: Omit<StockBatch, 'id' | 'productId' | 'createdAt' | 'updatedAt' | 'remainingQuantity' | 'status'> & { initialQuantity: number }) => StockBatch;
    updateStockBatch: (batchId: string, updates: Partial<StockBatch>) => void;
    deleteStockBatch: (batchId: string) => void;
    getProductBatches: (productId: string) => StockBatch[];

    // Stock Movement & Adjustment Actions
    adjustStock: (productId: string, batchId: string | undefined, newQty: number, reason: string, type?: MovementType) => void;
    deductStockForSale: (productId: string, quantityNeeded: number, referenceDocNumber?: string) => StockMovement[];
    writeOffWastage: (batchId: string, writeOffQty: number, reason: string) => void;
    getProductMovements: (productId: string) => StockMovement[];

    // Alternatives Actions
    addAlternative: (productId: string, alternativeProductId: string, matchType: AlternativeMatchType, notes?: string) => ProductAlternative;
    removeAlternative: (alternativeId: string) => void;
    getProductAlternatives: (productId: string) => ProductAlternative[];
}

export const DEFAULT_CATEGORIES = [
    'Electronics & Gadgets',
    'Electronics',
    'Design & Creative Services',
    'Design',
    'Software & Digital Goods',
    'Software',
    'Hardware & Building Materials',
    'Hardware',
    'Services & Labor',
    'Services',
    'Consulting & Professional Services',
    'Office & Stationery',
    'Printing & Packaging',
    'Clothing & Apparel',
    'Health & Beauty',
    'Food & Beverages',
    'Home & Kitchen',
    'Groceries & Provisions',
    'Automotive & Spare Parts',
    'Pharmacy & Medical Supplies',
    'Jewelry & Accessories',
    'Sports & Fitness',
    'Toys & Baby Goods',
    'Books & Media',
    'Events & Entertainment',
    'Real Estate & Property',
    'Logistics & Freight',
    'Education & Training',
    'General Merchandise'
];

const INITIAL_BATCHES: StockBatch[] = [
    {
        id: 'batch-1',
        organizationId: 'org-primary-default',
        productId: 'prod-1',
        batchNumber: 'LOT-2026-081',
        receivedDate: '2026-07-01',
        expiryDate: '2026-11-30',
        initialQuantity: 20,
        remainingQuantity: 15,
        costPrice: 120.00,
        supplier: 'TechLogix Global Supplies',
        status: 'active',
        createdAt: '2026-07-01T10:00:00Z',
        updatedAt: '2026-07-01T10:00:00Z',
    },
    {
        id: 'batch-2',
        organizationId: 'org-primary-default',
        productId: 'prod-1',
        batchNumber: 'LOT-2026-092',
        receivedDate: '2026-08-10',
        expiryDate: '2027-05-15',
        initialQuantity: 10,
        remainingQuantity: 9,
        costPrice: 125.00,
        supplier: 'TechLogix Global Supplies',
        status: 'active',
        createdAt: '2026-08-10T10:00:00Z',
        updatedAt: '2026-08-10T10:00:00Z',
    },
    {
        id: 'batch-3',
        organizationId: 'org-primary-default',
        productId: 'prod-4',
        batchNumber: 'LOT-CF-88',
        receivedDate: '2026-06-15',
        expiryDate: '2026-09-15', // Near expiry warning
        initialQuantity: 30,
        remainingQuantity: 20,
        costPrice: 15.00,
        supplier: 'Artisan Roast Co.',
        status: 'active',
        createdAt: '2026-06-15T10:00:00Z',
        updatedAt: '2026-06-15T10:00:00Z',
    },
    {
        id: 'batch-4',
        organizationId: 'org-primary-default',
        productId: 'prod-4',
        batchNumber: 'LOT-CF-99',
        receivedDate: '2026-08-01',
        expiryDate: '2027-02-28',
        initialQuantity: 30,
        remainingQuantity: 30,
        costPrice: 16.00,
        supplier: 'Artisan Roast Co.',
        status: 'active',
        createdAt: '2026-08-01T10:00:00Z',
        updatedAt: '2026-08-01T10:00:00Z',
    }
];

const INITIAL_MOVEMENTS: StockMovement[] = [
    {
        id: 'mov-1',
        organizationId: 'org-primary-default',
        productId: 'prod-1',
        batchId: 'batch-1',
        batchNumber: 'LOT-2026-081',
        type: 'purchase',
        quantity: 20,
        previousQuantity: 0,
        newQuantity: 20,
        date: '2026-07-01T10:00:00Z',
        reason: 'Received Initial Purchase Order #PO-104',
        costPrice: 120.00
    },
    {
        id: 'mov-2',
        organizationId: 'org-primary-default',
        productId: 'prod-1',
        batchId: 'batch-1',
        batchNumber: 'LOT-2026-081',
        type: 'sale',
        quantity: -5,
        previousQuantity: 20,
        newQuantity: 15,
        date: '2026-07-15T14:30:00Z',
        reason: 'Fulfilled Invoice #INV-001',
        referenceDocNumber: 'INV-001'
    },
    {
        id: 'mov-3',
        organizationId: 'org-primary-default',
        productId: 'prod-4',
        batchId: 'batch-3',
        batchNumber: 'LOT-CF-88',
        type: 'purchase',
        quantity: 30,
        previousQuantity: 0,
        newQuantity: 30,
        date: '2026-06-15T10:00:00Z',
        reason: 'Received Batch Order #PO-88',
        costPrice: 15.00
    }
];

const INITIAL_ALTERNATIVES: ProductAlternative[] = [
    {
        id: 'alt-1',
        organizationId: 'org-primary-default',
        productId: 'prod-1', // Wireless Headphones
        alternativeProductId: 'prod-12', // 3-in-1 Charging Station
        matchType: 'similar_substitute',
        notes: 'Similar electronic tech accessory'
    }
];

export const useProductStore = create<ProductState>()(
    persist(
        (set, get) => ({
            products: [
                {
                    id: 'prod-1',
                    organizationId: 'org-primary-default',
                    name: 'Wireless Noise-Canceling Headphones',
                    sku: 'ELEC-WNH-001',
                    description: 'Premium Bluetooth over-ear headphones with active noise cancellation and 30-hour battery life.',
                    unitPrice: 199.99,
                    costPrice: 120.00,
                    category: 'Electronics & Gadgets',
                    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
                    images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800'],
                    isPublishedToStore: true,
                    discountedPrice: 169.99,
                    stockQuantity: 24,
                    minReorderPoint: 5,
                    leadTimeDays: 7,
                    safetyStockDays: 3,
                    inventoryStrategy: 'FEFO',
                    expiryWarningDays: 60,
                    storefrontLabel: 'best-seller',
                    storeDescription: 'Enjoy crystal clear audio with high-definition drivers and ultra-soft memory foam earcups.',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: 'prod-2',
                    organizationId: 'org-primary-default',
                    name: 'Brand Identity & Logo Design Package',
                    sku: 'DES-BID-002',
                    description: 'Complete corporate identity design including primary logo, color palette, typography guidelines, and brand kit.',
                    unitPrice: 350.00,
                    category: 'Design & Creative Services',
                    imageUrl: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800',
                    images: ['https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800'],
                    isPublishedToStore: true,
                    storefrontLabel: 'best-seller',
                    storeDescription: 'Professional brand identity suite handcrafted by senior graphic designers. Includes source vector files.',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: 'prod-3',
                    organizationId: 'org-primary-default',
                    name: 'Ergonomic Mesh Executive Chair',
                    sku: 'OFF-EMC-003',
                    description: 'Adjustable lumbar support ergonomic swivel chair with breathable mesh back and padded armrests.',
                    unitPrice: 249.00,
                    category: 'Home & Kitchen',
                    imageUrl: 'https://images.unsplash.com/photo-1580481072645-022f9a6d83d0?w=800',
                    images: ['https://images.unsplash.com/photo-1580481072645-022f9a6d83d0?w=800'],
                    isPublishedToStore: true,
                    stockQuantity: 8,
                    minReorderPoint: 3,
                    leadTimeDays: 14,
                    storefrontLabel: 'in-stock',
                    storeDescription: 'Engineered for all-day comfort with 3D armrest adjustments and pneumatic height controls.',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: 'prod-4',
                    organizationId: 'org-primary-default',
                    name: 'Artisan Dark Roast Coffee Beans (1kg)',
                    sku: 'FOOD-DRC-004',
                    description: 'Single-origin 100% Arabica roasted coffee beans with rich dark chocolate and hazelnut notes.',
                    unitPrice: 29.50,
                    costPrice: 15.00,
                    category: 'Food & Beverages',
                    imageUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800',
                    images: ['https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800'],
                    isPublishedToStore: true,
                    discountedPrice: 24.99,
                    stockQuantity: 50,
                    minReorderPoint: 10,
                    leadTimeDays: 5,
                    inventoryStrategy: 'FEFO',
                    expiryWarningDays: 30,
                    storefrontLabel: 'new',
                    storeDescription: 'Freshly roasted every week in small batches. Perfect for espresso and french press brewing.',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: 'prod-5',
                    organizationId: 'org-primary-default',
                    name: 'Custom Web & Mobile App Development',
                    sku: 'SERV-DEV-005',
                    description: 'Full-stack software design, web portal building, and cross-platform mobile application development.',
                    unitPrice: 1500.00,
                    category: 'Software & Digital Goods',
                    imageUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800',
                    images: ['https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800'],
                    isPublishedToStore: true,
                    storefrontLabel: 'best-seller',
                    storeDescription: 'Comprehensive software development package including UI/UX design, API integration, and cloud launch.',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: 'prod-6',
                    organizationId: 'org-primary-default',
                    name: 'Minimalist Stainless Steel Smartwatch',
                    sku: 'FASH-SW-006',
                    description: 'Water-resistant luxury smart watch with heart rate tracking, step counter, and notification alerts.',
                    unitPrice: 179.99,
                    category: 'Jewelry & Accessories',
                    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
                    images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'],
                    isPublishedToStore: true,
                    stockQuantity: 4,
                    minReorderPoint: 5,
                    storefrontLabel: 'low-stock',
                    storeDescription: 'Sleek brushed metal finish paired with a vibrant OLED touch screen and 7-day battery life.',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: 'prod-7',
                    organizationId: 'org-primary-default',
                    name: 'Organic Botanical Skincare Set',
                    sku: 'BEAU-OBS-007',
                    description: 'All-natural hydrating serum, cleanser, and night moisturizer infused with rosehip oil and aloe vera.',
                    unitPrice: 65.00,
                    category: 'Health & Beauty',
                    imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800',
                    images: ['https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800'],
                    isPublishedToStore: true,
                    discountedPrice: 52.00,
                    stockQuantity: 15,
                    inventoryStrategy: 'FEFO',
                    expiryWarningDays: 30,
                    storefrontLabel: 'flash-sale',
                    storeDescription: 'Dermatologist approved cruelty-free skincare formulated for smooth, radiant and nourished skin.',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: 'prod-8',
                    organizationId: 'org-primary-default',
                    name: 'Premium Custom Printed Marketing Flyers (1,000 Pcs)',
                    sku: 'PRNT-FLY-008',
                    description: 'Full-color double-sided printing on 300gsm glossy cardstock with UV coat protection.',
                    unitPrice: 79.00,
                    category: 'Office & Stationery',
                    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800',
                    images: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800'],
                    isPublishedToStore: true,
                    stockQuantity: 100,
                    storefrontLabel: 'in-stock',
                    storeDescription: 'Vibrant, high-resolution commercial printing for promos, events, and business marketing.',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: 'prod-9',
                    organizationId: 'org-primary-default',
                    name: 'Business Strategy & Growth Consulting',
                    sku: 'CONS-STR-009',
                    description: '1-on-1 executive advisory session focusing on market expansion, operational efficiency, and revenue optimization.',
                    unitPrice: 250.00,
                    category: 'Consulting & Professional Services',
                    imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800',
                    images: ['https://images.unsplash.com/photo-1552664730-d307ca884978?w=800'],
                    isPublishedToStore: true,
                    storefrontLabel: 'new',
                    storeDescription: 'Strategic business audit and growth roadmap consultation for startups and scaling companies.',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: 'prod-10',
                    organizationId: 'org-primary-default',
                    name: 'Heavyweight Fleece Oversized Hoodie',
                    sku: 'CLTH-HD-010',
                    description: '100% organic French terry cotton hoodie with reinforced ribbed cuffs and double-layered hood.',
                    unitPrice: 85.00,
                    category: 'Clothing & Apparel',
                    imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800',
                    images: ['https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800'],
                    isPublishedToStore: true,
                    stockQuantity: 18,
                    storefrontLabel: 'best-seller',
                    storeDescription: 'Ultra-soft interior, relaxed streetwear fit designed for everyday comfort.',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: 'prod-11',
                    organizationId: 'org-primary-default',
                    name: 'Commercial Product Photography Session',
                    sku: 'SERV-PHO-011',
                    description: 'Studio product photography session with professional lighting, background styling, and retouching.',
                    unitPrice: 450.00,
                    category: 'Services & Labor',
                    imageUrl: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=800',
                    images: ['https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=800'],
                    isPublishedToStore: true,
                    storefrontLabel: 'in-stock',
                    storeDescription: 'Includes 15 high-res edited lifestyle and e-commerce studio photos ready for store catalogs.',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: 'prod-12',
                    organizationId: 'org-primary-default',
                    name: '3-in-1 Fast Wireless Charging Station',
                    sku: 'ELEC-WCS-012',
                    description: 'Multi-device magnetic charging dock compatible with smartphones, smartwatches, and earbuds.',
                    unitPrice: 49.99,
                    category: 'Electronics & Gadgets',
                    imageUrl: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=800',
                    images: ['https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=800'],
                    isPublishedToStore: true,
                    discountedPrice: 39.99,
                    stockQuantity: 35,
                    storefrontLabel: 'flash-sale',
                    storeDescription: '15W fast wireless charging with intelligent surge protection and sleek nightstand design.',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                }
            ],
            categories: DEFAULT_CATEGORIES,
            batches: INITIAL_BATCHES,
            movements: INITIAL_MOVEMENTS,
            alternatives: INITIAL_ALTERNATIVES,
            isLoading: false,
            searchQuery: '',

            setSearchQuery: (query) => set({ searchQuery: query }),

            addCategory: (category) => {
                const state = get();
                if (!state.categories.includes(category)) {
                    set({ categories: [...state.categories, category] });
                }
            },

            removeCategory: (category) => {
                set((state) => ({
                    categories: state.categories.filter((c) => c !== category),
                }));
            },

            getFilteredProducts: () => {
                return filterByActiveOrg(get().products);
            },

            addProduct: (data) => {
                const now = new Date().toISOString();
                const activeOrgId = getActiveOrgId();
                let sku = data.sku;
                if (!sku || !sku.trim()) {
                    const { getNextDocumentNumber, incrementDocumentNumber } = useSettingsStore.getState();
                    sku = getNextDocumentNumber('product') || `SKU-${get().products.length + 1}`;
                    incrementDocumentNumber('product');
                }

                const newProduct: Product = {
                    id: uuidv4(),
                    organizationId: activeOrgId,
                    ...data,
                    sku,
                    createdAt: now,
                    updatedAt: now,
                };

                set((state) => ({
                    products: [...state.products, newProduct],
                }));

                // If initial stock quantity was provided during product creation, create an initial movement
                if (data.stockQuantity && data.stockQuantity > 0) {
                    const initialMov: StockMovement = {
                        id: uuidv4(),
                        productId: newProduct.id,
                        type: 'adjustment',
                        quantity: data.stockQuantity,
                        previousQuantity: 0,
                        newQuantity: data.stockQuantity,
                        date: now,
                        reason: 'Initial stock set on product creation'
                    };
                    set((state) => ({
                        movements: [initialMov, ...state.movements]
                    }));
                }

                return newProduct;
            },

            updateProduct: (id, data) => {
                const productBefore = get().products.find(p => p.id === id);
                // FUNDAMENTAL LOCK: Strip sku completely so product SKU can NEVER be changed
                const { sku, ...restData } = data;

                set((state) => ({
                    products: state.products.map((product) =>
                        product.id === id
                            ? {
                                ...product,
                                ...restData,
                                sku: product.sku, // Keep original SKU permanently!
                                updatedAt: new Date().toISOString(),
                            }
                            : product
                    ),
                }));

                // If stockQuantity was manually edited directly on product level, log movement
                if (
                    data.stockQuantity !== undefined &&
                    productBefore &&
                    productBefore.stockQuantity !== data.stockQuantity
                ) {
                    const diff = data.stockQuantity - (productBefore.stockQuantity || 0);
                    const newMovement: StockMovement = {
                        id: uuidv4(),
                        productId: id,
                        type: 'adjustment',
                        quantity: diff,
                        previousQuantity: productBefore.stockQuantity || 0,
                        newQuantity: data.stockQuantity,
                        date: new Date().toISOString(),
                        reason: 'Manual product stock update'
                    };
                    set((state) => ({
                        movements: [newMovement, ...state.movements]
                    }));
                }
            },

            deleteProduct: (id) => {
                set((state) => ({
                    products: state.products.filter((product) => product.id !== id),
                    batches: state.batches.filter((batch) => batch.productId !== id),
                    movements: state.movements.filter((mov) => mov.productId !== id),
                    alternatives: state.alternatives.filter((alt) => alt.productId !== id && alt.alternativeProductId !== id)
                }));
            },

            getProductById: (id) => {
                const product = get().products.find((p) => p.id === id);
                if (!product || !belongsToActiveOrg(product.organizationId)) return undefined;
                return product;
            },

            getProductByBarcode: (barcode) => {
                if (!barcode) return undefined;
                const cleanCode = barcode.trim().toLowerCase();
                return get().products.find(
                    (product) =>
                        belongsToActiveOrg(product.organizationId) &&
                        ((product.barcode && product.barcode.trim().toLowerCase() === cleanCode) ||
                        product.sku.trim().toLowerCase() === cleanCode)
                );
            },


            searchProducts: (query) => {
                const lowerQuery = query.toLowerCase();
                const activeProducts = filterByActiveOrg(get().products);
                return activeProducts.filter(
                    (product) =>
                        product.name.toLowerCase().includes(lowerQuery) ||
                        product.sku.toLowerCase().includes(lowerQuery) ||
                        (product.barcode && product.barcode.toLowerCase().includes(lowerQuery)) ||
                        product.description.toLowerCase().includes(lowerQuery)
                );
            },

            // -------------------- Batch Management --------------------

            addStockBatch: (productId, batchData) => {
                const now = new Date().toISOString();
                const activeOrgId = getActiveOrgId();
                const newBatch: StockBatch = {
                    id: uuidv4(),
                    organizationId: activeOrgId,
                    productId,
                    ...batchData,
                    remainingQuantity: batchData.initialQuantity,
                    status: 'active',
                    createdAt: now,
                    updatedAt: now,
                };

                const product = get().products.find(p => p.id === productId);
                const prevTotalStock = product?.stockQuantity || 0;

                set((state) => {
                    const updatedBatches = [newBatch, ...state.batches];
                    // Recalculate total product stock as sum of remaining batch quantities for this product
                    const prodBatches = updatedBatches.filter(b => b.productId === productId && b.status === 'active');
                    const newTotalStock = prodBatches.reduce((sum, b) => sum + b.remainingQuantity, 0);

                    const updatedProducts = state.products.map(p =>
                        p.id === productId
                            ? { ...p, stockQuantity: newTotalStock, updatedAt: now }
                            : p
                    );

                    // Add purchase movement record
                    const movement: StockMovement = {
                        id: uuidv4(),
                        organizationId: activeOrgId,
                        productId,
                        batchId: newBatch.id,
                        batchNumber: newBatch.batchNumber,
                        type: 'purchase',
                        quantity: newBatch.initialQuantity,
                        previousQuantity: prevTotalStock,
                        newQuantity: newTotalStock,
                        date: now,
                        reason: `Received Batch #${newBatch.batchNumber}${newBatch.supplier ? ` from ${newBatch.supplier}` : ''}`,
                        costPrice: newBatch.costPrice
                    };

                    return {
                        batches: updatedBatches,
                        products: updatedProducts,
                        movements: [movement, ...state.movements]
                    };
                });

                return newBatch;
            },

            updateStockBatch: (batchId, updates) => {
                const now = new Date().toISOString();
                set((state) => {
                    const batch = state.batches.find(b => b.id === batchId);
                    if (!batch) return state;

                    const updatedBatches = state.batches.map(b =>
                        b.id === batchId ? { ...b, ...updates, updatedAt: now } : b
                    );

                    // Sync product stock
                    const prodBatches = updatedBatches.filter(b => b.productId === batch.productId && b.status === 'active');
                    const newTotalStock = prodBatches.reduce((sum, b) => sum + b.remainingQuantity, 0);

                    const updatedProducts = state.products.map(p =>
                        p.id === batch.productId ? { ...p, stockQuantity: newTotalStock, updatedAt: now } : p
                    );

                    return {
                        batches: updatedBatches,
                        products: updatedProducts
                    };
                });
            },

            deleteStockBatch: (batchId) => {
                const batch = get().batches.find(b => b.id === batchId);
                if (!batch) return;

                const now = new Date().toISOString();

                set((state) => {
                    const updatedBatches = state.batches.filter(b => b.id !== batchId);
                    const prodBatches = updatedBatches.filter(b => b.productId === batch.productId && b.status === 'active');
                    const newTotalStock = prodBatches.reduce((sum, b) => sum + b.remainingQuantity, 0);

                    const updatedProducts = state.products.map(p =>
                        p.id === batch.productId ? { ...p, stockQuantity: newTotalStock, updatedAt: now } : p
                    );

                    return {
                        batches: updatedBatches,
                        products: updatedProducts
                    };
                });
            },

            getProductBatches: (productId) => {
                const activeBatches = filterByActiveOrg(get().batches);
                return activeBatches.filter(b => b.productId === productId);
            },

            // -------------------- Stock Movements & Allocation --------------------

            adjustStock: (productId, batchId, newQty, reason, type = 'adjustment') => {
                const product = get().products.find(p => p.id === productId);
                if (!product) return;

                const now = new Date().toISOString();
                const currentTotal = product.stockQuantity || 0;
                const diff = newQty - currentTotal;

                if (batchId) {
                    const batch = get().batches.find(b => b.id === batchId);
                    if (batch) {
                        const newBatchRemaining = Math.max(0, batch.remainingQuantity + diff);
                        get().updateStockBatch(batchId, {
                            remainingQuantity: newBatchRemaining,
                            status: newBatchRemaining === 0 ? 'depleted' : 'active'
                        });
                    }
                } else {
                    set((state) => ({
                        products: state.products.map(p =>
                            p.id === productId ? { ...p, stockQuantity: newQty, updatedAt: now } : p
                        )
                    }));
                }

                const movement: StockMovement = {
                    id: uuidv4(),
                    organizationId: product.organizationId || getActiveOrgId(),
                    productId,
                    batchId,
                    type,
                    quantity: diff,
                    previousQuantity: currentTotal,
                    newQuantity: newQty,
                    date: now,
                    reason,
                };

                set((state) => ({
                    movements: [movement, ...state.movements]
                }));
            },

            deductStockForSale: (productId, quantityNeeded, referenceDocNumber) => {
                const product = get().products.find(p => p.id === productId);
                if (!product || quantityNeeded <= 0) return [];

                const now = new Date().toISOString();
                const prodBatches = get().batches.filter(b => b.productId === productId && b.status === 'active');
                const strategy = product.inventoryStrategy || 'FEFO';

                const newMovements: StockMovement[] = [];
                const prevTotalStock = product.stockQuantity || 0;

                if (prodBatches.length > 0) {
                    // FEFO / FIFO allocation across active batches
                    const allocationResult = allocateStockFromBatches(prodBatches, quantityNeeded, strategy);

                    allocationResult.allocations.forEach(alloc => {
                        get().updateStockBatch(alloc.batchId, {
                            remainingQuantity: alloc.remainingAfter,
                            status: alloc.remainingAfter === 0 ? 'depleted' : 'active'
                        });

                        const mov: StockMovement = {
                            id: uuidv4(),
                            organizationId: product.organizationId || getActiveOrgId(),
                            productId,
                            batchId: alloc.batchId,
                            batchNumber: alloc.batchNumber,
                            type: 'sale',
                            quantity: -alloc.allocatedQuantity,
                            previousQuantity: prevTotalStock,
                            newQuantity: Math.max(0, prevTotalStock - alloc.allocatedQuantity),
                            date: now,
                            reason: `Sale fulfillment ${referenceDocNumber ? `(#${referenceDocNumber})` : ''} via ${strategy}`,
                            referenceDocNumber
                        };
                        newMovements.push(mov);
                    });
                } else {
                    // Simple un-batched stock deduction
                    const newTotal = Math.max(0, prevTotalStock - quantityNeeded);
                    set((state) => ({
                        products: state.products.map(p =>
                            p.id === productId ? { ...p, stockQuantity: newTotal, updatedAt: now } : p
                        )
                    }));

                    const mov: StockMovement = {
                        id: uuidv4(),
                        organizationId: product.organizationId || getActiveOrgId(),
                        productId,
                        type: 'sale',
                        quantity: -quantityNeeded,
                        previousQuantity: prevTotalStock,
                        newQuantity: newTotal,
                        date: now,
                        reason: `Sale fulfillment ${referenceDocNumber ? `(#${referenceDocNumber})` : ''}`,
                        referenceDocNumber
                    };
                    newMovements.push(mov);
                }

                if (newMovements.length > 0) {
                    set((state) => ({
                        movements: [...newMovements, ...state.movements]
                    }));
                }

                return newMovements;
            },

            writeOffWastage: (batchId, writeOffQty, reason) => {
                const batch = get().batches.find(b => b.id === batchId);
                if (!batch || writeOffQty <= 0) return;

                const now = new Date().toISOString();
                const actualDeduct = Math.min(batch.remainingQuantity, writeOffQty);
                const newBatchRemaining = batch.remainingQuantity - actualDeduct;

                get().updateStockBatch(batchId, {
                    remainingQuantity: newBatchRemaining,
                    status: newBatchRemaining === 0 ? 'depleted' : 'active'
                });

                const product = get().products.find(p => p.id === batch.productId);
                const prevTotalStock = product?.stockQuantity || 0;
                const newTotalStock = Math.max(0, prevTotalStock - actualDeduct);

                const mov: StockMovement = {
                    id: uuidv4(),
                    organizationId: batch.organizationId || getActiveOrgId(),
                    productId: batch.productId,
                    batchId: batch.id,
                    batchNumber: batch.batchNumber,
                    type: 'wastage_expiry',
                    quantity: -actualDeduct,
                    previousQuantity: prevTotalStock,
                    newQuantity: newTotalStock,
                    date: now,
                    reason: `Wastage write-off: ${reason}`,
                    costPrice: batch.costPrice
                };

                set((state) => ({
                    movements: [mov, ...state.movements]
                }));
            },

            getProductMovements: (productId) => {
                const activeMovements = filterByActiveOrg(get().movements);
                return activeMovements.filter(m => m.productId === productId);
            },

            // -------------------- Product Alternatives --------------------

            addAlternative: (productId, alternativeProductId, matchType, notes) => {
                const activeOrgId = getActiveOrgId();
                const newAlt: ProductAlternative = {
                    id: uuidv4(),
                    organizationId: activeOrgId,
                    productId,
                    alternativeProductId,
                    matchType,
                    notes
                };

                set((state) => ({
                    alternatives: [...state.alternatives, newAlt]
                }));

                return newAlt;
            },

            removeAlternative: (alternativeId) => {
                set((state) => ({
                    alternatives: state.alternatives.filter(a => a.id !== alternativeId)
                }));
            },

            getProductAlternatives: (productId) => {
                const activeAlternatives = filterByActiveOrg(get().alternatives);
                return activeAlternatives.filter(a => a.productId === productId || a.alternativeProductId === productId);
            }
        }),
        {
            name: 'inflow-products',
            merge: (persistedState, currentState) => {
                const persisted = persistedState as Partial<ProductState> | undefined;
                const mergedCategories = Array.from(
                    new Set([
                        ...DEFAULT_CATEGORIES,
                        ...(persisted?.categories || []),
                        ...(currentState.categories || []),
                    ])
                );
                return {
                    ...currentState,
                    ...persisted,
                    categories: mergedCategories,
                    batches: persisted?.batches && persisted.batches.length > 0 ? persisted.batches : INITIAL_BATCHES,
                    movements: persisted?.movements && persisted.movements.length > 0 ? persisted.movements : INITIAL_MOVEMENTS,
                    alternatives: persisted?.alternatives && persisted.alternatives.length > 0 ? persisted.alternatives : INITIAL_ALTERNATIVES,
                };
            }
        }
    )
);
