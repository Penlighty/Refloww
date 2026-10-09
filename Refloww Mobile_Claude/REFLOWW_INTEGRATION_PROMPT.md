# Refloww — Integration Prompt (icons + UI system + motion)

**How to use:** open the Refloww repo root in Claude Code / Cursor, place the three deliverables somewhere reachable (e.g. `./_design/`), and paste everything below the line `=== PROMPT ===`. It is written to be executed in phases with a commit after each. The icon swap (Phase 2) was dry-run on a copy of this repo: all 78 import sites rewrote cleanly and `npx tsc --noEmit` stayed at **0 errors**.

Deliverables expected in `./_design/`:
- `refloww-icons/` (folder: `react/icons/`, `refloww-icons.css`, `svg/`, `png/`, `scripts/`)
- `refloww-design.skill` (zip with `SKILL.md` + `references/`)
- this file

=== PROMPT ===

You are refactoring the **Refloww** codebase (Next.js 16.1, React 19.2, Tailwind v4, Firebase, Capacitor) to a custom icon set and a coherent, premium, uncluttered UI system. **Visual and interaction layer only.** Do not change business logic, Firebase/Firestore code, encryption (`EncryptionContext`, `lib/`), API routes, `firestore.rules`, or the printable output in `src/styles/document-renderer.css` / `DocumentRenderer.tsx`.

## Ground rules
1. Work on branch `design/refloww-system`. **Commit after every phase** with the message shown.
2. Preserve every component's props, exports and behaviour. Restyle underneath.
3. After each phase run `npx tsc --noEmit` and `npm run lint`; fix before moving on. Run `npm run build` at the end of Phases 1, 4 and 8.
4. The design source of truth is the skill. **Install it first** (Phase 0) and read `SKILL.md` and the reference file named in each phase before editing. When this prompt and the skill disagree, the skill wins.
5. If something is ambiguous, pick the closest option from the skill and leave `// TODO(design): <question>` rather than inventing new styles.
6. Never introduce: gradients, `backdrop-blur`, hex literals, `lucide-react`/`react-icons` imports, emoji in UI, `transition-all`, new radii/shadows outside the tokens.

---

## Phase 0 — Install assets  *(commit: `chore(design): add icon set and design skill`)*

```bash
git checkout -b design/refloww-system

# 1. Design skill (so every future agent follows it)
mkdir -p .claude/skills && unzip -o _design/refloww-design.skill -d .claude/skills/

# 2. Icon components
mkdir -p src/components/icons
cp _design/refloww-icons/react/icons/* src/components/icons/
#   → index.ts, icons.tsx, createIcon.tsx, Icon.tsx, registry.ts

# 3. Icon sources + static assets (reference/export use; not imported by the app)
mkdir -p scripts/refloww-icons public/icons
cp -r _design/refloww-icons/scripts/* scripts/refloww-icons/
cp -r _design/refloww-icons/svg public/icons/svg
cp -r _design/refloww-icons/png/duotone public/icons/png
```
Then read `.claude/skills/refloww-design/SKILL.md` and all six `references/*.md`.

Confirm the `@/` alias resolves `src/` in `tsconfig.json` (existing code already uses `@/components/...`).

---

## Phase 1 — Tokens, fonts, base CSS  *(commit: `feat(design): tokens, fonts, motion base`)*
Read `references/tokens.md` and `references/motion.md`.

**`src/app/globals.css`**
- Keep the existing `@theme` block (orange scale `--color-primary-*`, charcoal, status colours, `--font-display`). **Do not redefine `--font-display`** — it is Inter and `<body>` uses `font-display` (see `src/app/layout.tsx` body class). Add the new heading token as `--font-heading`.
- Add the `:root` / `.dark` variable block, the `@theme inline` colour mappings, the `@theme` radii/shadows/type tokens, the motion keyframes, utilities (`.panel`, `.panel-sunken`, `.label`, `.th`, `.money`, `.rule-dashed`) and the global `:focus-visible` rule — exactly as in `tokens.md` / `motion.md`.
- Paste the full contents of `_design/refloww-icons/refloww-icons.css` after the `@theme` blocks.
- Keep `html { font-size: 14px }` (line ~133). All new type tokens are rem values calibrated to it.
- Review the global heading rules (~lines 150–180: `h1…h4` sizes). Align them to the type roles (`font-heading` for h1/h2) without changing markup.
- **Do not delete** `.mobile-card`, `.fintech-card`, `.admin-*`, or `--refloww-*` yet; they are removed in Phase 7 once usage is zero.

