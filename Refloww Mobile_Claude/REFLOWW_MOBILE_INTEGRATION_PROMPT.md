# Refloww — Mobile Responsive Integration Prompt

**How to use:** open the Refloww repo in Claude Code / Cursor, put the deliverables in `./_design/`, paste everything below `=== PROMPT ===`. Phases are ordered and each ends in a commit.

Expected in `./_design/`:
- `refloww-mobile.skill` (zip: `SKILL.md`, `references/`, `assets/`)
- `refloww-design.skill` and `refloww-icons/` (from the first deliverable)
- this file

**Order of work:** run `REFLOWW_INTEGRATION_PROMPT.md` Phases 0–2 first (design tokens, fonts, icon swap). This prompt relies on tokens such as `bg-paper`, `border-line`, `text-ink-3`, `rounded-sheet`, `text-micro`, `shadow-sheet`, `font-heading`. If they don't exist yet, stop and do that first. If you already ran the full design prompt, the shell and primitives are restyled; this prompt changes their *structure and behaviour*, so re-read each file before editing.

What was verified before this prompt was written (on a scratch copy of this repo): the reference code in `assets/` type-checks (`tsc` 0 errors), lints clean with the repo's ESLint config (React Compiler rules included), passes 20 jsdom runtime checks (Back-button stack, Sheet lifecycle, DataTable, header context, action bar), and the CSS layer compiles with Tailwind 4.1.18 (including the `touch:`, `desk:` and `mob:` variants). It has **not** been run on a real device — Phase 7 does that.

=== PROMPT ===

You are making **Refloww** (Next.js 16, React 19, Tailwind v4, Firebase; also shipped as a Capacitor Android app and an installable PWA) fully responsive and effortless on phones, while keeping the desktop experience intact. **UI/layout/behaviour only** — do not change business logic, Firestore/sync, encryption (`EncryptionContext`, `lib/`), API routes, `firestore.rules`, or printable output (`src/styles/document-renderer.css`, `DocumentRenderer.tsx`).

## Ground rules
1. Branch `design/refloww-mobile`. **Commit after each phase.**
2. Install the skill first and read `SKILL.md` + the reference named in each phase. If this prompt and the skill disagree, the skill wins.
3. After every phase: `npx tsc --noEmit` and `npm run lint`. Lint already has pre-existing findings (e.g. `src/lib/hooks/useFirebaseSync.ts` has 13 `no-explicit-any` errors) — record the baseline and add **no new** ones. `npm run build` at the end of Phases 1, 3, 5.
4. Keep every component's props/exports. Prefer extending existing components over creating parallel ones.
5. Mobile-first: write the phone layout, then add `sm:/md:/lg:` enhancements. Never hide critical information below `md`.
6. Ambiguity → leave `// TODO(mobile): <question>` and pick the closest option from the skill.
7. Banned in new code: `h-screen`/`min-h-screen`/`100vh`, `vh` units, centred modals on phones, hover-only controls, inputs < 16px on touch, `backdrop-blur`, floating action buttons, `window.innerWidth`.

---

