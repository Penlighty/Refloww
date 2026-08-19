
"use client";

import { useEffect, useState } from 'react';
import {
    getAllUsers,
    UserSummary
} from '@/lib/firebase/admin';
import {
    Search,
    Filter,
    MoreHorizontal,
    FileText,
    LayoutTemplate,
    Users as UsersIcon,
    ChevronLeft,
    ChevronRight,
    RefreshCw
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function UserManagementPage() {
    const [users, setUsers] = useState<UserSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastDoc, setLastDoc] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

    // Initial fetch
    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async (refresh = false) => {
        setLoading(true);
        try {
            const result = await getAllUsers(20, refresh ? null : lastDoc);
            if (refresh) {
                setUsers(result.users);
            } else {
                setUsers(prev => {
                    const newUsers = result.users.filter(u => !prev.some(p => p.id === u.id));
                    return [...prev, ...newUsers];
                });
            }
            setLastDoc(result.lastDoc);
        } catch (error) {
            console.error('Error loading users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        setLastDoc(null);
        loadUsers(true);
    };

    // Filter by search query (client-side for now as Firestore full-text search is limited)
    const filteredUsers = users.filter(user =>
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.displayName && user.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#2d3748] dark:text-white">Users</h1>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">View and monitor registered user accounts.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleRefresh}
                        className="p-2 text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="Refresh List"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    {/* Placeholder buttons using standard styles */}
                    <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-700 font-medium text-sm transition-colors shadow-sm">
                        <Filter className="w-4 h-4" />
                        Filter
                    </button>
                    <button className="bg-[#2d3748] dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 px-4 py-2 rounded-xl font-medium text-sm transition-colors shadow-lg shadow-neutral-900/20">
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="max-w-md relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-neutral-900 dark:text-white placeholder-neutral-400 shadow-sm transition-all"
                />
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px] md:min-w-full">
                        <thead>
                            <tr className="bg-neutral-50/50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-700 text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Joined</th>
                                <th className="px-6 py-4">Last Active</th>
                                <th className="px-6 py-4 text-center">Docs</th>
                                <th className="px-6 py-4 text-center">Templates</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-50 dark:divide-neutral-700/50">
                            {filteredUsers.length === 0 && !loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-neutral-500 dark:text-neutral-400">
                                        No users found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-700/30 transition-colors group relative">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center text-neutral-500 dark:text-neutral-400 font-bold overflow-hidden border border-neutral-200 dark:border-neutral-600">
                                                    {user.photoURL ? (
                                                        <img src={user.photoURL} alt={user.displayName || user.email} className="w-full h-full object-cover" />
                                                    ) : (
                                                        (user.displayName || user.email).charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-[#2d3748] dark:text-white">{user.displayName || 'Unnamed User'}</div>
                                                    <div className="text-sm text-neutral-500 dark:text-neutral-400">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant={user.accountStatus === 'active' ? 'success' : 'default'} dot>
                                                {user.accountStatus.charAt(0).toUpperCase() + user.accountStatus.slice(1)}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-neutral-600 dark:text-neutral-300">
                                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-neutral-600 dark:text-neutral-300">
                                                {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="inline-flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-700/50 px-2.5 py-1 rounded-lg border border-neutral-100 dark:border-neutral-700">
                                                <FileText className="w-3.5 h-3.5 text-neutral-400" />
                                                {user.metadata?.documentCount ?? 0}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="inline-flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-700/50 px-2.5 py-1 rounded-lg border border-neutral-100 dark:border-neutral-700">
                                                <LayoutTemplate className="w-3.5 h-3.5 text-neutral-400" />
                                                {user.metadata?.templateCount ?? 0}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="relative inline-block text-left">
                                                <button
                                                    onClick={() => setActionMenuOpen(actionMenuOpen === user.id ? null : user.id)}
                                                    className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                                                >
                                                    <MoreHorizontal className="w-5 h-5" />
                                                </button>

                                                {/* Dropdown Menu */}
                                                {actionMenuOpen === user.id && (
                                                    <>
                                                        <div
                                                            className="fixed inset-0 z-10"
                                                            onClick={() => setActionMenuOpen(null)}
                                                        />
                                                        <div className="absolute right-0 mt-2 w-48 rounded-xl shadow-xl bg-white dark:bg-neutral-800 ring-1 ring-black/5 dark:ring-white/10 z-20 py-1 origin-top-right border border-neutral-100 dark:border-neutral-700">
                                                            <button
                                                                className="block w-full text-left px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                                                                onClick={() => { /* Handle View Details */ setActionMenuOpen(null); }}
                                                            >
                                                                View Details
                                                            </button>
                                                            <button
                                                                className="block w-full text-left px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                                                                onClick={() => { /* Handle Reset Password */ setActionMenuOpen(null); }}
                                                            >
                                                                Send Password Reset
                                                            </button>
                                                            <div className="h-px bg-neutral-100 dark:bg-neutral-700 my-1" />
                                                            <button
                                                                className="block w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                                onClick={() => { /* Handle Deactivate */ setActionMenuOpen(null); }}
                                                            >
                                                                Deactivate User
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="px-6 py-4 border-t border-neutral-100 dark:border-neutral-700 bg-neutral-50/30 dark:bg-neutral-800/30 flex items-center justify-between">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        Showing {filteredUsers.length} users
                    </p>
                    <div className="flex gap-2">
                        <button
                            disabled={true}
                            className="px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 rounded-lg text-sm font-medium disabled:opacity-50 cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => loadUsers()}
                            disabled={!lastDoc || loading}
                            className="px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                        >
                            {loading ? 'Loading...' : 'Next'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