**Fonts** — currently `globals.css` line 1 is a render-blocking `@import url(fonts.googleapis…)` for Inter, Playfair Display, Courier Prime, DM Sans.
- In `src/app/layout.tsx` load with `next/font/google`: `Inter` (variable `--font-inter`), `Bricolage_Grotesque` (variable `--font-bricolage`, weights 500/600), and for **document rendering only** `Playfair_Display`, `Courier_Prime`, `DM_Sans` with `display: 'swap'` and `preload: false`.
- Set `--font-display: var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif;` and `--font-heading: var(--font-bricolage), var(--font-inter), system-ui, sans-serif;`.
- Open `src/styles/document-renderer.css` and `DocumentRenderer.tsx`: confirm every `font-family` they use still resolves (map the next/font variables or keep literal family names via `@font-face` fallbacks). Print/PDF output must be byte-for-byte visually unchanged. Remove the `@import url(...)` only after verifying.

**`src/app/layout.tsx` `<body>` class** — replace
`bg-background-light dark:bg-background-dark text-neutral-900 dark:text-neutral-100 selection:bg-[#fc6d2d] selection:text-white transition-colors`
with `bg-ground text-ink` (selection colour now comes from CSS). Keep `antialiased font-display h-screen flex overflow-hidden suppressHydrationWarning`.

---

## Phase 2 — Swap icon library  *(commit: `refactor(icons): lucide-react → custom Refloww icons`)*
Read `references/icons.md`.

**2a. Mechanical import swap (verified).** Save and run:
```python
# scripts/codemod_icons.py
import re, glob
n = 0
for f in glob.glob('src/**/*.ts*', recursive=True):
    if f.startswith('src/components/icons/'): continue
    s = open(f, encoding='utf-8').read()
    t = re.sub(r"(from\s*['\"])lucide-react(['\"])", r"\1@/components/icons\2", s)
    if t != s: open(f, 'w', encoding='utf-8').write(t); n += 1
print('rewrote', n, 'files')   # expect 78
```
Every Lucide name used in the app (162, incl. `LucideIcon` type) has an exported alias, so this compiles as-is. Run `npx tsc --noEmit` → must be 0 errors.

**2b. Remove old libraries.** `react-icons` has no imports in `src/` (verify with `grep -rn "react-icons" src` → empty), so remove both: `npm uninstall lucide-react react-icons`.

**2c. Normalise usage** (review each diff; do not blind-replace):
- Delete per-instance `strokeWidth={…}` props (≈67) **and** the `stroke-[2.5]` / `stroke-[1.75]` utility classes used to switch weight (11 uses in `components/mobile/MobileBottomNav.tsx` and `components/QuickActions.tsx`). For active/selected states use `weight="bold"` instead; never a raw number.
- Icon sizes → the scale **14 / 16 / 20 / 24 / 32** only: `w-3 h-3` → `size-3.5`; `w-4 h-4` → `size-4`; `w-5 h-5` → `size-5`; `w-6 h-6` → `size-6`; large empty-state icons → `size-8`. Prefer `size-*` over separate `w-*/h-*`.
- Spinners: where an icon has `animate-spin` (19 files, usually `Loader2`) use `rf-spin` instead.
- Bell icons in `Header.tsx` / `MobileHeader.tsx`: add `rf-bell` so it rings on hover.
- Success confirmations (toast success, "saved" states): add `rf-draw` to the `CircleCheck` icon.
- Surfaces that are solid brand/danger (primary/danger `Button`, brand badges): add `[--rf-accent:currentColor]` (or the `rf-accent-mono` class) so the accent does not vanish orange-on-orange.

---

## Phase 3 — Semantic icon upgrades  *(commit: `feat(icons): domain icons, emoji and inline-svg removal`)*
The swap in Phase 2 keeps Lucide's *meanings*. Now use the domain glyphs. Inspect each file's icon config (nav arrays / `typeConfig` / `statusConfig` objects) and map by route/label using `references/icons.md → Domain vocabulary`.

