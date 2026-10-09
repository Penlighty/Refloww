# Mobile flows — screen by screen

Notation: **H** = header variant · **Nav** = tab bar state · **Primary** = the one commit/navigation action · **Motion** = IDs from `motion.md` (M1 fade, M2 push, M3 sheet, M4 rise, M5 press, M6 segmented, M7 draw-on check, M8 count bump, M9 row collapse, M10 toast, M11 header search morph, M12 tab indicator).
Widths: phone < 640 · tablet 768–1023 · desktop ≥ 1024. Everything below describes the **phone**; tablet/desktop deltas are noted at the end of each block.

---

## Global overlays (reachable from any screen)

| Overlay | Trigger | Presentation | Behaviour |
|---|---|---|---|
| **Search** | header 🔍 | Header morphs (M11); results panel under header | Recent searches when empty; grouped results (Documents, Customers, Products) as 56px rows; tap → push route; Back/Cancel closes |
| **Notifications** | header bell | `Sheet height="tall"` | List rows 64px (icon, title, time); unread = 8px orange dot; footer "Mark all read" |
| **Org switcher** | dashboard org pill | `Sheet` auto | Radio-style rows with `Check`; "Add organisation" at bottom |
| **More** | tab bar | `Sheet` auto | See shell doc |
| **Unlock (E2EE)** | app start / locked content | `Sheet dismissible={false} height="auto"` | Lock tile, one password field (`autoComplete="current-password"`, show toggle), primary "Unlock"; keyboard lifts the sheet; wrong password: field shake 160ms (translateX ±4px, once) + inline error |
| **Confirm destructive** | delete | `Sheet` | Title names the object; **Cancel** (secondary) above **Delete** (danger solid), 48px each, stacked |

---

## Dashboard (`/`)
**H** `dashboard` · **Nav** visible, Home active · **Primary** none in header; quick actions in body · **Motion** M1, M4 (≤4 blocks, 40ms stagger), M5, M12

Top → bottom:
1. Action banner (only when something needs a decision: overdue invoices, unlock, sync error) — panel with 2px left orange rule, one sentence, one button, ✕.
2. **StatBand**: featured stat (Revenue) full width with 120×32 sparkline; below, 2×2 grid (Outstanding, Paid, Customers, Low stock). Values `text-headline`; tap a stat → its filtered list (push).
3. **Quick actions**: 3×2 grid of 88px tiles (icon 24 + label 12px): New invoice (primary tile, orange), New receipt, New delivery note, Add customer, Add product, POS. Tiles `press`.
4. **Recent activity**: 5 rows (`DataTable` mobile rows) + "View all" link (`text-primary-text`).
Pull-to-refresh: none (live data). Skeleton: band + 5 rows. Empty (new org): band shows ₦0 with muted text; Quick actions remain; Recent shows dashed empty tile "Create your first invoice".
Tablet/desktop: banner above a 4-column band; quick actions as a single row of buttons; activity as table.

---

## Documents list (`/invoices`, `/receipts`, `/delivery-notes`)
**H** `section` ("Invoices", count) · actions: Search, **+** · **Nav** visible (Documents active) + section tabs (Invoices · Receipts · Delivery notes · Templates) · **Motion** M1, M12, M3 (filter), M9

1. Section tabs (sticky) → status chips row (All · Draft · Sent · Paid · Overdue) with counts.
2. Rows via `DataTable` (roles in `patterns.md`). Overdue rows: status Tag danger; amount unchanged colour.
3. Filter button (header) → filter Sheet; active filters as chips under the chips row.
4. Long-press a row → **selection mode**: header becomes "3 selected" + Download, Send, ⋯; tab bar hidden (immersive) and a bottom bar with the same actions appears; ✕ or Back exits.
5. Row tap → push `/invoices/[id]` (M2). **+** → create Sheet (Invoice / Receipt / Delivery note) → push `/…/new`.
States: 50 per page, "Load more" row (auto when 400px from the end); delete from detail only (no delete-on-swipe by default).
Tablet/desktop: table with hideBelow="lg" columns; bulk bar inline above the table.

---

## Create / edit document (`/invoices/new`, `/…/[id]/edit`, receipts, delivery notes)
**H** `creation` (back, title) · **Nav** hidden (immersive) · **Primary** `StickyActionBar` [Total · Cancel · Save] · **Motion** M2 in, M3 (item picker, preview, discard), M5, M8

