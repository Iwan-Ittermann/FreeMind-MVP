# Testzugang auf /wedium/go stabil machen

Ziel: Der "Öffnen"-Zugang für die wedium-Partner soll zuverlässig für alle Testpersonen funktionieren, der Passphrase-Login verschwindet vorerst komplett, und Logout führt zurück zum Sperrbildschirm.

## Was du danach siehst

1. Auf dem Sperrbildschirm gibt es nur noch den "Öffnen"-Link — der Hinweis "Du hast bereits eine Passphrase?" ist überall auf /wedium/go entfernt (Sperrbildschirm, Menü, Hinweisbox), ebenso das Passphrase-Eingabefeld.
2. Nach dem Passwort erscheinen die vier Testpersonen. Jede Auswahl führt zuverlässig in die Diskussion — auch beim ersten Mal, wenn das Konto gerade erst angelegt wird.
3. Wenn eine Auswahl doch scheitert, sagt der Hinweis, was schiefging, statt nur "fehlgeschlagen".
4. Logout (im Menü oder auf dem Meinungs-Fenster) führt zurück zum Sperrbildschirm mit dem "Öffnen"-Link — es taucht kein Feld zum Meinungseingeben mehr auf.
5. Weitere Testpersonen können später einfach ergänzt werden (nur eine Liste im Server-Teil).

## Zu deiner Frage: das Passwort

Aktuell wird das Passwort nirgends gespeichert — es lebt nur so lange, wie das Panel offen ist. Beim Neuladen der Seite oder nach Logout muss es wieder eingegeben werden. Das bleibt so; nur innerhalb der geöffneten Sitzung merkt sich das Panel den Unlock, damit man ohne Neueingabe zwischen Testpersonen wechseln kann.

## Ursachen (überprüft)

- Alle vier Konten existieren serverseitig samt Meinung und Freischaltung; die Server-Funktion hat für alle vier erfolgreich geantwortet. Die Instabilität liegt beim Anmelden direkt nach dem Anlegen im Browser — der erste Anmeldeversuch kann fehlschlagen, es gibt keinen zweiten.
- Der Demo-Zugang wird in einem lokalen Browser-Merker gespeichert und beim Logout nicht gelöscht. Deshalb bleibt der Sperrbildschirm nach dem Logout aus und die Meinungsbox erscheint.

## Technische Umsetzung

- `TTDemoAccessPanel.tsx`:
  - Anmeldung mit Retry: `loginWithPassphrase` bis zu 3× mit kurzer Wartezeit (250/750 ms); nur danach Fehlermeldung. Fehlergrund (`invalid-format` / `not-found` / Funktionsfehler) im Hinweis anzeigen.
  - Erfolg strikt an eine vorhandene Session koppeln: nach Login `supabase.auth.getUser()` prüfen, erst dann Merker setzen und schließen.
  - Unlock-Passwort bleibt nur in React-State (kein Storage) — unverändert.
- Demo-Zugang nicht mehr allein am localStorage-Merker hängen: `hasDemoAccess()` gilt nur zusammen mit einer aktiven Session eines Demo-Kontos. Umsetzung: neuer kleiner Hook `useDemoAccess()`, der Merker + `user.user_metadata.wedium_demo` prüft und auf `tt:demo-changed` sowie Auth-Änderungen reagiert. `Discussion.tsx` nutzt den Hook statt des einmaligen Lesevorgangs.
- Logout löscht `freemind_wedium_demo`: zentrale Helfer-Funktion `clearDemoAccess()` in `TTDemoAccessPanel.tsx`, aufgerufen in `TTHeader.handleSignOut` und `TTGateOverlay.handleSignOut`. Danach greift `gated` wieder → Countdown-Sperrbildschirm.
- Passphrase-Login auf /wedium/go verstecken: neue Konstante `PASSPHRASE_LOGIN_ENABLED = false` in `src/lib/constants.ts`; damit ausgeblendet
  - der Button `tt.alreadyHavePassphrase` in `TTHeader.tsx` (Zeile ~627) und in `Discussion.tsx` (Hinweisbox ~340),
  - die `login`-Variante in `TTGateOverlay.tsx` (kein Rendern, `gateVariant` liefert für `mode === 'test'` dann `null`),
  - der Listener `tt:open-login` wird nicht mehr ausgelöst.
- Server-Funktion `wedium-demo-access`: `ACCOUNTS`-Liste bleibt die einzige Stelle zum Ergänzen weiterer Testpersonen; zusätzlich beim Passwort-Check optional alle vier Konten vorab anlegen (`ensure`-Durchlauf), damit die Auswahl nie das erste Anlegen abwarten muss.
