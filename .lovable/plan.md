# Respekt-Bewertung, Umfrage, Login, Punkte-Benachrichtigung, Graph-Radius

## 1. Respekt-Bewertung: immer offen, sobald beide geschrieben haben

Neue Regel: Sobald jede Seite mindestens **eine** Nachricht gesendet hat, ist die Respekt-Skala (0–100) offen — und bleibt dauerhaft offen. Das alte Runden-Schema (4, 9, 15, 22 … Nachrichten, eine Bewertung pro Runde) wird entfernt.

- Nutzer können ihre Bewertung jederzeit anpassen; der aktuelle Wert wird vorausgewählt angezeigt.
- Zeitgewichtung bleibt unangetastet: jede Änderung schreibt weiter ein `rating_events`-Ereignis, die Punkte ergeben sich aus der Dauer, in der ein Wert gehalten wurde (Manipulationsschutz am Ende bleibt wirksam).
- Der „freigeschaltet"-Funke erscheint nur einmal pro Chat.

## 2. Polarisierungs-Umfrage: Stand und Nachholen

Prüfung der Daten: es haben **5 Personen** geantwortet (alle Welle „pre"), nicht nur eine — am 21.08. (2), 23.08. (3). Von den 7 Personen mit Meinung in /go haben 5 geantwortet, 2 nicht; im Testthema fehlen weitere.

Ursache für die Ausfälle: eine frühere Version der Umfrage hatte einen „später"-Button, der die Ablehnung dauerhaft im Gerät gespeichert hat. Bei diesen Nutzern erscheint die Umfrage nie wieder, obwohl sie nie geantwortet haben.

Fix (in-App, keine E-Mail): der Speicherschlüssel wird versioniert, sodass alte „später"-Ablehnungen ignoriert werden. Die Umfrage erscheint dann beim nächsten Öffnen erneut für alle, die noch keine Antwort in der Datenbank haben — und lässt sich nur noch per Antwort (inkl. „keine Angabe") schließen.

## 3. Dauerhaft eingeloggt bleiben

Ziel: Passphrase nur beim ersten Mal pro Gerät.

- Die Sitzung wird schon dauerhaft gespeichert; kontrolliert wird, wo sie unnötig verloren geht (z. B. `signOut` vor dem Passphrase-Login, Fehlerpfade, die Session verwerfen).
- Abmelden bleibt ausschließlich über die Logout-Buttons möglich.
- Verifikation im Browser: einloggen, Seite neu laden und Tab schließen/neu öffnen — Nutzer bleibt angemeldet.

## 4. Benachrichtigungen: Brückenpunkte statt neuer Nachrichten

- Neue Benachrichtigung „Du hast X Brückenpunkte erhalten" bei **jeder** Bewertung, die jemand für die eigene Meinung abgibt (mit Link in den betreffenden Chat).
- Benachrichtigungen vom Typ „neue Nachricht" werden nicht mehr erzeugt — neue Nachrichten sind bereits über die Unread-Badges in der Chatliste sichtbar. Das gilt auch für Push und die Tages-Digest-Mail.
- Der Glocken-Filter „Neue Nachrichten" wird durch „Brückenpunkte" ersetzt.

## 5. Warum der Knoten mit 15 Punkten am Rand sitzt

Bestätigte Ursache: die Radien werden **rein nach Rang** verteilt, nicht nach Punktzahl. In /go haben derzeit nur zwei Knoten überhaupt Punkte (ca. 24,5 und 15,2). Bei zwei Punkte-Gruppen bekommt Rang 1 den Faktor 1,0 — also exakt den äußersten Ring, obwohl er der zweitbeste Knoten ist.

Fix: Der Radius wird aus dem **Punkteverhältnis zum Spitzenwert** abgeleitet (mit sanfter Kurve) statt aus dem Rangindex, und Knoten mit Punkten werden vom äußersten Ring (der für „noch keine Punkte" reserviert ist) abgesetzt. Damit landet ein Knoten mit 15 von 25 Punkten im Mittelfeld, Cluster-Winkel und Determinismus bleiben unverändert.

## Technische Details

- `src/lib/rating-rounds.ts`: Runden-Logik entfernen/ersetzen durch `respectUnlocked(own, partner) = own >= 1 && partner >= 1`; Aufrufer `EmbeddedChatView.tsx` und `FloatingChatWindow.tsx` anpassen (kein `currentRound`-Gate, kein „bereits bewertet"-Sperren, aktueller Wert vorbelegt).
- `TTPolarizationPoll.tsx`: `dismissKey` auf `:v2` versionieren.
- Auth: `loginWithPassphrase` und Fehlerpfade prüfen, damit keine unnötigen `signOut`-Aufrufe die Session löschen.
- Migration: Trigger `notify_on_new_message` entfernen; neuer Trigger auf `rating_events` (kind `understanding`) erzeugt eine `notifications`-Zeile Typ `bridge_points` für den Besitzer der bewerteten Meinung (kein Selbst-Notify). `send-push`/Digest auf den neuen Typ mappen.
- `src/lib/tt-notification-prefs.ts` + `TTHeader.tsx`: Filter `newMessage` → `bridgePoints`.
- `src/lib/tt-layout.ts`: Radiusberechnung von `groupIndex/(groupCount-1)` auf normalisiertes Punkteverhältnis umstellen, Ober-/Untergrenzen setzen; `resolveCollisions` und Winkellogik unverändert.