Flow:
1. **Customer** panel: field opens a tall Sheet with search + "Add new customer" row; selected customer shows name, phone, change link.
2. **Details** panel: document number (read-only, tap to edit), date (native date), due date / terms (native select), currency (select).
3. **Items** panel: each item = card [name · unit price · stepper · line total]; "+ Add item" opens full-height picker Sheet (search, scan barcode `ScanLine`, recent items first); low-stock warning inline with `AlertTriangle` in `text-warning-text` (not emoji). Free-text item: "+ Custom item" at the bottom of the picker.
4. **Discount / tax / shipping**: collapsed rows (label → value); tap opens a small Sheet with numeric field.
5. **Notes & terms**: textarea, collapsed to one line until tapped.
6. **Summary** panel (`panel-sunken`): subtotal, discount, tax, dashed rule, **Total** (`text-lead`).
7. **Preview**: ghost button "Preview" in the bar's overflow or at the end of the summary → `Sheet height="full"` with the document fit-to-width (scale = containerWidth / 794 for A4; never scroll sideways), pinch-zoom up to 3×, bottom bar Download / Share.
Save: bar button → spinner; success → `CircleCheck` draws on (M7) in a toast "Invoice INV-0042 saved" and `router.replace('/invoices/[id]')`.
Back with changes → discard Sheet. Drafts auto-saved locally every 2s ("Draft saved").
Validation: inline errors, scroll to first; Save never silently disabled — if invalid, tapping Save scrolls to the first error.
Tablet/desktop: 2 columns (form | sticky summary + live preview); bar renders inline at the end of the summary.

---

## Document detail (`/invoices/[id]`)
**H** `detail` (back, "INV-0042", status Tag as subtitle) · actions ⋯ · **Nav** visible · **Primary** `StickyActionBar aboveNav` — contextual: Draft → "Send", Sent/Overdue → "Record payment", Paid → "Download PDF" · **Motion** M2, M3, M7, M5

Body: summary card (customer, dates, amount due `text-headline`) → "View document" row (opens the viewer Sheet) → items (list, read-only) → totals → payments (list with method + date) → activity timeline (hairline vertical list).
⋯ Sheet: Edit, Duplicate, Download PDF, Print (hidden on touch if unsupported), Share link, Mark as sent/paid, Delete (danger, separated).
Record payment: Sheet `height="auto"` — amount (prefilled with balance, `inputMode="decimal"`), method segmented (Cash · Transfer · Card · Other), date, note; footer "Record ₦x". Success: M7 + the amount-due number counts down (M8 reversed, 400ms).
Locked (encrypted) documents: `Lock` tile + "Unlock to view" primary.
Tablet/desktop: document sheet centred on `bg-desk`; actions top-right.

---

## POS (`/pos`)
**H** `section` ("POS") · actions: Scan (`ScanLine`), Search · **Nav** visible (Sales active) · **Primary** floating cart bar (above nav) then Charge in cart · **Motion** M6, M5, M8, M3, M7

Phone layout = **two views** switched by a segmented control `[Products | Cart · n]` under the header (existing).
- **Products**: category chips (sticky), grid `grid-cols-2` (≥360px) / 3 (≥480px). Tile: square image, 2-line name, price. Tap = add 1 (M5 press + haptic tick 8ms if available); tile then shows an inline stepper (− n +) replacing the price row for 2s of inactivity, so repeat adds are one tap.
- **Floating cart bar** (shows when cart non-empty, on Products view only): `[🛒 3 items · ₦12,500 · View cart ›]`, height 56, above tab bar (`bottom: calc(var(--nav-h) + 8px)`), slides up 220ms on first item, count bumps (M8) on each add. This is the only floating element.
- **Cart**: rows [name · stepper · line total]; swipe-left reveals Remove (optional) + visible `Trash` in `⋯`; customer row (opens Sheet, default "Walk-in"); discount row (Sheet); totals panel; `StickyActionBar` **Charge ₦12,500** (primary, 52px), tab bar hidden while in Cart view.
- **Checkout Sheet** (`height="tall"`): amount due hero; method segmented (Cash · Transfer · Card · Credit); Cash → "Amount received" numeric field + quick chips (exact, ₦5,000, ₦10,000, ₦20,000) + **Change due** line updates live; Transfer → account details + "Mark as received"; Complete sale primary.
- **Success state** (inside the same Sheet): `CircleCheck` draws on (M7), "₦12,500 received", buttons: **Print / Share receipt** (primary) · **New sale** (secondary). Sheet auto-resets cart on "New sale".
- Offline: sale saved locally; header Tag "Offline"; success copy adds "Will sync when you're online".
Landscape / tablet (width ≥ 640 & height < 500, or ≥ 768): two panes, products left, cart right (380px). Desktop: same, cart sticky.

