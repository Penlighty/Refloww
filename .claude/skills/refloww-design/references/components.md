# Components

Recipes extend the existing files in `src/components/ui/*`. Keep prop APIs; change the styling underneath. Tailwind v4 classes assume `tokens.md` is installed.

## Button — `ui/Button.tsx`

```ts
const variantStyles = {
  primary:   'bg-primary-500 text-on-primary hover:bg-primary-600 active:bg-primary-600 [--rf-accent:currentColor]',
  secondary: 'bg-paper text-ink border border-line-strong hover:bg-paper-2',
  ghost:     'bg-transparent text-ink-2 hover:bg-paper-2 hover:text-ink',
  outline:   'bg-transparent text-ink border border-line-strong hover:bg-paper-2',
  danger:    'bg-danger-solid text-white hover:brightness-95 [--rf-accent:currentColor]',
};
const sizeStyles = { sm: 'h-8 px-3 text-caption gap-1.5', md: 'h-10 px-4 text-body gap-2', lg: 'h-12 px-5 text-lead gap-2.5' };
// base: 'inline-flex items-center justify-center font-semibold rounded-ctl whitespace-nowrap
//        transition-[color,background-color,border-color,transform] duration-150 ease-settle
//        active:scale-[0.985] disabled:opacity-45 disabled:pointer-events-none'
```
- No `shadow-sm`, no `focus:ring-offset`. Focus uses the global `:focus-visible` outline.
- Old `secondary` (solid charcoal) becomes rare: add `ink` variant (`bg-ink text-paper`) for the one place that needs weight (e.g. "Download PDF" in a dark-on-light footer).
- Loading: `<Loader className="rf-spin" />` replaces `leftIcon`; keep width with `min-w`.
- Mobile primary CTA: `size="lg"` full width, `h-12`, pinned above bottom nav in forms.
- Icon-only: `IconButton` = `size-9 md:size-9 min-h-11 min-w-11 md:min-h-9 md:min-w-9 rounded-ctl ghost` + `aria-label` + tooltip (`HelpTooltip`).

## Inputs — `Input`, `Select`, `Textarea`, `SearchInput`, `DateRangePicker`

```
h-10 w-full rounded-ctl bg-paper border border-line-strong px-3 text-body text-ink
placeholder:text-ink-3 hover:border-ink-4
focus-visible:outline-none focus-visible:border-ink focus-visible:ring-[3px] focus-visible:ring-primary-500/20
disabled:bg-paper-2 disabled:text-ink-4
aria-[invalid=true]:border-danger-solid aria-[invalid=true]:ring-danger-solid/15
```
- Label above (`.label`), helper below (`text-micro text-ink-3`). Error replaces helper: `AlertCircle` 14px + message in `text-danger-text`. No red-filled boxes.
- Money inputs: leading `Naira`/currency glyph in `text-ink-3`, value `.money` right-aligned.
- Search: leading `Search` 16px in `ink-3`, `⌘K / Ctrl K` hint as `kbd` (`text-micro border border-line rounded-tag px-1.5`). Clear button appears on value.
- Select / dropdown panels use **Menu** below.

## Panel — `ui/Card.tsx`

`Card` → `panel` (`bg-paper border border-line rounded-panel`), padding `p-4 md:p-5`, **no shadow, no hover lift**. `hover` prop only changes `border-line-strong` (for clickable cards).
`CardHeader`: title `font-heading text-lead font-semibold`, description `text-caption text-ink-3`, action right. Sections inside a panel are separated by `divide-y divide-line` or `.rule-dashed` — never nested panels. Use `panel-sunken` for inset summaries (totals box).

## PageHeader (new, tiny)

```
<header class="flex items-start justify-between gap-4 pb-4 md:pb-6">
  <div class="min-w-0">
    [back IconButton + breadcrumb in text-caption text-ink-3]
    <h1 class="font-heading text-title md:text-headline font-semibold tracking-[-0.02em] truncate">Invoices</h1>
    <p class="text-body text-ink-3 mt-1">One line, optional.</p>
  </div>
  <div class="flex items-center gap-2 shrink-0">[ghost…] [primary ×1]</div>
</header>
```
On mobile the primary action collapses to icon + label in `size=sm` or moves to a pinned bottom CTA.

## StatBand — replaces `StatsGrid` cards

One panel, four cells, hairline dividers (a ledger header, not four coloured tiles):
```
<section class="panel grid grid-cols-2 lg:grid-cols-4 divide-line max-lg:[&>*:nth-child(n+3)]:border-t lg:divide-x">
  <div class="p-4 md:p-5 lg:col-span-2"> … featured: label, text-metric money, delta, sparkline … </div>
  <div class="p-4 md:p-5"> label (text-caption ink-3) · value (text-headline money font-semibold) · delta </div>
  …
</section>
```
- Delta: `TrendingUp/Down` 14px + `text-caption` in `success-text`/`danger-text`; no pill.
- Sparkline: 1.5px `primary-500` path, no fill, no axes, 120×32.
- No per-stat icon wells. A stat is a label and a number.

