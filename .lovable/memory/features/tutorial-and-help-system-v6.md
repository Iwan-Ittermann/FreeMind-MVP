# Memory: features/tutorial-and-help-system-v6
Updated: 2026-02-02

The platform provides two interactive tutorials (Onboarding and Chat) with fully localized content and administrative overrides. Tutorials are accessed via an expandable Floating Help Button (FAB) located in the bottom-right corner of the `/home` and `/chat` pages.

**Floating Help Button (FAB):**
- Present on both `/home` (Index) and `/chat` (Chat) pages
- On `/home`: Starts the Onboarding tutorial, video plays from beginning
- On `/chat`: Starts the Chat-specific tutorial, video starts at 00:39

**Video Tutorial:**
- Uses `VideoMiniPlayer` component with optional `startTime` prop (in seconds)
- On `/chat`, video auto-seeks to 39 seconds for chat-relevant content
- On `/home`, video plays from the beginning

**Button Animations:**
- CTA buttons use `animate-pulse-fast` class (1s cycle vs 2s default)
- Affected buttons: "Jetzt starten" on About page, Sign Up and Add Opinion on Header
