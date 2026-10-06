"use client";

import React from 'react';
import PageHelpModal from './PageHelpModal';

export interface TabItem<T extends string = string> {
    id: T;
    label: string;
    icon?: React.ComponentType<any>;
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

export function SubTabs<T extends string = string>({
    tabs,
    activeTab,
    onChangeTab,
    className = ''
}: SubTabsProps<T>) {
    return (
        <div className={`flex items-center gap-4 md:gap-6 border-b border-line overflow-x-auto h-10 scrollbar-none ${className}`}>
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                    <div key={tab.id} className="flex items-center gap-1 shrink-0 h-full">
                        <button
                            type="button"
                            onClick={() => onChangeTab(tab.id)}
                            data-active={isActive ? "true" : undefined}
                            aria-current={isActive ? "page" : undefined}
                            className={`relative flex items-center gap-2 h-full px-1 text-body transition-colors whitespace-nowrap cursor-pointer ${
                                isActive
                                    ? 'text-ink font-medium'
                                    : 'text-ink-3 hover:text-ink font-normal'
                            }`}
                        >
                            {isActive && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-full" />
                            )}
                            {Icon && <Icon className="size-4 shrink-0" weight={isActive ? "bold" : "regular"} />}
                            <span>{tab.label}</span>
                            {tab.count !== undefined && (
                                <span className="text-micro money text-ink-3 bg-paper-2 px-1.5 py-0.5 rounded-tag border border-line">
                                    {tab.count}
                                </span>
                            )}
                            {tab.badge}
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
