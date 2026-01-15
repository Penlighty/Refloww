import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateDocumentNumber, DEFAULT_FORMATS } from '@/lib/utils/numbering';

type Theme = 'light' | 'dark' | 'system';

interface DocumentTypeSettings {
    format: string;
    nextNumber: number;
}

export interface NumberingSettings {
    invoice: DocumentTypeSettings;
    receipt: DocumentTypeSettings;
    deliveryNote: DocumentTypeSettings;
    customer: DocumentTypeSettings;
    product: DocumentTypeSettings;
}

interface CompanySettings {
    name: string;
    email: string;
    phone: string;
    address: string;
    website: string;
    taxRate: number;
    currency: string;
    logo: string; // Base64 or data URL
    defaultDueDateDays: number;
    decimalPlaces: number;
    defaultFont: string;
    showFieldHelp: boolean; // Toggle for showing help tooltips on financial terms
    encryptionConfig?: {
        enabled: boolean;
        salt: string;
        verificationIv: string;
        verificationCiphertext: string;
        enabledAt: string;
    };
}

interface SettingsState {
    company: CompanySettings;
    theme: Theme;
    numbering: NumberingSettings;
    updateCompany: (settings: Partial<CompanySettings>) => void;
    setTheme: (theme: Theme) => void;
    updateNumbering: (settings: Partial<NumberingSettings>) => void;
    customNumberingFormats: Record<string, string[]>;
    addCustomNumberingFormat: (type: string, format: string) => void;
    removeCustomNumberingFormat: (type: string, format: string) => void;
    getNextDocumentNumber: (type: keyof NumberingSettings) => string;
    incrementDocumentNumber: (type: keyof NumberingSettings) => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set, get) => ({
            company: {
                name: 'My Company',
                email: 'contact@mycompany.com',
                phone: '',
                address: '',
                website: '',
                taxRate: 10,
                currency: 'USD',
                logo: '',
                defaultDueDateDays: 30,
                decimalPlaces: 2,
                defaultFont: 'Inter',
                showFieldHelp: true,
            },
            theme: 'light',
            numbering: {
                invoice: { format: DEFAULT_FORMATS.invoice, nextNumber: 1 },
                receipt: { format: DEFAULT_FORMATS.receipt, nextNumber: 1 },
                deliveryNote: { format: DEFAULT_FORMATS.deliveryNote, nextNumber: 1 },
                customer: { format: DEFAULT_FORMATS.customer, nextNumber: 1 },
                product: { format: DEFAULT_FORMATS.product, nextNumber: 1 },
            },
            customNumberingFormats: {
                invoice: [],
                receipt: [],
                deliveryNote: [],
                customer: [],
                product: []
            },
            updateCompany: (settings) =>
                set((state) => ({
                    company: { ...state.company, ...settings },
                })),
            setTheme: (theme) => set({ theme }),
            updateNumbering: (settings) =>
                set((state) => ({
                    numbering: { ...state.numbering, ...settings },
                })),
            addCustomNumberingFormat: (type: string, format: string) =>
                set((state) => ({
                    customNumberingFormats: {
                        ...state.customNumberingFormats,
                        [type]: [...(state.customNumberingFormats[type] || []), format]
                    }
                })),
            removeCustomNumberingFormat: (type: string, format: string) =>
                set((state) => ({
                    customNumberingFormats: {
                        ...state.customNumberingFormats,
                        [type]: (state.customNumberingFormats[type] || []).filter(f => f !== format)
                    }
                })),
            getNextDocumentNumber: (type) => {
                const { numbering } = get();
                const settings = numbering[type];
                if (!settings) return '';
                return generateDocumentNumber(settings.format, settings.nextNumber);
            },
            incrementDocumentNumber: (type) =>
                set((state) => {
                    const newNumbering = { ...state.numbering };
                    if (newNumbering[type]) {
                        newNumbering[type] = {
                            ...newNumbering[type],
                            nextNumber: newNumbering[type].nextNumber + 1
                        };
                    }
                    return { numbering: newNumbering };
                }),
        }),
        {
            name: 'inflow-settings-storage',
            // @ts-ignore - Simple migration to ensure existing users get defaults if shape mismatches
            onRehydrateStorage: () => (state) => {
                if (state) {
                    // Ensure new keys exist if loading from old state
                    if (!state.numbering.customer) {
                        state.numbering.customer = { format: DEFAULT_FORMATS.customer, nextNumber: 1 };
                    }
                    if (!state.numbering.product) {
                        state.numbering.product = { format: DEFAULT_FORMATS.product, nextNumber: 1 };
                    }
                    // Ensure custom formats also exist
                    if (!state.customNumberingFormats) {
                        state.customNumberingFormats = { invoice: [], receipt: [], deliveryNote: [], customer: [], product: [] };
                    } else {
                        if (!state.customNumberingFormats.customer) state.customNumberingFormats.customer = [];
                        if (!state.customNumberingFormats.product) state.customNumberingFormats.product = [];
                    }
                }
            }
        }
    )
);

