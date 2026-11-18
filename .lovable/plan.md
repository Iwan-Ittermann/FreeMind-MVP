# Richtung B vertieft: Freemind-Lexicons mit anonymen Postings

Konzept, noch nichts zum Bauen. Grundlage: AT-Protocol-Specs (Repository, DID, Lexicon, Sync).

## Korrektur
"Geschützte Bewertungen als Kernidee" war meine Annahme und ist falsch. In Freemind ist die Respekt-Bewertung als Pfeilfarbe sichtbar. Das Problem in B ist also nicht, dass Bewertungen öffentlich wären. Das Problem ist die **Identität**: Wer im Protokoll schreibt, schreibt unter seiner DID.

## Warum anonym im AT Protocol schwierig ist
- Jeder Record liegt im Repo **einer** DID und ist mit deren Schlüssel signiert. Damit ist er immer an eine dauerhafte Kennung gebunden, also pseudonym.
- Wenn ein Nutzer mit seinem eigenen Konto schreibt (sein PDS, AT-OAuth), sind alle seine Meinungen und Bewertungen öffentlich miteinander und mit seinem Handle verknüpft. Für anonyme Postings kommt das nicht in Frage.

## Drei Modelle für Anonymität
1. **Ein Freemind-Repo für alle (empfohlen).** Freemind betreibt eine DID (z. B. `did:web:freemind.chat`) mit eigenem PDS. Alle Meinungen werden dort als `chat.freemind.opinion` geschrieben, ohne Feld für den Autor. Öffentlich gibt es keine Autor-Kennung. Freemind kennt die Zuordnung intern (IP-Logging und NetzDG bleiben möglich).
   - Grenze: Inhalte gehören dann nicht dem Nutzer und ziehen nicht mit ihm um. Das ist der Preis der Anonymität.
2. **Eine Wegwerf-DID pro Posting.** Jede Meinung bekommt eine eigene `did:plc`. Das ist technisch anonym, aber das PLC-Verzeichnis hat Ratenlimits, es entstehen tausende Mini-Repos, und im Netz sieht es aus wie Spam. Davon rate ich ab.
3. **Eine DID pro Event und Person.** Innerhalb eines Events pseudonym, über Events hinweg nicht verknüpfbar. Das erfüllt "anonym" nicht vollständig, weil sich die Meinung und die Bewertungen einer Person im Event zusammenführen lassen. Nur als Option.

## Ein Fallstrick, der für alle Modelle gilt
Auch ohne Autorfeld lässt sich ein Autor zurückverfolgen, wenn Records zu viel verraten. Deshalb:
- Ratings nicht als einzelne Records "A bewertet B" veröffentlichen, sonst rekonstruiert man aus dem Muster die Personen. Besser sind Gesamtwerte pro Meinung, z. B. `chat.freemind.opinionStats`, die regelmäßig neu geschrieben werden.
- Zeitstempel (`createdAt`) grob runden und nicht in derselben Sekunde posten, in der jemand online kommt.
- Chats bleiben ganz außerhalb des Protokolls.

## Mögliche Lexicons (Entwurf)
```text
chat.freemind.topic          Frage, Zeitraum, Status
chat.freemind.opinion        topic (at-uri), text, createdAt (gerundet), kein Autor
chat.freemind.opinionStats   opinion (at-uri), Position/Cluster, Anzahl Ratings, Ø Unterschied, Brückenpunkte
chat.freemind.topicResult    Polarisierung vor/nach dem Event (aggregiert)
```
Wer die Firehose liest, kann mit diesen Daten einen eigenen Graphen bauen. Damit wird der Diskursraum offen und nachprüfbar, ohne dass jemand bloßgestellt wird.

## Was B damit bringt
- Freemind-Debatten werden zu offenen, signierten und nachprüfbaren Daten, z. B. für Forschung und Partner wie Wedium.
- Andere AppViews oder Bluesky-Feeds können anonyme Meinungen zeigen und zurück zu Freemind verlinken.
- Die Moderation und die rechtliche Verantwortung bleiben bei Freemind, weil das Repo uns gehört. Gelöschte Inhalte werden als Löschung im Repo ausgespielt.

## Offene Fragen
- Reicht Modell 1, also "anonym gegenüber der Öffentlichkeit, Freemind kennt die Zuordnung"? Oder muss es auch gegenüber Freemind anonym sein?
- Sollen Meinungen sofort ins Protokoll gehen oder erst nach dem Event als Archiv?
