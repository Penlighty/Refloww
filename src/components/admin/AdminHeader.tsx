
"use client";

import { Bell, Search } from '@/components/icons';
import { ThemeToggleSimple } from '../ThemeToggle';

export function AdminHeader() {
    return (
        <header className="h-16 bg-paper border-b border-line sticky top-0 z-10">
            <div className="h-full px-6 w-full flex items-center justify-between">
                {/* Search (Global Admin Search Mock) */}
                <div className="w-96 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink-muted" />
                    <input
                        type="text"
                        placeholder="Search users, templates, or logs..."
                        className="w-full pl-10 pr-4 py-2 text-sm bg-paper-2 border border-line rounded-ctl focus:outline-none focus:border-ink text-ink placeholder:text-ink-muted"
                    />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <ThemeToggleSimple />
                    <div className="h-6 w-px bg-line mx-1"></div>
                    <button className="relative p-2 text-ink-muted hover:text-ink transition-colors rounded-ctl hover:bg-paper-2">
                        <Bell className="size-5" />
                        <span className="absolute top-1.5 right-1.5 size-2 bg-status-overdue rounded-full"></span>
                    </button>
                </div>
            </div>
        </header>
    );
}
