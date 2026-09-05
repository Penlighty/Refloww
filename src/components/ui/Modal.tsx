"use client";

import { useEffect, useRef, useCallback } from 'react';
import { clsx } from 'clsx';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    description?: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    showCloseButton?: boolean;
    closeOnOverlayClick?: boolean;
    closeOnEscape?: boolean;
}

const sizeStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'w-full max-w-6xl',
};

export function Modal({
    isOpen,
    onClose,
    title,
    description,
    children,
    footer,
    size = 'md',
    showCloseButton = true,
    closeOnOverlayClick = true,
    closeOnEscape = true,
}: ModalProps & { footer?: React.ReactNode }) {
    const overlayRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    const handleEscape = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape' && closeOnEscape) {
                onClose();
            }
        },
        [onClose, closeOnEscape]
    );

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, handleEscape]);

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (closeOnOverlayClick && e.target === overlayRef.current) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div
            ref={overlayRef}
            onClick={handleOverlayClick}
            className={clsx(
                'fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4',
                'bg-black/60 backdrop-blur-xs',
                'animate-in fade-in duration-200'
            )}
        >
            <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? 'modal-title' : undefined}
                aria-describedby={description ? 'modal-description' : undefined}
                className={clsx(
                    'relative w-full bg-white dark:bg-[#161a24] rounded-t-[28px] sm:rounded-2xl shadow-2xl border border-neutral-200/80 dark:border-neutral-800',
                    'animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200 flex flex-col max-h-[85vh] sm:max-h-[90vh] pb-3 sm:pb-0',
                    sizeStyles[size]
                )}
            >
                {/* Header */}
                {(title || showCloseButton) && (
                    <div className="flex items-start justify-between p-4 sm:p-6 pb-0 flex-none">
                        <div>
                            {title && (
                                <h2
                                    id="modal-title"
                                    className="text-base sm:text-xl font-bold text-neutral-900 dark:text-white"
                                >
                                    {title}
                                </h2>
                            )}
                            {description && (
                                <p
                                    id="modal-description"
                                    className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400"
                                >
                                    {description}
                                </p>
                            )}
                        </div>
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className="p-1.5 rounded-full text-neutral-400 dark:text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 transition-colors"
                            >
                                <X className="w-4 h-4" strokeWidth={2} />
                            </button>
                        )}
                    </div>
                )}

                {/* Content */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar">{children}</div>

                {/* Footer */}
                {footer && (
                    <div className="px-4 pb-4 sm:px-6 sm:pb-6 flex-none">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}

// Modal footer component for action buttons
interface ModalFooterProps {
    children: React.ReactNode;
    className?: string;
}

export function ModalFooter({ children, className }: ModalFooterProps) {
    return (
        <div
            className={clsx(
                'flex items-center justify-end gap-3 pt-4 mt-4 border-t border-neutral-100 dark:border-neutral-700',
                className
            )}
        >
            {children}
        </div>
    );
}
