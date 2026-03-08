## Plan: Bottom Bar, Desktop Panels, Signal Theme Overhaul, Mobile Chat-in-Sidebar, /chat Removal

### ✅ Step 1 Complete

1. ✅ Mobile Bottom Tab Bar (`BottomTabBar.tsx`) — 3 buttons: Opinions, Chats, Menu
2. ✅ Mobile Bottom Panel (`BottomPanel.tsx`) — slide-up panel, no overlay, graph stays visible
3. ✅ Graph shrinking on mobile panel open — 55% shrink with smooth transition
4. ✅ Sidebar highlighting — clicking opinion/chat highlights node in graph
5. ✅ Labels removed — mobile: none, desktop: highlighted-only
6. ✅ Desktop 3-column layout — persistent side panels with collapse toggles
7. ✅ Requests merged into ChatsSidebar — tabs: Chats | Requests
8. ✅ Header cleanup — mobile: logo only, desktop: logo + burger
9. ✅ MainMenu simplified — only About, Tutorial, Settings, Login/Logout
10. ✅ /chat route redirects to /home
11. ✅ Signal theme warm earth palette — charcoal bg, gold core, sage middle, burnt orange outer, stone inactive
12. ✅ Core/middle node rings removed

### Step 2 (Later)

- Unread badge audit
- TopicView.tsx /chat cleanup
- Delete RequestsSidebar.tsx
- Delete /chat route entirely
- Button design audit across themes