| File | Change |
|---|---|
| `components/Sidebar.tsx` | nav arrays: dashboard→`Dashboard`; transactions→`Transactions`; `/pos` (`Zap`)→`Register`; documents group (`FileText`)→`Documents`; invoices→`Invoice`; receipts→`Receipt`; delivery notes (`Truck`)→`Delivery`; templates (`FolderOpen`)→`Template`; marketplace (`Store`)→`Marketplace`; management group→`Briefcase`; customers (`Users`)→`Customers`; products (`Package`)→`Products`; storefront (`ShoppingBag`)→`Storefront`; discounts (`Percent`)→`Discount`; ledger (`BookOpen`)→`Ledger`; analytics (`BarChart2`)→`Analytics`; settings→`Settings`; help→`Help`. Active item: `weight="bold"` + `data-active="true"` on the link so the accent lights up. |
| `components/mobile/MobileBottomNav.tsx` | Home→`Home`; Sales (`Zap`)→`Register`; Documents (`FileText`)→`Documents`; Business→`Briefcase`; More→`MoreHorizontal`. Active: `weight="bold"`. |
| `components/mobile/MobileHeader.tsx`, `MobileSubHeaderNav.tsx`, `ui/SubTabs.tsx` | match tab icons to the same vocabulary; `aria-current`/`data-active` on the selected tab |
| `components/Header.tsx` | `typeConfig` (L53–58: `announcement`/`promotion`/`greeting`/`warning`) already maps to `Megaphone`/`Gift`/`Info`/`AlertTriangle` — keep the icons, **delete the per-type colour/bg fields** (blue/purple/emerald/amber) and render all four in one neutral `bg-paper-2` well; `priorityConfig` (L60–64) → `danger-text` / `ink-3` / `ink-4` tokens. Bell gets `rf-bell` |
| `components/ui/Toast.tsx` | per-type config (L19–48; currently `CheckCircle`, `AlertCircle`, `AlertTriangle`, `Info`): success→`CircleCheck` (+`rf-draw`), error→`CircleX`, warning→`AlertTriangle`, info→`Info`; replace the fully tinted toast backgrounds with the neutral ink toast (only the icon is coloured) |
| `components/DocumentDetail.tsx` | `statusConfig` (L42–49) has **no icons**, only `bgClass/textClass/dotClass` per `draft/sent/paid/partially_paid/overdue/cancelled`. Convert to Tag tones (`neutral/info/success/warning/danger/neutral+line-through`) per `components.md`; use the dot **or** an icon, never both. L632 `✓ Fully Paid` → `<Check />` |
| `components/ledger/LedgerTable.tsx` | `typeConfig` (used L138–167, per-type coloured `bg`/`color`) → icons `Invoice` / `Receipt` / `Delivery` in one neutral well; drop per-type colours |
| `app/templates/page.tsx`, `app/templates/[id]/TemplateDetailClient.tsx` | document-type icons → `Invoice` / `Receipt` / `Delivery` |
| `components/QuickActions.tsx`, `components/StatsGrid.tsx`, `components/DashboardActionBanner.tsx`, `components/AnnouncementBanner.tsx` | domain icons per `icons.md`; `Sparkles` only for genuinely "new/AI/OCR" meaning |
| `app/settings/page.tsx` (tab list L68–77) | `Financial Defaults`: `DollarSign` → `Naira` (or `Currency` if the org currency is not NGN — pick via the existing currency setting); `Vault & Encryption`: `Shield` → `ShieldCheck`; others (`User`, `Palette`, `Key`, `Building`, `Users`, `Hash`) keep. Theme options L633–634 keep `Sun`/`Moon`. Also review `components/settings/DocumentNumbering.tsx` and `EncryptionSettings.tsx` against `icons.md` |
| `app/storefront/page.tsx`, `app/products/page.tsx`, `app/analytics/page.tsx` | their local `icon:` configs → `Storefront` / `Products` / `Analytics` |
| `components/admin/*`, `app/admin/**` | `StatCard` prop type `LucideIcon` already aliases to `IconComponent`; no change needed beyond Phase 2 |
| `lib/constants/documentTypes.ts`, `lib/constants/fieldTypes.ts` | string `icon:` values (`'FileText'`, `'CalendarClock'`, `'Table'`, `'Calculator'`…) are valid registry names; update document types to `'Invoice' / 'Receipt' / 'Delivery'`. If anything consumes these strings, render them with `<Icon name={…} />` from `@/components/icons`. Check usages of `.color` (e.g. `#137fec`): UI chips must drop type colours (icon + label in ink); keep any colour used *inside* printed documents. |

