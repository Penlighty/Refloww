'use client';

import { useEffect, useRef } from 'react';

/**
 * Makes the system Back gesture / Android hardware Back button / browser Back close the topmost overlay
 * (Sheet, drawer, lightbox) instead of leaving the page.
 *
 * - Opening pushes one history entry; Back pops it and closes the overlay.
 * - Closing programmatically (X button, backdrop, Save) removes that entry again.
 * - Overlays stack: Back only closes the top one.
 * - If the user navigates somewhere else while an overlay is open, the leftover entry is left alone
 *   (one extra Back press) rather than risking navigating the user backwards.
 */

interface Entry {
    token: string;
    close: () => void;
}

const stack: Entry[] = [];
let listening = false;
let ignorePops = 0;

function onPopState() {
    if (ignorePops > 0) {
        ignorePops -= 1;
        return;
    }
    const top = stack.pop();
    top?.close();
}

export function useOverlayHistory(open: boolean, onClose: () => void) {
    const closeRef = useRef(onClose);
    useEffect(() => {
        closeRef.current = onClose;
    });

    useEffect(() => {
        if (!open || typeof window === 'undefined') return;

        const token = `rf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
        const entry: Entry = { token, close: () => closeRef.current() };
        stack.push(entry);
        window.history.pushState({ ...(window.history.state ?? {}), rfOverlay: token }, '');

        if (!listening) {
            window.addEventListener('popstate', onPopState);
            listening = true;
        }

        return () => {
            const index = stack.indexOf(entry);
            if (index === -1) return; // already popped by the Back gesture
            stack.splice(index, 1);
            // Only rewind if the current entry is still ours (user didn't navigate away meanwhile).
            if (window.history.state?.rfOverlay === token) {
                ignorePops += 1;
                window.history.back();
            }
        };
    }, [open]);
}
