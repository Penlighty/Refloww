"use client";

import React, { useState, useEffect } from 'react';
import { getSystemSettings, updateSystemSettings, SystemSettings } from '@/lib/firebase/admin';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Settings, Shield, AlertTriangle, Save, Server, ToggleLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function AdminSettingsPage() {
    const { user } = useAuth();
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const data = await getSystemSettings();
            setSettings(data);
        } catch (error) {
            console.error("Error loading settings:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!settings || !user) return;
        try {
            setSaving(true);
            await updateSystemSettings(settings, user.uid);
            // Optionally, show a toast here
        } catch (error) {
            console.error("Error saving settings:", error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6 max-w-4xl mx-auto flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!settings) return null;

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Settings className="w-6 h-6 text-slate-600" />
                        System Settings
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Configure global platform features and maintenance states.
                    </p>
                </div>
                <Button 
                    onClick={handleSave} 
                    isLoading={saving}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                </Button>
            </div>

            <div className="grid gap-6">
                {/* Core System State */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2">
                        <Server className="w-5 h-5 text-slate-500" />
                        <h2 className="font-semibold text-slate-800 dark:text-slate-200">Core Platform State</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        {/* Maintenance Mode */}
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                    <AlertTriangle className={`w-4 h-4 ${settings.maintenanceMode ? 'text-red-500' : 'text-slate-400'}`} />
                                    Maintenance Mode
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    When active, regular users cannot access the application. Admins retain access.
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer"
                                    checked={settings.maintenanceMode}
                                    onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-red-500"></div>
                            </label>
                        </div>
                        
                        {settings.maintenanceMode && (
                            <div className="pl-6 border-l-2 border-red-200 dark:border-red-900/30">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Maintenance Message (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={settings.maintenanceMessage || ''}
                                    onChange={(e) => setSettings({ ...settings, maintenanceMessage: e.target.value })}
                                    placeholder="We are currently down for scheduled maintenance..."
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                />
                            </div>
                        )}

                        <div className="h-px bg-slate-100 dark:bg-slate-700" />

                        {/* Allow Signups */}
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-emerald-500" />
                                    Allow New Registrations
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    Toggle the ability for new users to create accounts on the platform.
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer"
                                    checked={settings.allowSignups}
                                    onChange={(e) => setSettings({ ...settings, allowSignups: e.target.checked })}
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-500"></div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Feature Flags */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2">
                        <ToggleLeft className="w-5 h-5 text-slate-500" />
                        <h2 className="font-semibold text-slate-800 dark:text-slate-200">Global Feature Flags</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium text-slate-900 dark:text-white">Marketplace Access</h3>
                                <p className="text-sm text-slate-500">Enable or disable the public template marketplace.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer"
                                    checked={settings.features.marketplace}
                                    onChange={(e) => setSettings({ ...settings, features: { ...settings.features, marketplace: e.target.checked } })}
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium text-slate-900 dark:text-white">AI Receipt Parsing</h3>
                                <p className="text-sm text-slate-500">Enable AI-powered data extraction for receipts.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer"
                                    checked={settings.features.aiReceipts}
                                    onChange={(e) => setSettings({ ...settings, features: { ...settings.features, aiReceipts: e.target.checked } })}
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium text-slate-900 dark:text-white">Premium Templates</h3>
                                <p className="text-sm text-slate-500">Allow users to access and purchase premium templates.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer"
                                    checked={settings.features.premiumTemplates}
                                    onChange={(e) => setSettings({ ...settings, features: { ...settings.features, premiumTemplates: e.target.checked } })}
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>
                </div>
                
                <div className="text-xs text-slate-500 text-center">
                    Last updated on {new Date(settings.updatedAt).toLocaleString()}
                </div>
            </div>
        </div>
    );
}
