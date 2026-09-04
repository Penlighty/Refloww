"use client";

import { useEffect, useState, useRef } from 'react';
import { clsx } from 'clsx';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { Toast as ToastType, toast as hotToast, resolveValue } from 'react-hot-toast';

export type LegacyToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
    id: string;
    type: LegacyToastType;
    title: string;
    description?: string;
    duration?: number;
    onClose: (id: string) => void;
}

const typeConfig = {
    success: {
        icon: CheckCircle,
        bgClass: 'bg-emerald-50 dark:bg-neutral-800 border-emerald-200 dark:border-emerald-700/60 text-emerald-900 dark:text-emerald-300 shadow-xl',
        iconClass: 'text-emerald-600 dark:text-emerald-400',
    },
    error: {
        icon: AlertCircle,
        bgClass: 'bg-red-50 dark:bg-neutral-800 border-red-200 dark:border-red-700/60 text-red-900 dark:text-red-300 shadow-xl',
        iconClass: 'text-red-600 dark:text-red-400',
    },
    warning: {
        icon: AlertTriangle,
        bgClass: 'bg-amber-50 dark:bg-neutral-800 border-amber-200 dark:border-amber-700/60 text-amber-900 dark:text-amber-300 shadow-xl',
        iconClass: 'text-amber-600 dark:text-amber-400',
    },
    info: {
        icon: Info,
        bgClass: 'bg-blue-50 dark:bg-neutral-800 border-blue-200 dark:border-blue-700/60 text-blue-900 dark:text-blue-300 shadow-xl',
        iconClass: 'text-blue-600 dark:text-blue-400',
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

    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [isDismissing, setIsDismissing] = useState(false);
    const startPosRef = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
        if (duration > 0 && !isDragging) {
            const timer = setTimeout(() => onClose(id), duration);
            return () => clearTimeout(timer);
        }
    }, [id, duration, onClose, isDragging]);

    const handleTouchStart = (e: React.TouchEvent) => {
        const touch = e.touches[0];
        startPosRef.current = { x: touch.clientX, y: touch.clientY };
        setIsDragging(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!startPosRef.current) return;
        const touch = e.touches[0];
        const dx = touch.clientX - startPosRef.current.x;
        const dy = touch.clientY - startPosRef.current.y;
        setOffset({ x: dx, y: dy });
    };

    const handleTouchEnd = () => {
        if (!startPosRef.current) return;
        const { x: dx, y: dy } = offset;

        // Dismiss if swiped far enough horizontally or upwards
        if (Math.abs(dx) > 60 || dy < -50) {
            setIsDismissing(true);
            setTimeout(() => {
                onClose(id);
            }, 150);
        } else {
            setOffset({ x: 0, y: 0 });
        }
        setIsDragging(false);
        startPosRef.current = null;
    };

    const opacity = Math.max(0.2, 1 - Math.abs(offset.x) / 250 - (offset.y < 0 ? Math.abs(offset.y) / 150 : 0));

    return (
        <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
                transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
                opacity: isDismissing ? 0 : opacity,
                transition: isDragging ? 'none' : 'transform 0.2s ease-out, opacity 0.2s ease-out',
                touchAction: 'none',
            }}
            className={clsx(
                'flex items-start gap-3 p-4 rounded-2xl border max-w-sm w-full select-none cursor-grab active:cursor-grabbing',
                !isDragging && !isDismissing && 'animate-in slide-in-from-top-4 duration-200',
                config.bgClass
            )}
        >
            <Icon className={clsx('w-5 h-5 flex-shrink-0 mt-0.5', config.iconClass)} />
            <div className="flex-1 min-w-0">
                <p className="font-bold text-sm leading-snug">{title}</p>
                {description && (
                    <p className="text-xs opacity-80 mt-0.5 leading-normal">{description}</p>
                )}
            </div>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onClose(id);
                }}
                className="p-1 -m-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
                title="Dismiss"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}

// Swipeable wrapper for react-hot-toast items
export function SwipeableToastItem({ toast }: { toast: ToastType }) {
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [isDismissing, setIsDismissing] = useState(false);
    const startPosRef = useRef<{ x: number; y: number } | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        const touch = e.touches[0];
        startPosRef.current = { x: touch.clientX, y: touch.clientY };
        setIsDragging(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!startPosRef.current) return;
        const touch = e.touches[0];
        const dx = touch.clientX - startPosRef.current.x;
        const dy = touch.clientY - startPosRef.current.y;
        setOffset({ x: dx, y: dy });
    };

    const handleTouchEnd = () => {
        if (!startPosRef.current) return;
        const { x: dx, y: dy } = offset;

        if (Math.abs(dx) > 60 || dy < -40) {
            setIsDismissing(true);
            setTimeout(() => {
                hotToast.dismiss(toast.id);
            }, 120);
        } else {
            setOffset({ x: 0, y: 0 });
        }
        setIsDragging(false);
        startPosRef.current = null;
    };

    const opacity = Math.max(0.1, 1 - Math.abs(offset.x) / 220 - (offset.y < 0 ? Math.abs(offset.y) / 120 : 0));

    const content = resolveValue(toast.message, toast);
    const isError = toast.type === 'error';
    const isSuccess = toast.type === 'success';

    return (
        <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
                transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
                opacity: isDismissing ? 0 : opacity,
                transition: isDragging ? 'none' : 'transform 0.2s ease-out, opacity 0.2s ease-out',
                touchAction: 'none',
            }}
            className={clsx(
                'flex items-center gap-3 p-3.5 px-4 rounded-2xl border shadow-2xl max-w-sm w-full select-none cursor-grab active:cursor-grabbing backdrop-blur-md',
                toast.visible && !isDragging && !isDismissing ? 'animate-in fade-in slide-in-from-top-3 duration-200' : '',
                isSuccess
                    ? 'bg-white/95 dark:bg-neutral-900/95 border-emerald-200 dark:border-emerald-800 text-neutral-800 dark:text-neutral-100'
                    : isError
                        ? 'bg-white/95 dark:bg-neutral-900/95 border-red-200 dark:border-red-800 text-neutral-800 dark:text-neutral-100'
                        : 'bg-white/95 dark:bg-neutral-900/95 border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100'
            )}
        >
            <div className="shrink-0 flex items-center justify-center">
                {isSuccess ? (
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                ) : isError ? (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                ) : (
                    <Info className="w-5 h-5 text-blue-500" />
                )}
            </div>

            <div className="flex-1 text-xs font-semibold leading-relaxed">
                {typeof content === 'string' || typeof content === 'number' ? content : content}
            </div>

            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    hotToast.dismiss(toast.id);
                }}
                className="p-1 -mr-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors shrink-0"
                title="Dismiss"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}

// Toast container for custom toasts
export function ToastContainer({ children }: { children: React.ReactNode }) {
    return (
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-auto">
            {children}
        </div>
    );
}
