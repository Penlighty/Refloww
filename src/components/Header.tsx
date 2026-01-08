"use client";

import { Search, User, ChevronDown, Command, Menu } from 'lucide-react';
import { ThemeToggleSimple } from './ThemeToggle';
import TasksDropdown from './TasksDropdown';
import { useSidebarStore } from '@/lib/sidebar-store';

export default function Header() {
    const { toggleMobile } = useSidebarStore();
    return (
        <header className="h-16 bg-white dark:bg-neutral-800 border-b border-neutral-100 dark:border-neutral-700 px-4 md:px-6 flex items-center justify-between sticky top-0 z-10 transition-colors">
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

                {/* Notifications / Tasks */}
                <TasksDropdown />

                <div className="h-8 w-px bg-neutral-200 dark:bg-neutral-700 mx-2"></div>

                {/* User Menu */}
                <button className="flex items-center gap-3 pl-2 pr-2 py-1.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-all duration-200 cursor-pointer group">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-semibold text-[#2d3748] dark:text-neutral-100 leading-none">Alex Morgan</p>
                        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">Business Owner</p>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center overflow-hidden shadow-sm">
                        <User className="text-white w-5 h-5" strokeWidth={2} />
                    </div>
                    <ChevronDown className="text-neutral-400 w-4 h-4 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors" strokeWidth={2} />
                </button>
            </div>
        </header>
    );
}