---

## Customers (`/customers`, `/customers/[id]`)
List — **H** `section` · Search, **+** · rows via DataTable (name, phone, outstanding, Tag when overdue). Tap → push.
Detail — **H** `detail` (back, name) · ⋯ (Edit, Statement, Delete) · **Primary** bar: "New invoice" (prefills customer).
Body: contact lines (`Phone`, `Mail`, `MapPin` rows — each is a tap target: `tel:`, `mailto:`, maps) → StatBand (Billed · Paid · Outstanding) → segmented tabs [Documents · Statement · Notes] (M6) → list of that customer's documents (DataTable rows) / statement table → list.
**Fix:** `CustomerDetailClient` table has no wrapper or mobile list today → DataTable.

---

## Products (`/products`, `/products/[id]`)
List rows: thumbnail 48px, name, SKU·category, price right, stock Tag. Filters: category chips + stock status Sheet. **+** → create Sheet or push `/products/new`. Low-stock quick filter chip on top.
Detail: image carousel (snap, aspect 4/3) → price/stock StatBand → editable fields in panels → history (stock movements as list). **Primary** bar: Save (when dirty) else "Adjust stock".
Barcode: `ScanLine` button inside the SKU field opens the scanner Sheet (camera), result fills field.
**Fix:** 3 of 4 tables in `products/page.tsx` and `ProductDetailClient` need DataTable lists.

---

## Transactions & Ledger (`/transactions`, `/ledger`)
Rows per `patterns.md` map. Date grouping: sticky day headers (`text-micro uppercase`, `bg-ground`) with daily total at right. Filters Sheet (type, account, date presets). Export (`Download`) in header ⋯ → Sheet (CSV / PDF).
Tap row → `TransactionDetailModal` → **Sheet height="tall"**, content as a definition list (label left, value right), not a table. **Fix:** `LedgerTable` and `TransactionDetailModal` have no mobile design today.

---

## Discounts (`/discounts`)
List: code (title), value (subtitle), status Tag · expiry (meta), uses (trailing). **+** → full-height Sheet form (code with `autoCapitalize="characters"`, type segmented %/₦, value, limits, dates native). Toggle active/inactive via `Switch` row inside the item's ⋯ Sheet.

---

## Storefront manager (`/storefront`, `/storefront/catalog`)
Panels: Store profile (logo upload, name, slug with copy), Share (link + QR + WhatsApp share `Send`), Catalog (DataTable of published products with visibility switch), Orders if present. **Primary** bar: "Copy store link" (secondary) + "Preview store" (primary) on the root screen.

---

## Public storefront (`/s/[storeSlug]`, `StorefrontCatalogContent`)
The most customer-visible mobile surface — treat as a mini consumer app. Own scroll container; no tab bar; light header: logo + name, `ShoppingBag` cart button with count.
1. Hero strip (logo, name, WhatsApp/Call icon buttons 44px), search field.
2. Category chips (sticky under header, scroll-snap).
3. Product grid 2-up; card: image, name (2 lines), price, `Add` button 44px (becomes stepper after first add). Badges (Best seller `Award`, Flash sale `Flame`, New `Sparkles`) as Tags, not emoji.
4. Tap card → **product Sheet** `height="tall"`: image carousel, name, price, description, quantity stepper, footer "Add to cart · ₦x".
5. **Cart bar** (replaces the two fixed buttons at `bottom-24 right-6` / `bottom-20 right-4`): full-width `StickyActionBar aboveNav={false}` "View cart · 3 · ₦12,500". 
6. **Cart Sheet** `tall`: items with steppers, notes, total; footer "Checkout".
7. **Checkout Sheet**: name, phone (`tel`), delivery/pickup segmented, address (if delivery), note → primary **Send order on WhatsApp** (opens `wa.me` with a formatted message); success state with order summary + "Back to shop".
Out-of-stock: disabled Add + "Out of stock" Tag; low stock: "Only 3 left" `text-warning-text`.
Performance: images lazy, `aspect-square`, ≤60KB thumbnails; skeleton grid on load; works offline from cache for the last-viewed catalog if the PWA is installed.

