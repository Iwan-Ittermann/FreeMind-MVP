# Polarisierungsumfrage: Antworten können nicht gespeichert werden

## Ursache (verifiziert)

Die Tabelle `polarization_responses` hat **keine einzige Tabellen-Berechtigung** mehr für die App-Rollen (`information_schema.role_table_grants` liefert für diese Tabelle null Zeilen). Die Regeln (RLS-Policies für Lesen/Schreiben der eigenen Antwort) sind vorhanden und korrekt — aber ohne GRANT lehnt die Daten-API jede Abfrage mit "permission denied" ab.

Folge im UI:
- Das Laden der bereits abgegebenen Antworten schlägt fehl → die Umfrage flackert beim Öffnen kurz auf bzw. verhält sich instabil.
- Der Klick auf "Absenden" läuft in einen Fehler, der im Code stillschweigend verworfen wird (`if (error) return;`) — es passiert sichtbar nichts, die Umfrage bleibt unbeantwortet.

Passend dazu: Die letzten gespeicherten Antworten stammen vom 21.08. (2 Zeilen), danach keine mehr — also seit dem Security-Durchgang, in dem Rechte entzogen wurden.

## Fix

1. Berechtigungen für `polarization_responses` wiederherstellen:
   - `authenticated`: SELECT, INSERT (passend zu den bestehenden Policies; kein UPDATE/DELETE, die Tabelle bleibt append-only)
   - `service_role`: ALL (Admin-Auswertung / Serverfunktionen)
   - kein `anon`-Zugriff (jede Policy ist an die eigene Nutzer-ID gebunden)
2. Gleiche Prüfung für die anderen Tabellen des Event-Builds, die der Client direkt liest/schreibt (u. a. `opinions`, `chat_*`, `notifications`, `opinion_ratings`, `rating_events`, `signups`, `polarization_responses`, `question_submissions`-Schreibpfad): fehlende GRANTs gezielt nachziehen, damit nicht die nächste Funktion still ausfällt. Bewusst gesetzte Sperren (server-only Tabellen wie `email_templates`, `banned_emails`, `opinion_ips`) bleiben unangetastet.
3. Stiller Fehler beseitigen: In `TTPolarizationPoll.tsx` beim Speichern eine lokalisierte Fehlermeldung anzeigen und den Button wieder freigeben, statt den Fehler zu verwerfen.
4. Verifikation: Insert/Select als angemeldeter Nutzer über die Daten-API testen, danach im Browser auf `/go` prüfen, dass die Umfrage stehen bleibt, beantwortet werden kann und danach dauerhaft verschwindet (Antwort in der Datenbank sichtbar).

## Technische Details

- Migration mit `GRANT SELECT, INSERT ON public.polarization_responses TO authenticated;` und `GRANT ALL ON public.polarization_responses TO service_role;`
- Keine Änderung an RLS-Policies oder am Umfrage-Design (keine Defaultwerte, "keine Angabe"-Option, weiße 2px-Skalen bleiben wie sie sind).
- Security-Memory ergänzen: Tabellen, die der Client direkt nutzt, dürfen ihre GRANTs nie verlieren — analog zur bereits dokumentierten Regel für Policy-Hilfsfunktionen.
