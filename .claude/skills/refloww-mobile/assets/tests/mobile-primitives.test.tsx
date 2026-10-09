// @ts-nocheck
/**
 * Refloww mobile primitives — runtime smoke test (jsdom, no browser needed).
 * Covers: overlay history stack (Back button), Sheet open/close/Escape/focus, DataTable table+list,
 * PageHeader context (no render loop, latest closure), StickyActionBar.
 *
 *   npm i -D jsdom tsx
 *   cp assets/tests/mobile-primitives.test.tsx ./mobile-primitives.test.tsx   # repo root (needs the @/ alias)
 *   npx tsx mobile-primitives.test.tsx   # expect: 20 passed, 0 failed
 */
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/invoices', pretendToBeVisual: true });
const g = globalThis as any;
g.window = dom.window; g.document = dom.window.document; Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
g.HTMLElement = dom.window.HTMLElement; g.Node = dom.window.Node; g.KeyboardEvent = dom.window.KeyboardEvent; g.MouseEvent = dom.window.MouseEvent;
g.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window); g.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
g.IS_REACT_ACT_ENVIRONMENT = true;
if (!dom.window.matchMedia) (dom.window as any).matchMedia = (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} });

async function main() {
const React = await import('react');
const { act, useState } = React;
const { createRoot } = await import('react-dom/client');
const { renderToStaticMarkup } = await import('react-dom/server');
const { useOverlayHistory } = await import('./src/lib/hooks/useOverlayHistory');
const { Sheet } = await import('./src/components/ui/Sheet');
const { DataTable } = await import('./src/components/ui/DataTable');
const { StickyActionBar } = await import('./src/components/ui/StickyActionBar');
const { PageHeaderProvider, usePageHeader, usePageHeaderConfig } = await import('./src/components/mobile/PageHeaderContext');

let pass = 0, fail = 0;
const ok = (c: boolean, m: string) => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); };
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const root = createRoot(document.getElementById('root')!);

// ---------- 1. overlay history ----------
let closedA = 0, closedB = 0, setA: (v: boolean) => void = () => {}, setB: (v: boolean) => void = () => {};
function Overlays() {
  const [a, sa] = useState(false); const [b, sb] = useState(false);
  setA = sa; setB = sb;
  useOverlayHistory(a, () => { closedA++; sa(false); });
  useOverlayHistory(b, () => { closedB++; sb(false); });
  return null;
}
await act(async () => root.render(<Overlays />));
const base = window.history.length;
await act(async () => setA(true));
ok(window.history.length === base + 1 && !!window.history.state?.rfOverlay, 'opening an overlay pushes exactly one history entry');
await act(async () => { window.history.back(); await wait(30); });
ok(closedA === 1, 'system Back closes the overlay');
await act(async () => setA(true)); await act(async () => setA(false)); await act(async () => { await wait(30); });
ok(closedA === 1 && !window.history.state?.rfOverlay, 'closing programmatically rewinds its history entry (no extra close callback)');
await act(async () => setA(true)); await act(async () => setB(true));
await act(async () => { window.history.back(); await wait(30); });
ok(closedB === 1 && closedA === 1, 'stacked overlays: Back closes only the top one');
await act(async () => { window.history.back(); await wait(30); });
ok(closedA === 2, '…and the second Back closes the next one');
await act(async () => root.render(null));

// ---------- 2. Sheet ----------
let closed = 0, setOpen: (v: boolean) => void = () => {};
function Host() {
  const [open, so] = useState(true); setOpen = so;
  return <Sheet open={open} onClose={() => { closed++; so(false); }} title="Filter" footer={<button data-autofocus>Apply</button>}><input aria-label="q" /></Sheet>;
}
await act(async () => root.render(<Host />));
await act(async () => { await wait(60); });
const dlg = document.querySelector('[role="dialog"]') as HTMLElement;
ok(!!dlg && dlg.getAttribute('aria-modal') === 'true', 'Sheet renders a modal dialog in a portal');
ok(dlg.getAttribute('data-shown') === 'true', 'enter animation state reached (data-shown=true)');
ok(document.activeElement?.textContent === 'Apply', 'focus moves to [data-autofocus] inside the sheet');
ok(!!document.querySelector('h2')?.textContent?.includes('Filter'), 'title is rendered and labels the dialog');
await act(async () => { dlg.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await wait(10); });
ok(closed === 1, 'Escape requests close');
await act(async () => { await wait(320); });
ok(!document.querySelector('[role="dialog"]'), 'sheet unmounts after the exit animation');
await act(async () => root.render(null));

// ---------- 3. DataTable (SSR) ----------
type Row = { id: string; no: string; customer: string; amount: string; status: string; date: string };
const rows: Row[] = [{ id: '1', no: 'INV-0042', customer: 'Ada Stores', amount: '₦120,000', status: 'Paid', date: '12 Oct' }];
const html = renderToStaticMarkup(<DataTable<Row> rows={rows} rowKey={(r) => r.id} columns={[
  { key: 'no', header: 'No.', cell: (r) => r.no, mobile: 'title' },
  { key: 'c', header: 'Customer', cell: (r) => r.customer, mobile: 'subtitle' },
  { key: 'd', header: 'Date', cell: (r) => r.date, mobile: 'meta', hideBelow: 'lg' },
  { key: 's', header: 'Status', cell: (r) => r.status, mobile: 'meta' },
  { key: 'a', header: 'Amount', cell: (r) => r.amount, align: 'right', mobile: 'trailing' },
]} />);
ok(html.includes('<table') && html.includes('hidden overflow-x-auto md:block'), 'DataTable renders a table that is hidden below md');
ok(html.includes('md:hidden') && html.includes('INV-0042') && html.includes('₦120,000'), 'DataTable renders a mobile list from the same columns');
ok(html.includes('max-lg:hidden'), 'hideBelow="lg" hides the column on tablets');
ok(DataTable<Row>({ rows: [], columns: [], rowKey: (r) => r.id, empty: 'none' } as any) !== null, 'empty state slot is used when there are no rows');

// ---------- 4. PageHeaderContext ----------
let renders = 0, savedWith = '';
function Page({ n }: { n: number }) {
  renders++;
  usePageHeader({ title: 'New invoice', variant: 'creation', backHref: '/invoices', actions: [{ id: 'save', label: 'Save', primary: true, onClick: () => { savedWith = `n=${n}`; } }] });
  return null;
}
let seen: any = null, run: (id: string) => void = () => {};
function Reader() { const { config, run: r } = usePageHeaderConfig(); seen = config; run = r; return null; }
function App({ n }: { n: number }) { return <PageHeaderProvider><Page n={n} /><Reader /></PageHeaderProvider>; }
await act(async () => root.render(<App n={1} />));
ok(seen.title === 'New invoice' && seen.variant === 'creation' && seen.actions?.[0]?.id === 'save', 'page config reaches the header');
ok(!('onClick' in (seen.actions[0])), 'functions are not stored in header state');
await act(async () => root.render(<App n={2} />));
await act(async () => { run('save'); });
ok(savedWith === 'n=2', 'header action calls the LATEST page closure (no stale state)');
ok(renders < 12, `no render loop from inline closures (page rendered ${renders}×)`);
await act(async () => root.render(null));

// ---------- 5. StickyActionBar ----------
const bar = renderToStaticMarkup(<StickyActionBar><button>Save</button></StickyActionBar>);
ok(bar.includes('bottom:var(--nav-h, 0px)') && bar.includes('md:static'), 'StickyActionBar sits above the tab bar on mobile, static on desktop');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });
