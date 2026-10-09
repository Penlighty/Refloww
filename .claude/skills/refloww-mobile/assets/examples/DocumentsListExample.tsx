'use client';

/**
 * Reference: a root list screen (Documents) built from the mobile primitives.
 *  - header: section variant, "New" primary action (opens a create Sheet)
 *  - DataTable: table ≥ md, list < md from the same columns
 *  - Filters: Sheet with Apply / Reset footer
 *  - Row actions: hover on desktop, `⋯` on touch (never hover-only)
 */
import { useMemo, useState } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { usePageHeader } from '@/components/mobile/PageHeaderContext';

type Doc = { id: string; number: string; customer: string; date: string; status: 'draft' | 'sent' | 'paid' | 'overdue'; total: string };

const TONE: Record<Doc['status'], string> = {
    draft: 'border-line-strong text-ink-2',
    sent: 'bg-info-tint text-info-text border-info-text/20',
    paid: 'bg-success-tint text-success-text border-success-text/20',
    overdue: 'bg-danger-tint text-danger-text border-danger-text/20',
};

function StatusTag({ status }: { status: Doc['status'] }) {
    return (
        <span className={`inline-flex h-[22px] items-center rounded-tag border px-2 text-micro font-medium capitalize ${TONE[status]}`}>
            {status}
        </span>
    );
}

export default function DocumentsListExample({ docs }: { docs: Doc[] }) {
    const [filterOpen, setFilterOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [status, setStatus] = useState<Doc['status'] | 'all'>('all');
    const [draftStatus, setDraftStatus] = useState(status);

    usePageHeader({
        title: 'Invoices',
        variant: 'section',
        actions: [
            { id: 'filter', label: 'Filter', iconOnly: true, onClick: () => { setDraftStatus(status); setFilterOpen(true); } },
            { id: 'new', label: 'New invoice', primary: true, iconOnly: true, onClick: () => setCreateOpen(true) },
        ],
    });

    const rows = useMemo(() => docs.filter((d) => status === 'all' || d.status === status), [docs, status]);

    const columns: Column<Doc>[] = [
        { key: 'number', header: 'Number', cell: (d) => d.number, mobile: 'title' },
        { key: 'customer', header: 'Customer', cell: (d) => d.customer, mobile: 'subtitle' },
        { key: 'date', header: 'Date', cell: (d) => d.date, mobile: 'meta', hideBelow: 'lg' },
        { key: 'status', header: 'Status', cell: (d) => <StatusTag status={d.status} />, mobile: 'meta' },
        { key: 'total', header: 'Total', cell: (d) => d.total, align: 'right', mobile: 'trailing' },
    ];

    return (
        <>
            <div className="panel">
                <DataTable
                    rows={rows}
                    rowKey={(d) => d.id}
                    columns={columns}
                    onRowClick={(d) => window.location.assign(`/invoices/${d.id}`)}
                    rowActions={() => (
                        <button type="button" aria-label="More actions" className="tap-44 grid place-items-center rounded-ctl text-ink-3 hover:bg-paper-2 md:size-9 md:min-h-0 md:min-w-0">
                            ⋯
                        </button>
                    )}
                    empty={<p className="px-6 py-14 text-center text-body text-ink-3">No invoices match this filter.</p>}
                />
            </div>

            <Sheet
                open={filterOpen}
                onClose={() => setFilterOpen(false)}
                title="Filter invoices"
                footer={
                    <div className="flex gap-3">
                        <button type="button" className="h-11 flex-1 rounded-ctl border border-line-strong text-body font-semibold text-ink" onClick={() => { setStatus('all'); setFilterOpen(false); }}>
                            Reset
                        </button>
                        <button type="button" className="h-11 flex-1 rounded-ctl bg-primary-500 text-body font-semibold text-on-primary" onClick={() => { setStatus(draftStatus); setFilterOpen(false); }}>
                            Show results
                        </button>
                    </div>
                }
            >
                <fieldset className="space-y-2 pb-2">
                    <legend className="label mb-2">Status</legend>
                    {(['all', 'draft', 'sent', 'paid', 'overdue'] as const).map((s) => (
                        <label key={s} className="flex min-h-11 cursor-pointer items-center justify-between rounded-ctl border border-line px-3 capitalize has-[:checked]:border-ink">
                            <span className="text-body text-ink">{s}</span>
                            <input type="radio" name="status" checked={draftStatus === s} onChange={() => setDraftStatus(s)} className="size-5 accent-primary-500" />
                        </label>
                    ))}
                </fieldset>
            </Sheet>

            <Sheet open={createOpen} onClose={() => setCreateOpen(false)} title="Create">
                <ul className="divide-y divide-line">
                    {['Invoice', 'Receipt', 'Delivery note'].map((label) => (
                        <li key={label}>
                            <a href={`/${label === 'Invoice' ? 'invoices' : label === 'Receipt' ? 'receipts' : 'delivery-notes'}/new`} className="flex min-h-14 items-center justify-between text-body text-ink">
                                {label}
                                <span aria-hidden className="text-ink-4">›</span>
                            </a>
                        </li>
                    ))}
                </ul>
            </Sheet>
        </>
    );
}
