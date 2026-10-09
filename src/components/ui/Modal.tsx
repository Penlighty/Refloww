"use client";

import React from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { clsx } from 'clsx';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    description?: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    height?: 'auto' | 'tall' | 'full';
    showCloseButton?: boolean;
    closeOnOverlayClick?: boolean;
    closeOnEscape?: boolean;
    className?: string;
    bodyClassName?: string;
}

export function Modal({
    isOpen,
    onClose,
    title,
    description,
    children,
    footer,
    size = 'md',
    height = 'auto',
    showCloseButton = true,
    closeOnOverlayClick = true,
    className,
    bodyClassName,
}: ModalProps) {
    const sheetSize = size === 'full' ? 'xl' : size;

    return (
        <Sheet
            open={isOpen}
            onClose={onClose}
            title={title}
            description={description}
            footer={footer}
            size={sheetSize}
            height={height}
            dismissible={closeOnOverlayClick}
            hideCloseButton={!showCloseButton}
            className={className}
            bodyClassName={bodyClassName}
        >
            {children}
        </Sheet>
    );
}

interface ModalFooterProps {
    children: React.ReactNode;
    className?: string;
}

export function ModalFooter({ children, className }: ModalFooterProps) {
    return (
        <div className={clsx('flex items-center justify-end gap-2.5', className)}>
            {children}
        </div>
    );
}
