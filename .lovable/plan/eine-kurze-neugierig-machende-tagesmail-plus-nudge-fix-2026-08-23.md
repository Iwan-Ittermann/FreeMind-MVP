# Eine kurze, neugierig machende Tagesmail — plus Nudge-Fix

## Die neue Tagesmail (21:00 Berlin)

Ersetzt beide bisherigen Tagesmails (Tagesbericht-Mail und Benachrichtigungs-Digest). Sie ist persönlich, sehr kurz, komplett anklickbar und deckt nur die echte Diskussion ab — `/test` fließt nirgends mehr ein.

Aufbau (jeder Block ein bis zwei Zeilen, alles verlinkt):

1. **Dein Tag** — „Du hast heute X Brückenpunkte gesammelt und Y Nachrichten geschrieben." Wenn nichts passiert ist: ein Satz, der zum Einstieg einlädt statt zu tadeln.
2. **Neu heute** — bis zu 3 neue Meinungen als Einzeiler, jede klickbar in den Kreis.
3. **Überraschende Begegnung** — ein bis zwei Gespräche, in denen hoher Meinungsunterschied auf hohe Respektbewertung trifft (die interessantesten Brücken des Tages), mit einem sehr kurzen Zitat.
4. **Top 5 (gesamt)** — nummerierte Liste mit Punktzahl; die eigene Meinung wird markiert („du") und, falls außerhalb der Top 5, mit eigenem Rang darunter ergänzt.
5. **Tagessieger** — wer heute die meisten Punkte dazugewonnen hat, mit Meinungs-Einzeiler.
6. **Ein Button**: „Weiter diskutieren" → `/go`.

Neugier statt Passivität: Zitate werden abgeschnitten, Top-5-Abstände werden benannt („2 Punkte hinter Platz 3"), und es gibt keinen langen KI-Text mehr in der Mail — der ausführliche Bericht bleibt auf `/bericht`.

Bewusst offene Fragen im Text (z. B. „X hat dir widersprochen — noch unbeantwortet") entstehen aus den Daten, nicht aus Floskeln. Ungelesene Benachrichtigungen tauchen nur noch als Zahl im „Dein Tag"-Absatz auf, nicht mehr als Liste — die Liste hat zum Zurücklehnen verleitet.

Weiter gilt: nur bestätigte Registrierungen mit aktivem Opt-in, gesperrte und abgemeldete Adressen ausgeschlossen, Abmeldelink automatisch. Das Glocken-Panel behält einen Schalter, der jetzt diese eine Tagesmail steuert.

## Nudges im Screen

- Beide Hinweise (Bewerten / Diskutieren) verschwinden automatisch nach 20 Sekunden und kommen in derselben Sitzung nicht wieder.
- Sie belegen denselben festen Platz direkt über dem Bedienfeld; der „Zum Homescreen"-Hinweis rückt darunter, sodass sich nichts mehr überlappt.
- Breite und Textumbruch werden auf schmale Screens angepasst (kein Überstehen, kein abgeschnittener Button), Wegklicken bleibt möglich.

## Technische Umsetzung

- Neue Edge Function `send-daily-brief` (ersetzt `send-notification-digest` und den Mailversand aus `generate-daily-report`):
  - Alle Abfragen auf die Event-Topic-ID gefiltert (`app_settings.real_topic_short_code` → `topics.id`), damit `/test` ausgeschlossen ist.
  - Kennzahlen pro Empfänger: heutige `rating_events`-Punkte auf die eigene Meinung (zeitgewichtet wie im Graphen), eigene `chat_messages` des Tages, Anzahl ungelesener `notifications`.
  - Globale Blöcke: neue `opinions` des Tages, Top 5 nach Gesamtpunkten, Tagessieger nach Punktzuwachs, „Überraschung" = Chats mit `disagreement` hoch und `empathy` hoch am selben Tag, Zitat aus einer sichtbaren `chat_messages`-Zeile.
  - Ein Lauf pro Tag, Batch-Schleife über die Empfänger mit `idempotencyKey` `daily-brief-<datum>-<signupId>`, Versand über `send-transactional-email`.
- Neues Template `daily-brief.tsx` (Stil wie `campaign.tsx`) + Eintrag in `registry.ts`; in `/admin2` editierbar wie die anderen Vorlagen, mit Zählern und manuellem „Jetzt senden"/Resend.
- `generate-daily-report` behält Generierung und `/bericht`, verliert den Mailversand; Topic-Filter kommt dort ebenfalls dazu, damit `/test` nicht mehr im Bericht landet.
- pg_cron: bisheriger Digest-Job (08:00) wird entfernt, neuer Job 21:00 Berlin ruft `send-daily-brief` per `net.http_post`; die 23:30-Generierung bleibt.
- Spalten-Bedeutung: `signups.notification_digest_opt_in` steuert künftig die Tagesmail; `daily_report_opt_in` wird nicht mehr für Versand ausgewertet. Glocken-Panel-Texte in `TTHeader.tsx` und i18n entsprechend anpassen.
- Frontend: `TTNudgeHint.tsx` bekommt einen 20-Sekunden-Timer, `sessionStorage`-Merker pro Stufe und ein schmaleres, umbruchsicheres Layout; `TTInstallHint.tsx` und die Reihenfolge in `Discussion.tsx` werden auf eine gemeinsame Hinweiszone abgestimmt.
- Nach Approval: Beispiel-Mail für heute (23.08.) mit echten Daten erzeugen und als Vorschau zeigen.
