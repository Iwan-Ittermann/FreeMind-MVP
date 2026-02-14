

# Theme Toggle via Admin Dashboard

## Overview
Replace the URL/hostname-based theme detection with an admin-controlled setting stored in the `app_settings` table. The admin toggles the theme from the dashboard, and all users see the selected theme in real time.

## Changes

### 1. Database: Store theme in `app_settings`
- Insert a default row with `key = 'active_theme'`, `value = 'classic'` via migration
- Reuses the existing `app_settings` table and its RLS policies (publicly readable, admin-writable)

### 2. Update `ThemeContext.tsx`
- Remove hostname and query-param detection
- Fetch `active_theme` from `app_settings` using `useAppSetting('active_theme')`
- Default to `'classic'` while loading or if not found
- Subscribe to realtime changes on `app_settings` so the theme updates live for all connected users

### 3. Add Theme Toggle to Admin Dashboard
- Add a new tab "Theme" (with a Palette icon) to the admin tabs bar
- Simple toggle or select: "Classic" vs "City"
- Uses `useUpdateAppSetting` to write `{ key: 'active_theme', value: 'city' | 'classic' }`
- Shows current active theme with a visual preview label

### 4. Cleanup
- Remove the `detectTheme()` function (no more hostname/query-param logic)
- The `freemind.city` domain can still point to the app but will no longer influence the theme -- the admin setting controls it globally

## Technical Details

**Files modified:**
- `src/themes/ThemeContext.tsx` -- fetch theme from DB instead of URL detection
- `src/pages/Admin.tsx` -- add Theme tab with toggle

**Files unchanged:**
- `src/themes/types.ts`, `src/themes/tokenizer.ts`, all city renderer files -- no changes needed
- `src/hooks/useAppSettings.ts` -- already has the hooks we need
- `src/components/graph/OpinionGraph.tsx` -- already consumes `useFreeMindTheme()`

**Migration:**
```sql
INSERT INTO app_settings (key, value)
VALUES ('active_theme', 'classic')
ON CONFLICT DO NOTHING;
```

**Realtime:** Enable realtime on `app_settings` so theme changes propagate instantly to all users without page refresh.

