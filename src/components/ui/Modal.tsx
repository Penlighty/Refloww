"use client";

import { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { X } from '@/components/icons';

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
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

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

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div
            ref={overlayRef}
            onClick={handleOverlayClick}
            className={clsx(
                'fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-4',
                'bg-scrim animate-fade'
            )}
        >
            <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? 'modal-title' : undefined}
                aria-describedby={description ? 'modal-description' : undefined}
                className={clsx(
                    'relative w-full bg-paper rounded-t-sheet md:rounded-sheet shadow-sheet border border-line',
                    'animate-sheet-in md:animate-modal-in flex flex-col max-h-[88dvh] md:max-h-[90vh]',
                    sizeStyles[size]
                )}
            >
                {/* Mobile Drag Grabber */}
                <div className="w-9 h-1 bg-line-strong rounded-full mx-auto mt-2.5 mb-1 md:hidden shrink-0" />

                {/* Header */}
                {(title || showCloseButton) && (
                    <div className="flex items-start justify-between p-4 md:p-5 pb-0 shrink-0">
                        <div className="min-w-0 pr-4">
                            {title && (
                                <h2
                                    id="modal-title"
                                    className="font-heading text-title font-semibold text-ink"
                                >
                                    {title}
                                </h2>
                            )}
                            {description && (
                                <p
                                    id="modal-description"
                                    className="mt-1 text-caption text-ink-3"
                                >
                                    {description}
                                </p>
                            )}
                        </div>
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className="size-8 rounded-ctl flex items-center justify-center text-ink-3 hover:bg-paper-2 hover:text-ink transition-colors shrink-0"
                                aria-label="Close modal"
                            >
                                <X className="size-4" />
                            </button>
                        )}
                    </div>
                )}

                {/* Content */}
                <div className="p-4 md:p-5 overflow-y-auto flex-1">{children}</div>

                {/* Footer */}
                {footer && (
                    <div className="px-4 pb-4 md:px-5 md:pb-5 border-t border-line pt-4 shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}

interface ModalFooterProps {
    children: React.ReactNode;
    className?: string;
}

export function ModalFooter({ children, className }: ModalFooterProps) {
    return (
        <div
            className={clsx(
                'flex items-center justify-end gap-2.5',
                className
            )}
        >
            {children}
        </div>
    );
}
