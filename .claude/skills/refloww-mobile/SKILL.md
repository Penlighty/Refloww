---
name: refloww-mobile
description: Mobile-first responsive system for Refloww (Next.js 16 / React 19 / Tailwind v4 + Capacitor Android + PWA). Use whenever building, fixing, reviewing or testing ANY Refloww screen for phones and tablets — layouts, tables → lists, forms, modals → bottom sheets, bottom tab bar, mobile header, safe areas / notches, dynamic viewport height, on-screen keyboard, touch targets, iOS input zoom, hover-only actions, gestures, page transitions, mobile animation, Android back button, landscape — or when asked to make the app "fully mobile responsive", "feel native on mobile", or "work effortlessly on a phone". Includes tested reference code (Sheet, DataTable, StickyActionBar, hooks, CSS layer), exact per-screen mobile flows, motion specs and a QA matrix. Extends the refloww-design skill (tokens, icons, motion).
---

# Refloww Mobile

Refloww is used on phones in shops, markets and on the move — often one-handed, on mid-range Android, with patchy data. **Mobile is a primary surface, not a squeezed desktop.** Same data model and vocabulary everywhere; different layout, ergonomics and motion per device class.

This skill extends `refloww-design` (tokens `paper/ink/line`, radii, icons, type scale, motion tokens). Do the design-system tokens first; this layer builds on them.

## The 14 mobile rules

1. **One shell switch.** Mobile shell (top bar + bottom tab bar) vs desktop shell (sidebar + header) switches at **≥768px wide AND ≥500px tall** (`desk:` / `mob:` variants, `useIsDesktopShell`). Phones in landscape stay mobile. Content layout uses ordinary `sm/md/lg` breakpoints.
2. **Never `100vh`.** Use `h-dvh` / `min-h-dvh` / `100dvh`. `100vh` includes the browser toolbar on mobile and clips the bottom bar. (The app currently has 44 `vh`-based occurrences — 18 `h-screen`-family, 5 `100vh`, 21 arbitrary/inline like `max-h-[85vh]` — and zero `dvh`.)
3. **Safe areas are real.** `viewportFit: 'cover'` in `layout.tsx`; header gets `pt-safe`, tab bar and sticky bars get `pb-safe`; landscape gets `px-safe`. Classes `safe-area-pt/pb` already in the markup must have CSS behind them.
4. **Inputs ≥16px on touch.** Root is 14px, so `text-xs/sm` inputs are 10.5/12.25px and iOS zooms the page on focus. The global coarse-pointer rule enforces 16px; never undo it with per-field `text-xs`.
5. **44px touch targets**, 8px between neighbours. Icon buttons are `size-11` on mobile (`md:size-9`). Visible glyph may be smaller than the hit area.
6. **Nothing is hover-only.** Tailwind v4 applies `hover:`/`group-hover:` only where hover exists, so `opacity-0 group-hover:opacity-100` is *unreachable on a phone* (16 such sites today). Use `touch:opacity-100` + `group-focus-within`, or put the action in the row's `⋯` menu.
7. **Tables become lists.** Every `<table>` has a designed mobile row via `DataTable` (title / subtitle / meta / trailing amount). No horizontal-scroll tables as the mobile solution, except admin.
8. **Modals become bottom sheets.** One primitive: `Sheet` (grabber, drag-to-dismiss, safe-area, keyboard-aware, Back closes it). No centred modals on phones.
9. **Forms: one column, one thumb.** Label above, 44px fields, right keyboard (`inputMode`, `type`, `autoComplete`, `enterKeyHint`), primary action in a `StickyActionBar` (shows the running total), tab bar hidden while editing.
10. **Primary action lives where the thumb is.** Bottom for commit actions (Save, Charge, Send). Header-right for *navigation-level* actions (New, Search, ⋯). **No floating action buttons** — one bottom bar or header action per screen.
11. **Back always works.** Header back on every pushed screen; system Back (Android hardware, iOS swipe in standalone) closes the top overlay first, then navigates. Guard unsaved forms with a "Discard changes?" sheet.
12. **Motion is physical and short.** Sheets follow the finger 1:1; pushes slide 20px/240ms; everything else fades 140ms. Transform/opacity only. Reduced motion → no movement. Specs in `references/motion.md`.
13. **Realtime beats refresh.** Data syncs via Firestore listeners — no pull-to-refresh. Show sync state as a small header `Tag`, never a blocking banner.
14. **Test on glass.** 360, 390, 430, 568-landscape, 768 portrait, 1024. iOS Safari, Android Chrome, Android WebView (Capacitor), installed PWA. See `references/testing.md`.

