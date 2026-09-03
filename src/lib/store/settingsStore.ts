import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateDocumentNumber, DEFAULT_FORMATS, NumberingContext } from '@/lib/utils/numbering';
import { getActiveOrgId } from '@/lib/utils/orgIsolation';
import { UserRole } from '@/lib/types';

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
    companyMap: Record<string, CompanySettings>;
    theme: Theme;
    staffRole: UserRole;
    numbering: NumberingSettings;
    numberingMap: Record<string, NumberingSettings>;
    updateCompany: (settings: Partial<CompanySettings>) => void;
    setTheme: (theme: Theme) => void;
    setStaffRole: (role: UserRole) => void;
    updateNumbering: (settings: Partial<NumberingSettings>) => void;
    customNumberingFormats: Record<string, string[]>;
    customNumberingFormatsMap: Record<string, Record<string, string[]>>;
    addCustomNumberingFormat: (type: string, format: string) => void;
    removeCustomNumberingFormat: (type: string, format: string) => void;
    getNextDocumentNumber: (type: keyof NumberingSettings, context?: NumberingContext, sequenceOffset?: number) => string;
    incrementDocumentNumber: (type: keyof NumberingSettings, amount?: number) => void;
    syncSettingsForActiveOrg: (activeOrgId: string) => void;
}

const defaultCompany: CompanySettings = {
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
};

const defaultNumbering: NumberingSettings = {
    invoice: { format: DEFAULT_FORMATS.invoice, nextNumber: 1 },
    receipt: { format: DEFAULT_FORMATS.receipt, nextNumber: 1 },
    deliveryNote: { format: DEFAULT_FORMATS.deliveryNote, nextNumber: 1 },
    customer: { format: DEFAULT_FORMATS.customer, nextNumber: 1 },
    product: { format: DEFAULT_FORMATS.product, nextNumber: 1 },
};

const defaultCustomNumberingFormats: Record<string, string[]> = {
    invoice: [],
    receipt: [],
    deliveryNote: [],
    customer: [],
    product: []
};

const initialCompanyMap: Record<string, CompanySettings> = {
    'org-primary-default': {
        ...defaultCompany,
        name: 'Primary Organization'
    }
};

const initialNumberingMap: Record<string, NumberingSettings> = {
    'org-primary-default': defaultNumbering
};

