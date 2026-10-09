'use client';

import { useCallback, useSyncExternalStore } from 'react';

/** Tailwind default breakpoints (px). Media queries use the browser's 16px rem, so html{font-size:14px} does NOT shift them. */
export const BREAKPOINTS = { sm: 640, md: 768, lg: 1024, xl: 1280 } as const;

/**
 * Subscribe to a CSS media query. SSR-safe (returns `serverValue` on the server and during hydration).
 * Prefer CSS (`md:hidden`, `lg:grid-cols-3`) for layout; use this only for *behaviour* that CSS cannot express
 * (e.g. choose Sheet vs Popover, enable swipe, skip an effect). Reactive to resize and rotation.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
    const subscribe = useCallback(
        (onChange: () => void) => {
            const mql = window.matchMedia(query);
            mql.addEventListener('change', onChange);
            return () => mql.removeEventListener('change', onChange);
        },
        [query]
    );
    const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);
    return useSyncExternalStore(subscribe, getSnapshot, () => serverValue);
}

/** The app-shell switch (matches the `desk:` / `mob:` CSS variants): desktop shell needs ≥768px wide AND ≥500px tall. */
export const SHELL_DESKTOP_QUERY = '(min-width: 768px) and (min-height: 500px)';
export const useIsDesktopShell = () => useMediaQuery(SHELL_DESKTOP_QUERY);
/** Mobile shell (top bar + tab bar), including phones in landscape. */
export const useIsMobileShell = () => !useMediaQuery(SHELL_DESKTOP_QUERY);
/** < 768px wide — plain width check (matches `md:`). Prefer useIsMobileShell for shell decisions. */
export const useIsMobile = () => useMediaQuery('(max-width: 767px)');
/** ≥ 1024px — full sidebar + multi-column layouts (matches `lg:`). */
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');
/** Primary input is a finger. Use for gestures, never for layout. */
export const useIsTouch = () => useMediaQuery('(hover: none) and (pointer: coarse)');
export const usePrefersReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');
