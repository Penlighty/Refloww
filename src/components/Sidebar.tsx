"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useSidebarStore } from '@/lib/sidebar-store';
import {
    LayoutDashboard,
    FileText,
    Receipt,
    Truck,
    FolderOpen,
    Users,
    Package,
    BookOpen,
    Settings,
    HelpCircle,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Sparkles,
    Percent
} from 'lucide-react';

export default function Sidebar() {
    const pathname = usePathname();
    const { isCollapsed, setCollapsed, toggleCollapsed, isMobileOpen, setMobileOpen, toggleMobile } = useSidebarStore();
    const [mounted, setMounted] = useState(false);
    const sidebarRef = useRef<HTMLElement>(null);

    const isEditorPage = pathname?.includes('/edit') && pathname?.includes('/templates/');

    useEffect(() => {
        setMounted(true);
        // Load saved preference
        const saved = localStorage.getItem('sidebar-collapsed');
        if (saved !== null) {
            setCollapsed(saved === 'true');
        } else if (isEditorPage) {
            setCollapsed(true);
        }
    }, [isEditorPage, setCollapsed]);

    // Close mobile menu on path change
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname, setMobileOpen]);

    // Handle click outside to collapse on editor page (Desktop) or close on Mobile
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Desktop Editor Auto-Collapse
            if (isEditorPage && window.innerWidth >= 768) {
                if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node) && !isCollapsed) {
                    setCollapsed(true);
                }
            }
            // Mobile Close on Click Outside is handled by Backdrop, but safety check here
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
    };

    const isActive = (path: string) => {
        if (path === '/' && pathname === '/') return true;
        if (path !== '/' && pathname?.startsWith(path)) return true;
        return false;
    };

    const mainNavItems = [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/invoices', label: 'Invoices', icon: FileText },
        { path: '/receipts', label: 'Receipts', icon: Receipt },
        { path: '/delivery-notes', label: 'Delivery Notes', icon: Truck },
        { path: '/templates', label: 'Templates', icon: FolderOpen },
        { path: '/customers', label: 'Customers', icon: Users },
        { path: '/products', label: 'Products', icon: Package },
        { path: '/discounts', label: 'Discounts', icon: Percent },
        { path: '/ledger', label: 'Ledger', icon: BookOpen },
    ];

    const bottomNavItems = [
        { path: '/settings', label: 'Settings', icon: Settings },
        { path: '/help', label: 'Help Center', icon: HelpCircle },
    ];

    if (!mounted) {
        return <aside className="hidden md:flex w-64 bg-white dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700 flex-shrink-0 transition-colors" />;
    }

    return (
        <>
            {/* Mobile Backdrop */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm md:hidden transition-opacity"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            <aside
                ref={sidebarRef}
                className={`
                    fixed md:relative inset-y-0 left-0 z-[100] md:z-20
                    ${isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0 md:shadow-none'}
                    ${isCollapsed ? 'md:w-[72px]' : 'md:w-64'} 
                    w-64 
                    bg-white dark:bg-neutral-800 border-r border-neutral-100 dark:border-neutral-700 
                    flex flex-col flex-shrink-0 
                    transition-all duration-300 ease-in-out
                `}
            >
                {/* Logo Section */}
                <div className={`h-16 flex items-center ${isCollapsed ? 'md:justify-center px-2' : 'px-5'} justify-start border-b border-neutral-100 dark:border-neutral-700`}>
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="w-9 h-9 bg-[#2d3748] dark:bg-secondary rounded-xl flex items-center justify-center text-white dark:text-neutral-900 flex-shrink-0">
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="w-5 h-5"
                            >
                                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                <path d="M2 17l10 5 10-5" />
                                <path d="M2 12l10 5 10-5" />
                            </svg>
                        </div>
                        {/* Always show text on mobile, or check collapsed logic for desktop */}
                        <div className={`${isCollapsed ? 'md:hidden' : 'block'}`}>
                            <span className="text-lg font-bold text-[#2d3748] dark:text-white tracking-tight text-nowrap">
                                Refloww
                            </span>
                        </div>
                    </Link>
                </div>

                {/* Navigation Links */}
                <nav className={`flex-1 ${isCollapsed ? 'md:px-2' : 'px-3'} px-3 py-4 flex flex-col gap-1 overflow-y-auto overflow-x-hidden`}>
                    {mainNavItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.path);
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                title={isCollapsed ? item.label : undefined}
                                className={`flex items-center gap-3 ${isCollapsed ? 'md:justify-center md:px-2' : 'px-3'} py-2.5 rounded-xl transition-all duration-200 group ${active
                                    ? 'bg-neutral-100 dark:bg-neutral-700 text-[#2d3748] dark:text-white'
                                    : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 hover:text-[#2d3748] dark:hover:text-white'
                                    }`}
                                onClick={() => isMobileOpen && setMobileOpen(false)}
                            >
                                <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-[#2d3748] dark:text-white' : 'text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-600 dark:group-hover:text-neutral-300'}`} strokeWidth={1.75} />
                                <span className={`text-sm text-nowrap ${isCollapsed ? 'md:hidden' : 'block'} ${active ? 'font-semibold' : 'font-medium'}`}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Upgrade Card - Hidden on Mobile to save space or kept? Stick to "No feature reduction". We keep it but maybe ensure it fits. */}
                {(!isCollapsed || isMobileOpen) && (
                    <div className={`px-3 pb-3 ${isCollapsed ? 'md:hidden' : 'block'}`}>
                        <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="w-4 h-4 text-accent" />
                                <span className="text-xs font-bold text-[#2d3748] dark:text-white">Upgrade To Pro</span>
                            </div>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3 leading-relaxed">
                                Get access to additional features and content.
                            </p>
                            <button className="w-full py-2 px-4 bg-gradient-to-r from-accent to-violet-500 text-white text-sm font-medium rounded-lg hover:shadow-lg hover:shadow-accent/20 transition-all duration-300">
                                Upgrade
                            </button>
                        </div>
                    </div>
                )}

                {/* Bottom Navigation */}
                <div className={`${isCollapsed ? 'md:px-2' : 'px-3'} px-3 pb-3 border-t border-neutral-100 dark:border-neutral-700 pt-3`}>
                    {bottomNavItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.path);
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                title={isCollapsed ? item.label : undefined}
                                className={`flex items-center gap-3 ${isCollapsed ? 'md:justify-center md:px-2' : 'px-3'} py-2.5 rounded-xl transition-all duration-200 group ${active
                                    ? 'bg-neutral-100 dark:bg-neutral-700 text-[#2d3748] dark:text-white'
                                    : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 hover:text-[#2d3748] dark:hover:text-white'
                                    }`}
                                onClick={() => isMobileOpen && setMobileOpen(false)}
                            >
                                <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-[#2d3748] dark:text-white' : 'text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-600 dark:group-hover:text-neutral-300'}`} strokeWidth={1.75} />
                                <span className={`text-sm text-nowrap ${isCollapsed ? 'md:hidden' : 'block'} ${active ? 'font-semibold' : 'font-medium'}`}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}

                    {/* Logout */}
                    <button
                        title={isCollapsed ? 'Log out' : undefined}
                        className={`w-full flex items-center gap-3 ${isCollapsed ? 'md:justify-center md:px-2' : 'px-3'} py-2.5 rounded-xl transition-all duration-200 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 hover:text-[#2d3748] dark:hover:text-white group`}
                    >
                        <LogOut className="w-5 h-5 flex-shrink-0 text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-600 dark:group-hover:text-neutral-300" strokeWidth={1.75} />
                        <span className={`text-sm font-medium text-nowrap ${isCollapsed ? 'md:hidden' : 'block'}`}>Log out</span>
                    </button>
                </div>

                {/* Collapse Toggle - Desktop Only */}
                <button
                    onClick={handleToggle}
                    className="hidden md:flex absolute top-20 -right-3 w-6 h-6 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-full items-center justify-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:border-neutral-300 dark:hover:border-neutral-500 transition-colors shadow-sm z-30"
                >
                    {isCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
                    ) : (
                        <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2} />
                    )}
                </button>
            </aside>
        </>
    );
}

