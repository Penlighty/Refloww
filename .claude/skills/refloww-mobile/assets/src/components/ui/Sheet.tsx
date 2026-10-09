'use client';

import {
    useCallback,
    useEffect,
    useId,
    useRef,
    useState,
    type CSSProperties,
    type KeyboardEvent as ReactKeyboardEvent,
    type PointerEvent as ReactPointerEvent,
    type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { useOverlayHistory } from '@/lib/hooks/useOverlayHistory';
import { useKeyboardInset } from '@/lib/hooks/useKeyboardInset';
import { usePrefersReducedMotion } from '@/lib/hooks/useMediaQuery';

/**
 * Sheet — the single overlay primitive for Refloww.
 *   < md : bottom sheet (grabber, drag-to-dismiss, safe-area, keyboard-aware, Back closes it)
 *   ≥ md : centred dialog
 * Motion lives in CSS (.rf-sheet-panel / .rf-scrim in globals-mobile.css) and is driven by the --rf-shown,
 * --rf-drag and --rf-scrim custom properties, so dragging never re-renders React.
 *
 * Dismiss: tap scrim, Esc, drag the grabber/header down > 25% of the panel or flick > 0.5px/ms, system Back.
 */

const EXIT_MS = 240;
const DISMISS_RATIO = 0.25;
const DISMISS_VELOCITY = 0.5; // px per ms

export interface SheetProps {
    open: boolean;
    onClose: () => void;
    title?: ReactNode;
    description?: ReactNode;
    children: ReactNode;
    /** Sticky footer (primary action). Gets safe-area padding. */
    footer?: ReactNode;
    /** Max width from md up. */
    size?: 'sm' | 'md' | 'lg' | 'xl';
    /** Mobile height: content-sized (default), 85% of the screen, or the whole screen under the status bar. */
    height?: 'auto' | 'tall' | 'full';
    /** Allow closing via scrim / Esc / drag. Set false for blocking flows (e.g. mandatory unlock). */
    dismissible?: boolean;
    hideCloseButton?: boolean;
    className?: string;
    bodyClassName?: string;
}

const SIZE_CLASS: Record<NonNullable<SheetProps['size']>, string> = {
    sm: 'md:max-w-sm',
    md: 'md:max-w-lg',
    lg: 'md:max-w-2xl',
    xl: 'md:max-w-4xl',
};

const HEIGHT_CLASS: Record<NonNullable<SheetProps['height']>, string> = {
    auto: '',
    tall: 'h-[85dvh]',
    full: 'h-[calc(100dvh-var(--safe-top,0px))]',
};

const FOCUSABLE =
    'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function Sheet({
    open,
    onClose,
    title,
    description,
    children,
    footer,
    size = 'md',
    height = 'auto',
    dismissible = true,
    hideCloseButton = false,
    className,
    bodyClassName,
}: SheetProps) {
    const reduceMotion = usePrefersReducedMotion();
    const keyboard = useKeyboardInset();
    const titleId = useId();
    const descId = useId();

    const [present, setPresent] = useState(open); // mounted
    const [shown, setShown] = useState(false); // animated-in

    const rootRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const returnFocusRef = useRef<HTMLElement | null>(null);
    const drag = useRef<{ startY: number; lastY: number; lastT: number; velocity: number } | null>(null);

    const requestClose = useCallback(() => {
        if (dismissible) onClose();
    }, [dismissible, onClose]);

    useOverlayHistory(open && dismissible, requestClose);

    // Mount → next frame animate in. Close → animate out → unmount.
    useEffect(() => {
        if (open) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- mount must precede the enter animation frame
            setPresent(true);
            returnFocusRef.current = document.activeElement as HTMLElement | null;
            let raf2 = 0;
            const raf1 = requestAnimationFrame(() => {
                raf2 = requestAnimationFrame(() => setShown(true));
            });
            return () => {
                cancelAnimationFrame(raf1);
                cancelAnimationFrame(raf2);
            };
        }
        setShown(false);
        const timer = window.setTimeout(() => setPresent(false), reduceMotion ? 0 : EXIT_MS);
        return () => window.clearTimeout(timer);
    }, [open, reduceMotion]);

    // Focus management: move focus in on open, restore on close.
    useEffect(() => {
        if (!shown) return;
        const panel = panelRef.current;
        if (panel) {
            const first = panel.querySelector<HTMLElement>('[data-autofocus]') ?? panel;
            first.focus({ preventScroll: true });
        }
        const returnTo = returnFocusRef.current;
        return () => returnTo?.focus?.({ preventScroll: true });
    }, [shown]);

    // Reset drag state whenever the sheet (re)opens.
    useEffect(() => {
        if (open) {
            panelRef.current?.style.removeProperty('--rf-drag');
            rootRef.current?.style.removeProperty('--rf-scrim');
        }
    }, [open]);

    const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Escape') {
            e.stopPropagation();
            requestClose();
            return;
        }
        if (e.key !== 'Tab') return;
        const nodes = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
        if (nodes.length === 0) {
            e.preventDefault();
            return;
        }
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    };

    // ---- Drag to dismiss (handle + header only, so the scrolling body is never hijacked) ----
    const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
        if (!dismissible) return;
        if (e.pointerType === 'mouse') return; // desktop uses the X button / Esc
        if ((e.target as HTMLElement).closest('button, a, input, select, textarea')) return;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        drag.current = { startY: e.clientY, lastY: e.clientY, lastT: e.timeStamp, velocity: 0 };
        panelRef.current?.setAttribute('data-dragging', 'true');
    };

    const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
        const d = drag.current;
        const panel = panelRef.current;
        if (!d || !panel) return;
        const dy = e.clientY - d.startY;
        const dt = Math.max(1, e.timeStamp - d.lastT);
        d.velocity = (e.clientY - d.lastY) / dt;
        d.lastY = e.clientY;
        d.lastT = e.timeStamp;
        const offset = dy > 0 ? dy : Math.max(dy * 0.25, -24); // rubber-band upwards
        panel.style.setProperty('--rf-drag', `${offset}px`);
        const progress = Math.min(1, Math.max(0, dy) / Math.max(1, panel.offsetHeight));
        rootRef.current?.style.setProperty('--rf-scrim', String(1 - progress * 0.8));
    };

    const endDrag = (e: ReactPointerEvent<HTMLElement>) => {
        const d = drag.current;
        const panel = panelRef.current;
        if (!d || !panel) return;
        drag.current = null;
        panel.removeAttribute('data-dragging');
        const dy = e.clientY - d.startY;
        const shouldClose = dy > panel.offsetHeight * DISMISS_RATIO || d.velocity > DISMISS_VELOCITY;
        if (shouldClose) {
            requestClose();
        } else {
            panel.style.setProperty('--rf-drag', '0px'); // snap back (CSS transition)
            rootRef.current?.style.removeProperty('--rf-scrim');
        }
    };

    if (!present || typeof document === 'undefined') return null;

    const rootStyle = { '--rf-shown': shown ? 1 : 0, paddingBottom: keyboard || undefined } as CSSProperties;

    return createPortal(
        <div
            ref={rootRef}
            style={rootStyle}
            className="fixed inset-0 z-[60] flex items-end justify-center md:items-center md:p-6"
            onKeyDown={onKeyDown}
        >
            <div className="rf-scrim" onClick={requestClose} aria-hidden="true" />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? titleId : undefined}
                aria-describedby={description ? descId : undefined}
                tabIndex={-1}
                data-shown={shown}
                className={clsx(
                    'rf-sheet-panel relative flex w-full flex-col overflow-hidden outline-none',
                    'bg-paper border border-line shadow-sheet',
                    'rounded-t-sheet md:rounded-sheet md:max-h-[90dvh]',
                    SIZE_CLASS[size],
                    HEIGHT_CLASS[height],
                    height === 'auto' && 'max-h-[calc(100dvh-var(--safe-top,0px)-12px)]',
                    className
                )}
                style={keyboard ? { maxHeight: `calc(100dvh - ${keyboard}px - var(--safe-top, 0px) - 12px)` } : undefined}
            >
                {/* Grabber + header = the drag region */}
                <div
                    className="touch-none select-none"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                >
                    {dismissible && (
                        <div className="flex justify-center pt-2 md:hidden" aria-hidden="true">
                            <span className="h-1 w-9 rounded-full bg-line-strong" />
                        </div>
                    )}
                    {(title || !hideCloseButton) && (
                        <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-3 md:px-5 md:pt-5">
                            <div className="min-w-0">
                                {title && (
                                    <h2 id={titleId} className="font-heading text-title font-semibold tracking-[-0.015em] text-ink">
                                        {title}
                                    </h2>
                                )}
                                {description && (
                                    <p id={descId} className="mt-0.5 text-body text-ink-3">
                                        {description}
                                    </p>
                                )}
                            </div>
                            {!hideCloseButton && dismissible && (
                                <button
                                    type="button"
                                    onClick={requestClose}
                                    aria-label="Close"
                                    className="-mr-1.5 -mt-1 grid size-11 shrink-0 place-items-center rounded-ctl text-ink-3 hover:bg-paper-2 hover:text-ink md:size-9"
                                >
                                    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                                        <path d="M6 6l12 12M18 6L6 18" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div
                    className={clsx(
                        'flex-1 overflow-y-auto overscroll-contain px-4 md:px-5',
                        footer ? 'pb-4' : 'pb-[max(16px,var(--safe-bottom,0px))] md:pb-5',
                        bodyClassName
                    )}
                >
                    {children}
                </div>

                {footer && (
                    <div className="shrink-0 border-t border-line bg-paper px-4 pb-[max(12px,var(--safe-bottom,0px))] pt-3 md:px-5 md:pb-4">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
