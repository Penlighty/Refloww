"use client";

import { useState } from 'react';
import {
    HelpCircle,
    FileText,
    Users,
    Package,
    FolderOpen,
    Settings,
    Keyboard,
    ChevronDown,
    ChevronRight,
    BookOpen,
    Lightbulb,
    Rocket,
    Mail,
    MessageCircle,
    Search,
    Download,
    Printer,
    DollarSign,
    Sun,
    Moon
} from 'lucide-react';
import { SearchInput } from '@/components/ui';

interface GuideSection {
    id: string;
    title: string;
    icon: React.ElementType;
    content: React.ReactNode;
}

const guides: GuideSection[] = [
    {
        id: 'getting-started',
        title: 'Getting Started',
        icon: Rocket,
        content: (
            <div className="space-y-4">
                <p>Welcome to <strong>Refloww</strong> – your all-in-one financial documentation manager designed for small to medium businesses.</p>

                <h4 className="font-semibold text-[#2d3748] dark:text-white mt-4">Quick Start Guide</h4>
                <ol className="list-decimal list-inside space-y-2 text-neutral-600 dark:text-neutral-400">
                    <li><strong>Set up your company profile</strong> – Go to Settings and add your business name, logo, and contact details.</li>
                    <li><strong>Upload a template</strong> – Navigate to Templates and upload your invoice, receipt, or delivery note template image.</li>
                    <li><strong>Map your fields</strong> – Use the visual Marquee editor to mark where data should appear on your template.</li>
                    <li><strong>Add customers & products</strong> – Build your database of customers and products for quick document creation.</li>
                    <li><strong>Create your first document</strong> – Go to Invoices, click "New Invoice", and start generating professional documents!</li>
                </ol>

                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-xl p-4 mt-4">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                        <strong>💡 Tip:</strong> Press <kbd className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-800 rounded font-mono text-xs">?</kbd> anytime to see all keyboard shortcuts!
                    </p>
                </div>
            </div>
        ),
    },
    {
        id: 'templates',
        title: 'Managing Templates',
        icon: FolderOpen,
        content: (
            <div className="space-y-4">
                <p>Templates are the foundation of Refloww. They define how your documents look.</p>

                <h4 className="font-semibold text-[#2d3748] dark:text-white mt-4">Uploading Templates</h4>
                <ul className="list-disc list-inside space-y-2 text-neutral-600 dark:text-neutral-400">
                    <li>Supported formats: <strong>PNG, JPG, PDF, SVG</strong></li>
                    <li>Recommended resolution: <strong>A4 size (595×842 pixels)</strong></li>
                    <li>Use high-quality images for best print results</li>
                </ul>

                <h4 className="font-semibold text-[#2d3748] dark:text-white mt-4">Field Mapping (Marquee Editor)</h4>
                <p className="text-neutral-600 dark:text-neutral-400">The Marquee Editor lets you visually define where data appears on your template:</p>
                <ol className="list-decimal list-inside space-y-2 text-neutral-600 dark:text-neutral-400 mt-2">
                    <li>Click and drag to draw a field box on your template</li>
                    <li>Select the field type (e.g., Customer Name, Date, Line Items)</li>
                    <li>Adjust font size, color, and alignment</li>
                    <li>Resize and reposition using the corner handles</li>
                    <li>Save your template when done</li>
                </ol>

                <h4 className="font-semibold text-[#2d3748] dark:text-white mt-4">Available Field Types</h4>
                <div className="grid grid-cols-2 gap-2 mt-2">
                    {[
                        'Document Number', 'Date', 'Due Date', 'Customer Name',
                        'Customer Email', 'Customer Phone', 'Customer Address',
                        'Line Items', 'Subtotal', 'Discount', 'Tax', 'Grand Total', 'Notes', 'Custom Text'
                    ].map(field => (
                        <div key={field} className="px-3 py-2 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg text-sm text-neutral-600 dark:text-neutral-300">
                            {field}
                        </div>
                    ))}
                </div>
            </div>
        ),
    },
    {
        id: 'documents',
        title: 'Creating Documents',
        icon: FileText,
        content: (
            <div className="space-y-4">
                <p>Create professional invoices, receipts, and delivery notes in seconds.</p>

                <h4 className="font-semibold text-[#2d3748] dark:text-white mt-4">Document Types</h4>
                <ul className="list-disc list-inside space-y-2 text-neutral-600 dark:text-neutral-400">
                    <li><strong>Invoices</strong> – Bill your customers with due dates and payment tracking</li>
                    <li><strong>Receipts</strong> – Acknowledge payments received</li>
                    <li><strong>Delivery Notes</strong> – Document goods delivered to customers</li>
                </ul>

                <h4 className="font-semibold text-[#2d3748] dark:text-white mt-4">Creating a New Document</h4>
                <ol className="list-decimal list-inside space-y-2 text-neutral-600 dark:text-neutral-400">
                    <li>Navigate to the document type (e.g., Invoices)</li>
                    <li>Click "New Invoice" button</li>
                    <li>Select a template</li>
                    <li>Choose a customer from your database</li>
                    <li>Add line items (products/services)</li>
                    <li>Apply discounts and taxes as needed</li>
                    <li>Add any notes</li>
                    <li>Click "Create" to save</li>
                </ol>

                <h4 className="font-semibold text-[#2d3748] dark:text-white mt-4">Document Actions</h4>
                <ul className="list-disc list-inside space-y-2 text-neutral-600 dark:text-neutral-400">
                    <li><strong>Edit</strong> – Modify draft documents</li>
                    <li><strong>Duplicate</strong> – Create a copy of an existing document</li>
                    <li><strong>Convert</strong> – Turn an invoice into a receipt or delivery note</li>
                    <li><strong>Download PDF</strong> – Export as high-quality PDF</li>
                    <li><strong>Download PNG</strong> – Export as image</li>
                    <li><strong>Print</strong> – Print directly from your browser</li>
                    <li><strong>Mark as Paid</strong> – Track payment status</li>
                </ul>
            </div>
        ),
    },
    {
        id: 'customers',
        title: 'Managing Customers',
        icon: Users,
        content: (
            <div className="space-y-4">
                <p>Keep track of all your customers in one place.</p>

                <h4 className="font-semibold text-[#2d3748] dark:text-white mt-4">Customer Information</h4>
                <ul className="list-disc list-inside space-y-2 text-neutral-600 dark:text-neutral-400">
                    <li>Name (required)</li>
                    <li>Email address</li>
                    <li>Phone number</li>
                    <li>Billing address</li>
                </ul>

                <h4 className="font-semibold text-[#2d3748] dark:text-white mt-4">Import & Export</h4>
                <p className="text-neutral-600 dark:text-neutral-400">Easily import customers from a CSV file or export your customer list:</p>
                <ul className="list-disc list-inside space-y-2 text-neutral-600 dark:text-neutral-400 mt-2">
                    <li><strong>Import CSV</strong> – Upload a file with columns: name, email, phone, address</li>
                    <li><strong>Export CSV</strong> – Download your entire customer list</li>
                </ul>

                <h4 className="font-semibold text-[#2d3748] dark:text-white mt-4">Customer Details Page</h4>
                <p className="text-neutral-600 dark:text-neutral-400">
                    Click on any customer to see their complete history including all documents, total spent, and pending amounts.
                </p>
            </div>
        ),
    },
    {
        id: 'products',
        title: 'Managing Products',
        icon: Package,
        content: (
            <div className="space-y-4">
                <p>Create a catalog of your products and services for quick access when creating documents.</p>

                <h4 className="font-semibold text-[#2d3748] dark:text-white mt-4">Product Information</h4>
                <ul className="list-disc list-inside space-y-2 text-neutral-600 dark:text-neutral-400">
                    <li>Product name (required)</li>
                    <li>SKU (Stock Keeping Unit)</li>
                    <li>Description</li>
                    <li>Unit price</li>
                </ul>

                <h4 className="font-semibold text-[#2d3748] dark:text-white mt-4">Import & Export</h4>
                <p className="text-neutral-600 dark:text-neutral-400">
                    Like customers, products can be imported from and exported to CSV files.
                </p>

                <h4 className="font-semibold text-[#2d3748] dark:text-white mt-4">Product Analytics</h4>
                <p className="text-neutral-600 dark:text-neutral-400">
                    View product details to see usage statistics including total units sold, revenue generated, and recent documents.
                </p>
            </div>
        ),
    },
    {
        id: 'ledger',
        title: 'Using the Ledger',
        icon: BookOpen,
        content: (
            <div className="space-y-4">
                <p>The Ledger provides a centralized view of all your business transactions.</p>

                <h4 className="font-semibold text-[#2d3748] dark:text-white mt-4">Features</h4>
                <ul className="list-disc list-inside space-y-2 text-neutral-600 dark:text-neutral-400">
                    <li><strong>Search</strong> – Find documents by reference number or customer name</li>
                    <li><strong>Filter by Type</strong> – Show only invoices, receipts, or delivery notes</li>
                    <li><strong>Filter by Status</strong> – Draft, Sent, Paid, Overdue, Cancelled</li>
                    <li><strong>Date Range</strong> – Filter by date using presets or custom range</li>
                    <li><strong>Sort</strong> – Click column headers to sort</li>
                </ul>

                <h4 className="font-semibold text-[#2d3748] dark:text-white mt-4">Exporting Data</h4>
                <ul className="list-disc list-inside space-y-2 text-neutral-600 dark:text-neutral-400">
                    <li><strong>Export to Excel</strong> – Download as .xlsx file</li>
                    <li><strong>Export to CSV</strong> – Download as .csv file</li>
                </ul>
                <p className="text-neutral-600 dark:text-neutral-400 mt-2">
                    Exports respect your current filters, so you can export specific date ranges or document types.
                </p>
            </div>
        ),
    },
    {
        id: 'settings',
        title: 'Settings & Preferences',
        icon: Settings,
        content: (
            <div className="space-y-4">
                <p>Customize Refloww to match your business needs.</p>

                <h4 className="font-semibold text-[#2d3748] dark:text-white mt-4">Company Profile</h4>
                <ul className="list-disc list-inside space-y-2 text-neutral-600 dark:text-neutral-400">
                    <li><strong>Company Logo</strong> – Upload your logo (PNG or SVG, max 2MB)</li>
                    <li><strong>Company Name</strong> – Your business name</li>
                    <li><strong>Contact Details</strong> – Email, phone, address, website</li>
                </ul>

                <h4 className="font-semibold text-[#2d3748] dark:text-white mt-4">Financial Settings</h4>
                <ul className="list-disc list-inside space-y-2 text-neutral-600 dark:text-neutral-400">
                    <li><strong>Currency</strong> – Choose from USD, EUR, GBP, CAD, AUD, NGN, ZAR, KES</li>
                    <li><strong>Default Tax Rate</strong> – Automatically applied to new documents</li>
                </ul>

                <h4 className="font-semibold text-[#2d3748] dark:text-white mt-4">Appearance</h4>
                <ul className="list-disc list-inside space-y-2 text-neutral-600 dark:text-neutral-400">
                    <li><strong>Light Mode</strong> – Classic bright interface</li>
                    <li><strong>Dark Mode</strong> – Easy on the eyes in low light</li>
                    <li><strong>System</strong> – Follows your operating system preference</li>
                </ul>
            </div>
        ),
    },
    {
        id: 'shortcuts',
        title: 'Keyboard Shortcuts',
        icon: Keyboard,
        content: (
            <div className="space-y-4">
                <p>Work faster with keyboard shortcuts.</p>

                <h4 className="font-semibold text-[#2d3748] dark:text-white mt-4">Navigation</h4>
                <div className="space-y-2">
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
                        <div key={shortcut.keys} className="flex items-center justify-between py-2 px-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                            <span className="text-sm text-neutral-600 dark:text-neutral-300">{shortcut.desc}</span>
                            <kbd className="px-2 py-1 bg-neutral-100 dark:bg-neutral-600 rounded font-mono text-xs text-neutral-600 dark:text-neutral-300">
                                {shortcut.keys}
                            </kbd>
                        </div>
                    ))}
                </div>

                <h4 className="font-semibold text-[#2d3748] dark:text-white mt-4">Quick Actions</h4>
                <div className="space-y-2">
                    {[
                        { keys: 'n + i', desc: 'New Invoice' },
                        { keys: 'n + r', desc: 'New Receipt' },
                        { keys: 'n + d', desc: 'New Delivery Note' },
                        { keys: '?', desc: 'Show shortcuts dialog' },
                        { keys: 'Escape', desc: 'Close modal/dialog' },
                    ].map(shortcut => (
                        <div key={shortcut.keys} className="flex items-center justify-between py-2 px-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                            <span className="text-sm text-neutral-600 dark:text-neutral-300">{shortcut.desc}</span>
                            <kbd className="px-2 py-1 bg-neutral-100 dark:bg-neutral-600 rounded font-mono text-xs text-neutral-600 dark:text-neutral-300">
                                {shortcut.keys}
                            </kbd>
                        </div>
                    ))}
                </div>
            </div>
        ),
    },
    {
        id: 'tips',
        title: 'Tips & Best Practices',
        icon: Lightbulb,
        content: (
            <div className="space-y-4">
                <h4 className="font-semibold text-[#2d3748] dark:text-white">Pro Tips</h4>
                <ul className="list-disc list-inside space-y-3 text-neutral-600 dark:text-neutral-400">
                    <li>
                        <strong>Use high-contrast templates</strong> – Dark text on light backgrounds works best for printed documents.
                    </li>
                    <li>
                        <strong>Set up products first</strong> – Having a product catalog makes document creation much faster.
                    </li>
                    <li>
                        <strong>Use the duplicate feature</strong> – For recurring invoices, duplicate an existing one instead of starting from scratch.
                    </li>
                    <li>
                        <strong>Export regularly</strong> – Download your ledger periodically for backup and accounting purposes.
                    </li>
                    <li>
                        <strong>Use keyboard shortcuts</strong> – Press <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-600 rounded font-mono text-xs">g + i</kbd> to quickly jump to invoices.
                    </li>
                    <li>
                        <strong>Check overdue invoices</strong> – The dashboard highlights overdue items that need attention.
                    </li>
                </ul>

                <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-100 dark:border-amber-800 rounded-xl p-4 mt-4">
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                        <strong>⚡ Power User Tip:</strong> Use the convert feature to turn a paid invoice into a receipt instantly!
                    </p>
                </div>
            </div>
        ),
    },
];

