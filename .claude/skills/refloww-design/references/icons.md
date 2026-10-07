# Icons

The Refloww icon set replaces Lucide (`lucide-react`). 164 glyphs, 203 import names. Source: `src/components/icons/` (generated from `scripts/refloww-icons/`). **Never import from `lucide-react` or `react-icons`; never inline ad-hoc `<svg>` icons.**

## Anatomy
- 24×24 grid, 2px safe padding, stroke **1.75**, round caps/joins, soft corners (3.5–4.5 on containers).
- Ink strokes use `currentColor`. Each object/state icon has **one accent** (a tick, slip, wave, handle) that follows `--rf-accent`.
- Manipulation glyphs (arrows, chevrons, plus, minus, close, check, align, grip, undo/redo, more, menu) are pure mono.

## Usage
```tsx
import { Invoice, Plus, CircleCheck } from '@/components/icons';
<Invoice className="size-5" />                       // 20px nav icon
<Plus className="size-4" />                          // 16px inline
<Invoice className="size-5" weight="bold" />         // active/selected
<CircleCheck className="size-5 rf-draw" />           // success tick draws on
<Icon name="Receipt" className="size-4" />           // string-based (constants, CMS-like config)
```
- **Sizes** (Tailwind `size-*`): 14 `size-3.5` (dense tags/table meta) · 16 `size-4` (default inline, buttons) · 20 `size-5` (nav, list leading) · 24 `size-6` (feature, sheet grid) · 32 `size-8` (empty-state). Nothing else (`w-3`, `w-10` are out). Small sizes get a heavier stroke automatically.
- **Weight**: `regular` default; `bold` for active nav/tab; `light` only at 32px+. Do **not** pass `strokeWidth`.
- **Colour**: icons inherit text colour. Secondary icons `text-ink-3`; interactive `text-ink-2` → `text-ink` on hover.
- **Accent**: mono at rest; lights up brand orange on `a:hover`, `button:hover`, `[aria-current=page]`, `[data-active=true]`, or any ancestor with `[--rf-accent:var(--color-primary-500)]`. Surfaces that are already solid brand/danger (primary button, danger button) set `[--rf-accent:currentColor]`.
- **Icon-only controls** need `aria-label` and a tooltip. Decorative icons are `aria-hidden` by default; pass `title` to make one meaningful.
- **Motion helpers** (in `refloww-icons.css`): `rf-spin` (Loader), `rf-bell` (Bell rings on hover), `rf-draw` (accent draws on), `rf-pop`, `rf-refresh` (half-turn on press).

## Domain vocabulary (use these, not generic ones)

| Where | Icon |
|---|---|
| Dashboard / Home | `Dashboard` / `Home` |
| Transactions | `Transactions` |
| POS register / Sales tab | `Register` |
| Documents (group, bottom-nav) | `Documents` |
| Invoices | `Invoice` |
| Receipts | `Receipt` |
| Delivery notes | `Delivery` |
| Templates | `Template` |
| Marketplace | `Marketplace` |
| Management (group, Business tab) | `Briefcase` |
| Customers / single customer | `Customers` / `User` (`UserPlus` to add) |
| Products | `Products` |
| Storefront | `Storefront` |
| Discounts | `Discount` (`Percent` for a percentage field) |
| Ledger | `Ledger` |
| Analytics | `Analytics` |
| Settings / Help / Sign out | `Settings` / `Help` / `LogOut` |
| Money amount field | `Naira` for ₦ shops, else `Currency` |
| Encryption / locked content | `Lock` / `Unlock` / `ShieldCheck` |
| Barcode scan / OCR capture | `Barcode`, `ScanLine` / `Camera`, `Scan` |
| Stock | `Products`; low stock `AlertTriangle`; out of stock `CircleX`; in stock `CircleCheck` |
| Promotions: best seller / flash sale / new | `Award` / `Flame` / `Sparkles` |
| Export / import | `Download`, `FileSheet`, `FileJson` / `Upload`, `FileUp` |
| Share / copy link / open | `Share`, `Link`, `ExternalLink` |
| Toasts | success `CircleCheck` · error `CircleX` · warning `AlertTriangle` · info `Info` |
| Template editor tools | `Pointer`, `Move`, `Type`, `Image`, `Table`, `Grid`, `AlignLeft/Center/Right`, `Undo/Redo`, `ZoomIn/Out`, `Maximize`, `Layers`, `Copy`, `Clipboard`, `ClipboardPaste`, `Trash` |
| Theme | `Sun`, `Moon`, `Monitor` |

## Emoji → icon (replace everywhere)
`🔒` → `Lock` · `⚠️` → `AlertTriangle` · `✅` → `CircleCheck` · `❌` → `CircleX` · `🏆` → `Award` · `🔥` → `Flame` · `⭐` → `Star`/`Sparkles` · `💡` → `Lightbulb` · `✓` → `Check`.

## Drawing new icons
Add to `scripts/refloww-icons/defs*.py` using `P/PA/R/C/D` primitives, keep to the grid and the one-accent rule, rebuild (`python3 build.py`), review the contact sheet, and keep names kebab-case. Don't hand-edit generated `icons.tsx`.
