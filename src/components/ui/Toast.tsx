"use client";

import { useEffect } from 'react';
import { clsx } from 'clsx';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
    id: string;
    type: ToastType;
    title: string;
    description?: string;
    duration?: number;
    onClose: (id: string) => void;
}

const typeConfig = {
    success: {
        icon: CheckCircle,
        bgClass: 'bg-emerald-50 dark:bg-emerald-500/10',
        borderClass: 'border-emerald-200 dark:border-emerald-500/30',
        iconClass: 'text-emerald-600 dark:text-emerald-400',
        titleClass: 'text-emerald-900 dark:text-emerald-300',
    },
    error: {
        icon: AlertCircle,
        bgClass: 'bg-red-50 dark:bg-red-500/10',
        borderClass: 'border-red-200 dark:border-red-500/30',
        iconClass: 'text-red-600 dark:text-red-400',
        titleClass: 'text-red-900 dark:text-red-300',
    },
    warning: {
        icon: AlertTriangle,
        bgClass: 'bg-amber-50 dark:bg-amber-500/10',
        borderClass: 'border-amber-200 dark:border-amber-500/30',
        iconClass: 'text-amber-600 dark:text-amber-400',
        titleClass: 'text-amber-900 dark:text-amber-300',
    },
    info: {
        icon: Info,
        bgClass: 'bg-blue-50 dark:bg-blue-500/10',
        borderClass: 'border-blue-200 dark:border-blue-500/30',
        iconClass: 'text-blue-600 dark:text-blue-400',
        titleClass: 'text-blue-900 dark:text-blue-300',
    },
};

export function Toast({
    id,
    type,
    title,
    description,
    duration = 5000,
    onClose,
}: ToastProps) {
    const config = typeConfig[type];
    const Icon = config.icon;

    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => onClose(id), duration);
            return () => clearTimeout(timer);
        }
    }, [id, duration, onClose]);

    return (
        <div
            className={clsx(
                'flex items-start gap-3 p-4 rounded-xl border shadow-lg max-w-sm',
                'animate-in slide-in-from-right-full duration-300',
                config.bgClass,
                config.borderClass
            )}
        >
            <Icon className={clsx('w-5 h-5 flex-shrink-0 mt-0.5', config.iconClass)} />
            <div className="flex-1 min-w-0">
                <p className={clsx('font-semibold text-sm', config.titleClass)}>{title}</p>
                {description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        {description}
                    </p>
                )}
            </div>
            <button
                onClick={() => onClose(id)}
                className="p-1 -m-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}

// Toast container for positioning
interface ToastContainerProps {
    children: React.ReactNode;
}

export function ToastContainer({ children }: ToastContainerProps) {
    return (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
            {children}
        </div>
    );
}
