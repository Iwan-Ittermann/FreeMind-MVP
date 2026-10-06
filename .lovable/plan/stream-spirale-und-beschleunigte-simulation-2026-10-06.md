# Stream-Spirale und beschleunigte Simulation

## Umsetzung
- Den Spiralen-Schalter innerhalb derselben Browserseite synchronisieren, sodass Graph und Einstellung sofort reagieren und kein Neuladen nötig ist.
- Den deterministischen 72-Stunden-Loop auf **60-fache Geschwindigkeit** setzen: Der komplette Loop dauert 72 reale Minuten, eine Simulationsstunde entspricht einer realen Minute. Das ergibt im Mittel etwa 2–3 neue Nachrichten pro Minute, mit dichteren Konfliktphasen und ruhigeren Abschnitten — sichtbar lebendig, aber nicht hektisch.
- Die bisherige Text-Zeitanzeige durch eine sehr dünne weiße Fortschrittslinie mit rotem Punkt ersetzen. Die Position zeigt den Fortschritt durch die 72 Stunden; die genaue Stunde bleibt als zugängliche Beschriftung/Tooltip verfügbar.
- Desktop und Mobil auf sofortiges Umschalten, korrekte Loop-Position und Überlappungen prüfen.

## Technische Details
- Der Preference-Hook sendet und empfängt ein lokales Browser-Event zusätzlich zur Speicherung.
- Die Replay-Funktion berechnet `frame = (elapsed × 60) mod 259200` und leitet daraus einen beschleunigten Zyklus ab; gespeicherte Ereigniszeiten bleiben in der ursprünglichen 72-Stunden-Zeitskala.
- Die Fortschrittsanzeige nutzt ausschließlich den letzten serverbestätigten Frame und läuft clientseitig nicht voraus.
