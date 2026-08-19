"use client";

import { useState, useEffect } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    FileText,
    Receipt,
    Truck,
    Image as ImageIcon,
    Layers
} from 'lucide-react';

export interface TemplateSheet {
    id: string;
    label: string;
    type: 'invoice' | 'receipt' | 'delivery-note' | 'cover' | string;
    imageUrl: string;
}

interface TemplateSheetSliderProps {
    sheets: TemplateSheet[];
    className?: string;
}

const typeIconMap: Record<string, any> = {
    'invoice': FileText,
    'receipt': Receipt,
    'delivery-note': Truck,
    'cover': ImageIcon
};

const typeColorMap: Record<string, string> = {
    'invoice': 'bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    'receipt': 'bg-purple-50 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    'delivery-note': 'bg-amber-50 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    'cover': 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
};

export default function TemplateSheetSlider({ sheets, className = '' }: TemplateSheetSliderProps) {
    const [activeIndex, setActiveIndex] = useState(0);

    // Reset index if sheets change
    useEffect(() => {
        setActiveIndex(0);
    }, [sheets]);

    if (!sheets || sheets.length === 0) {
        return (
            <div className="w-full aspect-[4/3] rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400">
                <ImageIcon className="w-12 h-12 opacity-40" />
            </div>
        );
    }

    const activeSheet = sheets[activeIndex] || sheets[0];

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveIndex((prev) => (prev === 0 ? sheets.length - 1 : prev - 1));
    };

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveIndex((prev) => (prev === sheets.length - 1 ? 0 : prev + 1));
    };

    return (
        <div className={`space-y-3 ${className}`}>
            {/* Sheet Tabs Header (when multiple sheets exist) */}
            {sheets.length > 1 && (
                <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5 text-blue-500" />
                            Preview Sheets:
                        </span>
                        {sheets.map((sheet, index) => {
                            const IconComponent = typeIconMap[sheet.type] || ImageIcon;
                            const isActive = index === activeIndex;

                            return (
                                <button
                                    key={`${sheet.id}-${index}`}
                                    type="button"
                                    onClick={() => setActiveIndex(index)}
                                    className={`
                                        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all shrink-0
                                        ${isActive
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 scale-[1.02]'
                                            : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                                        }
                                    `}
                                >
                                    <IconComponent className="w-3.5 h-3.5" />
                                    <span>{sheet.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    <span className="text-xs font-mono text-neutral-400 dark:text-neutral-500 shrink-0">
                        {activeIndex + 1} / {sheets.length}
                    </span>
                </div>
            )}

            {/* Main Preview Container */}
            <div className="relative group rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-900 shadow-inner flex items-center justify-center min-h-[260px] max-h-[460px]">
                {/* Image */}
                <img
                    src={activeSheet.imageUrl}
                    alt={activeSheet.label}
                    className="w-full h-auto max-h-[460px] object-contain transition-all duration-300"
                />

                {/* Top Badge Overlay */}
                <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border shadow-sm backdrop-blur-md ${typeColorMap[activeSheet.type] || typeColorMap['cover']}`}>
                        {(() => {
                            const IconComponent = typeIconMap[activeSheet.type] || ImageIcon;
                            return <IconComponent className="w-3.5 h-3.5" />;
                        })()}
                        {activeSheet.label}
                    </span>
                </div>

                {/* Left/Right Navigation Arrows */}
                {sheets.length > 1 && (
                    <>
                        <button
                            type="button"
                            onClick={handlePrev}
                            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-all opacity-80 group-hover:opacity-100 hover:scale-110 shadow-lg z-20"
                            title="Previous Sheet"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            type="button"
                            onClick={handleNext}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-all opacity-80 group-hover:opacity-100 hover:scale-110 shadow-lg z-20"
                            title="Next Sheet"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </>
                )}

                {/* Bottom Dots Indicator */}
                {sheets.length > 1 && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md">
                        {sheets.map((_, index) => (
                            <button
                                key={index}
                                type="button"
                                onClick={() => setActiveIndex(index)}
                                className={`rounded-full transition-all ${
                                    index === activeIndex
                                        ? 'w-5 h-2 bg-blue-500'
                                        : 'w-2 h-2 bg-white/50 hover:bg-white'
                                }`}
                                title={`Go to sheet ${index + 1}`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Utility to extract all previewable sheets from a Marketplace template or local template object.
 */
export function extractTemplateSheets(template: any): TemplateSheet[] {
    if (!template) return [];
    const sheets: TemplateSheet[] = [];

    const data = template.templateData || template;

    if (data) {
        // Connected variants
        if (data.mode === 'connected' && data.variants) {
            const variantKeys: Array<'invoice' | 'receipt' | 'delivery-note'> = ['invoice', 'receipt', 'delivery-note'];
            variantKeys.forEach((vKey) => {
                const variant = data.variants[vKey];
                if (variant && variant.imageUrl) {
                    const label = vKey === 'invoice' ? 'Invoice Sheet' :
                                  vKey === 'receipt' ? 'Receipt Sheet' :
                                  vKey === 'delivery-note' ? 'Delivery Note Sheet' : `${vKey} Sheet`;
                    sheets.push({
                        id: vKey,
                        label,
                        type: vKey,
                        imageUrl: variant.imageUrl
                    });
                }
            });
        }

        // Main template image
        if (data.imageUrl && !sheets.some(s => s.imageUrl === data.imageUrl)) {
            const rawType = data.type || template.type || 'invoice';
            const label = rawType === 'invoice' ? 'Invoice Sheet' :
                          rawType === 'receipt' ? 'Receipt Sheet' :
                          rawType === 'delivery-note' ? 'Delivery Note Sheet' : 'Main Template Sheet';

            // Insert main sheet at top
            sheets.unshift({
                id: 'main',
                label,
                type: rawType,
                imageUrl: data.imageUrl
            });
        }
    }

    // Cover thumbnail fallback
    const thumbnail = template.thumbnail || template.coverImage;
    if (thumbnail && !sheets.some(s => s.imageUrl === thumbnail)) {
        sheets.unshift({
            id: 'cover',
            label: 'Cover Overview',
            type: 'cover',
            imageUrl: thumbnail
        });
    }

    return sheets;
}
