"use client";

/**
 * WYSIWYG Document Renderer
 * 
 * ARCHITECTURE: SINGLE SOURCE OF TRUTH
 * 
 * This component renders the EXACT DOM node that is captured for the PDF.
 * 
 * RULES:
 * 1. Fixed A4 dimensions (595px × 842px) - DO NOT CHANGE
 * 2. Tables must use native vertical alignment
 * 3. All styles must be capture-compatible (no modern CSS features that break SVG)
 */

import { Template, LineItem } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { AutoFitText } from './AutoFitText';
import '@/styles/document-renderer.css';
import { useSettingsStore } from '@/lib/store';

// ============================================
// CONSTANTS - Single source of truth for dimensions
// ============================================

// A4 at 72 DPI - NEVER change these values
export const DOCUMENT_WIDTH = 595;
export const DOCUMENT_HEIGHT = 842;

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface DocumentData {
    documentNumber: string;
    date: string;
    dueDate?: string;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    customerAddress?: string;
    lineItems?: LineItem[];
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    grandTotal: number;
    notes?: string;
    customValues?: Record<string, string>;
    amountInWords?: string;
    discountName?: string;
    amountPaid?: number;
    amountDue?: number;
}

interface DocumentRendererProps {
    template: Template;
    data: DocumentData;
    id?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Convert percentage to absolute pixels
 * Ensures deterministic positioning
 */
const percentToPixel = (percent: number, dimension: number): number => {
    return (percent / 100) * dimension;
};

/**
 * Get column alignment based on type and key
 */
const getColumnAlignment = (col: any): 'left' | 'center' | 'right' => {
    if (col.alignment) return col.alignment;

    const key = col.key?.toLowerCase() || '';
    const label = (col.label || col.header || '').toLowerCase();

    // S/N -> Center
    if (key === 'sn' || key === 's/n' || key === 'index' || label === 's/n' || label === 'sn') {
        return 'center';
    }

    // Qty -> Center
    if (key === 'quantity' || key === 'qty' || label === 'qty' || label === 'quantity') {
        return 'center';
    }

    // Price / Rate / Unit Price -> Right
    if (key === 'unitprice' || key === 'price' || key === 'rate' || label.includes('price') || label.includes('rate')) {
        return 'right';
    }

    // Total / Amount / Sub Total -> Right
    // Explicitly check for "sub total" and "amount" to catch headers like "Sub Total"
    if (key === 'subtotal' || key === 'total' || key === 'amount' || label.includes('total') || label.includes('amount')) {
        return 'right';
    }

    // Product -> Left (and Description)
    if (key === 'description' || key === 'desc' || key === 'product' || key === 'item' || label === 'product' || label === 'description' || label === 'item') {
        return 'left';
    }

    // Fallback based on type
    if (col.type === 'currency' || col.type === 'number') {
        return 'right';
    }

    return 'left';
};

/**
 * Get cell value from line item
 */
const getCellValue = (
    item: LineItem,
    col: any,
    index: number,
    currency: string
): React.ReactNode => {
    const key = col.key?.toLowerCase() || '';

    if (key === 'sn' || key === 's/n' || key === 'index' || key.includes('serial')) {
        return index + 1;
    }
    if (key === 'description' || key === 'desc' || key === 'product' || key === 'item') {
        return item.productName || item.description || (item as any)[col.key] || '';
    }
    if (key === 'quantity' || key === 'qty') {
        return item.quantity || (item as any)[col.key] || '';
    }
    if (key === 'unitprice' || key === 'price' || key === 'rate') {
        return formatCurrency(item.unitPrice || (item as any)[col.key] || 0, currency);
    }
    if (key === 'subtotal' || key === 'total' || key === 'amount') {
        return formatCurrency(item.subtotal || (item as any)[col.key] || 0, currency);
    }

    return (item as any)[col.key] || item.customValues?.[col.key] || '';
};

// ============================================
// TABLE FIELD COMPONENT
// ============================================

interface TableFieldProps {
    field: any;
    lineItems: LineItem[];
    currency: string;
    docHeight: number;
}

const TableField = ({ field, lineItems, currency, docHeight }: TableFieldProps) => {
    // Default columns if not defined
    const tableColumns = field.columns || [
        { id: 'desc', header: 'Description', width: 45, type: 'text', key: 'description' },
        { id: 'qty', header: 'Qty', width: 15, type: 'number', key: 'quantity' },
        { id: 'price', header: 'Price', width: 20, type: 'currency', key: 'unitPrice' },
        { id: 'total', header: 'Total', width: 20, type: 'currency', key: 'subtotal' }
    ];

    // Calculate dimensions
    const totalFieldHeight = percentToPixel(field.height, docHeight);
    const maxRows = field.maxRows || 10;
    const fontSize = field.fontSize || 12;
    const showHeaders = field.showTableHeaders !== false;
    const headerHeight = fontSize + 16;
    // Row height is now derived strictly from the box height divided by maxRows (Header is external)
    const rowHeight = totalFieldHeight / maxRows;

    // Field positioning (absolute within document)
    // We explicitly set overflow visible to allow headers to sit "outside" on top
    const fieldStyle: React.CSSProperties = {
        position: 'absolute',
        left: `${field.x}%`,
        top: `${field.y}%`,
        width: `${field.width}%`,
        height: `${field.height}%`,
        color: field.fontColor || '#2d3748',
        boxSizing: 'border-box',
        overflow: 'visible'
    };

    return (
        <div className="document-renderer__field" style={fieldStyle}>
            {/* Header - Positioned Outside (Top) */}
            {showHeaders && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: 0,
                        width: '100%',
                        height: `${headerHeight}px`,
                        display: 'flex',
                        backgroundColor: '#e2e8f0', // Default header bg? Or transparent? Usually headers have bg.
                        // In editor it was bg-neutral-300.
                        // Let's use a standard light gray for consistency or allow config.
                        // For now we match the "clean" look.
                        borderBottom: `1px solid ${field.fontColor || '#e2e8f0'}`,
                        boxSizing: 'border-box'
                    }}
                >
                    {tableColumns.map((col: any) => {
                        const alignment = getColumnAlignment(col);
                        // Header cells
                        return (
                            <div
                                key={col.id}
                                style={{
                                    width: `${col.width}%`,
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: alignment === 'right' ? 'flex-end' : alignment === 'center' ? 'center' : 'flex-start',
                                    fontSize: `${fontSize}px`,
                                    fontWeight: 'bold',
                                    padding: '0 12px',
                                    boxSizing: 'border-box',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden'
                                }}
                            >
                                {col.header}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Body - Fills the box */}
            <table
                className="document-renderer__table"
                style={{
                    fontSize: `${fontSize}px`,
                    height: '100%',
                    width: '100%', // Ensure perfectly fills width
                    tableLayout: 'fixed',
                    borderCollapse: 'collapse', // Remove gaps between cells
                    borderSpacing: 0, // Remove spacing
                    border: 'none', // Handle borders via cells
                    margin: 0,
                    padding: 0
                }}
            >
                <colgroup>
                    {tableColumns.map((col: any) => (
                        <col key={col.id} style={{ width: `${col.width}%` }} />
                    ))}
                </colgroup>

                <tbody>
                    {Array.from({ length: maxRows }).map((_, i) => {
                        const item = lineItems && lineItems[i];
                        const isLastRow = i === maxRows - 1;

                        return (
                            <tr
                                key={item ? item.id : `empty-${i}`}
                                className="document-renderer__table-row"
                                style={{
                                    height: `${rowHeight}px`,
                                    // Make sure border is consistent? Defaults from CSS should apply.
                                }}
                            >
                                {tableColumns.map((col: any) => {
                                    const alignment = getColumnAlignment(col);
                                    const cellValue = item ? getCellValue(item, col, i, currency) : '';

                                    return (
                                        <td
                                            key={col.id}
                                            className="document-renderer__table-cell"
                                            style={{
                                                height: `${100 / maxRows}%`,
                                                fontSize: `${fontSize}px`,
                                                color: field.fontColor || '#2d3748',
                                                padding: 0,
                                                verticalAlign: 'middle',
                                                position: 'relative'
                                            }}
                                        >
                                            <div style={{
                                                width: '100%',
                                                height: '100%',
                                                display: 'flex', // Use flex for perfect vertical centering
                                                alignItems: 'center',
                                                justifyContent: alignment === 'right' ? 'flex-end' : alignment === 'center' ? 'center' : 'flex-start',
                                                padding: '0 12px',
                                                boxSizing: 'border-box',
                                                minHeight: '1em'
                                            }}>
                                                {cellValue}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

// ============================================
// TEXT FIELD COMPONENT
// ============================================

interface TextFieldProps {
    field: any;
    value: React.ReactNode;
    isMultiLine: boolean;
    docHeight: number;
}

const TextField = ({ field, value, isMultiLine, docHeight }: TextFieldProps) => {
    const fieldStyle: React.CSSProperties = {
        position: 'absolute',
        left: `${field.x}%`,
        top: `${field.y}%`,
        width: `${field.width}%`,
        height: `${field.height}%`,
        boxSizing: 'border-box',
        padding: '2px',
    };

    return (
        <div className="document-renderer__field" style={fieldStyle}>
            <AutoFitText
                value={value}
                fontSize={field.fontSize}
                fontWeight={field.fontWeight}
                alignment={field.alignment}
                fontColor={field.fontColor || '#2d3748'}
                isMultiLine={isMultiLine || (field.height > (field.fontSize * 1.8 / docHeight) * 100)}
            />
        </div>
    );
};

// ============================================
// MAIN DOCUMENT RENDERER COMPONENT
// ============================================

export default function DocumentRenderer({ template, data, id }: DocumentRendererProps) {
    const { company } = useSettingsStore();
    const currency = company.currency;

    /**
     * Get field value based on type
     */
    const getFieldValue = (field: any): React.ReactNode => {
        switch (field.type) {
            case 'document-number':
                return data.documentNumber;
            case 'date':
                return formatDate(data.date);
            case 'due-date':
                return data.dueDate ? formatDate(data.dueDate) : '';
            case 'customer-name':
                return data.customerName;
            case 'customer-email':
                return data.customerEmail || '';
            case 'customer-phone':
                return data.customerPhone || '';
            case 'customer-address':
                return data.customerAddress || '';
            case 'subtotal':
                return formatCurrency(data.subtotal, currency);
            case 'discount':
                return data.discountAmount > 0 ? formatCurrency(data.discountAmount, currency) : '';
            case 'tax':
                return data.taxAmount > 0 ? formatCurrency(data.taxAmount, currency) : '';
            case 'grand-total':
                return formatCurrency(data.grandTotal, currency);
            case 'amount-paid':
                return typeof data.amountPaid === 'number' ? formatCurrency(data.amountPaid, currency) : '';
            case 'amount-due':
                return typeof data.amountDue === 'number' ? formatCurrency(data.amountDue, currency) : '';
            case 'amount-in-words':
                return data.amountInWords || '';
            case 'notes':
                return data.notes || '';
            case 'discount-name':
                return data.discountName || data.customValues?.['discountName'] || ((data.discountAmount > 0) ? 'Discount' : '');
            case 'text':
            case 'custom':
                const val = data.customValues?.[field.id] || field.label;
                // Apply currency formatting if dataType is set to 'currency' and value is numeric
                if (field.dataType === 'currency') {
                    const numVal = typeof val === 'string' ? parseFloat(val) : Number(val);
                    if (!isNaN(numVal)) {
                        return formatCurrency(numVal, currency);
                    }
                }
                return val;
            default:
                return '';
        }
    };

    /**
     * Check if field should be multi-line
     */
    const isMultiLineField = (field: any): boolean => {
        return field.type === 'notes' || field.type === 'customer-address';
    };

    const width = template.width || (template.orientation === 'landscape' ? DOCUMENT_HEIGHT : DOCUMENT_WIDTH);
    const height = template.height || (template.orientation === 'landscape' ? DOCUMENT_WIDTH : DOCUMENT_HEIGHT);

    return (
        <div
            id={id}
            className="document-renderer"
            style={{
                width: `${width}px`,
                height: `${height}px`,
                position: 'relative',
                backgroundColor: '#ffffff',
                overflow: 'hidden',
                flexShrink: 0,
                boxSizing: 'border-box',
            }}
        >
            {/* Template Background Image */}
            {template.imageUrl && (
                <img
                    src={template.imageUrl}
                    alt={template.name}
                    className="document-renderer__background"
                    crossOrigin="anonymous"
                />
            )}

            {/* Render Fields */}
            {template.fields.map((field) => {
                // Special handling for line items table
                if (field.type === 'line-items') {
                    return (
                        <TableField
                            key={field.id}
                            field={field}
                            lineItems={data.lineItems || []}
                            currency={currency}
                            docHeight={height}
                        />
                    );
                }

                // All other fields use text rendering
                const value = getFieldValue(field);
                const isMultiLine = isMultiLineField(field);

                return (
                    <TextField
                        key={field.id}
                        field={field}
                        value={value}
                        isMultiLine={isMultiLine}
                        docHeight={height}
                    />
                );
            })}
        </div>
    );
}
