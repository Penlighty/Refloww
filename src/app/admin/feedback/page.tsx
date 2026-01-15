"use client";

import { useEffect, useState } from 'react';
import {
    MessageSquare,
    Star,
    CheckCircle,
    Archive,
    Trash2,
    RefreshCw,
    Filter,
    AlertCircle,
    ThumbsUp,
    Minus,
    ThumbsDown,
    Search,
    Bug,
    Lightbulb,
    MessageCircle,
    Heart
} from 'lucide-react';
import {
    getAllFeedback,
    updateFeedbackStatus,
    deleteFeedback,
    Feedback
} from '@/lib/firebase/admin';
import { toast } from 'react-hot-toast';

export default function FeedbackPage() {
    const [feedback, setFeedback] = useState<Feedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'reviewed' | 'archived'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const loadFeedback = async () => {
        setLoading(true);
        try {
            const data = await getAllFeedback(statusFilter === 'all' ? undefined : statusFilter);
            setFeedback(data);
        } catch (error) {
            console.error('Error loading feedback:', error);
            toast.error('Failed to load feedback');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFeedback();
    }, [statusFilter]);

    const handleMarkReviewed = async (id: string) => {
        setActionLoading(id);
        try {
            await updateFeedbackStatus(id, 'reviewed');
            setFeedback(prev => prev.map(f => f.id === id ? { ...f, status: 'reviewed' } : f));
            toast.success('Marked as reviewed');
        } catch (error) {
            toast.error('Failed to update status');
        } finally {
            setActionLoading(null);
        }
    };

    const handleArchive = async (id: string) => {
        setActionLoading(id);
        try {
            await updateFeedbackStatus(id, 'archived');
            setFeedback(prev => prev.map(f => f.id === id ? { ...f, status: 'archived' } : f));
            toast.success('Archived');
        } catch (error) {
            toast.error('Failed to archive');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this feedback?')) return;

        setActionLoading(id);
        try {
            await deleteFeedback(id);
            setFeedback(prev => prev.filter(f => f.id !== id));
            toast.success('Deleted');
        } catch (error) {
            toast.error('Failed to delete');
        } finally {
            setActionLoading(null);
        }
    };

    const getSentimentIcon = (sentiment?: string) => {
        switch (sentiment) {
            case 'positive': return <ThumbsUp className="w-4 h-4" />;
            case 'negative': return <ThumbsDown className="w-4 h-4" />;
            default: return <Minus className="w-4 h-4" />;
        }
    };

    const getSentimentColor = (sentiment?: string) => {
        switch (sentiment) {
            case 'positive': return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';
            case 'negative': return 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
        }
    };

    const getCategoryIcon = (category?: string) => {
        switch (category) {
            case 'bug': return <Bug className="w-4 h-4" />;
            case 'feature': return <Lightbulb className="w-4 h-4" />;
            case 'praise': return <Heart className="w-4 h-4" />;
            default: return <MessageCircle className="w-4 h-4" />;
        }
    };

    const filteredFeedback = feedback.filter(item =>
        item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.userEmail && item.userEmail.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const statusCounts = {
        all: feedback.length,
        new: feedback.filter(f => f.status === 'new').length,
        reviewed: feedback.filter(f => f.status === 'reviewed').length,
        archived: feedback.filter(f => f.status === 'archived').length
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#2d3748] dark:text-white">User Feedback</h1>
                    <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                        Direct feedback and feature requests from users.
                    </p>
                </div>
                <button
                    onClick={loadFeedback}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-700 font-medium text-sm transition-colors shadow-sm"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                        type="text"
                        placeholder="Search feedback..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-neutral-900 dark:text-white placeholder-neutral-400 shadow-sm transition-all"
                    />
                </div>

                {/* Status Filter Tabs */}
                <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
                    {(['all', 'new', 'reviewed', 'archived'] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === status
                                ? 'bg-white dark:bg-neutral-700 text-[#2d3748] dark:text-white shadow-sm'
                                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
                                }`}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                            <span className="ml-1.5 text-xs text-neutral-400">
                                ({statusCounts[status]})
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Feedback Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-6 animate-pulse">
                            <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4 mb-4"></div>
                            <div className="h-20 bg-neutral-100 dark:bg-neutral-700/50 rounded mb-4"></div>
                            <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2"></div>
                        </div>
                    ))}
                </div>
            ) : filteredFeedback.length === 0 ? (
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-12 text-center">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
                    <p className="text-neutral-500 dark:text-neutral-400">
                        {searchQuery ? 'No feedback matches your search.' : 'No feedback yet.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredFeedback.map((item) => (
                        <div
                            key={item.id}
                            className={`bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow ${item.status === 'archived' ? 'opacity-60' : ''
                                }`}
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <span className={`p-2 rounded-lg ${getSentimentColor(item.sentiment)}`}>
                                        {getSentimentIcon(item.sentiment)}
                                    </span>
                                    <div>
                                        <h3 className="text-sm font-semibold text-[#2d3748] dark:text-white">
                                            {item.userEmail || 'Anonymous'}
                                        </h3>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                            {new Date(item.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${item.status === 'new'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                                    : item.status === 'reviewed'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                                        : 'bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-neutral-700 dark:text-neutral-400 dark:border-neutral-600'
                                    }`}>
                                    {item.status.toUpperCase()}
                                </span>
                            </div>

                            {/* Category Badge */}
                            {item.category && (
                                <div className="flex items-center gap-1.5 mb-3">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded text-xs">
                                        {getCategoryIcon(item.category)}
                                        {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                                    </span>
                                </div>
                            )}

                            {/* Message */}
                            <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-6 min-h-[60px]">
                                "{item.message}"
                            </p>

                            {/* Admin Notes */}
                            {item.adminNotes && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                                    <p className="text-xs text-blue-700 dark:text-blue-300">
                                        <strong>Admin Note:</strong> {item.adminNotes}
                                    </p>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-2 pt-4 border-t border-neutral-100 dark:border-neutral-700">
                                {item.status === 'new' && (
                                    <button
                                        onClick={() => handleMarkReviewed(item.id)}
                                        disabled={actionLoading === item.id}
                                        className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        Mark Reviewed
                                    </button>
                                )}
                                {item.status !== 'archived' && (
                                    <button
                                        onClick={() => handleArchive(item.id)}
                                        disabled={actionLoading === item.id}
                                        className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded-lg transition-colors disabled:opacity-50"
                                        title="Archive"
                                    >
                                        <Archive className="w-4 h-4" />
                                    </button>
                                )}
                                <button
                                    onClick={() => handleDelete(item.id)}
                                    disabled={actionLoading === item.id}
                                    className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                                    title="Delete"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
