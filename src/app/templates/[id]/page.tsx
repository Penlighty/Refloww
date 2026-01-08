"use client";

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTemplateStore } from '@/lib/store';
import { formatDate } from '@/lib/utils';
import { Button, EmptyState, Badge } from '@/components/ui';
import {
    ArrowLeft,
    Edit2,
    Trash2,
    Star,
    FileText,
    Receipt,
    Truck,
    Settings,
    Copy,
    Download,
    Layers
} from 'lucide-react';
import { useState } from 'react';
import { Modal, ModalFooter } from '@/components/ui';

const typeConfig = {
    'invoice': { icon: FileText, label: 'Invoice', bgColor: 'bg-blue-50', textColor: 'text-blue-600' },
    'receipt': { icon: Receipt, label: 'Receipt', bgColor: 'bg-emerald-50', textColor: 'text-emerald-600' },
    'delivery-note': { icon: Truck, label: 'Delivery Note', bgColor: 'bg-amber-50', textColor: 'text-amber-600' },
};

export default function TemplateDetailPage() {
    const params = useParams();
    const router = useRouter();
    const templateId = params.id as string;

    const { templates, deleteTemplate, setDefaultTemplate } = useTemplateStore();
    const template = templates.find(t => t.id === templateId);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    if (!template) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="bg-white border border-neutral-100 rounded-2xl p-12">
                    <EmptyState
                        icon={<Layers className="w-8 h-8 text-neutral-400" strokeWidth={1.5} />}
                        title="Template not found"
                        description="The template you're looking for doesn't exist or has been deleted."
                        action={
                            <Button onClick={() => router.push('/templates')}>
                                Back to Templates
                            </Button>
                        }
                    />
                </div>
            </div>
        );
    }

    const config = typeConfig[template.type];
    const TypeIcon = config.icon;

    const handleDelete = () => {
        deleteTemplate(templateId);
        router.push('/templates');
    };

    const handleSetDefault = () => {
        setDefaultTemplate(templateId, template.type);
    };

    return (
        <div className="max-w-6xl mx-auto">
            {/* Back Link */}
            <Link
                href="/templates"
                className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-[#2d3748] transition-colors mb-6"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Templates
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Template Preview */}
                <div className="lg:col-span-2">
                    <div className="bg-white border border-neutral-100 rounded-2xl overflow-hidden">
                        <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-[#2d3748]">Preview</h2>
                            <Link
                                href={`/templates/${templateId}/edit`}
                                className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                            >
                                Edit Fields →
                            </Link>
                        </div>
                        <div className="p-6 bg-neutral-50">
                            <div className="aspect-[3/4] bg-white rounded-xl shadow-lg overflow-hidden max-h-[600px]">
                                {template.imageUrl ? (
                                    <img
                                        src={template.imageUrl}
                                        alt={template.name}
                                        className="w-full h-full object-contain"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Layers className="w-16 h-16 text-neutral-300" strokeWidth={1} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Template Info */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Header Card */}
                    <div className="bg-white border border-neutral-100 rounded-2xl p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div className={`p-3 rounded-xl ${config.bgColor}`}>
                                <TypeIcon className={`w-6 h-6 ${config.textColor}`} />
                            </div>
                            {template.isDefault && (
                                <Badge variant="success" size="sm">
                                    <Star className="w-3 h-3 mr-1" />
                                    Default
                                </Badge>
                            )}
                        </div>
                        <h1 className="text-xl font-bold text-[#2d3748] mb-1">{template.name}</h1>
                        <p className="text-sm text-neutral-500">{config.label} Template</p>

                        <div className="mt-6 space-y-3">
                            <div className="flex items-center justify-between py-2 border-b border-neutral-100">
                                <span className="text-sm text-neutral-500">Fields Mapped</span>
                                <span className="text-sm font-semibold text-[#2d3748]">{template.fields.length}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-neutral-100">
                                <span className="text-sm text-neutral-500">Created</span>
                                <span className="text-sm text-[#2d3748]">{formatDate(template.createdAt)}</span>
                            </div>
                            <div className="flex items-center justify-between py-2">
                                <span className="text-sm text-neutral-500">Last Updated</span>
                                <span className="text-sm text-[#2d3748]">{formatDate(template.updatedAt)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions Card */}
                    <div className="bg-white border border-neutral-100 rounded-2xl p-4 space-y-2">
                        <Link href={`/templates/${templateId}/edit`}>
                            <Button variant="primary" fullWidth leftIcon={<Settings className="w-4 h-4" />}>
                                Edit Field Mapping
                            </Button>
                        </Link>

                        {!template.isDefault && (
                            <Button variant="outline" fullWidth leftIcon={<Star className="w-4 h-4" />} onClick={handleSetDefault}>
                                Set as Default
                            </Button>
                        )}

                        <Button variant="ghost" fullWidth leftIcon={<Copy className="w-4 h-4" />}>
                            Duplicate Template
                        </Button>

                        <Button variant="ghost" fullWidth leftIcon={<Download className="w-4 h-4" />}>
                            Download Image
                        </Button>

                        <div className="pt-2 border-t border-neutral-100 mt-2">
                            <Button variant="danger" fullWidth leftIcon={<Trash2 className="w-4 h-4" />} onClick={() => setIsDeleteModalOpen(true)}>
                                Delete Template
                            </Button>
                        </div>
                    </div>

                    {/* Fields Summary */}
                    {template.fields.length > 0 && (
                        <div className="bg-white border border-neutral-100 rounded-2xl overflow-hidden">
                            <div className="p-4 border-b border-neutral-100">
                                <h3 className="text-sm font-semibold text-[#2d3748]">Mapped Fields</h3>
                            </div>
                            <div className="max-h-60 overflow-y-auto">
                                {template.fields.map((field) => (
                                    <div key={field.id} className="flex items-center justify-between px-4 py-3 border-b border-neutral-50 last:border-b-0">
                                        <span className="text-sm text-[#2d3748]">{field.label}</span>
                                        <span className="text-xs text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded">{field.type}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Template"
                size="sm"
            >
                <p className="text-neutral-600">
                    Are you sure you want to delete <strong className="text-[#2d3748]">{template.name}</strong>?
                    All field mappings will be lost. This action cannot be undone.
                </p>
                <ModalFooter>
                    <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                    <Button variant="danger" onClick={handleDelete}>Delete Template</Button>
                </ModalFooter>
            </Modal>
        </div>
    );
}
