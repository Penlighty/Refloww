"use client";

import clsx from 'clsx';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
    width?: string | number;
    height?: string | number;
    animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
    className,
    variant = 'text',
    width,
    height,
    animation = 'pulse'
}: SkeletonProps) {
    const baseClasses = clsx(
        'bg-neutral-200',
        animation === 'pulse' && 'animate-pulse',
        animation === 'wave' && 'animate-shimmer',
        variant === 'text' && 'rounded h-4',
        variant === 'circular' && 'rounded-full',
        variant === 'rectangular' && 'rounded-none',
        variant === 'rounded' && 'rounded-xl',
        className
    );

    const style: React.CSSProperties = {
        width: width || (variant === 'text' ? '100%' : undefined),
        height: height || (variant === 'circular' ? width : undefined),
    };

    return <div className={baseClasses} style={style} />;
}

// Pre-built skeleton components for common patterns
export function SkeletonCard() {
    return (
        <div className="bg-white border border-neutral-100 rounded-2xl p-6 space-y-4">
            <Skeleton variant="text" width="60%" height={20} />
            <Skeleton variant="text" width="40%" height={16} />
            <div className="space-y-2">
                <Skeleton variant="text" width="100%" height={12} />
                <Skeleton variant="text" width="80%" height={12} />
                <Skeleton variant="text" width="90%" height={12} />
            </div>
        </div>
    );
}

export function SkeletonTableRow() {
    return (
        <tr className="border-b border-neutral-50">
            <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                    <Skeleton variant="circular" width={32} height={32} />
                    <Skeleton variant="text" width={100} height={16} />
                </div>
            </td>
            <td className="px-6 py-4">
                <Skeleton variant="text" width={80} height={14} />
            </td>
            <td className="px-6 py-4">
                <Skeleton variant="rounded" width={60} height={24} />
            </td>
            <td className="px-6 py-4 text-right">
                <Skeleton variant="text" width={70} height={16} />
            </td>
        </tr>
    );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
    return (
        <div className="bg-white border border-neutral-100 rounded-2xl overflow-hidden">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-neutral-100">
                        <th className="text-left px-6 py-4">
                            <Skeleton variant="text" width={80} height={12} />
                        </th>
                        <th className="text-left px-6 py-4">
                            <Skeleton variant="text" width={60} height={12} />
                        </th>
                        <th className="text-left px-6 py-4">
                            <Skeleton variant="text" width={50} height={12} />
                        </th>
                        <th className="text-right px-6 py-4">
                            <Skeleton variant="text" width={60} height={12} />
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {Array.from({ length: rows }).map((_, i) => (
                        <SkeletonTableRow key={i} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function SkeletonStats() {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white border border-neutral-100 rounded-2xl p-6">
                    <Skeleton variant="text" width="40%" height={12} className="mb-3" />
                    <Skeleton variant="text" width="70%" height={28} />
                </div>
            ))}
        </div>
    );
}

export function SkeletonChart() {
    return (
        <div className="bg-white border border-neutral-100 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <Skeleton variant="text" width={120} height={18} />
                    <Skeleton variant="text" width={80} height={12} className="mt-1" />
                </div>
                <Skeleton variant="rounded" width={60} height={24} />
            </div>
            <div className="flex items-end gap-2 h-32">
                {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                        <Skeleton
                            variant="rounded"
                            className="w-full"
                            height={`${20 + Math.random() * 80}%`}
                        />
                        <Skeleton variant="text" width={24} height={10} />
                    </div>
                ))}
            </div>
        </div>
    );
}
