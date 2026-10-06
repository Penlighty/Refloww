
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
} from '@/components/icons';
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
        <aside className="w-64 bg-paper text-ink flex flex-col border-r border-line z-50 flex-shrink-0">
            {/* Logo */}
            <div className="p-6 border-b border-line">
                <Link href="/admin" className="flex items-center gap-3.5 group">
                    <img
                        src="/logo/refloww-full-orange.svg"
                        alt="Refloww Admin"
                        className="h-8 w-auto max-w-[130px] object-contain"
                    />
                    <span className="label text-[10px] px-2 py-0.5 rounded-full bg-paper-2 text-primary-text border border-line">
                        Admin
                    </span>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
                <div className="px-3 mb-2 label text-xs uppercase text-ink-muted">
                    Platform
                </div>
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={isActive ? 'page' : undefined}
                            className={`
                                flex items-center gap-3 px-3 py-2.5 rounded-ctl text-sm font-bold transition-colors
                                ${isActive
                                    ? 'bg-primary-500 text-on-primary'
                                    : 'text-ink-muted hover:bg-paper-2 hover:text-ink'
                                }
                            `}
                        >
                            <item.icon className="size-5 shrink-0" />
                            {item.label}
                        </Link>
                    );
                })}

                <div className="mt-8 px-3 mb-2 label text-xs uppercase text-ink-muted">
                    System
                </div>
                {SYSTEM_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={isActive ? 'page' : undefined}
                            className={`
                                flex items-center gap-3 px-3 py-2.5 rounded-ctl text-sm font-bold transition-colors
                                ${isActive
                                    ? 'bg-primary-500 text-on-primary'
                                    : 'text-ink-muted hover:bg-paper-2 hover:text-ink'
                                }
                            `}
                        >
                            <item.icon className="size-5 shrink-0" />
                            {item.label}
                        </Link>
                    );
                })}
                
                <div className="mt-2">
                    <Link
                        href="/"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-ctl text-sm font-bold hover:bg-paper-2 text-primary-text transition-colors"
                    >
                        <ExternalLink className="size-5 shrink-0" />
                        Open Live App
                    </Link>
                </div>
            </nav>

            {/* User Profile / Logout */}
            <div className="p-4 border-t border-line">
                <div className="flex items-center gap-3 px-2 mb-3">
                    <div className="size-8 rounded-full bg-paper-2 flex items-center justify-center text-xs font-bold text-ink border border-line overflow-hidden flex-shrink-0">
                        {user?.photoURL ? (
                            <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                        ) : (
                            (user?.displayName || user?.email || 'A').charAt(0).toUpperCase()
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-ink truncate">
                            {user?.displayName || 'Administrator'}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-tag text-[10px] font-bold bg-paper-2 text-ink-muted border border-line">
                                {getRoleDisplayName(adminRole)}
                            </span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => logout()}
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-xs font-bold text-ink-muted hover:text-status-overdue transition-colors"
                >
                    <LogOut className="size-3.5" />
                    Sign Out
                </button>
            </div>
        </aside>
    );
}
