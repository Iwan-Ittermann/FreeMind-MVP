# Sim-Visuals in die echte Live-Diskussion übernehmen

## Ziel
Die echte Diskussion auf /go und /wedium/go soll genauso lebendig aussehen wie die Simulation. Wenn echte Teilnehmende schreiben oder bewerten, sehen alle anderen das live im Kreis.

## Was sich ändert
1. **Fliegende Chat-Nachrichten:** Jede echte Nachricht fliegt als Textblase (max. 2 Zeilen) von der Absenderin zum Empfänger, wie in der Sim. Nur die ersten Worte sind zu sehen. Privat bleibt der Chat trotzdem: Wer nicht im Chat ist, sieht nur den Flug, nicht den ganzen Verlauf.
2. **Sichtbare Meinungsbewertungen:** Bewertet jemand eine Meinung im Meinungen-Tab, erscheint bei ihm kurz das passende Skalen-Icon und die Verbindung blitzt auf. Mehrere Bewertungen erscheinen nacheinander. Schnelles Hin- und Herschieben am Regler löst nur eine Anzeige aus, nämlich für den Wert, bei dem man loslässt.
3. **Stromlinien:** Im Wedium-Look bekommen fliegende Nachrichten auch live die leuchtende gepunktete Stromlinie.
4. **Punkte mit Icon:** Die Zahl neben jeder Person bekommt ein kleines Brücken-/Punkte-Icon davor, damit sie als Punkte und nicht als Nummer gelesen wird. Das gilt in allen Ansichten (Sim, Live, Auge und Wedium).

## Was gleich bleibt
- Sim und Live nutzen dieselbe Animation, es gibt also keine zweite Darstellung.
- Benachrichtigungen ändern sich nicht.
- Die Simulation in den eingebetteten Vorschauen bleibt unverändert.

## Offene Frage
Sollen andere Teilnehmende bei echten Chats den Textanfang der Nachricht sehen? In der Sim ist alles öffentlich. Alternative: Live fliegt nur eine leere Blase. Vorschlag: Textanfang zeigen, wie bisher beim Absender.

## Technische Details
- Nachrichten-Flug: Der Broadcast `message-animation` in `useChatMessages` gibt es schon. Ich prüfe zuerst, ob er für echte Themen und für alle Zuschauenden ankommt, und ziehe ihn dann auf denselben Weg wie die Sim-Events in `useTopicData`.
- Bewertungen: Neues Broadcast-Event `difference-rating` auf demselben Kanal, gesendet nach dem entprellten Speichern in `useDisagreementRating`. Es läuft über `graphActivityFields` und `scheduleOpinionReaction` und markiert keinen Chat als aktiv.
- Duplikate werden über die Event-ID herausgefiltert, wie beim Sim-Pfad.
- Stromlinie: Ich prüfe, ob sie im Wedium-Look an Sim/Präsentation gekoppelt ist, und koppele sie nur an den Wedium-Look.
- Punkte-Icon: kleines SVG-Icon vor dem Text in `SignalNode.tsx` (Abschnitt Punktezähler), Zahl bleibt im Viewport.
- Tests: `graph-animation.test.ts` um einen Fall erweitern, bei dem ein Live-Bewertungsevent ein Badge erzeugt, ohne einen Chat aktiv zu setzen.
