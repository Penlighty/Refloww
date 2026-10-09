'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Height in px currently covered by the on-screen keyboard (0 when closed).
 *
 * - iOS Safari / iOS PWA: the layout viewport does NOT shrink, so `position: fixed; bottom: 0` bars hide behind
 *   the keyboard. Lift them by this inset.
 * - Android Chrome / Capacitor WebView with `interactiveWidget: 'resizes-content'` (set in layout.tsx viewport):
 *   the layout viewport shrinks, so fixed bars already ride above the keyboard and this returns 0.
 */
export function useKeyboardInset(): number {
    const subscribe = useCallback((onChange: () => void) => {
        const vv = typeof window !== 'undefined' ? window.visualViewport : null;
        if (!vv) return () => {};
        vv.addEventListener('resize', onChange);
        vv.addEventListener('scroll', onChange);
        return () => {
            vv.removeEventListener('resize', onChange);
            vv.removeEventListener('scroll', onChange);
        };
    }, []);

    const getSnapshot = useCallback(() => {
        const vv = window.visualViewport;
        if (!vv) return 0;
        const inset = Math.round(window.innerHeight - vv.height - vv.offsetTop);
        // Ignore small differences (browser chrome collapsing) — real keyboards are > 120px.
        return inset > 120 ? inset : 0;
    }, []);

    return useSyncExternalStore(subscribe, getSnapshot, () => 0);
}
