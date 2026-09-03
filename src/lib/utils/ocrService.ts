import { createWorker } from 'tesseract.js';

export interface OcrScanResult {
    rawText: string;
    batchNumber: string | null;
    expiryDate: string | null;      // ISO format YYYY-MM-DD
    receivedDate: string | null;    // ISO format YYYY-MM-DD
    costPrice: number | null;
    supplier: string | null;
    quantity: number | null;
    confidence: number;
}

/**
 * Normalizes various date string formats (e.g., "12/2028", "15-OCT-2027", "2027.08.14", "05/12/26") to ISO "YYYY-MM-DD".
 */
export function parseAndNormalizeDate(dateStr: string): string | null {
    if (!dateStr) return null;

    const cleaned = dateStr.trim().toUpperCase().replace(/[^A-Z0-9\/\-\.]/g, '');

    // Month map for text months
    const monthMap: Record<string, string> = {
        JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
        JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12'
    };

    // Format: DD-MMM-YYYY or DD MMM YYYY or MMM YYYY
    const textMonthMatch = cleaned.match(/(\d{1,2})?[\-\/\.\s]?([A-Z]{3})[\-\/\.\s]?(\d{2,4})/);
    if (textMonthMatch) {
        const day = textMonthMatch[1] ? textMonthMatch[1].padStart(2, '0') : '01';
        const month = monthMap[textMonthMatch[2]];
        let year = textMonthMatch[3];
        if (year.length === 2) year = `20${year}`;
        if (month && year) {
            return `${year}-${month}-${day}`;
        }
    }

    // Format: YYYY-MM-DD or YYYY/MM/DD
    const isoMatch = cleaned.match(/(\d{4})[\-\/\.](\d{1,2})[\-\/\.](\d{1,2})/);
    if (isoMatch) {
        const year = isoMatch[1];
        const month = isoMatch[2].padStart(2, '0');
        const day = isoMatch[3].padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Format: MM/YYYY or MM-YYYY
    const monthYearMatch = cleaned.match(/^(\d{1,2})[\-\/\.](\d{4})$/);
    if (monthYearMatch) {
        const month = monthYearMatch[1].padStart(2, '0');
        const year = monthYearMatch[2];
        return `${year}-${month}-01`;
    }

    // Format: MM/YY or MM-YY (e.g. 12/28 -> 2028-12-01)
    const monthShortYearMatch = cleaned.match(/^(\d{1,2})[\-\/\.](\d{2})$/);
    if (monthShortYearMatch) {
        const month = monthShortYearMatch[1].padStart(2, '0');
        const year = `20${monthShortYearMatch[2]}`;
        return `${year}-${month}-01`;
    }

    // Format: DD/MM/YYYY or DD/MM/YY
    const slashMatch = cleaned.match(/(\d{1,2})[\-\/\.](\d{1,2})[\-\/\.](\d{2,4})/);
    if (slashMatch) {
        const part1 = parseInt(slashMatch[1], 10);
        const part2 = parseInt(slashMatch[2], 10);
        let year = slashMatch[3];
        if (year.length === 2) year = `20${year}`;

        // Assume DD/MM/YYYY if part1 > 12
        if (part1 > 12) {
            const day = part1.toString().padStart(2, '0');
            const month = part2.toString().padStart(2, '0');
            return `${year}-${month}-${day}`;
        } else {
            // Default to MM/DD/YYYY or DD/MM/YYYY based on part2
            const month = part1.toString().padStart(2, '0');
            const day = part2.toString().padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
    }

    return null;
}

/**
 * Extracts batch number candidates from OCR raw text using keywords and pattern heuristics.
 */
export function extractBatchNumber(text: string): string | null {
    if (!text) return null;

    // Pattern 1: Explicit labels like "LOT: B12345", "BATCH NO: 2026-99", "B/N: XY88"
    const explicitRegex = /(?:LOT|BATCH|B\/N|BN|LOT\s*NO|BATCH\s*NO|B\/N\#|LOT\#|B\.N\.)[\s\:\#\-\.]*([A-Z0-9\-\/]{3,20})/i;
    const explicitMatch = text.match(explicitRegex);
    if (explicitMatch && explicitMatch[1]) {
        const cleaned = explicitMatch[1].trim().replace(/^[^A-Z0-9]+|[^A-Z0-9]+$/gi, '');
        if (cleaned.length >= 3) return cleaned;
    }

    // Pattern 2: Typical standalone alphanumeric batch patterns like "L202608A", "B88392", "BN901"
    const standaloneMatch = text.match(/\b([L|B|LOT|BN]\d{4,12}[A-Z0-9]*)\b/i);
    if (standaloneMatch && standaloneMatch[1]) {
        return standaloneMatch[1].trim();
    }

    return null;
}

/**
 * Extracts expiry date candidates from OCR raw text.
 */
export function extractExpiryDate(text: string): string | null {
    if (!text) return null;

    // Pattern 1: Near explicit keywords "EXP", "EXPIRY", "BEST BEFORE", "USE BY", "ED:"
    const lines = text.split('\n');
    for (const line of lines) {
        if (/(?:EXP|EXPIRY|BEST\s*BEFORE|USE\s*BY|EXP\.?\s*DATE|E\.D\.)/i.test(line)) {
            // Find date tokens in this line
            const dateMatch = line.match(/(?:\d{1,4}[\-\/\.]\d{1,2}[\-\/\.]\d{2,4})|(?:\d{1,2}[\-\/\.](?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[\-\/\.]\d{2,4})|(?:\d{1,2}[\-\/\.]\d{2,4})/i);
            if (dateMatch) {
                const parsed = parseAndNormalizeDate(dateMatch[0]);
                if (parsed) return parsed;
            }
        }
    }

    // Pattern 2: Any line containing MFG / EXP combo like "MFG 01/24 EXP 01/27"
    const mfgExpMatch = text.match(/EXP[^\d]*(\d{1,2}[\-\/\.]\d{2,4})/i);
    if (mfgExpMatch && mfgExpMatch[1]) {
        const parsed = parseAndNormalizeDate(mfgExpMatch[1]);
        if (parsed) return parsed;
    }

    // Fallback: search whole text for any plausible future date format
    const generalDateMatch = text.match(/\b(20[2-3]\d[\-\/\.](?:0[1-9]|1[0-2])[\-\/\.](?:0[1-9]|[12]\d|3[01]))\b/);
    if (generalDateMatch) {
        return parseAndNormalizeDate(generalDateMatch[1]);
    }

    return null;
}

/**
 * Extracts received date / invoice date from text or returns today.
 */
export function extractReceivedDate(text: string): string {
    if (!text) return new Date().toISOString().split('T')[0];

    const lines = text.split('\n');
    for (const line of lines) {
        if (/(?:DATE|REC|RECEIVED|INVOICE\s*DATE|DELIVERY\s*DATE)/i.test(line)) {
            const dateMatch = line.match(/(?:\d{1,4}[\-\/\.]\d{1,2}[\-\/\.]\d{2,4})/);
            if (dateMatch) {
                const parsed = parseAndNormalizeDate(dateMatch[0]);
                if (parsed) return parsed;
            }
        }
    }

    return new Date().toISOString().split('T')[0];
}

/**
 * Extracts cost price / unit price from text.
 */
export function extractCostPrice(text: string): number | null {
    if (!text) return null;

    const lines = text.split('\n');
    for (const line of lines) {
        if (/(?:COST|UNIT\s*PRICE|PRICE|RATE|AMOUNT|BUY\s*PRICE)/i.test(line)) {
            const priceMatch = line.match(/(?:[\$\₦\€\£]|USD|NGN|EUR)?\s*(\d+(?:\.\d{1,2})?)/i);
            if (priceMatch && priceMatch[1]) {
                const val = parseFloat(priceMatch[1]);
                if (!isNaN(val) && val > 0) return val;
            }
        }
    }

    // Fallback price extraction
    const currencyMatch = text.match(/(?:[\$\₦\€\£])\s*(\d+(?:\.\d{2})?)/);
    if (currencyMatch && currencyMatch[1]) {
        const val = parseFloat(currencyMatch[1]);
        if (!isNaN(val) && val > 0) return val;
    }

    return null;
}

/**
 * Extracts quantity from text.
 */
export function extractQuantity(text: string): number | null {
    if (!text) return null;

    const lines = text.split('\n');
    for (const line of lines) {
        if (/(?:QTY|QUANTITY|UNITS|PCS|COUNT|PIECES)/i.test(line)) {
            const qtyMatch = line.match(/(\d+)/);
            if (qtyMatch && qtyMatch[1]) {
                const val = parseInt(qtyMatch[1], 10);
                if (!isNaN(val) && val > 0) return val;
            }
        }
    }

    return null;
}

/**
 * Extracts supplier company name from top lines of invoice/delivery note.
 */
export function extractSupplier(text: string): string | null {
    if (!text) return null;

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // Check top 5 lines for supplier labels or business names
    for (let i = 0; i < Math.min(5, lines.length); i++) {
        const line = lines[i];
        if (/(?:SUPPLIER|VENDOR|FROM|DISTRIBUTOR|COMPANY|LTD|LIMITED|INC|CORP|ENTERPRISES)/i.test(line)) {
            const cleaned = line.replace(/^(SUPPLIER|VENDOR|FROM|DISTRIBUTOR)\s*[:\-]/i, '').trim();
            if (cleaned.length > 2) return cleaned;
        }
    }

    // Fallback: line 1 if it looks like a brand name
    if (lines.length > 0 && lines[0].length < 40 && !/\d{5,}/.test(lines[0])) {
        return lines[0];
    }

    return null;
}

/**
 * Main client-side OCR runner powered by Tesseract.js.
 */
export async function scanImageForBatchDetails(
    imageSource: File | Blob | string,
    onProgress?: (progress: number, status: string) => void
): Promise<OcrScanResult> {
    try {
        onProgress?.(0.1, 'Initializing Tesseract OCR worker...');

        const worker = await createWorker('eng');

        onProgress?.(0.4, 'Analyzing image & recognizing text...');

        const ret = await worker.recognize(imageSource);
        const rawText = ret.data.text || '';
        const confidence = ret.data.confidence || 0;

        onProgress?.(0.85, 'Parsing batch, expiry dates & details...');

        await worker.terminate();

        const batchNumber = extractBatchNumber(rawText);
        const expiryDate = extractExpiryDate(rawText);
        const receivedDate = extractReceivedDate(rawText);
        const costPrice = extractCostPrice(rawText);
        const supplier = extractSupplier(rawText);
        const quantity = extractQuantity(rawText);

        onProgress?.(1.0, 'Scan completed!');

        return {
            rawText,
            batchNumber,
            expiryDate,
            receivedDate,
            costPrice,
            supplier,
            quantity,
            confidence
        };
    } catch (error) {
        console.error('OCR Error:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to scan image with OCR');
    }
}