## Breakpoint contract

| Range | Shell | Navigation | Content |
|---|---|---|---|
| < 640 (phone) | mobile shell | top bar + tab bar (+ section tabs) | 1 column, lists, sheets, sticky bars |
| 640–767 / landscape phone | mobile shell | same; slimmer chrome (`--header-h:44`, `--nav-h:44+safe`) | 2-col grids allowed |
| 768–1023, height ≥500 (tablet portrait) | desktop shell, **sidebar as 72px rail** | rail + header | ≤2 columns; `hideBelow="lg"` columns hidden |
| ≥ 1024 | desktop shell, full 256px sidebar | sidebar + header | multi-column, tables, side panels |

Variables (from `globals-mobile.css`): `--safe-*`, `--header-h`, `--subnav-h`, `--nav-h` (includes home-indicator inset; `0` on desktop and on immersive routes), `--kb`-free keyboard handling via `useKeyboardInset`.

## Workflow for any screen

1. Classify it in `references/screens.md` (root list / detail / form / immersive tool / public page) → gets its header variant, nav behaviour, primary action and motion.
2. Build mobile first: single column, then add `md:`/`lg:` enhancements. Don't hide critical info below `md`.
3. Compose from: `DataTable`, `Sheet`, `StickyActionBar`, `usePageHeader`, `PageTransition` (assets/). Don't reinvent overlays or bottom bars.
4. Check against `references/patterns.md` (forms, filters, selects, steppers, lists) and `references/motion.md`.
5. Run the checklist below and the QA matrix.

## Pre-ship checklist

- [ ] No `h-screen`/`min-h-screen`/`100vh`; no horizontal page scroll at 320px (run the overflow snippet)
- [ ] Safe areas: notch, home indicator, landscape side insets
- [ ] Every input ≥16px on touch; right `type` / `inputMode` / `autoComplete` / `enterKeyHint`
- [ ] Every control ≥44×44; nothing hover-only; long text truncates, money never wraps (`whitespace-nowrap`)
- [ ] Table → DataTable; modal → Sheet; dropdown → native `<select>` or Sheet on touch
- [ ] Keyboard open: focused field visible, action bar above keyboard, tab bar hidden
- [ ] Back: header back, system Back closes overlay, discard guard on dirty forms
- [ ] Loading skeleton matches layout; empty state has one action; errors inline with retry
- [ ] Motion matches spec; reduced-motion respected; no animation on every re-render
- [ ] Verified in light + dark, portrait + landscape, 200% text zoom, slow 3G, offline

## References and assets

- `references/audit.md` — what the codebase does today on mobile (counts + file anchors)
- `references/foundations.md` — viewport, units, safe areas, scroll model, keyboard, input rules, touch, tablet
- `references/shell-and-navigation.md` — AppShell structure, MobileHeader contract, tab bar, section tabs, More sheet, back behaviour
- `references/patterns.md` — responsive patterns with code: DataTable, forms, filters, selects, steppers, lists, charts, images
- `references/screens.md` — exact mobile flow for every screen
- `references/motion.md` — mobile animation spec (durations, curves, gestures, thresholds)
- `references/testing.md` — device matrix, audit snippets, QA script
- `assets/` — tested reference code: `src/lib/hooks/{useMediaQuery,useKeyboardInset,useOverlayHistory}.ts`, `src/components/ui/{Sheet,DataTable,StickyActionBar}.tsx`, `src/components/mobile/{PageHeaderContext,PageTransition}.tsx`, `styles/globals-mobile.css`, `tests/mobile-primitives.test.tsx`
