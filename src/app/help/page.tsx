"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { LucideIcon } from 'lucide-react';
import {
    HelpCircle,
    FileText,
    Users,
    Package,
    FolderOpen,
    Settings,
    Keyboard,
    BookOpen,
    Lightbulb,
    Rocket,
    Mail,
    MessageCircle,
    Shield,
    ChevronRight,
    Check,
    X,
    Sparkles
} from 'lucide-react';
import { SearchInput } from '@/components/ui';

type TabId = 'getting-started' | 'templates' | 'documents' | 'customers' | 'products' | 'ledger' | 'settings' | 'security' | 'shortcuts' | 'tips';

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
    { id: 'getting-started', label: 'Getting Started', icon: Rocket },
    { id: 'templates', label: 'Managing Templates', icon: FolderOpen },
    { id: 'documents', label: 'Creating Documents', icon: FileText },
    { id: 'customers', label: 'Managing Customers', icon: Users },
    { id: 'products', label: 'Managing Products', icon: Package },
    { id: 'ledger', label: 'Using the Ledger', icon: BookOpen },
    { id: 'settings', label: 'Settings & Preferences', icon: Settings },
    { id: 'security', label: 'Security & Encryption', icon: Shield },
    { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard },
    { id: 'tips', label: 'Tips & Best Practices', icon: Lightbulb },
];

