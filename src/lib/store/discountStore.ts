import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Discount, DiscountFormData } from '@/lib/types';

interface DiscountState {
    discounts: Discount[];
    isLoading: boolean;
    searchQuery: string;

    // Actions
    setSearchQuery: (query: string) => void;
    addDiscount: (data: DiscountFormData) => Discount;
    updateDiscount: (id: string, data: Partial<DiscountFormData>) => void;
    deleteDiscount: (id: string) => void;
    getDiscountById: (id: string) => Discount | undefined;
    searchDiscounts: (query: string) => Discount[];
    getActiveDiscounts: () => Discount[];
}

export const useDiscountStore = create<DiscountState>()(
    persist(
        (set, get) => ({
            discounts: [],
            isLoading: false,
            searchQuery: '',

            setSearchQuery: (query) => set({ searchQuery: query }),

            addDiscount: (data) => {
                const now = new Date().toISOString();
                const newDiscount: Discount = {
                    id: uuidv4(),
                    ...data,
                    createdAt: now,
                    updatedAt: now,
                };
                set((state) => ({
                    discounts: [...state.discounts, newDiscount],
                }));
                return newDiscount;
            },

            updateDiscount: (id, data) => {
                set((state) => ({
                    discounts: state.discounts.map((discount) =>
                        discount.id === id
                            ? {
                                ...discount,
                                ...data,
                                updatedAt: new Date().toISOString(),
                            }
                            : discount
                    ),
                }));
            },

            deleteDiscount: (id) => {
                set((state) => ({
                    discounts: state.discounts.filter((discount) => discount.id !== id),
                }));
            },

            getDiscountById: (id) => {
                return get().discounts.find((discount) => discount.id === id);
            },

            searchDiscounts: (query) => {
                const lowerQuery = query.toLowerCase();
                return get().discounts.filter(
                    (discount) =>
                        discount.name.toLowerCase().includes(lowerQuery)
                );
            },

            getActiveDiscounts: () => {
                return get().discounts.filter(d => d.isActive);
            }
        }),
        {
            name: 'inflow-discounts',
        }
    )
);
