"use client";

import Link from 'next/link';
import { FileText, Receipt, Truck, UserPlus, Package, FolderPlus } from '@/components/icons';

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
            className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-ctl font-bold text-xs transition-colors border ${isPrimary
                ? 'bg-primary-500 hover:bg-primary-600 text-on-primary border-transparent'
                : 'bg-paper-2 text-ink border-line hover:bg-paper-3'
                }`}
        >
            <span className={`flex items-center justify-center ${isPrimary
                ? 'text-on-primary'
                : 'size-6 bg-paper rounded-tag border border-line text-ink'
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
            className={`flex flex-col items-center justify-center p-3 rounded-panel transition-colors text-center border group ${isPrimary
                ? 'bg-paper border-2 border-primary-500 text-primary-text'
                : 'bg-paper border-line text-ink hover:bg-paper-2'
                }`}
        >
            <div className={`size-10 rounded-ctl flex items-center justify-center mb-2 transition-transform group-hover:scale-105 ${isPrimary
                ? 'bg-primary-500 text-on-primary'
                : 'bg-paper-2 text-ink border border-line'
                }`}
            >
                {icon}
            </div>
            <span className="text-xs font-bold leading-tight line-clamp-1">
                {label}
            </span>
        </Link>
    );
}

export default function QuickActions() {
    const actions: QuickActionProps[] = [
        {
            href: '/invoices/new',
            icon: <FileText className="size-4" />,
            label: 'New Invoice',
            variant: 'primary',
        },
        {
            href: '/receipts/new',
            icon: <Receipt className="size-4" />,
            label: 'New Receipt',
        },
        {
            href: '/delivery-notes/new',
            icon: <Truck className="size-4" />,
            label: 'Delivery Note',
        },
        {
            href: '/customers?add=true',
            icon: <UserPlus className="size-4" />,
            label: 'Add Customer',
        },
        {
            href: '/products?add=true',
            icon: <Package className="size-4" />,
            label: 'Add Product',
        },
        {
            href: '/templates',
            icon: <FolderPlus className="size-4" />,
            label: 'New Template',
        },
    ];

    return (
        <section className="mt-2">
            <h3 className="text-lg font-bold font-display text-ink mb-4">Quick Actions</h3>
            
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
