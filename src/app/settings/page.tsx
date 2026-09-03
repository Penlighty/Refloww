
"use client";

import { useState, useEffect, useRef } from 'react';
import { useSettingsStore, useOrganizationStore } from '@/lib/store';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Button, Input, Select, PageHelpModal } from '@/components/ui';
import { currencies } from '@/lib/constants/currencies';
import DocumentNumbering from '@/components/settings/DocumentNumbering';
import EncryptionSettings from '@/components/settings/EncryptionSettings';
import { Save, Building, Globe, Mail, Phone, Palette, Upload, X, Image, Sun, Moon, DollarSign, Percent, Hash, Calendar, HelpCircle, Shield, Users, UserPlus, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { UserRole } from '@/lib/types';

type TabId = 'general' | 'financial' | 'documents' | 'appearance' | 'security';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'general', label: 'General', icon: Building },
    { id: 'financial', label: 'Financial', icon: DollarSign },
    { id: 'documents', label: 'ID and Numbering', icon: Hash },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'security', label: 'Security', icon: Shield },
];

export default function SettingsPage() {
    const { company, updateCompany, theme, setTheme, numbering, updateNumbering, staffRole, setStaffRole } = useSettingsStore();
    const { getActiveOrganization, inviteStaffMember, removeStaffMember, updateStaffRole } = useOrganizationStore();
    const activeOrg = getActiveOrganization();

    const { user, updateUserProfile } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeTab, setActiveTab] = useState<TabId>('general');

    // Local state to manage form inputs before saving
    const [formData, setFormData] = useState(company);
    const [numberingData, setNumberingData] = useState(numbering);
    const [isDirty, setIsDirty] = useState(false);

    // Staff Invite State
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<UserRole>('cashier');

    const handleSendInvite = () => {
        if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
            toast.error('Please enter a valid email address');
            return;
        }
        inviteStaffMember(inviteEmail, inviteRole);
        toast.success(`Invitation sent to ${inviteEmail}!`);
        setInviteEmail('');
    };

    // Sync form data if store updates externally
    useEffect(() => {
        setFormData(company);
        setNumberingData(numbering);
    }, [company, numbering]);

    const handleChange = (field: keyof typeof company, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
    };

    const handleNumberingChange = (newValue: typeof numbering) => {
        setNumberingData(newValue);
        setIsDirty(true);
    };

    const handleSave = async () => {
        updateCompany(formData);
        updateNumbering(numberingData);

        // Reactively update Google/Firebase Auth details so they stay synchronized in the header
        if (user && updateUserProfile) {
            try {
                await updateUserProfile({
                    displayName: formData.name,
                    photoURL: formData.logo || undefined
                });
            } catch (error) {
                console.error('[Settings] Error syncing company details to auth profile:', error);
            }
        }

        toast.success('Settings saved successfully');
        setIsDirty(false);
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            toast.error('Logo must be less than 2MB');
            return;
        }

        // Check file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return;
        }

        const loadingToast = toast.loading('Compressing logo...');
        try {
            const { compressImage } = await import('@/lib/utils/image-utils');
            // Compress with max width 800px and quality 0.6 for reliable Firestore storage
            const base64 = await compressImage(file, 800, 0.6);
            handleChange('logo', base64);
            toast.success('Logo loaded and compressed successfully', { id: loadingToast });
        } catch (error) {
            console.error('Error compressing logo:', error);
            toast.error('Failed to process image logo', { id: loadingToast });
        }
    };

    const handleRemoveLogo = () => {
        handleChange('logo', '');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="max-w-6xl mx-auto h-[calc(100vh-100px)] md:h-[calc(100vh-140px)] flex flex-col overflow-hidden">
            {/* Header & Tabs Container (Static, doesn't scroll) */}
            <div className="bg-background-light dark:bg-background-dark pt-4 pb-3 flex-shrink-0 border-b border-neutral-200/50 dark:border-neutral-700 md:border-b-0">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 md:mb-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-[#2d3748] dark:text-white font-sans tracking-tight">Settings</h1>
                            <PageHelpModal
                                title="Application Settings & Configuration"
                                description="Configure your business profile, default currency, document numbering formats, theme appearance, and security encryption."
                                terms={[
                                    { term: 'Document Numbering', definition: 'Customize invoice, receipt, and delivery note ID formats (e.g. INV-{YYYY}-{0001}).' },
                                    { term: 'Show Page & Tab Help Icons (i)', definition: 'Toggle visibility of all help icons across the application.' }
                                ]}
                            />
                        </div>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 hidden sm:block">Manage your company profile and application preferences.</p>
                    </div>
                    <div className="hidden sm:block">
                        <Button
                            onClick={handleSave}
                            disabled={!isDirty}
                            leftIcon={<Save className="w-4 h-4" />}
                        >
                            Save Changes
                        </Button>
                    </div>
                </div>

                {/* Mobile Navigation Tabs */}
                <div className="flex flex-row gap-2 overflow-x-auto pb-1 w-full scrollbar-none md:hidden py-1">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all flex-shrink-0 text-sm whitespace-nowrap ${isActive
                                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold'
                                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 font-medium'
                                    }`}
                            >
                                <Icon className="w-4 h-4" strokeWidth={isActive ? 2 : 1.75} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row gap-6 md:gap-8 overflow-hidden min-h-0 pt-4 md:pt-0">
                {/* Sidebar Navigation (Desktop only) */}
                <div className="hidden md:flex md:flex-col gap-2 w-64 flex-shrink-0">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all flex-shrink-0 text-sm whitespace-nowrap ${isActive
                                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 font-normal'
                                    }`}
                            >
                                <Icon className="w-5 h-5" strokeWidth={isActive ? 2 : 1.75} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto pr-2 pb-24 scrollbar-none min-h-0">
                    {/* General Tab */}
                    {activeTab === 'general' && (
                        <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-right-4 duration-300">
                            {/* Organization Staff & Team Invites Card */}
                            <section className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                            <Users className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-semibold text-[#2d3748] dark:text-white">
                                                Team & Staff Invitations ({activeOrg?.name})
                                            </h2>
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                                As the Organization Owner, you can invite staff members and assign their role permissions.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Owner Role Status Badge */}
                                    <div className="flex items-center gap-2 self-start sm:self-auto bg-purple-50 dark:bg-purple-950/40 px-3 py-1.5 rounded-xl border border-purple-200/60 dark:border-purple-800">
                                        <Shield className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                        <span className="text-xs font-bold text-purple-900 dark:text-purple-300">
                                            Your Role: Organization Owner (Admin)
                                        </span>
                                    </div>
                                </div>

                                {/* Send Staff Invite Form */}
                                <div className="p-5 bg-neutral-50/70 dark:bg-neutral-700/50 rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 mb-6 space-y-3">
                                    <h3 className="text-xs font-bold text-neutral-900 dark:text-white">
                                        Invite New Staff Member
                                    </h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                                        <div className="sm:col-span-6">
                                            <input
                                                type="email"
                                                value={inviteEmail}
                                                onChange={(e) => setInviteEmail(e.target.value)}
                                                placeholder="Enter staff email address (e.g. attendant@store.com)..."
                                                className="w-full px-3.5 py-2.5 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-xl text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-blue-500"
                                            />
                                        </div>
                                        <div className="sm:col-span-4">
                                            <select
                                                value={inviteRole}
                                                onChange={(e) => setInviteRole(e.target.value as UserRole)}
                                                className="w-full px-3.5 py-2.5 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                                            >
                                                <option value="cashier">Cashier / Sales Attendant</option>
                                                <option value="inventory_manager">Inventory Manager</option>
                                                <option value="admin">Co-Admin / Owner</option>
                                            </select>
                                        </div>
                                        <div className="sm:col-span-2">
                                            <button
                                                type="button"
                                                onClick={handleSendInvite}
                                                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                                            >
                                                <UserPlus className="w-4 h-4" />
                                                <span>Send Invite</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Read-Only Informational Staff Role Permissions Guide */}
                                <div className="mb-6">
                                    <h3 className="text-xs font-bold text-neutral-900 dark:text-white mb-2 flex items-center gap-1.5">
                                        <Shield className="w-3.5 h-3.5 text-neutral-400" />
                                        <span>Staff Role Permissions Guide</span>
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                        <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-700 border border-neutral-200/60 dark:border-neutral-700">
                                            <div className="font-bold text-xs text-emerald-700 dark:text-emerald-400 mb-1">
                                                Cashier
                                            </div>
                                            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                                Fast receipt issuing & POS checkout. Hides General Ledger, cost prices, & store settings.
                                            </p>
                                        </div>

                                        <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-700 border border-neutral-200/60 dark:border-neutral-700">
                                            <div className="font-bold text-xs text-blue-700 dark:text-blue-400 mb-1">
                                                Inventory Manager
                                            </div>
                                            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                                Manage product catalog, stock batches, inventory movements, & POS register.
                                            </p>
                                        </div>

                                        <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-700 border border-neutral-200/60 dark:border-neutral-700">
                                            <div className="font-bold text-xs text-purple-700 dark:text-purple-400 mb-1">
                                                Owner / Admin
                                            </div>
                                            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                                Full administrative access to store ledgers, settings, payouts, & team management.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Active Organization Team Table */}
                                <div>
                                    <h3 className="text-xs font-bold text-neutral-900 dark:text-white mb-2">
                                        Active & Pending Staff Members ({activeOrg?.members?.length || 0})
                                    </h3>

                                    <div className="space-y-2">
                                        {activeOrg?.members?.map((member) => (
                                            <div
                                                key={member.id}
                                                className="flex items-center justify-between p-3 rounded-xl bg-neutral-50/50 dark:bg-neutral-700/30 border border-neutral-100 dark:border-neutral-700/60"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                        {member.email.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-bold text-neutral-900 dark:text-white">
                                                                {member.name || member.email}
                                                            </span>
                                                            <span className={`px-1.5 py-0.2 text-[10px] font-bold rounded-md ${
                                                                member.status === 'active'
                                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                                            }`}>
                                                                {member.status === 'active' ? 'Active' : 'Pending Invite'}
                                                            </span>
                                                        </div>
                                                        <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                                                            {member.email}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <select
                                                        value={member.role}
                                                        onChange={(e) => updateStaffRole(member.id, e.target.value as UserRole)}
                                                        className="px-2 py-1 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-xs font-medium text-neutral-800 dark:text-neutral-200"
                                                    >
                                                        <option value="admin">Admin</option>
                                                        <option value="inventory_manager">Manager</option>
                                                        <option value="cashier">Cashier</option>
                                                    </select>

                                                    {member.role !== 'admin' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                removeStaffMember(member.id);
                                                                toast.success('Revoked staff access');
                                                            }}
                                                            className="p-1 text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                                                            title="Revoke access"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>

                            {/* Logo Section */}
                            <section className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                                        <Image className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-[#2d3748] dark:text-white">Company Logo</h2>
                                </div>

                                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                                    {/* Logo Preview */}
                                    <div className="relative flex-shrink-0">
                                        {formData.logo ? (
                                            <div className="relative group">
                                                <img
                                                    src={formData.logo}
                                                    alt="Company Logo"
                                                    className="w-24 h-24 object-contain rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white"
                                                />
                                                <button
                                                    onClick={handleRemoveLogo}
                                                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="w-24 h-24 rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-700 flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
                                                <Building className="w-8 h-8 text-neutral-300 dark:text-neutral-600" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Upload Area */}
                                    <div className="flex-1 w-full text-center sm:text-left">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            accept="image/*"
                                            onChange={handleLogoUpload}
                                            className="hidden"
                                        />
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full px-4 py-3 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-600 dark:text-neutral-400 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Upload className="w-4 h-4" />
                                            {formData.logo ? 'Change Logo' : 'Upload Logo'}
                                        </button>
                                        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2">
                                            Recommended: Square image, PNG or SVG. Max 2MB.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* Company Info Section */}
                            <section className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                        <Building className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-[#2d3748] dark:text-white">Company Profile</h2>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Company Name</label>
                                            <Input
                                                value={formData.name}
                                                onChange={(e) => handleChange('name', e.target.value)}
                                                placeholder="Acme Corp"
                                                leftIcon={<Building className="w-4 h-4 text-neutral-400" />}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Website</label>
                                            <Input
                                                value={formData.website}
                                                onChange={(e) => handleChange('website', e.target.value)}
                                                placeholder="www.example.com"
                                                leftIcon={<Globe className="w-4 h-4 text-neutral-400" />}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Email Address</label>
                                            <Input
                                                value={formData.email}
                                                onChange={(e) => handleChange('email', e.target.value)}
                                                placeholder="contact@company.com"
                                                leftIcon={<Mail className="w-4 h-4 text-neutral-400" />}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Phone Number</label>
                                            <Input
                                                value={formData.phone}
                                                onChange={(e) => handleChange('phone', e.target.value)}
                                                placeholder="+1 (555) 000-0000"
                                                leftIcon={<Phone className="w-4 h-4 text-neutral-400" />}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Address</label>
                                        <textarea
                                            className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-500 outline-none transition-all placeholder:text-neutral-400 dark:placeholder:text-neutral-500 text-sm min-h-[100px] bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                                            value={formData.address}
                                            onChange={(e) => handleChange('address', e.target.value)}
                                            placeholder="123 Business Street&#10;City, State 10001"
                                        />
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {/* Financial Tab */}
                    {activeTab === 'financial' && (
                        <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-right-4 duration-300">
                            <section className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                                        <DollarSign className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-[#2d3748] dark:text-white">Financial Preferences</h2>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Default Currency</label>
                                        <Select
                                            options={[...currencies]}
                                            value={formData.currency}
                                            onChange={(v) => handleChange('currency', v)}
                                        />
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5">
                                            This currency will be used for all new documents and financial reports.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Default Tax Rate (%)</label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                value={formData.taxRate}
                                                onChange={(e) => handleChange('taxRate', parseFloat(e.target.value) || 0)}
                                                placeholder="10"
                                                leftIcon={<Percent className="w-4 h-4 text-neutral-400" />}
                                            />
                                        </div>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5">
                                            This tax rate will be automatically applied to new invoice items.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Decimal Places</label>
                                        <Select
                                            options={[0, 1, 2, 3, 4].map(places => ({
                                                value: String(places),
                                                label: `${new Intl.NumberFormat('en-US', { minimumFractionDigits: places, maximumFractionDigits: places }).format(1000)} (${places} decimals)`
                                            }))}
                                            value={String(formData.decimalPlaces ?? 2)}
                                            onChange={(v) => handleChange('decimalPlaces', parseInt(v, 10))}
                                        />
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5">
                                            Control the precision of currency figures displayed throughout the app.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Default Due Date (Days)</label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                min="0"
                                                value={formData.defaultDueDateDays ?? 30}
                                                onChange={(e) => handleChange('defaultDueDateDays', parseInt(e.target.value) || 0)}
                                                placeholder="30"
                                                leftIcon={<Calendar className="w-4 h-4 text-neutral-400" />}
                                            />
                                        </div>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5">
                                            Automatically set the due date this many days after the invoice date.
                                        </p>
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {/* Documents Tab */}
                    {activeTab === 'documents' && (
                        <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-right-4 duration-300">
                            {/* Document Numbering (New Component) */}
                            <DocumentNumbering
                                value={numberingData}
                                onChange={handleNumberingChange}
                            />
                        </div>
                    )}

                    {/* Appearance Tab */}
                    {activeTab === 'appearance' && (
                        <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-right-4 duration-300">
                            <section className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
                                        <Palette className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-[#2d3748] dark:text-white">Theme & Display</h2>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">Document Font</label>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {[
                                                    { value: 'Inter', label: 'Inter', description: 'Clean & Modern (Sans)', style: { fontFamily: "'Inter', sans-serif" } },
                                                    { value: 'DM Sans', label: 'DM Sans', description: 'Friendly & Readable (Sans)', style: { fontFamily: "'DM Sans', sans-serif" } },
                                                    { value: 'Playfair Display', label: 'Playfair Display', description: 'Elegant & Classic (Serif)', style: { fontFamily: "'Playfair Display', serif" } },
                                                    { value: 'Courier Prime', label: 'Courier Prime', description: 'Technical & Precise (Mono)', style: { fontFamily: "'Courier Prime', monospace" } },
                                                ].map((font) => (
                                                    <button
                                                        key={font.value}
                                                        onClick={() => handleChange('defaultFont', font.value)}
                                                        className={`flex flex-col items-start p-4 rounded-xl border-2 transition-all text-left ${formData.defaultFont === font.value
                                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-500/20'
                                                            : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                                                            }`}
                                                    >
                                                        <div className="flex items-center justify-between w-full mb-1">
                                                            <span className="font-semibold text-sm text-[#2d3748] dark:text-white" style={font.style}>{font.label}</span>
                                                            {formData.defaultFont === font.value && (
                                                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                            )}
                                                        </div>
                                                        <span className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">{font.description}</span>
                                                        <div className="w-full p-3 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-100 dark:border-neutral-700">
                                                            <p className="text-xl" style={font.style}>
                                                                $1,234.56
                                                            </p>
                                                            <p className="text-[10px] text-neutral-400 mt-1 uppercase tracking-wider" style={font.style}>
                                                                Invoice #001
                                                            </p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-neutral-100 dark:border-neutral-700">
                                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">Interface Theme</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            {[
                                                { value: 'light', label: 'Light', icon: Sun },
                                                { value: 'dark', label: 'Dark', icon: Moon },
                                            ].map(({ value, label, icon: Icon }) => (
                                                <button
                                                    key={value}
                                                    onClick={() => setTheme(value as any)}
                                                    className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${theme === value
                                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                                        : 'border-neutral-200 dark:border-neutral-600 hover:border-neutral-300 dark:hover:border-neutral-500 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700/50'
                                                        }`}
                                                >
                                                    <div className={`p-2 rounded-full ${theme === value ? 'bg-blue-100 dark:bg-blue-800' : 'bg-neutral-100 dark:bg-neutral-700'}`}>
                                                        <Icon className="w-6 h-6" />
                                                    </div>
                                                    <span className="text-sm font-semibold">{label}</span>
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-3">
                                            Your theme preference is saved and applied across all sessions.
                                        </p>
                                    </div>

                                    {/* Field Help & Info Icons Toggle */}
                                    <div className="pt-6 border-t border-neutral-100 dark:border-neutral-700">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <HelpCircle className="w-4 h-4 text-blue-500" />
                                                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Show Page & Tab Help Icons (?)</label>
                                                </div>
                                                <p className="text-xs text-neutral-500 dark:text-neutral-400 pr-4">
                                                    Display subtle, faint encircled (?) help buttons next to page titles, tabs, modals, and terms to explain their purpose and definitions. Toggle off for a pure minimalist interface.
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleChange('showFieldHelp', !formData.showFieldHelp)}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${formData.showFieldHelp
                                                    ? 'bg-blue-500'
                                                    : 'bg-neutral-300 dark:bg-neutral-600'
                                                    }`}
                                            >
                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${formData.showFieldHelp ? 'translate-x-6' : 'translate-x-1'
                                                    }`} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {/* Security Tab */}
                    {activeTab === 'security' && (
                        <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-right-4 duration-300">
                            <EncryptionSettings />
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Floating Save Changes Button */}
            <div className="fixed bottom-6 right-6 z-40 sm:hidden">
                <button
                    onClick={handleSave}
                    disabled={!isDirty}
                    className={`flex items-center gap-2 px-5 py-3 rounded-full font-semibold text-sm shadow-xl transition-all duration-300 active:scale-95 ${
                        isDirty
                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'
                            : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed opacity-75'
                    }`}
                >
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                </button>
            </div>
        </div>
    );
}
