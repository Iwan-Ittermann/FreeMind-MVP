# Home-Screen-App mit Benachrichtigungen

Ziel: Mobile Nutzer installieren freemind auf dem Home-Screen, sehen ein Badge am App-Icon und öffnen eine Seite `/benachrichtigungen` mit allen Benachrichtigungen.

## Wichtige Voraussetzung (gilt für beide Varianten)

Benachrichtigungen existieren heute nur flüchtig im Browser-Tab: sie werden live aus Realtime-Events erzeugt und beim Neuladen verworfen. Für eine echte Liste und für Badges müssen sie gespeichert werden.

- Neue Tabelle `notifications` (Empfänger, Typ, Titel, Text, Ziel-Link, gelesen-Flag, Zeit) mit RLS: jeder sieht nur seine eigenen.
- Datenbank-Trigger schreiben Benachrichtigungen bei neuer Meinung, neuer Chat-Anfrage und neuer Nachricht.
- Neue Seite `/benachrichtigungen`: chronologische Liste, ungelesene hervorgehoben, Klick springt zum Chat/zur Meinung, „Alle als gelesen markieren“.
- Bestehende Glocke im Header liest ab dann aus dieser Tabelle (statt nur Live-Events) und verlinkt auf die Seite.

## Variante A — Home-Screen-App + Badge (schnell)

Was der Nutzer bekommt: App-Icon auf dem Home-Screen, Start direkt in der Diskussion, Badge mit Anzahl ungelesener Benachrichtigungen am Icon, sobald die App im Hintergrund lief oder geöffnet wird. Keine Zustellung bei vollständig geschlossener App.

Arbeitsschritte:
1. Persistenz + Seite `/benachrichtigungen` (siehe oben).
2. Manifest korrigieren: `start_url`/`scope` von `/tt` auf die echte Route umstellen, Name/Beschreibung auf deutsch, echte 192/512-PNG-Icons statt `placeholder.svg`, `apple-touch-icon` im Head.
3. Installations-Hinweis für mobile Nutzer („Zum Home-Screen hinzufügen“) mit iOS/Android-Anleitung, einmalig einblendbar.
4. Icon-Badge über die Badging-API (`navigator.setAppBadge`) mit der Anzahl ungelesener Benachrichtigungen aktualisieren, beim Lesen zurücksetzen.

Aufwand: gering — ca. 1 Arbeitsschritt-Runde, grob 8–15 Credits.
Einschränkung: Badge/Liste aktualisieren sich nur, während die App läuft oder beim Öffnen. Auf iOS funktioniert das Badge nur in der installierten Home-Screen-App.

## Variante B — Echtes Web-Push (Benachrichtigung bei geschlossener App)

Was der Nutzer bekommt: alles aus Variante A, zusätzlich echte Push-Benachrichtigungen auf dem Sperrbildschirm, auch wenn die App geschlossen ist.

Arbeitsschritte:
1. Alles aus Variante A.
2. VAPID-Schlüsselpaar erzeugen, privaten Schlüssel als Secret ablegen.
3. Service Worker (Push-Empfänger) anlegen: Push anzeigen, Klick öffnet die richtige Stelle in der App, Badge im Hintergrund setzen. Registrierung nur in der veröffentlichten App, nicht in der Lovable-Vorschau.
4. Tabelle `push_subscriptions` + Opt-in-Fluss in der App (Erlaubnis anfragen, Abo speichern, Abmelden möglich).
5. Edge Function `send-push`, die Web-Push signiert und versendet, inkl. Aufräumen abgelaufener Abos.
6. Auslöser: bei neuer Benachrichtigung Push versenden, gebündelt/entprellt, plus Respekt der bestehenden Benachrichtigungs-Filter pro Thema.
7. Test auf Android-Chrome und iOS (iOS erfordert zwingend die installierte Home-Screen-App, iOS 16.4+).

Aufwand: mittel-hoch — mehrere Runden, grob 40–70 Credits.
Risiken: iOS-Push nur nach Installation und Opt-in; Zustellraten hängen vom Gerät ab.

## Empfehlung

Zuerst Variante A umsetzen (Persistenz, Seite, Installations-Hinweis, Badge). Sie ist die Grundlage für Variante B, sofort nutzbar und liefert bereits Retention. Web-Push danach als eigener Schritt ergänzen.

## Technische Details

- `public/tt-manifest.webmanifest`: `start_url`/`scope` anpassen, echte PNG-Icons, `id` setzen. Nur Manifest — kein Service Worker in Variante A.
- Neue Route `/benachrichtigungen` in `App.tsx`, Datenzugriff über einen neuen Hook, der `useTTNotifications` als Live-Ergänzung nutzt.
- `useTTNotifications` bleibt für die Live-Anzeige zuständig, füttert aber Zähler und Seite aus der Tabelle.
- Für Variante B: Service Worker über `vite-plugin-pwa` mit Preview-Guards; `web-push`-kompatible Signatur in der Edge Function.
