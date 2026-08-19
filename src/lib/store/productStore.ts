import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Product, ProductFormData } from '@/lib/types';

interface ProductState {
    products: Product[];
    categories: string[];
    isLoading: boolean;
    searchQuery: string;

    // Actions
    setSearchQuery: (query: string) => void;
    addProduct: (data: ProductFormData) => Product;
    updateProduct: (id: string, data: Partial<ProductFormData>) => void;
    deleteProduct: (id: string) => void;
    getProductById: (id: string) => Product | undefined;
    getProductByBarcode: (barcode: string) => Product | undefined;
    searchProducts: (query: string) => Product[];
    addCategory: (category: string) => void;
    removeCategory: (category: string) => void;
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

export const useProductStore = create<ProductState>()(
    persist(
        (set, get) => ({
            products: [
                {
                    id: 'prod-1',
                    name: 'Wireless Noise-Canceling Headphones',
                    sku: 'ELEC-WNH-001',
                    description: 'Premium Bluetooth over-ear headphones with active noise cancellation and 30-hour battery life.',
                    unitPrice: 199.99,
                    category: 'Electronics & Gadgets',
                    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
                    images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800'],
                    isPublishedToStore: true,
                    discountedPrice: 169.99,
                    stockQuantity: 24,
                    storefrontLabel: 'best-seller',
                    storeDescription: 'Enjoy crystal clear audio with high-definition drivers and ultra-soft memory foam earcups.',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: 'prod-2',
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
                    name: 'Ergonomic Mesh Executive Chair',
                    sku: 'OFF-EMC-003',
                    description: 'Adjustable lumbar support ergonomic swivel chair with breathable mesh back and padded armrests.',
                    unitPrice: 249.00,
                    category: 'Home & Kitchen',
                    imageUrl: 'https://images.unsplash.com/photo-1580481072645-022f9a6d83d0?w=800',
                    images: ['https://images.unsplash.com/photo-1580481072645-022f9a6d83d0?w=800'],
                    isPublishedToStore: true,
                    stockQuantity: 8,
                    storefrontLabel: 'in-stock',
                    storeDescription: 'Engineered for all-day comfort with 3D armrest adjustments and pneumatic height controls.',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: 'prod-4',
                    name: 'Artisan Dark Roast Coffee Beans (1kg)',
                    sku: 'FOOD-DRC-004',
                    description: 'Single-origin 100% Arabica roasted coffee beans with rich dark chocolate and hazelnut notes.',
                    unitPrice: 29.50,
                    category: 'Food & Beverages',
                    imageUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800',
                    images: ['https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800'],
                    isPublishedToStore: true,
                    discountedPrice: 24.99,
                    stockQuantity: 50,
                    storefrontLabel: 'new',
                    storeDescription: 'Freshly roasted every week in small batches. Perfect for espresso and french press brewing.',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: 'prod-5',
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
                    name: 'Minimalist Stainless Steel Smartwatch',
                    sku: 'FASH-SW-006',
                    description: 'Water-resistant luxury smart watch with heart rate tracking, step counter, and notification alerts.',
                    unitPrice: 179.99,
                    category: 'Jewelry & Accessories',
                    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
                    images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'],
                    isPublishedToStore: true,
                    stockQuantity: 4,
                    storefrontLabel: 'low-stock',
                    storeDescription: 'Sleek brushed metal finish paired with a vibrant OLED touch screen and 7-day battery life.',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: 'prod-7',
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
                    storefrontLabel: 'flash-sale',
                    storeDescription: 'Dermatologist approved cruelty-free skincare formulated for smooth, radiant and nourished skin.',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: 'prod-8',
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

            addProduct: (data) => {
                const now = new Date().toISOString();
                const newProduct: Product = {
                    id: uuidv4(),
                    ...data,
                    createdAt: now,
                    updatedAt: now,
                };
                set((state) => ({
                    products: [...state.products, newProduct],
                }));
                return newProduct;
            },

            updateProduct: (id, data) => {
                set((state) => ({
                    products: state.products.map((product) =>
                        product.id === id
                            ? {
                                ...product,
                                ...data,
                                updatedAt: new Date().toISOString(),
                            }
                            : product
                    ),
                }));
            },

            deleteProduct: (id) => {
                set((state) => ({
                    products: state.products.filter((product) => product.id !== id),
                }));
            },

            getProductById: (id) => {
                return get().products.find((product) => product.id === id);
            },

            getProductByBarcode: (barcode) => {
                if (!barcode) return undefined;
                const cleanCode = barcode.trim().toLowerCase();
                return get().products.find(
                    (product) =>
                        (product.barcode && product.barcode.trim().toLowerCase() === cleanCode) ||
                        product.sku.trim().toLowerCase() === cleanCode
                );
            },

            searchProducts: (query) => {
                const lowerQuery = query.toLowerCase();
                return get().products.filter(
                    (product) =>
                        product.name.toLowerCase().includes(lowerQuery) ||
                        product.sku.toLowerCase().includes(lowerQuery) ||
                        (product.barcode && product.barcode.toLowerCase().includes(lowerQuery)) ||
                        product.description.toLowerCase().includes(lowerQuery)
                );
            },
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
                };
            }
        }
    )
);
