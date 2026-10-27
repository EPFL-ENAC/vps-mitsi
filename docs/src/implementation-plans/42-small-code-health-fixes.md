---
status: draft
issue: 42
last_updated: 2026-10-20
summary: Declare echarts, demote lefthook, SVG icons without webfonts, every UI string and number through vue-i18n, with checks that keep it that way.
---

# Small code-health fixes (#42 / VM-42) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the five code-health gaps of #42 that are still open on `origin/main@97b728b`, each guarded by a check so it cannot drift back.

**Architecture:** Refactors first (deps, ligature to SVG with the same glyphs, strings and numbers through vue-i18n), then the two visible changes (Scope icon, webfonts dropped), each in its own commit. The guards follow the pattern of the sibling repo `co2-calculator/frontend`: SVG constants, `iconSet: 'svg-material-icons'`, `extras: []`, and a check that fails on a ligature string. Here the guards are `node --test` files, because that is this repo's test runner.

**Tech Stack:** Quasar 2 (app-vite), Vue 3.5, vue-i18n 11, ESLint 9 flat config, `node --test` with `tests/register.mjs`.

**Spec:** GitHub issue #42 (git-board VM-42). The section below lists where the issue is out of date.

## Issue drift (checked against `origin/main@97b728b`, 2026-10-20)

| Issue item | State on main |
| --- | --- |
| 3. Two import paths (`models/mitsi.ts`) | **Done.** Removed by the schema split (`5029dfd`). `BlockKey`/`BlockStatus` are in `src/types/ui.ts`, `MITSI_STORAGE_KEY` is in `src/stores/surveyData.ts`. Nothing to do. |
| 5. `'Underlying services'` fallback | **Gone.** No longer in `TotalSplitPieChart.vue`. |
| 1. `DatacentersPieChart.vue` | Renamed `DatacentersTreemapChart.vue`. The issue is still valid. |
| 4. "7 icons" | Now **11 names in 13 places**: `menu`, `home`, `print` ×2, `delete` ×3, `restart_alt`, `scope`, `dns`, `bolt`, `insights`, `info_outline` ×2 (one is a raw `<span class="material-icons">`), `arrow_back`. |
| 4. `roboto-font` | Unused. `app.scss` sets `body { font-family: 'Google Sans Flex' }`. Drop it. |
| 5. Raw strings | Plus `aria-label="Back"` (`ReportPreviewPage.vue:5`). `no-raw-text` will list the rest. |
| 8. `@intlify/eslint-plugin-vue-i18n` key rules | `no-missing-keys`/`no-unused-keys` can't read `.ts` message files (the plugin loads only `.json`/`.json5`/`.yaml`/CJS `.js`). See Decision 2. |

## Global Constraints

- Refactor and behaviour change land in **separate commits**. Refactor commits change no pixel and no string.
- `npm run check` (format, lint `--max-warnings=0`, typecheck, test) passes after **every** commit.
- No new runtime dependency. One new devDependency at most (`@intlify/eslint-plugin-vue-i18n`, for `no-raw-text`).
- `formatKg` output for locale `en` stays byte-identical: `48,852.77`, `0.00`, `—` for `null`.
- Icons are SVG constants from `@quasar/extras` (`mat*`, `outlined*`). No ligature strings.
- Branch `refactor/42-small-code-health-fixes-icons-texts-and`, PR into `dev`.

## Decisions needed (defaults chosen; say so to change)

1. **Scope icon.** Default `matCropFree`: a frame, for the system boundary the Scope page defines. Alternatives: `matTrackChanges`, `matCenterFocusStrong`, `matAdjust`. All exist in `@quasar/extras@1.18.0`.
2. **Key checks.** Default: `no-raw-text` from the plugin, plus a ~30-line `tests/i18n-keys.test.mjs` for missing and unused keys. Messages stay `.ts` with their 24 section comments, as in co2-calculator. Alternative: move the messages to JSON so the plugin's `no-missing-keys`/`no-unused-keys` work. That touches 12 import sites, loses the comments, and `no-unused-keys` still needs `ignores` for the 12 dynamic prefixes. vue-tsc does **not** catch missing keys today: `$t('doesNotExistKey')` typechecks clean (tried 2026-10-20).

## Review Focus

- Quasar's built-in icons (QSelect arrow, QTable pagination, QFile clear, Dialog/Notify) render as ligature **text** once the fonts go, unless `framework.iconSet: 'svg-material-icons'` is set. Task 6 owns it.
- Tests assert `doesNotMatch(/info_outline/)`. After the SVG switch the word is gone and those assertions pass for any output. Task 2 replaces them.
- The test loader resolves `src/x` to `src/x.ts` only, not to a directory index. Import `src/i18n/index`, never `src/i18n`. It doesn't resolve `#q-app/*` either, so `format.ts` must not import `src/boot/i18n`.
- Dynamic keys (`` t(`inventoryColumns.${…}`) ``, `t('scopeTimeUnit_' + …)`, `labelKey: 'main…'`) look unused to a naive scan. Task 5's prefix list covers them.
- Template punctuation (`·`, `—`) trips `no-raw-text`. Task 4's `ignorePattern` allows it.

