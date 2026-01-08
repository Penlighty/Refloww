"use client";

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useTemplateStore } from '@/lib/store';
import { DocumentType } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { Button, Card, EmptyState, SearchInput, Modal, ModalFooter, Input, Select, Badge } from '@/components/ui';
import {
    Plus,
    FolderOpen,
    Upload,
    Download,
    FileText,
    Receipt,
    Truck,
    MoreVertical,
    Edit2,
    Trash2,
    Star,
    Image,
    Eye,
    Settings,
    Grid,
    List
} from 'lucide-react';
import TemplateImportExport, { downloadTemplate } from '@/components/TemplateImportExport';

type ViewMode = 'grid' | 'list';

const documentTypeOptions = [
    { value: 'invoice', label: 'Invoice' },
    { value: 'receipt', label: 'Receipt' },
    { value: 'delivery-note', label: 'Delivery Note' },
];

const typeConfig = {
    'invoice': { icon: FileText, color: 'from-blue-400 to-blue-600', bgColor: 'bg-blue-50/50 dark:bg-neutral-800/50', textColor: 'text-blue-600 dark:text-blue-300' },
    'receipt': { icon: Receipt, color: 'from-emerald-400 to-emerald-600', bgColor: 'bg-emerald-50/50 dark:bg-neutral-800/50', textColor: 'text-emerald-600 dark:text-emerald-300' },
    'delivery-note': { icon: Truck, color: 'from-amber-400 to-amber-600', bgColor: 'bg-amber-50/50 dark:bg-neutral-800/50', textColor: 'text-amber-600 dark:text-amber-300' },
};

