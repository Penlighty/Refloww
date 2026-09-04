"use client";

import React, { useState, useEffect } from 'react';
import { 
    getAllOrganizations, 
    OrganizationSummary, 
    updateOrganizationStatus, 
    updateOrganizationTier 
} from '@/lib/firebase/admin';
import { 
    Building2, 
    Search, 
    MoreVertical, 
    Shield, 
    Ban, 
    CheckCircle2, 
    TrendingUp 
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export default function AdminOrganizationsPage() {
    const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal State
    const [selectedOrg, setSelectedOrg] = useState<OrganizationSummary | null>(null);
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        loadOrganizations();
    }, []);

    const loadOrganizations = async () => {
        try {
            setLoading(true);
            const { organizations: fetchedOrgs } = await getAllOrganizations(50);
            setOrganizations(fetchedOrgs);
        } catch (error) {
            console.error("Error loading organizations:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (status: 'active' | 'suspended') => {
        if (!selectedOrg) return;
        try {
            setActionLoading(true);
            await updateOrganizationStatus(selectedOrg.id, status);
            await loadOrganizations();
            setIsActionModalOpen(false);
        } catch (error) {
            console.error("Error updating status:", error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateTier = async (tier: 'free' | 'pro' | 'enterprise') => {
        if (!selectedOrg) return;
        try {
            setActionLoading(true);
            await updateOrganizationTier(selectedOrg.id, tier);
            await loadOrganizations();
            setIsActionModalOpen(false);
        } catch (error) {
            console.error("Error updating tier:", error);
        } finally {
            setActionLoading(false);
        }
    };

    const filteredOrgs = organizations.filter(org => 
        org.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        org.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Building2 className="w-6 h-6 text-blue-600" />
                        Organizations
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Manage workspaces, tiers, and platform access.
                    </p>
                </div>
                
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search organizations..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm admin-card">
                <div className="overflow-x-auto">
                    <table className="w-full text-left admin-table">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                <th className="p-4 rounded-tl-xl">Organization Name</th>
                                <th className="p-4">Tier</th>
                                <th className="p-4">Members</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Created</th>
                                <th className="p-4 text-right rounded-tr-xl">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700/0">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-500">
                                        Loading organizations...
                                    </td>
                                </tr>
                            ) : filteredOrgs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-500">
                                        No organizations found.
                                    </td>
                                </tr>
                            ) : (
                                filteredOrgs.map((org) => (
                                    <tr key={org.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors admin-table-row">
                                        <td className="p-4">
                                            <div className="font-medium text-slate-900 dark:text-white">
                                                {org.name && org.name.trim() !== '' ? org.name : 'Primary Organization'}
                                            </div>
                                            <div className="text-xs text-slate-500 font-mono mt-0.5">
                                                ID: {org.id.slice(0, 8)}...
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold uppercase ${
                                                org.tier === 'enterprise' ? 'bg-purple-100 text-purple-700' :
                                                org.tier === 'pro' ? 'bg-blue-100 text-blue-700' :
                                                'bg-slate-100 text-slate-700'
                                            }`}>
                                                {org.tier}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                                            {org.memberCount} users
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                                                org.status === 'active' 
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                            }`}>
                                                {org.status === 'active' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                                                {org.status.charAt(0).toUpperCase() + org.status.slice(1)}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-slate-500">
                                            {new Date(org.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button 
                                                onClick={() => {
                                                    setSelectedOrg(org);
                                                    setIsActionModalOpen(true);
                                                }}
                                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                            >
                                                <MoreVertical className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Action Modal */}
            <Modal
                isOpen={isActionModalOpen}
                onClose={() => setIsActionModalOpen(false)}
                title="Manage Organization"
            >
                {selectedOrg && (
                    <div className="p-6 space-y-6">
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                                {selectedOrg.name}
                            </h3>
                            <p className="text-sm text-slate-500">ID: {selectedOrg.id}</p>
                        </div>

                        <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-blue-500" />
                                Subscription Tier
                            </h4>
                            <div className="flex gap-2">
                                {['free', 'pro', 'enterprise'].map((tier) => (
                                    <button
                                        key={tier}
                                        onClick={() => handleUpdateTier(tier as any)}
                                        disabled={actionLoading || selectedOrg.tier === tier}
                                        className={`flex-1 py-2 text-sm font-medium rounded-lg border uppercase transition-colors ${
                                            selectedOrg.tier === tier
                                                ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800'
                                                : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/50'
                                        }`}
                                    >
                                        {tier}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                <Shield className="w-4 h-4 text-red-500" />
                                Platform Access
                            </h4>
                            {selectedOrg.status === 'active' ? (
                                <Button
                                    variant="outline"
                                    onClick={() => handleUpdateStatus('suspended')}
                                    isLoading={actionLoading}
                                    className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                                >
                                    <Ban className="w-4 h-4 mr-2" />
                                    Suspend Organization
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => handleUpdateStatus('active')}
                                    isLoading={actionLoading}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Restore Access
                                </Button>
                            )}
                            <p className="text-xs text-slate-500 text-center">
                                Suspending will prevent all members from accessing this organization.
                            </p>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
