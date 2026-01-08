"use client";

import { useParams, useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useCustomerStore, useDocumentStore, useSettingsStore } from '@/lib/store';
import { formatDate, formatPhone, formatCurrency } from '@/lib/utils';
import { Button, Card, Modal, ModalFooter, Input, Textarea, EmptyState } from '@/components/ui';
import { DocumentStatus } from '@/lib/types';
import {
    ArrowLeft,
    User,
    Mail,
    Phone,
    MapPin,
    Edit2,
    Trash2,
    FileText,
    Receipt,
    Truck,
    Calendar,
    DollarSign,
    MoreVertical
} from 'lucide-react';

export default function CustomerDetailPage() {
    const params = useParams();
    const router = useRouter();
    const customerId = params.id as string;

    const { customers, updateCustomer, deleteCustomer } = useCustomerStore();
    const { documents } = useDocumentStore();
    const { company } = useSettingsStore();
    const currency = company.currency;

    const customer = customers.find(c => c.id === customerId);

    // UI State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: customer?.name || '',
        email: customer?.email || '',
        phone: customer?.phone || '',
        address: customer?.address || '',
        notes: customer?.notes || '',
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    // Get customer's documents
    const customerDocuments = useMemo(() => {
        return documents.filter(doc => doc.customerId === customerId);
    }, [documents, customerId]);

    // Calculate stats
    const stats = useMemo(() => {
        const totalSpent = customerDocuments
            .filter(d => d.status === 'paid')
            .reduce((sum, d) => sum + d.grandTotal, 0);
        const pendingAmount = customerDocuments
            .filter(d => d.status === 'sent' || d.status === 'overdue')
            .reduce((sum, d) => sum + d.grandTotal, 0);
        const invoiceCount = customerDocuments.filter(d => d.type === 'invoice').length;
        const receiptCount = customerDocuments.filter(d => d.type === 'receipt').length;

        return { totalSpent, pendingAmount, invoiceCount, receiptCount };
    }, [customerDocuments]);

    // Document type config
    const docTypeConfig = {
        'invoice': { icon: FileText, label: 'Invoice', bgClass: 'bg-blue-50', textClass: 'text-blue-600' },
        'receipt': { icon: Receipt, label: 'Receipt', bgClass: 'bg-emerald-50', textClass: 'text-emerald-600' },
        'delivery-note': { icon: Truck, label: 'Delivery Note', bgClass: 'bg-amber-50', textClass: 'text-amber-600' },
    };

    const statusConfig = {
        'paid': { label: 'Paid', bgClass: 'bg-emerald-50', textClass: 'text-emerald-600', dotClass: 'bg-emerald-500' },
        'draft': { label: 'Draft', bgClass: 'bg-neutral-100', textClass: 'text-neutral-600', dotClass: 'bg-neutral-400' },
        'sent': { label: 'Sent', bgClass: 'bg-blue-50', textClass: 'text-blue-600', dotClass: 'bg-blue-500' },
        'overdue': { label: 'Overdue', bgClass: 'bg-red-50', textClass: 'text-red-600', dotClass: 'bg-red-500' },
        'cancelled': { label: 'Cancelled', bgClass: 'bg-neutral-100', textClass: 'text-neutral-500', dotClass: 'bg-neutral-400' },
    };

    if (!customer) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="bg-white border border-neutral-100 rounded-2xl p-12">
                    <EmptyState
                        icon={<User className="w-8 h-8 text-neutral-400" strokeWidth={1.5} />}
                        title="Customer not found"
                        description="The customer you're looking for doesn't exist or has been deleted."
                        action={
                            <Button onClick={() => router.push('/customers')}>
                                Back to Customers
                            </Button>
                        }
                    />
                </div>
            </div>
        );
    }

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};
        if (!formData.name.trim()) errors.name = 'Name is required';
        if (!formData.email.trim()) errors.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Invalid email format';
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleUpdate = () => {
        if (!validateForm()) return;
        updateCustomer(customerId, formData);
        setIsEditModalOpen(false);
    };

    const handleDelete = () => {
        deleteCustomer(customerId);
        router.push('/customers');
    };

    const openEditModal = () => {
        setFormData({
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
            notes: customer.notes || '',
        });
        setFormErrors({});
        setIsEditModalOpen(true);
    };

    return (
        <div className="max-w-6xl mx-auto">
            {/* Back Link */}
            <Link
                href="/customers"
                className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-[#2d3748] transition-colors mb-6"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Customers
            </Link>

            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                        {customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-[#2d3748]">{customer.name}</h1>
                        <p className="text-sm text-neutral-500 mt-1">
                            Customer since {formatDate(customer.createdAt)}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" leftIcon={<Edit2 className="w-4 h-4" />} onClick={openEditModal}>
                        Edit
                    </Button>
                    <Button variant="danger" leftIcon={<Trash2 className="w-4 h-4" />} onClick={() => setIsDeleteModalOpen(true)}>
                        Delete
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Contact Info */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Contact Details Card */}
                    <div className="bg-white border border-neutral-100 rounded-2xl p-6">
                        <h3 className="text-sm font-semibold text-[#2d3748] mb-4">Contact Information</h3>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-neutral-100 text-neutral-500">
                                    <Mail className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs text-neutral-400 mb-0.5">Email</p>
                                    <a href={`mailto:${customer.email}`} className="text-sm text-[#2d3748] hover:text-blue-600 transition-colors">
                                        {customer.email}
                                    </a>
                                </div>
                            </div>
                            {customer.phone && (
                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-lg bg-neutral-100 text-neutral-500">
                                        <Phone className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-neutral-400 mb-0.5">Phone</p>
                                        <a href={`tel:${customer.phone}`} className="text-sm text-[#2d3748] hover:text-blue-600 transition-colors">
                                            {formatPhone(customer.phone)}
                                        </a>
                                    </div>
                                </div>
                            )}
                            {customer.address && (
                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-lg bg-neutral-100 text-neutral-500">
                                        <MapPin className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-neutral-400 mb-0.5">Address</p>
                                        <p className="text-sm text-[#2d3748]">{customer.address}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        {customer.notes && (
                            <div className="mt-6 pt-4 border-t border-neutral-100">
                                <p className="text-xs text-neutral-400 mb-2">Notes</p>
                                <p className="text-sm text-neutral-600">{customer.notes}</p>
                            </div>
                        )}
                    </div>

                    {/* Stats Card */}
                    <div className="bg-white border border-neutral-100 rounded-2xl p-6">
                        <h3 className="text-sm font-semibold text-[#2d3748] mb-4">Statistics</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-neutral-50 rounded-xl">
                                <p className="text-xs text-neutral-400 mb-1">Total Spent</p>
                                <p className="text-lg font-bold text-[#2d3748]">{formatCurrency(stats.totalSpent, currency)}</p>
                            </div>
                            <div className="p-3 bg-neutral-50 rounded-xl">
                                <p className="text-xs text-neutral-400 mb-1">Pending</p>
                                <p className="text-lg font-bold text-amber-600">{formatCurrency(stats.pendingAmount, currency)}</p>
                            </div>
                            <div className="p-3 bg-neutral-50 rounded-xl">
                                <p className="text-xs text-neutral-400 mb-1">Invoices</p>
                                <p className="text-lg font-bold text-[#2d3748]">{stats.invoiceCount}</p>
                            </div>
                            <div className="p-3 bg-neutral-50 rounded-xl">
                                <p className="text-xs text-neutral-400 mb-1">Receipts</p>
                                <p className="text-lg font-bold text-[#2d3748]">{stats.receiptCount}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Documents */}
                <div className="lg:col-span-2">
                    <div className="bg-white border border-neutral-100 rounded-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-[#2d3748]">Documents</h3>
                            <Button size="sm" leftIcon={<FileText className="w-3.5 h-3.5" />}>
                                New Document
                            </Button>
                        </div>

                        {customerDocuments.length === 0 ? (
                            <div className="p-12">
                                <EmptyState
                                    icon={<FileText className="w-8 h-8 text-neutral-400" strokeWidth={1.5} />}
                                    title="No documents yet"
                                    description="Create your first document for this customer."
                                />
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-neutral-100">
                                        <th className="text-left px-6 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">Document</th>
                                        <th className="text-left px-6 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">Date</th>
                                        <th className="text-left px-6 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">Status</th>
                                        <th className="text-right px-6 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customerDocuments.map((doc) => {
                                        const TypeIcon = docTypeConfig[doc.type].icon;
                                        return (
                                            <tr key={doc.id} className="border-b border-neutral-50 last:border-b-0 hover:bg-neutral-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg ${docTypeConfig[doc.type].bgClass} ${docTypeConfig[doc.type].textClass}`}>
                                                            <TypeIcon className="w-4 h-4" strokeWidth={1.75} />
                                                        </div>
                                                        <div>
                                                            <span className="font-medium text-[#2d3748] block">{doc.documentNumber}</span>
                                                            <span className="text-xs text-neutral-500">{docTypeConfig[doc.type].label}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm text-neutral-500">{formatDate(doc.date)}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[doc.status].bgClass} ${statusConfig[doc.status].textClass}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[doc.status].dotClass}`}></span>
                                                        {statusConfig[doc.status].label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="font-semibold text-[#2d3748]">{formatCurrency(doc.grandTotal, currency)}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Edit Customer"
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
                            placeholder="Add any additional notes..."
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={3}
                        />
                    </div>
                </div>
                <ModalFooter>
                    <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleUpdate}>Save Changes</Button>
                </ModalFooter>
            </Modal>

            {/* Delete Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Customer"
                size="sm"
            >
                <p className="text-neutral-600">
                    Are you sure you want to delete <strong className="text-[#2d3748]">{customer.name}</strong>?
                    This will also affect any associated documents. This action cannot be undone.
                </p>
                <ModalFooter>
                    <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                    <Button variant="danger" onClick={handleDelete}>Delete Customer</Button>
                </ModalFooter>
            </Modal>
        </div>
    );
}
