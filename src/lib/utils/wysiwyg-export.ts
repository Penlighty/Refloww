/**
 * WYSIWYG Export System
 * 
 * ARCHITECTURE: ETCHED IN STONE (Do not change engine)
 * 
 * Core principle: "Figma-Fidelity Preview = Export"
 * Engine: html-to-image (SVG ForeignObject)
 * 
 * Why: This architecture uses the browser's own rendering engine via SVG
 * to guarantee 100% fidelity. Do NOT revert to html2canvas.
 */

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'react-hot-toast';

// A4 dimensions at 72 DPI (matches DocumentRenderer exactly)
export const DOCUMENT_WIDTH_PX = 595;
export const DOCUMENT_HEIGHT_PX = 842;

// A4 dimensions in mm
export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

// Export quality multiplier (2 or 3 for high-res exports)
export const EXPORT_SCALE = 3;

/**
 * Sanitize filename to ensure it's valid for file systems
 */
const sanitizeFilename = (filename: string): string => {
    // Replace invalid characters with underscore
    // Invalid: / \ : * ? " < > |
    return filename
        .replace(/[\\/:*?"<>|]/g, '_')
        .replace(/\s+/g, ' ')
        .trim() || 'document';
};

/**
 * Wait for all fonts to be fully loaded
 */
const waitForFonts = async (): Promise<void> => {
    // Wait for document.fonts.ready
    await document.fonts.ready;

    // Additional wait for any lazy-loaded fonts
    await new Promise(resolve => setTimeout(resolve, 100));
};

/**
 * Wait for all images within an element to be fully loaded
 */
const waitForImages = (element: HTMLElement): Promise<void[]> => {
    const images = element.querySelectorAll('img');
    const promises: Promise<void>[] = [];

    images.forEach((img) => {
        if (!img.complete) {
            promises.push(
                new Promise((resolve) => {
                    img.onload = () => resolve();
                    img.onerror = () => resolve(); // Don't fail on broken images
                })
            );
        }
    });

    return Promise.all(promises);
};

/**
 * Prepare element for capture by temporarily neutralizing problematic styles
 * Returns a cleanup function to restore original state
 */
const prepareElementForCapture = (element: HTMLElement): (() => void) => {
    const originalTransform = element.style.transform;
    const originalTransformOrigin = element.style.transformOrigin;
    const parent = element.parentElement;
    const parentOriginalTransform = parent?.style.transform || '';
    const parentCssVar = parent?.style.getPropertyValue('--preview-scale') || '';

    // Remove any scaling transforms for capture
    element.style.transform = 'none';
    element.style.transformOrigin = 'top left';

    if (parent) {
        parent.style.transform = 'none';
        parent.style.setProperty('--preview-scale', '1');
    }

    // Force layout recalculation
    void element.offsetHeight;

    return () => {
        element.style.transform = originalTransform;
        element.style.transformOrigin = originalTransformOrigin;
        if (parent) {
            parent.style.transform = parentOriginalTransform;
            parent.style.setProperty('--preview-scale', parentCssVar);
        }
    };
};

/**
 * Color properties that html2canvas parses from stylesheets
 * We need to override ALL of these with inline RGB values
 */
const COLOR_PROPERTIES = [
    'color',
    'background-color',
    'border-color',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
    'outline-color',
    'text-decoration-color',
] as const;

/**
 * Sanitize CSS colors that html2canvas doesn't support
 * 
 * html2canvas parses RAW CSS stylesheets, not computed styles.
 * TailwindCSS v4 uses LAB/OKLCH colors internally which html2canvas can't parse.
 * 
 * Solution: Force ALL computed colors to inline RGB styles on every element.
 * This makes html2canvas use the inline styles instead of parsing stylesheets.
 */
const sanitizeColors = (element: HTMLElement): (() => void) => {
    const elementsToRestore: Array<{ el: HTMLElement; prop: string; value: string }> = [];

    const processElement = (el: HTMLElement) => {
        const computed = getComputedStyle(el);

        COLOR_PROPERTIES.forEach(prop => {
            // Get the browser's computed RGB value (browser already converted LAB to RGB)
            const computedValue = computed.getPropertyValue(prop);

            if (computedValue && computedValue !== 'none') {
                // Store original inline style for restoration
                const inlineValue = el.style.getPropertyValue(prop);
                elementsToRestore.push({ el, prop, value: inlineValue });

                // Force the computed RGB value as inline style
                // This ensures html2canvas sees RGB, not the LAB from stylesheets
                el.style.setProperty(prop, computedValue, 'important');
            }
        });
    };

    // Process root and all descendants
    processElement(element);
    element.querySelectorAll('*').forEach(child => {
        if (child instanceof HTMLElement) {
            processElement(child);
        }
    });

    // Return cleanup function
    return () => {
        elementsToRestore.forEach(({ el, prop, value }) => {
            if (value) {
                el.style.setProperty(prop, value);
            } else {
                el.style.removeProperty(prop);
            }
        });
    };
};

/**
 * Temporarily disable stylesheets that may contain modern color functions
 * This is a nuclear option if inline style override doesn't work
 */
const disableProblematicStylesheets = (): (() => void) => {
    const disabledSheets: Array<{ sheet: CSSStyleSheet; disabled: boolean }> = [];

    // Check each stylesheet for modern color functions
    Array.from(document.styleSheets).forEach(sheet => {
        try {
            // Try to access rules - may fail for cross-origin sheets
            const rules = sheet.cssRules || sheet.rules;
            if (!rules) return;

            // Check if any rule contains modern color functions
            let hasModernColors = false;
            for (let i = 0; i < rules.length; i++) {
                const cssText = rules[i].cssText || '';
                if (/(?:lab|oklch|oklab|lch)\s*\(/i.test(cssText)) {
                    hasModernColors = true;
                    break;
                }
            }

            if (hasModernColors) {
                disabledSheets.push({ sheet, disabled: sheet.disabled });
                sheet.disabled = true;
            }
        } catch {
            // Cross-origin stylesheet, can't access rules - skip
        }
    });

    return () => {
        disabledSheets.forEach(({ sheet, disabled }) => {
            sheet.disabled = disabled;
        });
    };
};

/**
 * Capture computed styles from an element and all descendants BEFORE removing stylesheets
 */
const captureComputedStyles = (element: HTMLElement): Map<HTMLElement, Record<string, string>> => {
    const styleMap = new Map<HTMLElement, Record<string, string>>();

    // Comprehensive list of properties to preserve during export
    const propsToCapture = [
        // Colors
        'color',
        'background-color',
        'border-color',
        'border-top-color',
        'border-right-color',
        'border-bottom-color',
        'border-left-color',
        'outline-color',

        // Typography
        'font-family',
        'font-size',
        'font-weight',
        'font-style',
        'line-height',
        'letter-spacing',
        'text-align',
        'text-transform',
        'text-decoration',
        'white-space',
        'word-break',
        'overflow-wrap',

        // Box Model
        'width',
        'height',
        'min-width',
        'min-height',
        'max-width',
        'max-height',
        'padding',
        'padding-top',
        'padding-right',
        'padding-bottom',
        'padding-left',
        'margin',
        'margin-top',
        'margin-right',
        'margin-bottom',
        'margin-left',
        'box-sizing',

        // Borders
        'border-width',
        'border-top-width',
        'border-right-width',
        'border-bottom-width',
        'border-left-width',
        'border-style',
        'border-top-style',
        'border-right-style',
        'border-bottom-style',
        'border-left-style',
        'border-radius',
        'border-collapse',
        'border-spacing',

        // Layout
        'display',
        'position',
        'top',
        'right',
        'bottom',
        'left',
        'z-index',
        'float',
        'clear',
        'overflow',
        'overflow-x',
        'overflow-y',
        'visibility',
        'opacity',

        // Flexbox
        'flex',
        'flex-direction',
        'flex-wrap',
        'justify-content',
        'align-items',
        'align-content',
        'align-self',
        'gap',

        // Table
        'table-layout',
        'vertical-align',
        'text-overflow',
    ];

    const captureElement = (el: HTMLElement) => {
        const computed = getComputedStyle(el);
        const styles: Record<string, string> = {};

        propsToCapture.forEach(prop => {
            const value = computed.getPropertyValue(prop);
            if (value && value !== 'none' && value !== '' && value !== 'auto' && value !== 'normal') {
                styles[prop] = value;
            }
        });

        // Always capture these even if they have default values (important for layout)
        const alwaysCapture = ['display', 'position', 'width', 'height', 'table-layout', 'border-collapse'];
        alwaysCapture.forEach(prop => {
            const value = computed.getPropertyValue(prop);
            if (value) {
                styles[prop] = value;
            }
        });

        styleMap.set(el, styles);
    };

    captureElement(element);
    element.querySelectorAll('*').forEach(child => {
        if (child instanceof HTMLElement) {
            captureElement(child);
        }
    });

    return styleMap;
};

/**
 * Remove problematic stylesheets from document and return restore function.
 * Also ensures fonts remain loaded.
 */
const removeAllStylesheets = (): (() => void) => {
    const removedElements: Array<{ element: Element; parent: Node; nextSibling: Node | null }> = [];
    const addedElements: Array<HTMLElement> = [];

    // 1. Ensure Google Fonts are preserved/loaded
    // We explicitly check for Inter font link and inject it if it might be inside a removed stylesheet
    const fontUrl = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";
    const existingLink = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .find(link => link.getAttribute('href') === fontUrl);

    if (!existingLink) {
        // Inject the font link just for the capture session to ensure fonts are available
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = fontUrl;
        document.head.appendChild(link);
        addedElements.push(link);
    }

    // Helper to check if CSS text contains unsupported functionality
    const hasUnsupportedFeatures = (cssText: string): boolean => {
        return /(?:lab|oklch|oklab|lch)\s*\(/.test(cssText);
    };

    // 2. Scan and remove ONLY problematic stylesheets

    // Check <style> tags
    document.querySelectorAll('style').forEach(style => {
        if (style.textContent && hasUnsupportedFeatures(style.textContent)) {
            if (style.parentNode) {
                removedElements.push({
                    element: style,
                    parent: style.parentNode,
                    nextSibling: style.nextSibling
                });
                style.remove();
            }
        }
    });

    // Check <link> tags
    // We can't easily read the content of external links due to CORS,
    // but we can assume most external CSS (bootstrap, tailwind CDN) might be safe unless they are our own app's bundle.
    // However, for Next.js development, styles are often in <style> tags or local blobs.
    // We will aggressively remove LINKS that are NOT the font URL, just to be safe, 
    // relying on our inlineStyles to handle the look.
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
        const href = link.getAttribute('href') || '';

        // Skip the font URL we just verified/added
        if (href === fontUrl) return;

        // If it's a blob (dev mode) or local file, it likely contains our Tailwind config
        // We remove it to be safe, since we have fully inlined our styles.
        if (link.parentNode) {
            removedElements.push({
                element: link,
                parent: link.parentNode,
                nextSibling: link.nextSibling
            });
            link.remove();
        }
    });

    // Return restore function
    return () => {
        // Restore in reverse order
        removedElements.reverse().forEach(({ element, parent, nextSibling }) => {
            if (nextSibling) {
                parent.insertBefore(element, nextSibling);
            } else {
                parent.appendChild(element);
            }
        });

        // Remove added elements
        addedElements.forEach(el => el.remove());
    };
};

/**
 * Get html2canvas configuration optimized for WYSIWYG capture
 * @param styleMap - Pre-captured computed styles from the original document
 */
/**
 * Get html2canvas configuration optimized for WYSIWYG capture
 */
const getCanvasConfig = (element: HTMLElement) => ({
    scale: EXPORT_SCALE,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: '#ffffff',
    width: element.offsetWidth,
    height: element.offsetHeight,
    windowWidth: element.offsetWidth,
    windowHeight: element.offsetHeight,
    x: 0,
    y: 0,
    scrollX: 0,
    scrollY: 0,
    ignoreElements: (el: Element) => {
        return el.tagName === 'SCRIPT' || el.classList.contains('capture-ignore');
    },
    onclone: undefined,
});

/**
 * Capture the preview element as a canvas using html-to-image.
 */
import { toCanvas } from 'html-to-image';

export const capturePreviewAsCanvas = async (elementId: string): Promise<HTMLCanvasElement> => {
    const element = document.getElementById(elementId);
    if (!element) {
        throw new Error(`Element with id "${elementId}" not found`);
    }

    // Wait for resources on the main page first
    await waitForFonts();
    await waitForImages(element);

    const width = element.offsetWidth;
    const height = element.offsetHeight;

    try {
        const canvas = await toCanvas(element, {
            quality: 1.0,
            pixelRatio: EXPORT_SCALE,
            backgroundColor: '#ffffff',
            width: width,
            height: height,
            skipFonts: true,
            filter: (node) => {
                const el = node as HTMLElement;
                return !el.classList?.contains('export-ignore');
            }
        });

        return canvas;
    } catch (error) {
        console.error('html-to-image capture failed:', error);
        throw error;
    }
};

/**
 * Download element as high-quality PDF
 */
export const downloadPdf = async (elementId: string, filename: string): Promise<void> => {
    const toastId = toast.loading('Generating PDF...');

    try {
        const element = document.getElementById(elementId);
        if (!element) throw new Error('Element not found');

        // Get dimensions in mm (approximate based on 72 DPI)
        // 1 px = 0.352778 mm
        const pxToMm = 0.352778;
        const widthMm = element.offsetWidth * pxToMm;
        const heightMm = element.offsetHeight * pxToMm;

        const canvas = await capturePreviewAsCanvas(elementId);

        // Create PDF with custom dimensions matching the element
        const pdf = new jsPDF({
            orientation: widthMm > heightMm ? 'landscape' : 'portrait',
            unit: 'mm',
            format: [widthMm, heightMm],
            compress: true,
        });

        const imgData = canvas.toDataURL('image/png', 1.0);

        pdf.addImage(imgData, 'PNG', 0, 0, widthMm, heightMm);

        const safeFilename = sanitizeFilename(filename);
        pdf.save(`${safeFilename}.pdf`);
        toast.success('PDF downloaded successfully', { id: toastId });
    } catch (error) {
        console.error('PDF generation failed:', error);
        toast.error('Failed to generate PDF', { id: toastId });
        throw error;
    }
};

/**
 * Download element as high-quality PNG image
 */
export const downloadPng = async (elementId: string, filename: string): Promise<void> => {
    const toastId = toast.loading('Generating PNG...');

    try {
        const canvas = await capturePreviewAsCanvas(elementId);

        return new Promise((resolve, reject) => {
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        const safeFilename = sanitizeFilename(filename);
                        link.download = `${safeFilename}.png`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                        toast.success('PNG downloaded successfully', { id: toastId });
                        resolve();
                    } else {
                        toast.error('Failed to generate PNG', { id: toastId });
                        reject(new Error('Failed to create blob'));
                    }
                },
                'image/png',
                1.0
            );
        });
    } catch (error) {
        console.error('PNG generation failed:', error);
        toast.error('Failed to generate PNG', { id: toastId });
        throw error;
    }
};