**Emoji → icons (remove every emoji from UI)**

| Location | Replace |
|---|---|
| `components/DocumentList.tsx` L488, 504, 514, 643, 658, 748; `components/ledger/LedgerTable.tsx` L178; `components/RecentTransactions.tsx` L121, 147, 164, 174 | `🔒 …` strings → a 14px `<Lock />` followed by the plain text ("Encrypted", "Unlock to view", "Locked"); avatar fallback `🔒` → `<Lock className="size-4" />` |
| `components/DocumentForm.tsx` L997, 1006, 1144, 1202, 1211 | `⚠️ Out of Stock` → `<AlertTriangle className="size-3.5" />` + text in `text-warning-text`. Note L997/L1202 are inside `<option>` text (no JSX allowed) → use plain "Out of stock (0 remaining)" |
| `components/DocumentDetail.tsx` L632 | `✓ Fully Paid` → `<Check />` + text |
| `components/storefront/StorefrontCatalogContent.tsx` L176–195 | badge objects `{ text:'❌ Out of Stock', bg:'#ef4444' }` → `{ icon: CircleX, label: 'Out of stock', tone: 'danger' }`; ✅→`CircleCheck`, 🏆→`Award`, 🔥→`Flame`, ⭐→`Sparkles`; render with the Tag component (tones, not raw hex) |
| `app/help/page.tsx` L201, 258, 523, 530 | `💡 Tip:` → `<Lightbulb className="size-4 inline" />`; `✓ item` → `<Check />` |
| `app/admin/notifications/page.tsx` L315–317 | `icon: '🚩' / '🛑' / '🔔'` → `'Megaphone' / 'AlertTriangle' / 'Bell'` and render via `<Icon name>` |
| `app/admin/marketplace/page.tsx` L478, `app/customers/page.tsx` L948 | `✓` → `<Check />`; `⚡ Auto-generated` → `<Zap />` or drop the glyph |
| `components/ui/HelpTooltip.tsx` L117, 131; `components/ui/PageHelpModal.tsx` L87 | 📊 → `<Analytics />`, 💡 → `<Lightbulb />` |
| `lib/hooks/useFirebaseSync.ts` L268, 539 | notification `icon: '🔒' / '🏢'` are data strings: change to `'Lock'` / `'Building'` and make whatever renders them use `<Icon name>` (verify the consumer first; do not alter sync logic) |
| `lib/utils/financialTerms.ts` L165, 168 | tooltip plain text: drop 📊/💡, use labels "Calculation:" / "Example:" |

**Inline `<svg>`**
- `app/login/page.tsx`, `app/signup/page.tsx`: the multicolour Google "G" is a third-party brand mark → **keep**.
- `app/templates/[id]/edit/TemplateEditorClient.tsx` (5 inline SVGs): inspect each; replace with the matching icon (`Table`, `Image`, `Type`, `Grid`, `AlignLeft`…) where it is a tool glyph. If it is a bespoke drawing (e.g. a table-grid preview), keep it but set `stroke-width="1.75"`, round caps/joins and `currentColor` for consistency.

---

## Phase 4 — UI primitives  *(commit: `feat(ui): restyle primitives to Paper & Ink`)*
Read `references/components.md`. Keep exported APIs; restyle these files in `src/components/ui/`:
`Button`, `Card`, `Badge` (→ Tag styling; keep export name), `Modal` (+ bottom-sheet behaviour `<md`), `Toast`, `SwipeableToaster`, `SubTabs` (sliding indicator), `EmptyState` (dashed icon tile), `Skeleton` (`animate-hold`), `Select`, `SearchInput`, `DateRangePicker`, `FixedDropdownMenu` (menu surface), `HelpTooltip`, `PageHelpModal`, `ImageUploader`, and `components/ThemeToggle.tsx`.

