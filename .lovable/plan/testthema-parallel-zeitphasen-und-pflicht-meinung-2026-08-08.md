# Testthema parallel, Zeitphasen und Pflicht-Meinung

## Ziel

1. **Testthema bleibt dauerhaft frei erkundbar** — ohne Pflicht-Meinung, ohne Datumssperren. Genau dafür ist der Soft Launch: Leute sollen die App verstehen, bevor sie Aufwand in eine echte Meinung stecken (und nicht „test" eintippen).
2. **Echte Frage:** verifizierte Nutzer können ihre Meinung ab **20.08. 00:01** einreichen, die Diskussion (Chats, Bewertung) startet erst am **23.08. 00:01**.
3. Bei der echten Frage gilt: erst Meinung, dann Graph. Ohne Passphrase gibt es nur den lesenden Graph mit Hinweis + Login-Link.

## Zwei Themen parallel (Single-Topic-Build wird zum „Zwei-Rollen-Build")

Statt einer fest verdrahteten Konstante kennt die App künftig zwei Rollen, beide in den App-Einstellungen hinterlegt:

- `test_topic_short_code` — das Spielwiesen-Thema (aktuell `7mm9`)
- `real_topic_short_code` — die echte Frage (Thema wird vorab angelegt)

Routen:

```text
/go      → echte Frage   (Phasen + Pflicht-Meinung)
/test    → Testthema     (immer offen, keine Pflicht, keine Countdowns)
```

Beide Routen nutzen denselben Bildschirm; ein Modus-Flag (`test` | `real`) entscheidet über Gating. Kein Datenwechsel, kein Löschen: Testdaten bleiben im Testthema, die echte Frage startet leer.

## Phasen (gelten nur für /go)

```text
        vor 20.08.            20.08.–22.08.            ab 23.08.
Phase   PRELAUNCH             SUBMISSION               DISCUSSION
Form    nein (Countdown)      ja (Pflicht)             ja (Pflicht)
Graph   gesperrt              gesperrt (Countdown)     frei nach Einreichung
Chats   nein                  nein                     ja
```

In PRELAUNCH und SUBMISSION verweist die Karte auf `/test` („Schau dich schon mal im Testthema um") — so bekommt der Soft Launch seinen Zweck.

Alle Zeitpunkte liegen in den App-Einstellungen und sind in /admin2 editierbar — Termine verschieben ohne Deploy.

## Nutzerfluss

**/test (jederzeit, alle):**
- Graph frei sichtbar und bedienbar. Verifizierte Nutzer dürfen — müssen aber nicht — eine Testmeinung abgeben; Chats und Bewertung funktionieren wie heute (Chats setzen weiterhin eine eigene Meinung voraus, das bleibt unverändert).
- Dezenter Hinweis „Testbereich — die echte Frage startet am 23.08." mit Link auf `/go`.

**/go mit Passphrase (verifiziert):**
- PRELAUNCH: Graph gesperrt, Karte „Einreichung startet am 20.08." + Countdown + Link zum Testbereich.
- SUBMISSION: Pflicht-Formular über dem Graph. Nach dem Absenden: „Deine Meinung ist eingetragen — die Diskussion startet am 23.08."
- DISCUSSION: ohne eigene Meinung zuerst das Pflicht-Formular, danach voller Zugriff (Graph, Sidebar-Pillen, Chats, Bewertung).

**/go ohne Passphrase:**
- Graph sichtbar, rein lesend: keine Sidebar-Pillen, kein Bewertungsregler, kein „Diskutieren"-Button, kein Passphrase-Element im Einstellungs-Panel.
- Hinweisbanner: Registrierung auf freemind.chat + „Anmelden"-Link, der das Login im Einstellungs-Panel öffnet.

## /admin2

Neuer Abschnitt „Phasen & Themen": Auswahl von Test- und Echtthema, Datum/Zeit-Felder für Einreichungsstart und Diskussionsstart, Anzeige der momentan gültigen Phase zur Kontrolle.

## Technische Umsetzung

- **Einstellungen:** neue Zeilen in `app_settings` (`test_topic_short_code`, `real_topic_short_code`, `opinions_open_at`, `discussion_open_at`). Lesen über den bestehenden Settings-Hook, Schreiben nur über /admin2 (Passwort-geschützte Edge Function).
- **Themenauflösung:** `useTTTopics` wird zu `useEventTopic(role)` und löst den Short-Code je Rolle aus den Einstellungen auf; `HELSINKI_TOPIC_SHORT_CODE` bleibt Fallback für den Testbereich.
- **Routing:** `App.tsx` erhält `/test` neben `/go`; `Discussion.tsx` bekommt eine `mode`-Prop (`test` | `real`).
- **Phasen-Hook:** neuer `useEventPhase()` liefert `phase` samt Zieldaten und stellt einen Timer auf den nächsten Phasenwechsel (kein Polling). Im Test-Modus ist die Phase immer `DISCUSSION`.
- **Gating im Frontend:** Gate-Schicht in `Discussion.tsx` (Pflicht-Formular-Overlay bzw. Countdown-Karte über dem Graph), abhängig von `mode`, Phase, Verifizierung und `hasOwnOpinion`. `TTSideTabs`, `TTBottomPanel` und der Passphrase-Block in `ConfigPanel` folgen denselben Flags. Anti-Flacker-Muster von `useIsVerified` beibehalten: erst rendern, wenn der Zustand bekannt ist.
- **Serverseitige Durchsetzung** (Frontend-Gates allein reichen nicht): `submit_opinion` und die Chat-Funktionen prüfen die Phasen-Zeitpunkte **nur für das Echtthema** — das Testthema bleibt jederzeit schreibbar. Verstöße liefern eine klare Fehlermeldung, die das UI als Hinweis anzeigt.
- **i18n:** alle neuen Texte (Countdown, Pflicht-Formular, Testbereich-Hinweis, Lese-Hinweis, Admin-Labels) als Übersetzungsschlüssel in `de.json`/`en.json`.
