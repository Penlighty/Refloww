import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Customer, CustomerFormData } from '@/lib/types';
import { useSettingsStore } from './settingsStore';
import { getActiveOrgId, filterByActiveOrg, belongsToActiveOrg } from '@/lib/utils/orgIsolation';

interface CustomerState {
    customers: Customer[];
    isLoading: boolean;
    searchQuery: string;

    // Actions
    setSearchQuery: (query: string) => void;
    getFilteredCustomers: () => Customer[];
    addCustomer: (data: CustomerFormData) => Customer;
    updateCustomer: (id: string, data: Partial<CustomerFormData>) => void;
    deleteCustomer: (id: string) => void;
    getCustomerById: (id: string) => Customer | undefined;
    searchCustomers: (query: string) => Customer[];
    reformatAllCustomers: () => void;
}

export const useCustomerStore = create<CustomerState>()(
    persist(
        (set, get) => ({
            customers: [],
            isLoading: false,
            searchQuery: '',

            setSearchQuery: (query) => set({ searchQuery: query }),

            getFilteredCustomers: () => {
                return filterByActiveOrg(get().customers);
            },

            addCustomer: (data) => {
                const now = new Date().toISOString();
                const activeOrgId = getActiveOrgId();
                const { getNextDocumentNumber, incrementDocumentNumber } = useSettingsStore.getState();
                const formattedCustomerNumber = data.customerNumber || getNextDocumentNumber('customer', { details: { customerName: data.name } }) || `CUST-${get().customers.length + 1}`;
                incrementDocumentNumber('customer');

                const newCustomer: Customer = {
                    id: uuidv4(),
                    organizationId: data.organizationId || activeOrgId,
                    ...data,
                    customerNumber: formattedCustomerNumber,
                    createdAt: now,
                    updatedAt: now,
                };
                set((state) => ({
                    customers: [...state.customers, newCustomer],
                }));
                return newCustomer;
            },

            updateCustomer: (id, data) => {
                // FUNDAMENTAL LOCK: Strip customerNumber completely so Customer ID can NEVER be changed
                const { customerNumber, ...restData } = data;

                set((state) => ({
                    customers: state.customers.map((customer) =>
                        customer.id === id
                            ? {
                                ...customer,
                                ...restData,
                                customerNumber: customer.customerNumber, // Keep original ID permanently!
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
                const customer = get().customers.find((c) => c.id === id);
                if (!customer || !belongsToActiveOrg(customer.organizationId)) return undefined;
                return customer;
            },

            searchCustomers: (query) => {
                const lowerQuery = query.toLowerCase();
                const activeCustomers = filterByActiveOrg(get().customers);
                return activeCustomers.filter(
                    (customer) =>
                        customer.name.toLowerCase().includes(lowerQuery) ||
                        (customer.customerNumber && customer.customerNumber.toLowerCase().includes(lowerQuery)) ||
                        customer.email.toLowerCase().includes(lowerQuery) ||
                        customer.phone.includes(query)
                );
            },

            reformatAllCustomers: () => {
                const { getNextDocumentNumber, incrementDocumentNumber } = useSettingsStore.getState();
                const customers = get().customers;
                if (customers.length === 0) return;

                const updated = customers.map((c, idx) => ({
                    ...c,
                    customerNumber: getNextDocumentNumber('customer', { details: { customerName: c.name } }, idx),
                    updatedAt: new Date().toISOString()
                }));

                set({ customers: updated });
                incrementDocumentNumber('customer', customers.length);
            },
        }),
        {
            name: 'inflow-customers',
            onRehydrateStorage: () => (state) => {
                if (state && state.customers && state.customers.length > 0) {
                    const { getNextDocumentNumber, incrementDocumentNumber } = useSettingsStore.getState();
                    const numbers = state.customers.map(c => c.customerNumber).filter(Boolean);
                    const hasDuplicates = new Set(numbers).size !== numbers.length;
                    const hasMissing = state.customers.some(c => !c.customerNumber);

                    if (hasMissing || hasDuplicates) {
                        const updated = state.customers.map((c, idx) => ({
                            ...c,
                            customerNumber: getNextDocumentNumber('customer', { details: { customerName: c.name } }, idx),
                        }));
                        useCustomerStore.setState({ customers: updated });
                        incrementDocumentNumber('customer', state.customers.length);
                    }
                }
            }
        }
    )
);