export default function TemplatesPage() {
    const { templates, addTemplate, deleteTemplate, setDefaultTemplate } = useTemplateStore();

    // UI State
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<string>('all');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Upload Form State
    const [uploadName, setUploadName] = useState('');
    const [uploadType, setUploadType] = useState<DocumentType>('invoice');
    const [uploadPreview, setUploadPreview] = useState<string | null>(null);
    const [uploadFileName, setUploadFileName] = useState('');
    const [uploadOrientation, setUploadOrientation] = useState<'portrait' | 'landscape'>('portrait');
    const [uploadWidth, setUploadWidth] = useState<number | undefined>(undefined);
    const [uploadHeight, setUploadHeight] = useState<number | undefined>(undefined);

    const [uploadMode, setUploadMode] = useState<'single' | 'connected'>('single');
    const [uploadError, setUploadError] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Filter templates
    const filteredTemplates = templates.filter((template) => {
        const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === 'all' || template.type === filterType;
        return matchesSearch && matchesType;
    });

    // Handlers
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    }, []);

    const handleFileSelect = (file: File) => {
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'application/pdf'];
        if (!validTypes.includes(file.type)) {
            setUploadError('Please upload a PDF, PNG, JPG, or SVG file');
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            setUploadError('File size must be less than 10MB');
            return;
        }

        setUploadError('');
        setUploadFileName(file.name);

        // For images, create a preview
        // For images, create a preview
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                setUploadPreview(result);

                // Detect dimensions
                const img = new window.Image();
                img.onload = () => {
                    const isLandscape = img.width > img.height;
                    setUploadOrientation(isLandscape ? 'landscape' : 'portrait');

                    // Calculate document dimensions based on standard A4 widths
                    // Portrait A4 width: 595px
                    // Landscape A4 width: 842px
                    // We lock the width to standard A4 sizes for consistency, but allow height to flow naturally
                    // This ensures "Zoom 100%" feels physically correct on screen

                    if (isLandscape) {
                        setUploadWidth(842);
                        setUploadHeight(Math.round(842 * (img.height / img.width)));
                    } else {
                        setUploadWidth(595);
                        setUploadHeight(Math.round(595 * (img.height / img.width)));
                    }
                };
                img.src = result;
            };
            reader.readAsDataURL(file);
        } else {
            // For PDFs, we'd need to confirm orientation via PDF.js, defaulting to portrait for now
            setUploadPreview('/pdf-placeholder.png');
            setUploadOrientation('portrait');
            setUploadWidth(595);
            setUploadHeight(842);
        }

        // Set default name from file
        if (!uploadName) {
            setUploadName(file.name.replace(/\.[^/.]+$/, ''));
        }

        setIsUploadModalOpen(true);
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFileSelect(files[0]);
        }
    };

    const handleUpload = () => {
        if (!uploadName.trim()) {
            setUploadError('Please enter a template name');
            return;
        }
        if (!uploadPreview) {
            setUploadError('Please select a file to upload');
            return;
        }

        addTemplate({
            name: uploadName,
            type: uploadType,
            imageUrl: uploadPreview,
            originalFileName: uploadFileName,
            orientation: uploadOrientation,

            width: uploadWidth,
            height: uploadHeight,
            mode: uploadMode,
        });

        // Reset form
        setUploadName('');
        setUploadPreview(null);
        setUploadFileName('');
        setUploadMode('single');
        setIsUploadModalOpen(false);
    };

    const handleDelete = () => {
        if (templateToDelete) {
            deleteTemplate(templateToDelete);
            setIsDeleteModalOpen(false);
            setTemplateToDelete(null);
        }
    };

    const openDeleteModal = (id: string) => {
        setTemplateToDelete(id);
        setIsDeleteModalOpen(true);
        setOpenMenuId(null);
    };

    const handleSetDefault = (id: string, type: DocumentType) => {
        setDefaultTemplate(id, type);
        setOpenMenuId(null);
    };

    return (
        <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[#2d3748] dark:text-white">Templates</h1>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                        Upload and manage your document templates
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <TemplateImportExport />
                    <Button
                        leftIcon={<Plus className="w-4 h-4" />}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        New Template
                    </Button>
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.svg"
                    onChange={handleFileInputChange}
                    className="hidden"
                />
            </div>

            {/* Drop Zone (when empty) */}
            {templates.length === 0 && (
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`
                        mb-10 p-16 rounded-[2.5rem] border-2 border-dashed transition-all duration-500 relative overflow-hidden group/main-drop
                        ${isDragging
                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10'
                            : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/20 hover:border-blue-300 dark:hover:border-blue-800'
                        }
                    `}
                >
                    {/* Decorative Background Elements */}
                    <div className={`absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full blur-3xl opacity-20 transition-all duration-500 ${isDragging ? 'bg-blue-400 scale-110' : 'bg-neutral-200 dark:bg-neutral-800'}`} />
                    <div className={`absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full blur-3xl opacity-20 transition-all duration-500 ${isDragging ? 'bg-blue-400 scale-110' : 'bg-neutral-200 dark:bg-neutral-800'}`} />

                    <div className="flex flex-col items-center justify-center text-center relative z-10">
                        <div className={`
                            w-24 h-24 rounded-3xl flex items-center justify-center mb-8 transition-all duration-500 shadow-xl
                            ${isDragging
                                ? 'bg-blue-500 text-white scale-110 rotate-3 shadow-blue-500/20'
                                : 'bg-white dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 group-hover/main-drop:text-blue-500 dark:group-hover/main-drop:text-blue-400 group-hover/main-drop:scale-105'
                            }
                        `}>
                            {isDragging ? (
                                <Plus className="w-12 h-12" strokeWidth={2.5} />
                            ) : (
                                <Upload className="w-12 h-12" strokeWidth={1.5} />
                            )}
                        </div>
                        <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">
                            {isDragging ? 'Ready to drop!' : 'Upload your template'}
                        </h3>
                        <p className="text-neutral-500 dark:text-neutral-400 mb-8 max-w-lg text-lg leading-relaxed">
                            Drag and drop your bank invoice, receipt, or delivery note design. We support PDF, PNG, JPG, and SVG.
                            <br />
                            <span className="text-sm text-neutral-400 dark:text-neutral-500 mt-2 block">
                                <strong>Note:</strong> PDF templates will display a placeholder in the editor. For the best experience, use a PNG or JPG image.
                            </span>
                        </p>
                        <div className="flex items-center gap-4">
                            <Button
                                size="lg"
                                className="rounded-2xl shadow-lg hover:shadow-xl transition-all"
                                leftIcon={<FolderOpen className="w-5 h-5" />}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                Browse Files
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {templates.length > 0 && (
                <>
                    {/* Filters and View Toggle */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <SearchInput
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="Search templates..."
                            className="flex-1 max-w-sm"
                        />
                        <div className="flex items-center gap-3">
                            <Select
                                options={[
                                    { value: 'all', label: 'All Types' },
                                    ...documentTypeOptions
                                ]}
                                value={filterType}
                                onChange={setFilterType}
                                className="w-40"
                            />
                            <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1 shadow-inner">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'grid'
                                        ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                        : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300'
                                        }`}
                                >
                                    <Grid className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'list'
                                        ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                        : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300'
                                        }`}
                                >
                                    <List className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Mini Drop Zone */}
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`
                            mb-8 p-6 rounded-2xl border-2 border-dashed transition-all duration-300 flex items-center justify-center gap-4 cursor-pointer group/drop relative overflow-hidden
                            ${isDragging
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg shadow-blue-500/10 scale-[1.01]'
                                : 'border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/30 hover:border-blue-300 dark:hover:border-blue-800 hover:bg-white dark:hover:bg-neutral-800 hover:shadow-md'
                            }
                        `}
                    >
                        <div className={`
                            w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300
                            ${isDragging
                                ? 'bg-blue-500 text-white rotate-6'
                                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 group-hover/drop:bg-blue-50 dark:group-hover/drop:bg-blue-900/30 group-hover/drop:text-blue-500 group-hover/drop:-rotate-6'
                            }
                        `}>
                            <Upload className="w-6 h-6" />
                        </div>
                        <div className="flex flex-col">
                            <span className={`text-base transition-colors ${isDragging ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-neutral-700 dark:text-neutral-200 font-semibold'}`}>
                                {isDragging ? 'Drop to upload!' : 'Quick Upload'}
                            </span>
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                Drag files here or click to browse
                            </span>
                        </div>
                    </div>

                    {/* Template Grid/List */}
                    {filteredTemplates.length === 0 ? (
                        <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-12 shadow-sm">
                            <EmptyState
                                title="No templates found"
                                description={`No templates match your search. Try a different filter.`}
                            />
                        </div>
                    ) : viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredTemplates.map((template) => {
                                const config = typeConfig[template.type];
                                const TypeIcon = config.icon;
                                return (
                                    <div key={template.id} className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 shadow-sm relative">
                                        <div className="relative aspect-square bg-neutral-100 dark:bg-neutral-900 overflow-hidden rounded-t-2xl border-b border-neutral-100 dark:border-neutral-700">
                                            {template.imageUrl ? (
                                                <img
                                                    src={template.imageUrl}
                                                    alt={template.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
                                                    <Image className="w-12 h-12 text-neutral-300 dark:text-neutral-700" strokeWidth={1} />
                                                </div>
                                            )}
                                            {/* Overlay on hover */}
                                            <div className="absolute inset-0 bg-[#2d3748]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                <Link
                                                    href={`/templates/${template.id}/edit`}
                                                    className="p-3 rounded-xl bg-white/90 text-[#2d3748] hover:bg-white transition-colors"
                                                    title="Edit Fields"
                                                >
                                                    <Edit2 className="w-5 h-5" />
                                                </Link>
                                                <Link
                                                    href={`/templates/${template.id}`}
                                                    className="p-3 rounded-xl bg-white/90 text-[#2d3748] hover:bg-white transition-colors"
                                                >
                                                    <Eye className="w-5 h-5" />
                                                </Link>
                                            </div>
                                            {/* Default Badge */}
                                            {template.isDefault && (
                                                <div className="absolute top-3 left-3">
                                                    <Badge variant="success" size="sm">
                                                        <Star className="w-3 h-3 mr-1" />
                                                        Default
                                                    </Badge>
                                                </div>
                                            )}
                                            {/* Type Badges */}
                                            <div className="absolute top-3 right-3 flex flex-col gap-1.5">
                                                {/* Iterate through fixed order of types to ensure consistent display */}
                                                {['invoice', 'receipt', 'delivery-note'].map((typeKey) => {
                                                    const type = typeKey as DocumentType;
                                                    // Show if it's the main type OR if it exists in variants (and mode is connected)
                                                    const isMain = template.type === type;
                                                    // Ensure we check variants existence safely
                                                    const isVariant = template.mode === 'connected' && template.variants && Object.prototype.hasOwnProperty.call(template.variants, type);

                                                    if (!isMain && !isVariant) return null;

                                                    const config = typeConfig[type];
                                                    const TypeIcon = config.icon;

                                                    return (
                                                        <div
                                                            key={type}
                                                            className={`p-2 rounded-lg ${config.bgColor} shadow-sm border border-white/20 dark:border-white/10`}
                                                            title={documentTypeOptions.find(o => o.value === type)?.label}
                                                        >
                                                            <TypeIcon className={`w-4 h-4 ${config.textColor}`} />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        {/* Template Info */}
                                        <div className="p-4">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className="font-semibold text-[#2d3748] dark:text-white truncate">
                                                        {template.name}
                                                    </h3>
                                                    {template.mode === 'connected' && (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 mt-1 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                            Connected
                                                        </span>
                                                    )}
                                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                                        {template.fields.length} fields mapped
                                                    </p>
                                                </div>
                                                <div className="relative">
                                                    <button
                                                        onClick={() => setOpenMenuId(openMenuId === template.id ? null : template.id)}
                                                        className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                                                    >
                                                        <MoreVertical className="w-4 h-4" />
                                                    </button>
                                                    {openMenuId === template.id && (
                                                        <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 py-1 z-20">
                                                            <Link
                                                                href={`/templates/${template.id}/edit`}
                                                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                                Edit Fields
                                                            </Link>
                                                            {!template.isDefault && (
                                                                <button
                                                                    onClick={() => handleSetDefault(template.id, template.type)}
                                                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                                                                >
                                                                    <Star className="w-4 h-4" />
                                                                    Set as Default
                                                                </button>
                                                            )}
                                                            <div className="h-px bg-neutral-100 dark:bg-neutral-700 my-1" />
                                                            <button
                                                                onClick={() => {
                                                                    downloadTemplate(template);
                                                                    setOpenMenuId(null);
                                                                }}
                                                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                                                            >
                                                                <Download className="w-4 h-4" />
                                                                Export .rfw
                                                            </button>
                                                            <div className="h-px bg-neutral-100 dark:bg-neutral-700 my-1" />
                                                            <button
                                                                onClick={() => openDeleteModal(template.id)}
                                                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                                Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl overflow-hidden shadow-sm">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-neutral-100 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50">
                                        <th className="text-left px-6 py-4 text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Template</th>
                                        <th className="text-left px-6 py-4 text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Type</th>
                                        <th className="text-left px-6 py-4 text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider hidden md:table-cell">Fields</th>
                                        <th className="text-left px-6 py-4 text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider hidden lg:table-cell">Created</th>
                                        <th className="text-right px-6 py-4 text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTemplates.map((template) => {
                                        const config = typeConfig[template.type];
                                        const TypeIcon = config.icon;
                                        return (
                                            <tr key={template.id} className="border-b border-neutral-50 dark:border-neutral-700/50 last:border-b-0 hover:bg-neutral-50/50 dark:hover:bg-neutral-700/30 transition-colors group/row">
                                                <td className="px-6 py-4">
                                                    <Link href={`/templates/${template.id}`} className="flex items-center gap-3 group">
                                                        <div className="w-12 h-16 rounded-lg bg-neutral-100 dark:bg-neutral-900 overflow-hidden flex-shrink-0 shadow-sm">
                                                            {template.imageUrl ? (
                                                                <img
                                                                    src={template.imageUrl}
                                                                    alt={template.name}
                                                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center">
                                                                    <Image className="w-5 h-5 text-neutral-300 dark:text-neutral-700" strokeWidth={1} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium text-[#2d3748] dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{template.name}</span>
                                                            {template.isDefault && (
                                                                <Badge variant="success" size="sm">
                                                                    <Star className="w-3 h-3 mr-1" />
                                                                    Default
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </Link>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex -space-x-1">
                                                            {['invoice', 'receipt', 'delivery-note'].map((typeKey) => {
                                                                const type = typeKey as DocumentType;
                                                                const isMain = template.type === type;
                                                                const isVariant = template.mode === 'connected' && template.variants && Object.prototype.hasOwnProperty.call(template.variants, type);

                                                                if (!isMain && !isVariant) return null;

                                                                const config = typeConfig[type];
                                                                const VIcon = config.icon;

                                                                return (
                                                                    <div
                                                                        key={type}
                                                                        className={`relative p-1.5 rounded-lg ${config.bgColor} shadow-sm border border-white dark:border-neutral-800 ${isMain ? 'z-10' : ''}`}
                                                                        title={documentTypeOptions.find(o => o.value === type)?.label}
                                                                    >
                                                                        <VIcon className={`w-3.5 h-3.5 ${config.textColor}`} />
                                                                    </div>
                                                                );
                                                            })}

                                                            {/* Variant Icons */}
                                                            {false && template.mode === 'connected' && template.variants && (
                                                                Object.keys(template.variants ?? {}).map((variantType) => {
                                                                    const vType = variantType as DocumentType;
                                                                    if (vType === template.type) return null;

                                                                    const vConfig = typeConfig[vType];
                                                                    const VIcon = vConfig.icon;

                                                                    // Determine z-index based on order if needed, but flex row is fine
                                                                    return (
                                                                        <div key={vType} className={`relative p-1.5 rounded-lg ${vConfig.bgColor} shadow-sm border border-white dark:border-neutral-800`} title={documentTypeOptions.find(o => o.value === vType)?.label}>
                                                                            <VIcon className={`w-3.5 h-3.5 ${vConfig.textColor}`} />
                                                                        </div>
                                                                    );
                                                                })
                                                            )}
                                                        </div>

                                                        <div className="flex flex-col">
                                                            <span className="text-sm text-neutral-600 dark:text-neutral-300 capitalize">
                                                                {template.type.replace('-', ' ')}
                                                                {template.mode === 'connected' && template.variants && Object.keys(template.variants).length > 0 && (
                                                                    <span className="text-neutral-400 dark:text-neutral-500 text-xs ml-1">
                                                                        + {Object.keys(template.variants).filter(k => k !== template.type).length}
                                                                    </span>
                                                                )}
                                                            </span>
                                                            {template.mode === 'connected' && (
                                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 w-fit">
                                                                    Connected
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 hidden md:table-cell">
                                                    <span className="text-sm text-neutral-600 dark:text-neutral-300">{template.fields.length}</span>
                                                </td>
                                                <td className="px-6 py-4 hidden lg:table-cell">
                                                    <span className="text-sm text-neutral-500 dark:text-neutral-400">{formatDate(template.createdAt)}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            onClick={() => downloadTemplate(template)}
                                                            className="p-2 rounded-lg text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                                                            title="Export .rfw"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </button>
                                                        <Link
                                                            href={`/templates/${template.id}/edit`}
                                                            className="p-2 rounded-lg text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                                                            title="Edit Fields"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </Link>
                                                        <button
                                                            onClick={() => openDeleteModal(template.id)}
                                                            className="p-2 rounded-lg text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* Upload Modal */}
            <Modal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                title="Upload Template"
                description="Configure your new template"
                size="lg"
            >
                <div className="space-y-4">
                    {/* Preview */}
                    {uploadPreview && (
                        <div className="aspect-[3/4] max-h-64 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden bg-neutral-100 dark:bg-neutral-900">
                            <img
                                src={uploadPreview}
                                alt="Preview"
                                className="w-full h-full object-contain"
                            />
                        </div>
                    )}

                    {uploadPreview === '/pdf-placeholder.png' && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-3 flex gap-3">
                            <div className="shrink-0 text-blue-600 dark:text-blue-400">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div className="text-sm">
                                <p className="font-medium text-blue-900 dark:text-blue-100">PDF Template Detected</p>
                                <p className="text-blue-700 dark:text-blue-300 mt-0.5">
                                    The editor will show a placeholder image. Your fields will still map correctly, but for visual editing, we recommend using a <strong>PNG</strong> or <strong>JPG</strong> of the document.
                                </p>
                            </div>
                        </div>
                    )}

                    <Input
                        label="Template Name"
                        placeholder="e.g. Professional Invoice"
                        value={uploadName}
                        onChange={(e) => setUploadName(e.target.value)}
                        error={uploadError}
                    />

                    <Select
                        label="Document Type"
                        options={documentTypeOptions}
                        value={uploadType}
                        onChange={(v) => setUploadType(v as DocumentType)}
                    />

                    {/* Template Mode Selection */}
                    <div className="space-y-3 pt-2">
                        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                            Template Mode
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setUploadMode('single')}
                                className={`p-4 rounded-xl border-2 text-left transition-all relative ${uploadMode === 'single'
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500'
                                    : 'border-neutral-200 dark:border-neutral-700 hover:border-blue-300 dark:hover:border-neutral-600'
                                    }`}
                            >
                                <div className="font-semibold text-sm mb-1 text-neutral-900 dark:text-white">Single Document</div>
                                <div className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                    One specific layout for one document type (e.g., Invoice only). Simple & standard.
                                </div>
                                {uploadMode === 'single' && (
                                    <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                    </div>
                                )}
                            </button>

                            <button
                                onClick={() => setUploadMode('connected')}
                                className={`p-4 rounded-xl border-2 text-left transition-all relative ${uploadMode === 'connected'
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-500'
                                    : 'border-neutral-200 dark:border-neutral-700 hover:border-emerald-300 dark:hover:border-neutral-600'
                                    }`}
                            >
                                <div className="font-semibold text-sm mb-1 text-neutral-900 dark:text-white">Connected Template</div>
                                <div className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                    One template containing layouts for Invoice, Receipt, & Delivery Note. Shared data.
                                </div>
                                {uploadMode === 'connected' && (
                                    <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                    </div>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
                <ModalFooter>
                    <Button variant="ghost" onClick={() => setIsUploadModalOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleUpload}>
                        Upload Template
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Template"
                size="sm"
            >
                <p className="text-neutral-600 dark:text-neutral-400">
                    Are you sure you want to delete this template? All field mappings will be lost. This action cannot be undone.
                </p>
                <ModalFooter>
                    <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={handleDelete}>
                        Delete Template
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
}
