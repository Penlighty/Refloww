'use client';

import clsx from 'clsx';
import type { ReactNode } from 'react';
import { useKeyboardInset } from '@/lib/hooks/useKeyboardInset';

/**
 * The one place for a screen's primary action(s) on mobile (Save, Charge, Continue).
 *  - < md : fixed to the bottom edge, above the tab bar (or flush bottom on immersive routes where --nav-h is 0),
 *           safe-area padded, lifts with the on-screen keyboard.
 *  - ≥ md : renders inline in the normal flow (static), so the same markup works on desktop.
 * A spacer reserves its height so content is never hidden behind it.
 */
export function StickyActionBar({
    children,
    className,
    aboveNav = true,
}: {
    children: ReactNode;
    className?: string;
    /** Sit above the tab bar (default). Immersive routes set --nav-h to 0 so this is automatic. */
    aboveNav?: boolean;
}) {
    const keyboard = useKeyboardInset();
    const bottom = keyboard > 0 ? `${keyboard}px` : aboveNav ? 'var(--nav-h, 0px)' : '0px';

    return (
        <>
            <div aria-hidden="true" className="h-[calc(76px+var(--safe-bottom,0px))] md:hidden" />
            <div
                style={{ bottom }}
                className={clsx(
                    'fixed inset-x-0 z-40 flex items-center gap-3 border-t border-line bg-paper px-4 pt-3',
                    keyboard > 0 ? 'pb-3' : 'pb-[max(12px,var(--safe-bottom,0px))]',
                    'md:static md:z-auto md:border-0 md:bg-transparent md:px-0 md:pb-0',
                    className
                )}
            >
                {children}
            </div>
        </>
    );
}
