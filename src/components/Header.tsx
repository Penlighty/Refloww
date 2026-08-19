"use client";

import { useState, useRef, useEffect, useMemo } from 'react';
import {
    Search,
    ChevronDown,
    Command,
    Menu,
    LogOut,
    Settings,
    MessageSquare,
    Bell,
    ChevronLeft,
    Check,
    Sparkles,
    ArrowRight,
    Megaphone,
    Gift,
    Info,
    AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThemeToggleSimple } from './ThemeToggle';
import { useSidebarStore } from '@/lib/sidebar-store';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useSettingsStore, useDocumentStore } from '@/lib/store';
import { subscribeToActiveAnnouncements, Announcement } from '@/lib/firebase/admin';
import FeedbackModal from './FeedbackModal';

const typeConfig = {
    announcement: { icon: Megaphone, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    promotion: { icon: Gift, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    greeting: { icon: Info, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' }
};

const priorityConfig = {
    'urgent': { textClass: 'text-red-500', dotClass: 'bg-red-500' },
    'normal': { textClass: 'text-neutral-500 dark:text-neutral-400', dotClass: 'bg-neutral-400' },
    'low': { textClass: 'text-neutral-400 dark:text-neutral-500', dotClass: 'bg-neutral-300' },
};

export default function Header() {
    const { toggleMobile } = useSidebarStore();
    const { user, profile, logout } = useAuth();
    const { documents } = useDocumentStore();
    const company = useSettingsStore(state => state.company);
    const router = useRouter();

    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [activeTab, setActiveTab] = useState<'main' | 'notifications'>('main');
    const [notifications, setNotifications] = useState<Announcement[]>([]);
    
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Load active announcements
    useEffect(() => {
        const unsubscribe = subscribeToActiveAnnouncements((data) => {
            const filtered = data.filter(a => a.displayStyle === 'notification');
            setNotifications(filtered);
        });
        return () => unsubscribe();
    }, []);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false);
                setActiveTab('main');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    // Calculate tasks / notifications list
    const tasks = useMemo(() => {
        const generatedTasks: any[] = [];

        // Overdue Invoices
        const overdue = documents.filter(d => d.status === 'overdue');
        overdue.forEach(doc => {
            generatedTasks.push({
                id: `overdue-${doc.id}`,
                title: `${doc.documentNumber} is overdue`,
                category: 'Collection',
                priority: 'urgent',
                documentId: doc.id,
                type: doc.type
            });
        });

        // Drafts
        const drafts = documents.filter(d => d.status === 'draft');
        drafts.forEach(doc => {
            generatedTasks.push({
                id: `draft-${doc.id}`,
                title: `Finish ${doc.documentNumber}`,
                category: 'Drafts',
                priority: 'normal',
                documentId: doc.id,
                type: doc.type
            });
        });

        // Notifications
        notifications.forEach(note => {
            generatedTasks.push({
                id: note.id,
                title: note.title,
                category: note.type.charAt(0).toUpperCase() + note.type.slice(1),
                priority: note.type === 'warning' ? 'urgent' : 'normal',
                documentId: '',
                type: 'invoice'
            });
        });

        return generatedTasks;
    }, [documents, notifications]);

    const pendingCount = tasks.length;

    // Get display name and initials
    const defaultCompanyName = 'My Company';
    const defaultCompanyEmail = 'contact@mycompany.com';

    const hasCustomName = company?.name && company.name.trim() !== '' && company.name !== defaultCompanyName;
    const hasCustomEmail = company?.email && company.email.trim() !== '' && company.email !== defaultCompanyEmail;
    const hasCustomLogo = company?.logo && company.logo.trim() !== '';
    
    // Fallbacks
    const fallbackName = profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'User';
    const displayName = isMounted && hasCustomName ? company.name : fallbackName;
    const email = isMounted && hasCustomEmail ? company.email : (profile?.email || user?.email || '');
    const photoURL = isMounted && hasCustomLogo ? company.logo : (profile?.photoURL || user?.photoURL);
    const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

    const toggleUserMenu = () => {
        const nextState = !isUserMenuOpen;
        setIsUserMenuOpen(nextState);
        if (!nextState) {
            setActiveTab('main');
        }
    };

    return (
        <header className="h-16 bg-white dark:bg-neutral-800 border-b border-neutral-100 dark:border-neutral-700 sticky top-0 z-40 transition-colors">
            <div className="h-full px-4 md:px-6 max-w-[1400px] mx-auto w-full flex items-center justify-between">
                {/* Mobile Menu Button */}
                <button
                    onClick={toggleMobile}
                    className="mr-3 md:hidden p-2 -ml-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 rounded-lg transition-colors"
                    aria-label="Toggle menu"
                >
                    <Menu className="w-5 h-5" />
                </button>

                {/* Search Bar */}
                <div className="flex items-center gap-4 flex-1 max-w-xl">
                    <div className="relative w-full max-w-md group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Search className="text-neutral-400 group-focus-within:text-blue-500 transition-colors w-4 h-4" strokeWidth={2} />
                        </div>
                        <input
                            className="block w-full pl-10 pr-20 py-2.5 border border-neutral-200 dark:border-neutral-600 rounded-full leading-5 bg-neutral-50 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:text-sm transition-all"
                            placeholder="Search documents, customers..."
                            type="text"
                        />
                        <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-neutral-200/60 dark:bg-neutral-600 text-neutral-400 dark:text-neutral-300 text-xs font-medium">
                                <Command className="w-3 h-3" />
                                <span>K</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2">
                    {/* Theme Toggle */}
                    <ThemeToggleSimple />

                    <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />

                    <div className="h-8 w-px bg-neutral-100 dark:bg-neutral-700 mx-2 hidden sm:block"></div>

                    {/* User Menu */}
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={toggleUserMenu}
                            className="flex items-center gap-3 pl-2 pr-2 py-1.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-all duration-200 cursor-pointer group"
                        >
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-semibold text-[#2d3748] dark:text-neutral-100 leading-none">
                                    {displayName}
                                </p>
                                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5 max-w-[150px] truncate">
                                    {email}
                                </p>
                            </div>
                            
                            <div className="relative">
                                {photoURL ? (
                                    <img
                                        src={photoURL}
                                        alt={displayName}
                                        className="w-9 h-9 rounded-full object-cover shadow-sm border border-neutral-100 dark:border-neutral-750"
                                    />
                                ) : (
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center overflow-hidden shadow-sm">
                                        <span className="text-white text-sm font-medium">{initials}</span>
                                    </div>
                                )}
                                {pendingCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-neutral-800"></span>
                                )}
                            </div>
                            
                            <ChevronDown
                                className={`text-neutral-400 w-4 h-4 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`}
                                strokeWidth={2}
                            />
                        </button>

                        {/* Dropdown Menu */}
                        {isUserMenuOpen && (
                            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-neutral-800 rounded-2xl shadow-xl border border-neutral-100 dark:border-neutral-700 py-2 z-50 overflow-hidden">
                                {activeTab === 'main' ? (
                                    <>
                                        {/* User Info */}
                                        <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-700">
                                            <p className="text-sm font-semibold text-[#2d3748] dark:text-white">
                                                {displayName}
                                            </p>
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                                                {email}
                                            </p>
                                        </div>

                                        {/* Menu Items */}
                                        <div className="py-1.5">
                                            <Link
                                                href="/settings"
                                                onClick={() => setIsUserMenuOpen(false)}
                                                className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
                                            >
                                                <Settings className="w-4 h-4 text-neutral-400" />
                                                Settings
                                            </Link>
                                            
                                            <button
                                                onClick={() => setActiveTab('notifications')}
                                                className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Bell className="w-4 h-4 text-neutral-400" />
                                                    <span>Notifications</span>
                                                </div>
                                                {pendingCount > 0 && (
                                                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                                                        {pendingCount}
                                                    </span>
                                                )}
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setIsUserMenuOpen(false);
                                                    setIsFeedbackOpen(true);
                                                }}
                                                className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors w-full text-left"
                                            >
                                                <MessageSquare className="w-4 h-4 text-neutral-400" />
                                                Send Feedback
                                            </button>
                                        </div>

                                        {/* Logout */}
                                        <div className="border-t border-neutral-100 dark:border-neutral-700 pt-1.5">
                                            <button
                                                onClick={handleLogout}
                                                className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors w-full text-left"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                Sign out
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* Notifications / Tasks view */}
                                        <div className="flex items-center justify-between px-3 py-2.5 border-b border-neutral-100 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/50">
                                            <button
                                                onClick={() => setActiveTab('main')}
                                                className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                                Back
                                            </button>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs font-bold text-[#2d3748] dark:text-white">Notifications</span>
                                                {pendingCount > 0 && (
                                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                                                        {pendingCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="max-h-[300px] overflow-y-auto p-2">
                                            {tasks.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center text-center py-6 px-4">
                                                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full mb-2">
                                                        <Check className="w-4 h-4" strokeWidth={2.5} />
                                                    </div>
                                                    <p className="text-xs font-bold text-[#2d3748] dark:text-white">All caught up!</p>
                                                    <p className="text-[10px] text-neutral-400 mt-0.5">No pending actions.</p>
                                                </div>
                                            ) : (
                                                <ul className="flex flex-col gap-0.5">
                                                    {tasks.map((task) => (
                                                        <li
                                                            key={task.id}
                                                            onClick={() => {
                                                                const note = notifications.find(n => n.id === task.id);
                                                                if (note) {
                                                                    if (note.ctaLink) window.open(note.ctaLink, '_blank');
                                                                } else {
                                                                    router.push(`/${task.type}s/${task.documentId}`);
                                                                    setIsUserMenuOpen(false);
                                                                    setActiveTab('main');
                                                                }
                                                            }}
                                                            className="group flex items-start gap-2.5 p-2 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-all cursor-pointer"
                                                        >
                                                            <div className="mt-0.5 relative flex items-center justify-center">
                                                                {notifications.some(n => n.id === task.id) ? (
                                                                    (() => {
                                                                        const note = notifications.find(n => n.id === task.id);
                                                                        const noteType = (note?.type || 'announcement') as 'announcement' | 'promotion' | 'greeting' | 'warning';
                                                                        const Icon = typeConfig[noteType].icon;
                                                                        const colorClass = typeConfig[noteType].color;
                                                                        return <Icon className={`w-3.5 h-3.5 ${colorClass}`} />;
                                                                    })()
                                                                ) : (
                                                                    <div className={`w-1.5 h-1.5 rounded-full ${priorityConfig[task.priority as 'urgent' | 'normal' | 'low']?.dotClass || ''}`}></div>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-semibold text-[#2d3748] dark:text-white group-hover:text-neutral-700 dark:group-hover:text-neutral-200 transition-colors line-clamp-1">
                                                                    {task.title}
                                                                </p>
                                                                <div className="flex items-center gap-1 mt-0.5">
                                                                    <p className={`text-[10px] ${priorityConfig[task.priority as 'urgent' | 'normal' | 'low']?.textClass || ''}`}>
                                                                        {task.category}
                                                                    </p>
                                                                    {notifications.find(n => n.id === task.id)?.message && (
                                                                        <span className="text-[10px] text-neutral-400 truncate max-w-[120px]">
                                                                            - {notifications.find(n => n.id === task.id)?.message}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <ArrowRight className="w-3.5 h-3.5 text-neutral-300 group-hover:text-neutral-500 dark:text-neutral-600 dark:group-hover:text-neutral-400 transition-colors opacity-0 group-hover:opacity-100" />
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>

                                        {/* Footer */}
                                        <div className="p-2.5 bg-neutral-50 dark:bg-neutral-900/30 border-t border-neutral-100 dark:border-neutral-700">
                                            <div className="flex items-start gap-2 px-1">
                                                <Sparkles className="w-3 h-3 text-blue-500 mt-0.5" />
                                                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                                    Use <kbd className="font-mono bg-white dark:bg-neutral-700 px-1 py-0.5 rounded border border-neutral-200 dark:border-neutral-600 text-[9px]">⌘K</kbd> to search everything.
                                                </p>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