---

### Task 1: Declare `echarts`, move `lefthook` to dev

**Files:** Modify `frontend/package.json`, `frontend/package-lock.json`

- [ ] **Step 1:** `npm i echarts@^6.0.0` (vue-echarts 8.3.1 peer range; 6.1.0 is already installed) and `npm i -D lefthook`. Check that `package.json` has `"echarts": "^6.0.0"` under `dependencies` and `lefthook` only under `devDependencies`.
- [ ] **Step 2:** `npm ls echarts lefthook` shows both at top level. `npm run check` passes.
- [ ] **Step 3:** Commit `build(deps): declare echarts, move lefthook to devDependencies`.

### Task 2: Ligature icons → SVG constants, same glyphs (refactor)

The fonts stay loaded in this task. Only the call sites change, so nothing moves on screen. `scope` is left for Task 6.

**Files:**
- Modify: `src/layouts/MainLayout.vue` (`menu`, `home`, `print`, block icons `dns`/`bolt`/`insights`; `BlockDef.icon` stays `string`)
- Modify: `src/pages/ReportPreviewPage.vue` (`arrow_back`, `print`), `src/pages/ResultsPage.vue` (`info_outline`)
- Modify: `src/components/scope/ScopeBoundaryItemsTable.vue`, `ScopeDatacentersTable.vue`, `inventory/HardwareInventoryTable.vue` (`delete`), `energy/EnergyDatacentersTable.vue` (`restart_alt`)
- Modify: `src/components/ComputationResultDisplay.vue:189,287`
- Test: `tests/computation-result-display.test.mjs:55,255`

**Mapping:** `matMenu matHome matPrint matDelete matRestartAlt matDns matBolt matInsights matArrowBack` from `@quasar/extras/material-icons`. `info_outline` → `outlinedInfo` from `@quasar/extras/material-icons-outlined` (there is no `matInfoOutline`). Bind with `:icon="matDelete"` / `:name="outlinedInfo"`.

- [ ] **Step 1: Make the tests see the default indicator.** In `tests/computation-result-display.test.mjs`, replace `/info_outline/` with `/q-icon/` at :55 and :255. Add one positive test, `default indicator renders the info icon`: render a `partial` computation with no `indicator` slot, then `assert.match(html, /class="q-icon[^>]*><svg/)`. QIcon renders `<i class="q-icon …"><svg>`, see `quasar/src/components/icon/QIcon.js:328`.
- [ ] **Step 2:** `npm test`. The new positive test fails, because the span renders no `<svg`.
- [ ] **Step 3:** In `ComputationResultDisplay.vue`, replace the span with `<QIcon :name="outlinedInfo" size="18px" aria-hidden="true" />`. Import `QIcon` from `quasar` the same way `QTooltip` is imported, then delete the `.computation-result-display__indicator .material-icons` CSS rule. Switch the other files per the mapping.
- [ ] **Step 4:** `npm run check` passes. `npm run dev` shows the same glyphs as before (Scope is still broken, which is expected).
- [ ] **Step 5:** Commit `refactor(icons): use @quasar/extras SVG constants instead of ligature strings`.

### Task 3: `formatKg` through vue-i18n `numberFormats` (refactor)

Zero call-site changes. `formatKg` keeps its `(n: number | null) => string` signature, because about 10 sites pass it by reference (`:format-value="formatKg"`).

**Files:**
- Modify: `src/i18n/index.ts`. It now owns `export const i18n = createI18n({ locale: 'en', legacy: false, messages, numberFormats: { en: { kg: { minimumFractionDigits: 2, maximumFractionDigits: 2 } } } })`, plus the `declare module 'vue-i18n'` block moved from boot, with `DefineNumberFormat { kg: Intl.NumberFormatOptions }`. Import messages as `src/i18n/en-GB/index`; the test loader can't resolve `./en-GB`.
- Modify: `src/boot/i18n.ts`, which shrinks to `app.use(i18n)` and the existing `window.i18nGlobal` line.
- Modify: `src/utils/format.ts`. `formatKg` returns `'—'` for `null`, else `i18n.global.n(n, 'kg')`. Import from `src/i18n/index`. No `@ts-expect-error` (co2-calculator needed two, so type `DefineNumberFormat` properly instead).
- Test: `tests/results-formatting.test.mjs`

**Interfaces — Produces:** `i18n` (named export of `src/i18n/index.ts`), `MessageSchema`, `MessageLanguages` (moved from boot).

- [ ] **Step 1:** Add `formatKg pins the en output`: `formatKg(48852.77) === '48,852.77'`, `formatKg(0) === '0.00'`, `formatKg(1234.5) === '1,234.50'`, `formatKg(null) === '—'`.
- [ ] **Step 2:** `npm test` passes **before** the change (characterization).
- [ ] **Step 3:** Implement as above.
- [ ] **Step 4:** `npm run check` passes with the test unchanged.
- [ ] **Step 5:** Commit `refactor(i18n): format kg through vue-i18n numberFormats`.

### Task 4: Every template string through i18n, enforced by `no-raw-text`