---

## Templates (`/templates`, `/templates/[id]`, `/templates/[id]/edit`)
Gallery: 2-col grid of thumbnail cards (aspect 3/4 on `bg-desk`, name below, type icon + label). Tap → detail (preview fit-to-width, "Use this template", ⋯ Duplicate/Export/Delete).
**Editor** (immersive, full-bleed):
- Top bar (44px + safe): back (guarded), template name, Undo/Redo, **Done**.
- Canvas: `bg-desk`, document sheet centred; **one-finger drag on empty canvas pans, two-finger pinch zooms** (existing touch handlers around L1895–1940 — keep). Optional addition: double-tap toggles fit-to-width / 100%. Elements: tap selects (1.5px orange outline, 8px square handles with 44px invisible hit areas); drag moves; handles resize; snap guides appear in 80ms.
- Bottom **tool tray** (56px + safe, scrollable): Select · Text · Image · Table · Field · Shape · Layers. Active tool = `weight="bold"` + orange accent.
- Selecting an element opens **Properties** as a non-modal bottom sheet (peek 40% height, drag handle to full/closed; canvas above stays interactive; no scrim). Sections as accordion rows (Position, Typography, Fill, Border).
- Fields (invoice number, customer, items table) are inserted from a `Sheet` list of fields.
Gestures: field dragging by touch already exists (`mobileFieldTouchRef`, ~L2072–2089) — keep it. Audit what is still **mouse-only** (resize handles, multi-select, any `onMouseDown/Move/Up`) and move those to Pointer Events with `setPointerCapture` and `touch-action: none` on the selected element only; scrolling the properties sheet must never move the canvas. Verify every interaction on a real phone.
Tablet/desktop: left tool rail, right properties panel (280px), canvas centre; keyboard shortcuts.

---

## Marketplace (`/marketplace`)
Gallery like Templates; filters via chips; item Sheet (tall) with preview carousel, price `.money`, "Use template" primary.

---

## Settings (`/settings`)
Phone = **drill-in list** instead of the horizontal tab strip. Reuse `ALL_TABS` (`app/settings/page.tsx` L68–77) and its two categories: root list of 56px rows (icon · label · chevron) in two panels — **Account**: My Profile, Theme & Display, Account & Login · **Organization**: Company Profile, Team & Staff, Financial Defaults, ID & Numbering, Vault & Encryption. Tap → push a page with back; each page = panels of `label | control` rows (switches, selects, text). Appearance: segmented Light · Dark · System. Destructive zone at the end (danger outline panel). Save is per-section with the `StickyActionBar` only when dirty.
Tablet/desktop: current tabbed layout.

---

## Help (`/help`)
Single column 16px body, sticky "On this page" chip row, FAQ as accordion rows (56px, chevron rotates 180°, 200ms height via `grid-template-rows`). Keyboard-shortcut section hidden on touch.

---

## Auth (`/login`, `/signup`, `/forgot-password`)
Single column, top-aligned (not vertically centred, so the keyboard doesn't push the form out of view), logo 32px, title `font-heading text-headline`. Fields 48px: email (`type=email autoComplete=username`), password (show/hide 44px). Primary button full width 48px; "Continue with Google" secondary above or below an "or" divider. Inline errors; `enterKeyHint` next → go. Safe-area padding; sticky legal text at the bottom hidden when the keyboard is open. Tablet/desktop: split layout with invoice-sheet visual.

---

## Admin (`/admin/*`)
Desktop-first, but never broken on a phone: `AdminSidebar` becomes a left `Sheet` drawer (hamburger in `AdminHeader`); tables keep `overflow-x-auto` with a right-edge fade; forms single column; no horizontal page scroll. No custom mobile flows required.

---

## Deltas to remember
- Header search/bell/org are the same components in `Header.tsx` and `MobileHeader.tsx`.
- Every screen above gets `usePageHeader` so titles and actions are real (the old `MobileHeader` had none).
- One floating element per screen max (POS cart bar, storefront cart bar). Never two.
