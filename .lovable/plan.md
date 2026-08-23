# Variante B — Echtes Web-Push für die Home-Screen-App

Ziel: Mobile Nutzer bekommen Push-Benachrichtigungen auf den Sperrbildschirm, auch wenn die App geschlossen ist — bei neuer Nachricht, neuer Chat-Anfrage und neuer Meinung. Damit reagieren sie mehrmals täglich statt nur einmal abends.

Grundlage ist vorhanden: `notifications`-Tabelle mit Triggern, Seite `/benachrichtigungen`, Glocke mit Filtern, Manifest mit echten Icons und Icon-Badge.

## Was der Nutzer erlebt

1. In der Glocke gibt es einen neuen Schalter „Push-Benachrichtigungen“. Beim Einschalten fragt das Gerät um Erlaubnis.
2. Auf iPhone erscheint vorher der Hinweis: Push funktioniert nur in der zum Home-Screen hinzugefügten App (iOS 16.4+). Ist die App nicht installiert, zeigen wir die Anleitung statt des Schalters.
3. Ab dann kommen Pushes: „Neue Nachricht“ mit Textausschnitt, Tippen öffnet direkt den passenden Chat bzw. die Meinung.
4. Das App-Icon-Badge wird auch im Hintergrund aktualisiert; beim Lesen zurückgesetzt.
5. Bestehende Filter der Glocke (neue Meinung / neue Nachricht / neuer Chat) gelten auch für Push. Ausschalten jederzeit über denselben Schalter.
6. Push kommt zusätzlich zur täglichen Digest-Mail; Push-Ereignisse werden gebündelt, damit bei mehreren Nachrichten in kurzer Folge nicht gespammt wird.

## Arbeitsschritte

1. VAPID-Schlüsselpaar erzeugen, öffentlichen Schlüssel in die App, privaten als Secret hinterlegen.
2. Tabelle `push_subscriptions` (Nutzer, Endpoint, Keys, User-Agent, Zeitstempel, zuletzt erfolgreich) mit RLS: jeder verwaltet nur seine eigenen Abos; `service_role` liest alles.
3. Service Worker `public/push-sw.js` (reiner Messaging-Worker, kein App-Cache): `push`-Event zeigt Notification, `notificationclick` öffnet/fokussiert die Ziel-URL, Badge im Hintergrund setzen.
4. Registrierung + Opt-in-Fluss in der App: Worker registrieren, Erlaubnis anfragen, Abo speichern, Abmelden möglich. Registrierung nur in der veröffentlichten App — nicht in der Lovable-Vorschau, nicht im iframe, nicht in dev.
5. Edge Function `send-push`: signiert Web-Push (VAPID), versendet an alle Abos eines Nutzers, löscht abgelaufene Abos bei 404/410.
6. Auslöser: bei neuer Zeile in `notifications` wird `send-push` aufgerufen (Datenbank-Trigger via `pg_net`), mit kurzer Bündelung pro Nutzer und Respekt der Filter/Opt-in-Einstellung.
7. Schalter in der Glocke inkl. iOS-Hinweis und Installations-Anleitung, EN/DE über `t()`.
8. Test auf Android-Chrome (Browser + installiert) und iOS (nur installiert), plus Abmelde-Fluss.

## Technische Details

- Kein `vite-plugin-pwa`, kein App-Shell-Service-Worker: nur der dedizierte Push-Worker unter eigenem Pfad, damit Vorschau und Deploys nicht durch Caching brechen.
- Push-Payload enthält `title`, `body`, `link`, `tag` (Chat-ID) und `badge`-Zähler; `tag` verhindert Duplikate pro Chat.
- Bündelung: pro Nutzer max. eine Push-Zustellung je Chat innerhalb kurzer Zeit; weitere Nachrichten ersetzen die bestehende Notification über `tag`.
- Filterprüfung serverseitig: die heute nur lokal (localStorage) gespeicherten Glocken-Filter werden für Push in der Datenbank gespiegelt, damit der Server sie kennt.
- `send-push` läuft mit `verify_jwt = false` und validiert intern; Aufruf nur über Trigger mit Service-Rolle.
- Erwarteter Aufwand: mehrere Runden, grob 40–70 Credits.
