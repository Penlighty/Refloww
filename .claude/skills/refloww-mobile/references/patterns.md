# Responsive patterns

Working references: `assets/examples/DocumentsListExample.tsx` (list + filters + create sheet) and `assets/examples/InvoiceFormExample.tsx` (form + sticky total + item picker + discard guard). Both type-check against the primitives.

## 1. Table → list (`DataTable`)

One column definition drives both views. Give every column a mobile role:

| Role | Mobile placement | Style |
|---|---|---|
| `title` | line 1, left | `text-body font-medium text-ink`, truncate |
| `subtitle` | line 2, left | `text-caption text-ink-3`, truncate |
| `meta` | line 3, left, inline (` · ` or Tag) | `text-micro text-ink-3` |
| `trailing` | line 1, right | `.money text-body font-semibold` |
| `trailingSub` | line 2, right | `text-micro text-ink-3` (e.g. running balance, due date) |
| `hidden` (default) | not shown | — |

Role map per screen (use exactly this so rows feel the same everywhere):

| Screen | title | subtitle | meta | trailing | trailingSub |
|---|---|---|---|---|---|
| Documents | number | customer | date · **status Tag** | total | balance due |
| Transactions | customer / reference | document no. | date · method | amount (± sign + colour only on the minus) | status |
| Ledger | description | account · type | date | debit / credit | running balance |
| Customers | name | phone / email | **Tag** if overdue | outstanding | last activity |
| Products | name | SKU · category | **stock Tag** (In stock / Low / Out) | price | — |
| Discounts | code / name | value (`10% off`) | status Tag · expiry | uses | — |
| Templates list | name | document type | updated | — | — |
| Admin | keep tables with `overflow-x-auto` (desktop-first) | | | | |

Rows: min 56px, `active:bg-paper-2`, 1px divider. Row actions: desktop on hover/focus; mobile trailing `⋯` (44px) → actions Sheet. Selection mode: long-press (500ms) a row → header morphs to "n selected" + bulk actions; rows show a leading `CheckSquare` target; exit with the header ✕ or system Back.

Tablet: `hideBelow="lg"` hides low-priority columns between 768–1023.

## 2. Filters, sort, search

- **Search**: header icon → in-header field (see shell doc). Debounce 200ms. Show result count under the header ("12 invoices").
- **Filters**: one `Filter` icon button in the header with a dot when active → `Sheet` with grouped radio/checkbox rows (min 44px), footer **Reset** (secondary) + **Show results** (primary, shows the count when cheap to compute).
- **Quick filters**: status chips (`MobileSubHeaderNav`-style horizontal scroller) for the 1 filter people use most (status).
- Active filters shown as removable chips under the header (`h-8`, `×` 32px hit area is allowed here because chips sit 8px apart; give the chip itself the tap target).
- Date range: two native `type="date"` fields + presets (Today, 7 days, 30 days, This month) as chips.

## 3. Forms

Layout
- One column. Group fields in `panel`s with a heading (`text-lead`). No two-column fields below `sm`, except paired short fields (Qty + Price, Day + Month) in a 2-col grid.
- Label above (`.label`), helper/error below. Error: `AlertCircle` 14px + `text-danger-text`; on submit scroll to the first error (`scrollIntoView({block:'center'})`) and focus it.
- Field height 44px (`h-11 md:h-10`); textarea min 96px; radio/checkbox rows are full-width 44px tap rows.
- Money: `inputMode="decimal"`, `.money`, right aligned, currency symbol as non-editable prefix; format on blur, raw on focus.
- Autosave drafts for long forms (invoices) to local state every 2s after the last keystroke; show "Draft saved" `micro` text in the header subtitle.

Primary action
- `StickyActionBar` with `[running total | Cancel | Save]`. Total (left) is a button that scrolls to the summary. On desktop the same markup renders inline.
- Immersive route: tab bar hidden; header = back + title only.
- While saving: button shows spinner + "Saving…", disabled; fields stay editable? No — set `aria-busy` and disable submit only.

Long forms
- Section anchors under the header as a horizontal chip row (Customer · Items · Notes · Payment) that scroll-spy; optional.
- Line items = cards with qty stepper (below); **Add item** opens a full-height `Sheet` with search + list; selecting adds and closes (or "Add & continue" keeps open for POS-style bulk entry).

