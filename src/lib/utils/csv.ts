/**
 * Parse CSV string into an array of objects
 */
export function parseCSV<T extends Record<string, any>>(
    csvString: string,
    columnMapping: Record<string, keyof T>
): T[] {
    const lines = csvString.trim().split('\n');
    if (lines.length < 2) return [];

    // Parse headers
    const headers = parseCSVLine(lines[0]);

    // Parse data rows
    const results: T[] = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length !== headers.length) continue;

        const row: Record<string, string | number> = {};

        headers.forEach((header, index) => {
            const normalizedHeader = header.toLowerCase().trim();
            const mappedKey = Object.entries(columnMapping).find(
                ([csvCol]) => csvCol.toLowerCase() === normalizedHeader
            );

            if (mappedKey) {
                const value = values[index].trim();
                // Try to parse as number if it looks like one
                const numValue = parseFloat(value);
                row[mappedKey[1] as string] = isNaN(numValue) ? value : numValue;
            }
        });

        // Only add if we have at least one mapped value
        if (Object.keys(row).length > 0) {
            results.push(row as T);
        }
    }

    return results;
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                // Escaped quote
                current += '"';
                i++;
            } else {
                // Toggle quote mode
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }

    // Don't forget the last value
    result.push(current);

    return result;
}

/**
 * Generate CSV string from array of objects
 */
export function generateCSV<T>(
    data: T[],
    columns: { key: keyof T; header: string }[]
): string {
    if (data.length === 0) return '';

    // Headers
    const headerLine = columns.map(col => escapeCSVValue(col.header)).join(',');

    // Data rows
    const dataLines = data.map(row =>
        columns.map(col => escapeCSVValue(String(row[col.key] ?? ''))).join(',')
    );

    return [headerLine, ...dataLines].join('\n');
}

/**
 * Escape a value for CSV
 */
function escapeCSVValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

/**
 * Download a string as a CSV file
 */
export function downloadCSV(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Read a file as text
 */
export function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });
}
