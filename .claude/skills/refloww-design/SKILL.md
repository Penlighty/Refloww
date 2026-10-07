---
name: refloww-design
description: Design language for Refloww — the Next.js 16 / React 19 / Tailwind v4 app for invoices, receipts, delivery notes, POS, ledger and storefront. Use whenever creating, restyling, reviewing or refactoring ANY Refloww UI (pages, components, nav, tables, modals, toasts, empty states, forms, template editor, dark mode), choosing colours / radii / shadows / type sizes / motion, adding or swapping an icon, or when asked to make the app feel more premium, professional, consistent, intentional or less "AI-generated / vibe-coded". Gives tokens, component recipes, motion rules, the custom icon set, and a pre-ship checklist.
---

# Refloww Design

Refloww helps small businesses (largely Nigerian — ₦, Paystack/Monnify) produce trustworthy financial documents. The interface should feel like a **well-kept ledger desk**, not a SaaS template.

## Concept: Paper & Ink

| Idea | In the UI |
|---|---|
| **Paper** | Surfaces are flat white sheets on a quiet warm-grey ground. Separation comes from 1px hairlines and whitespace, not shadow or colour blocks. |
| **Ink** | Text is charcoal ink. One muted tone for secondary text. Numbers are tabular and right-aligned, like a ledger column. |
| **Stamp** | Brand orange `#fc6d2d` is the *stamp*: used sparingly — one primary action per view, the active-nav mark, the focus ring, the icon accent. If everything is orange, nothing is. |
| **Rule** | Dashed hairlines divide totals from line items. Document status reads like a small printed mark, not a candy pill. |

Personality: calm, exact, warm. Never loud, never "magical", never playful-bouncy.

## The 12 rules

1. **Tokens, not hex.** Use `bg-paper`, `border-line`, `text-ink`, `bg-primary-500`. Never write `[#fc6d2d]`, `[#2d3748]`, `neutral-*` pairs with `dark:` (see `references/tokens.md`; surfaces are theme-aware so `dark:` is rarely needed).
2. **Three radii + pill.** Control `rounded-ctl` (10), panel `rounded-panel` (14), sheet `rounded-sheet` (22). Tags use `rounded-tag` (6). `rounded-full` only for avatars, switches, dots. No `rounded-xl/2xl/3xl/lg` in new code.
3. **Flat by default.** Panels have a border, no shadow. Only floating layers get `shadow-pop` (menus, popovers) or `shadow-sheet` (modals, sheets). No `shadow-sm/md/lg/xl/2xl`.
4. **No gradients, no backdrop blur.** Solid colours only. (Brand logo excepted.) Overlays are flat ink at 40%.
5. **One orange action per view.** Everything else is secondary/ghost. Orange text uses `text-primary-text` (`#c33b09`) — raw orange on white fails contrast (2.85:1).
6. **Primary button label is warm black, not white.** White on `#fc6d2d` is 2.85:1 (fails WCAG AA); warm black `#1a1410` is 6.4:1 and looks like an inked stamp. See `components.md`.
7. **Type scale, no pixel hacks.** The root is 14px, so Tailwind's `text-xs/sm` are tiny. Use `text-micro / caption / body / lead / title / headline / metric`. Minimum 11px. No `text-[10px]`, no `font-extrabold/black`. Weights: 400 / 500 / 600.
8. **Sentence-case labels.** `UPPERCASE TRACKING-WIDER` is reserved for table column headers (`.th`). Everywhere else: sentence case, `text-caption text-ink-3`.
9. **Icons only from `@/components/icons`.** Custom set, 24 grid, 1.75 stroke, one accent. Sizes 14/16/20/24/32. No emoji as icons, no mixed libraries, no per-instance `strokeWidth` (`weight` prop only). See `references/icons.md`.
10. **Motion is quiet and purposeful.** Animate only `transform`, `opacity`, colour and the icon accent. 90 / 160 / 220 / 320 ms. Never `transition-all`. No bounce, no spring overshoot. Respect `prefers-reduced-motion`. See `references/motion.md`.
11. **Money is typographic.** `.money` (tabular-nums), right-aligned, currency symbol lighter than digits, negative values with a true minus and `text-danger-700`. Never colour an amount green/red just to be lively.
12. **Calm density.** 4px grid. Rows 52px (desktop) / 56px (mobile). Touch targets ≥44px on mobile. One level of containment — never a card inside a card.

## Workflow

1. **Identify the screen type** → open `references/screens.md` for its composition.
2. **Compose from existing parts** → `references/components.md` has recipes for every primitive in `src/components/ui`. Extend those components; don't create parallel ones.
3. **Pull tokens** → `references/tokens.md`. If a value isn't a token, it probably shouldn't exist.
4. **Icons** → `references/icons.md` (name mapping for every nav item, status, document type).
5. **Motion** → `references/motion.md`. Budget: at most one entrance animation per screen region, staggered ≤6 items.
6. **Check dark mode** by eye. Dark is designed (lower-contrast lines, no pure black, orange text lightened), not inverted.
7. **Run the checklist below** and `references/audit.md` anti-patterns before finishing.

## Pre-ship checklist

- [ ] No hex literals, no `neutral-*`/`gray-*` pairs, no `dark:` for plain surfaces
- [ ] Radii ∈ {ctl, panel, sheet, tag, full}; no shadow on static panels; no gradient; no blur
- [ ] Exactly one primary (orange) action visible; icon-only buttons have `aria-label` + tooltip
- [ ] All icons from `@/components/icons`; sizes on the 14/16/20/24/32 scale; no emoji
- [ ] Text ≥11px; contrast ≥4.5:1 (use `text-ink-3` not lighter greys for text)
- [ ] Money uses `.money`, right-aligned; labels sentence case
- [ ] Loading = skeleton shaped like the content; empty = icon tile + one sentence + one action; error = inline, specific, actionable
- [ ] Hover, focus-visible, active, disabled, loading all designed; keyboard focus ring visible
- [ ] Mobile: 44px targets, safe-area padding, bottom sheet instead of centred modal
- [ ] Motion uses tokens; reduced-motion respected; nothing animates on every re-render
- [ ] Copy: short, concrete, no exclamation marks, no "Oops", names the object ("Invoice INV-0042 saved")

## Reference files

- `references/tokens.md` — paste-ready `@theme`, light/dark variables, type scale, utilities, fonts
- `references/components.md` — Button, Input, Panel, PageHeader, StatBand, Tag, Table/Rows, Sidebar, BottomNav, Modal/Sheet, Toast, Tabs, EmptyState, Skeleton, Menu, Document canvas
- `references/motion.md` — durations, easings, keyframes, patterns, reduced motion
- `references/icons.md` — the custom icon system, sizes, accent rules, name mapping
- `references/screens.md` — composition for each route in the app
- `references/audit.md` — what the current code does (with counts), what to replace, banned patterns
