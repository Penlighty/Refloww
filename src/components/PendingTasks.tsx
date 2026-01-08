"use client";
import React, { useMemo, useState } from 'react';
import { Plus, Check, AlertCircle, Sparkles, ListTodo, X, ArrowRight } from 'lucide-react';
import { useDocumentStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { DocumentType } from '@/lib/types';

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

export default function PendingTasks() {
    const { documents } = useDocumentStore();
    const router = useRouter();
    const [isExpanded, setIsExpanded] = useState(false);

    const tasks = useMemo(() => {
        const generatedTasks: Task[] = [];

        // Overdue Invoices
        const overdue = documents.filter(d => d.status === 'overdue');
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
        const drafts = documents.filter(d => d.status === 'draft');
        drafts.slice(0, 5).forEach(doc => {
            generatedTasks.push({
                id: `draft-${doc.id}`,
                title: `Finish ${doc.documentNumber}`,
                category: 'Drafts',
                priority: 'normal',
                documentId: doc.id,
                type: doc.type
            });
        });

        return generatedTasks;
    }, [documents]);

    const pendingCount = tasks.length;

    // Collapsed view - just an icon button
    if (!isExpanded) {
        return (
            <div className="flex flex-col items-center">
                <button
                    onClick={() => setIsExpanded(true)}
                    className="w-14 h-14 bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:text-[#2d3748] dark:hover:text-white hover:border-neutral-200 dark:hover:border-neutral-600 transition-all shadow-sm group relative"
                    title="Expand Pending Tasks"
                >
                    <ListTodo className="w-6 h-6" strokeWidth={1.75} />
                    {pendingCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-blue-500 text-white text-xs font-semibold rounded-full flex items-center justify-center">
                            {pendingCount}
                        </span>
                    )}
                </button>
                <span className="text-xs text-neutral-400 dark:text-neutral-500 mt-2 font-medium">Tasks</span>
            </div>
        );
    }

    // Expanded view - full task list
    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-[#2d3748] dark:text-white">Pending Tasks</h3>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                        {pendingCount}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsExpanded(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer group"
                        title="Collapse"
                    >
                        <X className="w-4 h-4 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors" strokeWidth={2} />
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl p-4 h-full flex flex-col">
                {tasks.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full mb-3">
                            <Check className="w-6 h-6" strokeWidth={2} />
                        </div>
                        <p className="text-sm font-medium text-[#2d3748] dark:text-white">All caught up!</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">No pending tasks found</p>
                    </div>
                ) : (
                    <ul className="flex flex-col gap-1 flex-1">
                        {tasks.map((task) => (
                            <li
                                key={task.id}
                                onClick={() => router.push(`/${task.type}s/${task.documentId}`)} // Navigate on click
                                className="group flex items-start gap-3 p-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-all cursor-pointer"
                            >
                                <div className="mt-0.5 relative flex items-center justify-center">
                                    <div className={`w-5 h-5 border-2 rounded-full flex items-center justify-center transition-all ${task.priority === 'urgent' ? 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-500' : 'border-neutral-300 dark:border-neutral-600'
                                        }`}>
                                        {task.priority === 'urgent' && <AlertCircle className="w-3 h-3" strokeWidth={2.5} />}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-[#2d3748] dark:text-white group-hover:text-neutral-700 dark:group-hover:text-neutral-200 transition-colors">
                                        {task.title}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <span className={`w-1.5 h-1.5 rounded-full ${priorityConfig[task.priority].dotClass}`}></span>
                                        <p className={`text-xs font-medium ${priorityConfig[task.priority].textClass}`}>
                                            {task.category}
                                        </p>
                                    </div>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-400 dark:text-neutral-500">
                                    <ArrowRight className="w-4 h-4" />
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                {/* Pro Tip */}
                <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-700">
                    <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-xl p-4 flex items-start gap-3">
                        <div className="p-1.5 rounded-lg bg-[#2d3748] dark:bg-blue-600 text-white">
                            <Sparkles className="w-4 h-4" strokeWidth={2} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-[#2d3748] dark:text-white">Pro Tip</p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                                Use <kbd className="font-mono bg-white dark:bg-neutral-600 px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-500 text-[10px]">⌘K</kbd> to quickly search across all documents.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
