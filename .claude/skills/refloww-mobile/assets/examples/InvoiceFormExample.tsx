'use client';

/**
 * Reference: a creation form on mobile.
 *  - immersive route (/…/new): tab bar hidden, StickyActionBar owns the bottom edge
 *  - running total lives in the bar; tapping it scrolls to the summary
 *  - 44px fields, 16px text (global rule), correct keyboards (inputMode / autoComplete / enterKeyHint)
 *  - line items are cards on mobile; "Add item" opens a full-height picker Sheet
 *  - unsaved-changes guard on back
 */
import { useState } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { StickyActionBar } from '@/components/ui/StickyActionBar';
import { usePageHeader } from '@/components/mobile/PageHeaderContext';

type Item = { id: string; name: string; price: number; qty: number };
const naira = (n: number) => `₦${n.toLocaleString('en-NG')}`;

export default function InvoiceFormExample({ catalog }: { catalog: Omit<Item, 'qty'>[] }) {
    const [customer, setCustomer] = useState('');
    const [items, setItems] = useState<Item[]>([]);
    const [picker, setPicker] = useState(false);
    const [confirmLeave, setConfirmLeave] = useState(false);
    const [saving, setSaving] = useState(false);

    const dirty = customer !== '' || items.length > 0;
    const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);

    const save = async () => {
        setSaving(true);
        await new Promise((r) => setTimeout(r, 400)); // persist…
        setSaving(false);
        window.location.replace('/invoices'); // router.replace(detailUrl) in the app so Back skips the form
    };

    usePageHeader({
        title: 'New invoice',
        variant: 'creation',
        backHref: '/invoices',
        actions: [],
    });

    const setQty = (id: string, qty: number) =>
        setItems((list) => (qty <= 0 ? list.filter((i) => i.id !== id) : list.map((i) => (i.id === id ? { ...i, qty } : i))));

    return (
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void save(); }}>
            <section className="panel space-y-4 p-4">
                <div>
                    <label htmlFor="customer" className="label">Customer</label>
                    <input
                        id="customer"
                        value={customer}
                        onChange={(e) => setCustomer(e.target.value)}
                        autoComplete="name"
                        autoCapitalize="words"
                        enterKeyHint="next"
                        className="mt-1.5 h-11 w-full rounded-ctl border border-line-strong bg-paper px-3 text-body text-ink md:h-10"
                        placeholder="Search or type a name"
                    />
                </div>
            </section>

            <section className="panel divide-y divide-line">
                {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-4">
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-body font-medium text-ink">{item.name}</p>
                            <p className="money text-caption text-ink-3">{naira(item.price)} each</p>
                        </div>
                        <div className="flex items-center rounded-ctl border border-line-strong">
                            <button type="button" aria-label={`Decrease ${item.name}`} className="tap-44 grid place-items-center text-ink-2" onClick={() => setQty(item.id, item.qty - 1)}>−</button>
                            <input
                                aria-label={`Quantity of ${item.name}`}
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={item.qty}
                                onChange={(e) => setQty(item.id, Number(e.target.value.replace(/\D/g, '')) || 0)}
                                className="money h-11 w-12 bg-transparent text-center text-body text-ink"
                            />
                            <button type="button" aria-label={`Increase ${item.name}`} className="tap-44 grid place-items-center text-ink-2" onClick={() => setQty(item.id, item.qty + 1)}>+</button>
                        </div>
                        <p className="money w-24 shrink-0 text-right text-body font-semibold text-ink">{naira(item.price * item.qty)}</p>
                    </div>
                ))}
                <button type="button" onClick={() => setPicker(true)} className="flex h-12 w-full items-center justify-center gap-2 text-body font-semibold text-primary-text">
                    + Add item
                </button>
            </section>

            <section id="summary" className="panel-sunken space-y-2 p-4">
                <div className="flex justify-between text-body text-ink-2"><span>Subtotal</span><span className="money">{naira(total)}</span></div>
                <div className="rule-dashed" />
                <div className="flex justify-between text-lead font-semibold text-ink"><span>Total</span><span className="money">{naira(total)}</span></div>
            </section>

            <StickyActionBar>
                <button type="button" onClick={() => document.getElementById('summary')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="min-w-0 flex-1 text-left">
                    <span className="block text-micro text-ink-3">Total</span>
                    <span className="money block truncate text-lead font-semibold text-ink">{naira(total)}</span>
                </button>
                <button type="button" className="h-12 rounded-ctl border border-line-strong px-4 text-body font-semibold text-ink" onClick={() => (dirty ? setConfirmLeave(true) : history.back())}>
                    Cancel
                </button>
                <button type="submit" disabled={saving || items.length === 0} className="h-12 rounded-ctl bg-primary-500 px-6 text-body font-semibold text-on-primary disabled:opacity-45">
                    {saving ? 'Saving…' : 'Save'}
                </button>
            </StickyActionBar>

            <Sheet open={picker} onClose={() => setPicker(false)} title="Add item" height="full">
                <ul className="divide-y divide-line">
                    {catalog.map((p) => (
                        <li key={p.id}>
                            <button
                                type="button"
                                className="flex min-h-14 w-full items-center justify-between gap-3 py-2 text-left active:bg-paper-2"
                                onClick={() => {
                                    setItems((list) => (list.some((i) => i.id === p.id) ? list.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i)) : [...list, { ...p, qty: 1 }]));
                                    setPicker(false);
                                }}
                            >
                                <span className="truncate text-body text-ink">{p.name}</span>
                                <span className="money shrink-0 text-body text-ink-2">{naira(p.price)}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </Sheet>

            <Sheet
                open={confirmLeave}
                onClose={() => setConfirmLeave(false)}
                title="Discard this invoice?"
                description="Your changes haven't been saved."
                footer={
                    <div className="flex flex-col gap-2">
                        <button type="button" className="h-12 rounded-ctl bg-primary-500 text-body font-semibold text-on-primary" onClick={() => setConfirmLeave(false)}>Keep editing</button>
                        <button type="button" className="h-12 rounded-ctl text-body font-semibold text-danger-text" onClick={() => history.back()}>Discard</button>
                    </div>
                }
            >
                <span className="sr-only">Confirm leaving the form</span>
            </Sheet>
        </form>
    );
}
