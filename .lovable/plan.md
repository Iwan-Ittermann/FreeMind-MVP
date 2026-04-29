Plan:

1. Delay the automatic tutorial opening on `/`
  - Change the initial tutorial state so first-time users do not see the onboarding overlay immediately.
  - Add a short timer, likely around 1 second, before opening the tutorial for users who have not completed it.
  - Keep manual “Restart tour” immediate, so clicking it in the menu still opens the tutorial right away.
  - Clear the timer on unmount to avoid stale state updates.
2. Add a flag/language button to the TT header
  - Add a small language button in `TTHeader` next to the existing notification/account icons.
  - Use a flag-style display for the current language, e.g. German/English flags, and open a compact dropdown menu.
  - Reuse the existing i18n language switching behavior (`i18n.changeLanguage`) so it stays consistent with the current app.
  - Ensure the dropdown closes when clicking outside and does not conflict with the notification or account menus.
3. Update the first tutorial step text in both languages
  - German: start with `Hi! Hier kannst du ...`
  - English: start with `Hi! Here you can ...`
  - Keep the text in translation files, preserving the project rule that visible text uses localization keys.
4. Translation effort answer
  - I’ll include a short note after implementation: adding French, Spanish, and Chinese is moderate effort.
  - The current i18n structure is already prepared for more languages, but it would require adding 3 locale JSON files, registering them in `src/i18n/config.ts`, extending the language switcher/header language list, and translating all visible strings. The main effort is translation QA, not technical wiring.

Technical details:

- Likely files to change:
  - `src/pages/TT.tsx` for delayed tutorial auto-open logic.
  - `src/components/tt/TTHeader.tsx` for the language menu.
  - `src/i18n/locales/de.json` and `src/i18n/locales/en.json` for the first tutorial text.
- No backend/database changes needed.