"use client";

import { useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui';
import { useTemplateStore } from '@/lib/store';
import { Template, MappedField } from '@/lib/types';
import { Download, Upload, Loader2, FileJson } from 'lucide-react';

interface TemplateImportExportProps {
    onImportSuccess?: () => void;
}

export default function TemplateImportExport({ onImportSuccess }: TemplateImportExportProps) {
    const { addTemplate } = useTemplateStore();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isImporting, setIsImporting] = useState(false);

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            // Basic validation
            if (!data.name || !data.fields || !Array.isArray(data.fields)) {
                throw new Error("Invalid .rfw file format");
            }

            // Sanitize and Re-ID to prevent collisions
            const newTemplateId = uuidv4();
            const importedTemplate: Template = {
                ...data,
                id: newTemplateId,
                // Keep original name exactly as mapped, user can rename if needed
                name: data.name,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                // Ensure fields have valid IDs just in case
                fields: data.fields.map((f: MappedField) => ({
                    ...f,
                    id: f.id || uuidv4()
                })),
                isDefault: false,
            };

            // Process variants if they exist to ensure integrity
            if (importedTemplate.variants) {
                const processedVariants: any = {};
                Object.entries(importedTemplate.variants).forEach(([key, variant]) => {
                    // @ts-ignore
                    if (variant && variant.fields) {
                        // @ts-ignore
                        processedVariants[key] = {
                            ...variant,
                            // @ts-ignore
                            fields: variant.fields.map(f => ({ ...f, id: f.id || uuidv4() }))
                        };
                    }
                });
                importedTemplate.variants = processedVariants;
            }

            addTemplate(importedTemplate);

            if (onImportSuccess) {
                onImportSuccess();
            }

            alert("Template imported successfully!");
        } catch (error) {
            console.error("Import failed:", error);
            alert("Failed to import template. Please ensure the file is a valid .rfw template.");
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".rfw,.json" // Accept valid RFW files
                className="hidden"
            />
            <Button
                variant="outline"
                leftIcon={isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                onClick={handleImportClick}
                disabled={isImporting}
            >
                Import Template
            </Button>
        </>
    );
}

// Function to trigger download (can be used anywhere)
export const downloadTemplate = (template: Template) => {
    // Create a clean copy to export
    const exportData = {
        name: template.name,
        type: template.type,
        imageUrl: template.imageUrl,
        originalFileName: template.originalFileName,
        fields: template.fields,
        orientation: template.orientation,
        width: template.width,
        height: template.height,
        mode: template.mode,
        variants: template.variants,
        meta: {
            brand: 'Inflow',
            version: '1.0',
            exportedAt: new Date().toISOString()
        }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.rfw`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
