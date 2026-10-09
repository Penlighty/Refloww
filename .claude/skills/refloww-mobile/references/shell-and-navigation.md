# Shell & navigation

## 1. AppShell target structure (`src/components/AppShell.tsx`)

```tsx
const immersive = /\/(new|edit)(\/|$)/.test(pathname);          // forms + editor: tab bar hidden, action bar owns the bottom
const showSubNav = !immersive && hasSectionTabs(pathname);       // existing MobileSubHeaderNav logic

<PageHeaderProvider>
  <div data-immersive={immersive} className="flex h-dvh w-full flex-col overflow-hidden bg-ground text-ink">
    <AnnouncementBanner />                                       {/* 40px; takes pt-safe only when it is the first element */}

    <div className="desk:hidden">                                {/* ── mobile chrome ── */}
      <MobileHeader />                                           {/* pt-safe + h-[var(--header-h)] */}
      {showSubNav && <MobileSubHeaderNav />}                     {/* h-[var(--subnav-h)] */}
    </div>

    <div className="flex min-h-0 flex-1">
      <Sidebar className="mob:hidden" />                         {/* rail 72px at 768–1023, full 256px ≥1024 */}
      <main className="flex min-w-0 flex-1 flex-col">
        <Header className="mob:hidden" />
        <div id="app-scroll"
             className="flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-app px-safe
                        sm:px-6 desk:px-8 desk:pb-8">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
    </div>

    <MobileBottomNav />                                          {/* fixed, desk:hidden, hidden when [data-immersive=true] */}
  </div>
</PageHeaderProvider>
```
Rules: `h-dvh` not `h-screen`; the same `#app-scroll` is the only scroller; `immersive` also sets `--nav-h: 0` for descendants (CSS in `globals-mobile.css`). Replace the three hard-coded greys on the shell with `bg-ground` / `bg-paper`.

Add to the `<body>` in `layout.tsx`: `h-dvh` (was `h-screen`).

## 2. Sidebar (desktop shell only)

- ≥1024: 256px, current behaviour.
- 768–1023 (height ≥500): **rail**, 72px, icons + tooltips; tapping a group icon opens a flyout menu. If the user expands it, it overlays content (`shadow-pop`, scrim) rather than pushing.
- Read the breakpoint with `useMediaQuery('(min-width: 1024px)')` — not `window.innerWidth` (not reactive to rotation).
- Remove the legacy off-canvas mobile drawer path (`isMobileOpen`, `translate-x`) once the mobile shell fully replaces it; verify nothing calls `toggleMobile`.

## 3. MobileHeader contract

Height `--header-h` (52px; 44px landscape) + `pt-safe`. Solid `bg-paper`, hairline `border-b border-line` that fades in after the user scrolls (160ms) — drive it from an `IntersectionObserver` sentinel at the top of `#app-scroll`, not a scroll listener.

Pages declare their header with `usePageHeader` (see `assets/src/components/mobile/PageHeaderContext.tsx`). The header reads it via `usePageHeaderConfig()` and falls back to the pathname-derived variant.

| Variant | Used on | Left | Centre | Right (max 2) |
|---|---|---|---|---|
| `dashboard` | `/` | Org pill (opens org Sheet) | — | Search · Bell |
| `section` | Root lists: `/invoices`, `/receipts`, `/delivery-notes`, `/customers`, `/products`, `/transactions`, `/ledger`, `/templates`, `/discounts`, `/storefront`, `/analytics`, `/settings` | Page title (`font-heading text-title`) + optional count in `ink-3` | — | Search · **+ New** (primary, icon-only 44px) |
| `detail` | `…/[id]` | Back chevron (44px) | Title (truncate) + subtitle (status/number) | `⋯` (opens actions Sheet) |
| `creation` | `…/new`, `…/edit` | Back chevron (guarded when dirty) | Title | **Save** (text button, primary) — only if the form has no sticky bar of its own |

Rules
- At most **one primary** action in the header. If a screen has a `StickyActionBar`, the header shows no Save.
- Secondary actions are icon-only, 44×44, `aria-label`.
- Title never wraps; long titles truncate. Subtitles are one line.
- Search: tap → header morphs in place: title fades out (90ms), field expands from the right (220ms, `transform-origin: right`), `Cancel` text button appears; results list drops below as a panel (not a full-screen modal). `enterKeyHint="search"`; system Back / Esc closes it (register with `useOverlayHistory`).
- Bell → `Sheet height="tall"` (notification list, "Mark all read" in footer). Unread = 8px `primary-500` dot.
- Org pill → `Sheet` listing organisations with a `Check` on the active one.
- Share the logic with `Header.tsx` (search, notifications) via small shared components; the two headers differ in layout only.