**Files:**
- Modify: `frontend/package.json` (`npm i -D @intlify/eslint-plugin-vue-i18n@^4.5.1`; its `jsonc-eslint-parser`/`yaml-eslint-parser` peers install automatically)
- Modify: `frontend/eslint.config.js`. Add `...vueI18n.configs['flat/base']` and, for `files: ['src/**/*.vue']`, `'@intlify/vue-i18n/no-raw-text': ['error', { ignorePattern: '^[\\s\\-—–·•:;,.()%#/0-9]+$' }]`. Tune the pattern only for punctuation, never for words.
- Modify: `src/layouts/MainLayout.vue` (`alt="EPFL"` → `mainLogoAlt: 'EPFL'`, `MITSI` → `mainBrand: 'MITSI'`), `src/pages/ReportPreviewPage.vue:5` (`aria-label="Back"` → `reportBackAriaLabel: 'Back'`), plus every other hit
- Modify: `src/i18n/en-GB/index.ts`. Add the keys with **identical** English text, each in its section.

- [ ] **Step 1:** Add the rule and run `npm run lint`. The hits are the to-do list. If there are none, the rule isn't wired.
- [ ] **Step 2:** Move each hit into `en-GB` with the same text. Attributes go through `:alt="$t(...)"` / `:aria-label="$t(...)"`.
- [ ] **Step 3:** `npm run check` passes. The UI text is unchanged.
- [ ] **Step 4:** Commit in two parts: `refactor(i18n): move hard-coded UI strings to messages`, then `build(lint): forbid raw text in templates`.

### Task 5: Missing and unused message keys fail the tests

**Files:** Create `tests/i18n-keys.test.mjs`. Modify `src/i18n/en-GB/index.ts` (delete `scopeFuDuration`, `scopeFuResourceCount`).

**Approach:**
- Flatten `en` (imported from `../src/i18n/en-GB/index.ts`) to dotted keys.
- Read every `src/**/*.{vue,ts}` except `src/i18n/`.
- *Missing:* every static `t('k')` / `$t('k')` / `keypath="k"` must be a flattened key.
- *Unused:* a key counts as used if it appears as a quoted literal anywhere in `src`, or starts with one of the dynamic prefixes. List the prefixes in a `DYNAMIC` array: `assessmentSection.`, `computationResult.`, `computationNames.`, `energyColumns.`, `energyMonitorUnit_`, `inventoryColumns.`, `inventoryGroups.`, `inventoryCategory_`, `scopeBoundaryColumns.`, `scopeDatacenterColumns.`, `scopeTimeUnit_`, `scopeResourceType.`.

- [ ] **Step 1:** Write the two tests, `every t() key exists` and `every message key is used`. A failure lists the offending keys.
- [ ] **Step 2:** `npm test`. *unused* fails on exactly `scopeFuDuration`, `scopeFuResourceCount`; *missing* passes. If either test lists other keys, the scan or the `DYNAMIC` list is wrong: fix the test, not the messages.
- [ ] **Step 3:** Delete the two keys. `npm run check` passes.
- [ ] **Step 4:** Sanity: a temporary `$t('nope')` makes *missing* fail. Revert.
- [ ] **Step 5:** Commit `test(i18n): fail on missing or unused message keys`.

### Task 6: Scope icon, drop the webfonts (behaviour)

**Files:**
- Modify: `src/layouts/MainLayout.vue:264` (`icon: 'scope'` → `matCropFree`, or the icon chosen in Decision 1)
- Modify: `frontend/quasar.config.ts`. Set `extras: []` (drop the commented template list too) and `framework.iconSet: 'svg-material-icons'`.
- Create: `tests/no-ligature-icons.test.mjs`. This is the co2-calculator `scripts/check-icon-strings.mjs` rules, cut down to one test. Build the ligature set from `node_modules/@quasar/extras/material-icons{,-outlined}/icons.json`, then fail on `icon="<ligature>"`, `name="<ligature>"`, `icon: '<ligature>'` or `class="material-icons"` in `src/**/*.{vue,ts}`.

- [ ] **Step 1:** Write the guard test. `npm test` fails on exactly `MainLayout.vue:264 icon: 'scope'`, which proves the guard works.
- [ ] **Step 2:** Swap the Scope icon. The guard passes. Commit `fix(nav): give Scope a real icon`.
- [ ] **Step 3:** Change `quasar.config.ts`. `npm run build`, then `find dist -name '*.woff*'` finds no Material Icons or Roboto font files.
- [ ] **Step 4:** `npm run dev`, then check by eye: Scope icon, a QSelect dropdown arrow (Hardware page), QTable pagination, the QFile in the header, the Import warning dialog. All are SVG, none is a word.
- [ ] **Step 5:** `npm run check` passes. Commit `build(icons): drop icon webfonts, Quasar iconSet to SVG`.

### Task 7: Close the loop

- [ ] Set this plan to `status: delivered`, update `last_updated`, and record any divergence.
- [ ] Update issue #42 with the drift table above (draft in the session; post only after the author approves). Tick the delivered checkboxes.
- [ ] Open the PR into `dev` with `Closes #42`.
