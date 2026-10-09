// Export all stores
export { useCustomerStore } from './customerStore';
export { useProductStore, DEFAULT_CATEGORIES } from './productStore';
export { useTemplateStore } from './templateStore';
export { useDocumentStore } from './documentStore';
export { useLedgerStore } from './ledgerStore';
export { useSettingsStore } from './settingsStore';
export { useDiscountStore } from './discountStore';
export { useStorefrontStore } from './useStorefrontStore';
export { useOrganizationStore } from './organizationStore';
export { useTransactionStore } from './transactionStore';

import { useCustomerStore } from './customerStore';
import { useProductStore, DEFAULT_CATEGORIES } from './productStore';
import { useTemplateStore } from './templateStore';
import { useDocumentStore } from './documentStore';
import { useLedgerStore } from './ledgerStore';
import { useSettingsStore } from './settingsStore';
import { useDiscountStore } from './discountStore';
import { useStorefrontStore } from './useStorefrontStore';
import { useOrganizationStore } from './organizationStore';
import { useTransactionStore } from './transactionStore';

/**
 * Completely purges all in-memory Zustand stores and browser localStorage/sessionStorage.
 * Prevents device caching leaks when signing out or switching accounts on the same device.
 */
export function clearAllUserStores() {
    try {
        useCustomerStore.setState({ customers: [], isLoading: false, searchQuery: '' });
        useDocumentStore.setState({ documents: [], isLoading: false, activeDocumentId: null, invoiceCounter: 1, receiptCounter: 1, deliveryNoteCounter: 1 });
        useProductStore.setState({ products: [], categories: DEFAULT_CATEGORIES, batches: [], movements: [], alternatives: [], isLoading: false, searchQuery: '' });
        useTemplateStore.setState({ templates: [], isLoading: false, activeTemplateId: null });
        useDiscountStore.setState({ discounts: [], isLoading: false, searchQuery: '' });
        useLedgerStore.setState({
            filters: {
                startDate: null,
                endDate: null,
                documentTypes: [],
                statuses: [],
                searchQuery: '',
                customerId: null
            },
            sortBy: 'date',
            sortDirection: 'desc'
        });
        useTransactionStore.setState({ transactions: [], transactionCounter: 1001, activeTransactionId: null, isLoading: false });
        useOrganizationStore.setState({
            organizations: [
                {
                    id: 'org-primary-default',
                    name: 'Primary Organization',
                    ownerEmail: 'owner@inflow.app',
                    roleInOrg: 'admin',
                    createdAt: new Date().toISOString(),
                    members: [
                        {
                            id: 'mem-owner-1',
                            email: 'owner@inflow.app',
                            name: 'Organization Owner',
                            role: 'admin',
                            status: 'active',
                            invitedAt: new Date().toISOString(),
                            joinedAt: new Date().toISOString()
                        }
                    ]
                }
            ],
            activeOrganizationId: 'org-primary-default',
            pendingInvitations: []
        });
        useSettingsStore.setState({
            companyMap: {},
            numberingMap: {},
            customNumberingFormatsMap: {},
            staffRole: 'admin'
        });
        useStorefrontStore.setState({
            settingsMap: {},
            registeredSlugs: [],
            cart: [],
            orders: []
        });
    } catch (err) {
        console.error('Error clearing memory stores:', err);
    }

    if (typeof window !== 'undefined') {
        const keys = [
            'refloww_organizations_storage',
            'inflow-documents',
            'inflow-customers',
            'inflow-products',
            'inflow-templates',
            'inflow-discounts',
            'inflow-settings-storage',
            'inflow-ledger-filters',
            'inflow-transactions-storage',
            'inflow-storefront-storage',
            'refloww_encryption_session',
            'STORAGE_KEY_JWK',
            'STORAGE_KEY_TIMESTAMP',
            'inflow_jwk',
            'inflow_timestamp'
        ];
        keys.forEach(key => {
            try {
                localStorage.removeItem(key);
                sessionStorage.removeItem(key);
            } catch (e) {
                // ignore
            }
        });

        try {
            localStorage.clear();
            sessionStorage.clear();
        } catch (e) {
            // ignore
        }
    }
}


