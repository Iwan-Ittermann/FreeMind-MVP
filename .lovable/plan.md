## Plan: Topic Page i18n Tweaks + Chat Sidebar Default

### 1. Update opinion textarea placeholder

File: `src/i18n/locales/de.json` and `src/i18n/locales/en.json`

The placeholder used in `SubmitOpinionDialog.tsx` is `opinion.whatDoYouThink`.

- DE: `"whatDoYouThink": "Was ist deine Meinung dazu?"`
- EN: `"whatDoYouThink": "What is your opinion on this?"`

(I'll also align the related `viewPlaceholder` key to keep it consistent — DE: `"Was ist deine Meinung zur Diskussionsfrage?"`, EN: `"What is your opinion on the given topic?"`)

### 2. Update "Sign in to see your chats" copy

File: `src/i18n/locales/de.json` and `src/i18n/locales/en.json`

Key `sidebar.signInToSeeChats` (used in `ChatsSidebar.tsx` line 291):

- DE: `"Melde dich an, um mitzudiskutieren."`
- EN: `"Sign in to join the discussion."`

### 3. Remove "Join the conversation" empty state + don't auto-open chat sidebar

File: `src/components/ChatsSidebar.tsx` — remove the entire `!myOpinion` empty-state block (lines 296–310: the MessagesSquare icon, the "Join the conversation" heading, the "Submit opinion first" subtitle, and the `opinionCtaNode` slot). When the user has no opinion, the sidebar simply won't be shown.

File: `src/pages/Index.tsx` — change `rightOpen` default initialization so that on desktop the chat sidebar is **closed by default when the user has not yet submitted an opinion**:

- Replace `const [rightOpen, setRightOpen] = useState(true);` with a state that initializes to `true` only when there is reason to (we don't yet know `myOpinion` at init, so use `false` as initial, and add a `useEffect` that opens it once when `myOpinion` becomes available — but only on first transition, so the user can still manually close it later).
- Implementation: track a ref `hasAutoOpenedRightRef` to ensure we only auto-open once when `myOpinion` first appears, preserving manual user toggles afterward.

Mobile is unaffected since the chats panel is opt-in via the bottom tab bar (`activeMobilePanel` defaults to `null`).

### Files to modify


| File                              | Change                                                                                 |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| `src/i18n/locales/de.json`        | Update `opinion.whatDoYouThink`, `opinion.viewPlaceholder`, `sidebar.signInToSeeChats` |
| `src/i18n/locales/en.json`        | Same keys, English equivalents                                                         |
| `src/components/ChatsSidebar.tsx` | Remove the `!myOpinion` empty-state block                                              |
| `src/pages/Index.tsx`             | Default `rightOpen` to `false`; auto-open once when `myOpinion` first becomes truthy   |
