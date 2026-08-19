# /test: Login-Pflicht vor Meinungsabgabe

## Ziel

Auf `/test` müssen Besucher sich zuerst mit ihrer Passphrase anmelden. Erst danach kommt die bestehende Pflicht-Meinung-Sperre, und erst danach werden Graph, Meinungsliste und Chats nutzbar. Kein Lesen ohne Login.

`/go` bleibt unverändert (Lesen frei, Zeitphasen, Login erst beim Meinungsversuch).

## Ist-Zustand

Auf `/test` sehen nicht verifizierte Besucher den Graph im Lesemodus. Der Passphrase-Dialog erscheint erst, wenn sie eine Meinung abgeben wollen. Die `submit`-Sperre greift nur für bereits verifizierte Nutzer.

## Neues Verhalten auf /test

```text
nicht angemeldet / nicht verifiziert  ->  Sperr-Karte "Anmelden"
angemeldet, keine eigene Meinung      ->  Sperr-Karte "Meinung abgeben" (wie heute)
angemeldet, Meinung vorhanden         ->  volle Nutzung
```

Die Sperr-Karte "Anmelden" zeigt:
- kurze Erklärung, dass für die Testdiskussion eine Passphrase nötig ist
- Passphrase-Eingabefeld plus "Anmelden"-Button (gleiche Logik wie der bestehende Verifizierungsdialog)
- Hinweis mit Link zur Registrierung für Nutzer ohne Passphrase

Header (Sprache, Einstellungen, Logout) und Footer bleiben erreichbar, wie bei den anderen Sperr-Karten. Nach erfolgreichem Login wechselt die Karte direkt auf die Meinungs-Eingabe, ohne Neuladen.

## Technische Umsetzung

- `src/components/tt/TTGateOverlay.tsx`: neue Variante `'login'` in `GateVariant`. Sie rendert Passphrase-Feld und Login-Button; die Anmeldelogik (Passphrase → E-Mail/Passwort-Mapping via `src/lib/passphrase.ts`, vorherige anonyme Session abmelden) wird aus `src/components/VerificationDialog.tsx` in eine gemeinsame Funktion (`src/lib/passphrase-login.ts`) ausgelagert, damit Dialog und Gate identisch arbeiten.
- `src/pages/Discussion.tsx`: In `gateVariant` für `mode === 'test'` zuerst auf `!isVerified` prüfen und `'login'` zurückgeben (statt `null`). Der `real`-Zweig bleibt exakt wie er ist.
- Nach erfolgreichem Login: `useIsVerified` und die eigene Meinung neu laden (`queryClient.invalidateQueries`), damit das Gate von `login` auf `submit` springt.
- i18n: neue Keys unter `tt.event.login*` (DE/EN) für Titel, Beschreibung, Button, Fehlermeldung und Registrierungs-Hinweis.
- Keine Datenbank- oder RLS-Änderungen; serverseitig gilt die Verifizierungspflicht bereits.