export default function HelpPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedSections, setExpandedSections] = useState<string[]>(['getting-started']);

    const toggleSection = (id: string) => {
        setExpandedSections(prev =>
            prev.includes(id)
                ? prev.filter(s => s !== id)
                : [...prev, id]
        );
    };

    const filteredGuides = guides.filter(guide =>
        guide.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-[#2d3748] dark:text-white flex items-center gap-3">
                    <HelpCircle className="w-8 h-8 text-blue-600" />
                    Help Centre
                </h1>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    Everything you need to know about using Refloww
                </p>
            </div>

            {/* Search */}
            <div className="max-w-md">
                <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search help topics..."
                />
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Create Invoice', icon: FileText, href: '/invoices/new' },
                    { label: 'Add Customer', icon: Users, href: '/customers' },
                    { label: 'Upload Template', icon: FolderOpen, href: '/templates' },
                    { label: 'Settings', icon: Settings, href: '/settings' },
                ].map(link => (
                    <a
                        key={link.label}
                        href={link.href}
                        className="flex items-center gap-3 p-4 bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all"
                    >
                        <link.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{link.label}</span>
                    </a>
                ))}
            </div>

            {/* Guide Sections */}
            <div className="space-y-3">
                {filteredGuides.map(guide => {
                    const isExpanded = expandedSections.includes(guide.id);
                    const Icon = guide.icon;

                    return (
                        <div
                            key={guide.id}
                            className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl overflow-hidden"
                        >
                            <button
                                onClick={() => toggleSection(guide.id)}
                                className="w-full flex items-center gap-4 p-5 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
                            >
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                    <Icon className="w-5 h-5" />
                                </div>
                                <span className="flex-1 text-left font-semibold text-[#2d3748] dark:text-white">
                                    {guide.title}
                                </span>
                                {isExpanded ? (
                                    <ChevronDown className="w-5 h-5 text-neutral-400" />
                                ) : (
                                    <ChevronRight className="w-5 h-5 text-neutral-400" />
                                )}
                            </button>
                            {isExpanded && (
                                <div className="px-5 pb-5 text-sm text-neutral-600 dark:text-neutral-400 border-t border-neutral-100 dark:border-neutral-700">
                                    <div className="pt-4">
                                        {guide.content}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Contact Section */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
                <h2 className="text-lg font-bold mb-2">Still need help?</h2>
                <p className="text-blue-100 text-sm mb-4">
                    Can't find what you're looking for? Our support team is here to help.
                </p>
                <div className="flex flex-wrap gap-3">
                    <a href="mailto:support@refloww.app" className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors">
                        <Mail className="w-4 h-4" />
                        Email Support
                    </a>
                    <a href="#" className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors">
                        <MessageCircle className="w-4 h-4" />
                        Live Chat
                    </a>
                </div>
            </div>
        </div>
    );
}
