
"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
    LayoutDashboard,
    Users,
    MessageSquare,
    ShoppingBag,
    Bell,
    Settings,
    LogOut,
    ExternalLink,
    Building2,
    Shield,
    ActivitySquare
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { checkAdminAccess } from '@/lib/firebase/admin';
import { AdminRole, getRoleDisplayName } from '@/lib/firebase/adminPermissions';

const NAV_ITEMS = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
    { label: 'Users', icon: Users, href: '/admin/users' },
    { label: 'Organizations', icon: Building2, href: '/admin/organizations' },
    { label: 'Marketplace', icon: ShoppingBag, href: '/admin/marketplace' },
    { label: 'Feedback', icon: MessageSquare, href: '/admin/feedback' },
    { label: 'Alerts', icon: Bell, href: '/admin/notifications' },
];

const SYSTEM_ITEMS = [
    { label: 'Audit Logs', icon: Shield, href: '/admin/audit-logs' },
    { label: 'Settings', icon: Settings, href: '/admin/settings' },
];

export function AdminSidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const [adminRole, setAdminRole] = useState<AdminRole>('user');

    useEffect(() => {
        if (user) {
            checkAdminAccess(user.uid).then(res => {
                setAdminRole(res.role as AdminRole);
            });
        }
    }, [user]);

    return (
        <aside className="w-64 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 flex flex-col border-r border-slate-200 dark:border-slate-800 z-50 flex-shrink-0 transition-colors">
            {/* Logo */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                <Link href="/admin" className="flex items-center gap-3.5 group">
                    <img
                        src="/logo/refloww-full-orange.svg"
                        alt="Refloww Admin"
                        className="h-8 w-auto max-w-[130px] object-contain transition-transform group-hover:scale-105"
                    />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-[#fc6d2d] border border-[#fc6d2d]/30">
                        Admin
                    </span>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
                <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Platform
                </div>
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`
                                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                                ${isActive
                                    ? 'bg-blue-600 text-white'
                                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                                }
                            `}
                        >
                            <item.icon className="w-5 h-5" />
                            {item.label}
                        </Link>
                    );
                })}

                <div className="mt-8 px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    System
                </div>
                {SYSTEM_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`
                                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                                ${isActive
                                    ? 'bg-blue-600 text-white'
                                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                                }
                            `}
                        >
                            <item.icon className="w-5 h-5" />
                            {item.label}
                        </Link>
                    );
                })}
                
                <div className="mt-2">
                    <Link
                        href="/"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-emerald-600 dark:text-emerald-400"
                    >
                        <ExternalLink className="w-5 h-5" />
                        Open Live App
                    </Link>
                </div>
            </nav>

            {/* User Profile / Logout */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3 px-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-white overflow-hidden flex-shrink-0">
                        {user?.photoURL ? (
                            <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                        ) : (
                            (user?.displayName || user?.email || 'A').charAt(0).toUpperCase()
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                            {user?.displayName || 'Administrator'}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                                {getRoleDisplayName(adminRole)}
                            </span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => logout()}
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-xs font-medium text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-colors"
                >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                </button>
            </div>
        </aside>
    );
}
