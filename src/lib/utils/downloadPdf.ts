import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'react-hot-toast';

// A4 at 72 DPI
const BASE_WIDTH = 595;
const BASE_HEIGHT = 842;

/**
 * Creates a completely isolated clone in an iframe.
 * This prevents html2canvas from seeing any unsupported CSS color functions
 * from the parent document's stylesheets.
 */
const createIsolatedClone = async (element: HTMLElement): Promise<{ iframe: HTMLIFrameElement; clone: HTMLElement }> => {
    // Wait for fonts
    await document.fonts.ready;

    // Create hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.cssText = `
        position: fixed;
        left: -9999px;
        top: 0;
        width: ${BASE_WIDTH}px;
        height: ${BASE_HEIGHT}px;
        border: none;
        visibility: hidden;
        pointer-events: none;
    `;
    document.body.appendChild(iframe);

    // Wait for iframe to be ready
    await new Promise<void>(resolve => {
        iframe.onload = () => resolve();
        // Fallback in case onload doesn't fire for about:blank
        setTimeout(resolve, 100);
    });

    const iframeDoc = iframe.contentDocument!;
    const iframeWin = iframe.contentWindow!;

    // Write minimal HTML structure with ONLY safe CSS
    iframeDoc.open();
    iframeDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                /* Reset all elements to safe colors */
                * {
                    box-sizing: border-box;
                }
                body {
                    margin: 0;
                    padding: 0;
                    background: #ffffff;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                }
            </style>
        </head>
        <body></body>
        </html>
    `);
    iframeDoc.close();

    // Clone the element
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.cssText = `
        width: ${BASE_WIDTH}px;
        height: ${BASE_HEIGHT}px;
        position: relative;
        background: #ffffff;
        overflow: hidden;
    `;

    // Copy computed styles from original element to clone, converting any problematic colors
    copyComputedStyles(element, clone);

    // Append clone to iframe body
    iframeDoc.body.appendChild(clone);

    // Load fonts into iframe
    const fontLink = iframeDoc.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
    iframeDoc.head.appendChild(fontLink);

    // Wait for fonts and layout
    await new Promise(resolve => setTimeout(resolve, 200));

    return { iframe, clone };
};

/**
 * Copy computed styles from source to target, sanitizing colors
 */
const copyComputedStyles = (source: HTMLElement, target: HTMLElement) => {
    const sourceChildren = source.querySelectorAll('*');
    const targetChildren = target.querySelectorAll('*');

    // Process all elements including the root
    const processElement = (src: HTMLElement, tgt: HTMLElement) => {
        try {
            const computed = window.getComputedStyle(src);

            // Copy essential styles, sanitizing colors
            const safeColor = (val: string): string => {
                if (typeof val === 'string' && (
                    val.includes('lab(') ||
                    val.includes('oklch(') ||
                    val.includes('oklab(') ||
                    val.includes('lch(') ||
                    val.includes('color(')
                )) {
                    return 'transparent';
                }
                return val;
            };

            // Apply safe inline styles for critical properties
            tgt.style.color = safeColor(computed.color) || '#000000';
            tgt.style.backgroundColor = safeColor(computed.backgroundColor);
            tgt.style.borderColor = safeColor(computed.borderColor);
            tgt.style.fontSize = computed.fontSize;
            tgt.style.fontWeight = computed.fontWeight;
            tgt.style.fontFamily = computed.fontFamily;
            tgt.style.lineHeight = computed.lineHeight;
            tgt.style.textAlign = computed.textAlign;
            tgt.style.padding = computed.padding;
            tgt.style.margin = computed.margin;

            // For positioned elements, keep their positioning
            if (computed.position === 'absolute' || computed.position === 'relative') {
                tgt.style.position = computed.position;
                tgt.style.left = computed.left;
                tgt.style.top = computed.top;
                tgt.style.width = computed.width;
                tgt.style.height = computed.height;
            }
        } catch (e) {
            // Ignore errors
        }
    };

    processElement(source, target);

    for (let i = 0; i < sourceChildren.length && i < targetChildren.length; i++) {
        processElement(sourceChildren[i] as HTMLElement, targetChildren[i] as HTMLElement);
    }
};

/**
 * Canvas config for iframe capture
 */
