"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    Home,
    Register,
    Documents,
    Invoice,
    Receipt,
    Delivery,
    Template,
    Briefcase,
    MoreHorizontal,
    X,
    Analytics,
    Marketplace,
    Settings,
    Help,
    Transactions,
    Customers,
    Products,
    Storefront,
    Discount,
    Ledger
} from '@/components/icons';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function MobileBottomNav() {
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);
    const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isHomeActive = pathname === '/';
    const isSalesActive = pathname === '/pos' || pathname === '/transactions';
    const isDocsActive = pathname.startsWith('/invoices') || pathname.startsWith('/receipts') || pathname.startsWith('/delivery-notes') || pathname.startsWith('/templates');
    const isBusinessActive = pathname.startsWith('/customers') || pathname.startsWith('/products') || pathname.startsWith('/storefront') || pathname.startsWith('/discounts') || pathname.startsWith('/ledger');
    const isMoreActive = pathname.startsWith('/analytics') || pathname.startsWith('/marketplace') || pathname.startsWith('/settings') || pathname.startsWith('/help');

    useEffect(() => {
        setIsMoreSheetOpen(false);
    }, [pathname]);

    return (
        <>
            {/* 5-Destination Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 z-[80] md:hidden bg-paper border-t border-line px-2 py-1.5 pb-[env(safe-area-inset-bottom)]">
                <div className="flex items-center justify-around max-w-md mx-auto">
                    
                    {/* 1. Home */}
                    <Link
                        href="/"
                        data-active={isHomeActive ? "true" : undefined}
                        aria-current={isHomeActive ? "page" : undefined}
                        className={`relative flex flex-col items-center justify-center py-1 px-3 min-h-[44px] min-w-[44px] transition-colors ${
                            isHomeActive ? 'text-ink font-medium' : 'text-ink-3 hover:text-ink'
                        }`}
                    >
                        {isHomeActive && (
                            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary-500 rounded-full" />
                        )}
                        <Home className="size-5" weight={isHomeActive ? "bold" : "regular"} />
                        <span className="text-micro mt-0.5">Home</span>
                    </Link>

                    {/* 2. Sales */}
                    <Link
                        href="/pos"
                        data-active={isSalesActive ? "true" : undefined}
                        aria-current={isSalesActive ? "page" : undefined}
                        className={`relative flex flex-col items-center justify-center py-1 px-3 min-h-[44px] min-w-[44px] transition-colors ${
                            isSalesActive ? 'text-ink font-medium' : 'text-ink-3 hover:text-ink'
                        }`}
                    >
                        {isSalesActive && (
                            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary-500 rounded-full" />
                        )}
                        <Register className="size-5" weight={isSalesActive ? "bold" : "regular"} />
                        <span className="text-micro mt-0.5">Sales</span>
                    </Link>

                    {/* 3. Documents */}
                    <Link
                        href="/invoices"
                        data-active={isDocsActive ? "true" : undefined}
                        aria-current={isDocsActive ? "page" : undefined}
                        className={`relative flex flex-col items-center justify-center py-1 px-3 min-h-[44px] min-w-[44px] transition-colors ${
                            isDocsActive ? 'text-ink font-medium' : 'text-ink-3 hover:text-ink'
                        }`}
                    >
                        {isDocsActive && (
                            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary-500 rounded-full" />
                        )}
                        <Documents className="size-5" weight={isDocsActive ? "bold" : "regular"} />
                        <span className="text-micro mt-0.5">Documents</span>
                    </Link>

                    {/* 4. Business */}
                    <Link
                        href="/customers"
                        data-active={isBusinessActive ? "true" : undefined}
                        aria-current={isBusinessActive ? "page" : undefined}
                        className={`relative flex flex-col items-center justify-center py-1 px-3 min-h-[44px] min-w-[44px] transition-colors ${
                            isBusinessActive ? 'text-ink font-medium' : 'text-ink-3 hover:text-ink'
                        }`}
                    >
                        {isBusinessActive && (
                            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary-500 rounded-full" />
                        )}
                        <Briefcase className="size-5" weight={isBusinessActive ? "bold" : "regular"} />
                        <span className="text-micro mt-0.5">Business</span>
                    </Link>

                    {/* 5. More */}
                    <button
                        type="button"
                        onClick={() => setIsMoreSheetOpen(true)}
                        data-active={isMoreActive || isMoreSheetOpen ? "true" : undefined}
                        className={`relative flex flex-col items-center justify-center py-1 px-3 min-h-[44px] min-w-[44px] cursor-pointer transition-colors ${
                            isMoreActive || isMoreSheetOpen ? 'text-ink font-medium' : 'text-ink-3 hover:text-ink'
                        }`}
                    >
                        {(isMoreActive || isMoreSheetOpen) && (
                            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary-500 rounded-full" />
                        )}
                        <MoreHorizontal className="size-5" weight={isMoreActive || isMoreSheetOpen ? "bold" : "regular"} />
                        <span className="text-micro mt-0.5">More</span>
                    </button>

                </div>
            </nav>

            {/* "More" Contextual Mobile Bottom Sheet */}
            {mounted && isMoreSheetOpen && createPortal(
                <div className="fixed inset-0 z-[150] md:hidden flex flex-col justify-end bg-scrim animate-fade">
                    <div
                        className="fixed inset-0"
                        onClick={() => setIsMoreSheetOpen(false)}
                    />
                    
                    <div className="relative bg-paper rounded-t-sheet p-5 space-y-4 max-h-[85dvh] overflow-y-auto flex flex-col border-t border-line shadow-sheet animate-sheet-in z-[151] pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
                        {/* Sheet Handle */}
                        <div className="w-9 h-1 bg-line-strong rounded-full mx-auto mb-1 shrink-0" />

                        <div className="flex items-center justify-between pb-3 border-b border-line">
                            <div>
                                <h3 className="font-heading text-title font-semibold text-ink">More modules</h3>
                                <p className="text-caption text-ink-3 mt-0.5">Quick access to all features</p>
                            </div>
                            <button
                                onClick={() => setIsMoreSheetOpen(false)}
                                className="size-9 rounded-ctl flex items-center justify-center text-ink-3 hover:bg-paper-2 hover:text-ink"
                            >
                                <X className="size-4" />
                            </button>
                        </div>

                        {/* Modules Grid */}
                        <div className="grid grid-cols-2 gap-2.5 pt-1">
                            <Link
                                href="/invoices"
                                className="panel p-3 flex items-center gap-3 hover:border-line-strong"
                            >
                                <div className="size-8 rounded-ctl bg-paper-2 grid place-items-center text-ink-2">
                                    <Invoice className="size-4" />
                                </div>
                                <div className="min-w-0">
                                    <h5 className="text-body font-medium text-ink truncate">Invoices</h5>
                                    <p className="text-micro text-ink-3 truncate">Billing & requests</p>
                                </div>
                            </Link>

                            <Link
                                href="/receipts"
                                className="panel p-3 flex items-center gap-3 hover:border-line-strong"
                            >
                                <div className="size-8 rounded-ctl bg-paper-2 grid place-items-center text-ink-2">
                                    <Receipt className="size-4" />
                                </div>
                                <div className="min-w-0">
                                    <h5 className="text-body font-medium text-ink truncate">Receipts</h5>
                                    <p className="text-micro text-ink-3 truncate">Payment vouchers</p>
                                </div>
                            </Link>

                            <Link
                                href="/delivery-notes"
                                className="panel p-3 flex items-center gap-3 hover:border-line-strong"
                            >
                                <div className="size-8 rounded-ctl bg-paper-2 grid place-items-center text-ink-2">
                                    <Delivery className="size-4" />
                                </div>
                                <div className="min-w-0">
                                    <h5 className="text-body font-medium text-ink truncate">Delivery notes</h5>
                                    <p className="text-micro text-ink-3 truncate">Waybills</p>
                                </div>
                            </Link>

                            <Link
                                href="/templates"
                                className="panel p-3 flex items-center gap-3 hover:border-line-strong"
                            >
                                <div className="size-8 rounded-ctl bg-paper-2 grid place-items-center text-ink-2">
                                    <Template className="size-4" />
                                </div>
                                <div className="min-w-0">
                                    <h5 className="text-body font-medium text-ink truncate">Templates</h5>
                                    <p className="text-micro text-ink-3 truncate">Designs & layouts</p>
                                </div>
                            </Link>

                            <Link
                                href="/pos"
                                className="panel p-3 flex items-center gap-3 hover:border-line-strong"
                            >
                                <div className="size-8 rounded-ctl bg-paper-2 grid place-items-center text-ink-2">
                                    <Register className="size-4" />
                                </div>
                                <div className="min-w-0">
                                    <h5 className="text-body font-medium text-ink truncate">POS register</h5>
                                    <p className="text-micro text-ink-3 truncate">Counter checkout</p>
                                </div>
                            </Link>

                            <Link
                                href="/transactions"
                                className="panel p-3 flex items-center gap-3 hover:border-line-strong"
                            >
                                <div className="size-8 rounded-ctl bg-paper-2 grid place-items-center text-ink-2">
                                    <Transactions className="size-4" />
                                </div>
                                <div className="min-w-0">
                                    <h5 className="text-body font-medium text-ink truncate">Transactions</h5>
                                    <p className="text-micro text-ink-3 truncate">Audit history</p>
                                </div>
                            </Link>

                            <Link
                                href="/customers"
                                className="panel p-3 flex items-center gap-3 hover:border-line-strong"
                            >
                                <div className="size-8 rounded-ctl bg-paper-2 grid place-items-center text-ink-2">
                                    <Customers className="size-4" />
                                </div>
                                <div className="min-w-0">
                                    <h5 className="text-body font-medium text-ink truncate">Customers</h5>
                                    <p className="text-micro text-ink-3 truncate">Client directory</p>
                                </div>
                            </Link>

                            <Link
                                href="/products"
                                className="panel p-3 flex items-center gap-3 hover:border-line-strong"
                            >
                                <div className="size-8 rounded-ctl bg-paper-2 grid place-items-center text-ink-2">
                                    <Products className="size-4" />
                                </div>
                                <div className="min-w-0">
                                    <h5 className="text-body font-medium text-ink truncate">Products</h5>
                                    <p className="text-micro text-ink-3 truncate">Inventory</p>
                                </div>
                            </Link>

                            <Link
                                href="/storefront"
                                className="panel p-3 flex items-center gap-3 hover:border-line-strong"
                            >
                                <div className="size-8 rounded-ctl bg-paper-2 grid place-items-center text-ink-2">
                                    <Storefront className="size-4" />
                                </div>
                                <div className="min-w-0">
                                    <h5 className="text-body font-medium text-ink truncate">Storefront</h5>
                                    <p className="text-micro text-ink-3 truncate">Online shop</p>
                                </div>
                            </Link>

                            <Link
                                href="/discounts"
                                className="panel p-3 flex items-center gap-3 hover:border-line-strong"
                            >
                                <div className="size-8 rounded-ctl bg-paper-2 grid place-items-center text-ink-2">
                                    <Discount className="size-4" />
                                </div>
                                <div className="min-w-0">
                                    <h5 className="text-body font-medium text-ink truncate">Discounts</h5>
                                    <p className="text-micro text-ink-3 truncate">Promos</p>
                                </div>
                            </Link>

                            <Link
                                href="/ledger"
                                className="panel p-3 flex items-center gap-3 hover:border-line-strong"
                            >
                                <div className="size-8 rounded-ctl bg-paper-2 grid place-items-center text-ink-2">
                                    <Ledger className="size-4" />
                                </div>
                                <div className="min-w-0">
                                    <h5 className="text-body font-medium text-ink truncate">Ledger</h5>
                                    <p className="text-micro text-ink-3 truncate">Accounting</p>
                                </div>
                            </Link>

                            <Link
                                href="/analytics"
                                className="panel p-3 flex items-center gap-3 hover:border-line-strong"
                            >
                                <div className="size-8 rounded-ctl bg-paper-2 grid place-items-center text-ink-2">
                                    <Analytics className="size-4" />
                                </div>
                                <div className="min-w-0">
                                    <h5 className="text-body font-medium text-ink truncate">Analytics</h5>
                                    <p className="text-micro text-ink-3 truncate">Reports</p>
                                </div>
                            </Link>

                            <Link
                                href="/marketplace"
                                className="panel p-3 flex items-center gap-3 hover:border-line-strong"
                            >
                                <div className="size-8 rounded-ctl bg-paper-2 grid place-items-center text-ink-2">
                                    <Marketplace className="size-4" />
                                </div>
                                <div className="min-w-0">
                                    <h5 className="text-body font-medium text-ink truncate">Marketplace</h5>
                                    <p className="text-micro text-ink-3 truncate">Add-ons</p>
                                </div>
                            </Link>

                            <Link
                                href="/settings"
                                className="panel p-3 flex items-center gap-3 hover:border-line-strong"
                            >
                                <div className="size-8 rounded-ctl bg-paper-2 grid place-items-center text-ink-2">
                                    <Settings className="size-4" />
                                </div>
                                <div className="min-w-0">
                                    <h5 className="text-body font-medium text-ink truncate">Settings</h5>
                                    <p className="text-micro text-ink-3 truncate">Preferences</p>
                                </div>
                            </Link>

                            <Link
                                href="/help"
                                className="panel p-3 flex items-center gap-3 hover:border-line-strong col-span-2"
                            >
                                <div className="size-8 rounded-ctl bg-paper-2 grid place-items-center text-ink-2">
                                    <Help className="size-4" />
                                </div>
                                <div className="min-w-0">
                                    <h5 className="text-body font-medium text-ink truncate">Help center</h5>
                                    <p className="text-micro text-ink-3 truncate">Guides & support</p>
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
