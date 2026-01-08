# Refloww (formerly Inflow)

Refloww is a modern, privacy-focused financial document manager built with Next.js, React, and Tailwind CSS. It allows you to create, manage, and export beautiful invoices, receipts, and delivery notes using a powerful WYSIWYG template editor.

## Key Features

*   **WYSIWYG Template Editor:** distinct Drag-and-drop interface to resize, align, and customize fields.
*   **Smart Interactions:** Snap-to-grid, multi-selection, keyboard shortcuts (Ctrl+Z, Ctrl+C/V), and alignment tools.
*   **Privacy First:** All data is stored locally in your browser (LocalStorage) or on your file system. No external database required.
*   **Pixel-Perfect Export:** What you see is *exactly* what gets exported to PDF/PNG.
*   **Connected Templates:** Define a single design system that automatically adapts to Invoices, Receipts, and Delivery Notes.
*   **Dark Mode:** Sleek, built-in dark mode support.

## Tech Stack

*   **Framework:** Next.js 15 (App Router)
*   **Styling:** Tailwind CSS + Vanilla CSS (for print precision)
*   **State Management:** Zustand
*   **Drag & Drop:** dnd-kit
*   **Icons:** Lucide React

## Getting Started

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Run the development server:**
    ```bash
    npm run dev
    ```

3.  Open [http://localhost:3000](http://localhost:3000) with your browser.

## Project Structure

*   `src/app`: Next.js App Router pages and layouts.
*   `src/components`: Reusable UI components.
*   `src/lib`: Utilities, stores (Zustand), and type definitions.
*   `src/lib/types/index.ts`: Core data models (Document, Template, Field).
