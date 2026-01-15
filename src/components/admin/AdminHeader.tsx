
"use client";

import { Bell, Search } from 'lucide-react';
import { ThemeToggleSimple } from '../ThemeToggle';

export function AdminHeader() {
    return (
        <header className="h-16 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 sticky top-0 z-10 transition-colors">
            <div className="h-full px-6 w-full flex items-center justify-between">
                {/* Search (Global Admin Search Mock) */}
                <div className="w-96 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                        type="text"
                        placeholder="Search users, templates, or logs..."
                        className="w-full pl-10 pr-4 py-2 text-sm bg-neutral-50 dark:bg-neutral-900 border-none rounded-lg focus:ring-2 focus:ring-blue-500/20 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none transition-all"
                    />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <ThemeToggleSimple />
                    <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-700 mx-1"></div>
                    <button className="relative p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-neutral-800"></span>
                    </button>
                </div>
            </div>
        </header>
    );
}
