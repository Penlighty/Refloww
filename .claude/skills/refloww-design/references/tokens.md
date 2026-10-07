# Tokens

**Already in `globals.css` and kept:** `--color-primary-50…950` (orange scale), `--color-charcoal-*`, `--color-success/warning/danger/info`, and the mobile tokens `--refloww-bg-app #f4f5f3`, `--refloww-surface-sec #f8f9f8`, `--refloww-divider #e7e9e8` — these equal the new `ground`, `paper-2`, `line`, so the new variables *consolidate* the mobile system rather than add a third one. After migrating, delete `.mobile-card`, `.fintech-card`, `.admin-*` and the `--refloww-*` aliases.

Paste into `src/app/globals.css`. Surfaces are **CSS variables swapped by `.dark`**, exposed to Tailwind with `@theme inline`, so `bg-paper border-line text-ink` works in both themes with no `dark:` pairs.

## 1. Theme variables

```css
:root {
  --paper: #ffffff;
  --paper-2: #f8f9f8;      /* sunken / hover */
  --ground: #f4f5f3;       /* app background */
  --desk: #ecefeb;         /* template editor + document preview backdrop */
  --line: #e7e9e8;         /* hairline */
  --line-strong: #d3d8d5;  /* inputs, emphasised dividers */
  --ink: #2d3748;          /* headings, primary text (= existing charcoal-900) */
  --ink-2: #4a5568;        /* body */
  --ink-3: #59616e;        /* secondary text (5.7:1 on ground) */
  --ink-4: #7b8591;        /* disabled, decorative — NEVER for readable text */
  --primary-text: #c33b09; /* orange as TEXT/link on light (5.3:1) */
  --on-primary: #1a1410;   /* label on orange (6.4:1) */
  --success-text: #0f7a4d; --success-tint: #e5f7ef;
  --warning-text: #8a5208; --warning-tint: #fff4dd;
  --danger-text:  #c4262b; --danger-tint:  #fdebec; --danger-solid: #c4262b;
  --info-text:    #2f5fd0; --info-tint:    #eaf0ff;
  --scrim: rgb(26 32 44 / 0.40);
}
.dark {
  --paper: #1a1e24; --paper-2: #1f242b; --ground: #121519; --desk: #0d0f12;   /* ground = existing --color-background-dark */
  --line: rgb(255 255 255 / 0.07); --line-strong: rgb(255 255 255 / 0.14);
  --ink: #e8ebf0; --ink-2: #c4cad4; --ink-3: #9aa4b2; --ink-4: #6b7684;
  --primary-text: #fe8855; --on-primary: #1a1410;
  --success-text: #4ad28f; --success-tint: rgb(22 168 107 / 0.14);
  --warning-text: #f2b24c; --warning-tint: rgb(217 144 32 / 0.16);
  --danger-text:  #ff7b80; --danger-tint:  rgb(229 72 77 / 0.16); --danger-solid: #e5484d;
  --info-text:    #8aa9ff; --info-tint:    rgb(75 123 236 / 0.16);
  --scrim: rgb(0 0 0 / 0.55);
}
```

## 2. `@theme` additions (keep the existing `--color-primary-*` scale)

```css
@theme inline {
  --color-paper: var(--paper);        --color-paper-2: var(--paper-2);
  --color-ground: var(--ground);      --color-desk: var(--desk);
  --color-line: var(--line);          --color-line-strong: var(--line-strong);
  --color-ink: var(--ink);            --color-ink-2: var(--ink-2);
  --color-ink-3: var(--ink-3);        --color-ink-4: var(--ink-4);
  --color-primary-text: var(--primary-text);
  --color-on-primary: var(--on-primary);
  --color-success-text: var(--success-text); --color-success-tint: var(--success-tint);
  --color-warning-text: var(--warning-text); --color-warning-tint: var(--warning-tint);
  --color-danger-text: var(--danger-text);   --color-danger-tint: var(--danger-tint);
  --color-danger-solid: var(--danger-solid);
  --color-info-text: var(--info-text);       --color-info-tint: var(--info-tint);
  --color-scrim: var(--scrim);
}

@theme {
  /* Radii: control / panel / sheet / tag. rounded-full stays for avatars + switches. */
  --radius-ctl: 10px;
  --radius-panel: 14px;
  --radius-sheet: 22px;
  --radius-tag: 6px;

  /* Elevation: only floating layers. Static panels use a border. */
  --shadow-pop: 0 1px 0 rgb(20 24 31 / 0.04), 0 12px 28px -12px rgb(20 24 31 / 0.22);
  --shadow-sheet: 0 28px 64px -24px rgb(20 24 31 / 0.38);
  --shadow-page: 0 1px 2px rgb(20 24 31 / 0.06), 0 18px 40px -22px rgb(20 24 31 / 0.30); /* paper sheet on the desk */

  /* Type — root is 14px, so rem = px / 14 */
  --font-heading: 'Bricolage Grotesque', 'Inter', system-ui, sans-serif;  /* NEW token. Do NOT touch the existing --font-display (= Inter): <body> uses it as the app font. */
  --text-micro: 0.786rem;     --text-micro--line-height: 1rem;       /* 11/14 */
  --text-caption: 0.857rem;   --text-caption--line-height: 1.143rem; /* 12/16 */
  --text-body: 1rem;          --text-body--line-height: 1.429rem;    /* 14/20 */
  --text-lead: 1.143rem;      --text-lead--line-height: 1.714rem;    /* 16/24 */
  --text-title: 1.429rem;     --text-title--line-height: 2rem;       /* 20/28 */
  --text-headline: 2rem;      --text-headline--line-height: 2.429rem;/* 28/34 */
  --text-metric: 2.571rem;    --text-metric--line-height: 2.857rem;  /* 36/40 */
}
```

