import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Customer, CustomerFormData } from '@/lib/types';

interface CustomerState {
    customers: Customer[];
    isLoading: boolean;
    searchQuery: string;

    // Actions
    setSearchQuery: (query: string) => void;
    addCustomer: (data: CustomerFormData) => Customer;
    updateCustomer: (id: string, data: Partial<CustomerFormData>) => void;
    deleteCustomer: (id: string) => void;
    getCustomerById: (id: string) => Customer | undefined;
    searchCustomers: (query: string) => Customer[];
}

export const useCustomerStore = create<CustomerState>()(
    persist(
        (set, get) => ({
            customers: [],
            isLoading: false,
            searchQuery: '',

            setSearchQuery: (query) => set({ searchQuery: query }),

            addCustomer: (data) => {
                const now = new Date().toISOString();
                const newCustomer: Customer = {
                    id: uuidv4(),
                    ...data,
                    createdAt: now,
                    updatedAt: now,
                };
                set((state) => ({
                    customers: [...state.customers, newCustomer],
                }));
                return newCustomer;
            },

            updateCustomer: (id, data) => {
                set((state) => ({
                    customers: state.customers.map((customer) =>
                        customer.id === id
                            ? {
                                ...customer,
                                ...data,
                                updatedAt: new Date().toISOString(),
                            }
                            : customer
                    ),
                }));
            },

            deleteCustomer: (id) => {
                set((state) => ({
                    customers: state.customers.filter((customer) => customer.id !== id),
                }));
            },

            getCustomerById: (id) => {
                return get().customers.find((customer) => customer.id === id);
            },

            searchCustomers: (query) => {
                const lowerQuery = query.toLowerCase();
                return get().customers.filter(
                    (customer) =>
                        customer.name.toLowerCase().includes(lowerQuery) ||
                        customer.email.toLowerCase().includes(lowerQuery) ||
                        customer.phone.includes(query)
                );
            },
        }),
        {
            name: 'inflow-customers',
        }
    )
);
