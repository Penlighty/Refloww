"use client";

import { useEffect, useState, useTransition } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function NavigationProgressBar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isNavigating, setIsNavigating] = useState(false);
    const [progress, setProgress] = useState(0);

    // Complete progress bar when route/searchParams actually change
    useEffect(() => {
        setIsNavigating(false);
        setProgress(100);
        const timer = setTimeout(() => {
            setProgress(0);
        }, 300);
        return () => clearTimeout(timer);
    }, [pathname, searchParams]);

    // Global link click listener to trigger instant progress bar feedback (0ms delay)
    useEffect(() => {
        const handleAnchorClick = (e: MouseEvent) => {
            const target = e.currentTarget as HTMLAnchorElement;
            if (!target) return;

            const href = target.getAttribute('href');
            if (!href || href.startsWith('#') || href.startsWith('javascript:') || target.target === '_blank') {
                return;
            }

            // Check if navigating to a different pathname
            const currentUrl = new URL(window.location.href);
            const targetUrl = new URL(href, window.location.href);

            if (currentUrl.pathname !== targetUrl.pathname || currentUrl.search !== targetUrl.search) {
                setIsNavigating(true);
                setProgress(30);

                // Animate progress up to 80% while waiting for route transition
                const interval = setInterval(() => {
                    setProgress((prev) => {
                        if (prev >= 85) {
                            clearInterval(interval);
                            return 85;
                        }
                        return prev + 10;
                    });
                }, 100);
            }
        };

        const attachListeners = () => {
            const anchors = document.querySelectorAll<HTMLAnchorElement>('a[href]');
            anchors.forEach((a) => {
                a.removeEventListener('click', handleAnchorClick);
                a.addEventListener('click', handleAnchorClick);
            });
        };

        attachListeners();

        // Re-attach listeners on DOM mutations / route changes
        const observer = new MutationObserver(attachListeners);
        observer.observe(document.body, { childList: true, subtree: true });

        return () => {
            observer.disconnect();
            const anchors = document.querySelectorAll<HTMLAnchorElement>('a[href]');
            anchors.forEach((a) => a.removeEventListener('click', handleAnchorClick));
        };
    }, []);

    if (progress === 0 && !isNavigating) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none h-[3px] bg-neutral-200/30 dark:bg-neutral-800/30 overflow-hidden">
            <div
                className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-amber-500 transition-all duration-200 ease-out shadow-[0_0_10px_rgba(37,99,235,0.6)]"
                style={{
                    width: `${progress}%`,
                    opacity: progress === 100 ? 0 : 1,
                    transition: progress === 100 ? 'opacity 300ms ease-out, width 150ms ease-out' : 'width 200ms ease-out'
                }}
            />
        </div>
    );
}
