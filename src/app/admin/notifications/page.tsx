"use client";

import { useEffect, useState } from 'react';
import {
    Bell,
    Megaphone,
    Gift,
    Info,
    Plus,
    Trash2,
    Eye,
    MousePointer2,
    X,
    RefreshCw,
    Power,
    PowerOff,
    AlertTriangle,
    Edit2,
    CheckCircle,
    LayoutGrid,
    List as ListIcon
} from 'lucide-react';
import {
    getAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    toggleAnnouncementActive,
    Announcement
} from '@/lib/firebase/admin';
import { useAuth } from '@/lib/contexts/AuthContext';
import { toast } from 'react-hot-toast';

const typeConfig = {
    announcement: { icon: Megaphone, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/30' },
    promotion: { icon: Gift, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/30' },
    greeting: { icon: Bell, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
    warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/30' }
};

export default function NotificationsPage() {
    const { user } = useAuth();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formLoading, setFormLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        message: '',
        type: 'announcement' as Announcement['type'],
        displayStyle: 'banner' as 'banner' | 'popup' | 'notification' | 'modal',
        isActive: true,
        ctaText: '',
        ctaLink: '',
        // New Intelligent Options
        imageUrl: '',
        modalSize: 'md' as 'sm' | 'md' | 'lg',
        expiresAt: '',
        allowDismiss: true
    });

    const loadAnnouncements = async () => {
        setLoading(true);
        try {
            const data = await getAnnouncements(true); // Include inactive
            setAnnouncements(data);
        } catch (error) {
            console.error('Error loading announcements:', error);
            toast.error('Failed to load announcements');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAnnouncements();
    }, []);

    const resetForm = () => {
        setFormData({
            title: '',
            message: '',
            type: 'announcement',
            displayStyle: 'banner',
            isActive: true,
            ctaText: '',
            ctaLink: '',
            imageUrl: '',
            modalSize: 'md',
            expiresAt: '',
            allowDismiss: true
        });
        setIsCreating(false);
        setEditingId(null);
    };

    const handleEdit = (announcement: Announcement) => {
        setFormData({
            title: announcement.title,
            message: announcement.message,
            type: announcement.type,
            displayStyle: announcement.displayStyle || 'banner',
            isActive: announcement.isActive,
            ctaText: announcement.ctaText || '',
            ctaLink: announcement.ctaLink || '',
            imageUrl: announcement.imageUrl || '',
            modalSize: announcement.modalSize || 'md',
            expiresAt: announcement.expiresAt || '',
            allowDismiss: announcement.allowDismiss ?? true
        });
        setEditingId(announcement.id);
        setIsCreating(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.message) {
            toast.error('Title and message are required');
            return;
        }

        setFormLoading(true);
        try {
            if (editingId) {
                // Update existing
                await updateAnnouncement(editingId, {
                    title: formData.title,
                    message: formData.message,
                    type: formData.type,
                    displayStyle: formData.displayStyle,
                    isActive: formData.isActive,
                    ctaText: formData.ctaText || '',
                    ctaLink: formData.ctaLink || '',
                    imageUrl: formData.imageUrl || '',
                    modalSize: formData.modalSize,
                    expiresAt: formData.expiresAt,
                    allowDismiss: formData.allowDismiss
                });
                toast.success('Announcement updated');
            } else {
                // Create new
                await createAnnouncement({
                    title: formData.title,
                    message: formData.message,
                    type: formData.type,
                    displayStyle: formData.displayStyle,
                    isActive: formData.isActive,
                    ctaText: formData.ctaText || '',
                    ctaLink: formData.ctaLink || '',
                    imageUrl: formData.imageUrl || '',
                    modalSize: formData.modalSize,
                    expiresAt: formData.expiresAt,
                    allowDismiss: formData.allowDismiss,
                    createdBy: user?.uid || 'admin'
                });
                toast.success('Announcement published');
            }
            resetForm();
            await loadAnnouncements();
        } catch (error) {
            console.error(error);
            toast.error('Failed to save announcement');
        } finally {
            setFormLoading(false);
        }
    };

    const handleToggleActive = async (id: string, currentState: boolean) => {
        setActionLoading(id);
        try {
            await toggleAnnouncementActive(id, !currentState);
            setAnnouncements(prev =>
                prev.map(a => a.id === id ? { ...a, isActive: !currentState } : a)
            );
            toast.success(currentState ? 'Deactivated' : 'Activated');
        } catch (error) {
            toast.error('Failed to toggle status');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this announcement?')) return;

        setActionLoading(id);
        try {
            await deleteAnnouncement(id);
            setAnnouncements(prev => prev.filter(a => a.id !== id));
            toast.success('Deleted');
        } catch (error) {
            toast.error('Failed to delete');
        } finally {
            setActionLoading(null);
        }
    };

    const activeCount = announcements.filter(a => a.isActive).length;
    const inactiveCount = announcements.filter(a => !a.isActive).length;

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#2d3748] dark:text-white">
                        Notifications & Announcements
                    </h1>
                    <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                        Manage global banners and broadcast messages.
                        <span className="ml-2 text-sm">
                            <span className="text-emerald-600 font-medium">{activeCount} Active</span>
                            {' · '}
                            <span className="text-neutral-400">{inactiveCount} Inactive</span>
                        </span>
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 mr-2">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid'
                                ? 'bg-white dark:bg-neutral-700 text-blue-600 shadow-sm'
                                : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'}`}
                            title="Grid View"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'list'
                                ? 'bg-white dark:bg-neutral-700 text-blue-600 shadow-sm'
                                : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'}`}
                            title="List View"
                        >
                            <ListIcon className="w-4 h-4" />
                        </button>
                    </div>
                    <button
                        onClick={loadAnnouncements}
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
                        New Announcement
                    </button>
                </div>
            </div>

            {/* Create/Edit Panel */}
            {
                isCreating && (
                    <div className="max-w-3xl mx-auto bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-8 shadow-lg shadow-neutral-200/50 dark:shadow-neutral-900/50 animate-in fade-in slide-in-from-top-4 mb-10">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-[#2d3748] dark:text-white">
                                {editingId ? 'Edit Announcement' : 'Create New Announcement'}
                            </h2>
                            <button
                                onClick={resetForm}
                                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-neutral-400" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5 max-w-3xl">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                                        Title *
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-neutral-900 dark:text-white placeholder-neutral-400 transition-all"
                                        placeholder="e.g. New Feature Available"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                                        Type
                                    </label>
                                    <select
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-neutral-900 dark:text-white transition-all"
                                    >
                                        <option value="announcement">Announcement</option>
                                        <option value="promotion">Promotion</option>
                                        <option value="greeting">Greeting</option>
                                        <option value="warning">Warning</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                                    Display Style
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {[
                                        { id: 'banner', label: 'Top Banner', icon: '🚩' },
                                        { id: 'popup', label: 'Modal Popup', icon: '🛑' },
                                        { id: 'notification', label: 'Notification', icon: '🔔' }
                                    ].map((style) => (
                                        <label
                                            key={style.id}
                                            className={`
                                            flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all
                                            ${formData.displayStyle === style.id
                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                    : 'border-neutral-200 dark:border-neutral-700 hover:border-blue-300'
                                                }
                                        `}
                                        >
                                            <input
                                                type="radio"
                                                name="displayStyle"
                                                value={style.id}
                                                checked={formData.displayStyle === style.id}
                                                onChange={(e) => setFormData({ ...formData, displayStyle: e.target.value as any })}
                                                className="sr-only"
                                            />
                                            <span className="text-lg">{style.icon}</span>
                                            <span className={`text-sm font-medium ${formData.displayStyle === style.id ? 'text-blue-700 dark:text-blue-300' : 'text-neutral-600 dark:text-neutral-400'}`}>
                                                {style.label}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* === INTELLIGENT OPTIONS BASED ON STYLE === */}
                            <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-xl p-5 border border-neutral-100 dark:border-neutral-700/50 space-y-5">

                                {/* Options for Banner */}
                                {formData.displayStyle === 'banner' && (
                                    <div>
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.allowDismiss}
                                                onChange={(e) => setFormData({ ...formData, allowDismiss: e.target.checked })}
                                                className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                Allow user to dismiss this banner
                                            </span>
                                        </label>
                                    </div>
                                )}

                                {/* Options for Popup */}
                                {formData.displayStyle === 'popup' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                                                Cover Image URL <span className="text-neutral-400">(Optional)</span>
                                            </label>
                                            <input
                                                type="url"
                                                value={formData.imageUrl}
                                                onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                                                className="w-full px-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm"
                                                placeholder="https://..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                                                Modal Size
                                            </label>
                                            <div className="flex bg-white dark:bg-neutral-900 rounded-lg p-1 border border-neutral-200 dark:border-neutral-700 inline-flex">
                                                {['sm', 'md', 'lg'].map((size) => (
                                                    <button
                                                        key={size}
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, modalSize: size as any })}
                                                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${formData.modalSize === size
                                                            ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm'
                                                            : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                                                            }`}
                                                    >
                                                        {size === 'sm' ? 'Small' : size === 'md' ? 'Medium' : 'Large'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="flex items-center gap-3 cursor-pointer mt-2">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.allowDismiss !== false}
                                                    onChange={(e) => setFormData({ ...formData, allowDismiss: e.target.checked })}
                                                    className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                                    User can close/dismiss (Recommended)
                                                </span>
                                            </label>
                                            {!formData.allowDismiss && (
                                                <p className="text-xs text-red-500 mt-1 pl-7">
                                                    Warning: Forceful popups can annoy users. Use sparingly.
                                                </p>
                                            )}
                                        </div>
                                    </>
                                )}

                                {/* Options for Notification */}
                                {formData.displayStyle === 'notification' && (
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                                            Expiration Date <span className="text-neutral-400">(Auto-remove)</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.expiresAt ? formData.expiresAt.split('T')[0] : ''}
                                            onChange={e => setFormData({ ...formData, expiresAt: e.target.value })}
                                            className="px-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm"
                                        />
                                    </div>
                                )}

                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                                    Message *
                                </label>
                                <textarea
                                    required
                                    value={formData.message}
                                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-neutral-900 dark:text-white placeholder-neutral-400 transition-all resize-none"
                                    placeholder="The message that will appear to all users..."
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                                        CTA Button Text <span className="text-neutral-400">(Optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.ctaText}
                                        onChange={e => setFormData({ ...formData, ctaText: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-neutral-900 dark:text-white placeholder-neutral-400 transition-all"
                                        placeholder="e.g. Learn More"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                                        CTA Link <span className="text-neutral-400">(Optional)</span>
                                    </label>
                                    <input
                                        type="url"
                                        value={formData.ctaLink}
                                        onChange={e => setFormData({ ...formData, ctaLink: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-neutral-900 dark:text-white placeholder-neutral-400 transition-all"
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>

                            {/* Active Toggle */}
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="w-5 h-5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                    Publish immediately (make active)
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
                                    disabled={formLoading}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-[#2d3748] dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 rounded-xl font-medium transition-colors disabled:opacity-50"
                                >
                                    {formLoading ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <CheckCircle className="w-4 h-4" />
                                    )}
                                    {editingId ? 'Save Changes' : 'Publish Announcement'}
                                </button>
                            </div>
                        </form>
                    </div>
                )
            }

            {/* Announcements Grid */}
            {
                loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-6 animate-pulse">
                                <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4 mb-4"></div>
                                <div className="h-16 bg-neutral-100 dark:bg-neutral-700/50 rounded mb-4"></div>
                                <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2"></div>
                            </div>
                        ))}
                    </div>
                ) : announcements.length === 0 ? (
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-12 text-center">
                        <Megaphone className="w-12 h-12 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
                        <p className="text-neutral-500 dark:text-neutral-400">No announcements yet.</p>
                        <button
                            onClick={() => setIsCreating(true)}
                            className="mt-4 text-blue-600 hover:text-blue-700 font-medium text-sm"
                        >
                            Create your first announcement →
                        </button>
                    </div>
                ) : viewMode === 'list' ? (
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-neutral-50/50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-700 text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                                        <th className="px-6 py-4">Title & Message</th>
                                        <th className="px-6 py-4">Type</th>
                                        <th className="px-6 py-4">Display</th>
                                        <th className="px-6 py-4">Stats</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                                    {announcements.map((announcement) => {
                                        const TypeIcon = typeConfig[announcement.type]?.icon || Megaphone;
                                        const typeBg = typeConfig[announcement.type]?.bg || 'bg-blue-50';
                                        const typeColor = typeConfig[announcement.type]?.color || 'text-blue-600';

                                        return (
                                            <tr key={announcement.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors">
                                                <td className="px-6 py-4 max-w-sm">
                                                    <div className="font-medium text-[#2d3748] dark:text-white line-clamp-1">{announcement.title}</div>
                                                    <div className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-1">{announcement.message}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`p-1.5 rounded-lg ${typeBg} ${typeColor}`}>
                                                            <TypeIcon className="w-4 h-4" />
                                                        </div>
                                                        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 capitalize">{announcement.type}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {announcement.displayStyle && (
                                                        <span className="px-2 py-1 rounded text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 uppercase font-bold tracking-wider">
                                                            {announcement.displayStyle}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                                                        <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {announcement.views}</span>
                                                        <span className="flex items-center gap-1"><MousePointer2 className="w-3.5 h-3.5" /> {announcement.clicks}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${announcement.isActive
                                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                        : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700/50 dark:text-neutral-400'
                                                        }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${announcement.isActive ? 'bg-emerald-500' : 'bg-neutral-400'}`}></span>
                                                        {announcement.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            onClick={() => handleEdit(announcement)}
                                                            className="p-2 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleToggleActive(announcement.id, announcement.isActive)}
                                                            className={`p-2 rounded-lg transition-colors ${announcement.isActive
                                                                ? 'text-neutral-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30'
                                                                : 'text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                                                                }`}
                                                        >
                                                            {announcement.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(announcement.id)}
                                                            className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
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
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {announcements.map((announcement) => {
                            const TypeIcon = typeConfig[announcement.type]?.icon || Megaphone;
                            const typeBg = typeConfig[announcement.type]?.bg || 'bg-blue-50';
                            const typeColor = typeConfig[announcement.type]?.color || 'text-blue-600';

                            return (
                                <div
                                    key={announcement.id}
                                    className={`
                                    bg-white dark:bg-neutral-800 
                                    border border-neutral-200 dark:border-neutral-700 
                                    rounded-2xl p-5 
                                    shadow-sm hover:shadow-md 
                                    transition-all duration-200 
                                    relative group
                                    ${!announcement.isActive ? 'opacity-75 grayscale-[0.5]' : 'hover:border-blue-400/50 dark:hover:border-blue-500/50'}
                                `}
                                >
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${typeBg} ${typeColor}`}>
                                                <TypeIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-[#2d3748] dark:text-white line-clamp-1">
                                                    {announcement.title}
                                                </h3>
                                                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                                    {new Date(announcement.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {announcement.displayStyle && announcement.displayStyle !== 'banner' && (
                                                <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 uppercase font-bold tracking-wider mr-2">
                                                    {announcement.displayStyle}
                                                </span>
                                            )}


                                            <span className={`w-2 h-2 rounded-full ${announcement.isActive ? 'bg-emerald-500' : 'bg-neutral-400'
                                                }`}></span>
                                            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                                                {announcement.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Message */}
                                    <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4 line-clamp-3">
                                        {announcement.message}
                                    </p>

                                    {/* CTA Preview */}
                                    {
                                        announcement.ctaText && (
                                            <div className="mb-4">
                                                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                                    CTA: {announcement.ctaText}
                                                </span>
                                            </div>
                                        )
                                    }

                                    {/* Stats & Actions */}
                                    <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-700">
                                        <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
                                            <span className="flex items-center gap-1" title="Views">
                                                <Eye className="w-3.5 h-3.5" />
                                                {announcement.views.toLocaleString()}
                                            </span>
                                            <span className="flex items-center gap-1" title="Clicks">
                                                <MousePointer2 className="w-3.5 h-3.5" />
                                                {announcement.clicks.toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleEdit(announcement)}
                                                className="p-2 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleToggleActive(announcement.id, announcement.isActive)}
                                                disabled={actionLoading === announcement.id}
                                                className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${announcement.isActive
                                                    ? 'text-neutral-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30'
                                                    : 'text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                                                    }`}
                                                title={announcement.isActive ? 'Deactivate' : 'Activate'}
                                            >
                                                {announcement.isActive ? (
                                                    <PowerOff className="w-4 h-4" />
                                                ) : (
                                                    <Power className="w-4 h-4" />
                                                )}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(announcement.id)}
                                                disabled={actionLoading === announcement.id}
                                                className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div >
                )
            }
        </div >
    );
}
