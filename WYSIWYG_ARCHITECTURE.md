# Inflow WYSIWYG Export Architecture

> **STATUS: ETCHED IN STONE**
> **DATE: 2026-01-06**
> **CRITICAL:** Do not modify the underlying export engine without understanding the history documented below.

## 1. Core Philosophy: "Single Source of Truth"

Inflow's document generation relies on a strict principle: **The Preview DOM IS the Export Source.**

We do **NOT** use separate renderers for the screen and the PDF.
We do **NOT** re-construct the document using imperative PDF libraries (like `jspdf-autotable` or `pdfmake`).

The exact React component (`<DocumentRenderer />`) that the user sees on the screen is purely captured and converted to an image/PDF. This ensures 100% visual fidelity.

## 2. The Engine: html-to-image (SVG ForeignObject)

We utilize **`html-to-image`** as our capture engine.

### Why this method?
Unlike `html2canvas` (which attempts to "paint" the DOM onto a canvas by guessing CSS rules), `html-to-image` utilizes the browser's native rendering engine via **SVG ForeignObject**.

1.  It wraps the target DOM node in an `<foreignObject>` tag inside an SVG.
2.  It creates an image from that SVG.
3.  Because the browser renders the SVG, it **guarantees** that standard CSS (Flexbox, Grid, Fonts) renders exactly as it does on the webpage.

### 🚫 BANNED TECHNOLOGIES (Do not revert to these)
*   **html2canvas**: strictly banned. It fails to handle precise vertical alignment, clipping, and complex text metrics, leading to "floating" text and layout shifts.
*   **Direct Canvas Drawing**: Too brittle to maintain.
*   **Server-side Puppeteer**: Too heavy/expensive for client-side quick exports.

## 3. Critical Component Architecture

To ensure the "ForeignObject" method works perfectly, specific CSS strategies must be used in the components.

### A. `<DocumentRenderer />`
*   **Fixed Dimensions**: The container is strictly locked to **A4 dimensions (595px × 842px)**.
*   **Scale Independent**: All internal measurements use percentages or mapped pixels relative to this A4 container.
*   **Native Table Alignment**: We use standard HTML `<table>`, `<tr>`, and `<td>` for line items. We rely on standard `vertical-align: middle` rather than simulated Flexbox tables, as this is more robust across different rendering contexts.

### B. `<AutoFitText />`
*   **Layout Engine**: Uses `display: table` (Parent) and `display: table-cell` (Child).
*   **Vertical Alignment**: strictly uses `vertical-align: middle`.
*   **Why?**: Flexbox (`align-items: center`) occasionally suffers from sub-pixel rendering offsets in some browser engines when captured via SVG. The `table-cell` methods is mathematically perfect and unbreakable.

## 4. The Export Pipeline

1.  **Sanitization**: We strip invalid characters from filenames (`/`, `\`, etc.) to prevent file system errors.
2.  **Resource Loading**: We explicitly await `document.fonts.ready` and all images to ensure no "FOUC" (Flash of Unstyled Content) in the PDF.
3.  **Capture**: `html-to-image` captures the DOM node at a high scale (3x) for print-ready quality.
4.  **PDF Encapsulation**: We rely on `jspdf` **ONLY** as a container to hold the generated image, not to draw text.

## 5. Maintenance Rules

1.  **Never change the `width/height`** of `DocumentRenderer`. It mirrors physical paper.
2.  **Never switch `AutoFitText` back to Flexbox** for vertical centering.
3.  **Always test exports** with complex characters and long text to verify the `foreignObject` rendering is handling overflows correctly.
