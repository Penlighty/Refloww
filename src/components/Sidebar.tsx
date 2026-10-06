"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useSidebarStore } from '@/lib/sidebar-store';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useSettingsStore } from '@/lib/store';
import {
    Dashboard,
    Transactions,
    Register,
    Documents,
    Invoice,
    Receipt,
    Delivery,
    Template,
    Marketplace,
    Briefcase,
    Customers,
    Products,
    Storefront,
    Discount,
    Ledger,
    Settings,
    Help,
    LogOut,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Shield,
} from '@/components/icons';

export default function Sidebar() {
    const pathname = usePathname();
    const { isCollapsed, setCollapsed, toggleCollapsed, isMobileOpen, setMobileOpen } = useSidebarStore();
    const { profile, logout } = useAuth();
    const [mounted, setMounted] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        'Documents': true,
        'Management': false
    });
    const sidebarRef = useRef<HTMLElement>(null);

    const isEditorPage = pathname?.includes('/edit') && pathname?.includes('/templates/');

    useEffect(() => {
        setMounted(true);
        const saved = localStorage.getItem('sidebar-collapsed');
        if (saved !== null) {
            setCollapsed(saved === 'true');
        } else if (isEditorPage) {
            setCollapsed(true);
        }
    }, [isEditorPage, setCollapsed]);

    useEffect(() => {
        setMobileOpen(false);
    }, [pathname, setMobileOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isEditorPage && window.innerWidth >= 768) {
                if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node) && !isCollapsed) {
                    setCollapsed(true);
                }
            }
            if (isMobileOpen && window.innerWidth < 768) {
                if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
                    setMobileOpen(false);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isEditorPage, isCollapsed, setCollapsed, isMobileOpen, setMobileOpen]);

    const handleToggle = () => {
        const newState = !isCollapsed;
        toggleCollapsed();
        if (!isEditorPage) {
            localStorage.setItem('sidebar-collapsed', String(newState));
        }
        if (newState) {
            setExpandedSections({});
        }
    };

    const toggleSection = (label: string) => {
        if (isCollapsed && !isMobileOpen) {
            setCollapsed(false);
            setExpandedSections({ [label]: true });
            return;
        }
        setExpandedSections(prev => ({
            ...prev,
            [label]: !prev[label]
        }));
    };

    const isActive = (path: string) => {
        if (path === '/' && pathname === '/') return true;
        if (path !== '/' && pathname?.startsWith(path)) return true;
        return false;
    };

    const staffRole = useSettingsStore(state => state.staffRole);

    const navigation = [
        { path: '/', label: 'Dashboard', icon: Dashboard },
        { path: '/transactions', label: 'Transactions', icon: Transactions },
        { path: '/pos', label: 'POS Register', icon: Register },
        {
            label: 'Documents',
            icon: Documents,
            children: [
                { path: '/invoices', label: 'Invoices', icon: Invoice },
                { path: '/receipts', label: 'Receipts', icon: Receipt },
                { path: '/delivery-notes', label: 'Delivery Notes', icon: Delivery },
            ]
        },
        { path: '/templates', label: 'Templates', icon: Template },
        { path: '/marketplace', label: 'Marketplace', icon: Marketplace },
        {
            label: 'Management',
            icon: Briefcase,
            children: [
                { path: '/customers', label: 'Customers', icon: Customers },
                { path: '/products', label: 'Products', icon: Products },
                { path: '/storefront', label: 'Storefront', icon: Storefront },
                { path: '/discounts', label: 'Discounts', icon: Discount },
                ...(staffRole !== 'cashier' ? [{ path: '/ledger', label: 'Ledger', icon: Ledger }] : []),
            ]
        },

        ...(profile?.role === 'admin' || profile?.isAdmin === true ? [{ path: '/admin', label: 'Admin Panel', icon: Shield }] : []),
    ];

    const bottomNavItems = [
        { path: '/settings', label: 'Settings', icon: Settings },
        { path: '/help', label: 'Help Center', icon: Help },
    ];

    if (!mounted) {
        return <aside className="hidden md:flex w-[232px] bg-paper border-r border-line flex-shrink-0" />;
    }

    return (
        <>
            {/* Mobile Backdrop */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 z-[90] bg-scrim md:hidden transition-opacity"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            <aside
                ref={sidebarRef}
                className={`
                    fixed md:relative inset-y-0 left-0 z-[100] md:z-20
                    ${isMobileOpen ? 'translate-x-0 shadow-sheet' : '-translate-x-full md:translate-x-0 md:shadow-none'}
                    ${isCollapsed ? 'md:w-[64px]' : 'md:w-[232px]'} 
                    w-[232px] 
                    bg-paper border-r border-line 
                    flex flex-col flex-shrink-0 
                    transition-[width,transform] duration-320 ease-sheet
                `}
            >
                {/* Logo Section */}
                <div className={`h-[56px] flex items-center ${isCollapsed ? 'md:justify-center px-3' : 'px-4'} justify-start border-b border-line`}>
                    <Link href="/" className="flex items-center group">
                        <div className={`${isCollapsed ? 'hidden md:flex' : 'hidden'} size-8 items-center justify-center flex-shrink-0`}>
                            <img
                                src="/logo/refloww-icon-orange.svg"
                                alt="Refloww"
                                className="size-7 object-contain"
                            />
                        </div>

                        <div className={`${isCollapsed ? 'block md:hidden' : 'block'} h-8 flex items-center`}>
                            <img
                                src="/logo/refloww-full-orange.svg"
                                alt="Refloww Logo"
                                className="h-7 w-auto max-w-[130px] object-contain"
                            />
                        </div>
                    </Link>
                </div>

                {/* Navigation Links */}
                <nav className={`flex-1 ${isCollapsed ? 'md:px-2' : 'px-3'} px-3 py-3 flex flex-col gap-1 overflow-y-auto overflow-x-hidden`}>
                    {navigation.map((item) => {
                        if (item.children) {
                            const isExpanded = expandedSections[item.label];
                            const isChildActive = item.children.some(child => isActive(child.path));
                            const Icon = item.icon;

                            return (
                                <div key={item.label} className="flex flex-col gap-0.5">
                                    <button
                                        onClick={() => toggleSection(item.label)}
                                        className={`flex items-center gap-3 ${isCollapsed ? 'md:justify-center md:px-2' : 'px-2.5'} h-9 rounded-ctl transition-colors group ${isChildActive && !isExpanded
                                            ? 'bg-paper-2 text-ink font-medium'
                                            : 'text-ink-3 hover:bg-paper-2 hover:text-ink'
                                            }`}
                                    >
                                        <Icon className="size-5 shrink-0 text-ink-3 group-hover:text-ink" />
                                        <span className={`text-micro font-medium uppercase tracking-[0.06em] flex-1 text-left ${isCollapsed ? 'md:hidden' : 'block'} text-ink-3`}>
                                            {item.label}
                                        </span>
                                        {!isCollapsed && (
                                            <ChevronDown className={`size-3.5 transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`} />
                                        )}
                                    </button>

                                    {(!isCollapsed || isMobileOpen) && isExpanded && (
                                        <div className="flex flex-col gap-0.5 ml-3 pl-3 border-l border-line mt-0.5">
                                            {item.children.map((child) => {
                                                const ChildIcon = child.icon;
                                                const active = isActive(child.path);
                                                return (
                                                    <Link
                                                        key={child.path}
                                                        href={child.path}
                                                        data-active={active ? "true" : undefined}
                                                        aria-current={active ? "page" : undefined}
                                                        className={`relative flex items-center gap-3 px-2.5 h-9 rounded-ctl transition-colors group ${active
                                                            ? 'bg-paper-2 text-ink font-medium'
                                                            : 'text-ink-2 hover:bg-paper-2 hover:text-ink'
                                                            }`}
                                                        onClick={() => isMobileOpen && setMobileOpen(false)}
                                                    >
                                                        {active && (
                                                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.75 h-4 bg-primary-500 rounded-full" />
                                                        )}
                                                        <ChildIcon className="size-5 shrink-0" weight={active ? "bold" : "regular"} />
                                                        <span className={`text-body ${active ? 'font-semibold' : 'font-normal'}`}>
                                                            {child.label}
                                                        </span>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        const Icon = item.icon;
                        const active = isActive(item.path || '');
                        return (
                            <Link
                                key={item.path}
                                href={item.path || '/'}
                                title={isCollapsed ? item.label : undefined}
                                data-active={active ? "true" : undefined}
                                aria-current={active ? "page" : undefined}
                                className={`relative flex items-center gap-3 ${isCollapsed ? 'md:justify-center md:px-2' : 'px-2.5'} h-9 rounded-ctl transition-colors group ${active
                                    ? 'bg-paper-2 text-ink font-medium'
                                    : 'text-ink-2 hover:bg-paper-2 hover:text-ink'
                                    }`}
                                onClick={() => isMobileOpen && setMobileOpen(false)}
                            >
                                {active && (
                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.75 h-4 bg-primary-500 rounded-full" />
                                )}
                                <Icon className="size-5 shrink-0" weight={active ? "bold" : "regular"} />
                                <span className={`text-body ${isCollapsed ? 'md:hidden' : 'block'} ${active ? 'font-semibold' : 'font-normal'}`}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom Navigation */}
                <div className={`${isCollapsed ? 'md:px-2' : 'px-3'} px-3 pb-3 border-t border-line pt-3 flex flex-col gap-0.5`}>
                    {bottomNavItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.path);
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                title={isCollapsed ? item.label : undefined}
                                data-active={active ? "true" : undefined}
                                aria-current={active ? "page" : undefined}
                                className={`relative flex items-center gap-3 ${isCollapsed ? 'md:justify-center md:px-2' : 'px-2.5'} h-9 rounded-ctl transition-colors group ${active
                                    ? 'bg-paper-2 text-ink font-medium'
                                    : 'text-ink-2 hover:bg-paper-2 hover:text-ink'
                                    }`}
                                onClick={() => isMobileOpen && setMobileOpen(false)}
                            >
                                {active && (
                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.75 h-4 bg-primary-500 rounded-full" />
                                )}
                                <Icon className="size-5 shrink-0" weight={active ? "bold" : "regular"} />
                                <span className={`text-body ${isCollapsed ? 'md:hidden' : 'block'} ${active ? 'font-semibold' : 'font-normal'}`}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}

                    {/* Logout */}
                    <button
                        type="button"
                        onClick={async () => {
                            try {
                                await logout();
                            } catch (e) {
                                console.error('Logout error:', e);
                                if (typeof window !== 'undefined') {
                                    window.location.href = '/login';
                                }
                            }
                        }}
                        title={isCollapsed ? 'Log out' : undefined}
                        className={`w-full flex items-center gap-3 ${isCollapsed ? 'md:justify-center md:px-2' : 'px-2.5'} h-9 rounded-ctl transition-colors text-ink-3 hover:bg-paper-2 hover:text-ink cursor-pointer`}
                    >
                        <LogOut className="size-5 shrink-0 text-ink-3 group-hover:text-ink" />
                        <span className={`text-body font-normal ${isCollapsed ? 'md:hidden' : 'block'}`}>Log out</span>
                    </button>
                </div>

                {/* Collapse Toggle - Desktop Only */}
                <button
                    onClick={handleToggle}
                    aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    className="hidden md:flex absolute top-16 -right-3 size-6 bg-paper border border-line-strong rounded-full items-center justify-center text-ink-3 hover:text-ink hover:border-ink transition-colors shadow-pop z-30"
                >
                    {isCollapsed ? (
                        <ChevronRight className="size-3.5" />
                    ) : (
                        <ChevronLeft className="size-3.5" />
                    )}
                </button>
            </aside>
        </>
    );
}
