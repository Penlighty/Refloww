# Mobile audit — what the code does today

Measured on `Penlighty/Refloww` (122 `.tsx` files). Every row is a verified finding with an anchor.

## Critical (break real usage)

| # | Finding | Evidence | Effect on phones | Fix |
|---|---|---|---|---|
| 1 | **Hover-only actions** | 16 hover-reveal sites (14× exact `opacity-0 group-hover:opacity-100`, plus `group-hover:visible/block/flex` variants) among 75 `group-hover:` uses. Tailwind 4.1 compiles `hover:`/`group-hover:` inside `@media (hover: hover)` (verified) | Row actions never appear on touch → edit/delete unreachable | `touch:` variant + `group-focus-within`; or `⋯` menu |
| 2 | **Inputs under 16px** | Inputs are `text-xs` (10.5px) / `text-sm` (12.25px) because `html{font-size:14px}`; no 16px rule | iOS Safari zooms the page on every field focus and doesn't zoom back | Coarse-pointer 16px rule (`globals-mobile.css`) |
| 3 | **`100vh` layouts** | 44 `vh`-based occurrences: `h-screen` family 18 (11 of them `min-h-screen`), `100vh` 5, arbitrary/inline `[N]vh` 21; **`dvh` 0**. `body` and `AppShell` are `h-screen overflow-hidden` | Bottom bar/buttons clipped under the browser toolbar; jumps as the toolbar collapses | `h-dvh`, `min-h-dvh`, `100dvh` |
| 4 | **Safe areas inert** | `viewport` export has no `viewportFit: 'cover'` → `env(safe-area-inset-*)` = 0. `safe-area-pt`/`safe-area-pb` are used in `MobileHeader`/`MobileBottomNav` but **no CSS defines them**. Also `globals.css:594` `html, body { padding-top/bottom: env(safe-area-inset-*) }` — inert today, but **double-pads** once `viewport-fit=cover` is on | Header under the notch/status bar; tab bar over the home indicator | `viewportFit:'cover'` + define utilities + **delete the html/body rule** |
| 5 | **Tables with no mobile design** | 23 `<table>`s in 17 files. Only 5 files pair a table with a mobile list (`DocumentList`, `RecentTransactions`, `transactions/page`, `customers/page`, and 1 of 4 tables in `products/page`). **No mobile alternative:** `LedgerTable`, `CustomerDetailClient`, `TransactionDetailModal`, `ProductDetailClient`, `discounts/page`, `storefront/page`, `templates/page` (verify), 3 of 4 in `products/page`. **No overflow wrapper at all:** `CustomerDetailClient`, `TransactionDetailModal` | Page-level horizontal overflow, squashed columns | `DataTable` (admin's 5 tables keep `overflow-x-auto`) |
| 6 | **Dead header actions** | `<MobileHeader/>` is mounted once in `AppShell` with **no props**; `onSave`, `onFilter`, `onMore`, `isSubmitting`, `title` are unreachable | Creation-variant Save never renders; titles are generic | `PageHeaderContext` + `usePageHeader` |
| 7 | **Undefined helper classes** | `no-scrollbar` (tab strips), `custom-scrollbar` (modals) have no CSS | Visible scrollbars on tab strips; unstyled scroll areas | Define in `globals-mobile.css` |

## Structural

| # | Finding | Evidence | Fix |
|---|---|---|---|
| 8 | Guessed clearance for fixed bar | `<main>` uses `pb-36 sm:pb-40 md:pb-8`; FABs at `bottom-20`/`bottom-24` | `pb-app` + `--nav-h`; no FABs |
| 9 | Bottom nav ≠ system | `fixed`, `z-[80]`, blur + shadow; More sheet `min-h-[50vh] max-h-[85vh]`, no drag-dismiss, z-[150] | Tab bar `z-40`, solid, `Sheet` for More |
| 10 | Modal scroll lock leaks | `Modal` sets `body.overflow='hidden'`; `max-h-[85vh]`; no drag; no safe-area; bottom-sheet look exists but isn't gesture-driven | Replace with `Sheet` |
| 11 | Centred modals on phones | POS: 3× `fixed inset-0 z-[100] flex items-center justify-center` (L859/945/1191); 10 more across the app | `Sheet` |
| 12 | Section tabs hide labels | `MobileSubHeaderNav`: inactive tabs are icon-only, chips `py-1.5` (~32px) | Always show labels, 44px |
| 13 | Shell switch by width only | `md:` (768) toggles mobile/desktop; landscape phones (844×390) get the desktop sidebar | `desk:`/`mob:` variants |
| 14 | Tablet portrait cramped | `Sidebar` is `w-64` from 768px → ~500px content | Rail (72px) between 768–1023 |
| 15 | JS viewport reads | `window.innerWidth` in `Sidebar` (11 refs), `TemplateEditorClient` (6) — not reactive to rotation | `useMediaQuery` family |
| 16 | Mouse-only drags | `onMouseDown` 14×, `onTouchStart` 4× (Toast, editor canvas). Editor already has pinch/pan + touch field drag; other interactions (resize handles etc.) need verifying | Pointer Events + `touch-action` where mouse-only |
| 17 | Inconsistent dark greys | `#121620` (header, tab bar, sub-nav), `#161a24` (sheets/menus), `#0B0F19` (AppShell), `#121519` (StatusBar, themeColor); light status bar `#f8fafc` vs app bg `#F4F5F3` | Theme variables (`--ground`, `--paper`) |
| 18 | Back handling | `router.back()` appears in 2 files; overlays don't register with history | Header back + `useOverlayHistory` |
| 19 | Duplicate mobile/desktop chrome | Search + notifications implemented in both `Header.tsx` and `MobileHeader.tsx` | Shared components, two layouts |
| 20 | Tiny nav labels | Tab labels `text-[10px]` | ≥11px (`text-micro`) |

## Platform notes (Capacitor / PWA)

- Android app via Capacitor 8 + `@capacitor/status-bar` (set in `ThemeProvider.tsx`: `#121519` dark / `#f8fafc` light — differs from `--ground`). No `@capacitor/app` or keyboard plugin installed.
- Hardware Back works through WebView history by default, so `useOverlayHistory` needs no plugin. Add `@capacitor/app` only if you want "press back twice to exit".
- `capacitor.config.ts` still says `appId: com.inflow.app`, `appName: 'Inflow'` — stale name (housekeeping, not mobile layout).
- `manifest.ts`: 192px icon is `purpose: 'maskable'` only; `theme_color` single value.
- **Verify on a real Android 15+ device** that `env(safe-area-inset-*)` returns non-zero (edge-to-edge is enforced there); keep a minimum top padding fallback if not.

## What already works (keep)

- Mobile-specific shell exists (`MobileHeader`, `MobileBottomNav`, `MobileSubHeaderNav`), variants by pathname.
- `Modal` already adopts a bottom-sheet look on small screens; `SwipeableToaster` supports swipe-away.
- POS has Products/Cart toggle and a floating cart bar; `DocumentForm` stacks to one column and previews in an overlay.
- Template editor has real pinch-zoom/pan on the canvas and a mobile bottom drawer with safe-area padding.
- Lists with `md:hidden` card views exist for documents, customers, products (1 of 4 tables), transactions, recent activity.