const initialFormatsMap: Record<string, Record<string, string[]>> = {
    'org-primary-default': defaultCustomNumberingFormats
};

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set, get) => ({
            company: defaultCompany,
            companyMap: initialCompanyMap,
            theme: 'light',
            numbering: defaultNumbering,
            numberingMap: initialNumberingMap,
            customNumberingFormats: defaultCustomNumberingFormats,
            customNumberingFormatsMap: initialFormatsMap,
            staffRole: 'admin',

            updateCompany: (settings) =>
                set((state) => {
                    const activeOrgId = getActiveOrgId();
                    const currentMap = state.companyMap || {};
                    const currentSettingsForOrg = currentMap[activeOrgId] || { ...defaultCompany };
                    
                    const updatedCompany = { ...currentSettingsForOrg, ...settings };
                    const updatedMap = { ...currentMap, [activeOrgId]: updatedCompany };
                    
                    return {
                        company: updatedCompany,
                        companyMap: updatedMap
                    };
                }),

            setTheme: (theme) => set({ theme }),

            setStaffRole: (staffRole) => set({ staffRole }),

            updateNumbering: (settings) =>
                set((state) => {
                    const activeOrgId = getActiveOrgId();
                    const currentMap = state.numberingMap || {};
                    const currentSettingsForOrg = currentMap[activeOrgId] || { ...defaultNumbering };

                    const updatedNumbering = { ...currentSettingsForOrg, ...settings };
                    const updatedMap = { ...currentMap, [activeOrgId]: updatedNumbering };

                    return {
                        numbering: updatedNumbering,
                        numberingMap: updatedMap
                    };
                }),

            addCustomNumberingFormat: (type: string, format: string) =>
                set((state) => {
                    const activeOrgId = getActiveOrgId();
                    const currentMap = state.customNumberingFormatsMap || {};
                    const currentFormatsForOrg = currentMap[activeOrgId] || { ...defaultCustomNumberingFormats };

                    const updatedFormatsForType = [...(currentFormatsForOrg[type] || []), format];
                    const updatedFormats = {
                        ...currentFormatsForOrg,
                        [type]: updatedFormatsForType
                    };
                    const updatedMap = {
                        ...currentMap,
                        [activeOrgId]: updatedFormats
                    };

                    return {
                        customNumberingFormats: updatedFormats,
                        customNumberingFormatsMap: updatedMap
                    };
                }),

            removeCustomNumberingFormat: (type: string, format: string) =>
                set((state) => {
                    const activeOrgId = getActiveOrgId();
                    const currentMap = state.customNumberingFormatsMap || {};
                    const currentFormatsForOrg = currentMap[activeOrgId] || { ...defaultCustomNumberingFormats };

                    const updatedFormatsForType = (currentFormatsForOrg[type] || []).filter(f => f !== format);
                    const updatedFormats = {
                        ...currentFormatsForOrg,
                        [type]: updatedFormatsForType
                    };
                    const updatedMap = {
                        ...currentMap,
                        [activeOrgId]: updatedFormats
                    };

                    return {
                        customNumberingFormats: updatedFormats,
                        customNumberingFormatsMap: updatedMap
                    };
                }),

            getNextDocumentNumber: (type, context, sequenceOffset = 0) => {
                const { numbering } = get();
                const settings = numbering[type];
                if (!settings) return '';
                return generateDocumentNumber(settings.format, settings.nextNumber + sequenceOffset, context);
            },

            incrementDocumentNumber: (type, amount = 1) =>
                set((state) => {
                    const activeOrgId = getActiveOrgId();
                    const currentMap = state.numberingMap || {};
                    const currentSettingsForOrg = currentMap[activeOrgId] || { ...defaultNumbering };

                    const newNumbering = { ...currentSettingsForOrg };
                    if (newNumbering[type]) {
                        newNumbering[type] = {
                            ...newNumbering[type],
                            nextNumber: newNumbering[type].nextNumber + amount
                        };
                    }
                    const updatedMap = { ...currentMap, [activeOrgId]: newNumbering };
                    
                    return { 
                        numbering: newNumbering,
                        numberingMap: updatedMap 
                    };
                }),

            syncSettingsForActiveOrg: (activeOrgId) => {
                set((state) => {
                    const companyMap = state.companyMap || {};
                    const numberingMap = state.numberingMap || {};
                    const formatsMap = state.customNumberingFormatsMap || {};

                    const orgCompany = companyMap[activeOrgId] || { ...defaultCompany };
                    const orgNumbering = numberingMap[activeOrgId] || { ...defaultNumbering };
                    const orgFormats = formatsMap[activeOrgId] || { ...defaultCustomNumberingFormats };

                    return {
                        company: orgCompany,
                        numbering: orgNumbering,
                        customNumberingFormats: orgFormats
                    };
                });
            },
        }),
        {
            name: 'inflow-settings-storage',
            // @ts-ignore
            onRehydrateStorage: () => (state) => {
                if (state) {
                    if (!state.companyMap) state.companyMap = initialCompanyMap;
                    if (!state.numberingMap) state.numberingMap = initialNumberingMap;
                    if (!state.customNumberingFormatsMap) state.customNumberingFormatsMap = initialFormatsMap;
                    
                    if (!state.numbering.customer) {
                        state.numbering.customer = { format: DEFAULT_FORMATS.customer, nextNumber: 1 };
                    }
                    if (!state.numbering.product) {
                        state.numbering.product = { format: DEFAULT_FORMATS.product, nextNumber: 1 };
                    }
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

