
"use client";

import { useState, useEffect, useRef } from 'react';
import { useSettingsStore } from '@/lib/store';
import { Button, Input, Select } from '@/components/ui';
import { currencies } from '@/lib/constants/currencies';
import DocumentNumbering from '@/components/settings/DocumentNumbering';
import { Save, Building, Globe, Mail, Phone, Palette, Upload, X, Image, Sun, Moon, Monitor, DollarSign, Percent, Hash, Layout, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';

type TabId = 'general' | 'financial' | 'documents' | 'appearance';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'general', label: 'General', icon: Building },
    { id: 'financial', label: 'Financial', icon: DollarSign },
    { id: 'documents', label: 'Documents', icon: Hash },
    { id: 'appearance', label: 'Appearance', icon: Palette },
];

export default function SettingsPage() {
    const { company, updateCompany, theme, setTheme, numbering, updateNumbering } = useSettingsStore();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeTab, setActiveTab] = useState<TabId>('general');

    // Local state to manage form inputs before saving
    const [formData, setFormData] = useState(company);
    const [numberingData, setNumberingData] = useState(numbering);
    const [isDirty, setIsDirty] = useState(false);

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

    const handleSave = () => {
        updateCompany(formData);
        updateNumbering(numberingData);
        toast.success('Settings saved successfully');
        setIsDirty(false);
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            handleChange('logo', base64);
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveLogo = () => {
        handleChange('logo', '');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="max-w-6xl mx-auto h-[calc(100vh-140px)] min-h-[600px] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 flex-shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-[#2d3748] dark:text-white">Settings</h1>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Manage your company profile and application preferences.</p>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={!isDirty}
                    leftIcon={<Save className="w-4 h-4" />}
                >
                    Save Changes
                </Button>
            </div>

            <div className="flex-1 flex gap-8 overflow-hidden">
                {/* Sidebar Navigation */}
                <div className="w-64 flex-shrink-0 flex flex-col gap-2">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                                    }`}
                            >
                                <Icon className="w-5 h-5" strokeWidth={isActive ? 2 : 1.75} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto pr-2 pb-10">
                    {/* General Tab */}
                    {activeTab === 'general' && (
                        <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-right-4 duration-300">
                            {/* Logo Section */}
                            <section className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                                        <Image className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-[#2d3748] dark:text-white">Company Logo</h2>
                                </div>

                                <div className="flex items-start gap-6">
                                    {/* Logo Preview */}
                                    <div className="relative">
                                        {formData.logo ? (
                                            <div className="relative group">
                                                <img
                                                    src={formData.logo}
                                                    alt="Company Logo"
                                                    className="w-24 h-24 object-contain rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white"
                                                />
                                                <button
                                                    onClick={handleRemoveLogo}
                                                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
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
                                    <div className="flex-1">
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
                                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">Interface Theme</label>
                                        <div className="grid grid-cols-3 gap-4">
                                            {[
                                                { value: 'light', label: 'Light', icon: Sun },
                                                { value: 'dark', label: 'Dark', icon: Moon },
                                                { value: 'system', label: 'System', icon: Monitor },
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
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
