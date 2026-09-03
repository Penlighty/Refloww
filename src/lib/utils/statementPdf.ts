import jsPDF from 'jspdf';
import { Customer, Document } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'react-hot-toast';

export interface StatementCompanyInfo {
    name?: string;
    currency: string;
    email?: string;
    phone?: string;
    address?: string;
}

export const generateCustomerStatementPdf = async (
    customer: Customer,
    customerDocs: Document[],
    company: StatementCompanyInfo
) => {
    const toastId = toast.loading('Generating Customer Statement PDF...');

    try {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        const primaryColor = '#1e293b'; // Slate 800
        const accentColor = '#2563eb';  // Blue 600
        const lightGray = '#f8fafc';
        const borderColor = '#e2e8f0';

        // 1. Business Header & Logo Placeholder
        doc.setFillColor(30, 41, 59); // Slate 800
        doc.rect(0, 0, 210, 24, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(company.name || 'INFLOW COMMERCE', 14, 15);

        doc.setFontSize(10);
        doc.setFont('Helvetica', 'normal');
        doc.text('STATEMENT OF ACCOUNT', 196, 15, { align: 'right' });

        // 2. Metadata Section (Company & Customer Info)
        doc.setTextColor(30, 41, 59);
        let y = 35;

        // Customer Info Card
        doc.setFontSize(9);
        doc.setFont('Helvetica', 'bold');
        doc.text('STATEMENT FOR:', 14, y);

        doc.setFontSize(12);
        doc.text(customer.name, 14, y + 6);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);

        let custY = y + 11;
        if (customer.companyName) {
            doc.text(customer.companyName, 14, custY);
            custY += 4.5;
        }
        if (customer.email) {
            doc.text(`Email: ${customer.email}`, 14, custY);
            custY += 4.5;
        }
        if (customer.phone) {
            doc.text(`Phone: ${customer.phone}`, 14, custY);
            custY += 4.5;
        }
        if (customer.customerNumber) {
            doc.text(`Customer ID: ${customer.customerNumber}`, 14, custY);
        }

        // Statement Metadata (Right column)
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('STATEMENT DETAILS:', 140, y);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`Date Issued: ${formatDate(new Date().toISOString())}`, 140, y + 6);
        doc.text(`Total Records: ${customerDocs.length}`, 140, y + 10.5);

        // Calculate Totals
        const totalBilled = customerDocs.reduce((s, d) => s + (d.grandTotal || 0), 0);
        const totalPaid = customerDocs.reduce((s, d) => s + (d.amountPaid || (d.status === 'paid' ? d.grandTotal : 0)), 0);
        const balanceDue = Math.max(0, totalBilled - totalPaid);

        // Summary Bar Box
        y = Math.max(custY + 8, y + 22);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(14, y, 182, 18, 3, 3, 'FD');

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text('TOTAL BILLED', 24, y + 6);
        doc.text('TOTAL PAID', 85, y + 6);
        doc.text('OUTSTANDING BALANCE', 142, y + 6);

        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        doc.text(formatCurrency(totalBilled, company.currency), 24, y + 13);
        doc.setTextColor(22, 163, 74); // Green
        doc.text(formatCurrency(totalPaid, company.currency), 85, y + 13);
        doc.setTextColor(balanceDue > 0 ? 220 : 30, balanceDue > 0 ? 38 : 41, balanceDue > 0 ? 38 : 59); // Red if balance due
        doc.text(formatCurrency(balanceDue, company.currency), 142, y + 13);

        // 3. Transactions Table Header
        y += 26;
        doc.setFillColor(30, 41, 59);
        doc.rect(14, y, 182, 8, 'F');

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(255, 255, 255);

        doc.text('DATE', 18, y + 5.5);
        doc.text('DOC NUMBER', 45, y + 5.5);
        doc.text('TYPE', 82, y + 5.5);
        doc.text('STATUS', 110, y + 5.5);
        doc.text('AMOUNT', 145, y + 5.5);
        doc.text('BALANCE', 178, y + 5.5);

        // Table Rows
        y += 8;
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8.5);

        const sortedDocs = [...customerDocs].sort(
            (a, b) => new Date(a.date || a.createdAt).getTime() - new Date(b.date || b.createdAt).getTime()
        );

        if (sortedDocs.length === 0) {
            doc.setTextColor(148, 163, 184);
            doc.text('No documents logged for this customer.', 18, y + 8);
        } else {
            let runningBalance = 0;

            sortedDocs.forEach((docItem, index) => {
                const docTotal = docItem.grandTotal || 0;
                const docPaid = docItem.amountPaid || (docItem.status === 'paid' ? docTotal : 0);
                const docBalance = Math.max(0, docTotal - docPaid);
                runningBalance += docBalance;

                // Alternate row background
                if (index % 2 === 1) {
                    doc.setFillColor(248, 250, 252);
                    doc.rect(14, y, 182, 7, 'F');
                }

                doc.setDrawColor(241, 245, 249);
                doc.line(14, y + 7, 196, y + 7);

                doc.setTextColor(30, 41, 59);
                doc.text(formatDate(docItem.date || docItem.createdAt), 18, y + 5);
                doc.text(docItem.documentNumber, 45, y + 5);
                doc.text(docItem.type.toUpperCase(), 82, y + 5);

                // Status text color
                if (docItem.status === 'paid') doc.setTextColor(22, 163, 74);
                else if (docItem.status === 'overdue') doc.setTextColor(220, 38, 38);
                else doc.setTextColor(100, 116, 139);

                doc.text(docItem.status.toUpperCase(), 110, y + 5);

                doc.setTextColor(30, 41, 59);
                doc.text(formatCurrency(docTotal, company.currency), 145, y + 5);
                doc.text(formatCurrency(docBalance, company.currency), 178, y + 5);

                y += 7;

                // Page overflow safety
                if (y > 270) {
                    doc.addPage();
                    y = 20;
                }
            });
        }

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Generated by Inflow Business Suite • ${company.name || 'Inflow'}`, 105, 290, { align: 'center' });

        const filename = `Statement_${customer.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(filename);
        toast.success('Customer Statement PDF downloaded', { id: toastId });

    } catch (error) {
        console.error('Failed to generate Customer Statement PDF:', error);
        toast.error('Failed to export statement PDF', { id: toastId });
    }
};
