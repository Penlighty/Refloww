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
    BookOpen,
    Lightbulb,
    Rocket,
    Mail,
    MessageCircle,
    Search,
    Shield
} from 'lucide-react';
import { SearchInput } from '@/components/ui';

type TabId = 'getting-started' | 'templates' | 'documents' | 'customers' | 'products' | 'ledger' | 'settings' | 'security' | 'shortcuts' | 'tips';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
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
    const [activeTab, setActiveTab] = useState<TabId>('getting-started');
    const [searchQuery, setSearchQuery] = useState('');

    // Filter tabs based on search
    const filteredTabs = TABS.filter(tab =>
        tab.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="max-w-6xl mx-auto h-[calc(100vh-140px)] min-h-[600px] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-[#2d3748] dark:text-white flex items-center gap-3">
                        <HelpCircle className="w-8 h-8 text-blue-600" />
                        Help Centre
                    </h1>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                        Everything you need to know about using Refloww
                    </p>
                </div>
            </div>

            <div className="flex-1 flex gap-8 overflow-hidden">
                {/* Sidebar Navigation */}
                <div className="w-64 flex-shrink-0 flex flex-col gap-1">
                    {/* Search */}
                    <div className="mb-4">
                        <SearchInput
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="Search topics..."
                        />
                    </div>

                    {/* Tab List */}
                    <div className="flex flex-col gap-1 overflow-y-auto">
                        {filteredTabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${isActive
                                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                                        }`}
                                >
                                    <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={isActive ? 2 : 1.75} />
                                    <span className="text-sm">{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Contact Card */}
                    <div className="mt-auto pt-4 border-t border-neutral-100 dark:border-neutral-700">
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
                            <h3 className="text-sm font-bold mb-1">Need more help?</h3>
                            <p className="text-xs text-blue-100 mb-3">Our support team is here for you.</p>
                            <div className="flex flex-col gap-2">
                                <a href="mailto:support@refloww.app" className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors">
                                    <Mail className="w-3.5 h-3.5" />
                                    Email Support
                                </a>
                                <a href="#" className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors">
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    Live Chat
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto pr-2 pb-10">
                    {/* Getting Started */}
                    {activeTab === 'getting-started' && (
                        <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-right-4 duration-300">
                            <section className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                        <Rocket className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-[#2d3748] dark:text-white">Welcome to Refloww</h2>
                                </div>

                                <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                                    Welcome to <strong>Refloww</strong> – your all-in-one financial documentation manager designed for small to medium businesses.
                                </p>

                                <h4 className="font-semibold text-[#2d3748] dark:text-white mb-3">Quick Start Guide</h4>
                                <ol className="list-decimal list-inside space-y-3 text-neutral-600 dark:text-neutral-400">
                                    <li><strong>Set up your company profile</strong> – Go to Settings and add your business name, logo, and contact details.</li>
                                    <li><strong>Upload a template</strong> – Navigate to Templates and upload your invoice, receipt, or delivery note template image.</li>
                                    <li><strong>Map your fields</strong> – Use the visual Marquee editor to mark where data should appear on your template.</li>
                                    <li><strong>Add customers & products</strong> – Build your database of customers and products for quick document creation.</li>
                                    <li><strong>Create your first document</strong> – Go to Invoices, click "New Invoice", and start generating professional documents!</li>
                                </ol>

                                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-xl p-4 mt-6">
                                    <p className="text-sm text-blue-700 dark:text-blue-300">
                                        <strong>💡 Tip:</strong> Press <kbd className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-800 rounded font-mono text-xs">?</kbd> anytime to see all keyboard shortcuts!
                                    </p>
                                </div>
                            </section>
                        </div>
                    )}

                    {/* Managing Templates */}
                    {activeTab === 'templates' && (
                        <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-right-4 duration-300">
                            <section className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                                        <FolderOpen className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-[#2d3748] dark:text-white">Managing Templates</h2>
                                </div>

                                <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                                    Templates are the foundation of Refloww. They define how your documents look.
                                </p>

                                <h4 className="font-semibold text-[#2d3748] dark:text-white mb-3">Uploading Templates</h4>
                                <ul className="list-disc list-inside space-y-2 text-neutral-600 dark:text-neutral-400 mb-6">
                                    <li>Supported formats: <strong>PNG, JPG, PDF, SVG</strong></li>
                                    <li>Recommended resolution: <strong>A4 size (595×842 pixels)</strong></li>
                                    <li>Use high-quality images for best print results</li>
                                </ul>

                                <h4 className="font-semibold text-[#2d3748] dark:text-white mb-3">Field Mapping (Marquee Editor)</h4>
                                <p className="text-neutral-600 dark:text-neutral-400 mb-3">The Marquee Editor lets you visually define where data appears on your template:</p>
                                <ol className="list-decimal list-inside space-y-2 text-neutral-600 dark:text-neutral-400 mb-6">
                                    <li>Click and drag to draw a field box on your template</li>
                                    <li>Select the field type (e.g., Customer Name, Date, Line Items)</li>
                                    <li>Adjust font size, color, and alignment</li>
                                    <li>Resize and reposition using the corner handles</li>
                                    <li>Save your template when done</li>
                                </ol>

                                <h4 className="font-semibold text-[#2d3748] dark:text-white mb-3">Available Field Types</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        'Document Number', 'Date', 'Due Date', 'Customer Name',
                                        'Customer Email', 'Customer Phone', 'Customer Address',
                                        'Line Items', 'Subtotal', 'Discount', 'Discount Name', 'Tax',
                                        'Grand Total', 'Amount Paid', 'Amount Due', 'Amount in Words',
                                        'Notes', 'Link Button', 'Custom Text'
                                    ].map(field => (
                                        <div key={field} className="px-3 py-2 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg text-sm text-neutral-600 dark:text-neutral-300">
                                            {field}
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 rounded-xl p-4 mt-6">
                                    <p className="text-sm text-emerald-700 dark:text-emerald-300">
                                        <strong>💡 Connected Templates:</strong> You can link multiple document types (Invoice, Receipt, Delivery Note) to a single template for consistent branding.
                                    </p>
                                </div>
                            </section>
                        </div>
                    )}

                    {/* Creating Documents */}
                    {activeTab === 'documents' && (
                        <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-right-4 duration-300">
                            <section className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-lg">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-[#2d3748] dark:text-white">Creating Documents</h2>
                                </div>

                                <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                                    Create professional invoices, receipts, and delivery notes in seconds.
                                </p>

                                <h4 className="font-semibold text-[#2d3748] dark:text-white mb-3">Document Types</h4>
                                <ul className="list-disc list-inside space-y-2 text-neutral-600 dark:text-neutral-400 mb-6">
                                    <li><strong>Invoices</strong> – Bill your customers with due dates and payment tracking</li>
                                    <li><strong>Receipts</strong> – Acknowledge payments received</li>
                                    <li><strong>Delivery Notes</strong> – Document goods delivered to customers</li>
                                </ul>

                                <h4 className="font-semibold text-[#2d3748] dark:text-white mb-3">Creating a New Document</h4>
                                <ol className="list-decimal list-inside space-y-2 text-neutral-600 dark:text-neutral-400 mb-6">
                                    <li>Navigate to the document type (e.g., Invoices)</li>
                                    <li>Click "New Invoice" button</li>
                                    <li>Select a template</li>
                                    <li>Choose a customer from your database</li>
                                    <li>Add line items (products/services)</li>
                                    <li>Apply discounts and taxes as needed</li>
                                    <li>Add any notes</li>
                                    <li>Click "Create" to save</li>
                                </ol>

                                <h4 className="font-semibold text-[#2d3748] dark:text-white mb-3">Document Actions</h4>
                                <ul className="list-disc list-inside space-y-2 text-neutral-600 dark:text-neutral-400">
                                    <li><strong>Edit</strong> – Modify draft documents</li>
                                    <li><strong>Duplicate</strong> – Create a copy of an existing document</li>
                                    <li><strong>Convert</strong> – Turn an invoice into a receipt or delivery note</li>
                                    <li><strong>Download PDF</strong> – Export as high-quality PDF</li>
                                    <li><strong>Download PNG</strong> – Export as image</li>
                                    <li><strong>Print</strong> – Print directly from your browser</li>
                                    <li><strong>Mark as Paid</strong> – Track payment status</li>
                                </ul>
                            </section>
                        </div>
                    )}

                    {/* Managing Customers */}
                    {activeTab === 'customers' && (
                        <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-right-4 duration-300">
                            <section className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-lg">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-[#2d3748] dark:text-white">Managing Customers</h2>
                                </div>

                                <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                                    Keep track of all your customers in one place.
                                </p>

                                <h4 className="font-semibold text-[#2d3748] dark:text-white mb-3">Customer Information</h4>
                                <ul className="list-disc list-inside space-y-2 text-neutral-600 dark:text-neutral-400 mb-6">
                                    <li>Name (required)</li>
                                    <li>Email address</li>
                                    <li>Phone number</li>
                                    <li>Billing address</li>
                                </ul>

                                <h4 className="font-semibold text-[#2d3748] dark:text-white mb-3">Import & Export</h4>
                                <p className="text-neutral-600 dark:text-neutral-400 mb-3">Easily import customers from a CSV file or export your customer list:</p>
                                <ul className="list-disc list-inside space-y-2 text-neutral-600 dark:text-neutral-400 mb-6">
                                    <li><strong>Import CSV</strong> – Upload a file with columns: name, email, phone, address</li>
                                    <li><strong>Export CSV</strong> – Download your entire customer list</li>
                                </ul>

                                <h4 className="font-semibold text-[#2d3748] dark:text-white mb-3">Customer Details Page</h4>
                                <p className="text-neutral-600 dark:text-neutral-400">
                                    Click on any customer to see their complete history including all documents, total spent, and pending amounts.
                                </p>
                            </section>
                        </div>
                    )}

                    {/* Managing Products */}
                    {activeTab === 'products' && (
                        <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-right-4 duration-300">
                            <section className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg">
                                        <Package className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-[#2d3748] dark:text-white">Managing Products</h2>
                                </div>

                                <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                                    Create a catalog of your products and services for quick access when creating documents.
                                </p>

                                <h4 className="font-semibold text-[#2d3748] dark:text-white mb-3">Product Information</h4>
                                <ul className="list-disc list-inside space-y-2 text-neutral-600 dark:text-neutral-400 mb-6">
                                    <li>Product name (required)</li>
                                    <li>SKU (Stock Keeping Unit)</li>
                                    <li>Description</li>
                                    <li>Unit price</li>
                                </ul>

                                <h4 className="font-semibold text-[#2d3748] dark:text-white mb-3">Import & Export</h4>
                                <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                                    Like customers, products can be imported from and exported to CSV files.
                                </p>

                                <h4 className="font-semibold text-[#2d3748] dark:text-white mb-3">Product Analytics</h4>
                                <p className="text-neutral-600 dark:text-neutral-400">
                                    View product details to see usage statistics including total units sold, revenue generated, and recent documents.
                                </p>
                            </section>
                        </div>
                    )}

                    {/* Using the Ledger */}
                    {activeTab === 'ledger' && (
                        <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-right-4 duration-300">
                            <section className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                        <BookOpen className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-[#2d3748] dark:text-white">Using the Ledger</h2>
                                </div>

                                <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                                    The Ledger provides a centralized view of all your business transactions.
                                </p>

                                <h4 className="font-semibold text-[#2d3748] dark:text-white mb-3">Features</h4>
                                <ul className="list-disc list-inside space-y-2 text-neutral-600 dark:text-neutral-400 mb-6">
                                    <li><strong>Search</strong> – Find documents by reference number or customer name</li>
                                    <li><strong>Filter by Type</strong> – Show only invoices, receipts, or delivery notes</li>
                                    <li><strong>Filter by Status</strong> – Draft, Sent, Paid, Overdue, Cancelled</li>
                                    <li><strong>Date Range</strong> – Filter by date using presets or custom range</li>
                                    <li><strong>Sort</strong> – Click column headers to sort</li>
                                </ul>

                                <h4 className="font-semibold text-[#2d3748] dark:text-white mb-3">Exporting Data</h4>
                                <ul className="list-disc list-inside space-y-2 text-neutral-600 dark:text-neutral-400 mb-3">
                                    <li><strong>Export to Excel</strong> – Download as .xlsx file</li>
                                    <li><strong>Export to CSV</strong> – Download as .csv file</li>
                                </ul>
                                <p className="text-neutral-600 dark:text-neutral-400">
                                    Exports respect your current filters, so you can export specific date ranges or document types.
                                </p>
                            </section>
                        </div>
                    )}

                    {/* Settings & Preferences */}
                    {activeTab === 'settings' && (
                        <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-right-4 duration-300">
                            <section className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 rounded-lg">
                                        <Settings className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-[#2d3748] dark:text-white">Settings & Preferences</h2>
                                </div>

                                <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                                    Customize Refloww to match your business needs.
                                </p>

                                <h4 className="font-semibold text-[#2d3748] dark:text-white mb-3">Company Profile</h4>
                                <ul className="list-disc list-inside space-y-2 text-neutral-600 dark:text-neutral-400 mb-6">
                                    <li><strong>Company Logo</strong> – Upload your logo (PNG or SVG, max 2MB)</li>
                                    <li><strong>Company Name</strong> – Your business name</li>
                                    <li><strong>Contact Details</strong> – Email, phone, address, website</li>
                                </ul>

                                <h4 className="font-semibold text-[#2d3748] dark:text-white mb-3">Financial Settings</h4>
                                <ul className="list-disc list-inside space-y-2 text-neutral-600 dark:text-neutral-400 mb-6">
                                    <li><strong>Currency</strong> – Choose from 45+ world currencies including NGN, USD, GBP, EUR, CAD, AUD, ZAR, KES, INR, JPY, CNY, and many more</li>
                                    <li><strong>Default Tax Rate</strong> – Automatically applied to new documents</li>
                                    <li><strong>Decimal Places</strong> – Control currency precision (0-4 decimal places)</li>
                                    <li><strong>Default Due Date</strong> – Set how many days from invoice date</li>
                                </ul>

                                <h4 className="font-semibold text-[#2d3748] dark:text-white mb-3">Appearance</h4>
                                <ul className="list-disc list-inside space-y-2 text-neutral-600 dark:text-neutral-400 mb-6">
                                    <li><strong>Light Mode</strong> – Classic bright interface for daytime use</li>
                                    <li><strong>Dark Mode</strong> – Easy on the eyes in low light environments</li>
                                    <li><strong>Document Font</strong> – Choose from Inter, DM Sans, Playfair Display, or Courier Prime</li>
                                </ul>

                                <h4 className="font-semibold text-[#2d3748] dark:text-white mb-3">Document Numbering</h4>
                                <ul className="list-disc list-inside space-y-2 text-neutral-600 dark:text-neutral-400">
                                    <li><strong>Custom Formats</strong> – Set numbering patterns for invoices, receipts, and delivery notes</li>
                                    <li><strong>Placeholders</strong> – Use {'{YYYY}'}, {'{MM}'}, {'{DD}'}, {'{NUM}'} for dates and sequences</li>
                                    <li><strong>Preview</strong> – See how your next document number will look</li>
                                </ul>
                            </section>
                        </div>
                    )}

                    {/* Security & Encryption */}
                    {activeTab === 'security' && (
                        <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-right-4 duration-300">
                            <section className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                                        <Shield className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-[#2d3748] dark:text-white">Security & Encryption</h2>
                                </div>

                                <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                                    Refloww takes the security of your financial data seriously. We offer two levels of protection.
                                </p>

                                <h4 className="font-semibold text-[#2d3748] dark:text-white mb-3">Standard Protection (Default)</h4>
                                <ul className="list-disc list-inside space-y-2 text-neutral-600 dark:text-neutral-400 mb-6">
                                    <li><strong>Firebase Server-Side Encryption</strong> – All data is encrypted at rest using Google's infrastructure</li>
                                    <li><strong>TLS/HTTPS</strong> – Data in transit is encrypted using industry-standard protocols</li>
                                    <li><strong>User Isolation</strong> – Your data is stored in your own isolated subcollection</li>
                                    <li><strong>No Setup Required</strong> – Enabled automatically for all accounts</li>
                                </ul>

                                <h4 className="font-semibold text-[#2d3748] dark:text-white mb-3">End-to-End Encryption (Optional)</h4>
                                <p className="text-neutral-600 dark:text-neutral-400 mb-3">
                                    For maximum privacy, you can enable client-side encryption. Your data is encrypted in your browser before being sent to the cloud.
                                </p>
                                <ul className="list-disc list-inside space-y-2 text-neutral-600 dark:text-neutral-400 mb-6">
                                    <li><strong>Zero-Knowledge</strong> – Only you can read your data, not even we can access it</li>
                                    <li><strong>AES-256-GCM</strong> – Military-grade encryption standard used by banks and governments</li>
                                    <li><strong>Password-Protected</strong> – Your encryption key is derived from a password only you know</li>
                                </ul>

                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
                                    <h5 className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-1.5">
                                        <Shield className="w-4 h-4 text-amber-600" />
                                        <span>Important Warning for E2EE</span>
                                    </h5>
                                    <ul className="text-xs text-amber-600 dark:text-amber-400 space-y-1">
                                        <li>• If you lose your encryption password, your data <strong>cannot be recovered</strong></li>
                                        <li>• There is no password reset option for encrypted data</li>
                                        <li>• You are solely responsible for remembering your encryption password</li>
                                    </ul>
                                </div>

                                <h4 className="font-semibold text-[#2d3748] dark:text-white mb-3">What Gets Encrypted?</h4>
                                <p className="text-neutral-600 dark:text-neutral-400 mb-3">
                                    When E2EE is enabled, all sensitive financial data is encrypted:
                                </p>
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
                                        <div key={item} className="px-3 py-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-sm text-emerald-700 dark:text-emerald-300">
                                            ✓ {item}
                                        </div>
                                    ))}
                                </div>

                                <h4 className="font-semibold text-[#2d3748] dark:text-white mb-3">What Stays Unencrypted?</h4>
                                <p className="text-neutral-600 dark:text-neutral-400 mb-3">
                                    Some metadata remains unencrypted to allow filtering, sorting, and app functionality:
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        'Document IDs',
                                        'Document Type',
                                        'Status (Paid/Unpaid)',
                                        'Dates & Timestamps'
                                    ].map(item => (
                                        <div key={item} className="px-3 py-2 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg text-sm text-neutral-600 dark:text-neutral-300">
                                            {item}
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mt-6">
                                    <p className="text-sm text-blue-700 dark:text-blue-300">
                                        <strong>💡 How to Enable:</strong> Go to Settings → Security → Enable E2EE, then create a strong password you'll remember.
                                    </p>
                                </div>
                            </section>
                        </div>
                    )}

                    {/* Keyboard Shortcuts */}
                    {activeTab === 'shortcuts' && (
                        <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-right-4 duration-300">
                            <section className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                                        <Keyboard className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-[#2d3748] dark:text-white">Keyboard Shortcuts</h2>
                                </div>

                                <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                                    Work faster with keyboard shortcuts.
                                </p>

                                {/* Navigation Shortcuts */}
                                <h4 className="font-semibold text-[#2d3748] dark:text-white mb-3">Navigation</h4>
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
                                        <div key={shortcut.keys} className="flex items-center justify-between py-2 px-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                                            <span className="text-sm text-neutral-600 dark:text-neutral-300">{shortcut.desc}</span>
                                            <kbd className="px-2 py-1 bg-neutral-100 dark:bg-neutral-600 rounded font-mono text-xs text-neutral-600 dark:text-neutral-300">
                                                {shortcut.keys}
                                            </kbd>
                                        </div>
                                    ))}
                                </div>

                                {/* Quick Actions */}
                                <h4 className="font-semibold text-[#2d3748] dark:text-white mb-3">Quick Actions</h4>
                                <div className="space-y-2 mb-6">
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

                                {/* Template Editor - Positioning */}
                                <h4 className="font-semibold text-[#2d3748] dark:text-white mb-3">Template Editor - Field Positioning</h4>
                                <div className="space-y-2 mb-6">
                                    {[
                                        { keys: '↑ ↓ ← →', desc: 'Nudge field by 0.5%' },
                                        { keys: 'Shift + Arrow', desc: 'Fine nudge by 0.1%' },
                                    ].map(shortcut => (
                                        <div key={shortcut.keys} className="flex items-center justify-between py-2 px-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                                            <span className="text-sm text-neutral-600 dark:text-neutral-300">{shortcut.desc}</span>
                                            <kbd className="px-2 py-1 bg-neutral-100 dark:bg-neutral-600 rounded font-mono text-xs text-neutral-600 dark:text-neutral-300">
                                                {shortcut.keys}
                                            </kbd>
                                        </div>
                                    ))}
                                </div>

                                {/* Template Editor - Editing */}
                                <h4 className="font-semibold text-[#2d3748] dark:text-white mb-3">Template Editor - Editing</h4>
                                <div className="space-y-2 mb-6">
                                    {[
                                        { keys: 'Ctrl + C', desc: 'Copy selected field' },
                                        { keys: 'Ctrl + V', desc: 'Paste copied field' },
                                        { keys: 'Ctrl + D', desc: 'Duplicate selected field' },
                                        { keys: 'Ctrl + Z', desc: 'Undo' },
                                        { keys: 'Ctrl + Y', desc: 'Redo' },
                                        { keys: 'Ctrl + Shift + Z', desc: 'Redo (alternative)' },
                                        { keys: 'Delete / Backspace', desc: 'Delete selected field' },
                                        { keys: 'Escape', desc: 'Deselect field' },
                                    ].map(shortcut => (
                                        <div key={shortcut.keys} className="flex items-center justify-between py-2 px-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                                            <span className="text-sm text-neutral-600 dark:text-neutral-300">{shortcut.desc}</span>
                                            <kbd className="px-2 py-1 bg-neutral-100 dark:bg-neutral-600 rounded font-mono text-xs text-neutral-600 dark:text-neutral-300">
                                                {shortcut.keys}
                                            </kbd>
                                        </div>
                                    ))}
                                </div>

                                {/* Template Editor - Tools */}
                                <h4 className="font-semibold text-[#2d3748] dark:text-white mb-3">Template Editor - Tools</h4>
                                <div className="space-y-2 mb-6">
                                    {[
                                        { keys: 'V', desc: 'Switch to Select tool' },
                                        { keys: 'D', desc: 'Switch to Draw tool' },
                                        { keys: 'P', desc: 'Toggle Preview mode' },
                                    ].map(shortcut => (
                                        <div key={shortcut.keys} className="flex items-center justify-between py-2 px-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                                            <span className="text-sm text-neutral-600 dark:text-neutral-300">{shortcut.desc}</span>
                                            <kbd className="px-2 py-1 bg-neutral-100 dark:bg-neutral-600 rounded font-mono text-xs text-neutral-600 dark:text-neutral-300">
                                                {shortcut.keys}
                                            </kbd>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-xl p-4">
                                    <p className="text-sm text-blue-700 dark:text-blue-300">
                                        <strong>💡 Tip:</strong> On Mac, use <kbd className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-800 rounded font-mono text-xs">⌘</kbd> (Command) instead of <kbd className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-800 rounded font-mono text-xs">Ctrl</kbd>.
                                    </p>
                                </div>
                            </section>
                        </div>
                    )}

                    {/* Tips & Best Practices */}
                    {activeTab === 'tips' && (
                        <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-right-4 duration-300">
                            <section className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
                                        <Lightbulb className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-[#2d3748] dark:text-white">Tips & Best Practices</h2>
                                </div>

                                <h4 className="font-semibold text-[#2d3748] dark:text-white mb-3">Pro Tips</h4>
                                <ul className="list-disc list-inside space-y-3 text-neutral-600 dark:text-neutral-400 mb-6">
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
                                        <strong>Nudge for precision</strong> – Use arrow keys to fine-tune field positions in the template editor.
                                    </li>
                                    <li>
                                        <strong>Connected templates</strong> – Link Invoice, Receipt, and Delivery Note layouts to one template for consistent branding.
                                    </li>
                                </ul>

                                <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-100 dark:border-amber-800 rounded-xl p-4">
                                    <p className="text-sm text-amber-700 dark:text-amber-300">
                                        <strong>Power User Tip:</strong> Use the convert feature to turn a paid invoice into a receipt instantly!
                                    </p>
                                </div>

                                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-xl p-4 mt-3">
                                    <p className="text-sm text-blue-700 dark:text-blue-300">
                                        <strong>🎯 Template Editor:</strong> Use <kbd className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-800 rounded font-mono text-xs">Ctrl+D</kbd> to quickly duplicate fields, and <kbd className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-800 rounded font-mono text-xs">Shift+Arrow</kbd> for fine nudging.
                                    </p>
                                </div>
                            </section>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
