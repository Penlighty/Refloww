# Screens

Each route: purpose → composition → specifics. All follow `PageHeader` + panels on `bg-ground`; content ≤1200px unless noted.

## Dashboard — `src/app/page.tsx`
`DashboardActionBanner` (collapsible) → `StatsGrid` → `QuickActions` → `RecentTransactions`.
- Banner: not a coloured card — a `panel` with a left 2px orange rule, one sentence, one action, `X` to dismiss. Shown only if there is something to decide.
- Replace `StatsGrid` with **StatBand**.
- `QuickActions`: one primary (`New invoice`, orange) + secondary outlined pills (`New receipt`, `New delivery note`, `Add customer`, `Add product`); icon 16px, no icon wells on desktop. Mobile: 2×3 tile grid, tiles `panel` with 20px icon + label.
- `RecentTransactions`: ledger rows (see components), "View all" text link in `text-primary-text`.
- Entrance: banner → band → rest with `animate-rise` stagger (≤4).

## Documents — `invoices/`, `receipts/`, `delivery-notes/` (list, new, [id], edit)
- List: PageHeader (title, count, primary `New invoice`), SubTabs for status, filters row (`SearchInput`, status select, `DateRangePicker`), ledger table. Bulk bar slides up from bottom on selection (`animate-toast-in`), flat `bg-ink text-paper rounded-panel`.
- Form (`DocumentForm.tsx`): two columns ≥lg — left: sections as stacked panels (Customer, Items, Notes); right: sticky **live preview** on `bg-desk` + totals `panel-sunken`. Mobile: preview in a bottom sheet behind a "Preview" button; Save pinned above bottom nav. Stock warnings are inline `AlertTriangle` + `text-warning-text` (no ⚠️ text).
- Detail (`DocumentDetail.tsx`): document sheet centred on `bg-desk`; action bar top-right (Download, Print, Share = ghost; one primary like "Record payment"); status Tag beside the number; timeline of events as a hairline vertical list.

## Templates — `templates/`, `templates/[id]`, `templates/[id]/edit`
- Gallery: grid of `panel` cards showing the template thumbnail on `bg-desk`, name + type icon/label below (no colour-coded type chips). Hover: border darkens only.
- Editor: full-bleed. Left tool rail 56px (icons), centre `bg-desk` canvas, right properties panel 280px (collapsible). Nothing decorative; chrome recedes. See "Document canvas" in components.

## POS — `pos/`
Two panes: product grid (left, ≥lg) / cart panel (right, 360px, sticky). Product tile: `panel`, image `aspect-square rounded-ctl bg-paper-2`, name 500, price `.money`; tap = `active:scale-[0.97]`. Cart rows: qty stepper (`Minus`/`Plus` 32px), line total right. Total block `panel-sunken`; **Charge ₦x** is the single orange button, `h-12`, full width. Mobile: cart as a bottom sheet summoned from a sticky "View cart · ₦x" bar. Barcode scan = `ScanLine` icon button in the search field.

## Customers — `customers/`, `customers/[id]`
List: avatar-initial rows with outstanding balance (`.money`, danger-text only when overdue). Detail: header (name, contact icons `Phone`/`Mail`/`MapPin` as 16px lines), StatBand (Billed, Paid, Outstanding), then SubTabs: Documents / Statement / Notes. Statement export uses `Download`.

## Products & Storefront — `products/`, `storefront/`, `storefront/catalog`, `s/[storeSlug]`
- Products: table with thumbnail 40px `rounded-ctl`, stock as `.money` + a Tag (`In stock`/`Low`/`Out`) — replace emoji badges.
- Storefront public page (`StorefrontCatalogContent.tsx`): the customer-facing surface — most brand-forward screen. Store name in Bricolage, product cards borderless on `bg-ground` with 1px line, price `.money`, badges as Tags with icons (`Award`, `Flame`, `Sparkles`), "Order on WhatsApp"/`MessageCircle` as the one orange action. No gradients on the banner; use the shop's logo + flat tint.

## Ledger / Transactions / Analytics — `ledger/`, `transactions/`, `analytics/`
- Ledger: true ledger look — hairline rows, running balance column, debit/credit right-aligned with `.money`, dashed rule between days. Filters in one row (`LedgerFilters`); export buttons (`ExportButtons`) as ghost with `FileSheet`/`FileJson` icons.
- Analytics/`RevenueChart`: flat chart — 1.5px `primary-500` line, 8% fill-free, axis labels `text-micro text-ink-3`, gridlines `line`, tooltip = Menu surface. One series is orange; comparison series `ink-4`. No area gradients.
- `ProductVelocityWidget`: sparkline rows, not mini cards.

## Settings, Help, Marketplace, Admin
- Settings: left sub-nav list (desktop) / drill-in pages (mobile); each section a panel with rows `label · control` separated by hairlines; destructive zone at the bottom as a `panel` with `border-danger-text/30`. Encryption (`EncryptionSettings`) uses `ShieldCheck`/`Lock`, plain explanatory copy, a single confirm step.
- Help: article-style, 640px column, `text-lead`; callouts are a left 2px rule + `Lightbulb`/`Info` icon (remove 💡). Keyboard shortcuts rendered as `kbd`.
- Marketplace: gallery like Templates; price `.money`; "Use template" is the one primary.
- Admin (`src/app/admin/*`, `AdminSidebar`, `AdminHeader`, `StatCard`): same system — retire the `admin-*` glass classes in `globals.css`; admin differs by a 2px `ink` top rule on the header and a "Admin" Tag, not by a second visual language.

## Cross-cutting states
- **Loading**: skeletons mirroring layout. **Empty**: dashed icon tile + sentence + action. **Error**: inline panel with `AlertCircle`, what failed, retry button. **Offline/sync** (`FirebaseSyncProvider`): small `Tag` in header, not a banner.
- **Locked (E2EE)**: `EncryptionUnlockModal` — centred sheet, `Lock` 24px tile, "Enter your password to unlock", one field, one primary.
- **Announcements** (`AnnouncementBanner`): full-width 40px strip `bg-paper-2 border-b border-line`, icon + text + `X`; no colour fills.
