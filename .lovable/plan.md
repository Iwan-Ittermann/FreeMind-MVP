# Denkrichtungen: Freemind x AT Protocol

Konzeptpapier, noch nichts zum Bauen. Grundlage sind die AT-Protocol-Specs (atproto.com/specs): DID, Handle, Repository, Lexicon, Sync/Firehose, OAuth, Labels, Feed Generator.

## Harte Fakten aus den Specs, die alles bestimmen
- **Alles im Repo ist öffentlich.** Records liegen in signierten Repos (Merkle Search Tree, CIDs) auf dem PDS des Nutzers und gehen über Relay und Firehose (`com.atproto.sync.subscribeRepos`) an alle. Private Daten kennt das Protokoll noch nicht. Bluesky-DMs (`chat.bsky.*`) laufen über einen zentralen Dienst, nicht über das Protokoll.
- **Eigene Datentypen gehen über Lexicons.** Jede App darf eigene NSIDs festlegen (z. B. `chat.freemind.opinion`) und eigene Records in fremde PDS schreiben, wenn der Nutzer per AT-OAuth (PAR + DPoP, mit Scopes) zustimmt.
- **Ein AppView setzt zusammen.** Wer die Firehose liest (oder Jetstream als JSON-Variante), baut seine eigene Sicht. Bluesky ist nur ein AppView von vielen.
- **Feed Generator** (`app.bsky.feed.generator`, `getFeedSkeleton`) liefert nur sortierte Post-URIs. So entsteht eigene Sortierung in Bluesky, ohne dass Bluesky Code von uns braucht.
- **Labeler** (`com.atproto.label`, Ozone) hängen signierte Labels an beliebige Inhalte. Nutzer abonnieren sie freiwillig.
- **Identität:** `did:plc` oder `did:web`, Handle per DNS/HTTPS. Für Konten ohne Login wie unsere Passphrase-Konten gibt es keinen Ersatz.

## Richtung A: Freemind als Bluesky-Feed ("Brücken-Feed")
Ein Feed Generator, der Bluesky-Posts zu einem Thema nach dem Brücken-Prinzip sortiert. Nach oben kommt, was von Leuten mit unterschiedlichen Positionen gelikt oder wohlwollend beantwortet wird, nicht was Empörung auslöst.
- Passt zur Spec: Ein Feed ist nur eine Liste von URIs, der Aufwand ist klein, Nutzer brauchen kein Konto bei uns.
- Grenze: Wir sehen nur öffentliche Likes, Reposts und Antworten. Positionen müssten wir schätzen (Cluster aus dem Like-Graph). Unsere Verständnisbewertung gibt es dort nicht.
- Wert: Größte Reichweite für wenig Aufwand, ein gutes Schaufenster.

## Richtung B: Eigene Lexicons, Freemind als AppView
Meinung, Meinungsunterschied und Verständnisbewertung werden zu offenen Datentypen: `chat.freemind.opinion` (Thema, Text), `chat.freemind.differenceRating` (Ziel-URI, 0–100), `chat.freemind.understandingRating`. Freemind liest die Firehose und rechnet daraus Graph und Brückenpunkte.
- Passt zur Spec: Daten gehören dem Nutzer, liegen auf seinem PDS und gehen mit, wenn er umzieht. Andere könnten eigene Ansichten auf dieselben Daten bauen.
- Grenze, und die ist entscheidend: **Ratings wären öffentlich und signiert.** Jeder sähe, wer wen wie bewertet hat. Das widerspricht unserer Kernidee mit geschützten Bewertungen und kann dazu führen, dass Leute taktisch bewerten.
- Mögliche Mischform: Nur Meinungen gehen ins Protokoll. Ratings bleiben bei Freemind, oder es wird nur ein Gesamtwert veröffentlicht.

## Richtung C: Bluesky-Login, Inhalte bleiben bei Freemind
AT-OAuth nur als Anmeldung ("Mit Bluesky anmelden"). Die DID wird zur festen Identität über mehrere Events hinweg, das Handle ist optional sichtbar.
- Wert: Weniger Abbruch als bei DOI und Passphrase (Einstiegshürde aus dem Wedium-Test), und die Identität bleibt über Events hinweg gleich.
- Grenze: Das passt nicht zur bisherigen Anonymität mit Passphrase. Sinnvoll wäre es nur als zusätzliche Option.

## Richtung D: Ergebnisse veröffentlichen, die Chats bleiben privat
Der Ort des Gesprächs bleibt bei Freemind, so wie Bluesky es mit seinen DMs macht. Ins Protokoll geht nur, was der Nutzer ausdrücklich teilt:
- ein Post "Ich hatte ein gutes Gespräch mit jemandem, der anders denkt", mit Link zurück zum Thema
- ein Event-Record (`chat.freemind.topic`) mit Frage, Zeitraum und Gesamtergebnis wie dem Polarisierungswert vor und nach dem Event
- Wert: Der Teil, der Menschen in den Dialog zieht, findet seinen Weg ins Netzwerk. Die geschützte Struktur bleibt unangetastet.

## Richtung E: Freemind als Labeler
Ein Labeler-Dienst markiert Bluesky-Threads, zum Beispiel "brückenbauend" oder "hier lohnt ein 1:1-Gespräch", und verlinkt in einen Freemind-Raum zu diesem Thread.
- Passt zur Spec: Labels sind freiwillig, signiert und lassen sich abonnieren. Das ist keine Zensur, sondern eine zusätzliche Ebene, und passt zu "Architektur statt Moderation".
- Grenze: Labels entstehen bei uns automatisch oder durch Menschen. Es braucht klare und nachvollziehbare Kriterien.

## Einordnung
```text
Aufwand      gering ---------------------------------> hoch
             C Login   A Feed   D Teilen   E Labeler   B Lexicon/AppView
Wahrt die geschützte 1:1-Struktur:  A C D E ja | B nur teilweise
```
Möglicher Weg: erst A (zeigt das Prinzip in Bluesky), dann D (Rückweg zu Freemind), B nur mit öffentlichen Meinungen.

## Offene Fragen für dich
- Soll die Anbindung vor allem **Reichweite** bringen (A, D, E) oder **Datenhoheit und Offenheit** (B, C)?
- Darf eine Teilnahme bei Freemind überhaupt öffentlich mit einer Bluesky-Identität verknüpft sein?
