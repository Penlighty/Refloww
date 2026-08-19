"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useSidebarStore } from '@/lib/sidebar-store';
import { useAuth } from '@/lib/contexts/AuthContext';
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
    ChevronDown,
    Sparkles,
    Percent,
    Store,
    ShoppingBag,
    LayoutGrid,
    Briefcase,
    Shield
} from 'lucide-react';

export default function Sidebar() {
    const pathname = usePathname();
    const { isCollapsed, setCollapsed, toggleCollapsed, isMobileOpen, setMobileOpen, toggleMobile } = useSidebarStore();
    const { profile } = useAuth();
    const [mounted, setMounted] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        'Documents': true,
        'Management': false
    });
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
        // When collapsing sidebar, we might want to collapse all sections too
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

    const navigation = [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard },
        {
            label: 'Documents',
            icon: FileText,
            children: [
                { path: '/invoices', label: 'Invoices', icon: FileText },
                { path: '/receipts', label: 'Receipts', icon: Receipt },
                { path: '/delivery-notes', label: 'Delivery Notes', icon: Truck },
            ]
        },
        { path: '/templates', label: 'Templates', icon: FolderOpen },
        { path: '/marketplace', label: 'Marketplace', icon: Store },
        {
            label: 'Management',
            icon: Briefcase,
            children: [
                { path: '/customers', label: 'Customers', icon: Users },
                { path: '/products', label: 'Products', icon: Package },
                { path: '/storefront', label: 'Storefront', icon: ShoppingBag },
                { path: '/discounts', label: 'Discounts', icon: Percent },
                { path: '/ledger', label: 'Ledger', icon: BookOpen },
            ]
        },

        ...(profile?.role === 'admin' || profile?.isAdmin === true ? [{ path: '/admin', label: 'Admin Panel', icon: Shield }] : []),
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
                    {navigation.map((item) => {
                        if (item.children) {
                            const isExpanded = expandedSections[item.label];
                            const isChildActive = item.children.some(child => isActive(child.path));
                            const Icon = item.icon;

                            return (
                                <div key={item.label} className="flex flex-col gap-1">
                                    <button
                                        onClick={() => toggleSection(item.label)}
                                        className={`flex items-center gap-3 ${isCollapsed ? 'md:justify-center md:px-2' : 'px-3'} py-2.5 rounded-xl transition-all duration-200 group ${isChildActive && !isExpanded
                                            ? 'bg-neutral-100/50 dark:bg-neutral-700/50 text-[#2d3748] dark:text-white'
                                            : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 hover:text-[#2d3748] dark:hover:text-white'
                                            }`}
                                    >
                                        <Icon className={`w-5 h-5 flex-shrink-0 ${isChildActive ? 'text-[#2d3748] dark:text-white' : 'text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-600 dark:group-hover:text-neutral-300'}`} strokeWidth={1.75} />
                                        <span className={`text-sm text-nowrap flex-1 text-left ${isCollapsed ? 'md:hidden' : 'block'} ${isChildActive ? 'font-semibold' : 'font-medium'}`}>
                                            {item.label}
                                        </span>
                                        {!isCollapsed && (
                                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                        )}
                                    </button>

                                    {(!isCollapsed || isMobileOpen) && isExpanded && (
                                        <div className="flex flex-col gap-1 ml-4 pl-4 border-l border-neutral-100 dark:border-neutral-700 mt-1">
                                            {item.children.map((child) => {
                                                const ChildIcon = child.icon;
                                                const active = isActive(child.path);
                                                return (
                                                    <Link
                                                        key={child.path}
                                                        href={child.path}
                                                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group ${active
                                                            ? 'bg-neutral-100 dark:bg-neutral-700 text-[#2d3748] dark:text-white'
                                                            : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 hover:text-[#2d3748] dark:hover:text-white'
                                                            }`}
                                                        onClick={() => isMobileOpen && setMobileOpen(false)}
                                                    >
                                                        <ChildIcon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-[#2d3748] dark:text-white' : 'text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-600 dark:group-hover:text-neutral-300'}`} strokeWidth={1.75} />
                                                        <span className={`text-sm text-nowrap ${active ? 'font-semibold' : 'font-medium'}`}>
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

