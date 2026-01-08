import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LedgerEntry, DocumentType, DocumentStatus } from '@/lib/types';
import { useDocumentStore } from './documentStore';

interface LedgerFilters {
    startDate: string | null;
    endDate: string | null;
    documentTypes: DocumentType[];
    statuses: DocumentStatus[];
    searchQuery: string;
    customerId: string | null;
}

interface LedgerState {
    filters: LedgerFilters;
    sortBy: keyof LedgerEntry;
    sortDirection: 'asc' | 'desc';

    // Actions
    setFilters: (filters: Partial<LedgerFilters>) => void;
    resetFilters: () => void;
    setSorting: (column: keyof LedgerEntry, direction?: 'asc' | 'desc') => void;

    // Computed
    getLedgerEntries: () => LedgerEntry[];
    getFilteredEntries: () => LedgerEntry[];
    getTotalRevenue: () => number;
    getTotalByStatus: (status: DocumentStatus) => number;
    getTotalByType: (type: DocumentType) => number;
    getMonthlyTotals: () => { month: string; total: number }[];
}

const defaultFilters: LedgerFilters = {
    startDate: null,
    endDate: null,
    documentTypes: [],
    statuses: [],
    searchQuery: '',
    customerId: null,
};

export const useLedgerStore = create<LedgerState>()(
    persist(
        (set, get) => ({
            filters: { ...defaultFilters },
            sortBy: 'date',
            sortDirection: 'desc',

            setFilters: (newFilters) => {
                set((state) => ({
                    filters: { ...state.filters, ...newFilters },
                }));
            },

            resetFilters: () => {
                set({ filters: { ...defaultFilters } });
            },

            setSorting: (column, direction) => {
                const currentState = get();
                if (direction) {
                    set({ sortBy: column, sortDirection: direction });
                } else {
                    // Toggle direction if same column
                    if (currentState.sortBy === column) {
                        set({ sortDirection: currentState.sortDirection === 'asc' ? 'desc' : 'asc' });
                    } else {
                        set({ sortBy: column, sortDirection: 'desc' });
                    }
                }
            },

            getLedgerEntries: () => {
                const documents = useDocumentStore.getState().documents;

                return documents.map((doc): LedgerEntry => ({
                    id: doc.id,
                    documentId: doc.id,
                    documentType: doc.type,
                    documentNumber: doc.documentNumber,
                    customerId: doc.customerId,
                    customerName: doc.customerName,
                    date: doc.date,
                    amount: doc.grandTotal,
                    status: doc.status,
                    createdAt: doc.createdAt,
                }));
            },

            getFilteredEntries: () => {
                const { filters, sortBy, sortDirection } = get();
                let entries = get().getLedgerEntries();

                // Apply date filters
                if (filters.startDate) {
                    entries = entries.filter((entry) => entry.date >= filters.startDate!);
                }
                if (filters.endDate) {
                    entries = entries.filter((entry) => entry.date <= filters.endDate!);
                }

                // Apply document type filter
                if (filters.documentTypes.length > 0) {
                    entries = entries.filter((entry) =>
                        filters.documentTypes.includes(entry.documentType)
                    );
                }

                // Apply status filter
                if (filters.statuses.length > 0) {
                    entries = entries.filter((entry) =>
                        filters.statuses.includes(entry.status)
                    );
                }

                // Apply customer filter
                if (filters.customerId) {
                    entries = entries.filter((entry) => entry.customerId === filters.customerId);
                }

                // Apply search query
                if (filters.searchQuery) {
                    const query = filters.searchQuery.toLowerCase();
                    entries = entries.filter(
                        (entry) =>
                            entry.documentNumber.toLowerCase().includes(query) ||
                            entry.customerName.toLowerCase().includes(query)
                    );
                }

                // Sort entries
                entries.sort((a, b) => {
                    const aValue = a[sortBy];
                    const bValue = b[sortBy];

                    if (typeof aValue === 'string' && typeof bValue === 'string') {
                        return sortDirection === 'asc'
                            ? aValue.localeCompare(bValue)
                            : bValue.localeCompare(aValue);
                    }

                    if (typeof aValue === 'number' && typeof bValue === 'number') {
                        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
                    }

                    return 0;
                });

                return entries;
            },

            getTotalRevenue: () => {
                const entries = get().getLedgerEntries();
                return entries
                    .filter((entry) => entry.status === 'paid')
                    .reduce((sum, entry) => sum + entry.amount, 0);
            },

            getTotalByStatus: (status) => {
                const entries = get().getLedgerEntries();
                return entries
                    .filter((entry) => entry.status === status)
                    .reduce((sum, entry) => sum + entry.amount, 0);
            },

            getTotalByType: (type) => {
                const entries = get().getLedgerEntries();
                return entries
                    .filter((entry) => entry.documentType === type)
                    .reduce((sum, entry) => sum + entry.amount, 0);
            },

            getMonthlyTotals: () => {
                const entries = get().getLedgerEntries();
                const monthlyMap = new Map<string, number>();

                entries.forEach((entry) => {
                    const date = new Date(entry.date);
                    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

                    monthlyMap.set(
                        monthKey,
                        (monthlyMap.get(monthKey) || 0) + entry.amount
                    );
                });

                return Array.from(monthlyMap.entries())
                    .map(([month, total]) => ({ month, total }))
                    .sort((a, b) => a.month.localeCompare(b.month));
            },
        }),
        {
            name: 'inflow-ledger-filters',
            // Only persist filters and sorting preferences, not computed data
            partialize: (state) => ({
                filters: state.filters,
                sortBy: state.sortBy,
                sortDirection: state.sortDirection,
            }),
        }
    )
);