## 4. Bottom tab bar (`MobileBottomNav.tsx`)

| Tab | Route | Also active on |
|---|---|---|
| Home | `/` | — |
| Sales (`Register`) | `/pos` | `/transactions` |
| Documents (`Documents`) | `/invoices` | receipts, delivery notes, templates, … (existing `isDocsActive`) |
| Business (`Briefcase`) | `/customers` | products, storefront, discounts, ledger, … (existing `isBusinessActive`) |
| More (`MoreHorizontal`) | opens Sheet | analytics, marketplace, settings, help |

Spec
- Container: `fixed inset-x-0 bottom-0 z-40 h-[var(--nav-h)] pb-safe bg-paper border-t border-line`, `data-bottom-nav`, **no blur, no shadow, no rounded floating pill**.
- Each tab: `flex-1`, min 44px tall (full bar height is the target), icon `size-[22px]`, label `text-micro` (11px), `text-ink-3`; active `text-ink` + icon `weight="bold"` + accent orange.
- Active indicator: 24×2px `bg-primary-500` rounded line on the tab's **top edge**; one element that slides between tabs (200ms, `--ease-settle`).
- Badges: 8px dot (`primary-500`) for overdue invoices / low stock — never numeric on the bar.
- Tapping the **active** tab: if the page is scrolled → scroll `#app-scroll` to top (240ms); else navigate to the section root.
- Hidden when: `[data-immersive='true']`, or a text field is focused (CSS `:has`). Slides down 160ms.
- Long-press **Documents** (500ms) → quick-create menu (New invoice / receipt / delivery note). Optional shortcut; the `+` in the section header is the visible route.
- Landscape (height < 500): labels `sr-only`, bar 44px.

### More sheet
`Sheet` (auto height): user row (avatar, name, org) → list rows 56px with icon, label, chevron: Analytics, Marketplace, Settings, Help, Appearance (Light/Dark/System segmented), Sign out (`text-danger-text`, separated). Close on navigation (already implemented via pathname effect). No blur scrim.

## 5. Section tabs (`MobileSubHeaderNav.tsx`)

- Replaces the sidebar's collapsible groups on mobile (Documents: Invoices · Receipts · Delivery notes · Templates; Business: Customers · Products · Storefront · Discounts · Ledger — keep the existing groups).
- Height `--subnav-h` (44px), sticky directly under the header, `bg-paper border-b border-line`, `overflow-x-auto no-scrollbar snap-x`.
- **All labels visible** (icons optional, 16px). Tab = `px-3 h-11 text-body`; active `text-ink font-medium`; inactive `text-ink-3`.
- Active underline: 2px `primary-500`, a single element that slides (transform + width) 220ms; the active tab scrolls into view (`scrollIntoView({inline:'center'})`).
- Counts: `text-micro money text-ink-3`.
- Hidden on immersive routes and detail pages.

## 6. Back, history and unsaved changes

| Situation | Behaviour |
|---|---|
| Pushed screen (detail/new/edit) | Header back chevron: `window.history.length > 1 ? router.back() : router.push(backHref)` |
| Overlay open (Sheet, search, drawer, lightbox) | System Back / Android hardware Back closes the top overlay first (`useOverlayHistory`, built into `Sheet`) |
| Tab root | Android Back leaves the app (WebView default). Optional: `@capacitor/app` for "press again to exit" |
| Dirty form, user taps back | `Sheet` "Discard changes?" — **Keep editing** (primary) / **Discard** (danger text). Also `beforeunload` for the web |
| Arrived by deep link (no history) | Back goes to `backHref` (section root) |
| After Save | `router.replace(detailUrl)` so Back doesn't return to the empty form |

## 7. Stacking order

`#app-scroll` 0 · section tabs 20 · header 30 · tab bar / sticky action bar 40 · dropdown/popover 50 · **sheet / modal 60** · toast 70. Remove the current `z-[80]` tab bar, `z-[100]` POS modals and `z-[150]` More sheet.

## 8. Public (customer-facing) surfaces

`/s/[storeSlug]` and the storefront catalog are *outside* the app shell: own light header (store name + cart), no tab bar, `pt-safe`/`pb-safe`, bottom "View cart" bar via `StickyActionBar aboveNav={false}`. Because `<body>` is `h-dvh overflow-hidden`, these routes must render their own scroll container (`h-dvh overflow-y-auto overscroll-contain`) — check how `app/s/[storeSlug]/page.tsx` is mounted relative to `AppShell` and don't rely on window scroll.
