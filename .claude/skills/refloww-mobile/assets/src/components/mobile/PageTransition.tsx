'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * Pushed routes (detail / create / edit — more than one path segment) slide in 20px from the right over 240ms
 * on mobile; root routes simply fade in 140ms. From md up everything fades. Keyed by pathname.
 * Opacity/transform only; disabled under prefers-reduced-motion (see globals-mobile.css).
 */
export function isPushedRoute(pathname: string) {
    return pathname.split('/').filter(Boolean).length > 1;
}

export function PageTransition({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    return (
        <div key={pathname} className={isPushedRoute(pathname) ? 'rf-page-push' : 'rf-page-fade'}>
            {children}
        </div>
    );
}
