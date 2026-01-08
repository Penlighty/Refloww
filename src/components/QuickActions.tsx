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
            href: '/customers',
            icon: <UserPlus className="w-3.5 h-3.5" strokeWidth={2} />,
            label: 'Add Customer',
        },
        {
            href: '/products',
            icon: <Package className="w-3.5 h-3.5" strokeWidth={2} />,
            label: 'Add Product',
        },
        {
            href: '/templates/new',
            icon: <FolderPlus className="w-3.5 h-3.5" strokeWidth={2} />,
            label: 'New Template',
        },
    ];

    return (
        <section className="mt-2">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">Quick Actions</h3>
            <div className="flex items-center gap-3 flex-wrap">
                {actions.map((action, index) => (
                    <QuickActionPill key={index} {...action} />
                ))}
            </div>
        </section>
    );
}
