

# Tutorial Triggers Redesign + Expandable Video Player

## Overview

This plan removes all automatic tutorial triggers and replaces them with floating action buttons (FABs) on `/home` and `/chat`. The uploaded video tutorial will be hosted on Lovable Cloud Storage and played in an **expandable mini-player**.

---

## Video Hosting: Lovable Cloud Storage

The uploaded video `FreeMind_VideoTutorial_mit_UT.mp4` will be stored in a new Lovable Cloud Storage bucket.

### Storage Setup

**Create a public storage bucket:**

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('tutorials', 'tutorials', true);

-- RLS policy: Allow public read access
CREATE POLICY "Public can view tutorial videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'tutorials');
```

**Video file will be uploaded to:**
`tutorials/freemind-video-tutorial.mp4`

**Public URL format:**
`https://jmkbkwhiucnksdygbomc.supabase.co/storage/v1/object/public/tutorials/freemind-video-tutorial.mp4`

---

## Implementation Plan

### Phase 1: Remove Automatic Tutorial Triggers

**File: `src/pages/Auth.tsx`**
- Remove lines 116-119 (auto-start tutorial after signup)
- Keep navigation to `/home` after signup
- Remove `startTutorial` and `hasCompletedTutorial` imports from TutorialContext

**File: `src/pages/Chat.tsx`**
- Remove lines 38-54 (auto-start chat tutorial on first open)
- Remove `tutorialAttemptedRef` ref (line 16)
- Remove `hasChatTutorialBeenSeen` import (line 8)

---

### Phase 2: Create New Components

#### 2.1 FloatingHelpButton Component

**New file: `src/components/FloatingHelpButton.tsx`**

Features:
- Fixed position FAB in bottom-right corner
- Expandable radial menu with smooth animations (Framer Motion)
- Three buttons when expanded:
  - **Tutorial** (GraduationCap icon)
  - **Video** (Play icon)
  - **Close** (X icon)
- Semi-transparent with backdrop blur
- Touch-friendly (larger targets on mobile)

```text
Collapsed state:     Expanded state:
                     
    ┌───┐               [Tutorial 🎓]
    │ ? │      →        [Video ▶]
    └───┘               ┌───┐
                        │ ✕ │
                        └───┘
```

**Props:**
```typescript
interface FloatingHelpButtonProps {
  onStartTutorial: () => void;
  onOpenVideo: () => void;
  tutorialLabel?: string;
  videoLabel?: string;
}
```

#### 2.2 VideoMiniPlayer Component

**New file: `src/components/VideoMiniPlayer.tsx`**

Features:
- **Two modes:** Mini (320×180px corner) and Expanded (80% viewport)
- Draggable in mini mode
- Toggle button to expand/collapse
- Close button
- Standard HTML5 video controls
- Smooth scale/position animations

```text
Mini Mode:                    Expanded Mode:
┌─────────────────────────┐   ┌─────────────────────────────────────┐
│ ═══════════ [⬜][✕] │   │                                     │
│                         │   │                                     │
│      ▶ Video            │   │          ▶ Video (large)           │
│      320×180            │   │             80% viewport            │
│                         │   │                                     │
└─────────────────────────┘   │                                     │
                              │ ═════════════════════ [🔲][✕] │
                              └─────────────────────────────────────┘
```

**Props:**
```typescript
interface VideoMiniPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  videoSrc: string;
}
```

---

### Phase 3: Integrate Components

**File: `src/pages/TopicView.tsx` (which is `/home`)**

- Import `FloatingHelpButton` and `VideoMiniPlayer`
- Add state for video player: `const [videoOpen, setVideoOpen] = useState(false)`
- Add FloatingHelpButton before the Tutorial component:
  ```typescript
  <FloatingHelpButton
    onStartTutorial={() => tutorial.startTutorial()}
    onOpenVideo={() => setVideoOpen(true)}
  />
  <VideoMiniPlayer
    isOpen={videoOpen}
    onClose={() => setVideoOpen(false)}
    videoSrc="https://jmkbkwhiucnksdygbomc.supabase.co/storage/v1/object/public/tutorials/freemind-video-tutorial.mp4"
  />
  ```

