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
            className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-xl font-semibold text-xs transition-all duration-200 border ${isPrimary
                ? 'bg-[#fc6d2d] hover:bg-[#ea500d] text-white border-orange-600/30 shadow-xs active:scale-[0.98]'
                : 'bg-white dark:bg-[#121620] text-[#2d3748] dark:text-neutral-200 border-neutral-200/90 dark:border-neutral-800/80 hover:border-neutral-300 dark:hover:border-neutral-700'
                }`}
        >
            <span className={`flex items-center justify-center ${isPrimary
                ? 'text-white'
                : 'w-6 h-6 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-neutral-700 dark:text-neutral-300'
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
                ? 'bg-orange-500/10 dark:bg-orange-500/15 border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20'
                : 'bg-white dark:bg-[#121620] border-neutral-200/90 dark:border-neutral-800/80 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-700'
                } shadow-xs active:scale-95`}
        >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-transform duration-200 group-hover:scale-105 group-active:scale-95 ${isPrimary
                ? 'bg-[#fc6d2d] text-white shadow-xs'
                : 'bg-neutral-100 dark:bg-neutral-800 text-[#2d3748] dark:text-neutral-200'
                } [&_svg]:w-4 [&_svg]:h-4 [&_svg]:stroke-[2]`}
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
