# Refloww Icons

164 custom glyphs · 203 import names (every Lucide icon the app used has a drop-in alias).

## Style rules (the "Refloww hand")
- **Grid** 24×24, 2px safe padding, optical centre.
- **Stroke** 1.75 (light 1.5 · bold 2.25), round caps and joins, no fills except tiny dots.
- **Corners** soft: containers 3.5–4.5 radius, inner details 1–2.
- **Flow accent** — every object/state icon has one accent element (a tick, a slip, a wave).
  Arrows, chevrons, plus/minus/close, align, grip and similar *manipulation* glyphs are pure mono.
- **Accent colour** inherits `currentColor` → mono by default. Set `--rf-accent` to light it up
  (`refloww-icons.css` does this on hover / active / `aria-current`).

## Folders
| Path | What |
|---|---|
| `svg/mono/` | `currentColor` SVGs (use anywhere; recolour with CSS `color`) |
| `svg/duotone/` | baked charcoal `#2d3748` + orange `#fc6d2d` |
| `png/duotone`, `png/mono`, `png/mono-white` | 256×256 transparent PNGs (white set is for dark surfaces) |
| `sprite.svg` | `<symbol id="rf-<name>">` sprite |
| `icons.json`, `svg-codes.md` | machine-readable list + every SVG as code |
| `react/icons/` | drop into `src/components/icons/` |
| `refloww-icons.css` | paste into `src/app/globals.css` |
| `scripts/` | Python sources (`defs*.py`) + `build.py` to regenerate everything |
| `preview/` | contact sheets |

## Regenerate
```bash
pip install cairosvg
python3 scripts/build.py ./out
```
Edit/add icons in `scripts/defs*.py` (tiny DSL: `P` path, `PA` accent path, `R`, `C`, `D` dot…).

## Domain names worth using in the UI
`Dashboard · Invoice · Documents · Receipt · Delivery · Template · Marketplace · Storefront ·
Register (POS) · Transactions · Ledger · Customers · Products · Discount · Analytics ·
Currency · Naira · Wallet`
