"use client";

import { useEffect, useState, useRef } from 'react';
import { clsx } from 'clsx';
import { X, CircleCheck, CircleX, Info, AlertTriangle } from '@/components/icons';
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
        icon: CircleCheck,
        iconClass: 'text-success-text rf-draw',
    },
    error: {
        icon: CircleX,
        iconClass: 'text-danger-text',
    },
    warning: {
        icon: AlertTriangle,
        iconClass: 'text-warning-text',
    },
    info: {
        icon: Info,
        iconClass: 'text-info-text',
    },
};

export function Toast({
    id,
    type,
    title,
    description,
    duration = 4000,
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
                'flex items-start gap-3 p-3.5 rounded-panel bg-ink text-paper border border-line shadow-pop max-w-sm w-full select-none cursor-grab active:cursor-grabbing',
                !isDragging && !isDismissing && 'animate-toast-in'
            )}
        >
            <Icon className={clsx('size-5 shrink-0 mt-0.5', config.iconClass)} />
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-body leading-snug">{title}</p>
                {description && (
                    <p className="text-caption opacity-80 mt-0.5 leading-normal">{description}</p>
                )}
            </div>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onClose(id);
                }}
                className="p-1 -m-1 rounded-ctl text-paper/60 hover:text-paper transition-colors"
                title="Dismiss"
            >
                <X className="size-4" />
            </button>
        </div>
    );
}

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
                'flex items-center gap-3 p-3.5 rounded-panel bg-ink text-paper border border-line shadow-pop max-w-sm w-full select-none cursor-grab active:cursor-grabbing',
                toast.visible && !isDragging && !isDismissing ? 'animate-toast-in' : ''
            )}
        >
            <div className="shrink-0 flex items-center justify-center">
                {isSuccess ? (
                    <CircleCheck className="size-5 text-success-text rf-draw" />
                ) : isError ? (
                    <CircleX className="size-5 text-danger-text" />
                ) : (
                    <Info className="size-5 text-info-text" />
                )}
            </div>

            <div className="flex-1 text-caption font-medium leading-relaxed">
                {typeof content === 'string' || typeof content === 'number' ? content : content}
            </div>

            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    hotToast.dismiss(toast.id);
                }}
                className="p-1 -mr-1 rounded-ctl text-paper/60 hover:text-paper transition-colors shrink-0"
                title="Dismiss"
            >
                <X className="size-4" />
            </button>
        </div>
    );
}

export function ToastContainer({ children }: { children: React.ReactNode }) {
    return (
        <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[70] flex flex-col gap-2 pointer-events-auto">
            {children}
        </div>
    );
}
