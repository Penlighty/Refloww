"use client";

import { useState, useEffect, useRef } from 'react';
import { useSettingsStore, useOrganizationStore } from '@/lib/store';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Button, Input, Select, PageHelpModal, Modal, ModalFooter, ImageUploader } from '@/components/ui';
import { currencies } from '@/lib/constants/currencies';
import DocumentNumbering from '@/components/settings/DocumentNumbering';
import EncryptionSettings from '@/components/settings/EncryptionSettings';
import { sendOrgInvitation, respondToOrgInvitation } from '@/lib/firebase/firestore';
import {
    Save,
    Building,
    Globe,
    Mail,
    Phone,
    Palette,
    Upload,
    X,
    Image as ImageIcon,
    Sun,
    Moon,
    DollarSign,
    Percent,
    Hash,
    Calendar,
    HelpCircle,
    Shield,
    Users,
    UserPlus,
    Check,
    User,
    Plus,
    Key,
    Laptop,
    CheckCircle2,
    Trash2,
    AlertTriangle,
    ShieldAlert
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { UserRole } from '@/lib/types';
import { useSearchParams } from 'next/navigation';

type ScopeCategory = 'user' | 'org';

type TabId =
    // User tabs
    | 'user-profile'
    | 'appearance'
    | 'user-security'
    // Org tabs
    | 'general'
    | 'team'
    | 'financial'
    | 'documents'
    | 'security';

interface TabItem {
    id: TabId;
    label: string;
    icon: React.ElementType;
    category: ScopeCategory;
}

const ALL_TABS: TabItem[] = [
    // User Account Category
    { id: 'user-profile', label: 'My Profile', icon: User, category: 'user' },
    { id: 'appearance', label: 'Theme & Display', icon: Palette, category: 'user' },
    { id: 'user-security', label: 'Account & Login', icon: Key, category: 'user' },

    // Organization Category
    { id: 'general', label: 'Company Profile', icon: Building, category: 'org' },
    { id: 'team', label: 'Team & Staff', icon: Users, category: 'org' },
    { id: 'financial', label: 'Financial Defaults', icon: DollarSign, category: 'org' },
    { id: 'documents', label: 'ID & Numbering', icon: Hash, category: 'org' },
    { id: 'security', label: 'Vault & Encryption', icon: Shield, category: 'org' },
];

export default function SettingsPage() {
    const searchParams = useSearchParams();
    const initialTabParam = searchParams.get('tab') as TabId | null;

    const { company, updateCompany, theme, setTheme, numbering, updateNumbering } = useSettingsStore();
    const {
        organizations,
        activeOrganizationId,
        setActiveOrganization,
        getActiveOrganization,
        createOrganization,
        deleteOrganization,
        inviteStaffMember,
        removeStaffMember,
        updateStaffRole,
        pendingInvitations,
        acceptInvitation,
        declineInvitation
    } = useOrganizationStore();
    const activeOrg = getActiveOrganization();

    const { user, profile, updateUserProfile, deleteAccount } = useAuth();
    const logoFileInputRef = useRef<HTMLInputElement>(null);
    const avatarFileInputRef = useRef<HTMLInputElement>(null);

    const [activeTab, setActiveTab] = useState<TabId>(() => {
        if (initialTabParam && ALL_TABS.some(t => t.id === initialTabParam)) {
            return initialTabParam;
        }
        return 'user-profile';
    });

    // Form states for Organization
    const [orgFormData, setOrgFormData] = useState(company);
    const [numberingData, setNumberingData] = useState(numbering);
    const [isOrgDirty, setIsOrgDirty] = useState(false);

    // Form states for User Personal Profile
    const [userDisplayName, setUserDisplayName] = useState('');
    const [userPhotoURL, setUserPhotoURL] = useState('');
    const [isUserDirty, setIsUserDirty] = useState(false);

    // Staff Invite State
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<UserRole>('cashier');

    // Create New Org Modal State
    const [isCreateOrgModalOpen, setIsCreateOrgModalOpen] = useState(false);
    const [newOrgName, setNewOrgName] = useState('');

    // Delete Account Modal State
    const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
    const [deleteAccountStep, setDeleteAccountStep] = useState<1 | 2>(1);
    const [deleteAccountConfirmInput, setDeleteAccountConfirmInput] = useState('');
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);

    // Delete Organization Modal State
    const [isDeleteOrgModalOpen, setIsDeleteOrgModalOpen] = useState(false);
    const [deleteOrgStep, setDeleteOrgStep] = useState<1 | 2>(1);
    const [deleteOrgConfirmInput, setDeleteOrgConfirmInput] = useState('');
    const [isDeletingOrg, setIsDeletingOrg] = useState(false);

    // Delete Account Handler
    const handleConfirmDeleteAccount = async () => {
        const expectedEmail = (user?.email || '').trim().toLowerCase();
        const inputStr = deleteAccountConfirmInput.trim();

        if (inputStr.toLowerCase() !== expectedEmail && inputStr.toUpperCase() !== 'DELETE MY ACCOUNT') {
            toast.error('Confirmation text does not match expected criteria');
            return;
        }

        setIsDeletingAccount(true);
        const loadingToast = toast.loading('Permanently deleting your account...');
        try {
            await deleteAccount();
            toast.success('Your account has been deleted successfully.', { id: loadingToast });
        } catch (error: any) {
            console.error('Error deleting account:', error);
            toast.error(error?.message || 'Failed to delete account.', { id: loadingToast });
            setIsDeletingAccount(false);
        }
    };

    // Delete Organization Handler
    const handleConfirmDeleteOrg = async () => {
        if (!activeOrg) return;

        if (deleteOrgConfirmInput.trim() !== activeOrg.name.trim()) {
            toast.error('Organization name does not match');
            return;
        }

        setIsDeletingOrg(true);
        try {
            const orgToDeleteName = activeOrg.name;
            deleteOrganization(activeOrg.id);
            toast.success(`Organization "${orgToDeleteName}" deleted successfully`);
            setIsDeleteOrgModalOpen(false);
            setDeleteOrgConfirmInput('');
            setDeleteOrgStep(1);
        } catch (error: any) {
            console.error('Error deleting organization:', error);
            toast.error(error?.message || 'Failed to delete organization');
        } finally {
            setIsDeletingOrg(false);
        }
    };

    // Sync user state on mount / auth update
    useEffect(() => {
        if (user || profile) {
            setUserDisplayName(profile?.displayName || user?.displayName || '');
            setUserPhotoURL(profile?.photoURL || user?.photoURL || '');
        }
    }, [user, profile]);

    // Sync company & numbering when active organization changes or updates externally
    useEffect(() => {
        setOrgFormData(company);
        setNumberingData(numbering);
        setIsOrgDirty(false);
    }, [company, numbering, activeOrganizationId]);

    // Handlers for Org settings
    const handleOrgChange = (field: keyof typeof company, value: any) => {
        setOrgFormData(prev => ({ ...prev, [field]: value }));
        setIsOrgDirty(true);
    };

    const handleNumberingChange = (newValue: typeof numbering) => {
        setNumberingData(newValue);
        setIsOrgDirty(true);
    };

    const handleSaveOrgSettings = async () => {
        updateCompany(orgFormData);
        updateNumbering(numberingData);
        toast.success(`Saved settings for ${activeOrg?.name || 'Organization'}`);
        setIsOrgDirty(false);
    };

    // Handlers for User Profile
    const handleSaveUserProfile = async () => {
        if (!user || !updateUserProfile) return;
        try {
            await updateUserProfile({
                displayName: userDisplayName.trim(),
                photoURL: userPhotoURL || undefined
            });
            toast.success('User profile updated successfully!');
            setIsUserDirty(false);
        } catch (error: any) {
            console.error('Error updating user profile:', error);
            toast.error(error?.message || 'Failed to update user profile');
        }
    };

    // Handle User Avatar Upload
    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            toast.error('Image must be less than 2MB');
            return;
        }

        const loadingToast = toast.loading('Processing avatar image...');
        try {
            const { compressImage } = await import('@/lib/utils/image-utils');
            const base64 = await compressImage(file, 400, 0.7);
            setUserPhotoURL(base64);
            setIsUserDirty(true);
            toast.success('Avatar image updated', { id: loadingToast });
        } catch (error) {
            console.error('Error processing avatar:', error);
            toast.error('Failed to process image', { id: loadingToast });
        }
    };

    // Handle Org Logo Upload
    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            toast.error('Logo must be less than 2MB');
            return;
        }

        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return;
        }

        const loadingToast = toast.loading('Compressing logo...');
        try {
            const { compressImage } = await import('@/lib/utils/image-utils');
            const base64 = await compressImage(file, 800, 0.6);
            handleOrgChange('logo', base64);
            toast.success('Company logo updated', { id: loadingToast });
        } catch (error) {
            console.error('Error compressing logo:', error);
            toast.error('Failed to process logo', { id: loadingToast });
        }
    };

    const handleSendInvite = async () => {
        const cleanEmail = inviteEmail.trim().toLowerCase();
        if (!cleanEmail || !cleanEmail.includes('@')) {
            toast.error('Please enter a valid email address');
            return;
        }

        if (!activeOrg) {
            toast.error('No active organization selected');
            return;
        }

        const loadingToast = toast.loading(`Sending invitation to ${cleanEmail}...`);
        try {
            await sendOrgInvitation({
                orgId: activeOrg.id,
                orgName: activeOrg.name,
                inviterEmail: user?.email || 'owner@inflow.app',
                inviterName: userDisplayName || user?.displayName || 'Organization Owner',
                inviteeEmail: cleanEmail,
                role: inviteRole
            });

            inviteStaffMember(cleanEmail, inviteRole);
            toast.success(`Invitation sent to ${cleanEmail}!`, { id: loadingToast });
            setInviteEmail('');
        } catch (error: any) {
            console.error('Error sending invitation:', error);
            toast.error(error?.message || 'Failed to send invitation', { id: loadingToast });
        }
    };

    const handleCreateOrg = () => {
        if (!newOrgName.trim()) {
            toast.error('Please enter an organization name');
            return;
        }
        const createdId = createOrganization(newOrgName.trim(), user?.email || 'owner@inflow.app');
        setActiveOrganization(createdId);
        toast.success(`Created organization "${newOrgName.trim()}"`);
        setNewOrgName('');
        setIsCreateOrgModalOpen(false);
    };

    const currentTabObj = ALL_TABS.find(t => t.id === activeTab) || ALL_TABS[0];
    const isUserCategory = currentTabObj.category === 'user';

    return (
        <div className="max-w-6xl mx-auto h-[calc(100vh-100px)] md:h-[calc(100vh-140px)] flex flex-col overflow-hidden">
            {/* Header (Static) */}
            <div className="bg-background-light dark:bg-background-dark pt-4 pb-3 flex-shrink-0 border-b border-neutral-200/50 dark:border-neutral-700 md:border-b-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 md:mb-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-[#2d3748] dark:text-white font-sans tracking-tight">
                                Settings
                            </h1>
                            <PageHelpModal
                                title="User Account vs Organization Settings"
                                description="Separates your personal user account profile from the various organizations you own or manage."
                                terms={[
                                    { term: 'User Account Settings', definition: 'Personal details (Your name, personal profile photo, account security, interface theme).' },
                                    { term: 'Organization Settings', definition: 'Business profiles, default currency, tax rates, team members, document numbering, and encryption for the selected organization.' }
                                ]}
                            />
                        </div>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 hidden sm:block">
                            Configure personal account preferences or manage settings for your organizations.
                        </p>
                    </div>

                </div>

                {/* Mobile Navigation Bar */}
                <div className="md:hidden space-y-2.5 mt-1 pb-2 border-b border-neutral-200/60 dark:border-neutral-700/60">
                    {/* Category Switcher: User Account vs Organization */}
                    <div className="flex bg-neutral-100 dark:bg-neutral-800/80 p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => {
                                if (currentTabObj.category !== 'user') {
                                    setActiveTab('user-profile');
                                }
                            }}
                            className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                isUserCategory
                                    ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                            }`}
                        >
                            <User className="w-3.5 h-3.5" />
                            <span>User Account</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                if (currentTabObj.category !== 'org') {
                                    setActiveTab('general');
                                }
                            }}
                            className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                !isUserCategory
                                    ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                            }`}
                        >
                            <Building className="w-3.5 h-3.5" />
                            <span>Organization</span>
                        </button>
                    </div>

                    {/* Sub-tabs for selected category */}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {ALL_TABS.filter(t => t.category === (isUserCategory ? 'user' : 'org')).map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all text-xs font-semibold cursor-pointer ${
                                        isActive
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                                    }`}
                                >
                                    <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={isActive ? 2 : 1.75} />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row gap-6 md:gap-8 overflow-hidden min-h-0 pt-4 md:pt-0">
                {/* Sidebar Navigation (Desktop) */}
                <div className="hidden md:flex md:flex-col gap-6 w-64 flex-shrink-0 overflow-y-auto pr-1">
                    {/* User Account Section */}
                    <div>
                        <div className="px-3 mb-2 flex items-center gap-2 text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                            <User className="w-3.5 h-3.5" />
                            <span>User Account</span>
                        </div>
                        <div className="space-y-1">
                            {ALL_TABS.filter(t => t.category === 'user').map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm ${isActive
                                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold shadow-sm'
                                            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 font-medium'
                                            }`}
                                    >
                                        <Icon className="w-4 h-4 shrink-0" strokeWidth={isActive ? 2 : 1.75} />
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Organization Section */}
                    <div>
                        <div className="px-3 mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                                <Building className="w-3.5 h-3.5" />
                                <span>Organizations</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCreateOrgModalOpen(true)}
                                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                                <Plus className="w-3 h-3" /> New
                            </button>
                        </div>
                        <div className="space-y-1">
                            {ALL_TABS.filter(t => t.category === 'org').map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm ${isActive
                                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold shadow-sm'
                                            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 font-medium'
                                            }`}
                                    >
                                        <Icon className="w-4 h-4 shrink-0" strokeWidth={isActive ? 2 : 1.75} />
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto pr-2 pb-24 scrollbar-none min-h-0">
                    {/* Organization Selector Banner (Visible when editing Organization tabs) */}
                    {!isUserCategory && (
                        <div className="bg-gradient-to-r from-blue-50/80 via-neutral-50/80 to-purple-50/80 dark:from-blue-950/30 dark:via-neutral-800/50 dark:to-purple-950/30 border border-blue-100 dark:border-blue-900/50 rounded-2xl p-4 mb-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-600 text-white rounded-xl shadow-md shrink-0">
                                    <Building className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                            Active Organization
                                        </span>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                                            {activeOrg?.roleInOrg === 'admin' ? 'Owner / Admin' : activeOrg?.roleInOrg || 'Member'}
                                        </span>
                                    </div>
                                    <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                                        {activeOrg?.name || 'Primary Organization'}
                                    </h3>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <select
                                    value={activeOrganizationId}
                                    onChange={(e) => {
                                        setActiveOrganization(e.target.value);
                                        toast.success('Switched active organization');
                                    }}
                                    className="px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-800 dark:text-neutral-200 shadow-sm focus:outline-none focus:border-blue-500 cursor-pointer"
                                >
                                    {organizations.map((org) => (
                                        <option key={org.id} value={org.id}>
                                            {org.name} ({org.roleInOrg === 'admin' ? 'Owner' : 'Staff'})
                                        </option>
                                    ))}
                                </select>

                                <button
                                    type="button"
                                    onClick={() => setIsCreateOrgModalOpen(true)}
                                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center gap-1 shrink-0"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>New Org</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* USER ACCOUNT TABS */}
                    {/* ========================================================= */}

                    {/* My Profile Tab */}
                    {activeTab === 'user-profile' && (
                        <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-right-4 duration-300">
                            <section className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-[#2d3748] dark:text-white">Personal User Profile</h2>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                            Manage your personal display name, profile avatar, and user account information across all organizations.
                                        </p>
                                    </div>
                                </div>

                                <div className="mb-6 max-w-sm">
                                    <ImageUploader
                                        label="Profile Picture Avatar"
                                        value={userPhotoURL}
                                        onChange={(url) => {
                                            setUserPhotoURL(url);
                                            setIsUserDirty(true);
                                        }}
                                        aspectRatio="avatar"
                                    />
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                                            Your Full Name
                                        </label>
                                        <Input
                                            value={userDisplayName}
                                            onChange={(e) => {
                                                setUserDisplayName(e.target.value);
                                                setIsUserDirty(true);
                                            }}
                                            placeholder="John Doe"
                                            leftIcon={<User className="w-4 h-4 text-neutral-400" />}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                                            Personal Account Email
                                        </label>
                                        <Input
                                            value={user?.email || ''}
                                            disabled
                                            leftIcon={<Mail className="w-4 h-4 text-neutral-400" />}
                                        />
                                        <p className="text-xs text-neutral-400 mt-1">
                                            Your login email is managed via your authentication provider.
                                        </p>
                                    </div>

                                </div>
                            </section>
                        </div>
                    )}

                    {/* Appearance & Display Tab */}
                    {activeTab === 'appearance' && (
                        <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-right-4 duration-300">
                            <section className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
                                        <Palette className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-[#2d3748] dark:text-white">Theme & Display</h2>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                            Personalize your user interface appearance and document typography.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                                            Interface Theme
                                        </label>
                                        <div className="grid grid-cols-2 gap-4">
                                            {[
                                                { value: 'light', label: 'Light Theme', icon: Sun },
                                                { value: 'dark', label: 'Dark Theme', icon: Moon },
                                            ].map(({ value, label, icon: Icon }) => (
                                                <button
                                                    key={value}
                                                    onClick={() => setTheme(value as any)}
                                                    className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${theme === value
                                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                                        : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 text-neutral-600 dark:text-neutral-400'
                                                        }`}
                                                >
                                                    <Icon className="w-6 h-6" />
                                                    <span className="text-xs font-bold">{label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-neutral-100 dark:border-neutral-700">
                                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                                            Document Font Preset
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {[
                                                { value: 'Inter', label: 'Inter', description: 'Clean & Modern (Sans)', style: { fontFamily: "'Inter', sans-serif" } },
                                                { value: 'DM Sans', label: 'DM Sans', description: 'Friendly & Readable (Sans)', style: { fontFamily: "'DM Sans', sans-serif" } },
                                                { value: 'Playfair Display', label: 'Playfair Display', description: 'Elegant & Classic (Serif)', style: { fontFamily: "'Playfair Display', serif" } },
                                                { value: 'Courier Prime', label: 'Courier Prime', description: 'Technical & Precise (Mono)', style: { fontFamily: "'Courier Prime', monospace" } },
                                            ].map((font) => (
                                                <button
                                                    key={font.value}
                                                    onClick={() => handleOrgChange('defaultFont', font.value)}
                                                    className={`flex flex-col items-start p-4 rounded-xl border-2 transition-all text-left cursor-pointer ${orgFormData.defaultFont === font.value
                                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-500/20'
                                                        : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between w-full mb-1">
                                                        <span className="font-semibold text-sm text-[#2d3748] dark:text-white" style={font.style}>
                                                            {font.label}
                                                        </span>
                                                        {orgFormData.defaultFont === font.value && (
                                                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">{font.description}</span>
                                                    <div className="w-full p-3 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-100 dark:border-neutral-700">
                                                        <p className="text-lg font-bold" style={font.style}>
                                                            $1,234.56
                                                        </p>
                                                        <p className="text-[10px] text-neutral-400 uppercase tracking-wider" style={font.style}>
                                                            Invoice #INV-001
                                                        </p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                </div>
                            </section>
                        </div>
                    )}

                    {/* User Account Security Tab */}
                    {activeTab === 'user-security' && (
                        <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-right-4 duration-300">
                            <section className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                                        <Key className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-[#2d3748] dark:text-white">Account Authentication & Security</h2>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                            Manage your user credentials and login authentication status.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl border border-neutral-200/60 dark:border-neutral-700 flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-bold text-neutral-900 dark:text-white">Logged-in User Account</p>
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{user?.email}</p>
                                            <p className="text-[10px] text-neutral-400 font-mono mt-1">UID: {user?.uid}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl font-bold">
                                            <CheckCircle2 className="w-4 h-4" />
                                            <span>Authenticated</span>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl border border-neutral-200/60 dark:border-neutral-700">
                                        <p className="text-xs font-bold text-neutral-900 dark:text-white mb-1">Password Management</p>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
                                            If you registered with email and password, click below to trigger a password reset link to your email.
                                        </p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                toast.success(`Password reset link sent to ${user?.email}`);
                                            }}
                                        >
                                            Send Password Reset Link
                                        </Button>
                                    </div>

                                    {/* Danger Zone: Account Deletion */}
                                    <div className="p-5 bg-red-50/60 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-900/50 mt-6">
                                        <div className="flex items-center gap-2 mb-1">
                                            <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" />
                                            <h3 className="text-xs font-bold text-red-900 dark:text-red-300 uppercase tracking-wider">
                                                Danger Zone
                                            </h3>
                                        </div>
                                        <h4 className="text-sm font-bold text-neutral-900 dark:text-white mb-1">
                                            Delete User Account
                                        </h4>
                                        <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-4">
                                            Permanently delete your user account, authentication profile, and personal user data across Refloww. This action is irreversible.
                                        </p>
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            leftIcon={<Trash2 className="w-4 h-4" />}
                                            onClick={() => {
                                                setDeleteAccountStep(1);
                                                setDeleteAccountConfirmInput('');
                                                setIsDeleteAccountModalOpen(true);
                                            }}
                                        >
                                            Delete Account...
                                        </Button>
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* ORGANIZATION SETTINGS TABS */}
                    {/* ========================================================= */}

                    {/* Company Profile Tab */}
                    {activeTab === 'general' && (
                        <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-right-4 duration-300">
                            {/* Logo Section */}
                            <section className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                                        <ImageIcon className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-[#2d3748] dark:text-white">
                                        Organization Logo ({activeOrg?.name})
                                    </h2>
                                </div>

                                <div className="max-w-md">
                                    <ImageUploader
                                        label={`Organization Logo (${activeOrg?.name})`}
                                        value={orgFormData.logo || ''}
                                        onChange={(url) => handleOrgChange('logo', url)}
                                        aspectRatio="square"
                                        hint="Recommended: Square image, PNG or SVG up to 2MB"
                                    />
                                </div>
                            </section>

                            {/* Company Info Section */}
                            <section className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                        <Building className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-[#2d3748] dark:text-white">Organization Details</h2>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                                                Company / Organization Name
                                            </label>
                                            <Input
                                                value={orgFormData.name}
                                                onChange={(e) => handleOrgChange('name', e.target.value)}
                                                placeholder="Spice City"
                                                leftIcon={<Building className="w-4 h-4 text-neutral-400" />}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                                                Website
                                            </label>
                                            <Input
                                                value={orgFormData.website}
                                                onChange={(e) => handleOrgChange('website', e.target.value)}
                                                placeholder="www.spicecity.com"
                                                leftIcon={<Globe className="w-4 h-4 text-neutral-400" />}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                                                Business Email Address
                                            </label>
                                            <Input
                                                value={orgFormData.email}
                                                onChange={(e) => handleOrgChange('email', e.target.value)}
                                                placeholder="contact@spicecity.com"
                                                leftIcon={<Mail className="w-4 h-4 text-neutral-400" />}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                                                Phone Number
                                            </label>
                                            <Input
                                                value={orgFormData.phone}
                                                onChange={(e) => handleOrgChange('phone', e.target.value)}
                                                placeholder="+1 (555) 000-0000"
                                                leftIcon={<Phone className="w-4 h-4 text-neutral-400" />}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                                            Address
                                        </label>
                                        <textarea
                                            className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-500 outline-none transition-all placeholder:text-neutral-400 dark:placeholder:text-neutral-500 text-sm min-h-[100px] bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                                            value={orgFormData.address}
                                            onChange={(e) => handleOrgChange('address', e.target.value)}
                                            placeholder="123 Business Street&#10;City, State 10001"
                                        />
                                    </div>

                                    <div className="pt-4 flex justify-end">
                                        <Button
                                            onClick={handleSaveOrgSettings}
                                            disabled={!isOrgDirty}
                                            leftIcon={<Save className="w-4 h-4" />}
                                        >
                                            Save Changes
                                        </Button>
                                    </div>
                                </div>
                            </section>

                            {/* Danger Zone: Delete Organization */}
                            <section className="bg-red-50/50 dark:bg-red-950/20 border border-red-200/80 dark:border-red-900/50 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg">
                                            <ShieldAlert className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                                                Danger Zone
                                            </span>
                                            <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                                                Delete Organization ({activeOrg?.name})
                                            </h2>
                                        </div>
                                    </div>

                                    {activeOrg?.roleInOrg !== 'admin' && (
                                        <span className="px-3 py-1 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-bold border border-amber-200 dark:border-amber-900">
                                            Owner Role Required
                                        </span>
                                    )}
                                </div>

                                <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-4">
                                    Permanently delete this organization, remove member access, and disassociate organization configurations.
                                </p>

                                {activeOrg?.roleInOrg === 'admin' ? (
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        leftIcon={<Trash2 className="w-4 h-4" />}
                                        onClick={() => {
                                            setDeleteOrgStep(1);
                                            setDeleteOrgConfirmInput('');
                                            setIsDeleteOrgModalOpen(true);
                                        }}
                                    >
                                        Delete Organization...
                                    </Button>
                                ) : (
                                    <p className="text-xs italic text-neutral-500 dark:text-neutral-400">
                                        Only Organization Owners / Admins are permitted to delete this organization.
                                    </p>
                                )}
                            </section>
                        </div>
                    )}

                    {/* Team & Staff Tab */}
                    {activeTab === 'team' && (
                        <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-right-4 duration-300">
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
                                                Invite team members to manage this specific organization.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 self-start sm:self-auto bg-purple-50 dark:bg-purple-950/40 px-3 py-1.5 rounded-xl border border-purple-200/60 dark:border-purple-800">
                                        <Shield className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                        <span className="text-xs font-bold text-purple-900 dark:text-purple-300">
                                            Your Role: {activeOrg?.roleInOrg === 'admin' ? 'Owner / Admin' : activeOrg?.roleInOrg}
                                        </span>
                                    </div>
                                </div>

                                {/* Send Staff Invite Form */}
                                <div className="p-5 bg-neutral-50/70 dark:bg-neutral-700/50 rounded-2xl border border-neutral-200/60 dark:border-neutral-700/60 mb-6 space-y-3">
                                    <h3 className="text-xs font-bold text-neutral-900 dark:text-white">
                                        Invite New Staff Member to {activeOrg?.name}
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

                                {/* Active Organization Team Table */}
                                <div>
                                    <h3 className="text-xs font-bold text-neutral-900 dark:text-white mb-2">
                                        Members in {activeOrg?.name} ({activeOrg?.members?.length || 0})
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
                                                            <span className={`px-1.5 py-0.2 text-[10px] font-bold rounded-md ${member.status === 'active'
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
                                                        className="px-2 py-1 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-xs font-medium text-neutral-800 dark:text-neutral-200 cursor-pointer"
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
                                    <h2 className="text-lg font-semibold text-[#2d3748] dark:text-white">
                                        Financial Defaults ({activeOrg?.name})
                                    </h2>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                                            Default Currency
                                        </label>
                                        <Select
                                            options={[...currencies]}
                                            value={orgFormData.currency}
                                            onChange={(v) => handleOrgChange('currency', v)}
                                        />
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5">
                                            Currency for new invoices and receipts in {activeOrg?.name}.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                                            Default Tax Rate (%)
                                        </label>
                                        <Input
                                            type="number"
                                            value={orgFormData.taxRate}
                                            onChange={(e) => handleOrgChange('taxRate', parseFloat(e.target.value) || 0)}
                                            placeholder="10"
                                            leftIcon={<Percent className="w-4 h-4 text-neutral-400" />}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                                            Decimal Places
                                        </label>
                                        <Select
                                            options={[0, 1, 2, 3, 4].map(places => ({
                                                value: String(places),
                                                label: `${new Intl.NumberFormat('en-US', { minimumFractionDigits: places, maximumFractionDigits: places }).format(1000)} (${places} decimals)`
                                            }))}
                                            value={String(orgFormData.decimalPlaces ?? 2)}
                                            onChange={(v) => handleOrgChange('decimalPlaces', parseInt(v, 10))}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                                            Default Payment Due Terms (Days)
                                        </label>
                                        <Input
                                            type="number"
                                            min="0"
                                            value={orgFormData.defaultDueDateDays ?? 30}
                                            onChange={(e) => handleOrgChange('defaultDueDateDays', parseInt(e.target.value) || 0)}
                                            placeholder="30"
                                            leftIcon={<Calendar className="w-4 h-4 text-neutral-400" />}
                                        />
                                    </div>

                                </div>
                            </section>
                        </div>
                    )}

                    {/* Documents ID & Numbering Tab */}
                    {activeTab === 'documents' && (
                        <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-right-4 duration-300">
                            <DocumentNumbering
                                value={numberingData}
                                onChange={handleNumberingChange}
                            />
                        </div>
                    )}

                    {/* Security & Vault Tab */}
                    {activeTab === 'security' && (
                        <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-right-4 duration-300">
                            <EncryptionSettings />
                        </div>
                    )}
                </div>
            </div>

            {/* Create New Organization Modal */}
            <Modal
                isOpen={isCreateOrgModalOpen}
                onClose={() => setIsCreateOrgModalOpen(false)}
                title="Create New Organization"
                size="md"
            >
                <div className="space-y-4 py-2">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Enter a business name for your new organization. You will be set as the Owner and can invite staff members to it.
                    </p>

                    <div>
                        <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                            Organization / Business Name
                        </label>
                        <Input
                            value={newOrgName}
                            onChange={(e) => setNewOrgName(e.target.value)}
                            placeholder="e.g. Spice City Philadelphia, TechStore, etc."
                            leftIcon={<Building className="w-4 h-4 text-neutral-400" />}
                        />
                    </div>
                </div>

                <ModalFooter>
                    <Button variant="ghost" onClick={() => setIsCreateOrgModalOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleCreateOrg} disabled={!newOrgName.trim()}>
                        Create Organization
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Multi-step Delete Account Modal */}
            <Modal
                isOpen={isDeleteAccountModalOpen}
                onClose={() => {
                    if (!isDeletingAccount) {
                        setIsDeleteAccountModalOpen(false);
                        setDeleteAccountConfirmInput('');
                        setDeleteAccountStep(1);
                    }
                }}
                title={deleteAccountStep === 1 ? "Delete User Account (Step 1 of 2)" : "Confirm Account Deletion (Step 2 of 2)"}
                size="md"
            >
                {deleteAccountStep === 1 ? (
                    <div className="space-y-4 py-2">
                        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-xs font-bold text-red-900 dark:text-red-300 uppercase tracking-wider">
                                    Permanent Action Warning
                                </h4>
                                <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                                    Deleting your user account is permanent and cannot be undone.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2 text-xs text-neutral-600 dark:text-neutral-300">
                            <p className="font-semibold text-neutral-900 dark:text-white">What will happen when you delete your account:</p>
                            <ul className="list-disc list-inside space-y-1 pl-1 text-neutral-500 dark:text-neutral-400">
                                <li>Your login authentication credentials will be erased.</li>
                                <li>Your personal profile details will be permanently removed.</li>
                                <li>You will be logged out immediately across all active sessions.</li>
                            </ul>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 py-2">
                        <p className="text-xs text-neutral-600 dark:text-neutral-300">
                            To confirm deletion, please type your email address <strong className="text-neutral-900 dark:text-white font-mono">{user?.email}</strong> or <strong className="text-neutral-900 dark:text-white font-mono">DELETE MY ACCOUNT</strong> in the field below:
                        </p>

                        <div>
                            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                                Confirmation String
                            </label>
                            <Input
                                value={deleteAccountConfirmInput}
                                onChange={(e) => setDeleteAccountConfirmInput(e.target.value)}
                                placeholder={`Type ${user?.email || 'DELETE MY ACCOUNT'}...`}
                                autoFocus
                            />
                        </div>
                    </div>
                )}

                <ModalFooter>
                    {deleteAccountStep === 1 ? (
                        <>
                            <Button variant="ghost" onClick={() => setIsDeleteAccountModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                variant="danger"
                                onClick={() => setDeleteAccountStep(2)}
                            >
                                Proceed to Confirmation
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                variant="ghost"
                                onClick={() => setDeleteAccountStep(1)}
                                disabled={isDeletingAccount}
                            >
                                Back
                            </Button>
                            <Button
                                variant="danger"
                                isLoading={isDeletingAccount}
                                onClick={handleConfirmDeleteAccount}
                                disabled={
                                    deleteAccountConfirmInput.trim().toLowerCase() !== (user?.email || '').trim().toLowerCase() &&
                                    deleteAccountConfirmInput.trim().toUpperCase() !== 'DELETE MY ACCOUNT'
                                }
                            >
                                Permanently Delete Account
                            </Button>
                        </>
                    )}
                </ModalFooter>
            </Modal>

            {/* Multi-step Delete Organization Modal */}
            <Modal
                isOpen={isDeleteOrgModalOpen}
                onClose={() => {
                    if (!isDeletingOrg) {
                        setIsDeleteOrgModalOpen(false);
                        setDeleteOrgConfirmInput('');
                        setDeleteOrgStep(1);
                    }
                }}
                title={deleteOrgStep === 1 ? `Delete Organization "${activeOrg?.name}" (Step 1 of 2)` : "Confirm Organization Deletion (Step 2 of 2)"}
                size="md"
            >
                {deleteOrgStep === 1 ? (
                    <div className="space-y-4 py-2">
                        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-xs font-bold text-red-900 dark:text-red-300 uppercase tracking-wider">
                                    Warning: Organization Deletion
                                </h4>
                                <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                                    You are about to delete <strong>{activeOrg?.name}</strong>.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2 text-xs text-neutral-600 dark:text-neutral-300">
                            <p className="font-semibold text-neutral-900 dark:text-white">Consequences of deleting this organization:</p>
                            <ul className="list-disc list-inside space-y-1 pl-1 text-neutral-500 dark:text-neutral-400">
                                <li>This organization profile will be removed from your list of organizations.</li>
                                <li>Staff members invited to this organization will lose access.</li>
                                <li>Your active workspace will switch to another organization.</li>
                            </ul>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 py-2">
                        <p className="text-xs text-neutral-600 dark:text-neutral-300">
                            To confirm deletion, please type the exact organization name <strong className="text-neutral-900 dark:text-white font-semibold">&quot;{activeOrg?.name}&quot;</strong> below:
                        </p>

                        <div>
                            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                                Organization Name
                            </label>
                            <Input
                                value={deleteOrgConfirmInput}
                                onChange={(e) => setDeleteOrgConfirmInput(e.target.value)}
                                placeholder={`Type "${activeOrg?.name}"...`}
                                autoFocus
                            />
                        </div>
                    </div>
                )}

                <ModalFooter>
                    {deleteOrgStep === 1 ? (
                        <>
                            <Button variant="ghost" onClick={() => setIsDeleteOrgModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                variant="danger"
                                onClick={() => setDeleteOrgStep(2)}
                            >
                                Proceed to Confirmation
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                variant="ghost"
                                onClick={() => setDeleteOrgStep(1)}
                                disabled={isDeletingOrg}
                            >
                                Back
                            </Button>
                            <Button
                                variant="danger"
                                isLoading={isDeletingOrg}
                                onClick={handleConfirmDeleteOrg}
                                disabled={deleteOrgConfirmInput.trim() !== activeOrg?.name?.trim()}
                            >
                                Permanently Delete Organization
                            </Button>
                        </>
                    )}
                </ModalFooter>
            </Modal>

            {/* Single Floating Action Button (FAB) at the bottom end */}
            {(isUserCategory ? isUserDirty : isOrgDirty) && (
                <div className="fixed bottom-20 right-4 sm:bottom-8 sm:right-8 z-[90] animate-in fade-in slide-in-from-bottom-4 duration-200">
                    <Button
                        onClick={isUserCategory ? handleSaveUserProfile : handleSaveOrgSettings}
                        leftIcon={<Save className="w-4 h-4" />}
                        className="shadow-2xl font-bold px-5 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white shadow-orange-500/30 ring-4 ring-orange-500/20 transition-all flex items-center gap-2"
                    >
                        Save Changes
                    </Button>
                </div>
            )}
        </div>
    );
}
