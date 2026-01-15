"use client";

import { useState, useRef, useEffect } from 'react';
import { Search, User, ChevronDown, Command, Menu, LogOut, Settings, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggleSimple } from './ThemeToggle';
import TasksDropdown from './TasksDropdown';
import { useSidebarStore } from '@/lib/sidebar-store';
import { useAuth } from '@/lib/contexts/AuthContext';
import FeedbackModal from './FeedbackModal';

export default function Header() {
    const { toggleMobile } = useSidebarStore();
    const { user, profile, logout } = useAuth();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false);
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

    // Get display name and initials
    const displayName = profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'User';
    const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const email = user?.email || '';

    return (
        <header className="h-16 bg-white dark:bg-neutral-800 border-b border-neutral-100 dark:border-neutral-700 sticky top-0 z-10 transition-colors">
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

                    {/* Feedback Button */}
                    <button
                        onClick={() => setIsFeedbackOpen(true)}
                        className="p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 rounded-lg transition-colors"
                        title="Send Feedback"
                    >
                        <MessageSquare className="w-5 h-5" />
                    </button>

                    <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />

                    {/* Notifications / Tasks */}
                    <TasksDropdown />

                    <div className="h-8 w-px bg-neutral-200 dark:bg-neutral-700 mx-2"></div>

                    {/* User Menu */}
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
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
                            {user?.photoURL ? (
                                <img
                                    src={user.photoURL}
                                    alt={displayName}
                                    className="w-9 h-9 rounded-full object-cover shadow-sm"
                                />
                            ) : (
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center overflow-hidden shadow-sm">
                                    <span className="text-white text-sm font-medium">{initials}</span>
                                </div>
                            )}
                            <ChevronDown
                                className={`text-neutral-400 w-4 h-4 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`}
                                strokeWidth={2}
                            />
                        </button>

                        {/* Dropdown Menu */}
                        {isUserMenuOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-100 dark:border-neutral-700 py-2 z-50">
                                {/* User Info */}
                                <div className="px-4 py-2 border-b border-neutral-100 dark:border-neutral-700">
                                    <p className="text-sm font-medium text-[#2d3748] dark:text-white">
                                        {displayName}
                                    </p>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                                        {email}
                                    </p>
                                </div>

                                {/* Menu Items */}
                                <div className="py-2">
                                    <Link
                                        href="/settings"
                                        onClick={() => setIsUserMenuOpen(false)}
                                        className="flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                                    >
                                        <Settings className="w-4 h-4" />
                                        Settings
                                    </Link>
                                </div>

                                {/* Logout */}
                                <div className="border-t border-neutral-100 dark:border-neutral-700 pt-2">
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Sign out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