Specifics that must hold:
- `Button` primary = `bg-primary-500 text-on-primary` (**warm-black label, not white** — white is 2.85:1). Remove shadows and `transition-all`. Add `ink` variant. Loading shows `Loader` with `rf-spin` replacing the left icon.
- `Card` = `.panel`; no shadow; `hover` only darkens the border.
- Overlays use `bg-scrim` (no blur). Modals `rounded-sheet shadow-sheet`; mobile bottom sheet with grabber and drag-to-dismiss.
- Toasts are neutral ink surfaces; only the **icon** carries status colour.
- Create small new files only where the skill specifies: `components/ui/PageHeader.tsx`, `components/ui/StatBand.tsx`, `components/ui/Tag.tsx` (make `Badge` re-export it).

---

## Phase 5 — App shell  *(commit: `feat(shell): sidebar, headers, bottom nav`)*
Files: `components/AppShell.tsx`, `Sidebar.tsx`, `Header.tsx`, `mobile/MobileHeader.tsx`, `mobile/MobileBottomNav.tsx`, `mobile/MobileSubHeaderNav.tsx`, `components/admin/AdminSidebar.tsx`, `AdminHeader.tsx`.
- Sidebar 232/64, paper surface + hairline, active = `bg-paper-2` + 3×16 orange mark that slides + bold icon with orange accent; sentence-case section labels; collapsed rail with tooltips.
- Bottom nav: solid paper, **no blur**, top-edge orange line for active, safe-area padding.
- Header 56px: flat, hairline, bell dot, theme toggle, avatar menu.
- Admin: same system; differentiate with an "Admin" Tag and a 2px ink top rule, not glass styling.
Acceptance: no gradient/blur/shadow in the shell; keyboard focus ring visible on every control; active route always has `aria-current="page"`.

---

## Phase 6 — Screens  *(commit per screen group: `feat(<area>): …`)*
Read `references/screens.md`. Do these in order, one commit each:
1. **Dashboard** — `app/page.tsx`: `DashboardActionBanner`, **`StatsGrid` → StatBand**, `QuickActions`, `RecentTransactions` (`components/dashboard/RevenueChart.tsx`, `components/ProductVelocityWidget.tsx` flat, one orange series). Entrance `animate-rise` stagger ≤4.
2. **Documents** — `components/DocumentList.tsx`, `DocumentForm.tsx`, `DocumentDetail.tsx` and routes `invoices/`, `receipts/`, `delivery-notes/`.
3. **Ledger & transactions** — `app/ledger/page.tsx`, `components/ledger/*`, `app/transactions/page.tsx`, `TransactionDetailModal.tsx`.
4. **POS** — `app/pos/page.tsx`, `BarcodeScannerModal.tsx`.
5. **Customers / products / discounts** — pages + `[id]` clients.
6. **Storefront & public store** — `app/storefront/**`, `app/s/[storeSlug]/page.tsx`, `components/storefront/StorefrontCatalogContent.tsx`.
7. **Templates & editor** — `app/templates/**`, `TemplateSheetSlider.tsx`, `TemplateImportExport.tsx` (chrome only; do not restyle the document sheet).
8. **Settings, Help, Marketplace, Auth** — `app/settings`, `app/help`, `app/marketplace`, `login`, `signup`, `forgot-password`.
9. **Modals** — `DeleteConfirmationModal`, `FeedbackModal`, `MigrationDialog`, `OcrBatchModal`, `EncryptionUnlockModal`, `ProductAlternativeSelector`, `KeyboardShortcuts`, `PendingTasks`, `TasksDropdown`.

For each screen: loading = skeleton shaped like content; empty = dashed icon tile + one sentence + one action; error = inline with `AlertCircle`; one orange action per view; money uses `.money` right-aligned.

---

## Phase 7 — Global cleanup (review every diff)  *(commit: `refactor(design): remove legacy styles`)*
Do these as scoped regex passes **with manual review** (context decides the target):

