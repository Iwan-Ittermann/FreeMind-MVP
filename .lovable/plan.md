# Freemind im AT Protocol: Event-Silos und ein Bluesky-Feed

Konzept, noch nichts zum Bauen. Grundlage: AT-Protocol- und Bluesky-Lexicon-Specs.

## Grundsatz
- **Modell 3:** Jede Person bekommt pro Event eine eigene DID (Silo). Innerhalb des Events ist alles öffentlich und zusammenhängend: Meinung, Chats und Ratings. Über Events hinweg gibt es keine Verbindung.
- Chats und Ratings sind öffentlich. Sensibel ist nur, wenn Silos miteinander verknüpft werden.

## Identität pro Silo
- Freemind betreibt einen eigenen PDS und erstellt pro Person und Event eine `did:plc`.
- Die Handles sind Subdomains, die keinen Rückschluss erlauben: `k7q2.wd10.freemind.chat`. Die Zuordnung lösen wir über `/.well-known/atproto-did` auf dem PDS.
- `app.bsky.actor.profile` bekommt das Personen-Icon aus Freemind als Avatar und den Anzeigenamen "Teilnehmer:in · wd10", keine Bio.
- Was ein Silo verraten würde: derselbe Avatar über Events hinweg, Schreibstil, enge zeitliche Muster. Abhilfe: Icon pro Event neu würfeln und Zeitstempel runden. Dass die Konten alle bei Freemind liegen, ist bewusst sichtbar, so wird Freemind selbst als Ort erkennbar.

## Abbildung auf Bluesky-Records
Ein Bluesky-Feed darf nur `app.bsky.feed.post`-URIs ausliefern (`getFeedSkeleton`). Darum wird das Sichtbare als normale Posts gespiegelt und die Freemind-Daten laufen daneben mit:

```text
Event-Konto (freemind.chat)   Post "Frage: Welches Gesetz …?"  + chat.freemind.topic
Silo-DID                      Post = Meinung (Reply auf Frage) + chat.freemind.opinion
Chat A<->B                    Quote-Post von A auf Bs Meinung = Chat-Wurzel
                              threadgate: allow = [mentionRule] (nur B erwähnt)
                              → nur A und B können antworten, alle können lesen
Chatnachrichten               Replies im Thread (reply.root = Chat-Wurzel)
Ratings                       chat.freemind.differenceRating / respectRating
                              (Bluesky ignoriert sie, der Feed und Freemind lesen sie)
```
- `app.bsky.feed.threadgate` mit `mentionRule` erzeugt genau unser 1:1-Gespräch, das öffentlich lesbar, aber geschlossen ist. Mit `app.bsky.feed.postgate` (`embeddingRules: disableRule`) lassen sich Zitate von außen sperren, damit niemand den Thread kapert.
- Bluesky-Likes von außen sind erlaubt. Freemind wertet sie nicht für Brückenpunkte.

## Der Feed (pro Event ein `app.bsky.feed.generator`)
Name zum Beispiel "Freemind · Welches Gesetz für Social Media?". Was er ausliefert:
1. **Oben angepinnt:** der Frage-Post des Events mit Link zu `freemind.chat/wedium/go`.
2. **Gespräche über Gräben hinweg:** Chat-Wurzeln, sortiert nach Respekt mal Meinungsunterschied. Ganz oben steht, wo sehr unterschiedliche Meinungen respektvoll gesprochen haben. Das ist unser Kernsignal und unterscheidet den Feed von jeder Engagement-Logik.
3. **Meinungen, die verbinden:** Meinungen mit vielen Ratings aus verschiedenen Clustern.
4. **Wartende Gespräche:** Chats mit genau einer Nachricht, zum Mitlesen und als Anreiz für die Beteiligten.

Spec-Details:
- `getFeedSkeleton` liefert `{feed:[{post:uri, feedContext}], cursor}`. Über `feedContext` können wir den Grund mitgeben ("Brücke", "verbindet", "wartet").
- Über `app.bsky.feed.sendInteractions` kommen "mehr/weniger davon" zurück. Das kann als Signal dienen, beeinflusst aber nicht die Brückenpunkte.
- Datenquelle ist Jetstream, gefiltert auf `wantedDids` des Event-PDS und auf die Collections `app.bsky.feed.post` und `chat.freemind.*`.

## So erlebt man das in Bluesky
```text
[Freemind · Social-Media-Gesetz]
  📌 Frage des Events  → "Mitdiskutieren auf freemind.chat"
  ↳ k7q2 zitiert m3x9: "Verpixelung ja, aber nicht automatisch…"
       🔒 Nur k7q2 und m3x9 können antworten · 6 Nachrichten
  ↳ Meinung von p2d8 · bewertet aus 4 Lagern
```
Wer mitmachen will, landet bei Freemind und bekommt dort eine neue Silo-DID. Ein Bluesky-Konto braucht man nicht und es wird auch nie verknüpft.

## Folgen, die du abwägen solltest
- **Löschen:** Im Protokoll gelöschte Records verschwinden in Bluesky, aber Kopien in fremden AppViews und Archiven bleiben möglich. Damit ist "öffentlich" auch dauerhaft öffentlich.
- **Moderation:** Bluesky-Labeler können Silo-Konten markieren. Das Hosting und damit NetzDG liegen bei Freemind.
- **PDS-Betrieb:** Ein eigener PDS mit vielen kurzlebigen Konten muss sich beim Relay anmelden (`requestCrawl`) und bekommt Ratenlimits. Für ein Event mit etwa 50 Personen ist das unkritisch.
- **Nach dem Event:** Die Silo-Konten frieren ein (Status deaktiviert lassen oder nur keine neuen Posts mehr). Der Feed bleibt als Archiv bestehen.

## Offene Fragen
- Spiegeln wir live während des Events oder erst danach als Archiv-Feed?
- Sollen Bluesky-Nutzer die Meinungen auch liken dürfen, oder sperren wir alles außer Lesen?
