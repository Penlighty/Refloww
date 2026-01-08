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
}

interface SettingsState {
    company: CompanySettings;
    theme: Theme;
    numbering: NumberingSettings;
    updateCompany: (settings: Partial<CompanySettings>) => void;
    setTheme: (theme: Theme) => void;
    updateNumbering: (settings: Partial<NumberingSettings>) => void;
    getNextDocumentNumber: (type: 'invoice' | 'receipt' | 'delivery-note') => string;
    incrementDocumentNumber: (type: 'invoice' | 'receipt' | 'delivery-note') => void;
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
            },
            theme: 'light',
            numbering: {
                invoice: { format: DEFAULT_FORMATS.invoice, nextNumber: 1 },
                receipt: { format: DEFAULT_FORMATS.receipt, nextNumber: 1 },
                deliveryNote: { format: DEFAULT_FORMATS.deliveryNote, nextNumber: 1 },
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
            getNextDocumentNumber: (type) => {
                const { numbering } = get();
                // Map the type strings to the keys in numbering settings
                // 'invoice' -> 'invoice'
                // 'receipt' -> 'receipt'
                // 'delivery-note' -> 'deliveryNote'

                let settings: DocumentTypeSettings;

                switch (type) {
                    case 'invoice': settings = numbering.invoice; break;
                    case 'receipt': settings = numbering.receipt; break;
                    case 'delivery-note': settings = numbering.deliveryNote; break;
                    default: return '';
                }

                return generateDocumentNumber(settings.format, settings.nextNumber);
            },
            incrementDocumentNumber: (type) =>
                set((state) => {
                    const newNumbering = { ...state.numbering };

                    switch (type) {
                        case 'invoice':
                            newNumbering.invoice = {
                                ...newNumbering.invoice,
                                nextNumber: newNumbering.invoice.nextNumber + 1
                            };
                            break;
                        case 'receipt':
                            newNumbering.receipt = {
                                ...newNumbering.receipt,
                                nextNumber: newNumbering.receipt.nextNumber + 1
                            };
                            break;
                        case 'delivery-note':
                            newNumbering.deliveryNote = {
                                ...newNumbering.deliveryNote,
                                nextNumber: newNumbering.deliveryNote.nextNumber + 1
                            };
                            break;
                    }
                    return { numbering: newNumbering };
                }),
        }),
        {
            name: 'inflow-settings-storage',
            // @ts-ignore - Simple migration to ensure existing users get defaults if shape mismatches
            onRehydrateStorage: () => (state) => {
                if (state && (!state.numbering.invoice || !state.numbering.invoice.format)) {
                    state.numbering = {
                        invoice: { format: DEFAULT_FORMATS.invoice, nextNumber: 1 },
                        receipt: { format: DEFAULT_FORMATS.receipt, nextNumber: 1 },
                        deliveryNote: { format: DEFAULT_FORMATS.deliveryNote, nextNumber: 1 },
                    };
                }
            }
        }
    )
);
