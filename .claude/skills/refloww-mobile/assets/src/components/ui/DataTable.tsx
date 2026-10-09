'use client';

import clsx from 'clsx';
import type { ReactNode } from 'react';

/**
 * DataTable — one definition, two presentations.
 *   ≥ md : a real <table> (sticky header, hairline rows, right-aligned money)
 *   < md : a list of 56px+ rows built from the SAME columns using each column's `mobile` role.
 *
 * Mobile row anatomy (consistent across Documents, Ledger, Customers, Products, Transactions, Discounts):
 *   ┌───────────────────────────────────────────┐
 *   │ title                          trailing   │
 *   │ subtitle                    trailingSub   │
 *   │ meta · meta · [Tag]                       │
 *   └───────────────────────────────────────────┘
 */
export type MobileRole = 'title' | 'subtitle' | 'meta' | 'trailing' | 'trailingSub' | 'hidden';

export interface Column<T> {
    key: string;
    header: ReactNode;
    cell: (row: T) => ReactNode;
    align?: 'left' | 'right';
    /** Role in the mobile row. Default 'hidden'. */
    mobile?: MobileRole;
    /** Hide this column in the table between md and this breakpoint (tablet portrait). */
    hideBelow?: 'lg' | 'xl';
    className?: string;
}

export interface DataTableProps<T> {
    columns: Column<T>[];
    rows: T[];
    rowKey: (row: T) => string;
    onRowClick?: (row: T) => void;
    /** Desktop: appears on row hover/focus. Mobile: trailing control inside the row (must be a ≥44px target). */
    rowActions?: (row: T) => ReactNode;
    /** Escape hatch for rows that need custom mobile markup (selection mode, swipe actions, …). */
    renderMobileRow?: (row: T) => ReactNode;
    loading?: boolean;
    empty?: ReactNode;
    className?: string;
}

const HIDE_BELOW = { lg: 'max-lg:hidden', xl: 'max-xl:hidden' } as const;

export function DataTable<T>({
    columns,
    rows,
    rowKey,
    onRowClick,
    rowActions,
    renderMobileRow,
    loading,
    empty,
    className,
}: DataTableProps<T>) {
    if (loading) return <DataTableSkeleton />;
    if (rows.length === 0) return <>{empty ?? null}</>;

    const byRole = (role: MobileRole) => columns.filter((c) => c.mobile === role);

    return (
        <div className={className}>
            {/* ≥ md: table */}
            <div className="hidden overflow-x-auto md:block">
                <table className="w-full border-separate border-spacing-0 text-left text-body">
                    <thead>
                        <tr>
                            {columns.map((c) => (
                                <th
                                    key={c.key}
                                    scope="col"
                                    className={clsx(
                                        'th sticky top-0 border-b border-line bg-paper px-4 py-3',
                                        c.align === 'right' && 'text-right',
                                        c.hideBelow && HIDE_BELOW[c.hideBelow],
                                        c.className
                                    )}
                                >
                                    {c.header}
                                </th>
                            ))}
                            {rowActions && <th className="sticky top-0 w-12 border-b border-line bg-paper" aria-label="Actions" />}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr
                                key={rowKey(row)}
                                onClick={onRowClick ? () => onRowClick(row) : undefined}
                                className={clsx('group hover:bg-paper-2', onRowClick && 'cursor-pointer')}
                            >
                                {columns.map((c) => (
                                    <td
                                        key={c.key}
                                        className={clsx(
                                            'min-h-[52px] border-b border-line px-4 py-3 align-middle text-ink-2',
                                            c.align === 'right' && 'money text-right',
                                            c.hideBelow && HIDE_BELOW[c.hideBelow],
                                            c.className
                                        )}
                                    >
                                        {c.cell(row)}
                                    </td>
                                ))}
                                {rowActions && (
                                    <td className="border-b border-line px-2 text-right">
                                        <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 touch:opacity-100">
                                            {rowActions(row)}
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* < md: list */}
            <ul className="divide-y divide-line md:hidden">
                {rows.map((row) => {
                    if (renderMobileRow) return <li key={rowKey(row)}>{renderMobileRow(row)}</li>;
                    const title = byRole('title');
                    const subtitle = byRole('subtitle');
                    const meta = byRole('meta');
                    const trailing = byRole('trailing');
                    const trailingSub = byRole('trailingSub');
                    return (
                        <li key={rowKey(row)} className="flex items-stretch">
                            <div
                                role={onRowClick ? 'button' : undefined}
                                tabIndex={onRowClick ? 0 : undefined}
                                onClick={onRowClick ? () => onRowClick(row) : undefined}
                                onKeyDown={
                                    onRowClick
                                        ? (e) => {
                                              if (e.key === 'Enter' || e.key === ' ') {
                                                  e.preventDefault();
                                                  onRowClick(row);
                                              }
                                          }
                                        : undefined
                                }
                                className="flex min-h-[56px] min-w-0 flex-1 items-center gap-3 px-4 py-3 active:bg-paper-2"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-body font-medium text-ink">{title.map((c) => <span key={c.key}>{c.cell(row)}</span>)}</div>
                                    {subtitle.length > 0 && (
                                        <div className="mt-0.5 truncate text-caption text-ink-3">{subtitle.map((c) => <span key={c.key}>{c.cell(row)}</span>)}</div>
                                    )}
                                    {meta.length > 0 && (
                                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-micro text-ink-3">
                                            {meta.map((c) => (
                                                <span key={c.key}>{c.cell(row)}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {(trailing.length > 0 || trailingSub.length > 0) && (
                                    <div className="shrink-0 text-right">
                                        <div className="money text-body font-semibold text-ink">{trailing.map((c) => <span key={c.key}>{c.cell(row)}</span>)}</div>
                                        {trailingSub.length > 0 && (
                                            <div className="mt-0.5 text-micro text-ink-3">{trailingSub.map((c) => <span key={c.key}>{c.cell(row)}</span>)}</div>
                                        )}
                                    </div>
                                )}
                            </div>
                            {rowActions && <div className="flex shrink-0 items-center pr-2">{rowActions(row)}</div>}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

export function DataTableSkeleton({ rows = 6 }: { rows?: number }) {
    return (
        <div aria-busy="true" aria-live="polite">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex min-h-[56px] items-center gap-3 border-b border-line px-4 py-3 md:min-h-[52px]">
                    <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-3.5 w-2/5 rounded-tag bg-paper-2 animate-pulse" />
                        <div className="h-3 w-3/5 rounded-tag bg-paper-2 animate-pulse" />
                    </div>
                    <div className="h-4 w-16 rounded-tag bg-paper-2 animate-pulse" />
                </div>
            ))}
        </div>
    );
}
