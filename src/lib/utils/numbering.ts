import { format } from 'date-fns';

export interface NumberingContext {
    details?: {
        customerCode?: string;
        date?: Date;
    };
}

export type NumberingToken = 'YYYY' | 'MM' | 'DD' | '####' | 'CUST' | 'LOC' | string;

export const DEFAULT_FORMATS = {
    invoice: 'INV-YYYY-####',
    receipt: 'RCT-YYYY-####',
    deliveryNote: 'DN-YYYY-####',
};

/**
 * Parses a format string and returns the tokens and static text.
 * Used for validation and UI highlights.
 */
export function parseFormat(formatStr: string): string[] {
    // Regex to split by known tokens
    // Captures: YYYY, MM, DD, CUST, LOC, and sequences of #
    const regex = /(YYYY|MM|DD|CUST|LOC|#+)/g;
    return formatStr.split(regex).filter(Boolean);
}

/**
 * Generates a document number based on the format, sequence, and context.
 */
export function generateDocumentNumber(
    formatStr: string,
    sequence: number,
    context?: NumberingContext
): string {
    const date = context?.details?.date || new Date();
    const customerCode = context?.details?.customerCode || 'CUST'; // Fallback if no customer

    // Replace standard tokens
    let result = formatStr
        .replace(/YYYY/g, format(date, 'yyyy'))
        .replace(/MM/g, format(date, 'MM'))
        .replace(/DD/g, format(date, 'dd'))
        .replace(/CUST/g, customerCode.toUpperCase().slice(0, 3)) // Limit CUST to 3 chars standard
        .replace(/LOC/g, 'HQ'); // Default location for now 

    // Replace Sequence (####)
    // Find any sequence of '#' and replace with padded number
    result = result.replace(/#+/g, (match) => {
        const padding = match.length;
        return String(sequence).padStart(padding, '0');
    });

    return result;
}

/**
 * Generates a preview of the next number
 */
export function getFormatPreview(
    formatStr: string,
    nextSequence: number
): string {
    return generateDocumentNumber(formatStr, nextSequence, {
        details: {
            date: new Date(),
            customerCode: 'ABC',
        }
    });
}

/**
 * Validates if a format string is safe to use.
 */
export function validateFormat(formatStr: string): { valid: boolean; error?: string } {
    if (!formatStr) return { valid: false, error: 'Format cannot be empty' };
    if (!formatStr.includes('#')) return { valid: false, error: 'Format must include a sequence number (e.g., ####)' };

    // Check for potential collisions (e.g., just "INV") - though "INV-#" is minimal valid
    return { valid: true };
}
