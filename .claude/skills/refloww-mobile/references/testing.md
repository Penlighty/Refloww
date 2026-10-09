# Testing & QA

## Device / viewport matrix

| Class | Viewport (w×h) | Example | Must check |
|---|---|---|---|
| Small phone | 320×568 | iPhone SE 1 / small Android | no horizontal overflow, money doesn't wrap, tab labels fit |
| Common phone | 360×800, 390×844, 412×915 | Galaxy A-series, iPhone 14, Pixel 7 | primary baseline |
| Large phone | 430×932 | iPhone Pro Max | spacing, one-hand reach |
| Landscape phone | 844×390, 667×375 | — | mobile shell kept, chrome slim, forms usable |
| Tablet portrait | 768×1024, 820×1180 | iPad / Android tablet | rail sidebar, 2-col, sheets as dialogs |
| Tablet landscape / small laptop | 1024×768, 1280×800 | — | full sidebar, tables |
| Desktop | 1440×900 | — | no regressions |

Browsers/runtimes: **iOS Safari**, **Android Chrome**, **Android WebView (Capacitor app)**, **installed PWA** (iOS standalone + Android). Always at least one real mid-range Android and one iPhone.

Conditions: light + dark · text zoom 200% (browser/OS font size) · slow 3G + 4× CPU throttle · offline · keyboard open · rotated mid-task.

## Quick audits (paste in DevTools console on each screen)

**Horizontal overflow** — nothing should be wider than the viewport:
```js
(() => { const w = document.documentElement.clientWidth; const bad = [...document.querySelectorAll('body *')].filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.right > w + 1 || r.left < -1) && !el.closest('[data-allow-overflow],.overflow-x-auto,.no-scrollbar,.snap-x'); }); console.table(bad.slice(0, 25).map(el => ({ tag: el.tagName, cls: String(el.className).slice(0, 60), right: Math.round(el.getBoundingClientRect().right) }))); return bad.length; })()
```
**Touch targets < 44px** (interactive elements):
```js
(() => { const bad = [...document.querySelectorAll('a,button,[role=button],input:not([type=hidden]),select,textarea,[role=tab]')].filter(el => { const r = el.getBoundingClientRect(); return r.width && r.height && (r.width < 44 || r.height < 44) && getComputedStyle(el).visibility !== 'hidden'; }); console.table(bad.slice(0, 40).map(el => ({ tag: el.tagName, label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24), w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) }))); return bad.length; })()
```
(Inline text links and checkbox inputs wrapped by a 44px label are acceptable.)

**Inputs that will zoom on iOS** (font-size < 16px):
```js
[...document.querySelectorAll('input,select,textarea')].filter(el => parseFloat(getComputedStyle(el).fontSize) < 16).length  // expect 0 on coarse pointers
```
**Fixed/sticky elements covering content**: list `position: fixed` nodes and confirm each has an inset (`env`/`--safe-*`) and doesn't overlap the tab bar.

## Code gates (CI-friendly greps — expect 0)

```bash
grep -rnE "h-screen|min-h-screen|100vh" src --include=*.tsx --include=*.css | wc -l
grep -rnE "max-h-\[[0-9]+vh\]" src --include=*.tsx | wc -l
grep -rnE "opacity-0 group-hover:opacity-100" src --include=*.tsx | grep -v "touch:opacity-100" | wc -l
grep -rnE "window\.innerWidth" src --include=*.tsx --include=*.ts | wc -l
grep -rnE "fixed inset-0.*items-center justify-center" src --include=*.tsx | grep -v "components/ui/Sheet.tsx" | wc -l
grep -rnE "text-\[(8|9|10|11)px\]" src --include=*.tsx | wc -l
grep -rn "safe-area-p[tb]" src --include=*.tsx | wc -l   # allowed IF globals-mobile.css defines them
```

## Manual flow scripts (do each on a phone)

1. **Create invoice, one-handed**: Documents → + → Invoice → pick customer → add 3 items via picker → edit a quantity with the stepper → keyboard open: bar above keyboard, field visible → Save → success toast → lands on detail → Back goes to the list (not the empty form).
2. **Back button chain**: open a filter Sheet → system Back closes only the sheet · open the More sheet and tap Settings → the sheet closes and Settings opens (one Back returns to the previous page) · dirty form → header Back → discard Sheet → Keep editing → Back again → discard Sheet reappears → Discard → returns to the list.
3. **POS sale**: add 5 products (inline steppers) → cart bar count bumps → View cart → change qty → Charge → Cash, enter amount, change due updates → complete → success → New sale resets.
4. **Offline**: airplane mode → create receipt → header shows Offline Tag → reconnect → syncs, Tag clears.
5. **Rotate** during a form and during POS: no data loss, no layout break; landscape shows slim chrome.
6. **Text zoom 200%**: nothing clipped; buttons grow; no overlapping bars.
7. **Public store** on 360px: browse → product Sheet → add → cart bar → checkout → WhatsApp message opens with the order.
8. **Template editor**: pinch zoom, pan, select/drag a field, resize, open Properties sheet, Undo/Redo, Done.
9. **Keyboard types**: money fields show decimal pad; phone shows tel pad; email shows @ keyboard; SKU shows capitals.
10. **Dark mode** repeat 1 and 3.

## Automated (optional)

- `assets/tests/mobile-primitives.test.tsx` (jsdom): overlay-history stack, Sheet lifecycle/Escape/focus, DataTable table+list, header-context no-loop, StickyActionBar. 20 checks.
- Playwright device sweep (not run in the authoring environment — adapt and verify):
```ts
import { test, expect, devices } from '@playwright/test';
const targets = [['iPhone SE', { ...devices['iPhone SE'] }], ['Pixel 7', { ...devices['Pixel 7'] }], ['iPad Mini', { ...devices['iPad Mini'] }]] as const;
for (const [name, use] of targets) {
  test(`no horizontal overflow – ${name}`, async ({ browser }) => {
    const ctx = await browser.newContext(use); const page = await ctx.newPage();
    for (const path of ['/', '/invoices', '/customers', '/pos', '/ledger', '/settings']) {
      await page.goto(path); await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${path} on ${name}`).toBeLessThanOrEqual(1);
    }
  });
}
```
- Lighthouse mobile: Accessibility ≥ 95, "Tap targets sized appropriately", "Viewport", "Text legible".

## Definition of done (mobile)

All code gates 0 · overflow/target/zoom audits 0 on the 10 core screens · flows 1–10 pass on iOS Safari + Android Chrome + the Capacitor app · light/dark both verified · reduced-motion verified · no `TODO(mobile)` left without an owner.
