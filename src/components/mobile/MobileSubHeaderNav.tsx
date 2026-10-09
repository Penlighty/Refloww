"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Invoice,
    Receipt,
    Delivery,
    Template,
    Customers,
    Products,
    Storefront,
    Discount,
    Ledger
} from '@/components/icons';

export default function MobileSubHeaderNav() {
    const pathname = usePathname();

    // Hide on creation or edit routes
    const isCreation = /\/(new|edit)(\/|$)/.test(pathname);
    if (isCreation) {
        return null;
    }

    // Documents Section Tabs
    const isDocSection = pathname.startsWith('/invoices') || pathname.startsWith('/receipts') || pathname.startsWith('/delivery-notes') || pathname.startsWith('/templates');

    // Management Section Tabs
    const isMgmtSection = pathname.startsWith('/customers') || pathname.startsWith('/products') || pathname.startsWith('/storefront') || pathname.startsWith('/discounts') || pathname.startsWith('/ledger');

    if (!isDocSection && !isMgmtSection) {
        return null;
    }

    if (isDocSection) {
        const docTabs = [
            { href: '/invoices', label: 'Invoices', icon: Invoice, active: pathname.startsWith('/invoices') },
            { href: '/receipts', label: 'Receipts', icon: Receipt, active: pathname.startsWith('/receipts') },
            { href: '/delivery-notes', label: 'Delivery Notes', icon: Delivery, active: pathname.startsWith('/delivery-notes') },
            { href: '/templates', label: 'Templates', icon: Template, active: pathname.startsWith('/templates') },
        ];

        return (
            <div className="w-full h-[var(--subnav-h)] overflow-x-auto no-scrollbar bg-paper border-b border-line px-5 flex items-center">
                <div className="flex items-center gap-1.5 min-w-max">
                    {docTabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                aria-current={tab.active ? 'page' : undefined}
                                data-active={tab.active ? 'true' : undefined}
                                className={`h-9 px-3 text-caption font-medium flex items-center gap-1.5 rounded-ctl transition-colors ${
                                    tab.active
                                        ? 'bg-paper-2 text-ink border border-primary-500 font-semibold'
                                        : 'text-ink-3 hover:text-ink hover:bg-paper-2/60'
                                }`}
                            >
                                <Icon className="size-4 shrink-0" weight={tab.active ? 'bold' : 'regular'} />
                                <span>{tab.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        );
    }

    if (isMgmtSection) {
        const mgmtTabs = [
            { href: '/customers', label: 'Customers', icon: Customers, active: pathname.startsWith('/customers') },
            { href: '/products', label: 'Products', icon: Products, active: pathname.startsWith('/products') },
            { href: '/storefront', label: 'Storefront', icon: Storefront, active: pathname.startsWith('/storefront') },
            { href: '/discounts', label: 'Discounts', icon: Discount, active: pathname.startsWith('/discounts') },
            { href: '/ledger', label: 'Ledger', icon: Ledger, active: pathname.startsWith('/ledger') },
        ];

        return (
            <div className="w-full h-[var(--subnav-h)] overflow-x-auto no-scrollbar bg-paper border-b border-line px-5 flex items-center">
                <div className="flex items-center gap-1.5 min-w-max">
                    {mgmtTabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                aria-current={tab.active ? 'page' : undefined}
                                data-active={tab.active ? 'true' : undefined}
                                className={`h-9 px-3 text-caption font-medium flex items-center gap-1.5 rounded-ctl transition-colors ${
                                    tab.active
                                        ? 'bg-paper-2 text-ink border border-primary-500 font-semibold'
                                        : 'text-ink-3 hover:text-ink hover:bg-paper-2/60'
                                }`}
                            >
                                <Icon className="size-4 shrink-0" weight={tab.active ? 'bold' : 'regular'} />
                                <span>{tab.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        );
    }

    return null;
}