| Find | Replace with |
|---|---|
| `rounded-lg` on buttons/inputs/selects | `rounded-ctl` |
| `rounded-xl`, `rounded-2xl` on cards/panels/popovers | `rounded-panel` |
| `rounded-2xl`, `rounded-3xl` on modals/sheets | `rounded-sheet` |
| `rounded-md` on tags/kbd | `rounded-tag` |
| `rounded-full` | keep only avatars, switches, dots, zoom pill |
| `shadow-xs/sm/md/lg` on static elements | remove |
| `shadow-xl/2xl` on menus / modals | `shadow-pop` / `shadow-sheet` |
| `bg-gradient-to-*`, `bg-linear-to-*` (49) | solid token (`bg-paper`, `bg-primary-500`, `bg-paper-2`) |
| `backdrop-blur*` (48) | remove; solid surface + `border-line` |
| `transition-all` (203) | `transition-[color,background-color,border-color,opacity,transform] duration-150 ease-settle` |
| `text-[10px]`, `text-[11px]`, `text-[9px]`, `text-[8px]` (219) | `text-micro` |
| `uppercase tracking-wider` (160) | remove (sentence case); keep only on table column headers via `.th` |
| `font-extrabold`, `font-black` (18) | `font-semibold` |
| `bg-white dark:bg-surface-dark` / `dark:bg-neutral-900` | `bg-paper` |
| `bg-neutral-50/100 dark:bg-neutral-800` | `bg-paper-2` |
| `border-neutral-200 dark:border-neutral-800` | `border-line` |
| `text-neutral-900 dark:text-neutral-100` | `text-ink` |
| `text-neutral-500/600 dark:text-neutral-400` | `text-ink-3` |
| `[#2d3748]` (311), `[#fc6d2d]` (69), other hex in `className` | `ink` / `primary-500` / matching token |
| `text-[#fc6d2d]`, orange text on light | `text-primary-text` |
| Rainbow icon wells (`bg-blue-100`, `bg-purple-100`, `bg-emerald-100`, `bg-amber-100`…) | `bg-paper-2` neutral well |
| `animate-bounce`, `animate-ping`, `hover:-translate-y-*`, `hover:scale-10*` | remove |

Then delete legacy CSS from `globals.css` **only when `grep` shows zero usage**: `.mobile-card`, `.fintech-card`, `.admin-*`, the `--refloww-*` aliases, unused `--color-brand-orange*`, `--color-surface-*`/`--color-background-*` (after `layout.tsx` change).

Do **not** touch the printable document markup/CSS or colours stored in user templates.

---

## Phase 8 — Verify  *(commit: `chore(design): verification fixes`)*
Run and report results:
```bash
npx tsc --noEmit && npm run lint && npm run build

# gates — each should print 0 (or only whitelisted files)
grep -rn "lucide-react\|react-icons" src | wc -l
grep -rnE "bg-gradient-to-|bg-linear-to-|backdrop-blur" src | wc -l
grep -rnE "\[#(fc6d2d|2d3748|ea500d)\]" src | wc -l
grep -rn "transition-all" src | wc -l
grep -rnE "text-\[(8|9|10|11)px\]" src | wc -l
grep -rnE "font-(extrabold|black)" src | wc -l
grep -rnE "strokeWidth=\{" src --include=*.tsx | wc -l
grep -rnP "[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]" src --include=*.tsx | grep -v "document-renderer" | wc -l
```
Manual QA at **375 / 768 / 1280 px**, light and dark: dashboard, invoice list → new → detail, POS, ledger, customers, storefront (public), template editor, settings, login. Check: one orange action per view; focus ring on every control via keyboard; contrast of secondary text; bottom-nav safe-area; modals become bottom sheets on mobile; reduced-motion (`prefers-reduced-motion`) disables movement; no layout shift on loading; PDF/print output identical to before.
Capacitor/Android: icons are inline SVG so no native asset changes; run `npx cap sync` only if you also changed web assets that the shell bundles.

## Definition of done
- Zero imports from `lucide-react` / `react-icons`; zero emoji in UI; all icons from `@/components/icons` on the 14/16/20/24/32 scale.
- Radii ∈ {ctl, panel, sheet, tag, full}; no static shadows, gradients or blur; tokens only (no hex literals).
- Primary actions use warm-black labels on orange; orange text uses `primary-text`.
- Dark mode works through theme variables (not `dark:` pairs) and looks designed.
- `tsc`, `lint`, `build` pass; the document print output is unchanged.
- Final message: a concise changelog by phase, the grep-gate results, and a list of every `TODO(design)` left.
