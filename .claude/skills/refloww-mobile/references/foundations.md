# Foundations

Install order: `globals-mobile.css` → `layout.tsx` viewport → hooks → components.

## 1. Viewport (`src/app/layout.tsx`)

```ts
import type { Viewport } from 'next';
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',            // enables env(safe-area-inset-*)
  interactiveWidget: 'resizes-content', // Android: layout shrinks with the keyboard so fixed bars ride above it
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f5f3' },  // = --ground
    { media: '(prefers-color-scheme: dark)',  color: '#121519' },
  ],
};
```
Never set `maximumScale` / `userScalable=no` (accessibility). Keep existing `appleWebApp` metadata.

`<body>`: replace `h-screen` with `h-dvh`; keep `overflow-hidden` — the app scrolls inside `#app-scroll`.

## 2. Units

| Use | Don't |
|---|---|
| `h-dvh`, `min-h-dvh`, `max-h-[90dvh]` | `h-screen`, `min-h-screen`, `100vh`, `max-h-[85vh]` |
| `100dvh` for sheets, `100svh` for hero heights that must not jump | `vh` anywhere |
| `calc(100dvh - var(--header-h) - var(--safe-top))` for scroll areas | magic numbers like `calc(100vh-10rem)` (POS L~360) |

Media queries use the browser's 16px rem regardless of `html{font-size:14px}`; breakpoints are 640/768/1024/1280.

## 3. Safe areas

```
status bar / notch      → header: pt-safe, height var(--header-h)
home indicator          → tab bar: pb-safe, height var(--nav-h)  (includes the inset)
landscape cutouts       → shell wrapper: px-safe
bottom sheets / bars    → pb-[max(12px,var(--safe-bottom))]
```
Every fixed element touching an edge handles its inset. Floating things (toasts) sit at `bottom: calc(var(--nav-h) + 12px)`.

## 4. Scroll model

- `body` never scrolls: `h-dvh overflow-hidden`, `overscroll-behavior-y: none`.
- One scroll container per screen: `#app-scroll` (`flex-1 overflow-y-auto overscroll-contain pb-app md:pb-8`). Sheets/menus have their own `overscroll-contain`.
- Sticky section headers inside it: `sticky top-0 bg-ground z-10` (below the app header, which is outside the scroller).
- Restore scroll when returning to a list (store `scrollTop` per pathname in `sessionStorage`; restore after data renders).
- Tapping the active tab in the bottom bar scrolls `#app-scroll` to top (smooth, 240ms) — or pops to the section root if already at top.
- Horizontal scrollers (chips, tabs): `overflow-x-auto no-scrollbar snap-x snap-mandatory` with `snap-start` children and `scroll-px-4`; always edge-padded so the first/last item aligns with the gutter.

## 5. Keyboard

- Android (`resizes-content`): layout shrinks; fixed bars follow automatically.
- iOS: `useKeyboardInset()` returns the covered height; `StickyActionBar` and `Sheet` lift by it.
- Tab bar hides while a text field is focused (CSS `:has`, in `globals-mobile.css`).
- On focus, scroll the field into view with margin: `el.scrollIntoView({ block: 'center', behavior: 'smooth' })` for long forms (delay ~250ms so the keyboard animation has started).
- `enterKeyHint`: `next` between fields, `done`/`go` on the last, `search` on search boxes. Enter on a single-line field moves to the next field; never submits a long form accidentally.

## 6. Form controls on touch

| Field | Attributes |
|---|---|
| Money / quantity (decimals) | `type="text" inputMode="decimal"` (avoids spinners and locale bugs), right-aligned `.money` |
| Whole numbers (stock, qty) | `inputMode="numeric" pattern="[0-9]*"` |
| Phone | `type="tel" autoComplete="tel"` |
| Email | `type="email" autoComplete="email" autoCapitalize="none"` |
| Names | `autoComplete="name" autoCapitalize="words"` |
| SKU / codes / discount codes | `autoCapitalize="characters" autoCorrect="off" spellCheck={false}` |
| Password | `autoComplete="current-password"` / `new-password`; show/hide toggle (44px) |
| Dates | native `type="date"` on touch; custom picker only ≥ md |
| Selects | native `<select>` on touch (OS picker); custom listbox ≥ md; ≥ 8 options with search → `Sheet` |
| Search | `type="search" enterKeyHint="search"`, clear button 44px |

Heights: fields `h-11` (44px) on mobile, `md:h-10`. Labels above, `text-caption`. Error text below with an icon; scroll to first error on submit.

## 7. Touch & pointer

- Targets ≥44×44 (`tap-44`); spacing ≥8px. Whole row is the tap target for list items.
- `touch-action: manipulation` on interactive elements (in CSS layer) removes double-tap zoom.
- Gestures use **Pointer Events** (`onPointerDown/Move/Up` + `setPointerCapture`) with `touch-action: none` only on the draggable surface — never on scroll containers.
- Active states, not hover: `active:bg-paper-2`, `active:scale-[0.97]` (`press` utility). Remove tap highlight (done in CSS).
- Long-press (500ms) = selection mode in lists; always provide a visible alternative (checkbox in the `⋯` menu).
- Respect `pointer: coarse` for density: larger rows, bigger steppers.

## 8. Tablet (768–1023)

- Desktop shell with **sidebar rail** (72px, icons + tooltips); expands over content as an overlay on tap (not push).
- Content max-width 720–840 centred or 2 columns; `DataTable` hides `hideBelow="lg"` columns.
- Sheets open as centred dialogs (`md:`). Touch targets stay 44px (tablets are touch).

## 9. Landscape phone

Shell stays mobile; chrome slims (`--header-h:44`, `--nav-h:44+safe`); tab bar hides labels (`max-h-[499px]:sr-only` on labels); forms keep single column but action bar becomes inline at the end to save height; sheets `max-h-[calc(100dvh-var(--safe-top))]`; POS switches to two panes (products | cart) when width ≥ 640 and height < 500.

## 10. Performance on mid-range Android

- No `backdrop-filter`, no big `box-shadow` animations, no animating `height/width/top`.
- `will-change: transform` only on sheets/drawers while animating.
- Virtualise lists > 100 rows (e.g. `@tanstack/react-virtual`); paginate ledger/transactions at 50.
- Images: `loading="lazy"`, explicit `width/height` or `aspect-*` to prevent layout shift; thumbnails ≤ 60KB.
- Debounce search 200ms; avoid layout thrash in `onScroll` (use IntersectionObserver for header hairline).
