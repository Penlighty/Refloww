"use client";

import { useEffect } from 'react';
import { useSettingsStore } from '@/lib/store';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const theme = useSettingsStore((state) => state.theme);

    useEffect(() => {
        const root = document.documentElement;

        // Remove existing theme classes
        root.classList.remove('light', 'dark');

        const updateStatusBar = async (isDark: boolean) => {
            if (Capacitor.isNativePlatform()) {
                try {
                    await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
                    await StatusBar.setBackgroundColor({ color: isDark ? '#121519' : '#f8fafc' });
                } catch (e) {
                    console.error("Error setting status bar", e);
                }
            }
        };

        if (theme === 'system') {
            // Check system preference
            const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            root.classList.add(systemDark ? 'dark' : 'light');
            updateStatusBar(systemDark);

            // Listen for system theme changes
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = (e: MediaQueryListEvent) => {
                root.classList.remove('light', 'dark');
                root.classList.add(e.matches ? 'dark' : 'light');
                updateStatusBar(e.matches);
            };
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        } else {
            const isDark = theme === 'dark';
            root.classList.add(theme);
            updateStatusBar(isDark);
        }
    }, [theme]);

    return <>{children}</>;
}

export default ThemeProvider;