const getCanvasConfig = (element: HTMLElement, win: Window) => ({
    scale: 3,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: '#ffffff',
    width: element.offsetWidth,
    height: element.offsetHeight,
    windowWidth: element.offsetWidth,
    windowHeight: element.offsetHeight,
});

/**
 * Download element as high-quality PDF
 */
export const downloadPdf = async (elementId: string, filename: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
        toast.error('Could not find document element');
        return;
    }

    const toastId = toast.loading('Generating PDF...');
    let iframe: HTMLIFrameElement | null = null;

    try {
        // Create isolated clone in iframe
        const { iframe: iframeEl, clone } = await createIsolatedClone(element);
        iframe = iframeEl;

        // Capture from iframe window context
        const canvas = await html2canvas(clone, getCanvasConfig(clone, iframe.contentWindow!));

        // A4 dimensions in mm
        const a4Width = 210;
        const a4Height = 297;

        const elementAspect = canvas.width / canvas.height;
        const a4Aspect = a4Width / a4Height;

        let imgWidth, imgHeight, xOffset, yOffset;

        if (elementAspect > a4Aspect) {
            imgWidth = a4Width;
            imgHeight = a4Width / elementAspect;
            xOffset = 0;
            yOffset = (a4Height - imgHeight) / 2;
        } else {
            imgHeight = a4Height;
            imgWidth = a4Height * elementAspect;
            xOffset = (a4Width - imgWidth) / 2;
            yOffset = 0;
        }

        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true
        });

        const imgData = canvas.toDataURL('image/png', 1.0);
        pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight);

        pdf.save(`${filename}.pdf`);
        toast.success('PDF downloaded successfully', { id: toastId });
    } catch (error) {
        console.error('PDF generation failed:', error);
        toast.error('Failed to generate PDF', { id: toastId });
    } finally {
        if (iframe?.parentNode) {
            iframe.parentNode.removeChild(iframe);
        }
    }
};

/**
 * Download element as high-quality PNG image
 */
export const downloadPng = async (elementId: string, filename: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
        toast.error('Could not find document element');
        return;
    }

    const toastId = toast.loading('Generating PNG...');
    let iframe: HTMLIFrameElement | null = null;

    try {
        const { iframe: iframeEl, clone } = await createIsolatedClone(element);
        iframe = iframeEl;

        const canvas = await html2canvas(clone, getCanvasConfig(clone, iframe.contentWindow!));

        canvas.toBlob((blob) => {
            if (blob) {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${filename}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                toast.success('PNG downloaded successfully', { id: toastId });
            } else {
                toast.error('Failed to generate PNG', { id: toastId });
            }
        }, 'image/png', 1.0);
    } catch (error) {
        console.error('PNG generation failed:', error);
        toast.error('Failed to generate PNG', { id: toastId });
    } finally {
        if (iframe?.parentNode) {
            iframe.parentNode.removeChild(iframe);
        }
    }
};

/**
 * Print element
 */
export const printDocument = async (elementId: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
        toast.error('Could not find document element');
        return;
    }

    const toastId = toast.loading('Preparing print...');
    let iframe: HTMLIFrameElement | null = null;

    try {
        const { iframe: iframeEl, clone } = await createIsolatedClone(element);
        iframe = iframeEl;

        const canvas = await html2canvas(clone, getCanvasConfig(clone, iframe.contentWindow!));
        const imgData = canvas.toDataURL('image/png');

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Print Document</title>
                    <style>
                        @page { margin: 0; size: auto; }
                        body { margin: 0; padding: 0; display: flex; justify-content: center; background: #f5f5f5; }
                        .paper { 
                            width: 210mm; 
                            height: 297mm; 
                            background: white;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        }
                        img { width: 100%; height: 100%; object-fit: contain; }
                    </style>
                </head>
                <body>
                    <div class="paper">
                        <img src="${imgData}" onload="window.print(); window.close();" />
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();
            toast.success('Print dialog opened', { id: toastId });
        } else {
            toast.error('Could not open print window', { id: toastId });
        }
    } catch (error) {
        console.error('Print failed:', error);
        toast.error('Failed to prepare print', { id: toastId });
    } finally {
        if (iframe?.parentNode) {
            iframe.parentNode.removeChild(iframe);
        }
    }
};
