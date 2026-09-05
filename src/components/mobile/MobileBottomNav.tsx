"use client";

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Home,
    Zap,
    FileText,
    Receipt,
    Truck,
    FolderOpen,
    Briefcase,
    MoreHorizontal,
    X,
    BarChart2,
    Store,
    Settings,
    HelpCircle,
    ChevronRight,
    ArrowLeftRight,
    Users,
    Package,
    ShoppingBag,
    Percent,
    BookOpen
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function MobileBottomNav() {
    const pathname = usePathname();
    const router = useRouter();
    const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);

    // Active Tab Logic
    const isHomeActive = pathname === '/';
    const isSalesActive = pathname === '/pos' || pathname === '/transactions';
    const isDocsActive = pathname.startsWith('/invoices') || pathname.startsWith('/receipts') || pathname.startsWith('/delivery-notes') || pathname.startsWith('/templates');
    const isBusinessActive = pathname.startsWith('/customers') || pathname.startsWith('/products') || pathname.startsWith('/storefront') || pathname.startsWith('/discounts') || pathname.startsWith('/ledger');
    const isMoreActive = pathname.startsWith('/analytics') || pathname.startsWith('/marketplace') || pathname.startsWith('/settings') || pathname.startsWith('/help');

    // Close "More" sheet on route navigation
    useEffect(() => {
        setIsMoreSheetOpen(false);
    }, [pathname]);

    return (
        <>
            {/* Elevated 5-Destination Floating Bottom Navigation (Mobile Only: max-width: 767px) */}
            <nav className="fixed bottom-0 left-0 right-0 z-[80] md:hidden bg-white/95 dark:bg-[#121620]/95 backdrop-blur-md border-t border-[#e7e9e8] dark:border-neutral-800/80 px-2 py-1.5 safe-area-pb shadow-lg">
                <div className="flex items-center justify-around max-w-md mx-auto">
                    
                    {/* 1. Home */}
                    <Link
                        href="/"
                        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-150 min-h-[44px] min-w-[44px] ${
                            isHomeActive
                                ? 'text-[#fc6d2d] bg-[#fff0e9] dark:bg-[#fc6d2d]/15 font-semibold'
                                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                        }`}
                    >
                        <Home className={`w-5 h-5 ${isHomeActive ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
                        <span className="text-[10px] tracking-tight mt-0.5 font-medium">Home</span>
                    </Link>

                    {/* 2. Sales */}
                    <Link
                        href="/pos"
                        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-150 min-h-[44px] min-w-[44px] ${
                            isSalesActive
                                ? 'text-[#fc6d2d] bg-[#fff0e9] dark:bg-[#fc6d2d]/15 font-semibold'
                                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                        }`}
                    >
                        <Zap className={`w-5 h-5 ${isSalesActive ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
                        <span className="text-[10px] tracking-tight mt-0.5 font-medium">Sales</span>
                    </Link>

                    {/* 3. Documents */}
                    <Link
                        href="/invoices"
                        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-150 min-h-[44px] min-w-[44px] ${
                            isDocsActive
                                ? 'text-[#fc6d2d] bg-[#fff0e9] dark:bg-[#fc6d2d]/15 font-semibold'
                                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                        }`}
                    >
                        <FileText className={`w-5 h-5 ${isDocsActive ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
                        <span className="text-[10px] tracking-tight mt-0.5 font-medium">Documents</span>
                    </Link>

                    {/* 4. Business */}
                    <Link
                        href="/customers"
                        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-150 min-h-[44px] min-w-[44px] ${
                            isBusinessActive
                                ? 'text-[#fc6d2d] bg-[#fff0e9] dark:bg-[#fc6d2d]/15 font-semibold'
                                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                        }`}
                    >
                        <Briefcase className={`w-5 h-5 ${isBusinessActive ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
                        <span className="text-[10px] tracking-tight mt-0.5 font-medium">Business</span>
                    </Link>

                    {/* 5. More */}
                    <button
                        type="button"
                        onClick={() => setIsMoreSheetOpen(true)}
                        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-150 min-h-[44px] min-w-[44px] cursor-pointer ${
                            isMoreActive || isMoreSheetOpen
                                ? 'text-[#fc6d2d] bg-[#fff0e9] dark:bg-[#fc6d2d]/15 font-semibold'
                                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                        }`}
                    >
                        <MoreHorizontal className={`w-5 h-5 ${isMoreActive || isMoreSheetOpen ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
                        <span className="text-[10px] tracking-tight mt-0.5 font-medium">More</span>
                    </button>

                </div>
            </nav>

            {/* "More" Contextual Mobile Bottom Sheet */}
            {isMoreSheetOpen && (
                <div className="fixed inset-0 z-[100] md:hidden flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div
                        className="fixed inset-0"
                        onClick={() => setIsMoreSheetOpen(false)}
                    />
                    
                    <div className="relative bg-white dark:bg-[#161a24] rounded-t-[28px] p-6 space-y-4 max-h-[85vh] overflow-y-auto border-t border-neutral-200 dark:border-neutral-800 shadow-2xl animate-in slide-in-from-bottom duration-250 z-[101]">
                        {/* Sheet Handle */}
                        <div className="w-12 h-1 bg-neutral-300 dark:bg-neutral-700 rounded-full mx-auto mb-2" />

                        <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
                            <div>
                                <h3 className="text-base font-bold text-neutral-900 dark:text-white">More Modules</h3>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">Analytics, Settings & Add-ons</p>
                            </div>
                            <button
                                onClick={() => setIsMoreSheetOpen(false)}
                                className="p-2 rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 bg-neutral-100 dark:bg-neutral-800"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* More Links Categorized Sections */}
                        <div className="space-y-4 pt-2">
                            
                            {/* Commercial Documents */}
                            <div>
                                <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2 px-1">
                                    Commercial Documents
                                </h4>
                                <div className="grid grid-cols-2 gap-2.5">
                                    <Link
                                        href="/invoices"
                                        className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 flex items-center gap-2.5 hover:border-[#fc6d2d]/40 transition-all"
                                    >
                                        <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                                            <FileText className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <h5 className="text-xs font-bold text-neutral-900 dark:text-white truncate">Invoices</h5>
                                            <p className="text-[10px] text-neutral-400 truncate">Billing & Requests</p>
                                        </div>
                                    </Link>

                                    <Link
                                        href="/receipts"
                                        className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 flex items-center gap-2.5 hover:border-[#fc6d2d]/40 transition-all"
                                    >
                                        <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400">
                                            <Receipt className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <h5 className="text-xs font-bold text-neutral-900 dark:text-white truncate">Receipts</h5>
                                            <p className="text-[10px] text-neutral-400 truncate">Payment Vouchers</p>
                                        </div>
                                    </Link>

                                    <Link
                                        href="/delivery-notes"
                                        className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 flex items-center gap-2.5 hover:border-[#fc6d2d]/40 transition-all"
                                    >
                                        <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                                            <Truck className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <h5 className="text-xs font-bold text-neutral-900 dark:text-white truncate">Delivery Notes</h5>
                                            <p className="text-[10px] text-neutral-400 truncate">Shipments & Waybills</p>
                                        </div>
                                    </Link>

                                    <Link
                                        href="/templates"
                                        className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 flex items-center gap-2.5 hover:border-[#fc6d2d]/40 transition-all"
                                    >
                                        <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[#16A86B] dark:text-emerald-400">
                                            <FolderOpen className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <h5 className="text-xs font-bold text-neutral-900 dark:text-white truncate">Templates</h5>
                                            <p className="text-[10px] text-neutral-400 truncate">Designs & Layouts</p>
                                        </div>
                                    </Link>
                                </div>
                            </div>

                            {/* Sales & Transactions */}
                            <div>
                                <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2 px-1">
                                    Sales & Financials
                                </h4>
                                <div className="grid grid-cols-2 gap-2.5">
                                    <Link
                                        href="/pos"
                                        className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 flex items-center gap-2.5 hover:border-[#fc6d2d]/40 transition-all"
                                    >
                                        <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#fc6d2d]">
                                            <Zap className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <h5 className="text-xs font-bold text-neutral-900 dark:text-white truncate">POS Register</h5>
                                            <p className="text-[10px] text-neutral-400 truncate">Counter Checkout</p>
                                        </div>
                                    </Link>

                                    <Link
                                        href="/transactions"
                                        className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 flex items-center gap-2.5 hover:border-[#fc6d2d]/40 transition-all"
                                    >
                                        <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                                            <ArrowLeftRight className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <h5 className="text-xs font-bold text-neutral-900 dark:text-white truncate">Transactions</h5>
                                            <p className="text-[10px] text-neutral-400 truncate">Audit & History</p>
                                        </div>
                                    </Link>

                                    <Link
                                        href="/analytics"
                                        className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 flex items-center gap-2.5 hover:border-[#fc6d2d]/40 transition-all col-span-2"
                                    >
                                        <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                                            <BarChart2 className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <h5 className="text-xs font-bold text-neutral-900 dark:text-white truncate">Analytics</h5>
                                            <p className="text-[10px] text-neutral-400 truncate">Financial Breakdown & Reports</p>
                                        </div>
                                    </Link>
                                </div>
                            </div>

                            {/* Business Management */}
                            <div>
                                <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2 px-1">
                                    Business Operations
                                </h4>
                                <div className="grid grid-cols-2 gap-2.5">
                                    <Link
                                        href="/customers"
                                        className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 flex items-center gap-2.5 hover:border-[#fc6d2d]/40 transition-all"
                                    >
                                        <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[#16A86B] dark:text-emerald-400">
                                            <Users className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <h5 className="text-xs font-bold text-neutral-900 dark:text-white truncate">Customers</h5>
                                            <p className="text-[10px] text-neutral-400 truncate">Client Directory</p>
                                        </div>
                                    </Link>

                                    <Link
                                        href="/products"
                                        className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 flex items-center gap-2.5 hover:border-[#fc6d2d]/40 transition-all"
                                    >
                                        <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400">
                                            <Package className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <h5 className="text-xs font-bold text-neutral-900 dark:text-white truncate">Products</h5>
                                            <p className="text-[10px] text-neutral-400 truncate">Inventory & Catalog</p>
                                        </div>
                                    </Link>

                                    <Link
                                        href="/storefront"
                                        className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 flex items-center gap-2.5 hover:border-[#fc6d2d]/40 transition-all"
                                    >
                                        <div className="p-2 rounded-xl bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400">
                                            <ShoppingBag className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <h5 className="text-xs font-bold text-neutral-900 dark:text-white truncate">Storefront</h5>
                                            <p className="text-[10px] text-neutral-400 truncate">Online Shop</p>
                                        </div>
                                    </Link>

                                    <Link
                                        href="/discounts"
                                        className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 flex items-center gap-2.5 hover:border-[#fc6d2d]/40 transition-all"
                                    >
                                        <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                                            <Percent className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <h5 className="text-xs font-bold text-neutral-900 dark:text-white truncate">Discounts</h5>
                                            <p className="text-[10px] text-neutral-400 truncate">Promos & Coupons</p>
                                        </div>
                                    </Link>

                                    <Link
                                        href="/ledger"
                                        className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 flex items-center gap-2.5 hover:border-[#fc6d2d]/40 transition-all col-span-2"
                                    >
                                        <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400">
                                            <BookOpen className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <h5 className="text-xs font-bold text-neutral-900 dark:text-white truncate">Accounting Ledger</h5>
                                            <p className="text-[10px] text-neutral-400 truncate">Double-entry bookkeeping & Trial balance</p>
                                        </div>
                                    </Link>
                                </div>
                            </div>

                            {/* System & Settings */}
                            <div>
                                <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2 px-1">
                                    Apps & Settings
                                </h4>
                                <div className="grid grid-cols-3 gap-2.5">
                                    <Link
                                        href="/marketplace"
                                        className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 flex flex-col items-center text-center gap-1.5 hover:border-[#fc6d2d]/40 transition-all"
                                    >
                                        <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                                            <Store className="w-4 h-4" />
                                        </div>
                                        <h5 className="text-[11px] font-bold text-neutral-900 dark:text-white truncate">Market</h5>
                                    </Link>

                                    <Link
                                        href="/settings"
                                        className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 flex flex-col items-center text-center gap-1.5 hover:border-[#fc6d2d]/40 transition-all"
                                    >
                                        <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                                            <Settings className="w-4 h-4" />
                                        </div>
                                        <h5 className="text-[11px] font-bold text-neutral-900 dark:text-white truncate">Settings</h5>
                                    </Link>

                                    <Link
                                        href="/help"
                                        className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 flex flex-col items-center text-center gap-1.5 hover:border-[#fc6d2d]/40 transition-all"
                                    >
                                        <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[#16A86B] dark:text-emerald-400">
                                            <HelpCircle className="w-4 h-4" />
                                        </div>
                                        <h5 className="text-[11px] font-bold text-neutral-900 dark:text-white truncate">Help</h5>
                                    </Link>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
