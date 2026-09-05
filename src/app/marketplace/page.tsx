"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Store,
    Download,
    Eye,
    Search,
    Filter,
    FileText,
    Receipt,
    Truck,
    Tag,
    Sparkles,
    X,
    CheckCircle2,
    RefreshCw,
    ArrowLeft,
    Layers,
    LayoutGrid,
    List
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import {
    getPublishedMarketplaceTemplates,
    incrementTemplateDownload,
    MarketplaceTemplate
} from '@/lib/firebase/admin';
import { useTemplateStore } from '@/lib/store';
import { getActiveOrgId } from '@/lib/utils/orgIsolation';
import { Template, MappedField } from '@/lib/types';
import { toast } from 'react-hot-toast';
import TemplateSheetSlider, { extractTemplateSheets } from '@/components/TemplateSheetSlider';

const typeConfig = {
    'invoice': { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/30', gradient: 'from-blue-500 to-cyan-500' },
    'receipt': { icon: Receipt, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/30', gradient: 'from-purple-500 to-pink-500' },
    'delivery-note': { icon: Truck, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/30', gradient: 'from-orange-500 to-amber-500' }
};

const categories = ['All', 'Professional', 'Minimal', 'Creative', 'Modern', 'Classic', 'Corporate'];

export default function MarketplacePage() {
    const router = useRouter();
    const { importTemplate } = useTemplateStore();
    const [templates, setTemplates] = useState<MarketplaceTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedType, setSelectedType] = useState<string>('all');
    const [previewTemplate, setPreviewTemplate] = useState<MarketplaceTemplate | null>(null);
    const [downloading, setDownloading] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const data = await getPublishedMarketplaceTemplates();
            setTemplates(data);
        } catch (error) {
            console.error('Error loading marketplace templates:', error);
            toast.error('Failed to load templates');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTemplates();
    }, []);

    const handleAddToMyTemplates = async (template: MarketplaceTemplate) => {
        setDownloading(template.id);
        try {
            const templateData = template.templateData;
            if (!templateData) {
                throw new Error('No template data available');
            }

            // Create a new template from the marketplace template explicitly bound to active org
            const newTemplateId = uuidv4();
            const activeOrgId = getActiveOrgId();
            const newTemplate: Template = {
                ...templateData,
                id: newTemplateId,
                organizationId: activeOrgId,
                name: templateData.name || template.name,
                type: templateData.type || template.type,
                imageUrl: templateData.imageUrl || '',
                originalFileName: templateData.originalFileName || `${template.name}.png`,
                orientation: templateData.orientation || 'portrait',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isDefault: false,
                // Re-ID all fields to prevent collisions
                fields: (templateData.fields || []).map((f: MappedField) => ({
                    ...f,
                    id: f.id || uuidv4()
                })),
            };

            // Process variants if they exist
            if (newTemplate.variants) {
                const processedVariants: any = {};
                Object.entries(newTemplate.variants).forEach(([key, variant]) => {
                    if (variant && (variant as any).fields) {
                        processedVariants[key] = {
                            ...variant,
                            fields: (variant as any).fields.map((f: MappedField) => ({
                                ...f,
                                id: f.id || uuidv4()
                            }))
                        };
                    }
                });
                newTemplate.variants = processedVariants;
            }

            // Add to store using importTemplate
            importTemplate(newTemplate);

            // Increment download count
            await incrementTemplateDownload(template.id);

            // Update local count
            setTemplates(prev =>
                prev.map(t => t.id === template.id ? { ...t, downloads: t.downloads + 1 } : t)
            );

            // Show success toast with navigation option
            toast.success(
                (t) => (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            <span className="font-medium">Template Added!</span>
                        </div>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            "{template.name}" has been added to your templates.
                        </p>
                        <button
                            onClick={() => {
                                toast.dismiss(t.id);
                                router.push('/templates');
                            }}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium text-left"
                        >
                            View My Templates →
                        </button>
                    </div>
                ),
                { duration: 5000 }
            );
        } catch (error) {
            console.error('Error adding template:', error);
            toast.error(
                <div className="flex flex-col gap-1">
                    <span className="font-medium">Failed to Add Template</span>
                    <span className="text-sm text-neutral-500">Please try again later.</span>
                </div>
            );
        } finally {
            setDownloading(null);
        }
    };

    const filteredTemplates = templates.filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
        const matchesType = selectedType === 'all' || t.type === selectedType;
        return matchesSearch && matchesCategory && matchesType;
    });

    // Get document types from a template
    const getDocumentTypes = (template: MarketplaceTemplate): string[] => {
        const templateData = template.templateData;
        if (!templateData) return [template.type];

        if (templateData.mode === 'connected' && templateData.variants) {
            return Object.keys(templateData.variants);
        }
        return [templateData.type || template.type];
    };

    return (
        <div className="w-full max-w-full overflow-x-hidden min-h-screen bg-gradient-to-br from-neutral-50 via-white to-blue-50/30 dark:from-neutral-900 dark:via-neutral-900 dark:to-blue-900/10">
            {/* Hero Section */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-pink-600/5 dark:from-blue-600/10 dark:via-purple-600/10 dark:to-pink-600/10" />
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 mb-6 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </button>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                                    <Store className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-[#2d3748] dark:text-white">
                                        Marketplace
                                    </h1>
                                    <p className="text-neutral-500 dark:text-neutral-400">
                                        Browse and download professional templates
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm rounded-xl text-sm font-medium text-neutral-600 dark:text-neutral-300 border border-neutral-200/50 dark:border-neutral-700/50">
                                <Store className="w-4 h-4 text-blue-500" />
                                Global Store for All Organizations
                            </span>
                            <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm rounded-xl text-sm font-medium text-neutral-600 dark:text-neutral-300 border border-neutral-200/50 dark:border-neutral-700/50">
                                <Sparkles className="w-4 h-4 text-amber-500" />
                                {templates.length} Templates Available
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="sticky top-16 z-10 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-b border-neutral-200/50 dark:border-neutral-700/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                        {/* Search */}
                        <div className="relative w-full lg:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                            <input
                                type="text"
                                placeholder="Search templates..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-neutral-900 dark:text-white placeholder-neutral-400 shadow-sm transition-all"
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto min-w-0 flex-1 justify-end">
                            {/* Category Pills - Scrollable along X-axis */}
                            <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1.5 min-w-0 flex-1 sm:flex-initial touch-pan-x scroll-smooth no-scrollbar">
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 cursor-pointer ${selectedCategory === cat
                                            ? 'bg-[#2d3748] dark:bg-white text-white dark:text-neutral-900 shadow-md scale-[1.02]'
                                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-3 flex-shrink-0">
                                {/* Type Filter */}
                                <select
                                    value={selectedType}
                                    onChange={(e) => setSelectedType(e.target.value)}
                                    className="px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-700 dark:text-neutral-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                >
                                    <option value="all">All Types</option>
                                    <option value="invoice">Invoices</option>
                                    <option value="receipt">Receipts</option>
                                    <option value="delivery-note">Delivery Notes</option>
                                </select>

                                {/* View Toggle */}
                                <div className="hidden sm:flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-neutral-700 shadow-sm' : ''}`}
                                    >
                                        <LayoutGrid className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-neutral-700 shadow-sm' : ''}`}
                                    >
                                        <List className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Templates Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <RefreshCw className="w-8 h-8 animate-spin text-neutral-400" />
                    </div>
                ) : filteredTemplates.length === 0 ? (
                    <div className="text-center py-20">
                        <Store className="w-16 h-16 mx-auto text-neutral-300 dark:text-neutral-600 mb-4" />
                        <h3 className="text-lg font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                            No templates found
                        </h3>
                        <p className="text-neutral-500 dark:text-neutral-500">
                            {searchQuery ? 'Try adjusting your search or filters' : 'Check back later for new templates'}
                        </p>
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredTemplates.map((template) => {
                            const docTypes = getDocumentTypes(template);
                            const isConnected = docTypes.length > 1;
                            const primaryConfig = typeConfig[template.type as keyof typeof typeConfig] || typeConfig['invoice'];
                            const PrimaryIcon = primaryConfig.icon;

                            return (
                                <div
                                    key={template.id}
                                    className="group bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 overflow-hidden hover:shadow-xl hover:shadow-neutral-900/5 dark:hover:shadow-black/20 transition-all duration-300 hover:-translate-y-1"
                                >
                                    {/* Thumbnail */}
                                    <div className="relative aspect-[4/3] bg-gradient-to-br from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-900 overflow-hidden">
                                        {template.thumbnail ? (
                                            <img
                                                src={template.thumbnail}
                                                alt={template.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className={`absolute inset-0 bg-gradient-to-br ${primaryConfig.gradient} opacity-10`} />
                                        )}

                                        {/* Type badges */}
                                        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                                            {docTypes.slice(0, 3).map((type) => {
                                                const config = typeConfig[type as keyof typeof typeConfig];
                                                const Icon = config?.icon || FileText;
                                                return (
                                                    <span
                                                        key={type}
                                                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${config?.bg || 'bg-neutral-100'} ${config?.color || 'text-neutral-600'} backdrop-blur-sm`}
                                                    >
                                                        <Icon className="w-3 h-3" />
                                                        {type.replace('-', ' ')}
                                                    </span>
                                                );
                                            })}
                                        </div>

                                        {/* Connected badge */}
                                        {isConnected && (
                                            <div className="absolute top-3 right-3">
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 backdrop-blur-sm">
                                                    <Layers className="w-3 h-3" />
                                                    {docTypes.length} in 1
                                                </span>
                                            </div>
                                        )}

                                        {/* No thumbnail fallback */}
                                        {!template.thumbnail && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <PrimaryIcon className={`w-16 h-16 ${primaryConfig.color} opacity-20`} />
                                            </div>
                                        )}

                                        {/* Hover overlay */}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                                            <button
                                                onClick={() => setPreviewTemplate(template)}
                                                className="p-3 bg-white/90 rounded-xl text-neutral-700 hover:bg-white transition-colors"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleAddToMyTemplates(template)}
                                                disabled={downloading === template.id}
                                                className="p-3 bg-blue-600 rounded-xl text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                                            >
                                                {downloading === template.id ? (
                                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                                ) : (
                                                    <Download className="w-5 h-5" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-4">
                                        <h3 className="font-semibold text-[#2d3748] dark:text-white mb-1 line-clamp-1">
                                            {template.name}
                                        </h3>
                                        <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2 mb-3 min-h-[2.5rem]">
                                            {template.description}
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                                                <Tag className="w-3 h-3" />
                                                {template.category}
                                            </span>
                                            <span className="inline-flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                                                <Download className="w-3 h-3" />
                                                {template.downloads.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* List View */
                    <div className="space-y-3">
                        {filteredTemplates.map((template) => {
                            const docTypes = getDocumentTypes(template);
                            const isConnected = docTypes.length > 1;
                            const primaryConfig = typeConfig[template.type as keyof typeof typeConfig] || typeConfig['invoice'];
                            const PrimaryIcon = primaryConfig.icon;

                            return (
                                <div
                                    key={template.id}
                                    className="group flex items-center gap-4 p-4 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 hover:shadow-lg transition-all"
                                >
                                    {/* Thumbnail */}
                                    <div className={`relative w-24 h-16 rounded-lg overflow-hidden flex-shrink-0 ${primaryConfig.bg}`}>
                                        {template.thumbnail ? (
                                            <img src={template.thumbnail} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <PrimaryIcon className={`w-8 h-8 ${primaryConfig.color} opacity-50`} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-[#2d3748] dark:text-white truncate">
                                                {template.name}
                                            </h3>
                                            {isConnected && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                                                    <Layers className="w-3 h-3" />
                                                    {docTypes.length} types
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-1 mb-2">
                                            {template.description}
                                        </p>
                                        <div className="flex items-center gap-4 text-xs text-neutral-500">
                                            <span className="inline-flex items-center gap-1">
                                                <Tag className="w-3 h-3" />
                                                {template.category}
                                            </span>
                                            <span className="inline-flex items-center gap-1">
                                                <Download className="w-3 h-3" />
                                                {template.downloads.toLocaleString()} downloads
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => setPreviewTemplate(template)}
                                            className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                                        >
                                            <Eye className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleAddToMyTemplates(template)}
                                            disabled={downloading === template.id}
                                            className="flex items-center gap-2 px-4 py-2 bg-[#2d3748] dark:bg-white text-white dark:text-neutral-900 rounded-lg font-medium text-sm hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50"
                                        >
                                            {downloading === template.id ? (
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <Download className="w-4 h-4" />
                                                    Add
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Preview Modal */}
            {previewTemplate && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setPreviewTemplate(null)}
                    />
                    <div className="relative bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
                            <div>
                                <h2 className="text-xl font-bold text-[#2d3748] dark:text-white">
                                    {previewTemplate.name}
                                </h2>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                                    {previewTemplate.category} • {previewTemplate.downloads.toLocaleString()} downloads
                                </p>
                            </div>
                            <button
                                onClick={() => setPreviewTemplate(null)}
                                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-neutral-500" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 overflow-y-auto max-h-[60vh]">
                            {/* Interactive Template Sheet Slider */}
                            <div className="mb-6">
                                <TemplateSheetSlider sheets={extractTemplateSheets(previewTemplate)} />
                            </div>

                            {/* Description */}
                            <div className="mb-6">
                                <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Description</h3>
                                <p className="text-neutral-600 dark:text-neutral-400">
                                    {previewTemplate.description}
                                </p>
                            </div>

                            {/* Document Types */}
                            <div className="mb-6">
                                <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Included Document Types</h3>
                                <div className="flex flex-wrap gap-2">
                                    {getDocumentTypes(previewTemplate).map((type) => {
                                        const config = typeConfig[type as keyof typeof typeConfig];
                                        const Icon = config?.icon || FileText;
                                        return (
                                            <span
                                                key={type}
                                                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${config?.bg || 'bg-neutral-100'} ${config?.color || 'text-neutral-600'}`}
                                            >
                                                <Icon className="w-4 h-4" />
                                                {type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Features */}
                            <div>
                                <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Features</h3>
                                <ul className="space-y-2">
                                    <li className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        Professional design ready to use
                                    </li>
                                    <li className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        Fully customizable fields
                                    </li>
                                    <li className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        Export to PDF & PNG
                                    </li>
                                    {getDocumentTypes(previewTemplate).length > 1 && (
                                        <li className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                            Connected template - convert between document types
                                        </li>
                                    )}
                                </ul>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end gap-3 p-6 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
                            <button
                                onClick={() => setPreviewTemplate(null)}
                                className="px-5 py-2.5 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    await handleAddToMyTemplates(previewTemplate);
                                    setPreviewTemplate(null);
                                }}
                                disabled={downloading === previewTemplate.id}
                                className="flex items-center gap-2 px-6 py-2.5 bg-[#2d3748] dark:bg-white hover:bg-neutral-700 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 rounded-xl font-medium transition-colors disabled:opacity-50"
                            >
                                {downloading === previewTemplate.id ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <Download className="w-4 h-4" />
                                        Add to My Templates
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
