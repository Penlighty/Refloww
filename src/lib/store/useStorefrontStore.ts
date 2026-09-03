import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { StorefrontSettings, StorefrontOrder, StorefrontCartItem, Product } from '@/lib/types';
import { getActiveOrgId, filterByActiveOrg } from '@/lib/utils/orgIsolation';
import { useOrganizationStore } from './organizationStore';
import { useTransactionStore } from './transactionStore';

interface StorefrontState {
    settings: StorefrontSettings;
    settingsMap: Record<string, StorefrontSettings>;
    orders: StorefrontOrder[];
    cart: StorefrontCartItem[];
    registeredSlugs: string[];
    updateSettings: (settings: Partial<StorefrontSettings>) => void;
    isSlugAvailable: (slug: string) => boolean;
    addToCart: (product: Product, quantity?: number) => void;
    removeFromCart: (productId: string) => void;
    updateCartQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;
    addOrder: (order: StorefrontOrder) => void;
    updateOrderStatus: (orderId: string, status: 'pending' | 'completed' | 'cancelled') => void;
    syncSettingsForActiveOrg: (activeOrgId: string) => void;
    getSettingsForSlug: (slug: string) => StorefrontSettings | undefined;
    getFilteredOrders: () => StorefrontOrder[];
}

const defaultSettings: StorefrontSettings = {
    storeName: 'My Online Store',
    storeSlug: 'my-store',
    description: 'Welcome to our storefront! Browse our high quality products and services below.',
    bannerUrl: '',
    logoUrl: '',
    contactEmail: 'hello@scribera.space',
    contactPhone: '+1 234 567 8900',
    websiteUrl: 'www.scribera.space',
    address: '123 Main Street, Suite 100',
    currency: 'USD',
    isActive: true,
    paymentInstructions: 'Direct bank transfer or online payment upon checkout.',
    allowDirectCheckout: true,
    themePreset: 'slate-dark',
    headerGradient: 'from-slate-900 via-neutral-900 to-slate-800',
    primaryAccentColor: '#2563eb',
    headerTextColor: '#ffffff',
    enableMonnifyPayment: true,
    monnifyApiKey: 'MK_TEST_SAF3849382',
    monnifySecretKey: '',
    monnifyContractCode: '4938201948',
    monnifySubAccountCode: 'MFY_SUB_382910492817',
    monnifyEnvironment: 'sandbox',
    enablePaystackPayment: true,
    paystackPublicKey: '',
    paystackSubAccountCode: '',
    feeBearer: 'storefront'
};

const initialSettingsMap: Record<string, StorefrontSettings> = {
    'org-primary-default': {
        ...defaultSettings,
        organizationId: 'org-primary-default'
    }
};

const reservedSlugs = ['admin', 'api', 'dashboard', 'settings', 'auth', 'login', 'signup', 'catalog', 'checkout'];

export const useStorefrontStore = create<StorefrontState>()(
    persist(
        (set, get) => ({
            settings: defaultSettings,
            settingsMap: initialSettingsMap,
            orders: [],
            cart: [],
            registeredSlugs: ['my-store', 'acme-tech', 'nexus-goods'],

            updateSettings: (newSettings) =>
                set((state) => {
                    const activeOrgId = getActiveOrgId();
                    const currentMap = state.settingsMap || {};
                    const currentSettingsForOrg = currentMap[activeOrgId] || { ...defaultSettings, organizationId: activeOrgId };
                    
                    const updatedSettings = { ...currentSettingsForOrg, ...newSettings, organizationId: activeOrgId };
                    const updatedMap = { ...currentMap, [activeOrgId]: updatedSettings };
                    
                    let updatedSlugs = state.registeredSlugs || [];
                    if (newSettings.storeSlug && !updatedSlugs.includes(newSettings.storeSlug)) {
                        updatedSlugs = [...updatedSlugs, newSettings.storeSlug];
                    }
                    return {
                        settings: updatedSettings,
                        settingsMap: updatedMap,
                        registeredSlugs: updatedSlugs
                    };
                }),

            isSlugAvailable: (slug: string) => {
                const state = get();
                const activeOrgId = getActiveOrgId();
                const normalized = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
                if (!normalized || reservedSlugs.includes(normalized)) return false;
                
                const currentSettingsForOrg = (state.settingsMap || {})[activeOrgId] || state.settings;
                if (currentSettingsForOrg.storeSlug === normalized) return true;
                
                const isUsedInMap = Object.values(state.settingsMap || {}).some(
                    s => s.organizationId !== activeOrgId && s.storeSlug === normalized
                );
                if (isUsedInMap) return false;
                
                return !(state.registeredSlugs || []).includes(normalized);
            },

            addToCart: (product, quantity = 1) =>
                set((state) => {
                    const existingIndex = state.cart.findIndex(item => item.product.id === product.id);
                    if (existingIndex > -1) {
                        const updatedCart = [...state.cart];
                        updatedCart[existingIndex] = {
                            ...updatedCart[existingIndex],
                            quantity: updatedCart[existingIndex].quantity + quantity
                        };
                        return { cart: updatedCart };
                    }
                    return { cart: [...state.cart, { product, quantity }] };
                }),

            removeFromCart: (productId) =>
                set((state) => ({
                    cart: state.cart.filter(item => item.product.id !== productId)
                })),

            updateCartQuantity: (productId, quantity) =>
                set((state) => {
                    if (quantity <= 0) {
                        return { cart: state.cart.filter(item => item.product.id !== productId) };
                    }
                    return {
                        cart: state.cart.map(item =>
                            item.product.id === productId ? { ...item, quantity } : item
                        )
                    };
                }),

            clearCart: () => set({ cart: [] }),

            addOrder: (order) => {
                const activeOrgId = getActiveOrgId();
                const orderWithOrg = { ...order, organizationId: order.organizationId || activeOrgId };
                set((state) => ({
                    orders: [orderWithOrg, ...state.orders]
                }));
                try {
                    useTransactionStore.getState().syncOrderToTransaction(orderWithOrg);
                } catch (e) {
                    console.error('Error syncing order to transaction:', e);
                }
            },

            updateOrderStatus: (orderId, status) => {
                set((state) => {
                    const updatedOrders = state.orders.map(order =>
                        order.id === orderId ? { ...order, status } : order
                    );
                    const updatedOrder = updatedOrders.find(o => o.id === orderId);
                    if (updatedOrder) {
                        try {
                            useTransactionStore.getState().syncOrderToTransaction(updatedOrder);
                        } catch (e) {
                            console.error('Error syncing updated order to transaction:', e);
                        }
                    }
                    return { orders: updatedOrders };
                });
            },

            syncSettingsForActiveOrg: (activeOrgId) => {
                set((state) => {
                    const map = state.settingsMap || {};
                    const currentSettings = map[activeOrgId] || { ...defaultSettings, organizationId: activeOrgId };
                    return {
                        settings: currentSettings
                    };
                });
            },

            getSettingsForSlug: (slug) => {
                const map = get().settingsMap || {};
                return Object.values(map).find(s => s.storeSlug === slug);
            },

            getFilteredOrders: () => {
                return filterByActiveOrg(get().orders);
            },
        }),
        {
            name: 'inflow-storefront-storage',
        }
    )
);

// Auto-sync storefront settings when active organization switches
if (typeof window !== 'undefined') {
    useOrganizationStore.subscribe((state) => {
        useStorefrontStore.getState().syncSettingsForActiveOrg(state.activeOrganizationId);
    });
}
