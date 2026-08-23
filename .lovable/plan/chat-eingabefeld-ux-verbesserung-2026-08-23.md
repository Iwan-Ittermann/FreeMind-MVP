# Chat-Eingabefeld: UX-Verbesserung

Heute ist das Eingabefeld ein einzeiliges `Input` mit 32 px Höhe und 12 px Schriftgröße (in `EmbeddedChatView` und `FloatingChatWindow`). Das ist auf dem Handy schwer zu treffen, längere Beiträge sind nicht überblickbar, ein Zeilenumbruch ist nicht möglich, und ein angefangener Text ist beim Schließen des Chats verloren.

## Was verbessert wird

1. **Mehrzeiliges, mitwachsendes Feld**
   Einzeiliges Input wird zu einem Textbereich, der beim Schreiben von 1 bis max. 5 Zeilen mitwächst und danach scrollt. Nach dem Senden springt er auf eine Zeile zurück.

2. **Tastatur-Verhalten wie in gängigen Messengern**
   - Desktop: Enter sendet, Shift+Enter macht eine neue Zeile.
   - Mobil: Enter macht eine neue Zeile, gesendet wird über den Button (verhindert versehentliches Absenden).

3. **Größere Trefferflächen und lesbare Schrift**
   Schriftgröße auf 16 px (verhindert außerdem den iOS-Zoom beim Fokussieren), Feld- und Buttonhöhe auf mindestens 40 px, abgerundete Pill-Form, klar sichtbarer Fokusring über die Design-Tokens.

4. **Entwurf bleibt erhalten**
   Angefangene Nachrichten werden pro Chat lokal gespeichert (die vorhandene Draft-Logik in `useChatDrafts` wird angebunden) und beim erneuten Öffnen wieder eingesetzt.

5. **Klareres Sende-Feedback**
   Während des Sendens Spinner statt Papierflieger, Feld bleibt fokussiert und wird nicht deaktiviert, damit man direkt weiterschreiben kann. Bei Fehler bleibt der Text im Feld (bereits so) plus kurzer Hinweis.

6. **Kleinere Details**
   - Zeichenzähler erst ab 90 % des Limits sichtbar.
   - Automatisches Scrollen nach unten, wenn das Feld wächst, damit die letzte Nachricht sichtbar bleibt.
   - Mikrofon-/Sende-Button-Wechsel bleibt wie bisher; Buttons unten am Feld ausgerichtet, wenn es mehrzeilig ist.
   - Alle Texte über `t()` in DE/EN.

## Technisch

- Neue Komponente `src/components/chat/ChatComposer.tsx`: `Textarea` mit Auto-Resize (scrollHeight, Max-Höhe ~5 Zeilen), Props für `value`, `onChange`, `onSend`, `isSending`, `onVoiceToggle`, `disabled`.
- Eingesetzt in `EmbeddedChatView.tsx` (Zeilen 344–375) und `FloatingChatWindow.tsx` (Zeilen 249–277); Aufnahme-, Block- und Read-Only-Zustände bleiben unverändert.
- Mobil-Erkennung über `useIsMobile` (1024 px Breakpoint) für das Enter-Verhalten.
- Drafts über `useChatDraft(theirOpinionId)` laden/schreiben, beim erfolgreichen Senden leeren.
- Nur Präsentations-/Eingabeschicht; Nachrichtenversand, Rating und Typing-Indикator bleiben unangetastet.
