"use client";

import React, { useState, useEffect } from 'react';
import { getAuditLogs, AuditLogEntry } from '@/lib/firebase/admin';
import { Shield, Search, Filter, RefreshCw, Activity, User, Settings, ShoppingBag, Building2, Megaphone } from 'lucide-react';

export default function AdminAuditLogsPage() {
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [lastDoc, setLastDoc] = useState<any>(null);

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async (refresh = false) => {
        setLoading(true);
        try {
            const result = await getAuditLogs(50, refresh ? null : lastDoc);
            if (refresh) {
                setLogs(result.logs);
            } else {
                setLogs(prev => {
                    const newLogs = result.logs.filter(l => !prev.some(p => p.id === l.id));
                    return [...prev, ...newLogs];
                });
            }
            setLastDoc(result.lastDoc);
        } catch (error) {
            console.error('Error loading audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        setLastDoc(null);
        loadLogs(true);
    };

    const filteredLogs = logs.filter(log => 
        log.adminEmail?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.resourceId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getResourceIcon = (type: AuditLogEntry['resourceType']) => {
        switch (type) {
            case 'user': return <User className="w-4 h-4 text-blue-500" />;
            case 'organization': return <Building2 className="w-4 h-4 text-purple-500" />;
            case 'settings': return <Settings className="w-4 h-4 text-slate-500" />;
            case 'marketplace': return <ShoppingBag className="w-4 h-4 text-emerald-500" />;
            case 'announcement': return <Megaphone className="w-4 h-4 text-orange-500" />;
            default: return <Activity className="w-4 h-4 text-slate-400" />;
        }
    };

    const formatDetails = (details: any) => {
        if (!details || Object.keys(details).length === 0) return '-';
        return JSON.stringify(details);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Shield className="w-6 h-6 text-slate-700" />
                        Audit Logs
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Track administrative actions across the platform.
                    </p>
                </div>
                
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                        onClick={handleRefresh}
                        className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="Refresh Logs"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <div className="relative flex-1 sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search logs by admin, action..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                <th className="p-4">Timestamp</th>
                                <th className="p-4">Admin</th>
                                <th className="p-4">Action</th>
                                <th className="p-4">Resource Type</th>
                                <th className="p-4">Resource ID</th>
                                <th className="p-4">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {loading && filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-500">
                                        Loading audit logs...
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-500">
                                        No logs found.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="p-4 text-sm text-slate-500 whitespace-nowrap">
                                            {new Date(log.timestamp).toLocaleString()}
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm font-medium text-slate-900 dark:text-white">
                                                {log.adminEmail || 'Unknown'}
                                            </div>
                                            <div className="text-xs text-slate-400 font-mono">
                                                {log.adminId}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 text-xs font-mono">
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 capitalize">
                                                {getResourceIcon(log.resourceType)}
                                                {log.resourceType}
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm font-mono text-slate-500">
                                            {log.resourceId || '-'}
                                        </td>
                                        <td className="p-4 text-xs font-mono text-slate-500 max-w-xs truncate" title={formatDetails(log.details)}>
                                            {formatDetails(log.details)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                    <span className="text-sm text-slate-500">
                        Showing {filteredLogs.length} logs
                    </span>
                    <button
                        onClick={() => loadLogs()}
                        disabled={!lastDoc || loading}
                        className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                    >
                        Load More
                    </button>
                </div>
            </div>
        </div>
    );
}
