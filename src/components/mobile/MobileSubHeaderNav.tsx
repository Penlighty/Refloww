"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    FileText,
    Receipt,
    Truck,
    FolderOpen,
    Users,
    Package,
    ShoppingBag,
    Percent,
    BookOpen
} from 'lucide-react';

export default function MobileSubHeaderNav() {
    const pathname = usePathname();

    // Documents Section Tabs
    const isDocSection = pathname.startsWith('/invoices') || pathname.startsWith('/receipts') || pathname.startsWith('/delivery-notes') || pathname.startsWith('/templates');

    // Management Section Tabs
    const isMgmtSection = pathname.startsWith('/customers') || pathname.startsWith('/products') || pathname.startsWith('/storefront') || pathname.startsWith('/discounts') || pathname.startsWith('/ledger');

    if (!isDocSection && !isMgmtSection) {
        return null;
    }

    if (isDocSection) {
        const docTabs = [
            { href: '/invoices', label: 'Invoices', icon: FileText, active: pathname.startsWith('/invoices') },
            { href: '/receipts', label: 'Receipts', icon: Receipt, active: pathname.startsWith('/receipts') },
            { href: '/delivery-notes', label: 'Delivery Notes', icon: Truck, active: pathname.startsWith('/delivery-notes') },
            { href: '/templates', label: 'Templates', icon: FolderOpen, active: pathname.startsWith('/templates') },
        ];

        return (
            <div className="w-full overflow-x-auto no-scrollbar py-2 bg-white/95 dark:bg-[#121620]/95 backdrop-blur-md border-b border-[#e7e9e8] dark:border-neutral-800/80 px-3.5 shadow-xs">
                <div className="flex items-center gap-1.5 min-w-max">
                    {docTabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                title={tab.label}
                                aria-label={tab.label}
                                className={`py-1.5 text-xs font-bold transition-all flex items-center gap-1.5 rounded-xl ${
                                    tab.active
                                        ? 'bg-[#fc6d2d] text-white shadow-xs px-3'
                                        : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200/80 dark:border-neutral-700 hover:bg-neutral-50 px-2.5'
                                }`}
                            >
                                <Icon className="w-4 h-4 shrink-0" />
                                {tab.active && <span>{tab.label}</span>}
                            </Link>
                        );
                    })}
                </div>
            </div>
        );
    }

    if (isMgmtSection) {
        const mgmtTabs = [
            { href: '/customers', label: 'Customers', icon: Users, active: pathname.startsWith('/customers') },
            { href: '/products', label: 'Products', icon: Package, active: pathname.startsWith('/products') },
            { href: '/storefront', label: 'Storefront', icon: ShoppingBag, active: pathname.startsWith('/storefront') },
            { href: '/discounts', label: 'Discounts', icon: Percent, active: pathname.startsWith('/discounts') },
            { href: '/ledger', label: 'Ledger', icon: BookOpen, active: pathname.startsWith('/ledger') },
        ];

        return (
            <div className="w-full overflow-x-auto no-scrollbar py-2 bg-white/95 dark:bg-[#121620]/95 backdrop-blur-md border-b border-[#e7e9e8] dark:border-neutral-800/80 px-3.5 shadow-xs">
                <div className="flex items-center gap-1.5 min-w-max">
                    {mgmtTabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                title={tab.label}
                                aria-label={tab.label}
                                className={`py-1.5 text-xs font-bold transition-all flex items-center gap-1.5 rounded-xl ${
                                    tab.active
                                        ? 'bg-[#fc6d2d] text-white shadow-xs px-3'
                                        : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200/80 dark:border-neutral-700 hover:bg-neutral-50 px-2.5'
                                }`}
                            >
                                <Icon className="w-4 h-4 shrink-0" />
                                {tab.active && <span>{tab.label}</span>}
                            </Link>
                        );
                    })}
                </div>
            </div>
        );
    }

    return null;
}