Unsaved changes: header back → `Sheet` "Discard this invoice?" (Keep editing primary, Discard danger text). Web: `beforeunload`.

## 4. Stepper

`[− 44px] [value 48px, inputMode numeric, centred, .money] [+ 44px]`, border `line-strong`, radius `ctl`. Press-and-hold repeats after 400ms at 120ms intervals; value editable by tapping it. Removing at 0 shows a 5-second undo toast instead of a confirm dialog.

## 5. Select / combobox / pickers

| Options | Touch | ≥ md |
|---|---|---|
| ≤ 7, no search | native `<select>` | custom listbox |
| 8+ or needs search (customer, product) | `Sheet height="tall"` with sticky search field + list | popover combobox |
| Date | native `type="date"` | existing `DateRangePicker` |
| Multi | Sheet with checkbox rows + Apply | popover |

Never open a desktop popover on a phone; it clips and the keyboard covers it.

## 6. Segmented control (e.g. POS Products | Cart)

```tsx
<div role="tablist" className="relative grid grid-cols-2 rounded-ctl bg-paper-2 p-1">
  <span aria-hidden className="absolute inset-y-1 w-[calc(50%-4px)] rounded-[8px] bg-paper border border-line transition-transform duration-200 ease-settle"
        style={{ transform: `translateX(${index * 100}%)` }} />
  {/* two <button role="tab" className="relative z-10 h-10 text-body font-medium"> */}
</div>
```
Indicator slides 220ms; panels cross-fade 120ms with 8px horizontal offset in the direction of travel; counts in the label (`Cart · 3`).

## 7. Cards, stats, charts

- **StatBand** (design skill) on mobile: 2×2 grid, featured stat full-width on top; hairline dividers; values `text-headline`, never wrap (`whitespace-nowrap`, `tabular-nums`); abbreviate ≥ ₦10M as `₦12.4M` with full value in the sheet/tooltip.
- **Charts**: height 200–220px, full-bleed to the gutter; max 5 x-ticks; tap shows tooltip (Menu surface) pinned above the finger; no hover tooltips; no horizontal scroll. Legends below as a wrap row.
- **Sparklines** in lists: 64×24, no axes.

## 8. Images & media

Explicit aspect ratio (`aspect-square` product tiles, `aspect-[4/3]` template thumbnails), `object-cover`, `loading="lazy"`, `decoding="async"`. Carousels: `snap-x snap-mandatory overflow-x-auto no-scrollbar` + `snap-center` slides + dots indicator (8px, `aria-hidden`). Pinch-zoom only in the document viewer and template editor.

## 9. Text, numbers, wrapping

- Truncate with `min-w-0 truncate` (flex children need `min-w-0`!). Two-line clamp for product names: `line-clamp-2`.
- Money, quantities, document numbers: `whitespace-nowrap` + `.money`.
- Dates: `12 Oct` in rows; full `12 October 2026` in detail. Relative (`Today`, `Yesterday`) for ≤ 2 days.
- Long unbroken strings (emails, URLs): `break-all` or `[overflow-wrap:anywhere]`.

## 10. Empty, loading, error on mobile

- **Loading**: `DataTableSkeleton` / panel skeletons with the final row heights. >300ms only (no flash for fast loads).
- **Empty**: dashed icon tile + one sentence + one primary button, vertically centred in the remaining height (`min-h-[50dvh]`).
- **Error**: inline panel, `AlertCircle`, what failed, "Try again". Offline: header `Tag` "Offline · changes will sync"; writes queue (Firestore does this) — don't block the UI.

## 11. Toasts

Bottom-centre, `bottom: calc(var(--nav-h) + 12px)` (or `12px + safe` on immersive routes), width `min(92vw, 380px)`, above the sticky bar when present (`--action-bar-h` if you track it). Swipe down to dismiss (existing `SwipeableToaster`). Undo toasts live 5s; others 4s.

## 12. Swipe actions (optional enhancement)

Row follows the finger horizontally (pointer events, `touch-action: pan-y` on the row so vertical scroll still works); reveal one or two 72px action buttons (Edit neutral, Delete danger); open threshold 36px or flick > 0.4px/ms; snaps 220ms; opening one closes others; always keep the `⋯` alternative. Skip entirely if time is short — it is not required for UX parity.
