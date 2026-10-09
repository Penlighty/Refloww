"use client";

import { useState, useEffect } from 'react';
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
import { Sheet } from '@/components/ui/Sheet';

export default function MobileBottomNav() {
    const pathname = usePathname();
    const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);

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
            <nav data-bottom-nav className="fixed inset-x-0 bottom-0 z-40 desk:hidden h-[var(--nav-h)] pb-safe bg-paper border-t border-line px-2">
                <div className="flex items-center justify-around max-w-md mx-auto h-full">
                    
                    {/* 1. Home */}
                    <Link
                        href="/"
                        data-active={isHomeActive ? "true" : undefined}
                        aria-current={isHomeActive ? "page" : undefined}
                        className={`relative flex flex-col items-center justify-center py-1 px-3 min-h-[44px] min-w-[44px] transition-colors ${
                            isHomeActive ? 'text-ink font-semibold' : 'text-ink-3 hover:text-ink'
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
                            isSalesActive ? 'text-ink font-semibold' : 'text-ink-3 hover:text-ink'
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
                            isDocsActive ? 'text-ink font-semibold' : 'text-ink-3 hover:text-ink'
                        }`}
                    >
                        {isDocsActive && (
                            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary-500 rounded-full" />
                        )}
                        <Documents className="size-5" weight={isDocsActive ? "bold" : "regular"} />
                        <span className="text-micro mt-0.5">Docs</span>
                    </Link>

                    {/* 4. Business */}
                    <Link
                        href="/customers"
                        data-active={isBusinessActive ? "true" : undefined}
                        aria-current={isBusinessActive ? "page" : undefined}
                        className={`relative flex flex-col items-center justify-center py-1 px-3 min-h-[44px] min-w-[44px] transition-colors ${
                            isBusinessActive ? 'text-ink font-semibold' : 'text-ink-3 hover:text-ink'
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
                            isMoreActive || isMoreSheetOpen ? 'text-ink font-semibold' : 'text-ink-3 hover:text-ink'
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

            {/* "More" Sheet */}
            <Sheet
                open={isMoreSheetOpen}
                onClose={() => setIsMoreSheetOpen(false)}
                title="More modules"
                description="Quick access to all features"
                height="tall"
                size="md"
            >
                <div className="grid grid-cols-2 gap-2.5 py-2">
                    <Link
                        href="/invoices"
                        className="panel p-3 flex items-center gap-3 hover:border-line-strong transition-colors"
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
                        className="panel p-3 flex items-center gap-3 hover:border-line-strong transition-colors"
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
                        className="panel p-3 flex items-center gap-3 hover:border-line-strong transition-colors"
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
                        className="panel p-3 flex items-center gap-3 hover:border-line-strong transition-colors"
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
                        className="panel p-3 flex items-center gap-3 hover:border-line-strong transition-colors"
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
                        className="panel p-3 flex items-center gap-3 hover:border-line-strong transition-colors"
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
                        className="panel p-3 flex items-center gap-3 hover:border-line-strong transition-colors"
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
                        className="panel p-3 flex items-center gap-3 hover:border-line-strong transition-colors"
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
                        className="panel p-3 flex items-center gap-3 hover:border-line-strong transition-colors"
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
                        className="panel p-3 flex items-center gap-3 hover:border-line-strong transition-colors"
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
                        className="panel p-3 flex items-center gap-3 hover:border-line-strong transition-colors"
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
                        className="panel p-3 flex items-center gap-3 hover:border-line-strong transition-colors"
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
                        className="panel p-3 flex items-center gap-3 hover:border-line-strong transition-colors"
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
                        className="panel p-3 flex items-center gap-3 hover:border-line-strong transition-colors"
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
                        className="panel p-3 flex items-center gap-3 hover:border-line-strong transition-colors col-span-2"
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
            </Sheet>
        </>
    );
}