**File: `src/pages/Chat.tsx`**

- Import `FloatingHelpButton` and `VideoMiniPlayer`
- Add state for video player
- Add FloatingHelpButton to non-read-only mode (after FloatingChat):
  ```typescript
  {!isReadOnly && (
    <>
      <FloatingHelpButton
        onStartTutorial={() => chatTutorial.startTutorial()}
        onOpenVideo={() => setVideoOpen(true)}
      />
      <VideoMiniPlayer
        isOpen={videoOpen}
        onClose={() => setVideoOpen(false)}
        videoSrc="https://..."
      />
    </>
  )}
  ```

---

### Phase 4: Add Translations

**File: `src/i18n/locales/en.json`**
```json
{
  "help": {
    "startTutorial": "Start Tutorial",
    "watchVideo": "Watch Video",
    "closeHelp": "Close"
  },
  "videoPlayer": {
    "close": "Close video",
    "expand": "Expand",
    "minimize": "Minimize"
  }
}
```

**File: `src/i18n/locales/de.json`**
```json
{
  "help": {
    "startTutorial": "Tutorial starten",
    "watchVideo": "Video ansehen",
    "closeHelp": "Schließen"
  },
  "videoPlayer": {
    "close": "Video schließen",
    "expand": "Vergrößern",
    "minimize": "Verkleinern"
  }
}
```

---

## File Changes Summary

### New Files

| File | Purpose |
|------|---------|
| `src/components/FloatingHelpButton.tsx` | Expandable FAB with tutorial/video options |
| `src/components/VideoMiniPlayer.tsx` | Expandable draggable video player |

### Modified Files

| File | Changes |
|------|---------|
| `src/pages/Auth.tsx` | Remove auto-tutorial trigger (lines 116-119) |
| `src/pages/Chat.tsx` | Remove auto-chat-tutorial trigger, add FloatingHelpButton + VideoMiniPlayer |
| `src/pages/TopicView.tsx` | Add FloatingHelpButton + VideoMiniPlayer |
| `src/i18n/locales/en.json` | Add help and videoPlayer translation keys |
| `src/i18n/locales/de.json` | Add German translations |

### Database Migration

Create storage bucket for video hosting:
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('tutorials', 'tutorials', true);

CREATE POLICY "Public can view tutorial videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'tutorials');
```

---

## UI Design Details

### Floating Help Button

| Property | Value |
|----------|-------|
| Position | Fixed, bottom: 24px, right: 24px |
| Size (collapsed) | 56px diameter |
| Size (expanded options) | 48px diameter each |
| Background | `bg-primary` with ring glow |
| Animation | Spring physics for expand/collapse |
| Z-index | 40 (below modals) |

### Video Mini Player

| Property | Mini Mode | Expanded Mode |
|----------|-----------|---------------|
| Position | Bottom-right, draggable | Center, fixed |
| Size | 320×180px (16:9) | 80vw × 45vw (max 1280×720) |
| Background | Black with shadow | Black with backdrop overlay |
| Controls | Native HTML5 | Native HTML5 |
| Animation | Scale + opacity | Scale from mini position |

---

## Technical Details

### Video File Handling

The uploaded video file will be:
1. Copied to the project temporarily
2. Uploaded to Lovable Cloud Storage bucket via migration
3. Referenced by public URL in the VideoMiniPlayer

### Responsive Behavior

- **Mobile:** FAB 56px, video expands to 95vw
- **Desktop:** FAB 48px, video expands to 80vw max

### Performance

- Video uses `preload="metadata"` (don't load full video until play)
- Player only mounts when `isOpen={true}`
- Animations use `will-change` for GPU acceleration

---

## Next Steps After Implementation

1. Run database migration to create storage bucket
2. Upload video file to storage bucket
3. Test floating button on `/home` and `/chat`
4. Test video player expand/collapse functionality
5. Verify tutorials still work when triggered from FAB

