# Audit — what the code does today

Measured on `Penlighty/Refloww` (122 `.tsx` files, ~37.6k lines).

| Finding | Count | Why it reads "generated" | Fix |
|---|---|---|---|
| Radius tiers all in heavy use | `rounded-xl` 383 · `full` 224 · `lg` 223 · `2xl` 216 · `md` 30 · `3xl` 10 | Every element picks a different softness | 3 radii + tag + full |
| Shadow tiers | `sm` 150 · `xs` 35 · `2xl` 32 · `xl` 30 · `md` 28 · `lg` 23 | Depth used as decoration | Flat panels; `shadow-pop`/`sheet` only |
| Gradients | 49 | Instantly "AI SaaS" | Remove; solid tokens |
| `backdrop-blur` | 48 | Glass-morphism cliché, slow on low-end Android | Remove; solid + hairline |
| `bg-primary-*` token usage | **0** (while `[#fc6d2d]` 69× and `[#2d3748]` 311× are hard-coded) | Tokens exist but nothing uses them → drift | Tokens only |
| `uppercase tracking-wider` labels | 160 | Everything shouting | Sentence case; `.th` for table heads |
| `text-[10px]`/`[11px]` | 117 / 96 (+ `[9px]`,`[8px]`) | Caused by `html{font-size:14px}` making `text-xs` ≈10.5px | Type scale, min 11px |
| `transition-all` | 203 | Janky, animates layout | Explicit property lists |
| Stroke widths on icons | 1, 1.5, 1.75, 2, 2.5, 3 | Icons feel mismatched | One weight + `weight` prop |
| Icon sizes | `w-3`, `3.5`, `4`, `5`, `6`, `8` | Inconsistent rhythm | 14/16/20/24/32 |
| Emoji as icons | 🔒 ⚠️ ✅ ❌ 🏆 🔥 ⭐ 💡 in 5 files | Platform-dependent, unpolished | Custom icons |
| Coloured icon wells | blue/purple/emerald/amber 100 tints (Header `typeConfig`, QuickActions, StatsGrid) | Rainbow dashboard | One neutral well |
| Document type colours | `#137fec`, `#10b981`, … in `documentTypes.ts` | Off-brand blue/green | Icon + label in ink |
| Featured dark stat card with green digits | `StatsGrid` | Stock crypto-dashboard look | StatBand |
| `font-extrabold` / `font-black` | 12 / 6 | Heavy, cheap | 400/500/600 |
| Contrast | white on orange 2.85:1; orange text 2.85:1; `#94a3b8` 2.56:1 | Fails WCAG AA | Warm-black label; `primary-text`; `ink-3` |
| Dark mode via `dark:` pairs on every element | pervasive | Inverted, not designed | Theme variables |
| Two extra visual languages | `.admin-*` glass, `.fintech-card`, `.mobile-card` in globals.css | Inconsistent surfaces | One `panel` |
| Fonts via CSS `@import` (4 families) | 1 | Render-blocking; Playfair/Courier Prime/DM Sans are for documents only | `next/font`; load document fonts lazily in renderer |

## Banned in new code
Gradients · backdrop blur · `shadow-sm…2xl` on static elements · `rounded-xl/2xl/3xl` · hex literals · `neutral-*`/`gray-*` text greys · emoji in UI · `lucide-react` / `react-icons` imports · `transition-all` · `animate-bounce/ping` · `uppercase tracking-wider` outside `.th` · `font-black/extrabold` · `text-[Npx]` · cards nested in cards · multiple orange buttons in one view · hover lift (`-translate-y`) · centred hero with sparkles.

## Smell test for "vibe-coded"
- Could this screen be any SaaS? If yes, find the Refloww-specific element (ledger rule, document sheet, ₦, receipt mark) and strengthen it.
- Is more than ~10% of the viewport orange or tinted? Remove colour until only meaning remains.
- Are there >3 type sizes in one panel? Collapse.
- Does anything move without a reason a user would name? Remove it.
- Would the screen still look right with the icons removed? Good — then icons are support, not decoration.
