# Plan: Freemind-Events live als Bluesky-Feed (Event-Silos)

## Ziel
Jedes Freemind-Event wird live ins AT Protocol gespiegelt. Jede Person tritt pro Event mit einem eigenen, anonymen Konto auf. Meinungen, Chats und Ratings sind öffentlich. Ein Bluesky-Feed pro Event zeigt zuerst Gespräche über Meinungsgräben hinweg. Bluesky-Nutzer können lesen und liken. Antworten können nur die beiden Personen eines Chats, mitmachen kann man nur über Freemind.

## Was Nutzer sehen
- **In Freemind:** Beim Event-Einstieg ein Hinweis: "Diese Diskussion ist öffentlich auf Bluesky lesbar, unter einem anonymen Konto nur für dieses Event." Eine Zustimmung ist Pflicht, bevor man eine Meinung postet.
- **In Bluesky:** Der Feed "Freemind · <Frage>" mit angepinnter Frage. Darunter stehen geschlossene 1:1-Gespräche ("Nur k7q2 und m3x9 können antworten") und Meinungen. Jede Karte verlinkt zum Mitmachen auf freemind.chat.

## Voraussetzung außerhalb der App (wichtig)
Für die Silo-Konten braucht es einen **eigenen PDS-Server** (offizieller Bluesky-PDS als Docker-Container auf einem kleinen Server mit einer Domain wie `pds.freemind.chat`). Die App selbst kann keinen dauerhaft laufenden Server betreiben. Massenkonten auf bsky.social verbieten die Nutzungsbedingungen. Den Server richtest du oder ein Techniker ein; ich liefere eine genaue Anleitung. Alles andere läuft in der App und ihrem Backend.

## Schritte
1. **PDS bereitstellen (extern):** PDS installieren, Wildcard-DNS `*.pds.freemind.chat` einrichten, Einladungs- und Admin-Passwort als Secret im Backend hinterlegen und den Relay mit `requestCrawl` an `bsky.network` anmelden.
2. **Event-Konto:** Pro Event ein Konto wie `wd10.pds.freemind.chat` mit Profil. Es postet die Frage und dient als Anker für Threads und Feed.
3. **Silo-Konten:** Neue Tabelle `atproto_silos` (Signup/User, Topic, DID, Handle, verschlüsselte Zugangsdaten). Das Konto wird beim ersten Posten der Meinung angelegt. Handle zufällig (`k7q2.pds.freemind.chat`), Avatar ist das Personen-Icon, pro Event neu gewürfelt.
4. **Spiegel-Warteschlange:** Neue Tabelle `atproto_outbox`, befüllt von Datenbank-Triggern auf Meinungen, Chats, Chatnachrichten, Meinungs- und Respekt-Ratings und Soft-Deletes. Eine Backend-Funktion arbeitet sie jede Minute ab und ist idempotent: Jeder Eintrag speichert seine `at-uri`. Ein Fehler blockiert nie die Diskussion selbst.
5. **Abbildung:**
   - Meinung → `app.bsky.feed.post` als Antwort auf den Frage-Post, plus `chat.freemind.opinion`
   - Chatbeginn → Quote-Post auf die Partnermeinung mit Erwähnung, `threadgate` mit `mentionRule` und `postgate` ohne Zitate von außen
   - Nachricht → Reply im Chat-Thread
   - Ratings → `chat.freemind.differenceRating` und `chat.freemind.respectRating`, jeweils mit Ziel-URI und Wert
   - Soft-Delete → `deleteRecord`
   - `createdAt` wird auf die Minute gerundet
6. **Lexicons:** Schemas für `chat.freemind.*` als JSON im Projekt ablegen und unter `freemind.chat` veröffentlichen (NSID-Auflösung per DNS `_lexicon`).
7. **Feed Generator als Backend-Funktion:** `did:web:feed.freemind.chat` mit `/.well-known/did.json`, `describeFeedGenerator` und `getFeedSkeleton`. Die Sortierung kommt aus unserer eigenen Datenbank, ein Jetstream-Leser ist nicht nötig: oben die Frage, dann Chats nach Respekt mal Meinungsunterschied, Meinungen mit Ratings aus mehreren Clustern, wartende Chats. `feedContext` gibt den Grund mit. Den Feed-Record (`app.bsky.feed.generator`) legt das Event-Konto an.
8. **Bluesky-Likes:** Bleiben in Bluesky. Für den Anfang zählen sie nicht in Brückenpunkte und das Ranking.
9. **Admin `/wedium/admin` (und pro Kontext):** Schalter "Bluesky-Spiegelung an/aus" pro Event, Status der Warteschlange (offen, gesendet, fehlerhaft), Feed-Link, Knopf zum erneuten Senden.
10. **Event-Ende:** Silo-Konten werden gesperrt (keine neuen Posts), der Feed bleibt als Archiv.

## Tests
- Abbildung Freemind → Record (Felder, gerundete Zeit, kein Feld mit Nutzer-ID)
- Ein Silo pro Person und Event, verschiedene DIDs über Events hinweg
- Ein Outbox-Eintrag wird bei Wiederholung nicht doppelt gepostet
- Feed-Sortierung: Ein respektvoller Chat mit großem Unterschied steht vor einem mit kleinem Unterschied

## Risiken
- Öffentliches bleibt kopierbar, auch nach dem Löschen. Das muss im Hinweis für Nutzer stehen.
- Rückschlüsse über Silos hinweg durch Schreibstil oder Zeitmuster lassen sich nur teilweise verhindern.
- Betrieb und Kosten des PDS (Server ca. 5–10 €/Monat) und die Ratenlimits des Relays.
- Rechtlich: Freemind ist Hoster der Silo-Konten. NetzDG-Löschungen laufen über den bestehenden Soft-Delete, der auch im Protokoll löscht.

## Technische Details
- Edge-Funktionen: `atproto-mirror` (Outbox-Worker, Cron jede Minute, Cron-Helper-Auth), `atproto-feed` (öffentliche XRPC-Endpunkte, `verify_jwt=false`).
- Die Zugangsdaten der Silos (App-Passwörter oder Sessions) liegen verschlüsselt und nur für die Funktion lesbar. RLS sperrt alles für Clients.
- Für XRPC nutzen wir `@atproto/api` in Deno (npm-Import).
- AGENTS.md-Regel: Spiegelung läuft nur über die Outbox, und keine Funktion schreibt Nutzer-IDs in Records.

## Offene Punkte vor dem Start
- Wer betreibt den PDS-Server, und welche Domain nehmen wir?
- Gilt das ab dem nächsten Event, oder soll `wd10` nachträglich als Archiv gespiegelt werden? (Bisherige Teilnehmer haben nicht zugestimmt. Ich empfehle, das nicht zu tun.)
