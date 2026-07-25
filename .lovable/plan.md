# FAQ Route + Admin Editor

## 1. Database
New table `faq_items`:
- `id` uuid pk
- `question` text
- `answer` text (markdown supported)
- `sort_order` int
- `created_at`, `updated_at` timestamptz

RLS + grants:
- `GRANT SELECT` to `anon`, `authenticated` (public read).
- `GRANT ALL` to `service_role` (admin edits go through the `admin2-overview` edge function using the service role — consistent with existing admin pattern).
- Policy: public read only. No client-side writes.

## 2. Public page `/faq`
New `src/pages/Faq.tsx`:
- Fetches `faq_items` ordered by `sort_order, created_at`.
- Renders questions as collapsible items (shadcn `Accordion`, `type="multiple"`, all collapsed by default).
- Uses existing landing/nebula styling for visual consistency; header with back link to `/`.
- i18n: page title/subtitle keys added to `de.json` / `en.json`.

Wire route in `src/App.tsx`: `<Route path="/faq" element={<Faq />} />`.

## 3. Admin editor in `/admin2`
Extend `supabase/functions/admin2-overview/index.ts` with password-gated actions:
- `list_faq` → returns all rows ordered.
- `save_faq` → upsert `{ id?, question, answer, sort_order }`.
- `delete_faq` → delete by id.

Add a new "FAQ" section to `src/pages/Admin2.tsx`:
- Table listing questions with inline edit (question, answer textarea, sort_order).
- "Add question" button (creates blank row).
- Save / Delete per row.
- Reuses the existing admin password state.

## 4. Out of scope
No i18n per-item (single-language content stored as-is, matching current email templates). Can be added later if needed.

## Technical notes
- Migration adds table + grants + RLS + public SELECT policy.
- No changes to auth, no new secrets.
- Accordion component already available via shadcn (`@/components/ui/accordion`).