## Tag (status) — replaces `Badge` look

```
inline-flex items-center gap-1 h-[22px] px-2 rounded-tag border text-micro font-medium
neutral : border-line-strong text-ink-2
success : bg-success-tint text-success-text border-success-text/20
warning : bg-warning-tint text-warning-text border-warning-text/20
danger  : bg-danger-tint  text-danger-text  border-danger-text/20
info    : bg-info-tint    text-info-text    border-info-text/20
brand   : bg-primary-50   text-primary-text border-primary-200   (dark: bg-primary-500/15)
```
Either a 6px dot **or** an icon, never both. Document status → tag: `draft` neutral · `sent` info · `paid` success · `partially_paid` warning "Partial" · `overdue` danger · `cancelled` neutral + `line-through`. Payment: `unpaid` warning · `refunded` neutral. Fulfilment: `unfulfilled` neutral · `partially_fulfilled` warning · `fulfilled` success.
Document **type** is shown by icon + label in ink — not by rainbow colour (retire the blue/green/amber `color` in `documentTypes.ts`).

## Ledger rows & tables — `DocumentList`, `LedgerTable`, `RecentTransactions`

- Header `.th`, sticky, `border-b border-line`. No zebra. Row `min-h-[52px] border-b border-line hover:bg-paper-2`.
- Columns: number/title (ink, 500) · customer (ink-2) · date (ink-3) · status Tag · amount (`.money`, right, 600). Row actions fade in on hover (`opacity-0 group-hover:opacity-100`, always visible on touch via trailing `MoreHorizontal`).
- Avatar initial: 32px `rounded-full bg-paper-2 border border-line text-ink-2 text-caption font-semibold` — one neutral treatment (no random pastel). Locked rows: `Lock` 14px icon, not the 🔒 emoji.
- Mobile: two-line item — line 1 title + amount (right), line 2 customer · date · Tag. 56px, `border-b border-line`, swipe actions only if already present.
- Selection: `CheckSquare` accent; selected row `bg-primary-50 dark:bg-primary-500/10` + 2px left rule `primary-500`.
- Totals block (documents): `panel-sunken`, `.rule-dashed` above grand total, grand total `text-lead font-semibold money`.

## Sidebar — `Sidebar.tsx`

- Width 232 / collapsed 64. `bg-paper border-r border-line`. No gradient, no shadow, no blur.
- Top: logo (`public/logo/refloww-full-orange.svg` expanded; `refloww-icon-orange.svg` collapsed). Height 56, aligned with header.
- Item: `h-9 px-2.5 rounded-ctl gap-3 text-body text-ink-2 hover:bg-paper-2 hover:text-ink`; icon 20px `weight="regular"`.
- **Active**: `bg-paper-2 text-ink font-medium`, icon `weight="bold"` with orange accent (`data-active`), plus a 3×16px `bg-primary-500 rounded-full` mark at the item's left edge (inside, `left-0`). Mark slides between items on route change (220ms).
- Section labels (`Documents`, `Management`): `text-micro font-medium text-ink-3` sentence case, chevron `ChevronDown` 14px rotating 180° (160ms). Children indented 12px with a 1px `line` guide.
- Collapsed: icons only, tooltip on hover (`shadow-pop`), section header opens the rail then expands.
- Bottom: Settings, Help, then user row (avatar + name + `LogOut` icon button).

## Mobile bottom nav — `mobile/MobileBottomNav.tsx`

- `bg-paper border-t border-line`, **no blur**, `pb-[env(safe-area-inset-bottom)]`, height 56 + inset.
- Five tabs: Home · Sales · Documents · Business · More. Icon 22px; label `text-micro`.
- Active: icon `weight="bold"`, label `text-ink font-medium`, 2px orange line at the tab's **top edge** (`before:` pseudo, 24px wide, rounded). Inactive `text-ink-3`. No pill background.
- "More" opens a bottom sheet (`animate-sheet-in`) with a 2-column grid of destinations: icon in `size-10 rounded-ctl bg-paper-2`, label under; no coloured wells.

## Header — `Header.tsx` / `MobileHeader.tsx`

56px, `bg-paper/none`, `border-b border-line`. Left: sidebar toggle + page context. Centre/right: `SearchInput` (desktop), `Bell` icon button with a 8px `primary-500` dot when unread, theme toggle (`Sun`/`Moon`), avatar menu. Notification types share one neutral icon well (`bg-paper-2`) — the *icon* (`Megaphone`, `Gift`, `Info`, `AlertTriangle`) carries meaning, not tint colours.

