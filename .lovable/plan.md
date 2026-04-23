

## Plan: Voice Messages with Speech-to-Text

### Overview
Add voice message recording to chats. Users tap a microphone button to record audio, which is uploaded to storage and transcribed using Lovable AI (Gemini). Messages display both an audio player and the transcript text.

### 1. Database Migration

Add two columns to `chat_messages`:
- `audio_url text` (nullable) -- public URL of the uploaded audio file
- `transcript text` (nullable) -- speech-to-text result

Create a `voice-messages` storage bucket (public) with RLS policies:
- Authenticated users can upload files
- Public read access for playback

### 2. Edge Function: `transcribe-voice`

New edge function at `supabase/functions/transcribe-voice/index.ts`:
1. Receives `{ messageId }` from client
2. Reads the `audio_url` from `chat_messages` using service role
3. Downloads the audio file
4. Converts audio to base64 and sends to Lovable AI Gateway (Gemini) with a prompt like "Transcribe this audio accurately. Return only the transcription text."
5. Updates the `chat_messages` row with the `transcript` result
6. Returns success/failure

Uses `LOVABLE_API_KEY` (already available) -- no new secrets needed.

### 3. New Hook: `useVoiceRecorder`

File: `src/hooks/useVoiceRecorder.ts`
- Uses browser `MediaRecorder` API to capture microphone audio
- Returns `{ isRecording, startRecording, stopRecording, audioBlob, duration }`
- Outputs WebM/Opus format
- Handles microphone permission requests

### 4. Update `useChatMessages` Hook

Add `sendVoiceMessage(audioBlob)` function:
1. Generate a unique filename
2. Upload blob to `voice-messages` bucket
3. Get public URL
4. Insert `chat_messages` row with `audio_url` set, `content` as placeholder text
5. Call `transcribe-voice` edge function (fire-and-forget)
6. Realtime subscription picks up the transcript update automatically

### 5. UI Changes

**`ChatBubble.tsx`**:
- Detect `audioUrl` prop on the message
- Render an inline `<audio>` player with controls
- Show transcript text below the player (or "Transcribing..." spinner if not yet available)

**`FloatingChat.tsx` and `EmbeddedChatView.tsx`**:
- Add a `Mic` icon button next to the send button
- When no text is typed, show mic button; when text is typed, show send button
- Tap mic to start recording; tap again to stop and auto-send
- Show recording indicator (pulsing red dot + duration timer) while recording

### 6. File Summary

| File | Change |
|------|--------|
| Migration SQL | Add `audio_url`, `transcript` columns; create `voice-messages` bucket + RLS |
| `supabase/functions/transcribe-voice/index.ts` | New -- transcribes audio via Lovable AI |
| `src/hooks/useVoiceRecorder.ts` | New -- MediaRecorder wrapper |
| `src/hooks/useChatMessages.ts` | Add `sendVoiceMessage`, extend `ChatMessage` type with `audioUrl`/`transcript` |
| `src/components/chat/ChatBubble.tsx` | Render audio player + transcript |
| `src/components/chat/FloatingChat.tsx` | Add mic button and recording UI |
| `src/components/chat/EmbeddedChatView.tsx` | Add mic button and recording UI |

