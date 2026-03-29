
Goal: make the mobile menu behave exactly like the chats/opinions panels, move auth CTA into the main CTA slot, move the add-opinion CTA into the menu when chat is open on mobile, and remove the startup flash of default topic/theme. I’ll also add a persistent handoff `.txt` note in the repo.

1. Create a handoff/debug text file
- Add a small `.txt` file in the repo summarizing:
  - what was already changed before
  - what is still broken
  - the root causes I found now
  - the exact fixes being applied next
- This gives you a restart point if needed.

2. Unify mobile bottom-bar behavior
- Refactor mobile panel state so settings/menu is treated as the same kind of mobile panel as `opinions` and `chats`, instead of being controlled by a separate `mobileMenuOpen` state.
- Update `BottomTabBar` so all three buttons use the same button class helper and same active-state logic.
- Replace the current special-case menu toggle with one shared toggle path.
- Make graph height, header enlargement, title placement, and panel-open logic all depend on one unified mobile panel state.

Files:
- `src/pages/Index.tsx`
- `src/components/BottomTabBar.tsx`
- likely `src/components/BottomPanel.tsx`
- `src/components/MainMenu.tsx`

3. Make settings/menu panel match the other mobile panels
- Stop rendering the mobile settings menu as a different bottom `Sheet` behavior if that is what keeps making it feel different.
- Render mobile settings content in the same bottom-panel shell used by opinions/chats, so opening/closing/height/animation/stacking all match.
- Keep desktop settings behavior unchanged.

Files:
- `src/components/MainMenu.tsx`
- `src/pages/Index.tsx`
- maybe extract shared menu content if needed

4. Move login/signup CTA out of header and into CTA slot
- Remove the unauthenticated login button from `Header`.
- Reuse the same graph-bottom CTA position currently used by the add-opinion composer.
- When logged out: show colored `Einloggen / Loslegen` CTA there even when inactive.
- When logged in and no opinion: show add-opinion CTA there.
- Keep only one prominent CTA in that area at a time.

Files:
- `src/components/Header.tsx`
- `src/pages/Index.tsx`

5. Move add-opinion CTA into menu when chats are open on mobile
- On mobile + chat panel open + logged in + no opinion:
  - hide the floating/below-graph add-opinion CTA
  - show the CTA inside the menu/settings panel instead
- This prevents the CTA from sitting below the graph while chat is active.
- If logged out, show the colored auth CTA inside the menu as appropriate.

Files:
- `src/pages/Index.tsx`
- `src/components/MainMenu.tsx`

6. Fix the default-data flashing on reload
Root causes found:
- `Index.tsx` hardcodes `How to fix Climate Change?` as fallback title
- `ThemeContext` defaults to `classic` before settings load, while backend value is actually `signal`
- `index.html` currently lacks the documented first-paint background stabilization
- `useAuth` still uses the old listener-first initialization pattern

Planned fix:
- Remove the hardcoded topic fallback from `Index.tsx`; render empty/loading-safe title until real data arrives.
- Add a startup-safe theme strategy in `ThemeContext` so it does not briefly render `classic` before the saved theme loads.
- Restore first-paint background protection in `index.html`.
- Update auth readiness flow so initial session restoration completes before dependent UI assumes unauthenticated/default state.
- If needed, gate initial render of theme/title-sensitive UI behind a lightweight ready state.

Files:
- `src/pages/Index.tsx`
- `src/themes/ThemeContext.tsx`
- `src/hooks/useAuth.ts`
- `index.html`
- possibly `src/App.tsx`

Technical notes
- The mobile inconsistency is not just CSS: the settings button uses separate state and a different container than chats/opinions, so it cannot truly behave the same until the state model and panel shell are unified.
- The title/theme flash is real and reproducible from code inspection, not just a caching issue.
- Backend values currently confirm the real startup state should be:
  - topic title: `Warum sollte der Bundestag ein Verbotsverfahren gegen die AfD prüfen lassen?`
  - theme: `signal`
