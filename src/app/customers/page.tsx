"use client";

import { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useCustomerStore } from '@/lib/store';
import { Customer, CustomerFormData } from '@/lib/types';
import { formatDate, formatPhone, parseCSV, generateCSV, downloadCSV, readFileAsText } from '@/lib/utils';
import { Button, EmptyState, SearchInput, Modal, ModalFooter, Input, Textarea } from '@/components/ui';
import {
    Plus,
    Users,
    Mail,
    Phone,
    MapPin,
    MoreVertical,
    Edit2,
    Trash2,
    FileText,
    ArrowUpDown,
    User,
    Upload,
    Download,
    AlertCircle,
    Check,
    Eye
} from 'lucide-react';

type SortField = 'name' | 'email' | 'createdAt';
type SortOrder = 'asc' | 'desc';

// Generate avatar color based on name
function getAvatarColor(name: string) {
    const colors = [
        'from-blue-400 to-blue-600',
        'from-emerald-400 to-emerald-600',
        'from-purple-400 to-purple-600',
        'from-amber-400 to-amber-600',
        'from-rose-400 to-rose-600',
        'from-cyan-400 to-cyan-600',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
}

// CSV column mapping for customer import
const customerCSVMapping = {
    'name': 'name' as const,
    'full name': 'name' as const,
    'customer name': 'name' as const,
    'email': 'email' as const,
    'email address': 'email' as const,
    'phone': 'phone' as const,
    'phone number': 'phone' as const,
    'telephone': 'phone' as const,
    'address': 'address' as const,
    'notes': 'notes' as const,
};

export default function CustomersPage() {
    const { customers, addCustomer, updateCustomer, deleteCustomer } = useCustomerStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // UI State
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    // Import state
    const [importData, setImportData] = useState<CustomerFormData[]>([]);
    const [importErrors, setImportErrors] = useState<string[]>([]);
    const [importSuccess, setImportSuccess] = useState(false);

    // Form State
    const [formData, setFormData] = useState<CustomerFormData>({
        name: '',
        email: '',
        phone: '',
        address: '',
        notes: '',
    });
    const [formErrors, setFormErrors] = useState<Partial<CustomerFormData>>({});

    // Filter and sort customers
    const filteredCustomers = useMemo(() => {
        let result = customers.filter((customer) => {
            const query = searchQuery.toLowerCase();
            return (
                customer.name.toLowerCase().includes(query) ||
                customer.email.toLowerCase().includes(query) ||
                customer.phone.includes(query) ||
                customer.address.toLowerCase().includes(query)
            );
        });

        result.sort((a, b) => {
            const aVal = a[sortField];
            const bVal = b[sortField];
            const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [customers, searchQuery, sortField, sortOrder]);

    // Handlers
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const openCreateModal = () => {
        setEditingCustomer(null);
        setFormData({ name: '', email: '', phone: '', address: '', notes: '' });
        setFormErrors({});
        setIsModalOpen(true);
    };

    const openEditModal = (customer: Customer) => {
        setEditingCustomer(customer);
        setFormData({
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
            notes: customer.notes || '',
        });
        setFormErrors({});
        setIsModalOpen(true);
        setOpenMenuId(null);
    };

    const openDeleteModal = (customer: Customer) => {
        setCustomerToDelete(customer);
        setIsDeleteModalOpen(true);
        setOpenMenuId(null);
    };

    const validateForm = (): boolean => {
        const errors: Partial<CustomerFormData> = {};

        if (!formData.name.trim()) {
            errors.name = 'Name is required';
        }
        if (!formData.email.trim()) {
            errors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.email = 'Invalid email format';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = () => {
        if (!validateForm()) return;

        if (editingCustomer) {
            updateCustomer(editingCustomer.id, formData);
        } else {
            addCustomer(formData);
        }

        setIsModalOpen(false);
    };

    const handleDelete = () => {
        if (customerToDelete) {
            deleteCustomer(customerToDelete.id);
            setIsDeleteModalOpen(false);
            setCustomerToDelete(null);
        }
    };

    // CSV Import handlers
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await readFileAsText(file);
            const parsed = parseCSV<CustomerFormData>(text, customerCSVMapping);

            // Validate parsed data
            const errors: string[] = [];
            const validData: CustomerFormData[] = [];

            parsed.forEach((row, index) => {
                if (!row.name || typeof row.name !== 'string') {
                    errors.push(`Row ${index + 2}: Missing name`);
                } else if (!row.email || typeof row.email !== 'string') {
                    errors.push(`Row ${index + 2}: Missing email`);
                } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
                    errors.push(`Row ${index + 2}: Invalid email format`);
                } else {
                    validData.push({
                        name: String(row.name || ''),
                        email: String(row.email || ''),
                        phone: String(row.phone || ''),
                        address: String(row.address || ''),
                        notes: String(row.notes || ''),
                    });
                }
            });

            setImportData(validData);
            setImportErrors(errors);
            setImportSuccess(false);
            setIsImportModalOpen(true);
        } catch (error) {
            setImportErrors(['Failed to read file. Please make sure it is a valid CSV file.']);
            setImportData([]);
            setIsImportModalOpen(true);
        }

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleImportConfirm = () => {
        importData.forEach(customer => addCustomer(customer));
        setImportSuccess(true);
    };

    const handleExportCSV = () => {
        const csv = generateCSV(customers, [
            { key: 'name', header: 'Name' },
            { key: 'email', header: 'Email' },
            { key: 'phone', header: 'Phone' },
            { key: 'address', header: 'Address' },
            { key: 'notes', header: 'Notes' },
        ]);
        downloadCSV(csv, `customers-${new Date().toISOString().split('T')[0]}.csv`);
    };

    return (
        <div className="max-w-7xl mx-auto">
            {/* Hidden file input */}
            <input
                type="file"
                ref={fileInputRef}
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
            />

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[#2d3748] dark:text-white">Customers</h1>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                        Manage your client database
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" leftIcon={<Download className="w-4 h-4" />} onClick={handleExportCSV}>
                        Export
                    </Button>
                    <Button variant="outline" leftIcon={<Upload className="w-4 h-4" />} onClick={() => fileInputRef.current?.click()}>
                        Import CSV
                    </Button>
                    <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openCreateModal}>
                        Add Customer
                    </Button>
                </div>
            </div>

            {/* Search and Stats */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search customers by name, email, phone..."
                    className="flex-1 max-w-md"
                />
                <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                        {customers.length} {customers.length === 1 ? 'customer' : 'customers'}
                    </span>
                </div>
            </div>

            {/* Customer List */}
            {customers.length === 0 ? (
                <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-12">
                    <EmptyState
                        icon={<Users className="w-8 h-8 text-neutral-400" strokeWidth={1.5} />}
                        title="No customers yet"
                        description="Add your first customer to start creating personalized documents."
                        action={
                            <div className="flex items-center gap-2">
                                <Button variant="outline" leftIcon={<Upload className="w-4 h-4" />} onClick={() => fileInputRef.current?.click()}>
                                    Import CSV
                                </Button>
                                <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openCreateModal}>
                                    Add Customer
                                </Button>
                            </div>
                        }
                    />
                </div>
            ) : filteredCustomers.length === 0 ? (
                <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-12">
                    <EmptyState
                        title="No customers found"
                        description={`No customers match "${searchQuery}". Try a different search term.`}
                    />
                </div>
            ) : (
                <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-neutral-100 dark:border-neutral-700">
                                <th className="text-left px-6 py-4">
                                    <button
                                        onClick={() => handleSort('name')}
                                        className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                                    >
                                        Customer
                                        <ArrowUpDown className="w-3 h-3" />
                                    </button>
                                </th>
                                <th className="text-left px-6 py-4">
                                    <button
                                        onClick={() => handleSort('email')}
                                        className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                                    >
                                        Contact
                                        <ArrowUpDown className="w-3 h-3" />
                                    </button>
                                </th>
                                <th className="text-left px-6 py-4 hidden lg:table-cell">
                                    <span className="text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                                        Address
                                    </span>
                                </th>
                                <th className="text-left px-6 py-4 hidden md:table-cell">
                                    <button
                                        onClick={() => handleSort('createdAt')}
                                        className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                                    >
                                        Added
                                        <ArrowUpDown className="w-3 h-3" />
                                    </button>
                                </th>
                                <th className="text-right px-6 py-4">
                                    <span className="text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                                        Actions
                                    </span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCustomers.map((customer) => (
                                <tr
                                    key={customer.id}
                                    className="border-b border-neutral-50 dark:border-neutral-700/50 last:border-b-0 hover:bg-neutral-50/50 dark:hover:bg-neutral-700/30 transition-colors"
                                >
                                    <td className="px-6 py-4">
                                        <Link href={`/customers/${customer.id}`} className="flex items-center gap-3 group">
                                            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(customer.name)} flex items-center justify-center text-white font-semibold text-sm flex-shrink-0`}>
                                                {customer.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-medium text-[#2d3748] dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{customer.name}</span>
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-sm text-neutral-600 dark:text-neutral-300">{customer.email}</span>
                                            {customer.phone && (
                                                <span className="text-xs text-neutral-400 dark:text-neutral-500">{formatPhone(customer.phone)}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 hidden lg:table-cell">
                                        {customer.address ? (
                                            <span className="text-sm text-neutral-500 dark:text-neutral-400 truncate block max-w-[200px]">{customer.address}</span>
                                        ) : (
                                            <span className="text-sm text-neutral-400 dark:text-neutral-500">—</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 hidden md:table-cell">
                                        <span className="text-sm text-neutral-500 dark:text-neutral-400">{formatDate(customer.createdAt)}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="relative inline-block">
                                            <button
                                                onClick={() => setOpenMenuId(openMenuId === customer.id ? null : customer.id)}
                                                className="p-2 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                                            >
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                            {openMenuId === customer.id && (
                                                <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 py-1 z-10">
                                                    <Link
                                                        href={`/customers/${customer.id}`}
                                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                        View Details
                                                    </Link>
                                                    <button
                                                        onClick={() => openEditModal(customer)}
                                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                        Edit Customer
                                                    </button>
                                                    <button className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors">
                                                        <FileText className="w-4 h-4" />
                                                        View Documents
                                                    </button>
                                                    <div className="h-px bg-neutral-100 dark:bg-neutral-700 my-1" />
                                                    <button
                                                        onClick={() => openDeleteModal(customer)}
                                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                description={editingCustomer ? 'Update customer information' : 'Add a new customer to your database'}
                size="lg"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Full Name"
                        placeholder="e.g. John Smith"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        error={formErrors.name}
                        leftIcon={<User className="w-4 h-4" />}
                    />
                    <Input
                        label="Email Address"
                        type="email"
                        placeholder="e.g. john@company.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        error={formErrors.email}
                        leftIcon={<Mail className="w-4 h-4" />}
                    />
                    <Input
                        label="Phone Number"
                        type="tel"
                        placeholder="e.g. (555) 123-4567"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        leftIcon={<Phone className="w-4 h-4" />}
                    />
                    <Input
                        label="Address"
                        placeholder="e.g. 123 Main St, City, State"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        leftIcon={<MapPin className="w-4 h-4" />}
                    />
                    <div className="md:col-span-2">
                        <Textarea
                            label="Notes"
                            placeholder="Add any additional notes about this customer..."
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={3}
                        />
                    </div>
                </div>
                <ModalFooter>
                    <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit}>
                        {editingCustomer ? 'Update Customer' : 'Add Customer'}
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Customer"
                size="sm"
            >
                <p className="text-neutral-600">
                    Are you sure you want to delete <strong className="text-[#2d3748]">{customerToDelete?.name}</strong>?
                    This action cannot be undone.
                </p>
                <ModalFooter>
                    <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={handleDelete}>
                        Delete Customer
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Import CSV Modal */}
            <Modal
                isOpen={isImportModalOpen}
                onClose={() => {
                    setIsImportModalOpen(false);
                    setImportData([]);
                    setImportErrors([]);
                    setImportSuccess(false);
                }}
                title="Import Customers from CSV"
                size="lg"
            >
                {importSuccess ? (
                    <div className="text-center py-6">
                        <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                            <Check className="w-8 h-8 text-emerald-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-[#2d3748] mb-2">Import Successful!</h3>
                        <p className="text-neutral-600">
                            {importData.length} customer{importData.length !== 1 ? 's' : ''} have been imported.
                        </p>
                    </div>
                ) : (
                    <>
                        {importErrors.length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-red-800 mb-1">
                                            {importErrors.length} error{importErrors.length !== 1 ? 's' : ''} found
                                        </p>
                                        <ul className="text-xs text-red-700 space-y-0.5">
                                            {importErrors.slice(0, 5).map((error, i) => (
                                                <li key={i}>{error}</li>
                                            ))}
                                            {importErrors.length > 5 && (
                                                <li>...and {importErrors.length - 5} more</li>
                                            )}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}

                        {importData.length > 0 ? (
                            <>
                                <p className="text-sm text-neutral-600 mb-4">
                                    Ready to import {importData.length} customer{importData.length !== 1 ? 's' : ''}:
                                </p>
                                <div className="bg-neutral-50 rounded-xl p-4 max-h-60 overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-neutral-200">
                                                <th className="text-left py-2 text-xs font-medium text-neutral-400">Name</th>
                                                <th className="text-left py-2 text-xs font-medium text-neutral-400">Email</th>
                                                <th className="text-left py-2 text-xs font-medium text-neutral-400 hidden sm:table-cell">Phone</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {importData.slice(0, 10).map((customer, i) => (
                                                <tr key={i} className="border-b border-neutral-100 last:border-b-0">
                                                    <td className="py-2 text-[#2d3748] dark:text-white">{customer.name}</td>
                                                    <td className="py-2 text-neutral-600 dark:text-neutral-300">{customer.email}</td>
                                                    <td className="py-2 text-neutral-500 dark:text-neutral-400 hidden sm:table-cell">{customer.phone || '—'}</td>
                                                </tr>
                                            ))}
                                            {importData.length > 10 && (
                                                <tr>
                                                    <td colSpan={3} className="py-2 text-neutral-400 text-center">
                                                        ...and {importData.length - 10} more
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        ) : (
                            <p className="text-sm text-neutral-500">No valid customers found in the CSV file.</p>
                        )}
                    </>
                )}
                <ModalFooter>
                    <Button variant="ghost" onClick={() => {
                        setIsImportModalOpen(false);
                        setImportData([]);
                        setImportErrors([]);
                        setImportSuccess(false);
                    }}>
                        {importSuccess ? 'Close' : 'Cancel'}
                    </Button>
                    {!importSuccess && importData.length > 0 && (
                        <Button onClick={handleImportConfirm}>
                            Import {importData.length} Customer{importData.length !== 1 ? 's' : ''}
                        </Button>
                    )}
                </ModalFooter>
            </Modal>
        </div>
    );
}
