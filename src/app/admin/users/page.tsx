
"use client";

import { useEffect, useState } from 'react';
import {
    getAllUsers,
    UserSummary,
    setUserAsAdmin,
    updateUserStatus
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
    RefreshCw,
    Shield,
    ActivitySquare,
    Ban,
    CheckCircle2
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export default function UserManagementPage() {
    const [users, setUsers] = useState<UserSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastDoc, setLastDoc] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

    // Modal State
    const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

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

    const handleUpdateRole = async (role: string) => {
        if (!selectedUser) return;
        try {
            setActionLoading(true);
            await setUserAsAdmin(selectedUser.id, role);
            await loadUsers(true);
            setIsActionModalOpen(false);
        } catch (error) {
            console.error("Error updating role:", error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateStatus = async (disabled: boolean) => {
        if (!selectedUser) return;
        try {
            setActionLoading(true);
            await updateUserStatus(selectedUser.id, disabled);
            await loadUsers(true);
            setIsActionModalOpen(false);
        } catch (error) {
            console.error("Error updating status:", error);
        } finally {
            setActionLoading(false);
        }
    };

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
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setIsActionModalOpen(true);
                                                    }}
                                                    className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                                                >
                                                    <MoreHorizontal className="w-5 h-5" />
                                                </button>
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

            {/* Action Modal */}
            <Modal
                isOpen={isActionModalOpen}
                onClose={() => setIsActionModalOpen(false)}
                title="Manage User"
            >
                {selectedUser && (
                    <div className="p-6 space-y-6">
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center font-bold text-neutral-500 overflow-hidden shrink-0">
                                {selectedUser.photoURL ? (
                                    <img src={selectedUser.photoURL} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    (selectedUser.displayName || selectedUser.email).charAt(0).toUpperCase()
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                                    {selectedUser.displayName || 'Unnamed User'}
                                </h3>
                                <p className="text-sm text-slate-500 truncate">{selectedUser.email}</p>
                                <p className="text-xs text-slate-400 font-mono mt-1">ID: {selectedUser.id}</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                <Shield className="w-4 h-4 text-blue-500" />
                                Administrative Role
                            </h4>
                            <div className="grid grid-cols-2 gap-2">
                                {['user', 'support_admin', 'content_admin', 'super_admin'].map((role) => (
                                    <button
                                        key={role}
                                        onClick={() => handleUpdateRole(role as any)}
                                        disabled={actionLoading || selectedUser.role === role}
                                        className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors text-left ${
                                            selectedUser.role === role
                                                ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300'
                                                : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/50'
                                        }`}
                                    >
                                        <div className="font-semibold mb-0.5">{role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</div>
                                        <div className="text-[10px] opacity-70 font-normal">
                                            {role === 'super_admin' && 'Full access'}
                                            {role === 'support_admin' && 'Read-only + Support'}
                                            {role === 'content_admin' && 'Marketplace + Announcements'}
                                            {role === 'user' && 'No admin access'}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                <ActivitySquare className="w-4 h-4 text-orange-500" />
                                Account Status
                            </h4>
                            {selectedUser.accountStatus === 'active' ? (
                                <Button
                                    variant="outline"
                                    onClick={() => handleUpdateStatus(true)}
                                    isLoading={actionLoading}
                                    className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                                >
                                    <Ban className="w-4 h-4 mr-2" />
                                    Deactivate User
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => handleUpdateStatus(false)}
                                    isLoading={actionLoading}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Reactivate User
                                </Button>
                            )}
                            <p className="text-xs text-slate-500 text-center mt-2">
                                Deactivating a user prevents them from logging in and accessing their organizations.
                            </p>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