## 3. Type roles

| Role | Class | Font / weight | Use |
|---|---|---|---|
| Metric | `text-metric font-semibold money tracking-[-0.03em]` | Inter 600 | Dashboard headline number only |
| Headline | `font-heading text-headline font-semibold tracking-[-0.02em]` | Bricolage 600 | Auth, marketing, greeting |
| Title | `font-heading text-title font-semibold tracking-[-0.015em]` | Bricolage 600 | Page title, modal title, empty state title |
| Lead | `text-lead font-medium` | Inter 500 | Section heading |
| Body | `text-body` | Inter 400 | Default |
| Label | `text-caption font-medium text-ink-3` | Inter 500 | Field + stat labels (sentence case) |
| Micro | `text-micro font-medium` | Inter 500 | Tags, helper, table meta |
| Column head | `.th` | Inter 500 | Table headers only |

Display face is for *headings only* — money, tables and forms stay Inter with tabular figures. Load via `next/font/google` in `src/app/layout.tsx` (`Bricolage_Grotesque`, `Inter`) instead of the `@import url(...)` in globals.css (render-blocking).

## 4. Utilities

```css
@layer components {
  .panel        { @apply bg-paper border border-line rounded-panel; }
  .panel-sunken { @apply bg-paper-2 border border-line rounded-panel; }
  .label        { @apply text-caption font-medium text-ink-3; }
  .th           { @apply text-micro font-medium uppercase tracking-[0.06em] text-ink-3; }
  .money        { font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }
  .rule-dashed  { border-top: 1px dashed var(--line-strong); }
}
:focus-visible { outline: 2px solid var(--color-primary-500); outline-offset: 2px; border-radius: inherit; }
html { color: var(--ink); background: var(--ground); }
::selection { background: color-mix(in srgb, var(--color-primary-500) 22%, transparent); }
```

## 5. Spacing & layout

- 4px grid (Tailwind steps 1,2,3,4,5,6,8,10,12,16).
- Page gutter: `px-4 md:px-6 lg:px-8`; content `max-w-[1200px]` for lists/forms, full width for editor + POS.
- Panel padding `p-4 md:p-5`; panel header gap `mb-4`; stack gap between panels `gap-4 md:gap-6`.
- Row height 52 (desktop) / 56 (mobile). Form field gap `gap-4`; label→input `gap-1.5`.
- Z-index scale: base 0 · sticky 20 · nav 40 · dropdown 50 · modal 60 · toast 70.

## 6. Contrast reference (verified)

| Pair | Ratio |
|---|---|
| white on `#fc6d2d` | 2.85 ✗ |
| `#1a1410` on `#fc6d2d` / `#ea500d` | 6.4 / 4.9 ✓ |
| `#fc6d2d` text on white | 2.85 ✗ → use `#c33b09` 5.3 ✓ |
| `ink-3 #59616e` on ground | 5.7 ✓ |
| `#94a3b8` on white (current placeholder) | 2.56 ✗ |
| success / warning / danger / info text on tint | 4.8 / 5.9 / 5.0 / 5.0 ✓ |
| dark: `#fe8855` / `#9aa4b2` on `#1a1e24` | ~7 / ~6.5 ✓ |
