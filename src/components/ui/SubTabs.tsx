"use client";

import React from 'react';
import PageHelpModal from './PageHelpModal';

export interface TabItem<T extends string = string> {
    id: T;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number | string;
    badge?: React.ReactNode;
    helpModal?: {
        title: string;
        description: string;
        terms?: Array<{ term: string; definition: string; example?: string }>;
        tips?: string[];
    };
}

export interface SubTabsProps<T extends string = string> {
    tabs: TabItem<T>[];
    activeTab: T;
    onChangeTab: (tabId: T) => void;
    variant?: 'secondary' | 'primary';
    className?: string;
}

/**
 * Universal Horizontal SubTabs component for Refloww.
 * 
 * Rules:
 * - Inactive tabs display ONLY their icon with tooltips/aria-labels for space optimization & visual clarity.
 * - Active tabs expand to show Icon + Label + Badge/Count.
 * - Secondary variant uses high-contrast dark/white pills (no orange #FC6D2D).
 * - Primary variant uses brand orange (#FC6D2D) for main top section navigation.
 */
export function SubTabs<T extends string = string>({
    tabs,
    activeTab,
    onChangeTab,
    variant = 'secondary',
    className = ''
}: SubTabsProps<T>) {
    return (
        <div className={`flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 scrollbar-none ${className}`}>
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                const activeStyles =
                    variant === 'primary'
                        ? 'bg-[#fc6d2d] text-white shadow-md shadow-orange-500/20 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold'
                        : 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-md px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold';

                const inactiveStyles =
                    'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 p-2 sm:px-2.5 sm:py-2 border border-neutral-200/80 dark:border-neutral-700/60 rounded-xl';

                const displayTitle = `${tab.label}${tab.count !== undefined ? ` (${tab.count})` : ''}`;

                return (
                    <div key={tab.id} className="flex items-center gap-1 shrink-0">
                        <button
                            type="button"
                            onClick={() => onChangeTab(tab.id)}
                            title={displayTitle}
                            aria-label={displayTitle}
                            className={`flex items-center gap-2 transition-all duration-200 whitespace-nowrap cursor-pointer ${
                                isActive ? activeStyles : inactiveStyles
                            }`}
                        >
                            <Icon className="w-4 h-4 shrink-0" />
                            {isActive && (
                                <>
                                    <span>
                                        {tab.label}
                                        {tab.count !== undefined && ` (${tab.count})`}
                                    </span>
                                    {tab.badge}
                                </>
                            )}
                        </button>
                        {tab.helpModal && (
                            <PageHelpModal
                                title={tab.helpModal.title}
                                description={tab.helpModal.description}
                                terms={tab.helpModal.terms}
                                tips={tab.helpModal.tips}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default SubTabs;