export default function HelpPage() {
    const [activeSection, setActiveSection] = useState<TabId>('getting-started');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // IntersectionObserver to auto-update active section in TOC as user scrolls
    useEffect(() => {
        const scrollContainer = document.querySelector('main .overflow-y-auto') || null;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveSection(entry.target.id as TabId);
                    }
                });
            },
            {
                root: scrollContainer,
                threshold: 0.1,
                rootMargin: '-10% 0px -50% 0px'
            }
        );

        TABS.forEach((tab) => {
            const el = document.getElementById(tab.id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, []);

    const filteredTabs = TABS.filter(tab =>
        tab.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const scrollToSection = (id: TabId) => {
        setActiveSection(id);
        setIsSidebarOpen(false);

        // Defer scroll invocation slightly so modal closing transition doesn't intercept scrollIntoView
        setTimeout(() => {
            const element = document.getElementById(id);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 60);
    };

    return (
        <div className="max-w-6xl mx-auto flex flex-col space-y-4 md:space-y-6 pb-24 relative">
            {/* Page Header */}
            <div className="flex items-center justify-between flex-shrink-0 pt-1 sm:pt-2">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-[#2d3748] dark:text-white flex items-center gap-2.5">
                        <HelpCircle className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600 shrink-0" />
                        <span>Help Centre</span>
                    </h1>
                    <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 mt-1">
                        Everything you need to know about using Refloww
                    </p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
                {/* Desktop Sticky Table of Contents Sidebar */}
                <div className="hidden md:flex w-64 flex-shrink-0 flex-col gap-1 sticky top-20 max-h-[calc(100vh-100px)] overflow-y-auto pr-1">
                    <div className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2 px-2 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                        <span>Table of Contents</span>
                    </div>

                    {/* Search */}
                    <div className="mb-3">
                        <SearchInput
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="Search topics..."
                        />
                    </div>

                    {/* Navigation Links */}
                    <div className="flex flex-col gap-1">
                        {filteredTabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeSection === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => scrollToSection(tab.id)}
                                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all text-left ${isActive
                                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold shadow-2xs'
                                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Icon className="w-4.5 h-4.5 flex-shrink-0" strokeWidth={isActive ? 2.2 : 1.75} />
                                        <span className="text-xs sm:text-sm truncate">{tab.label}</span>
                                    </div>
                                    {isActive && <ChevronRight className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />}
                                </button>
                            );
                        })}
                    </div>

                    {/* Support Card */}
                    <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-700">
                        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-4 text-white shadow-sm">
                            <h3 className="text-sm font-bold mb-1">Need more help?</h3>
                            <p className="text-xs text-blue-100 mb-3">Our support team is here for you.</p>
                            <div className="flex flex-col gap-2">
                                <a href="mailto:support@refloww.app" className="inline-flex items-center gap-2 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-medium transition-colors">
                                    <Mail className="w-3.5 h-3.5" />
                                    Email Support
                                </a>
                                <a href="#" className="inline-flex items-center gap-2 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-medium transition-colors">
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    Live Chat
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Article Content Area - Single Continuous Scroll */}
                <div className="flex-1 w-full space-y-6 sm:space-y-8 min-w-0">

                    {/* Section 1: Getting Started */}
                    <section id="getting-started" className="scroll-mt-4 sm:scroll-mt-8 bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-5 sm:p-7 shadow-xs transition-all">
                        <div className="flex items-center gap-3 mb-5 border-b border-neutral-100 dark:border-neutral-700/60 pb-4">
                            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
                                <Rocket className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Section 1</span>
                                <h2 className="text-lg sm:text-xl font-bold text-[#2d3748] dark:text-white">Welcome to Refloww</h2>
                            </div>
                        </div>

                        <p className="text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-300 mb-6">
                            Welcome to <strong>Refloww</strong> – your all-in-one financial documentation manager designed for small to medium businesses.
                        </p>

                        <h3 className="text-base sm:text-lg font-bold text-[#2d3748] dark:text-white mb-3">Quick Start Guide</h3>
                        <ol className="list-decimal list-inside space-y-3 text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-300 mb-6">
                            <li className="pl-1"><strong>Set up your company profile</strong> – Go to Settings and add your business name, logo, and contact details.</li>
                            <li className="pl-1"><strong>Upload a template</strong> – Navigate to Templates and upload your invoice, receipt, or delivery note template image.</li>
                            <li className="pl-1"><strong>Map your fields</strong> – Use the visual Marquee editor to mark where data should appear on your template.</li>
                            <li className="pl-1"><strong>Add customers & products</strong> – Build your database of customers and products for quick document creation.</li>
                            <li className="pl-1"><strong>Create your first document</strong> – Go to Invoices, click "New Invoice", and start generating professional documents!</li>
                        </ol>

                        <div className="bg-blue-50/80 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800/80 rounded-xl p-4 sm:p-5">
                            <p className="text-xs sm:text-sm leading-relaxed text-blue-800 dark:text-blue-200">
                                <strong>💡 Tip:</strong> Press <kbd className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 rounded font-mono text-xs font-semibold">?</kbd> anytime to see all keyboard shortcuts!
                            </p>
                        </div>
                    </section>

                    {/* Section 2: Managing Templates */}
                    <section id="templates" className="scroll-mt-4 sm:scroll-mt-8 bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-5 sm:p-7 shadow-xs transition-all">
                        <div className="flex items-center gap-3 mb-5 border-b border-neutral-100 dark:border-neutral-700/60 pb-4">
                            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
                                <FolderOpen className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Section 2</span>
                                <h2 className="text-lg sm:text-xl font-bold text-[#2d3748] dark:text-white">Managing Templates</h2>
                            </div>
                        </div>

                        <p className="text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-300 mb-6">
                            Templates are the foundation of Refloww. They define how your documents look.
                        </p>

                        <h3 className="text-base sm:text-lg font-bold text-[#2d3748] dark:text-white mb-3">Uploading Templates</h3>
                        <ul className="list-disc list-inside space-y-2.5 text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-300 mb-6">
                            <li>Supported formats: <strong>PNG, JPG, PDF, SVG</strong></li>
                            <li>Recommended resolution: <strong>A4 size (595×842 pixels)</strong></li>
                            <li>Use high-quality images for best print results</li>
                        </ul>

                        <h3 className="text-base sm:text-lg font-bold text-[#2d3748] dark:text-white mb-3">Field Mapping (Marquee Editor)</h3>
                        <p className="text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-300 mb-3">
                            The Marquee Editor lets you visually define where data appears on your template:
                        </p>
                        <ol className="list-decimal list-inside space-y-2.5 text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-300 mb-6">
                            <li>Click and drag to draw a field box on your template</li>
                            <li>Select the field type (e.g., Customer Name, Date, Line Items)</li>
                            <li>Adjust font size, color, and alignment</li>
                            <li>Resize and reposition using the corner handles</li>
                            <li>Save your template when done</li>
                        </ol>

                        <h3 className="text-base sm:text-lg font-bold text-[#2d3748] dark:text-white mb-3">Available Field Types</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
                            {[
                                'Document Number', 'Date', 'Due Date', 'Customer Name',
                                'Customer Email', 'Customer Phone', 'Customer Address',
                                'Line Items', 'Subtotal', 'Discount', 'Discount Name', 'Tax',
                                'Grand Total', 'Amount Paid', 'Amount Due', 'Amount in Words',
                                'Notes', 'Link Button', 'Custom Text'
                            ].map(field => (
                                <div key={field} className="px-3 py-2 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300 border border-neutral-100 dark:border-neutral-700">
                                    {field}
                                </div>
                            ))}
                        </div>

                        <div className="bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/80 rounded-xl p-4 sm:p-5">
                            <p className="text-xs sm:text-sm leading-relaxed text-emerald-800 dark:text-emerald-200">
                                <strong>💡 Connected Templates:</strong> You can link multiple document types (Invoice, Receipt, Delivery Note) to a single template for consistent branding.
                            </p>
                        </div>
                    </section>

                    {/* Section 3: Creating Documents */}
                    <section id="documents" className="scroll-mt-4 sm:scroll-mt-8 bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-5 sm:p-7 shadow-xs transition-all">
                        <div className="flex items-center gap-3 mb-5 border-b border-neutral-100 dark:border-neutral-700/60 pb-4">
                            <div className="p-2.5 bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-xl shrink-0">
                                <FileText className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">Section 3</span>
                                <h2 className="text-lg sm:text-xl font-bold text-[#2d3748] dark:text-white">Creating Documents</h2>
                            </div>
                        </div>

                        <p className="text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-300 mb-6">
                            Create professional invoices, receipts, and delivery notes in seconds.
                        </p>

                        <h3 className="text-base sm:text-lg font-bold text-[#2d3748] dark:text-white mb-3">Document Types</h3>
                        <ul className="list-disc list-inside space-y-2.5 text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-300 mb-6">
                            <li><strong>Invoices</strong> – Bill your customers with due dates and payment tracking</li>
                            <li><strong>Receipts</strong> – Acknowledge payments received</li>
                            <li><strong>Delivery Notes</strong> – Document goods delivered to customers</li>
                        </ul>

                        <h3 className="text-base sm:text-lg font-bold text-[#2d3748] dark:text-white mb-3">Creating a New Document</h3>
                        <ol className="list-decimal list-inside space-y-2.5 text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-300 mb-6">
                            <li>Navigate to the document type (e.g., Invoices)</li>
                            <li>Click "New Invoice" button</li>
                            <li>Select a template</li>
                            <li>Choose a customer from your database</li>
                            <li>Add line items (products/services)</li>
                            <li>Apply discounts and taxes as needed</li>
                            <li>Add any notes</li>
                            <li>Click "Create" to save</li>
                        </ol>

                        <h3 className="text-base sm:text-lg font-bold text-[#2d3748] dark:text-white mb-3">Document Actions</h3>
                        <ul className="list-disc list-inside space-y-2.5 text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-300">
                            <li><strong>Edit</strong> – Modify draft documents</li>
                            <li><strong>Duplicate</strong> – Create a copy of an existing document</li>
                            <li><strong>Convert</strong> – Turn an invoice into a receipt or delivery note</li>
                            <li><strong>Download PDF</strong> – Export as high-quality PDF</li>
                            <li><strong>Download PNG</strong> – Export as image</li>
                            <li><strong>Print</strong> – Print directly from your browser</li>
                            <li><strong>Mark as Paid</strong> – Track payment status</li>
                        </ul>
                    </section>

                    {/* Section 4: Managing Customers */}
                    <section id="customers" className="scroll-mt-4 sm:scroll-mt-8 bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-5 sm:p-7 shadow-xs transition-all">
                        <div className="flex items-center gap-3 mb-5 border-b border-neutral-100 dark:border-neutral-700/60 pb-4">
                            <div className="p-2.5 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-xl shrink-0">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">Section 4</span>
                                <h2 className="text-lg sm:text-xl font-bold text-[#2d3748] dark:text-white">Managing Customers</h2>
                            </div>
                        </div>

                        <p className="text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-300 mb-6">
                            Keep track of all your customers in one place.
                        </p>

                        <h3 className="text-base sm:text-lg font-bold text-[#2d3748] dark:text-white mb-3">Customer Information</h3>
                        <ul className="list-disc list-inside space-y-2.5 text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-300 mb-6">
                            <li>Name (required)</li>
                            <li>Email address</li>
                            <li>Phone number</li>
                            <li>Billing address</li>
                        </ul>

                        <h3 className="text-base sm:text-lg font-bold text-[#2d3748] dark:text-white mb-3">Import & Export</h3>
                        <p className="text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-300 mb-3">
                            Easily import customers from a CSV file or export your customer list:
                        </p>
                        <ul className="list-disc list-inside space-y-2.5 text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-300 mb-6">
                            <li><strong>Import CSV</strong> – Upload a file with columns: name, email, phone, address</li>
                            <li><strong>Export CSV</strong> – Download your entire customer list</li>
                        </ul>

                        <h3 className="text-base sm:text-lg font-bold text-[#2d3748] dark:text-white mb-3">Customer Details Page</h3>
                        <p className="text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-300">
                            Click on any customer to see their complete history including all documents, total spent, and pending amounts.
                        </p>
                    </section>

                    {/* Section 5: Managing Products */}
                    <section id="products" className="scroll-mt-4 sm:scroll-mt-8 bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-5 sm:p-7 shadow-xs transition-all">
                        <div className="flex items-center gap-3 mb-5 border-b border-neutral-100 dark:border-neutral-700/60 pb-4">
                            <div className="p-2.5 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-xl shrink-0">
                                <Package className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">Section 5</span>
                                <h2 className="text-lg sm:text-xl font-bold text-[#2d3748] dark:text-white">Managing Products</h2>
                            </div>
                        </div>

                        <p className="text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-300 mb-6">
                            Create a catalog of your products and services for quick access when creating documents.
                        </p>

                        <h3 className="text-base sm:text-lg font-bold text-[#2d3748] dark:text-white mb-3">Product Information</h3>
                        <ul className="list-disc list-inside space-y-2.5 text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-300 mb-6">
                            <li>Product name (required)</li>
                            <li>SKU (Stock Keeping Unit)</li>
                            <li>Description</li>
                            <li>Unit price</li>
                        </ul>

                        <h3 className="text-base sm:text-lg font-bold text-[#2d3748] dark:text-white mb-3">Import & Export</h3>
                        <p className="text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-300 mb-6">
                            Like customers, products can be imported from and exported to CSV files.
                        </p>

                        <h3 className="text-base sm:text-lg font-bold text-[#2d3748] dark:text-white mb-3">Product Analytics</h3>
                        <p className="text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-300">
                            View product details to see usage statistics including total units sold, revenue generated, and recent documents.
                        </p>
                    </section>

                    {/* Section 6: Using the Ledger */}
                    <section id="ledger" className="scroll-mt-4 sm:scroll-mt-8 bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-5 sm:p-7 shadow-xs transition-all">
                        <div className="flex items-center gap-3 mb-5 border-b border-neutral-100 dark:border-neutral-700/60 pb-4">
                            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
                                <BookOpen className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Section 6</span>
                                <h2 className="text-lg sm:text-xl font-bold text-[#2d3748] dark:text-white">Using the Ledger</h2>
                            </div>
                        </div>

                        <p className="text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-300 mb-6">
                            The Ledger provides a centralized view of all your business transactions.
                        </p>

                        <h3 className="text-base sm:text-lg font-bold text-[#2d3748] dark:text-white mb-3">Features</h3>
                        <ul className="list-disc list-inside space-y-2.5 text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-300 mb-6">
                            <li><strong>Search</strong> – Find documents by reference number or customer name</li>
                            <li><strong>Filter by Type</strong> – Show only invoices, receipts, or delivery notes</li>
                            <li><strong>Filter by Status</strong> – Draft, Sent, Paid, Overdue, Cancelled</li>
                            <li><strong>Date Range</strong> – Filter by date using presets or custom range</li>
                            <li><strong>Sort</strong> – Click column headers to sort</li>
                        </ul>

                        <h3 className="text-base sm:text-lg font-bold text-[#2d3748] dark:text-white mb-3">Exporting Data</h3>
                        <ul className="list-disc list-inside space-y-2.5 text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-300 mb-3">
                            <li><strong>Export to Excel</strong> – Download as .xlsx file</li>
                            <li><strong>Export to CSV</strong> – Download as .csv file</li>
                        </ul>
                        <p className="text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-300">
                            Exports respect your current filters, so you can export specific date ranges or document types.
                        </p>
                    </section>

                    {/* Section 7: Settings & Preferences */}
                    <section id="settings" className="scroll-mt-4 sm:scroll-mt-8 bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-5 sm:p-7 shadow-xs transition-all">
                        <div className="flex items-center gap-3 mb-5 border-b border-neutral-100 dark:border-neutral-700/60 pb-4">
                            <div className="p-2.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 rounded-xl shrink-0">
                                <Settings className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Section 7</span>
                                <h2 className="text-lg sm:text-xl font-bold text-[#2d3748] dark:text-white">Settings & Preferences</h2>
                            </div>
                        </div>

                        <p className="text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-300 mb-6">
                            Customize Refloww to match your business needs.
                        </p>

                        <h3 className="text-base sm:text-lg font-bold text-[#2d3748] dark:text-white mb-3">Company Profile</h3>
                        <ul className="list-disc list-inside space-y-2.5 text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-300 mb-6">
                            <li><strong>Company Logo</strong> – Upload your logo (PNG or SVG, max 2MB)</li>
                            <li><strong>Company Name</strong> – Your business name</li>
                            <li><strong>Contact Details</strong> – Email, phone, address, website</li>
                        </ul>

                        <h3 className="text-base sm:text-lg font-bold text-[#2d3748] dark:text-white mb-3">Financial Settings</h3>
                        <ul className="list-disc list-inside space-y-2.5 text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-300 mb-6">
                            <li><strong>Currency</strong> – Choose from 45+ world currencies including NGN, USD, GBP, EUR, CAD, AUD, ZAR, KES, INR, JPY, CNY, and many more</li>
                            <li><strong>Default Tax Rate</strong> – Automatically applied to new documents</li>
                            <li><strong>Decimal Places</strong> – Control currency precision (0-4 decimal places)</li>
                            <li><strong>Default Due Date</strong> – Set how many days from invoice date</li>
                        </ul>

                        <h3 className="text-base sm:text-lg font-bold text-[#2d3748] dark:text-white mb-3">Appearance</h3>
                        <ul className="list-disc list-inside space-y-2.5 text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-300 mb-6">
                            <li><strong>Light Mode</strong> – Classic bright interface for daytime use</li>
                            <li><strong>Dark Mode</strong> – Easy on the eyes in low light environments</li>
                            <li><strong>Document Font</strong> – Choose from Inter, DM Sans, Playfair Display, or Courier Prime</li>
                        </ul>

                        <h3 className="text-base sm:text-lg font-bold text-[#2d3748] dark:text-white mb-3">Document Numbering</h3>
                        <ul className="list-disc list-inside space-y-2.5 text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-300">
                            <li><strong>Custom Formats</strong> – Set numbering patterns for invoices, receipts, and delivery notes</li>
                            <li><strong>Placeholders</strong> – Use {'{YYYY}'}, {'{MM}'}, {'{DD}'}, {'{NUM}'} for dates and sequences</li>
                            <li><strong>Preview</strong> – See how your next document number will look</li>
                        </ul>
                    </section>

                    {/* Section 8: Security & Encryption */}
                    <section id="security" className="scroll-mt-4 sm:scroll-mt-8 bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-5 sm:p-7 shadow-xs transition-all">
                        <div className="flex items-center gap-3 mb-5 border-b border-neutral-100 dark:border-neutral-700/60 pb-4">
                            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
                                <Shield className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Section 8</span>
                                <h2 className="text-lg sm:text-xl font-bold text-[#2d3748] dark:text-white">Security & Encryption</h2>
                            </div>
                        </div>

                        <p className="text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-300 mb-6">
                            Refloww takes the security of your financial data seriously. We offer two levels of protection.
                        </p>

                        <h3 className="text-base sm:text-lg font-bold text-[#2d3748] dark:text-white mb-3">Standard Protection (Default)</h3>
                        <ul className="list-disc list-inside space-y-2.5 text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-300 mb-6">
                            <li><strong>Firebase Server-Side Encryption</strong> – All data is encrypted at rest using Google's infrastructure</li>
                            <li><strong>TLS/HTTPS</strong> – Data in transit is encrypted using industry-standard protocols</li>
                            <li><strong>User Isolation</strong> – Your data is stored in your own isolated subcollection</li>
                            <li><strong>No Setup Required</strong> – Enabled automatically for all accounts</li>
                        </ul>

                        <h3 className="text-base sm:text-lg font-bold text-[#2d3748] dark:text-white mb-3">End-to-End Encryption (Optional)</h3>
                        <p className="text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-300 mb-3">
                            For maximum privacy, you can enable client-side encryption. Your data is encrypted in your browser before being sent to the cloud.
                        </p>
                        <ul className="list-disc list-inside space-y-2.5 text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-300 mb-6">
                            <li><strong>Zero-Knowledge</strong> – Only you can read your data, not even we can access it</li>
                            <li><strong>AES-256-GCM</strong> – Military-grade encryption standard used by banks and governments</li>
                            <li><strong>Password-Protected</strong> – Your encryption key is derived from a password only you know</li>
                        </ul>

                        <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 rounded-xl p-4 sm:p-5 mb-6">
                            <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-1.5">
                                <Shield className="w-4 h-4 text-amber-600 shrink-0" />
                                <span>Important Warning for E2EE</span>
                            </h4>
                            <ul className="text-xs sm:text-sm text-amber-700 dark:text-amber-400 space-y-1.5">
                                <li>• If you lose your encryption password, your data <strong>cannot be recovered</strong></li>
                                <li>• There is no password reset option for encrypted data</li>
                                <li>• You are solely responsible for remembering your encryption password</li>
                            </ul>
                        </div>

                        <h3 className="text-base sm:text-lg font-bold text-[#2d3748] dark:text-white mb-3">What Gets Encrypted?</h3>
                        <div className="grid grid-cols-2 gap-2 mb-6">
                            {[
                                'Customer Names & Details',
                                'Product Names & Prices',
                                'Invoice Amounts',
                                'Line Item Details',
                                'Notes & Comments',
                                'Company Information',
                                'Template Images'
                            ].map(item => (
                                <div key={item} className="px-3 py-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-xs sm:text-sm font-medium text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800/50">
                                    ✓ {item}
                                </div>
                            ))}
                        </div>

                        <div className="bg-blue-50/80 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800/80 rounded-xl p-4 sm:p-5">
                            <p className="text-xs sm:text-sm leading-relaxed text-blue-800 dark:text-blue-200">
                                <strong>💡 How to Enable:</strong> Go to Settings → Security → Enable E2EE, then create a strong password you'll remember.
                            </p>
                        </div>
                    </section>

                    {/* Section 9: Keyboard Shortcuts */}
                    <section id="shortcuts" className="scroll-mt-4 sm:scroll-mt-8 bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-5 sm:p-7 shadow-xs transition-all">
                        <div className="flex items-center gap-3 mb-5 border-b border-neutral-100 dark:border-neutral-700/60 pb-4">
                            <div className="p-2.5 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl shrink-0">
                                <Keyboard className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Section 9</span>
                                <h2 className="text-lg sm:text-xl font-bold text-[#2d3748] dark:text-white">Keyboard Shortcuts</h2>
                            </div>
                        </div>

                        <p className="text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-300 mb-6">
                            Work faster with keyboard shortcuts.
                        </p>

                        {/* Navigation Shortcuts */}
                        <h3 className="text-base sm:text-lg font-bold text-[#2d3748] dark:text-white mb-3">Navigation</h3>
                        <div className="space-y-2 mb-6">
                            {[
                                { keys: 'g + h', desc: 'Go to Dashboard (Home)' },
                                { keys: 'g + i', desc: 'Go to Invoices' },
                                { keys: 'g + r', desc: 'Go to Receipts' },
                                { keys: 'g + d', desc: 'Go to Delivery Notes' },
                                { keys: 'g + c', desc: 'Go to Customers' },
                                { keys: 'g + p', desc: 'Go to Products' },
                                { keys: 'g + l', desc: 'Go to Ledger' },
                                { keys: 'g + t', desc: 'Go to Templates' },
                                { keys: 'g + s', desc: 'Go to Settings' },
                            ].map(shortcut => (
                                <div key={shortcut.keys} className="flex items-center justify-between py-2.5 px-3.5 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl">
                                    <span className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300">{shortcut.desc}</span>
                                    <kbd className="px-2 py-1 bg-neutral-200/80 dark:bg-neutral-600 rounded-lg font-mono text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                                        {shortcut.keys}
                                    </kbd>
                                </div>
                            ))}
                        </div>

                        {/* Quick Actions */}
                        <h3 className="text-base sm:text-lg font-bold text-[#2d3748] dark:text-white mb-3">Quick Actions</h3>
                        <div className="space-y-2 mb-6">
                            {[
                                { keys: 'n + i', desc: 'New Invoice' },
                                { keys: 'n + r', desc: 'New Receipt' },
                                { keys: 'n + d', desc: 'New Delivery Note' },
                                { keys: '?', desc: 'Show shortcuts dialog' },
                                { keys: 'Escape', desc: 'Close modal/dialog' },
                            ].map(shortcut => (
                                <div key={shortcut.keys} className="flex items-center justify-between py-2.5 px-3.5 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl">
                                    <span className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300">{shortcut.desc}</span>
                                    <kbd className="px-2 py-1 bg-neutral-200/80 dark:bg-neutral-600 rounded-lg font-mono text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                                        {shortcut.keys}
                                    </kbd>
                                </div>
                            ))}
                        </div>

                        {/* Template Editor - Positioning */}
                        <h3 className="text-base sm:text-lg font-bold text-[#2d3748] dark:text-white mb-3">Template Editor</h3>
                        <div className="space-y-2 mb-6">
                            {[
                                { keys: '↑ ↓ ← →', desc: 'Nudge field by 0.5%' },
                                { keys: 'Shift + Arrow', desc: 'Fine nudge by 0.1%' },
                                { keys: 'Ctrl + C / Ctrl + V', desc: 'Copy / Paste field' },
                                { keys: 'Ctrl + Z / Ctrl + Y', desc: 'Undo / Redo' },
                                { keys: 'Delete / Backspace', desc: 'Delete selected field' }
                            ].map(shortcut => (
                                <div key={shortcut.keys} className="flex items-center justify-between py-2.5 px-3.5 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl">
                                    <span className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300">{shortcut.desc}</span>
                                    <kbd className="px-2 py-1 bg-neutral-200/80 dark:bg-neutral-600 rounded-lg font-mono text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                                        {shortcut.keys}
                                    </kbd>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Section 10: Tips & Best Practices */}
                    <section id="tips" className="scroll-mt-4 sm:scroll-mt-8 bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-5 sm:p-7 shadow-xs transition-all">
                        <div className="flex items-center gap-3 mb-5 border-b border-neutral-100 dark:border-neutral-700/60 pb-4">
                            <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
                                <Lightbulb className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Section 10</span>
                                <h2 className="text-lg sm:text-xl font-bold text-[#2d3748] dark:text-white">Tips & Best Practices</h2>
                            </div>
                        </div>

                        <p className="text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-300 mb-6">
                            Get the most out of Refloww with these expert tips and recommendations.
                        </p>

                        <div className="space-y-4">
                            {[
                                { title: 'Template Design', text: 'Use high-resolution A4 images (595x842px at 72dpi or higher). Leave generous white space around fields for variable-length content.' },
                                { title: 'Customer Database', text: 'Add customer email addresses so you can send document PDFs directly via email.' },
                                { title: 'Product SKUs', text: 'Assign unique SKUs to products for faster search and line item entry when creating invoices.' },
                                { title: 'Regular Exports', text: 'Export your ledger to Excel or CSV monthly for accounting, backup, and tax reporting.' },
                                { title: 'Backup Encryption Key', text: 'If using End-to-End Encryption, keep a copy of your encryption password stored in a secure password manager.' }
                            ].map((tip, idx) => (
                                <div key={idx} className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-700/40 border border-neutral-100 dark:border-neutral-700">
                                    <h4 className="text-sm sm:text-base font-bold text-[#2d3748] dark:text-white mb-1 flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                                        <span>{tip.title}</span>
                                    </h4>
                                    <p className="text-xs sm:text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                                        {tip.text}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>

            {/* Mobile Floating Action Button (FAB) for Help Topics Menu - Accessible at any scroll level */}
            <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="fixed bottom-20 left-4 z-40 md:hidden inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#fc6d2d] hover:bg-[#e05b1f] text-white font-bold text-xs sm:text-sm shadow-xl shadow-orange-500/20 border border-white/20 active:scale-95 transition-all"
                title="Open Help Topics Sidebar"
            >
                <BookOpen className="w-4.5 h-4.5 shrink-0" />
                <span>Help Topics</span>
            </button>

            {/* Mobile Slide-Over Side Bar Drawer (Portal to document.body) */}
            {mounted && isSidebarOpen && createPortal(
                <div className="fixed inset-0 z-[150] md:hidden">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
                        onClick={() => setIsSidebarOpen(false)}
                    />

                    {/* Left Side Bar Panel */}
                    <div className="fixed inset-y-0 left-0 z-[160] w-[300px] max-w-[85vw] bg-white dark:bg-[#121620] shadow-2xl flex flex-col p-4 animate-in slide-in-from-left duration-250 border-r border-neutral-200 dark:border-neutral-800">
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-100 dark:border-neutral-800">
                            <div className="flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-[#fc6d2d]" />
                                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                                    Help Topics
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsSidebarOpen(false)}
                                className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="mb-3">
                            <SearchInput
                                value={searchQuery}
                                onChange={setSearchQuery}
                                placeholder="Search topics..."
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                            {filteredTabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeSection === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => scrollToSection(tab.id)}
                                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-all text-left ${isActive
                                            ? 'bg-orange-50 dark:bg-orange-950/40 text-[#fc6d2d] dark:text-orange-400 font-bold shadow-2xs'
                                            : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                                            <span className="text-xs sm:text-sm truncate">{tab.label}</span>
                                        </div>
                                        {isActive && <Check className="w-4 h-4 text-[#fc6d2d] dark:text-orange-400 shrink-0" />}
                                    </button>
                                );
                            })}
                            {filteredTabs.length === 0 && (
                                <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center py-4">
                                    No topics match "{searchQuery}"
                                </p>
                            )}
                        </div>

                        <div className="mt-auto pt-3 border-t border-neutral-100 dark:border-neutral-800">
                            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-3.5 text-white">
                                <h4 className="text-xs font-bold mb-0.5">Need help?</h4>
                                <p className="text-[11px] text-blue-100 mb-2">Our team is ready to assist you.</p>
                                <a
                                    href="mailto:support@refloww.app"
                                    className="inline-flex items-center justify-center gap-2 w-full py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors"
                                >
                                    <Mail className="w-3.5 h-3.5" />
                                    Email Support
                                </a>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
