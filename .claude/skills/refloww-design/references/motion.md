# Motion

Refloww motion should feel like paper being placed on a desk: quick, settled, no overshoot.

## Tokens

```css
@theme {
  --ease-settle: cubic-bezier(0.2, 0.7, 0.2, 1);   /* default: fast out, soft landing */
  --ease-sheet:  cubic-bezier(0.32, 0.72, 0, 1);   /* sheets / drawers */
  --ease-exit:   cubic-bezier(0.4, 0, 1, 1);       /* things leaving */

  --animate-rise:     rise 220ms var(--ease-settle) both;
  --animate-fade:     fade 160ms ease-out both;
  --animate-pop:      pop 160ms var(--ease-settle) both;
  --animate-sheet-in: sheet-in 320ms var(--ease-sheet) both;
  --animate-modal-in: modal-in 220ms var(--ease-settle) both;
  --animate-toast-in: toast-in 240ms var(--ease-settle) both;
  --animate-hold:     hold 1.6s ease-in-out infinite;   /* skeleton */

  @keyframes rise      { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  @keyframes fade      { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pop       { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: none; } }
  @keyframes sheet-in  { from { transform: translateY(100%); } to { transform: none; } }
  @keyframes modal-in  { from { opacity: 0; transform: translateY(8px) scale(0.985); } to { opacity: 1; transform: none; } }
  @keyframes toast-in  { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
  @keyframes hold      { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 1ms !important; animation-iteration-count: 1 !important; transition-duration: 1ms !important; scroll-behavior: auto !important; }
}
```

| Purpose | Duration |
|---|---|
| Press feedback | 90ms |
| Hover / colour / focus | 160ms |
| Enter (modal, menu, toast, rise) | 220–240ms |
| Sheet / drawer / sidebar | 320ms |
| Exit | ~70% of enter |

## Rules

1. Animate only `transform`, `opacity`, colour properties, `stroke-dashoffset`. Never layout (`height/width/top`) except the row-collapse below.
2. Replace every `transition-all` with an explicit list: `transition-[color,background-color,border-color,opacity,transform] duration-150 ease-settle`.
3. No bounce, no overshoot, no looping decoration. Loops allowed: spinner, skeleton hold.
4. Exit is faster than enter. Dismissals never wait on an animation to be actionable.
5. Reduced motion = state changes happen, movement doesn't.

## Patterns

**Press** — buttons/tiles: `active:scale-[0.985]` + background step. Mobile tiles `active:scale-[0.97]`.

**Page entrance** — dashboard & detail screens: blocks use `animate-rise` with `animationDelay = index * 40ms`, **max 4 blocks**, only on first mount (not on tab switches or store updates).

**List rows** — new rows `animate-fade`; no per-row stagger for lists >6. Delete: row fades 120ms then collapses (`grid-template-rows: 1fr → 0fr`, 180ms) and the list closes the gap.

**Modal** — scrim fades 160ms; panel `animate-modal-in`. Mobile: `animate-sheet-in` bottom sheet with grabber; drag-to-dismiss follows the finger 1:1, settles with `--ease-sheet`.

**Menus/popovers** — `animate-pop` with `transform-origin` at the trigger. 160ms.

**Toasts** — `animate-toast-in`; bottom-centre on mobile (above bottom nav), bottom-right desktop; 4s, pause on hover; swipe-away already exists in `SwipeableToaster`.

**Tabs** — the 2px orange indicator slides (`transform: translateX` + `scaleX`, 220ms settle). Panel content cross-fades 120ms; no slide.

**Sidebar collapse** — width 232 → 64 over 320ms `--ease-sheet`; labels fade out first (100ms) so text never reflows mid-motion.

**Numbers** — hero metric counts up once (600ms, ease-out) on first mount; never on refresh. Skip when reduced motion.

**Loading** — skeletons shaped like the final content with `animate-hold` (no travelling shimmer gradient). Skeleton → content cross-fade 160ms. Buttons: spinner replaces the left icon in place (no width change).

**Success** — icon accent draws on (`.rf-draw`, 360ms) and the affected row briefly tints `success-tint` → transparent over 600ms. No confetti.

**Template editor (WYSIWYG)** — direct manipulation is never animated (drag, resize follow the pointer 1:1). Snap guides appear in 80ms as 1px `primary-500` lines. Selection handles are square 8px, `paper` fill, 1.5px `primary-500` stroke. Zoom changes ease 180ms.

**Route changes** — 120ms opacity fade on `main` only; nav/header never animate.

## Don'ts

`animate-bounce`, `animate-ping`, pulsing CTAs, parallax, auto-playing carousels, entrance animation on every card in a grid, hover lift (`-translate-y`) on cards, scale >1.02 on hover, blur transitions.
