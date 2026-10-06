"use client";

import { useEffect, useState, useRef, ReactNode, RefObject } from 'react';
import { createPortal } from 'react-dom';

interface FixedDropdownMenuProps {
    isOpen: boolean;
    onClose: () => void;
    triggerRef: RefObject<HTMLElement | null>;
    children: ReactNode;
    align?: 'left' | 'right';
    className?: string;
}

export function FixedDropdownMenu({
    isOpen,
    onClose,
    triggerRef,
    children,
    align = 'right',
    className = '',
}: FixedDropdownMenuProps) {
    const [mounted, setMounted] = useState(false);
    const [coords, setCoords] = useState<{ top: number; left?: number; right?: number; placement: 'bottom' | 'top' }>({
        top: 0,
        placement: 'bottom',
    });
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!isOpen || !triggerRef.current) return;

        const updatePosition = () => {
            if (!triggerRef.current) return;
            const rect = triggerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const menuHeight = 220;
            const placement: 'bottom' | 'top' = spaceBelow < menuHeight && rect.top > menuHeight ? 'top' : 'bottom';

            const top = placement === 'bottom'
                ? rect.bottom + 4
                : Math.max(8, rect.top - 4);

            if (align === 'right') {
                const right = Math.max(8, window.innerWidth - rect.right);
                setCoords({ top, right, placement });
            } else {
                const left = Math.max(8, rect.left);
                setCoords({ top, left, placement });
            }
        };

        updatePosition();

        const handleScrollOrResize = () => {
            updatePosition();
        };

        window.addEventListener('scroll', handleScrollOrResize, true);
        window.addEventListener('resize', handleScrollOrResize);

        return () => {
            window.removeEventListener('scroll', handleScrollOrResize, true);
            window.removeEventListener('resize', handleScrollOrResize);
        };
    }, [isOpen, triggerRef, align]);

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                menuRef.current &&
                !menuRef.current.contains(target) &&
                triggerRef.current &&
                !triggerRef.current.contains(target)
            ) {
                onClose();
            }
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose, triggerRef]);

    if (!isOpen || !mounted) return null;

    const style: React.CSSProperties = {
        position: 'fixed',
        zIndex: 9999,
        top: coords.placement === 'top' ? undefined : `${coords.top}px`,
        bottom: coords.placement === 'top' ? `${window.innerHeight - coords.top}px` : undefined,
        ...(coords.right !== undefined ? { right: `${coords.right}px` } : {}),
        ...(coords.left !== undefined ? { left: `${coords.left}px` } : {}),
    };

    return createPortal(
        <div
            ref={menuRef}
            style={style}
            className={`w-48 bg-paper rounded-panel shadow-pop border border-line p-1 animate-pop ${className}`}
        >
            {children}
        </div>,
        document.body
    );
}
