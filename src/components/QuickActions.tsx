"use client";

import Link from 'next/link';
import { FileText, Receipt, Truck, UserPlus, Package, FolderPlus } from 'lucide-react';

interface QuickActionProps {
    href: string;
    icon: React.ReactNode;
    label: string;
    variant?: 'primary' | 'secondary';
}

function QuickActionPill({ href, icon, label, variant = 'secondary' }: QuickActionProps) {
    const isPrimary = variant === 'primary';

    return (
        <Link
            href={href}
            className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-200 ${isPrimary
                ? 'bg-secondary text-neutral-900 hover:brightness-95 shadow-sm'
                : 'bg-neutral-100 dark:bg-neutral-800 text-[#2d3748] dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
        >
            <span className={`flex items-center justify-center ${isPrimary
                ? ''
                : 'w-7 h-7 bg-[#2d3748] dark:bg-secondary rounded-full text-white dark:text-neutral-900'
                }`}>
                {icon}
            </span>
            <span>{label}</span>
        </Link>
    );
}

function QuickActionTile({ href, icon, label, variant = 'secondary' }: QuickActionProps) {
    const isPrimary = variant === 'primary';

    return (
        <Link
            href={href}
            className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-200 text-center border group ${isPrimary
                ? 'bg-secondary/15 dark:bg-secondary/10 border-secondary/35 dark:border-secondary/20 text-neutral-900 dark:text-neutral-100 hover:bg-secondary/25'
                : 'bg-neutral-50/50 dark:bg-neutral-800/40 border-neutral-100/80 dark:border-neutral-700/50 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/70'
                } shadow-sm active:scale-95`}
        >
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-2 transition-transform duration-200 group-hover:scale-105 group-active:scale-95 ${isPrimary
                ? 'bg-secondary text-neutral-900'
                : 'bg-white dark:bg-neutral-800 text-[#2d3748] dark:text-neutral-200 shadow-sm'
                } [&_svg]:w-5 [&_svg]:h-5 [&_svg]:stroke-[2]`}
            >
                {icon}
            </div>
            <span className="text-xs font-semibold leading-tight line-clamp-1">
                {label}
            </span>
        </Link>
    );
}

export default function QuickActions() {
    const actions: QuickActionProps[] = [
        {
            href: '/invoices/new',
            icon: <FileText className="w-4 h-4" strokeWidth={1.75} />,
            label: 'New Invoice',
            variant: 'primary',
        },
        {
            href: '/receipts/new',
            icon: <Receipt className="w-3.5 h-3.5" strokeWidth={2} />,
            label: 'New Receipt',
        },
        {
            href: '/delivery-notes/new',
            icon: <Truck className="w-3.5 h-3.5" strokeWidth={2} />,
            label: 'Delivery Note',
        },
        {
            href: '/customers?add=true',
            icon: <UserPlus className="w-3.5 h-3.5" strokeWidth={2} />,
            label: 'Add Customer',
        },
        {
            href: '/products?add=true',
            icon: <Package className="w-3.5 h-3.5" strokeWidth={2} />,
            label: 'Add Product',
        },
        {
            href: '/templates',
            icon: <FolderPlus className="w-3.5 h-3.5" strokeWidth={2} />,
            label: 'New Template',
        },
    ];

    return (
        <section className="mt-2">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">Quick Actions</h3>
            
            {/* Mobile Grid View */}
            <div className="grid grid-cols-3 gap-3 md:hidden">
                {actions.map((action, index) => (
                    <QuickActionTile key={index} {...action} />
                ))}
            </div>

            {/* Desktop Pill View */}
            <div className="hidden md:flex items-center gap-3 flex-wrap">
                {actions.map((action, index) => (
                    <QuickActionPill key={index} {...action} />
                ))}
            </div>
        </section>
    );
}
