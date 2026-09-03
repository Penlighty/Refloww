"use client";

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Bell, Check, AlertCircle, Sparkles, ArrowRight, X } from 'lucide-react';
import { useDocumentStore, useOrganizationStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { DocumentType } from '@/lib/types';
import Link from 'next/link';
import { getAnnouncements, Announcement, subscribeToActiveAnnouncements } from '@/lib/firebase/admin';
import { Megaphone, Gift, Info, AlertTriangle } from 'lucide-react';

const typeConfig = {
    announcement: { icon: Megaphone, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    promotion: { icon: Gift, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    greeting: { icon: Info, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' }
};

interface Task {
    id: string;
    title: string;
    category: string;
    priority: 'urgent' | 'normal' | 'low';
    documentId: string;
    type: DocumentType;
}

const priorityConfig = {
    'urgent': { textClass: 'text-red-500', dotClass: 'bg-red-500' },
    'normal': { textClass: 'text-neutral-500 dark:text-neutral-400', dotClass: 'bg-neutral-400' },
    'low': { textClass: 'text-neutral-400 dark:text-neutral-500', dotClass: 'bg-neutral-300' },
};

export default function TasksDropdown() {
    const { documents, getFilteredDocuments } = useDocumentStore();
    const activeOrgId = useOrganizationStore(state => state.activeOrganizationId);
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [notifications, setNotifications] = useState<Announcement[]>([]);

    const displayDocuments = useMemo(() => getFilteredDocuments(), [documents, activeOrgId, getFilteredDocuments]);

    useEffect(() => {
        const unsubscribe = subscribeToActiveAnnouncements((data) => {
            // Filter only 'notification' style
            const filtered = data.filter(a => a.displayStyle === 'notification');
            setNotifications(filtered);
        });
        return () => unsubscribe();
    }, []);

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;

        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const tasks = useMemo(() => {
        const generatedTasks: Task[] = [];

        // Overdue Invoices
        const overdue = displayDocuments.filter(d => d.status === 'overdue');
        overdue.forEach(doc => {
            generatedTasks.push({
                id: `overdue-${doc.id}`,
                title: `${doc.documentNumber} is overdue`,
                category: 'Collection',
                priority: 'urgent',
                documentId: doc.id,
                type: doc.type
            });
        });

        // Drafts
        const drafts = displayDocuments.filter(d => d.status === 'draft');
        drafts.forEach(doc => {
            generatedTasks.push({
                id: `draft-${doc.id}`,
                title: `Finish ${doc.documentNumber}`,
                category: 'Drafts',
                priority: 'normal',
                documentId: doc.id,
                type: doc.type
            });
        });

        // Notifications
        notifications.forEach(note => {
            generatedTasks.push({
                id: note.id,
                title: note.title,
                category: note.type.charAt(0).toUpperCase() + note.type.slice(1),
                priority: note.type === 'warning' ? 'urgent' : 'normal',
                documentId: '', // Custom handling needed
                type: 'invoice' // Placeholder
            });
        });

        return generatedTasks;
    }, [displayDocuments, notifications]);

    const pendingCount = tasks.length;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 relative cursor-pointer ${isOpen ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
            >
                <Bell className="w-5 h-5" strokeWidth={1.75} />
                {pendingCount > 0 && (
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-neutral-800"></span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl shadow-xl z-[100] overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-neutral-100 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/50">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-[#2d3748] dark:text-white">Pending Tasks</h3>
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                                {pendingCount}
                            </span>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto p-2">
                        {tasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center text-center py-8 px-4">
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full mb-3">
                                    <Check className="w-5 h-5" strokeWidth={2} />
                                </div>
                                <p className="text-sm font-medium text-[#2d3748] dark:text-white">All caught up!</p>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">No pending actions required.</p>
                            </div>
                        ) : (
                            <ul className="flex flex-col gap-1">
                                {tasks.map((task) => (
                                    <li
                                        key={task.id}
                                        onClick={() => {
                                            // Check if it's a notification
                                            const note = notifications.find(n => n.id === task.id);
                                            if (note) {
                                                // Handle notification click
                                                if (note.ctaLink) window.open(note.ctaLink, '_blank');
                                            } else {
                                                router.push(`/${task.type}s/${task.documentId}`);
                                                setIsOpen(false);
                                            }
                                        }}
                                        className="group flex items-start gap-3 p-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-all cursor-pointer"
                                    >
                                        <div className="mt-0.5 relative flex items-center justify-center">
                                            {notifications.some(n => n.id === task.id) ? (
                                                (() => {
                                                    const note = notifications.find(n => n.id === task.id);
                                                    const Icon = typeConfig[note?.type || 'announcement'].icon;
                                                    const colorClass = typeConfig[note?.type || 'announcement'].color;
                                                    return <Icon className={`w-4 h-4 ${colorClass}`} />;
                                                })()
                                            ) : (
                                                <div className={`w-2 h-2 rounded-full ${priorityConfig[task.priority].dotClass}`}></div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-[#2d3748] dark:text-white group-hover:text-neutral-700 dark:group-hover:text-neutral-200 transition-colors line-clamp-1">
                                                {task.title}
                                            </p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <p className={`text-xs ${priorityConfig[task.priority].textClass}`}>
                                                    {task.category}
                                                </p>
                                                {notifications.find(n => n.id === task.id)?.message && (
                                                    <span className="text-xs text-neutral-400 truncate max-w-[150px]">
                                                        - {notifications.find(n => n.id === task.id)?.message}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-neutral-300 group-hover:text-neutral-500 dark:text-neutral-600 dark:group-hover:text-neutral-400 transition-colors opacity-0 group-hover:opacity-100" />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Footer / Smart Tip */}
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-900/30 border-t border-neutral-100 dark:border-neutral-700">
                        <div className="flex items-start gap-3 px-1">
                            <Sparkles className="w-3.5 h-3.5 text-blue-500 mt-0.5" />
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                <span className="font-semibold text-neutral-700 dark:text-neutral-300">Pro Tip:</span> Use <kbd className="font-mono bg-white dark:bg-neutral-700 px-1 py-0.5 rounded border border-neutral-200 dark:border-neutral-600 text-[10px] mx-1">⌘K</kbd> to search everything.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
