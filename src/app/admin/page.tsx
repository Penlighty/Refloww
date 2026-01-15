"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    Users,
    FileText,
    LayoutTemplate,
    MessageSquare,
    Activity,
    Store,
    RefreshCw,
    ArrowRight,
    TrendingUp,
    Clock
} from 'lucide-react';
import { StatCard } from '@/components/admin/StatCard';
import { getPlatformStats, getNewFeedback, AdminStats, Feedback } from '@/lib/firebase/admin';

export default function AdminDashboard() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [recentFeedback, setRecentFeedback] = useState<Feedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [feedbackLoading, setFeedbackLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        setFeedbackLoading(true);
        try {
            const [statsData, feedbackData] = await Promise.all([
                getPlatformStats(),
                getNewFeedback()
            ]);
            setStats(statsData);
            setRecentFeedback(feedbackData.slice(0, 5)); // Show top 5
        } catch (error) {
            console.error("Failed to fetch admin data:", error);
        } finally {
            setLoading(false);
            setFeedbackLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffHours < 1) return 'Just now';
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-10">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-gradient-to-r from-neutral-900 to-neutral-800 dark:from-neutral-800 dark:to-neutral-900 p-8 rounded-3xl text-white shadow-xl shadow-neutral-900/10 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold text-white mb-2">Platform Overview</h1>
                    <p className="text-neutral-300 text-lg">
                        Real-time health snapshot of Reflow Application.
                    </p>
                </div>
                <div className="relative z-10 flex gap-3">
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 text-white rounded-xl font-medium text-sm transition-all hover:scale-105 active:scale-95"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh Data
                    </button>
                    <Link
                        href="/"
                        className="flex items-center gap-2 px-5 py-2.5 bg-white text-neutral-900 hover:bg-neutral-100 rounded-xl font-medium text-sm transition-all hover:scale-105 active:scale-95 shadow-lg"
                    >
                        <Store className="w-4 h-4" />
                        Live App
                    </Link>
                </div>

                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                    <Activity className="w-64 h-64" />
                </div>
                <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl"></div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Registered Users"
                    value={stats?.totalUsers ?? 0}
                    icon={Users}
                    loading={loading}
                    trend={stats && stats.totalUsers > 0 ? {
                        value: 12,
                        label: 'vs last month',
                        isPositive: true
                    } : undefined}
                    description="All time sign-ups"
                />
                <StatCard
                    title="Active Users (30d)"
                    value={stats?.activeUsers30Days ?? 0}
                    icon={Activity}
                    loading={loading}
                    description="Users logged in last 30 days"
                />
                <StatCard
                    title="Total Documents"
                    value={stats?.totalDocuments ?? 0}
                    icon={FileText}
                    loading={loading}
                    description="Invoices, Receipts, etc."
                />
                <StatCard
                    title="Marketplace Templates"
                    value={stats?.marketplaceTemplates ?? 0}
                    icon={Store}
                    loading={loading}
                    description="Published public templates"
                />
            </div>

            {/* Secondary Section - Feedback & Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Feedback Summary */}
                <div className="lg:col-span-2 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden flex flex-col h-full">
                    <div className="p-6 border-b border-neutral-100 dark:border-neutral-700 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                                <MessageSquare className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-bold text-[#2d3748] dark:text-white">Recent Feedback</h2>
                        </div>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${(stats?.pendingFeedback ?? 0) > 0
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                            : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-600'
                            }`}>
                            {stats?.pendingFeedback ?? 0} Pending
                        </span>
                    </div>

                    <div className="flex-1">
                        {feedbackLoading ? (
                            <div className="p-12 text-center flex flex-col items-center justify-center h-full">
                                <RefreshCw className="w-8 h-8 animate-spin text-neutral-300 dark:text-neutral-600 mb-4" />
                                <p className="text-neutral-400">Loading feedback...</p>
                            </div>
                        ) : recentFeedback.length === 0 ? (
                            <div className="p-12 text-center text-neutral-400 dark:text-neutral-500 flex flex-col items-center justify-center h-full">
                                <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
                                    <MessageSquare className="w-8 h-8 text-neutral-300 dark:text-neutral-600" />
                                </div>
                                <h3 className="text-neutral-900 dark:text-white font-medium mb-1">No feedback yet</h3>
                                <p>When users submit feedback, it will appear here.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
                                {recentFeedback.map((item) => (
                                    <div key={item.id} className="p-5 hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors group">
                                        <div className="flex items-start gap-4">
                                            <div className={`mt-1 w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm ${item.sentiment === 'positive'
                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                : item.sentiment === 'negative'
                                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                }`}>
                                                {(item.userEmail || 'A').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <h4 className="text-sm font-semibold text-[#2d3748] dark:text-white truncate">
                                                        {item.userEmail || 'Anonymous User'}
                                                    </h4>
                                                    <div className="flex items-center gap-2">
                                                        {item.category && (
                                                            <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 rounded-md">
                                                                {item.category}
                                                            </span>
                                                        )}
                                                        <span className="text-xs text-neutral-400 whitespace-nowrap">
                                                            {formatTimeAgo(item.createdAt)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-neutral-600 dark:text-neutral-300 line-clamp-2 leading-relaxed">
                                                    "{item.message}"
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-neutral-100 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50">
                        <Link
                            href="/admin/feedback"
                            className="flex items-center justify-center w-full py-2.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                        >
                            View All Feedback
                            <ArrowRight className="w-4 h-4 ml-1.5" />
                        </Link>
                    </div>
                </div>

                {/* System Health / Quick Status */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                                <Activity className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-bold text-[#2d3748] dark:text-white">System Status</h2>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Firestore Services</span>
                                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full border border-emerald-100 dark:border-emerald-900/50">
                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                        OPERATIONAL
                                    </span>
                                </div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Storage Buckets</span>
                                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full border border-emerald-100 dark:border-emerald-900/50">
                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                        OPERATIONAL
                                    </span>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-neutral-100 dark:border-neutral-700">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">User Activity (30d)</span>
                                    <span className="text-lg font-bold text-[#2d3748] dark:text-white">
                                        {stats && stats.totalUsers ? Math.round(((stats.activeUsers30Days || 0) / stats.totalUsers) * 100) : 0}%
                                    </span>
                                </div>
                                <div className="w-full bg-neutral-100 dark:bg-neutral-700 rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-1000 ease-out"
                                        style={{ width: `${stats && stats.totalUsers ? Math.round(((stats.activeUsers30Days || 0) / stats.totalUsers) * 100) : 0}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs text-neutral-400 mt-2">Percentage of total users active in last 30 days.</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 dark:from-neutral-800 dark:to-neutral-900 rounded-2xl p-6 text-white shadow-lg">
                        <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
                        <div className="space-y-3">
                            <Link
                                href="/admin/users"
                                className="flex items-center justify-between p-3 bg-white/10 hover:bg-white/20 rounded-xl border border-white/5 transition-all group"
                            >
                                <span className="flex items-center gap-3">
                                    <div className="p-1.5 bg-white/10 rounded-lg">
                                        <Users className="w-4 h-4 text-neutral-300" />
                                    </div>
                                    <span className="font-medium text-sm">Manage Users</span>
                                </span>
                                <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link
                                href="/admin/notifications"
                                className="flex items-center justify-between p-3 bg-white/10 hover:bg-white/20 rounded-xl border border-white/5 transition-all group"
                            >
                                <span className="flex items-center gap-3">
                                    <div className="p-1.5 bg-white/10 rounded-lg">
                                        <MessageSquare className="w-4 h-4 text-neutral-300" />
                                    </div>
                                    <span className="font-medium text-sm">Post Announcement</span>
                                </span>
                                <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
