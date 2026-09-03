import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Discount, DiscountFormData } from '@/lib/types';
import { getActiveOrgId, filterByActiveOrg, belongsToActiveOrg } from '@/lib/utils/orgIsolation';

interface DiscountState {
    discounts: Discount[];
    isLoading: boolean;
    searchQuery: string;

    // Actions
    setSearchQuery: (query: string) => void;
    getFilteredDiscounts: () => Discount[];
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

            getFilteredDiscounts: () => {
                return filterByActiveOrg<Discount>(get().discounts);
            },

            addDiscount: (data) => {
                const now = new Date().toISOString();
                const activeOrgId = getActiveOrgId();
                const newDiscount: Discount = {
                    id: uuidv4(),
                    organizationId: activeOrgId,
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
                const discount = get().discounts.find((d) => d.id === id);
                if (!discount || !belongsToActiveOrg(discount.organizationId)) return undefined;
                return discount;
            },

            searchDiscounts: (query) => {
                const lowerQuery = query.toLowerCase();
                const activeDiscounts = filterByActiveOrg(get().discounts);
                return activeDiscounts.filter(
                    (discount) =>
                        discount.name.toLowerCase().includes(lowerQuery)
                );
            },

            getActiveDiscounts: () => {
                const activeDiscounts = filterByActiveOrg(get().discounts);
                return activeDiscounts.filter(d => d.isActive);
            }
        }),
        {
            name: 'inflow-discounts',
        }
    )
);