/**
 * Print document
 * WYSIWYG: Captures preview exactly as displayed
 */
export const printDocument = async (elementId: string): Promise<void> => {
    const toastId = toast.loading('Preparing print...');

    try {
        const canvas = await capturePreviewAsCanvas(elementId);
        const imgData = canvas.toDataURL('image/png');

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast.error('Could not open print window. Please allow popups.', { id: toastId });
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Print Document</title>
                <style>
                    @page {
                        margin: 0;
                        size: A4 portrait;
                    }
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    html, body {
                        width: 210mm;
                        height: 297mm;
                        margin: 0;
                        padding: 0;
                    }
                    body {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: white;
                    }
                    img {
                        width: 210mm;
                        height: 297mm;
                        object-fit: contain;
                    }
                    @media print {
                        body {
                            background: white;
                        }
                        img {
                            width: 100%;
                            height: 100%;
                        }
                    }
                </style>
            </head>
            <body>
                <img src="${imgData}" onload="setTimeout(function() { window.print(); window.close(); }, 100);" />
            </body>
            </html>
        `);
        printWindow.document.close();
        toast.success('Print dialog opening...', { id: toastId });
    } catch (error) {
        console.error('Print failed:', error);
        toast.error('Failed to prepare print', { id: toastId });
        throw error;
    }
};

/**
 * Get canvas as data URL
 * Useful for previews or embedding
 */
export const getPreviewDataUrl = async (elementId: string): Promise<string> => {
    const canvas = await capturePreviewAsCanvas(elementId);
    return canvas.toDataURL('image/png', 1.0);
};
