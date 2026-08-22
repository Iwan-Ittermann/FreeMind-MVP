# Respekt-Bewertung 0–100, zeitgewichtete Punkte, Listen-Feinschliff

## 1. Respekt-/Verständnis-Bewertung im Chat (0–100)

- Neue Skala 0–100 statt der 5 Stufen-Buttons: schlanker, einfarbiger Balken-Slider (Track in `muted`, Füllung in `primary`), nur zwei Endlabels "Gar nicht" und "Sehr gut", darunter mittig der gewählte Zahlenwert.
- Kein Default: der Griff/Wert erscheint erst, wenn der Nutzer die Skala antippt (gleiche Logik wie in der Polarisierungs-Befragung), Speichern per "OK"-Bestätigung.
- Titelzeile: Frage zentriert, ohne das Kopf-/Sprechblasen-Icon. Rechts am Rand die eigenen Bridge-Punkte für genau diesen Chat (`Punkte: n`).
- Freischaltung: sobald **je zwei Nachrichten von beiden Seiten** vorliegen, ist die Bewertung für beide offen (bisher: Gesamtzahl 3, danach 7, 12, 18 …). Weitere Runden bleiben in wachsenden Abständen erhalten, jeweils an die Bedingung "beide haben in dieser Runde geschrieben" gekoppelt.
- Gleiche neue Skala im Desktop-Fenster (`FloatingChatWindow`) und in der eingebetteten Mobil-Ansicht (`EmbeddedChatView`), damit es nur eine Bewertungs-Komponente gibt.

## 2. Zeitgewichtete Bewertungen (Manipulationsschutz)

Bewertungen bleiben änderbar, aber es zählt nicht der letzte Klick, sondern der **zeitgewichtete Durchschnitt**: jeder Wert wird mit der Dauer gewichtet, die er Bestand hatte (Beispiel: 1 Tag Wert 100, danach 1 Tag Wert 20 → 60). Damit bringt eine Änderung in den letzten Minuten fast kein Gewicht mehr.

- Alle Bewertungsänderungen werden zusätzlich append-only mitgeschrieben (Wert + Zeitstempel), sowohl für Verständnis (Chat) als auch für den Meinungsunterschied (Meinungsliste).
- Der effektive Wert eines Nutzers gegenüber einer Meinung = Summe(Wert × Dauer) / Summe(Dauer), wobei die Dauer des letzten Wertes bis "jetzt" bzw. bis zum Diskussionsende läuft.
- Punkte-Berechnung bleibt in der Größenordnung wie heute: `Punkte = (Verständnis/10) × Unterschied`, aggregiert über die zeitgewichteten Werte. Graph-Radius (Gesamtsumme), Top-5 und Punkte-Anzeigen bleiben dadurch vergleichbar.
- Anzeige im Chat: der Punktwert dieses Chats basiert auf denselben zeitgewichteten Werten, damit UI und Ranking identisch sind.

## 3. Meinungsliste (Andere Meinungen)

- Punkte-Badge pro Meinung entfernen.
- Button für noch nicht gestartete Chats heißt "Chat starten" (bestehende Chats weiterhin "Chat öffnen").
- Der eigene Meinungsunterschied wird als kleiner Balken dargestellt (0–100 % gefüllt) mit Zahl daneben, statt als "n/10 Unterschied"-Pill; Klick öffnet weiterhin den Bewertungs-Dialog.

## Technische Umsetzung

- Neue Tabelle `rating_events` (append-only): `topic_id`, `rater_id`, `kind` (`understanding` | `difference`), `target_opinion_id`, `chat_id` (nullable), `value` (0–100 bzw. 0–10), `created_at`; RLS: eigene Zeilen einfügen/lesen, GRANT für `authenticated` + `service_role`, plus `GRANT SELECT` für die Aggregat-Funktion.
- Migration füllt `rating_events` initial aus `chat_ratings` und `opinion_ratings` (mit deren `created_at`/`updated_at`), damit bestehende Bewertungen nicht verloren gehen.
- Serverseitige Aggregation: `get_topic_directed_pairs` und `get_graph_pairs` werden auf zeitgewichtete Werte aus `rating_events` umgestellt (Fensterfunktion `lead(created_at)`, letzte Periode bis `least(now(), discussion_end_at)`), `security definer`, `search_path = public`.
- `chat_ratings` / `opinion_ratings` bleiben als "aktueller Wert" für die UI erhalten und werden weiter geschrieben; zusätzlich jedes Mal ein `rating_events`-Insert.
- Verständnis wird künftig als 0–100 gespeichert (`chat_ratings.empathy`); bestehende 0–10-Werte werden in der Migration ×10 skaliert, und die Punkteformel dividiert durch 10.
- Neue Komponente `src/components/chat/RespectScale.tsx` (0–100-Balken, zentrierter Titel, Punkte rechts), genutzt von `EmbeddedChatView` und `FloatingChatWindow`; `UnderstandingIcon` wird aus dem Chat entfernt.
- `src/lib/rating-rounds.ts` erhält eine Freischaltung nach "2 Nachrichten je Seite" und zählt Runden weiterhin über die Gesamtnachrichten.
- Alle Texte ("Gar nicht", "Sehr gut", "Chat starten", "Punkte") über `t()` in `de.json`/`en.json`.
