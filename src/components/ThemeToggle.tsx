"use client";

import { useSettingsStore } from '@/lib/store';
import { Sun, Moon, Monitor } from '@/components/icons';

export function ThemeToggle() {
    const { theme, setTheme } = useSettingsStore();

    const themes = [
        { value: 'light' as const, icon: Sun, label: 'Light' },
        { value: 'dark' as const, icon: Moon, label: 'Dark' },
        { value: 'system' as const, icon: Monitor, label: 'System' },
    ];

    return (
        <div className="flex items-center gap-1 p-1 bg-paper-2 rounded-xl">
            {themes.map(({ value, icon: Icon, label }) => (
                <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={`p-2 rounded-lg transition-all ${theme === value
                            ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm'
                            : 'text-ink-muted hover:text-neutral-700 dark:hover:text-neutral-200'
                        }`}
                    title={label}
                >
                    <Icon className="size-4" />
                </button>
            ))}
        </div>
    );
}

// Simple toggle version (just light/dark)
export function ThemeToggleSimple() {
    const { theme, setTheme } = useSettingsStore();
    const isDark = theme === 'dark';

    const toggleTheme = () => {
        setTheme(isDark ? 'light' : 'dark');
    };

    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-ink-muted hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </button>
    );
}

export default ThemeToggle;
