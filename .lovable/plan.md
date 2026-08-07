# Zeitgesteuerte Phasen, Themenwechsel und Pflicht-Meinung

## Ziel

1. Registrierte (verifizierte) Nutzer können ihre Meinung ab **21.08. 00:01** abgeben — die Diskussion (Graph, Chats, Bewertung) startet erst am **23.08. 00:01**.
2. Der Wechsel vom Testthema zur echten Frage passiert automatisch zu einem eingestellten Zeitpunkt.
3. Wer eine Passphrase hat, muss zuerst eine Meinung abgeben, bevor der Graph nutzbar wird. Wer keine hat, sieht den Graph nur lesend mit Hinweis + Login-Link.

## Zeitachse / Phasen

```text
        vor 21.08.            21.08.–22.08.            ab 23.08.
Phase   PRELAUNCH             SUBMISSION               DISCUSSION
Login   ja                    ja                       ja
Form    nein (Countdown)      ja (Pflicht)             ja (Pflicht)
Graph   gesperrt (Hinweis)    gesperrt (Countdown)     frei
Chats   nein                  nein                     ja
```

Alle drei Zeitpunkte sind in den App-Einstellungen hinterlegt und in /admin2 editierbar — kein Deploy nötig, um Termine zu verschieben.

## Themenwechsel (Single-Topic-Build ist kein Problem)

Der Build ist heute per Konstante auf `7mm9` festgenagelt. Statt der Konstante liest die App künftig aus den App-Einstellungen:

- `active_topic_short_code` — Testthema (aktuell `7mm9`)
- `next_topic_short_code` — die echte Frage (neues Topic, wird vorab angelegt)
- `topic_switch_at` — Zeitpunkt des Umschaltens (Standard: Start der Einreichungsphase, 21.08. 00:01)

Die App zeigt vor `topic_switch_at` das aktive, danach automatisch das nächste Thema. Testdaten bleiben im alten Topic liegen und verschwinden mit dem Wechsel aus der Ansicht — kein Löschen nötig, nichts geht kaputt. Der Build bleibt „ein Thema zur Zeit", nur die Auswahl ist datengesteuert.

## Nutzerfluss

**Mit Passphrase (verifiziert):**
- Phase PRELAUNCH: Graph unscharf/gesperrt, Karte „Einreichung startet am 21.08." mit Countdown.
- Phase SUBMISSION: Pflicht-Formular über dem Graph. Nach dem Absenden: Bestätigung „Deine Meinung ist eingetragen — die Diskussion startet am 23.08." Graph bleibt gesperrt.
- Phase DISCUSSION: Ohne eigene Meinung erscheint zuerst das Pflicht-Formular; danach voller Zugriff (Graph, Sidebar-Buttons, Chats, Bewertung).

**Ohne Passphrase:**
- Graph sichtbar, aber rein lesend: keine Sidebar-Pillen (Meinungen/Chats), kein Passphrase-Element in den Einstellungen, kein Bewertungsregler, kein „Diskutieren"-Button.
- Hinweisbanner: Registrierung auf freemind.chat + „Anmelden"-Link, der das Login im Einstellungs-Panel öffnet.

## /admin2

Neuer Abschnitt „Phasen & Thema": Datum/Zeit-Felder für Einreichungsstart, Diskussionsstart und Themenwechsel, plus Auswahl des aktiven und des nächsten Themas. Anzeige der aktuell gültigen Phase zur Kontrolle.

## Technische Umsetzung

- **Einstellungen:** neue Zeilen in `app_settings` (`opinions_open_at`, `discussion_open_at`, `topic_switch_at`, `active_topic_short_code`, `next_topic_short_code`). Lesen über den bestehenden Settings-Hook; Schreiben nur über /admin2 (Passwort-geschützte Edge Function).
- **Phasen-Hook:** neuer `useEventPhase()` liefert `phase`, `opinionsOpenAt`, `discussionOpenAt` und den nächsten Umschaltzeitpunkt (Timer statt Polling).
- **Themenauflösung:** `useTTTopics` wählt den Short-Code anhand von `topic_switch_at` statt der festen Konstante; `HELSINKI_TOPIC_SHORT_CODE` bleibt nur noch Fallback.
- **Gating im Frontend:** `Discussion.tsx` bekommt eine Gate-Schicht — Pflicht-Formular-Overlay bzw. Countdown-Karte über dem Graph; `TTSideTabs`, `TTBottomPanel` (Bewertung, „Diskutieren") und der Passphrase-Block in `ConfigPanel` werden abhängig von Phase, Verifizierung und `hasOwnOpinion` gerendert. Beim Anti-Flackern-Muster von `useIsVerified` bleiben wir: erst rendern, wenn Zustand bekannt ist.
- **Serverseitige Durchsetzung** (Frontend-Gates sind nicht ausreichend): `submit_opinion` prüft `opinions_open_at`, `get_or_create_chat` und der Nachrichten-Insert prüfen `discussion_open_at`; Verstöße werfen eine klare Fehlermeldung, die das UI als Hinweis anzeigt.
- **i18n:** alle neuen Texte (Countdown, Pflicht-Formular, Lese-Hinweis, Admin-Labels) als Übersetzungsschlüssel in `de.json`/`en.json`.