## Phase 0 — Install  *(commit: `chore(mobile): add mobile skill and primitives`)*
```bash
git checkout -b design/refloww-mobile
mkdir -p .claude/skills && unzip -o _design/refloww-mobile.skill -d .claude/skills/
A=.claude/skills/refloww-mobile/assets
cp $A/src/lib/hooks/*.ts                 src/lib/hooks/
cp $A/src/components/ui/*.tsx            src/components/ui/
cp $A/src/components/mobile/*.tsx        src/components/mobile/
```
(`useFirebaseSync.ts` already lives in `src/lib/hooks/` — copying doesn't touch it. Existing `components/ui/Skeleton.tsx` etc. are not overwritten; the asset set only adds `Sheet`, `DataTable`, `StickyActionBar`.) Read `SKILL.md`, then `references/audit.md` and `references/foundations.md`.

---

## Phase 1 — Foundations  *(commit: `feat(mobile): viewport, safe areas, dvh, input rules`)*
Read `references/foundations.md`.

**1.1 `src/app/layout.tsx`** — update the `viewport` export (currently only `themeColor`, L~21–28):
```ts
export const viewport: Viewport = {
  width: 'device-width', initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f5f3' },
    { media: '(prefers-color-scheme: dark)',  color: '#121519' },
  ],
};
```
Body class: `h-screen` → `h-dvh` (keep `overflow-hidden`, `flex`). Do **not** add `maximumScale`/`userScalable`.

**1.2 `src/app/globals.css`**
- Paste `assets/styles/globals-mobile.css` after the `@theme` blocks and the design tokens.
- **Delete** `globals.css:594` — `html, body { padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom); }`. It was inert (no `viewport-fit=cover`) but will now **double-pad** against the header/tab-bar safe-area handling.
- The existing `.mobile-touch-target`, `.mobile-primary-btn`, `@media (max-width: 767px)` helpers: keep until Phase 7, then remove if unused.
- This layer defines utilities the markup already uses but never had CSS for: `safe-area-pt`, `safe-area-pb`, `no-scrollbar`, `custom-scrollbar`.

**1.3 Viewport units codemod** (review each diff; `lg:h-[calc(100vh-10rem)]` in `app/pos/page.tsx` L337 should become `lg:h-[calc(100dvh-var(--header-h)-6rem)]`):
```python
# scripts/codemod_dvh.py
import re, glob
pairs = [(r'\bh-screen\b','h-dvh'), (r'\bmin-h-screen\b','min-h-dvh'), (r'\bmax-h-screen\b','max-h-dvh'),
         (r'\b((?:max-|min-)?h-)\[(\d+)vh\]', r'\1[\2dvh]'), (r'calc\(100vh', 'calc(100dvh')]
for f in glob.glob('src/**/*.[tc]ss*', recursive=True) + glob.glob('src/**/*.tsx', recursive=True):
    s = open(f, encoding='utf-8').read(); t = s
    for a, b in pairs: t = re.sub(a, b, t)
    t = re.sub(r"(['\"])(\d+)vh\1", r"\1\2dvh\1", t)   # inline styles, e.g. maxHeight: '80vh'
    if t != s: open(f, 'w', encoding='utf-8').write(t); print(f)
```
Current state: 44 `vh`-based occurrences (18 `h-screen` family, 5 `100vh`, 21 arbitrary/inline), 0 `dvh`. Tested on a scratch copy: the codemod clears all Tailwind-class and `calc()` sites (22 lines / 15 `max-h`) and `tsc` stays clean; the inline-style rule handles `maxHeight: '80vh'` in `TemplateEditorClient.tsx` ~L2924. `h-screen` sites (file(count)): `AppShell.tsx`(3) · `app/admin/layout.tsx`(3) · `app/login/page.tsx`(2) · `signup/page.tsx`(2) · `forgot-password/page.tsx`(2) · `layout.tsx`, `marketplace`, `settings`, `help`, `pos`, `storefront/catalog`, `s/[storeSlug]`, `customers/[id]/CustomerDetailClient`, `TemplateEditorClient`, `StorefrontCatalogContent` (1 each). Also `max-h-[Nvh]` in `Modal.tsx:95`, `ImageUploader.tsx:366/370`, `TransactionDetailModal.tsx:85`, `DocumentDetail.tsx:799`, `BarcodeScannerModal.tsx:180`, `MobileHeader.tsx:284/390`, `MobileBottomNav.tsx:135`, `DocumentForm.tsx:1716/1790`, `marketplace/page.tsx:512/532`, `CustomerDetailClient.tsx:277`, `settings/page.tsx:336`, `storefront/page.tsx:952`, `help/page.tsx:113`, `pos/page.tsx:337/1004`. Sheets will replace most of these in Phase 3.

**1.4 Native shell colours** — `src/components/ThemeProvider.tsx` L20–21: `StatusBar.setBackgroundColor({ color: isDark ? '#121519' : '#f8fafc' })` → `'#121519'` / `'#f4f5f3'` (= `--ground`). `capacitor.config.ts` still says `appId: 'com.inflow.app'`, `appName: 'Inflow'` — flag in the final report; don't rename without confirmation.

**1.5 Verify (browser devtools, iPhone + Pixel emulation):** no 100vh gap; body has no padding; `getComputedStyle(document.querySelector('input')).fontSize` is `16px` under touch emulation.

---

## Phase 2 — App shell & navigation  *(commit: `feat(mobile): shell, header contract, tab bar, section tabs`)*
Read `references/shell-and-navigation.md` and `references/motion.md` (M1, M2, M11, M12).

**2.1 `components/AppShell.tsx`** (root div L127, `<main>` L140, `pb-36 sm:pb-40 md:pb-8`) → restructure exactly as in the skill:
- Wrap in `<PageHeaderProvider>`; root `div` gets `data-immersive={immersive}` where `immersive = /\/(new|edit)(\/|$)/.test(pathname)`; classes `flex h-dvh w-full flex-col overflow-hidden bg-ground text-ink`.
- Mobile chrome (`MobileHeader`, `MobileSubHeaderNav`) in a `desk:hidden` wrapper; `Sidebar` and desktop `Header` get `mob:hidden`.
- Scroller: `<div id="app-scroll" className="flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-app px-safe sm:px-6 desk:px-8 desk:pb-8">` wrapping `<PageTransition>{children}</PageTransition>`.
- **Shell switch:** in `AppShell`, `Sidebar`, `Header`, `MobileHeader`, `MobileBottomNav`, `MobileSubHeaderNav` replace the `md:` / `md:hidden` that toggles *shell chrome* with `desk:` / `mob:` (≥768 wide **and** ≥500 tall). Leave content-level `md:` classes elsewhere untouched.
- Replace hard-coded greys (`#F4F5F3`, `#0B0F19`, `#121620`, `#161a24`) with `bg-ground` / `bg-paper`.
- Fix the route-title map entries that point to non-existent routes only if trivially wrong; otherwise leave.

**2.2 `components/mobile/MobileHeader.tsx`** (476 lines; currently mounted with **no props**, so `onSave/onFilter/onMore/isSubmitting/title` never arrive):
- Read `usePageHeaderConfig()`; variants `dashboard | section | creation | detail` per the table in the skill (keep the existing pathname-derived variant as fallback). Height `h-[var(--header-h)]` + `pt-safe`; `bg-paper`; hairline appears after scroll (IntersectionObserver sentinel at the top of `#app-scroll`, 160ms).
- Actions: render `config.actions` — max 2 on the right; primary = text/icon button (`bg-primary-500 text-on-primary`), others icon-only 44px (`size-11`) with `aria-label`; call `run(id)`.
- Back button: `window.history.length > 1 ? router.back() : router.push(backHref)`; 44px target.
- Search: morph in place (M11), results panel below, `enterKeyHint="search"`, closes on Back/Esc via `useOverlayHistory`.
- The three overlay panels (~L241 org switcher, ~L284 search/results, ~L390 notifications): re-implement notifications and org switcher with `<Sheet>` (`height="tall"` for notifications); delete their `fixed … max-h-[..vh]` markup.
- Extract the logic duplicated with `Header.tsx` (search, notifications list) into shared components used by both.

**2.3 `components/mobile/MobileBottomNav.tsx`** (tabs: Home `/`, Sales `/pos` (+`/transactions`), Documents `/invoices` (+receipts, delivery-notes, templates…), Business `/customers` (+products, storefront…), More):
- Container `fixed inset-x-0 bottom-0 z-40 h-[var(--nav-h)] pb-safe bg-paper border-t border-line` with `data-bottom-nav`; remove blur/shadow/`z-[80]`.
- Labels `text-micro`; active: icon `weight="bold"` + `data-active="true"`; replace `stroke-[2.5]/stroke-[1.75]` classes (11 occurrences across this file and `QuickActions.tsx`) with the `weight` prop.
- Active indicator: one 24×2px `bg-primary-500` bar on the tab's top edge that slides between tabs (M12, 200ms).
- Tapping the active tab: scroll `#app-scroll` to top, else go to the section root.
- Hidden when `[data-immersive='true']` (add `[data-immersive='true'] [data-bottom-nav] { display: none }` or rely on `--nav-h:0` + `hidden`); the CSS `:has` rule already slides it down while typing.
- More sheet (~L135, currently `fixed … min-h-[50vh] max-h-[85vh] z-[150]`) → `<Sheet>` with rows 56px (Analytics, Marketplace, Settings, Help, Appearance, Sign out); keep "close on route change".

**2.4 `components/mobile/MobileSubHeaderNav.tsx`**: show **labels on all tabs**, height `h-[var(--subnav-h)]` (44px), tabs `h-11 px-3`, sliding 2px underline (M12), scroll the active tab into view, sticky under the header, hidden on immersive and detail routes. `no-scrollbar` now works.

**2.5 `components/Sidebar.tsx`**: replace every `window.innerWidth` check (11 refs) with `useMediaQuery('(min-width: 1024px)')`; between 768–1023 (desktop shell) default to the **72px rail** with tooltips and an overlay-expand; remove the legacy `isMobileOpen`/`translate-x` mobile drawer path after confirming `toggleMobile` is unused (`grep -rn toggleMobile src`).

**2.6 Z-index:** header 30 · sub-nav 20 · tab bar/sticky bar 40 · dropdown 50 · sheet 60 · toast 70. Replace `z-[80]`, `z-[100]`, `z-[150]`.

**Acceptance:** at 390×844 the header clears the notch, the tab bar clears the home indicator, content scrolls only inside `#app-scroll`; at 844×390 the mobile shell is kept; at 820×1180 the rail sidebar shows; at 1280×800 nothing regressed.

---

## Phase 3 — Primitives & systemic fixes  *(commit: `feat(mobile): sheets, data lists, sticky bars, touch fixes`)*
Read `references/patterns.md`.

**3.1 `components/ui/Modal.tsx`** (centred at L82, `max-h-[85vh]` L95, locks `body.overflow`): re-implement on top of `Sheet`, keeping its exported API (props, sizes). Remove the body scroll lock (the app scrolls inside `#app-scroll`; `Sheet` blocks background touch via its scrim).

**3.2 Convert centred overlays to `Sheet`** (file:line of today's `fixed inset-0 … items-center`): `TransactionDetailModal.tsx:83` (content as a definition list, not a table) · `BarcodeScannerModal.tsx:179` (`height="full"`) · `Header.tsx:1046` · `MigrationDialog.tsx:151` (`dismissible={false}`) · `DeleteConfirmationModal.tsx:35` (stacked Cancel/Delete 48px buttons) · `marketplace/page.tsx:507` · `pos/page.tsx:859, 945, 1191`. Also review the `max-h-[..vh]` panels listed in 1.3 (`ImageUploader`, `DocumentDetail:799`, `DocumentForm:1716/1790`, `CustomerDetailClient:277`, `settings:336`, `storefront:952`, `help:113`) and convert real overlays to `Sheet`.
The template editor's own mobile drawer (`TemplateEditorClient.tsx` ~L2921) stays **non-modal** (canvas stays interactive); only align its radius/grabber/animation with M3.

**3.3 Hover-only → touch-safe.** These 16 sites reveal controls only on hover, which Tailwind v4 never fires on touch devices: `ImageUploader.tsx:181` · `PendingTasks.tsx:141` · `DocumentDetail.tsx:578` · `Header.tsx:1020` · `settings/DocumentNumbering.tsx:295` · `TasksDropdown.tsx:197` · `dashboard/RevenueChart.tsx:105` · `DocumentForm.tsx:1101` · `admin/marketplace/page.tsx:581` · `marketplace/page.tsx:378` · `templates/[id]/edit/TemplateEditorClient.tsx:607, 2719, 2772, 3169` · `templates/page.tsx:552` · `analytics/page.tsx:143`. For each: add `group-focus-within:opacity-100 touch:opacity-100` (or make it always visible below `md`), and for destructive/secondary row actions prefer a visible `⋯` button that opens an actions Sheet. `RevenueChart` tooltip must work on tap.

**3.4 Tables → `DataTable`.** Use `components/ui/DataTable.tsx` with the **role map in `references/patterns.md §1`**. Convert (and delete the old `md:hidden` card duplicates):
`components/DocumentList.tsx` · `RecentTransactions.tsx` · `app/transactions/page.tsx` · `app/customers/page.tsx` (2 tables) · `app/products/page.tsx` (4 tables; only 1 has a mobile list today) · `app/customers/[id]/CustomerDetailClient.tsx` and `components/TransactionDetailModal.tsx` (**no overflow wrapper at all today**) · `app/products/[id]/ProductDetailClient.tsx` · `app/discounts/page.tsx` · `app/storefront/page.tsx` · `app/templates/page.tsx` (verify) · `components/ledger/LedgerTable.tsx`. Leave the 5 admin tables (`app/admin/*`) as-is but ensure `overflow-x-auto`. Selection mode (long-press 500ms → "n selected" header + bulk bar) goes through `renderMobileRow`.

**3.5 `StickyActionBar`** replaces ad-hoc bottom buttons: `DocumentForm.tsx` (top actions ~L729 and bottom ~L1555 → one bar with `[Total | Cancel | Save]`), POS cart "Charge", Settings sections when dirty, product/customer/discount forms. Keep desktop inline behaviour (it is static from `md`).

**3.6 Forms** (`references/foundations.md §6`): inputs `h-11 md:h-10`; correct `type`/`inputMode`/`autoComplete`/`autoCapitalize`/`enterKeyHint` — find candidates with `grep -rnE 'type="(number|tel|email|date)"' src`: money/quantity → `type="text" inputMode="decimal"` (or `numeric` for integers), phone `tel`, email `email`, SKU/codes `autoCapitalize="characters" autoCorrect="off"`. Selects: native `<select>` on touch; options ≥ 8 or searchable → picker `Sheet`. Remove per-field `text-xs/text-sm` that fight the 16px rule only if they hurt desktop density (the coarse-pointer rule wins on touch anyway).

**3.7 Toasts:** `SwipeableToaster` position → `bottom: calc(var(--nav-h) + 12px)`, `z-70`; swipe-down dismiss (M10). On immersive routes `--nav-h` is 0 so they sit just above the action bar (add `--action-bar-h` if you track it).

**3.8 Back & overlays:** the `Sheet` registers with `useOverlayHistory`. Add the same hook to any remaining non-Sheet overlay (search panel, editor drawer if modal-like). Dirty-form guard: header back with unsaved changes → `Sheet` "Discard changes?" (Keep editing primary, Discard danger text).

---

## Phase 4 — Screen flows  *(one commit per group: `feat(mobile/<area>): …`)*
Read `references/screens.md`; implement each screen exactly as specified there (layout order, header variant, primary action, states). Every page calls `usePageHeader({...})`.
1. **Dashboard** `app/page.tsx` + `StatsGrid`, `QuickActions`, `DashboardActionBanner`, `RecentTransactions` — 2×2 stat grid with featured stat, 3×2 quick-action tiles (`press`), M4 stagger ≤ 4.
2. **Documents** list/new/edit/detail: `components/DocumentList.tsx`, `DocumentForm.tsx`, `DocumentDetail.tsx`, routes `invoices|receipts|delivery-notes`. Create Sheet; filter Sheet; item picker Sheet (`height="full"`); preview Sheet fit-to-width (scale = width/794) with pinch; record-payment Sheet; discard guard; `router.replace` after save.
3. **POS** `app/pos/page.tsx`: segmented `Products | Cart · n` (existing L340–372; add sliding indicator M6), floating cart bar at `bottom: calc(var(--nav-h) + 8px)` (replace `bottom-20`), inline steppers on tiles, checkout Sheet (`height="tall"`) with method segmented, quick-amount chips, live change-due, success state with M7, offline copy. Landscape/tablet two panes.
4. **Customers / Products / Transactions / Ledger / Discounts** per the screens doc (detail pages with StatBand + segmented tabs; barcode button in SKU field; day-grouped sticky headers).
5. **Public storefront** `app/s/[storeSlug]/page.tsx`, `components/storefront/StorefrontCatalogContent.tsx` (L~801 and ~843 have two fixed floating buttons): replace with one cart `StickyActionBar aboveNav={false}`; product Sheet, cart Sheet, checkout Sheet → "Send order on WhatsApp". This route is outside the tab-bar shell and `body` is `overflow-hidden` — give it its own `h-dvh overflow-y-auto overscroll-contain` scroller and safe-area padding. Also `app/storefront/page.tsx` (manager) and `storefront/catalog/page.tsx`.
6. **Templates & editor** `app/templates/page.tsx`, `[id]`, `[id]/edit/TemplateEditorClient.tsx`: gallery 2-col; editor keeps its pinch/pan (≈L1895–1940) and touch field-drag (`mobileFieldTouchRef` ≈L2072–2089); audit what remains mouse-only (resize handles, `onMouseDown/Move/Up`) → Pointer Events with `setPointerCapture`; bottom tool tray 56px; properties as non-modal bottom drawer; `window.innerWidth` (6 refs) → `useMediaQuery`.
7. **Settings, Help, Marketplace, Auth, Admin**: Settings drill-in list using `ALL_TABS` (`app/settings/page.tsx` L68–77, Account vs Organization categories); Help accordion rows; Auth top-aligned single column (`login`, `signup`, `forgot-password`) with 48px fields, correct `autoComplete`; Admin: `AdminSidebar` → `Sheet` drawer under `mob:`, tables keep `overflow-x-auto`.

---

## Phase 5 — Motion  *(commit: `feat(mobile): motion system`)*
Read `references/motion.md`. Verify/implement: M2 push + M1 fade via `PageTransition`; M3 sheets (drag 1:1, thresholds 25% / 0.5px per ms); M4 rise (first mount only); M5 `press` on tiles/cards; M6 segmented indicator; M7 `rf-draw` on success icons (toast + payment/sale success); M8 count bump on cart badge and selected count; M9 row collapse on delete/remove; M10 toast; M11 search morph; M12 tab indicators. Replace remaining `transition-all` (203) in files you touched with explicit property lists. Reduced motion verified via DevTools emulation. Optional: `navigator.vibrate?.(8)` on add-to-cart / qty step behind an Appearance toggle.

---

## Phase 6 — Cleanup  *(commit: `refactor(mobile): remove legacy mobile styles`)*
- Remove now-unused `.mobile-*` helpers and any dead mobile-drawer code; delete duplicated `md:hidden` card lists replaced by `DataTable`.
- `grep -rn "window.innerWidth" src` → 0 (use `useMediaQuery`).
- Remove `MobileHeader` props that were never passed, once no consumer exists.

---

## Phase 7 — Verify  *(commit: `chore(mobile): verification fixes`)*
```bash
npx tsc --noEmit && npm run lint && npm run build
# gates — expect 0
grep -rnE "h-screen|min-h-screen|100vh" src --include=*.tsx --include=*.css | wc -l
grep -rnE "max-h-\[[0-9]+vh\]" src --include=*.tsx | wc -l
grep -rnE "opacity-0 group-hover:opacity-100" src --include=*.tsx | grep -v "touch:opacity-100" | wc -l
grep -rnE "window\.innerWidth" src --include=*.tsx --include=*.ts | wc -l
grep -rnE "fixed inset-0.*items-center justify-center" src --include=*.tsx | grep -v "components/ui/Sheet.tsx" | wc -l
grep -rnE "text-\[(8|9|10|11)px\]" src --include=*.tsx | wc -l
```
- Run `assets/tests/mobile-primitives.test.tsx` (`npm i -D jsdom tsx`; copy to repo root; `npx tsx mobile-primitives.test.tsx` → 20 passed).
- Run the DevTools audits from `references/testing.md` (horizontal overflow, touch targets < 44px, inputs < 16px) on: `/`, `/invoices`, `/invoices/new`, `/invoices/[id]`, `/pos`, `/customers`, `/products`, `/ledger`, `/settings`, `/s/<store>`; expect 0.
- Matrix: 320×568, 360×800, 390×844, 430×932, 844×390 (landscape), 768×1024, 1024×768, 1440×900; light + dark; 200% text zoom.
- **On real devices (required, not optional):** one iPhone (Safari + installed PWA) and one mid-range Android (Chrome + the Capacitor app). Run the ten flow scripts in `references/testing.md`, especially: keyboard over the sticky bar (iOS), Android hardware Back closing sheets before navigating, `env(safe-area-inset-*)` non-zero on Android 15+ (if zero, add a 24px top fallback and report), rotate mid-form, offline create-then-sync.
- PDF/print output unchanged.

## Definition of done
- Every screen usable one-handed at 360px with no horizontal page scroll; tables are lists; modals are sheets; nothing hover-only; inputs never zoom iOS; safe areas respected; keyboard never hides the primary action; Back closes overlays first.
- Shell switches on `desk:`/`mob:`; tablets get the rail; landscape phones keep the mobile shell.
- Motion matches `motion.md`; reduced-motion honoured.
- `tsc`, `lint` (no new findings), `build` pass; all gates 0; device checks recorded.
- Final message: changelog by phase, gate results, device-test results, list of `TODO(mobile)` items, and flagged housekeeping (`appName: 'Inflow'`, manifest icon `purpose`, status-bar colours).
