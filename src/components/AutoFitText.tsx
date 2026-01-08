"use client";

/**
 * AutoFitText Component
 * 
 * ARCHITECTURE: TABLE-LAYOUT IS CRITICAL (Do not use Flexbox)
 * 
 * Intelligent text component that auto-scales font size to fit assigned space.
 * 
 * CRITICAL: This component uses a `display: table` layout strategy because
 * it is the ONLY method that guarantees bit-perfect vertical centering
 * when exported via SVG ForeignObject (html-to-image).
 * 
 * Flexbox `align-items: center` is notoriously drifting in canvas exports.
 */

import React, { useRef, useState, useLayoutEffect } from 'react';

interface AutoFitTextProps {
    value: string | React.ReactNode;
    fontSize: number;
    fontWeight: string | number;
    alignment: string;
    fontColor?: string;
    isMultiLine: boolean;
    className?: string;
    /** Minimum font size to shrink to */
    maxShrink?: number;
}

/**
 * Convert fontWeight string to numeric value
 */
const normalizeFontWeight = (weight: string | number): number => {
    if (typeof weight === 'number') return weight;

    switch (weight) {
        case 'bold': return 700;
        case 'semibold': return 600;
        case 'medium': return 500;
        case 'normal':
        case 'regular':
        default: return 400;
    }
};

export const AutoFitText = ({
    value,
    fontSize: initialFontSize,
    fontWeight,
    alignment,
    fontColor = '#2d3748',
    isMultiLine,
    className = '',
    maxShrink = 6
}: AutoFitTextProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [fontSize, setFontSize] = useState(initialFontSize);

    useLayoutEffect(() => {
        const container = containerRef.current;
        const content = contentRef.current;

        if (!container || !content) return;

        // Start with the initial font size
        let currentSize = initialFontSize;
        content.style.fontSize = `${currentSize}px`;

        // Get container dimensions
        const containerHeight = container.offsetHeight;
        const containerWidth = container.offsetWidth;

        // Skip if container has no dimensions
        if (containerHeight === 0 || containerWidth === 0) return;

        /**
         * Check if content overflows container
         */
        const checkOverflow = (): boolean => {
            if (!content) return false;

            // Strict check with safety margin: treat container as slightly smaller
            // This ensures text shrinks BEFORE it hits the edge
            const availableHeight = containerHeight - 4;
            const hasVerticalOverflow = content.scrollHeight > availableHeight;

            const availableWidth = containerWidth - (isMultiLine ? 4 : 0);
            const hasHorizontalOverflow = !isMultiLine && content.scrollWidth > containerWidth;

            return hasVerticalOverflow || hasHorizontalOverflow;
        };

        // Only shrink if there's actual overflow
        if (checkOverflow()) {
            let iterations = 0;
            const maxIterations = 60; // Safety limit

            while (checkOverflow() && currentSize > maxShrink && iterations < maxIterations) {
                currentSize -= 0.5;
                content.style.fontSize = `${currentSize}px`;
                iterations++;
            }
        }

        setFontSize(currentSize);
    }, [value, initialFontSize, isMultiLine, maxShrink]);

    // Normalize font weight to numeric
    const numericWeight = normalizeFontWeight(fontWeight);

    // Container styles (table for bulletproof canvas vertical centering)
    // Flexbox often fails in html2canvas for vertical centering
    const containerStyle: React.CSSProperties = {
        width: '100%',
        height: '100%',
        display: 'table',
        tableLayout: 'fixed',
        overflow: 'hidden',
        boxSizing: 'border-box',
    };

    // Wrapper for table-cell behavior
    const cellStyle: React.CSSProperties = {
        display: 'table-cell',
        verticalAlign: 'middle',
        width: '100%',
        height: '100%',
        padding: 0,
    };

    // Content styles
    const contentStyle: React.CSSProperties = {
        display: 'block',
        width: '100%',
        fontSize: `${fontSize}px`,
        fontWeight: numericWeight,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
        textAlign: alignment as React.CSSProperties['textAlign'],
        color: fontColor,
        lineHeight: isMultiLine ? '1.35' : '1.2',
        letterSpacing: '0',
        whiteSpace: isMultiLine ? 'pre-wrap' : 'nowrap',
        wordBreak: isMultiLine ? 'break-word' : 'normal',
        overflow: 'hidden',
        boxSizing: 'border-box',
        textRendering: 'geometricPrecision',
        WebkitFontSmoothing: 'antialiased',
        marginTop: 0,
        marginBottom: 0,
        padding: 0,
    };

    return (
        <div
            ref={containerRef}
            className={`autofit-container ${className}`}
            style={containerStyle}
        >
            <div style={cellStyle}>
                <div
                    ref={contentRef}
                    className={`autofit-content ${isMultiLine ? 'autofit-content--multi' : 'autofit-content--single'}`}
                    style={contentStyle}
                >
                    {value}
                </div>
            </div>
        </div>
    );
};
