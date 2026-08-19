"use client";

import { useEffect, useState, useRef } from 'react';
import {
    Plus,
    LayoutTemplate,
    MoreVertical,
    Download,
    Eye,
    Tag,
    Trash2,
    Power,
    PowerOff,
    RefreshCw,
    Search,
    FileText,
    Receipt,
    Truck,
    Edit2,
    X,
    CheckCircle,
    Upload,
    Image as ImageIcon,
    Layers,
    FileUp,
    AlertCircle
} from 'lucide-react';
import {
    getMarketplaceTemplates,
    createMarketplaceTemplate,
    updateMarketplaceTemplate,
    deleteMarketplaceTemplate,
    toggleMarketplaceTemplatePublished,
    MarketplaceTemplate
} from '@/lib/firebase/admin';
import { useAuth } from '@/lib/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { DocumentType } from '@/lib/types';

const typeConfig = {
    'invoice': { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/30' },
    'receipt': { icon: Receipt, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/30' },
    'delivery-note': { icon: Truck, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/30' }
};

const categories = ['Professional', 'Minimal', 'Creative', 'Modern', 'Classic', 'Corporate'];

interface ParsedRfwData {
    name: string;
    type: DocumentType;
    mode: 'single' | 'connected';
    documentTypes: DocumentType[];
    hasVariants: boolean;
    hasCoverImage: boolean;
    coverImage?: string;
    rawData: any;
}

export default function MarketplaceAdminPage() {
    const { user } = useAuth();
    const [templates, setTemplates] = useState<MarketplaceTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formLoading, setFormLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    // File upload refs
    const rfwInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        type: 'invoice' as DocumentType,
        category: 'Professional',
        published: false,
        thumbnail: ''
    });

    // Parsed RFW Data
    const [parsedRfw, setParsedRfw] = useState<ParsedRfwData | null>(null);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const data = await getMarketplaceTemplates();
            setTemplates(data);
        } catch (error) {
            console.error('Error loading templates:', error);
            toast.error('Failed to load templates');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTemplates();
    }, []);

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            type: 'invoice',
            category: 'Professional',
            published: false,
            thumbnail: ''
        });
        setParsedRfw(null);
        setIsCreating(false);
        setEditingId(null);
        if (rfwInputRef.current) rfwInputRef.current.value = '';
        if (coverInputRef.current) coverInputRef.current.value = '';
    };

    const handleEdit = (template: MarketplaceTemplate) => {
        setFormData({
            name: template.name,
            description: template.description,
            type: template.type,
            category: template.category,
            published: template.published,
            thumbnail: template.thumbnail || ''
        });

        // Parse existing template data if available
        if (template.templateData) {
            const docTypes: DocumentType[] = [];
            if (template.templateData.mode === 'connected' && template.templateData.variants) {
                Object.keys(template.templateData.variants).forEach(key => {
                    docTypes.push(key as DocumentType);
                });
            } else {
                docTypes.push(template.templateData.type || template.type);
            }

            setParsedRfw({
                name: template.templateData.name || template.name,
                type: template.templateData.type || template.type,
                mode: template.templateData.mode || 'single',
                documentTypes: docTypes,
                hasVariants: !!template.templateData.variants,
                hasCoverImage: !!template.templateData.coverImage,
                coverImage: template.templateData.coverImage,
                rawData: template.templateData
            });
        }

        setEditingId(template.id);
        setIsCreating(true);
        setOpenMenuId(null);
    };

    const handleRfwUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            // Validate basic structure
            if (!data.name || !data.fields || !Array.isArray(data.fields)) {
                toast.error('Invalid .rfw file format');
                return;
            }

            // Detect document types
            const documentTypes: DocumentType[] = [];

            if (data.mode === 'connected' && data.variants) {
                // Connected template with multiple types
                Object.keys(data.variants).forEach(key => {
                    if (['invoice', 'receipt', 'delivery-note'].includes(key)) {
                        documentTypes.push(key as DocumentType);
                    }
                });
            } else {
                // Single template
                documentTypes.push(data.type || 'invoice');
            }

            const parsed: ParsedRfwData = {
                name: data.name,
                type: data.type || 'invoice',
                mode: data.mode || 'single',
                documentTypes,
                hasVariants: !!data.variants,
                hasCoverImage: !!data.coverImage,
                coverImage: data.coverImage,
                rawData: data
            };

            setParsedRfw(parsed);

            // Pre-fill form with detected data
            setFormData(prev => ({
                ...prev,
                name: data.name,
                type: data.type || 'invoice',
                thumbnail: data.coverImage || prev.thumbnail
            }));

            toast.success(`Detected ${documentTypes.length} document type(s)`);
        } catch (error) {
            console.error('Error parsing RFW file:', error);
            toast.error('Failed to parse .rfw file');
        }
    };

    const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            toast.error('Image must be less than 2MB');
            return;
        }

        const loadingToast = toast.loading('Compressing cover image...');
        try {
            const { compressImage } = await import('@/lib/utils/image-utils');
            const compressedBase64 = await compressImage(file, 800, 0.6);
            setFormData(prev => ({ ...prev, thumbnail: compressedBase64 }));
            toast.success('Cover image processed and loaded', { id: loadingToast });
        } catch (error) {
            console.error('Error processing cover image:', error);
            toast.error('Failed to upload cover image', { id: loadingToast });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.description) {
            toast.error('Name and description are required');
            return;
        }

        if (!parsedRfw && !editingId) {
            toast.error('Please upload an .rfw template file');
            return;
        }

        setFormLoading(true);
        try {
            if (editingId) {
                await updateMarketplaceTemplate(editingId, {
                    name: formData.name,
                    description: formData.description,
                    type: formData.type,
                    category: formData.category,
                    published: formData.published,
                    thumbnail: formData.thumbnail || undefined,
                    templateData: parsedRfw?.rawData
                });
                toast.success(`Template "${formData.name}" updated successfully!`);
            } else {
                await createMarketplaceTemplate({
                    name: formData.name,
                    description: formData.description,
                    type: formData.type,
                    category: formData.category,
                    published: formData.published,
                    thumbnail: formData.thumbnail || undefined,
                    templateData: parsedRfw?.rawData,
                    createdBy: user?.uid || 'admin'
                });
                toast.success(`Template "${formData.name}" created successfully!`);
            }
            resetForm();
            await loadTemplates();
        } catch (error) {
            console.error(error);
            toast.error('Failed to save template');
        } finally {
            setFormLoading(false);
        }
    };

    const handleTogglePublished = async (id: string, currentState: boolean) => {
        setActionLoading(id);
        try {
            await toggleMarketplaceTemplatePublished(id, !currentState);
            setTemplates(prev =>
                prev.map(t => t.id === id ? { ...t, published: !currentState } : t)
            );
            toast.success(currentState ? 'Template unpublished and hidden from marketplace' : 'Template published and now visible in marketplace!');
        } catch (error) {
            toast.error('Failed to toggle status');
        } finally {
            setActionLoading(null);
            setOpenMenuId(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this template?')) return;

        setActionLoading(id);
        try {
            await deleteMarketplaceTemplate(id);
            setTemplates(prev => prev.filter(t => t.id !== id));
            toast.success('Template deleted successfully');
        } catch (error) {
            toast.error('Failed to delete');
        } finally {
            setActionLoading(null);
            setOpenMenuId(null);
        }
    };

    const getTemplateDocTypes = (template: MarketplaceTemplate): DocumentType[] => {
        if (!template.templateData) return [template.type];

        if (template.templateData.mode === 'connected' && template.templateData.variants) {
            return Object.keys(template.templateData.variants) as DocumentType[];
        }
        return [template.templateData.type || template.type];
    };

    const filteredTemplates = templates.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const publishedCount = templates.filter(t => t.published).length;
    const draftCount = templates.filter(t => !t.published).length;
    const totalDownloads = templates.reduce((sum, t) => sum + t.downloads, 0);

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#2d3748] dark:text-white">Template Marketplace</h1>
                    <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                        Manage public templates available to all users.
                        <span className="ml-2 text-sm">
                            <span className="text-emerald-600 font-medium">{publishedCount} Published</span>
                            {' · '}
                            <span className="text-neutral-400">{draftCount} Drafts</span>
                            {' · '}
                            <span className="text-blue-600">{totalDownloads.toLocaleString()} Total Downloads</span>
                        </span>
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadTemplates}
                        className="p-2 text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 bg-[#2d3748] dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 px-4 py-2 rounded-xl font-medium text-sm transition-colors shadow-lg shadow-neutral-900/20"
                    >
                        <Plus className="w-4 h-4" />
                        Add Template
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                    type="text"
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-neutral-900 dark:text-white placeholder-neutral-400 shadow-sm transition-all"
                />
            </div>

            {/* Create/Edit Panel */}
            {isCreating && (
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-[#2d3748] dark:text-white">
                            {editingId ? 'Edit Template' : 'Add New Template'}
                        </h2>
                        <button
                            onClick={resetForm}
                            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-neutral-400" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* RFW Upload Section */}
                        {!editingId && (
                            <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border-2 border-dashed border-blue-200 dark:border-blue-800">
                                <div className="flex flex-col items-center text-center">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
                                        <FileUp className="w-7 h-7 text-white" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-[#2d3748] dark:text-white mb-2">
                                        Upload Template File
                                    </h3>
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                                        Upload an .rfw template file to auto-detect document types
                                    </p>

                                    <input
                                        ref={rfwInputRef}
                                        type="file"
                                        accept=".rfw,.json"
                                        onChange={handleRfwUpload}
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => rfwInputRef.current?.click()}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-[#2d3748] dark:bg-white text-white dark:text-neutral-900 rounded-xl font-medium text-sm hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-colors"
                                    >
                                        <Upload className="w-4 h-4" />
                                        Select .rfw File
                                    </button>
                                </div>

                                {/* Parsed RFW Info */}
                                {parsedRfw && (
                                    <div className="mt-6 p-4 bg-white/80 dark:bg-neutral-800/80 rounded-xl border border-neutral-200 dark:border-neutral-700">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                                                <CheckCircle className="w-5 h-5 text-emerald-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-medium text-[#2d3748] dark:text-white">
                                                    {parsedRfw.name}
                                                </h4>
                                                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                                                    {parsedRfw.mode === 'connected' ? 'Connected Template' : 'Single Template'}
                                                </p>

                                                {/* Document Types */}
                                                <div className="flex flex-wrap gap-2 mt-3">
                                                    {parsedRfw.documentTypes.map(type => {
                                                        const config = typeConfig[type];
                                                        const Icon = config?.icon || FileText;
                                                        return (
                                                            <span
                                                                key={type}
                                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${config?.bg} ${config?.color}`}
                                                            >
                                                                <Icon className="w-3.5 h-3.5" />
                                                                {type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                            </span>
                                                        );
                                                    })}
                                                    {parsedRfw.hasVariants && (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                                                            <Layers className="w-3.5 h-3.5" />
                                                            Multi-variant
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Features */}
                                                <div className="flex flex-wrap gap-3 mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                                                    <span>Fields: {parsedRfw.rawData.fields?.length || 0}</span>
                                                    {parsedRfw.hasCoverImage && (
                                                        <span className="text-emerald-600">✓ Has cover image</span>
                                                    )}
                                                    <span>Mode: {parsedRfw.mode}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Template Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                                    Template Name *
                                </label>
                                <input
                                    required
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-neutral-900 dark:text-white placeholder-neutral-400 transition-all"
                                    placeholder="e.g. Modern Invoice Pro"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                                    Primary Document Type
                                </label>
                                <select
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value as DocumentType })}
                                    className="w-full px-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-neutral-900 dark:text-white transition-all"
                                >
                                    <option value="invoice">📄 Invoice</option>
                                    <option value="receipt">🧾 Receipt</option>
                                    <option value="delivery-note">📦 Delivery Note</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                                Description *
                            </label>
                            <textarea
                                required
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                                className="w-full px-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-neutral-900 dark:text-white placeholder-neutral-400 transition-all resize-none"
                                placeholder="Describe what makes this template special..."
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                                    Category
                                </label>
                                <select
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-neutral-900 dark:text-white transition-all"
                                >
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Cover Image Upload */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                                    Cover Image
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        ref={coverInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleCoverImageUpload}
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => coverInputRef.current?.click()}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl text-sm font-medium hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
                                    >
                                        <ImageIcon className="w-4 h-4" />
                                        {formData.thumbnail ? 'Change Image' : 'Upload Image'}
                                    </button>
                                    {formData.thumbnail && (
                                        <div className="relative group">
                                            <img
                                                src={formData.thumbnail}
                                                alt="Cover"
                                                className="w-12 h-12 rounded-lg object-cover border border-neutral-200 dark:border-neutral-600"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, thumbnail: '' })}
                                                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                    {parsedRfw?.hasCoverImage && !formData.thumbnail && (
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, thumbnail: parsedRfw.coverImage || '' })}
                                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                            Use template cover
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.published}
                                onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                                className="w-5 h-5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                Publish immediately (visible to all users)
                            </span>
                        </label>

                        <div className="flex items-center gap-4 pt-4 border-t border-neutral-100 dark:border-neutral-700">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-5 py-2.5 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={formLoading || (!parsedRfw && !editingId)}
                                className="flex items-center gap-2 px-6 py-2.5 bg-[#2d3748] dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 rounded-xl font-medium transition-colors disabled:opacity-50"
                            >
                                {formLoading ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                    <CheckCircle className="w-4 h-4" />
                                )}
                                {editingId ? 'Save Changes' : 'Add Template'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Templates Table */}
            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px] md:min-w-full">
                        <thead>
                            <tr className="bg-neutral-50/50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-700 text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                                <th className="px-6 py-4">Template Name</th>
                                <th className="px-6 py-4">Document Types</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">Downloads</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Last Updated</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center">
                                        <RefreshCw className="w-6 h-6 mx-auto animate-spin text-neutral-400" />
                                    </td>
                                </tr>
                            ) : filteredTemplates.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-neutral-500">
                                        {searchQuery ? 'No templates match your search.' : 'No templates yet.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredTemplates.map((template) => {
                                    const docTypes = getTemplateDocTypes(template);
                                    const isConnected = docTypes.length > 1;
                                    const primaryConfig = typeConfig[template.type] || typeConfig['invoice'];
                                    const PrimaryIcon = primaryConfig?.icon || LayoutTemplate;

                                    return (
                                        <tr key={template.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center border border-neutral-200 dark:border-neutral-600 overflow-hidden ${primaryConfig?.bg}`}>
                                                        {template.thumbnail ? (
                                                            <img src={template.thumbnail} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <PrimaryIcon className={`w-6 h-6 ${primaryConfig?.color}`} />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-[#2d3748] dark:text-white">{template.name}</div>
                                                        <div className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1 max-w-xs">
                                                            {template.description}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {docTypes.map(type => {
                                                        const config = typeConfig[type];
                                                        const Icon = config?.icon || FileText;
                                                        return (
                                                            <span
                                                                key={type}
                                                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config?.bg} ${config?.color}`}
                                                            >
                                                                <Icon className="w-3 h-3" />
                                                                {type.split('-')[0]}
                                                            </span>
                                                        );
                                                    })}
                                                    {isConnected && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                                                            <Layers className="w-3 h-3" />
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 text-xs font-medium">
                                                    <Tag className="w-3 h-3" />
                                                    {template.category}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-300">
                                                    <Download className="w-4 h-4 text-neutral-400" />
                                                    {template.downloads.toLocaleString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${template.published
                                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                    }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${template.published ? 'bg-emerald-500' : 'bg-amber-500'
                                                        }`}></span>
                                                    {template.published ? 'Published' : 'Draft'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-neutral-500 dark:text-neutral-400">
                                                {template.updatedAt
                                                    ? new Date(template.updatedAt).toLocaleDateString()
                                                    : new Date(template.createdAt).toLocaleDateString()
                                                }
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="relative inline-block">
                                                    <button
                                                        onClick={() => setOpenMenuId(openMenuId === template.id ? null : template.id)}
                                                        className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                                                    >
                                                        <MoreVertical className="w-5 h-5" />
                                                    </button>

                                                    {openMenuId === template.id && (
                                                        <>
                                                            <div
                                                                className="fixed inset-0 z-10"
                                                                onClick={() => setOpenMenuId(null)}
                                                            />
                                                            <div className="absolute right-0 mt-2 w-48 rounded-xl shadow-xl bg-white dark:bg-neutral-800 ring-1 ring-black/5 dark:ring-white/10 z-20 py-1 origin-top-right border border-neutral-100 dark:border-neutral-700">
                                                                <button
                                                                    className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                                                                    onClick={() => handleEdit(template)}
                                                                >
                                                                    <Edit2 className="w-4 h-4" />
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                                                                    onClick={() => handleTogglePublished(template.id, template.published)}
                                                                    disabled={actionLoading === template.id}
                                                                >
                                                                    {template.published ? (
                                                                        <>
                                                                            <PowerOff className="w-4 h-4" />
                                                                            Unpublish
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Power className="w-4 h-4" />
                                                                            Publish
                                                                        </>
                                                                    )}
                                                                </button>
                                                                <div className="h-px bg-neutral-100 dark:bg-neutral-700 my-1" />
                                                                <button
                                                                    className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                                    onClick={() => handleDelete(template.id)}
                                                                    disabled={actionLoading === template.id}
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
