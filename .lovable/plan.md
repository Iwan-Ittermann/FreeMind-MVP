

# Five Changes

## 1. Expandable Topics Section (show 3 most recent, "more" button)

**What**: Sort topics by latest opinion activity, show only 3 by default, add a "more"/"less" toggle button below.

**How** (`src/pages/Home.tsx`):
- Add a query for latest opinion `created_at` per topic to sort by most recent activity
- Add `const [showAll, setShowAll] = useState(false)` state
- Slice `topics` to first 3 unless `showAll` is true
- Add a "more" / "less" button below the grid
- Add i18n keys: `landing.home.showMore` (EN: "More", DE: "Mehr"), `landing.home.showLess` (EN: "Less", DE: "Weniger")

## 2. Latest Opinions Bubbles Section

**What**: New section below topics showing the most recent opinions as speech-bubble chips, each with a topic pill.

**How** (`src/pages/Home.tsx`):
- Add a new query fetching latest 6-9 opinions from `opinions_public` ordered by `created_at DESC`, joined with topic title
- Render as a section with heading (EN: "Recent Opinions", DE: "Neueste Meinungen")
- Each opinion as a rounded bubble showing truncated text + a small colored pill with the topic name
- Clicking navigates to the topic
- Add i18n keys: `landing.home.recentOpinions`

## 3. List All Tooltips and Toasts

**What**: Compile a comprehensive list from the codebase. This is a research output, not code — I'll include it in the response.

**Toasts found** (excluding tutorial):
- `config.signOutFailed` / `config.signedOut` / `config.passphraseCopied` / `config.failedToCopy` / `config.passphraseDownloaded` (MainMenu)
- `Failed to save rating` (Chat.tsx)
- `chat.failedToSaveRating` (EmbeddedChatView, FloatingChatWindow)
- `No topic found` / `AI Bot settings saved` / `Failed to save` (AIBotPanel)
- `Theme switched to "..."` / `Failed to update theme` (ThemePanel)
- `admin.tutorial.saved` / `admin.tutorial.saveError` / `admin.tutorial.stepMuted` / `admin.tutorial.stepUnmuted` (TutorialSettingsPanel)
- `URL copied to clipboard` / `Topic archived` / `Topic deleted` / `Topic restored` + error variants (TopicPanel)
- `Title is required` (CreateTopicDialog)
- `auth.passphraseCopied` / `auth.passphraseDownloaded` / `auth.welcomeBack` / `auth.invalidPassphrase` (AuthForm)
- `Successfully joined topic!` / `Failed to join topic` (TopicJoin)
- `index.chatRequestSent` / `index.chatRequestAccepted` / `index.chatRequestDeclined` / `index.failedToSendRequest` / `index.failedToAcceptRequest` / `index.failedToDeclineRequest` (Index)
- Various admin toasts in FakeNodesPanel, NodeManagementPanel, EditSiteTitleDialog, EditTopicTitleDialog, ReportDialog, SubmitOpinion

**Tooltips** (`title=` attributes):
- `home.loggedIn` (Home.tsx — green dot)
- `Block user` / `Unblock user` (FloatingChat)
- `Auto-translate` (FloatingChat)
- `I see you` / `Reply` (ChatBubble)
- Opinion text on minimized chat bubble (MinimizedChatBubble)
- `Ask AI to Help` (AIConciliateButton)
- `Edit topic` (TopicPanel)
- `Save rating` / `Rating saved` (VerticalRatingSlider)

## 4. Rename Requests Tab to "Anfragen" in DE

**How**: The `ChatsSidebar.tsx` line 337 uses `t('sidebar.requests', 'Requests')` with a fallback. Add the key to both locale files:
- `de.json`: `"sidebar": { "requests": "Anfragen" }` (merge into existing sidebar keys if any)
- `en.json`: `"sidebar": { "requests": "Requests" }`

## 5. Fix RatingSliders Respect Label

**What**: Remove the "Respect" text label above the slider. Make both endpoint icons colored (HeartCrack in rose on the left for disrespectful, Heart in rose on the right for respectful).

**How** (`src/components/chat/RatingSliders.tsx`):
- Remove lines 44-52 (the label row with Heart icon + "Respect" text + numeric value)
- Replace the bottom label row (lines 64-68) with two colored icons:
  - Left: `<HeartCrack className="w-4 h-4 text-rose-400" />`
  - Right: `<Heart className="w-4 h-4 text-rose-400" />`
- Keep the numeric value display somewhere (e.g., centered between icons or above slider)

---

### Files to modify
| File | Change |
|---|---|
| `src/pages/Home.tsx` | Expandable topics + latest opinions section |
| `src/i18n/locales/de.json` | Add `sidebar.requests`, `landing.home.showMore/showLess`, `landing.home.recentOpinions` |
| `src/i18n/locales/en.json` | Same keys in English |
| `src/components/chat/RatingSliders.tsx` | Remove label, add colored endpoint icons |
| `src/components/ChatsSidebar.tsx` | No code change needed (already uses i18n key) |

