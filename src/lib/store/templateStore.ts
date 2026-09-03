import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Template, MappedField, DocumentType } from '@/lib/types';
import { getActiveOrgId, filterByActiveOrg, belongsToActiveOrg } from '@/lib/utils/orgIsolation';

interface TemplateState {
    templates: Template[];
    isLoading: boolean;
    activeTemplateId: string | null;

    // Actions
    setActiveTemplate: (id: string | null) => void;
    addTemplate: (data: {
        name: string;
        type: DocumentType;
        imageUrl: string;
        originalFileName: string;
        orientation: 'portrait' | 'landscape';
        width?: number;
        height?: number;
        mode?: 'single' | 'connected';
        fields?: MappedField[];
        variants?: any;
        coverImage?: string;
    }) => Template;
    importTemplate: (template: Template) => void;
    updateTemplate: (id: string, data: Partial<Omit<Template, 'id' | 'createdAt'>>) => void;
    deleteTemplate: (id: string) => void;
    getTemplateById: (id: string) => Template | undefined;
    getTemplatesByType: (type: DocumentType) => Template[];
    getFilteredTemplates: () => Template[];

    // Field mapping
    addField: (templateId: string, field: Omit<MappedField, 'id'>) => void;
    updateField: (templateId: string, fieldId: string, data: Partial<MappedField>) => void;
    deleteField: (templateId: string, fieldId: string) => void;
    setDefaultTemplate: (id: string, type: DocumentType) => void;
}

export const useTemplateStore = create<TemplateState>()(
    persist(
        (set, get) => ({
            templates: [],
            isLoading: false,
            activeTemplateId: null,

            setActiveTemplate: (id) => set({ activeTemplateId: id }),

            addTemplate: (data) => {
                const now = new Date().toISOString();
                const activeOrgId = getActiveOrgId();
                const newTemplate: Template = {
                    id: uuidv4(),
                    organizationId: activeOrgId,
                    name: data.name,
                    type: data.type,
                    imageUrl: data.imageUrl,
                    originalFileName: data.originalFileName,
                    orientation: data.orientation,
                    width: data.width,
                    height: data.height,
                    fields: data.fields || [],
                    isDefault: false,
                    createdAt: now,
                    updatedAt: now,
                    mode: data.mode || 'single',
                    coverImage: data.coverImage,
                    variants: data.variants || (data.mode === 'connected' ? {
                        [data.type]: {
                            imageUrl: data.imageUrl,
                            fields: data.fields || [],
                            orientation: data.orientation,
                            width: data.width,
                            height: data.height
                        }
                    } : undefined)
                };
                set((state) => ({
                    templates: [...state.templates, newTemplate],
                }));
                return newTemplate;
            },

            importTemplate: (template) => {
                const activeOrgId = getActiveOrgId();
                const templateWithOrg = {
                    ...template,
                    organizationId: activeOrgId
                };
                // Check if template with same ID already exists in the active organization
                const existing = get().templates.find((t) => t.id === templateWithOrg.id && belongsToActiveOrg(t.organizationId));
                if (existing) {
                    // Update existing template instead
                    set((state) => ({
                        templates: state.templates.map((t) =>
                            t.id === templateWithOrg.id && belongsToActiveOrg(t.organizationId)
                                ? { ...templateWithOrg, updatedAt: new Date().toISOString() }
                                : t
                        ),
                    }));
                } else {
                    // Add new template
                    set((state) => ({
                        templates: [...state.templates, templateWithOrg],
                    }));
                }
            },

            updateTemplate: (id, data) => {
                set((state) => ({
                    templates: state.templates.map((template) =>
                        template.id === id && belongsToActiveOrg(template.organizationId)
                            ? {
                                ...template,
                                ...data,
                                updatedAt: new Date().toISOString(),
                            }
                            : template
                    ),
                }));
            },

            deleteTemplate: (id) => {
                set((state) => ({
                    templates: state.templates.filter((template) => !(template.id === id && belongsToActiveOrg(template.organizationId))),
                }));
            },

            getTemplateById: (id) => {
                const template = get().templates.find((t) => t.id === id);
                if (!template || !belongsToActiveOrg(template.organizationId)) return undefined;
                return template;
            },

            getFilteredTemplates: () => {
                return filterByActiveOrg<Template>(get().templates);
            },

            getTemplatesByType: (type) => {
                const activeTemplates = get().getFilteredTemplates();
                return activeTemplates.filter((template) => template.type === type);
            },

            addField: (templateId, fieldData) => {
                const newField: MappedField = {
                    id: uuidv4(),
                    ...fieldData,
                };
                set((state) => ({
                    templates: state.templates.map((template) =>
                        template.id === templateId && belongsToActiveOrg(template.organizationId)
                            ? {
                                ...template,
                                fields: [...template.fields, newField],
                                updatedAt: new Date().toISOString(),
                            }
                            : template
                    ),
                }));
            },

            updateField: (templateId, fieldId, data) => {
                set((state) => ({
                    templates: state.templates.map((template) =>
                        template.id === templateId && belongsToActiveOrg(template.organizationId)
                            ? {
                                ...template,
                                fields: template.fields.map((field) =>
                                    field.id === fieldId ? { ...field, ...data } : field
                                ),
                                updatedAt: new Date().toISOString(),
                            }
                            : template
                    ),
                }));
            },

            deleteField: (templateId, fieldId) => {
                set((state) => ({
                    templates: state.templates.map((template) =>
                        template.id === templateId && belongsToActiveOrg(template.organizationId)
                            ? {
                                ...template,
                                fields: template.fields.filter((field) => field.id !== fieldId),
                                updatedAt: new Date().toISOString(),
                            }
                            : template
                    ),
                }));
            },

            setDefaultTemplate: (id, type) => {
                set((state) => ({
                    templates: state.templates.map((template) => {
                        const isOrgMatch = belongsToActiveOrg(template.organizationId);
                        if (!isOrgMatch) return template;

                        return {
                            ...template,
                            isDefault: template.type === type ? template.id === id : template.isDefault,
                            updatedAt: template.id === id || (template.type === type && template.isDefault)
                                ? new Date().toISOString()
                                : template.updatedAt,
                        };
                    }),
                }));
            },

        }),
        {
            name: 'inflow-templates',
        }
    )
);
