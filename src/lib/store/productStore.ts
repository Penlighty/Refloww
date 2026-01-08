import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Product, ProductFormData } from '@/lib/types';

interface ProductState {
    products: Product[];
    isLoading: boolean;
    searchQuery: string;

    // Actions
    setSearchQuery: (query: string) => void;
    addProduct: (data: ProductFormData) => Product;
    updateProduct: (id: string, data: Partial<ProductFormData>) => void;
    deleteProduct: (id: string) => void;
    getProductById: (id: string) => Product | undefined;
    searchProducts: (query: string) => Product[];
}

export const useProductStore = create<ProductState>()(
    persist(
        (set, get) => ({
            products: [],
            isLoading: false,
            searchQuery: '',

            setSearchQuery: (query) => set({ searchQuery: query }),

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

            searchProducts: (query) => {
                const lowerQuery = query.toLowerCase();
                return get().products.filter(
                    (product) =>
                        product.name.toLowerCase().includes(lowerQuery) ||
                        product.sku.toLowerCase().includes(lowerQuery) ||
                        product.description.toLowerCase().includes(lowerQuery)
                );
            },
        }),
        {
            name: 'inflow-products',
        }
    )
);
