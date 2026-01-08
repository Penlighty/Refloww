"use client";

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal, ModalFooter, Button } from '@/components/ui';
import { Keyboard } from 'lucide-react';

interface Shortcut {
    keys: string[];
    description: string;
    action: () => void;
    category: string;
}

interface KeyboardShortcutsProps {
    children: React.ReactNode;
}

export function KeyboardShortcuts({ children }: KeyboardShortcutsProps) {
    const router = useRouter();
    const [showShortcuts, setShowShortcuts] = useState(false);

    const shortcuts: Shortcut[] = [
        // Navigation
        { keys: ['g', 'h'], description: 'Go to Dashboard', action: () => router.push('/'), category: 'Navigation' },
        { keys: ['g', 'i'], description: 'Go to Invoices', action: () => router.push('/invoices'), category: 'Navigation' },
        { keys: ['g', 'r'], description: 'Go to Receipts', action: () => router.push('/receipts'), category: 'Navigation' },
        { keys: ['g', 'd'], description: 'Go to Delivery Notes', action: () => router.push('/delivery-notes'), category: 'Navigation' },
        { keys: ['g', 'c'], description: 'Go to Customers', action: () => router.push('/customers'), category: 'Navigation' },
        { keys: ['g', 'p'], description: 'Go to Products', action: () => router.push('/products'), category: 'Navigation' },
        { keys: ['g', 'l'], description: 'Go to Ledger', action: () => router.push('/ledger'), category: 'Navigation' },
        { keys: ['g', 't'], description: 'Go to Templates', action: () => router.push('/templates'), category: 'Navigation' },
        { keys: ['g', 's'], description: 'Go to Settings', action: () => router.push('/settings'), category: 'Navigation' },

        // Actions
        { keys: ['n', 'i'], description: 'New Invoice', action: () => router.push('/invoices/new'), category: 'Actions' },
        { keys: ['n', 'r'], description: 'New Receipt', action: () => router.push('/receipts/new'), category: 'Actions' },
        { keys: ['n', 'd'], description: 'New Delivery Note', action: () => router.push('/delivery-notes/new'), category: 'Actions' },

        // Help
        { keys: ['?'], description: 'Show keyboard shortcuts', action: () => setShowShortcuts(true), category: 'Help' },
        { keys: ['Escape'], description: 'Close modal/dialog', action: () => setShowShortcuts(false), category: 'Help' },
    ];

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        // Don't trigger shortcuts when typing in input fields
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            if (event.key === 'Escape') {
                (target as HTMLInputElement).blur();
            }
            return;
        }

        // Handle ? key for showing shortcuts
        if (event.key === '?' && !event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            setShowShortcuts(true);
            return;
        }

        // Handle Escape
        if (event.key === 'Escape') {
            setShowShortcuts(false);
            return;
        }

        // Handle two-key shortcuts (g+x, n+x pattern)
        if (event.key === 'g' || event.key === 'n') {
            const prefix = event.key;
            const handleSecondKey = (e: KeyboardEvent) => {
                const secondKey = e.key;
                const shortcut = shortcuts.find(s =>
                    s.keys.length === 2 &&
                    s.keys[0] === prefix &&
                    s.keys[1] === secondKey
                );
                if (shortcut) {
                    e.preventDefault();
                    shortcut.action();
                }
                window.removeEventListener('keydown', handleSecondKey);
                clearTimeout(timeout);
            };

            const timeout = setTimeout(() => {
                window.removeEventListener('keydown', handleSecondKey);
            }, 500); // 500ms to enter the second key

            window.addEventListener('keydown', handleSecondKey);
        }
    }, [router, shortcuts]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Group shortcuts by category
    const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
        if (!acc[shortcut.category]) {
            acc[shortcut.category] = [];
        }
        acc[shortcut.category].push(shortcut);
        return acc;
    }, {} as Record<string, Shortcut[]>);

    return (
        <>
            {children}
            <Modal
                isOpen={showShortcuts}
                onClose={() => setShowShortcuts(false)}
                title="Keyboard Shortcuts"
                size="md"
            >
                <div className="space-y-6">
                    {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
                        <div key={category}>
                            <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3">
                                {category}
                            </h3>
                            <div className="space-y-2">
                                {categoryShortcuts.map((shortcut, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700/50"
                                    >
                                        <span className="text-sm text-neutral-700 dark:text-neutral-300">
                                            {shortcut.description}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            {shortcut.keys.map((key, keyIndex) => (
                                                <span key={keyIndex}>
                                                    <kbd className="px-2 py-1 text-xs font-mono bg-neutral-100 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded text-neutral-600 dark:text-neutral-300">
                                                        {key}
                                                    </kbd>
                                                    {keyIndex < shortcut.keys.length - 1 && (
                                                        <span className="mx-1 text-neutral-400">+</span>
                                                    )}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <ModalFooter>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 flex-1">
                        Press <kbd className="px-1.5 py-0.5 text-xs font-mono bg-neutral-100 dark:bg-neutral-700 rounded">?</kbd> from anywhere to show this dialog
                    </p>
                    <Button variant="secondary" onClick={() => setShowShortcuts(false)}>
                        Close
                    </Button>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default KeyboardShortcuts;
