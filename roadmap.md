# Roadmap

## Erledigt
- Stream-Tab (4. Tab): Spiral-Auswahl über dem Graphen — Plan freigegeben, umgesetzt und verifiziert
  - stream-spiral.ts + 8 Unit-Tests (grün)
  - RPC pin_stream_entry (vergangene Einträge unveränderlich)
  - useStreamFocus (Live-Auswertung alle 4 s)
  - Stream-Tab in TTSideTabs (Countdown, „Jetzt im Stream", „In diesem Umlauf bisher", ReadOnly-Chat)
  - Spirale im Signal-Renderer + Zahnrad-Umschalter
  - DE/EN-Texte; Build OK; Browser-Verifikation OK

## Offen
- PostHog-Events nach Publish verifizieren (blockiert: Publish)
- /gutefrage: genaues Datum erst ab 100 bestätigten Anmeldungen (blockiert: wartet auf Signups)
- Tägliche Zusammenfassungen bleiben deaktiviert bis zum nächsten Event