## Modal / Sheet — `ui/Modal.tsx`

- Scrim `bg-scrim` (no blur). Panel `bg-paper rounded-sheet shadow-sheet border border-line`, `max-w-md/lg/xl`.
- Header: title (Bricolage 600, 20px) + `X` icon button; body `p-5`; footer `border-t border-line px-5 py-4`, actions right-aligned (cancel ghost, confirm primary). Destructive confirm = `danger` button, title names the object ("Delete invoice INV-0042?").
- `<md`: bottom sheet — `rounded-t-sheet`, 4×36 grabber `bg-line-strong`, `max-h-[88dvh]`, safe-area footer, drag-to-dismiss.
- Focus trap, `Esc`, restore focus.

## Toast — `ui/Toast.tsx`, `SwipeableToaster`

One neutral treatment for all four types (stop tinting whole toasts):
```
flex items-start gap-3 w-[min(92vw,380px)] p-3.5 rounded-panel bg-ink text-paper border border-line shadow-pop
```
(dark theme: `bg-paper-2 text-ink`). Leading 20px icon with the status colour only on the **icon**: success `CircleCheck` (`text-success-text`, `rf-draw`), error `CircleX`, warning `AlertTriangle`, info `Info`. Title 500 `text-body`, description `text-caption` at 70%. Optional single text action (`text-primary-400 font-medium`). 4s.

## Tabs — `ui/SubTabs.tsx`, `MobileSubHeaderNav`

Underline tabs: `h-10 gap-6 border-b border-line`; tab `text-body text-ink-3 hover:text-ink`, selected `text-ink font-medium` with the sliding 2px `primary-500` indicator. Icons optional (16px). Counts: `text-micro money text-ink-3`. Keep the current "inactive shows icon only on tight widths" behaviour but animate the label in 160ms.

## Empty state — `ui/EmptyState.tsx`

```
<div class="flex flex-col items-center text-center py-14 px-6">
  <div class="grid place-items-center size-14 rounded-panel border border-dashed border-line-strong bg-paper-2 text-ink-2 [--rf-accent:var(--color-primary-500)]">
    <Invoice class="size-7" />        // duotone-in-context: accent orange
  </div>
  <h3 class="font-heading text-lead font-semibold mt-4">No invoices yet</h3>
  <p class="text-body text-ink-3 mt-1 max-w-sm">Create your first invoice and it will appear here.</p>
  <Button class="mt-5">New invoice</Button>
</div>
```
Dashed tile = "empty slot for a document". Default icon `FileX` → `Invoice`/contextual. One action, one sentence.

## Skeleton — `ui/Skeleton.tsx`

`bg-paper-2 rounded-ctl animate-hold`; no gradient shimmer. Skeletons mirror the real row/panel geometry (same heights) so nothing jumps.

## Menu / dropdown — `FixedDropdownMenu`, `Select`, `TasksDropdown`

`bg-paper border border-line rounded-panel shadow-pop p-1 animate-pop`; item `h-9 px-2.5 rounded-ctl gap-2.5 text-body text-ink-2 hover:bg-paper-2`; selected item `text-ink font-medium` + `Check` 16px right; destructive `text-danger-text`; separators `my-1 border-t border-line`; section label `text-micro text-ink-3 px-2.5 py-1.5`.

## Document canvas — `DocumentPreviewWrapper`, `DocumentRenderer`, template editor

- Backdrop `bg-desk`; document sheet keeps its own print CSS (`styles/document-renderer.css` — do not restyle the printable output), displayed with `shadow-page` and a 1px `line` edge.
- Editor chrome is flat: toolbar `bg-paper border-b border-line`, groups separated by 1px vertical rules, tools are 32px ghost icon buttons (active tool `bg-paper-2` + accent orange). Zoom control: floating `panel shadow-pop rounded-full` with `ZoomOut`, % label, `ZoomIn`, `Maximize`.
- Selection: 1.5px `primary-500` outline, 8px square handles, alignment guides 1px `primary-500`, snapped-grid dots `ink-4` at 12% opacity.

## Auth screens — `login`, `signup`, `forgot-password`

Single column ≤ 420px on mobile. Desktop split: form left on `bg-paper`, right half `bg-ground` showing a slightly rotated (−2°) real **invoice sheet fragment** using `DocumentRenderer` sample data — brand moment instead of stock illustration. Headline Bricolage 28px. "Continue with Google" is a `secondary` button with the multicolour G (keep as-is: third-party brand mark). Divider `or` in `text-micro text-ink-3`.
