"use client";

/**
 * Document Preview Wrapper
 * 
 * This component wraps the DocumentRenderer for preview display.
 * It handles responsive scaling WITHOUT affecting the actual document dimensions.
 * 
 * IMPORTANT: The DocumentRenderer inside remains at fixed A4 dimensions.
 * Only the wrapper scales for display purposes. During export, the
 * WYSIWYG system captures the DocumentRenderer directly, bypassing this wrapper.
 */

import React, { useRef, useEffect, useState, ReactNode } from 'react';

// A4 dimensions at 72 DPI
const A4_WIDTH = 595;
const A4_HEIGHT = 842;

interface DocumentPreviewWrapperProps {
    children: ReactNode;
    className?: string;
    /** Maximum scale factor (1 = 100%) */
    maxScale?: number;
    /** Padding around the document in pixels */
    padding?: number;
    /** Document width in pixels (default: A4 Portrait 595) */
    width?: number;
    /** Document height in pixels (default: A4 Portrait 842) */
    height?: number;
    /** Fit mode: 'contain' (fit both dimensions) or 'width' (fit width, scroll height) */
    fit?: 'contain' | 'width';
}

export default function DocumentPreviewWrapper({
    children,
    className = '',
    maxScale = 1,
    padding = 16,
    width = A4_WIDTH,
    height = A4_HEIGHT,
    fit = 'contain',
}: DocumentPreviewWrapperProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const updateScale = () => {
            if (!containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            const availableWidth = rect.width - (padding * 2);
            const availableHeight = rect.height - (padding * 2);

            // Calculate scale to fit width
            const scaleX = availableWidth / width;

            let newScale = scaleX;

            if (fit === 'contain') {
                const scaleY = availableHeight / height;
                newScale = Math.min(scaleX, scaleY);
            }

            // Apply max scale cap
            newScale = Math.min(newScale, maxScale);

            setScale(Math.max(0.1, newScale)); // Minimum 10% scale
        };

        // Initial calculation
        updateScale();

        // Update on resize
        window.addEventListener('resize', updateScale);

        // Also observe container size changes
        const resizeObserver = new ResizeObserver(updateScale);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => {
            window.removeEventListener('resize', updateScale);
            resizeObserver.disconnect();
        };
    }, [maxScale, padding, width, height]);

    return (
        <div
            ref={containerRef}
            className={`document-preview-wrapper ${className}`}
            style={{
                display: 'flex',
                alignItems: 'center', // Center vertically
                justifyContent: 'center', // Center horizontally
                width: '100%',
                height: '100%',
                overflow: 'hidden', // Prevent scrollbars from wrapper, let scaler handle it
                padding: `${padding}px`,
                boxSizing: 'border-box',
            }}
        >
            <div
                className="document-preview-scaler"
                style={{
                    transform: `scale(${scale})`,
                    transformOrigin: 'center center', // Scale from center
                    transition: 'transform 0.15s ease-out',
                    // Reserve space for the scaled document
                    width: width,
                    height: height,
                    flexShrink: 0,
                    // Ensure shadow/border are visible
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                }}
            >
                {/* The DocumentRenderer is rendered here unchanged */}
                {children}
            </div>
        </div>
    );
}
