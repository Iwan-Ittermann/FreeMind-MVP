## Change disagreement rating to "Meinungsunterschied" 10-point meter + relabel chat button + layout tweak

Scope: three related UI changes in the selected-opinion panel (`TTBottomPanel.tsx`) and its rating widget (`TTEmojiRating.tsx`), plus i18n keys.

### 1. Rating widget → 10-step "opinion difference meter"

Rework `src/components/tt/TTEmojiRating.tsx`:

- Replace the 5 named options with **10 buttons** representing 10%, 20%, … 100% (values 10, 20, … 100). (Question below on whether to keep 0% as an 11th step.)
- Render as a compact horizontal row of small pill buttons showing the percentage (e.g. "10%"). Active step highlighted using the same accent styling pattern already used (`ring-2 ring-foreground/20`, `scale-105`).
- Keep API compatible: `value: number`, `onChange(value)`. `nearestIndex` maps stored value (0–100) to the closest step.
- Persisted value remains 0–100 on `opinion_ratings.disagreement`, so no DB / hook changes.

### 2. Label under meter → "Meinungsunterschied"

In `TTBottomPanel.tsx`, replace the two-line `tt.fullyAgree` / `tt.fullyDisagree` end-labels with a single centered caption "Meinungsunterschied" (i18n key `tt.opinionDifferenceLabel`).

### 3. i18n

`src/i18n/locales/de.json` and `en.json` in the `tt` block:

- `letsChat`: DE `"Diskutieren"` (currently `"Let's chat"`), EN keep `"Let's chat"`.
- Add `opinionDifferenceLabel`: DE `"Meinungsunterschied"`, EN `"Opinion difference"`.
- Leave `fullyAgree` / `fullyDisagree` in place (still used elsewhere — quick check will confirm).

### 4. Layout: chat button vertically centered between opinion text and meter

Restructure the selected-opinion card body in `TTBottomPanel.tsx` from the current single row (`[meter] [Diskutieren]`) into a vertical stack:

```text
┌──────────────────────────────┐
│      opinion text            │
│                              │
│      [ Diskutieren ]         │  ← centered
│                              │
│  [10%][20%]…[100%]  meter    │
│      Meinungsunterschied     │
└──────────────────────────────┘
```

- Opinion text block stays as-is.
- New centered "Diskutieren" button row (`flex justify-center my-2`). Keep existing highlight/disabled/onClick logic.
- Below it: meter + caption. Keep the `highlightDisagreementScale` ring wrapper around this block.

### Files touched

- `src/components/tt/TTEmojiRating.tsx` — rewrite as 10-step meter.
- `src/components/tt/TTBottomPanel.tsx` — restructure layout, swap caption, keep behavior.
- `src/i18n/locales/de.json` — update `tt.letsChat`, add `tt.opinionDifferenceLabel`.
- `src/i18n/locales/en.json` — add `tt.opinionDifferenceLabel`.

No DB, no RLS, no hook changes. Data on-disk stays 0–100.

### One clarifying question

The current scale includes a true "0" (full agreement). Do you want the new 10-point scale to be:

- **A. 10%, 20% … 100%** (10 steps, no zero) — matches "10 point scale" literally, but users can never say "identical".
- **B. 0%, 10%, 20% … 100%** (11 steps) — keeps a "no difference" option. B PLEASE, 11 STEPS

I'll default to **A** unless you say otherwise.