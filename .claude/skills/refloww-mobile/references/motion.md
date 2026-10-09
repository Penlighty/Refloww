# Mobile motion spec

Principle: **motion explains where things came from and where they went — nothing else.** Gestures are 1:1 with the finger; transitions are short, settled, and never block the next tap. Everything respects `prefers-reduced-motion`. Builds on the tokens in `refloww-design/references/motion.md` (`--ease-settle`, `--ease-sheet`, `--ease-exit`).

## Tokens

| Token | Value | Use |
|---|---|---|
| `--ease-settle` | `cubic-bezier(0.2, 0.7, 0.2, 1)` | default: fast start, soft landing |
| `--ease-sheet` | `cubic-bezier(0.32, 0.72, 0, 1)` | sheets, drawers, snap-back |
| `--ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | things leaving |
| 90ms | press feedback |
| 120–160ms | fades, colour, header hairline, tab bar hide |
| 200–240ms | indicators, push, toasts, segmented |
| 320ms | sheet enter, snap-back |
| exit ≈ 70% of enter | sheets 220ms |

Allowed properties: `transform`, `opacity`, colours, `stroke-dashoffset`, (`clip-path` in the header search morph, `grid-template-rows` for row collapse). Never `height/width/top/left`, `filter`, `backdrop-filter`.

## Named patterns

| ID | Name | Spec | Where |
|---|---|---|---|
| **M1** | Fade | opacity 0→1, 140ms ease-out | root route change, skeleton→content (160ms), tab content |
| **M2** | Push | from `translate3d(20px,0,0)` + opacity 0 → rest, 240ms settle, **mobile only**; pops (Back) just fade (M1) because direction isn't known | list → detail, → new/edit (`PageTransition` + `.rf-page-push`) |
| **M3** | Sheet | enter 320ms `--ease-sheet` (translateY 100%→0) + scrim 0→1 200ms; exit 220ms `--ease-exit`; **drag follows finger 1:1** (grabber + header only), upward drag rubber-bands (×0.25, max 24px); release: dismiss if dragged > 25% of height **or** flick > 0.5px/ms downward, else snap back 320ms; scrim fades with progress (to 20% at full drag). ≥ md: centred dialog, 8px rise + scale .985→1 + fade, 220ms | `Sheet` (all overlays) |
| **M4** | Rise | translateY 8px→0 + fade, 220ms settle; stagger 40ms; **max 4 blocks, first mount only** | dashboard blocks, detail panels |
| **M5** | Press | tiles/cards `scale(.97)` 90ms (`press`); buttons `scale(.985)`; list rows `active:bg-paper-2` instantly, release 120ms | tiles, quick actions, product cards |
| **M6** | Segmented | indicator `translateX` 200–220ms settle; panel cross-fade 120ms with 8px offset toward the travel direction | POS Products/Cart, customer detail tabs, theme |
| **M7** | Draw-on | icon accent stroke draws 360ms (`.rf-draw`); affected row tints `success-tint` → transparent over 600ms | save success, payment recorded, sale complete |
| **M8** | Count bump | badge/number `scale 1→1.12→1`, 160ms; decreasing numbers cross-fade 120ms | cart count, amount due, selected count |
| **M9** | Row collapse | row fades 120ms, then `grid-template-rows: 1fr→0fr` 180ms; list closes the gap | delete, remove from cart |
| **M10** | Toast | in 240ms (translateY 12px + fade); out 160ms; swipe-down dismiss if > 40px or > 0.4px/ms; undo toasts 5s, others 4s | `SwipeableToaster` |
| **M11** | Header search morph | title fades out 90ms; search field revealed by `clip-path: inset(0 0 0 70%) → inset(0)` 220ms settle (no text distortion); Cancel fades in 120ms; reverse on close | `MobileHeader` search |
| **M12** | Tab indicator | single element slides (`translateX` + `scaleX`) 200–220ms settle; active tab scrolls into view | tab bar (top line), section tabs (underline) |

## Keyboard & viewport events

- Text field focus → tab bar slides down 160ms (CSS `:has`), `StickyActionBar` rides the keyboard **without animation** (it follows `visualViewport` 1:1), sheets lift by the inset instantly (matches native feel).
- Rotation / resize: no animation; layout re-flows. Sheets re-measure height.
- Header hairline: border colour 160ms once `scrollTop > 4` (IntersectionObserver sentinel).

## Navigation choreography

| Action | What moves |
|---|---|
| Tab bar switch | Indicator slides (M12); page content M1; no horizontal slide between tabs |
| List → detail | Detail pushes in (M2); list stays put underneath (no parallax) |
| Detail → Back | Header back or system Back; content M1 (fade) |
| Open Sheet from detail | M3; underlying page doesn't scale/dim beyond the scrim |
| Sheet → navigate | Sheet exits (M3) then route M2 starts after 120ms (use `startTransition`/`setTimeout`) |
| Save success | M7 on toast icon; `router.replace` → M1; toast M10 |

## Haptics (optional, progressive)

`navigator.vibrate?.(8)` (Android only, guarded) on: add to cart, quantity step, selection-mode enter (16ms), sale complete (24ms). Never on scroll, navigation or error spam. Setting "Haptics" in Appearance (default on). `@capacitor/haptics` is not installed — add only if you want iOS parity in the native shell.

## Reduced motion

| Normal | Reduced |
|---|---|
| M2 push / M4 rise | M1 fade only (or none) |
| M3 sheet slide | opacity 0→1 over 120ms, no translate; drag-dismiss still works |
| M6, M12 slides | indicator jumps; content swaps instantly |
| M7 draw-on, M8 bump | static final state |
| Spinner | slower (2.4s) |
Implemented with `@media (prefers-reduced-motion: reduce)` in `globals-mobile.css` and `usePrefersReducedMotion()` in `Sheet`.

## Performance guardrails

- Only `Sheet` panels use `will-change: transform`.
- One animating layer at a time on low-end devices: don't run M4 stagger while a sheet is animating.
- Stagger only the first 4 items; later items appear with the group.
- Skeletons use a static fill with opacity pulse (`animate-pulse`), shown only after 300ms.
- Never animate list virtualised rows on scroll.

## Don'ts

Bounce/spring overshoot · parallax · big blurs/glass · animated gradients · shimmer sweeps · auto-play carousels · entrance animations on every re-render · sliding between bottom tabs · full-screen takeover transitions for small tasks (use a Sheet).
