# Soft-launch-Mail: Ursache und Fix

## Was tatsächlich passiert ist

Der Zeitplan hat gefeuert, aber der Aufruf des Versenders wird seit Tagen abgelehnt:

```text
Cron-Job "send-campaign-emails": alle 15 Min, aktiv, jeder Lauf "succeeded"
Antwort des Versenders bei JEDEM Lauf: 401 {"ok":false,"error":"unauthorized"}
```

Der Cron-Aufruf authentifiziert sich mit einem im Vault gespeicherten Schlüssel
(`email_queue_service_role_key`). Dieser Schlüssel stimmt nicht mehr mit dem
aktuellen Service-Schlüssel des Backends überein (Schlüssel-Rotation), deshalb
weist die Funktion den Aufruf ab, bevor irgendeine Mail geprüft wird.

Belege aus den Daten:
- `campaign-soft-launch` in `campaign_sends`: 1 Eintrag, letzter am 09.08. (manueller Test)
- `email_send_log`: nur 1 `campaign-soft-launch`-Versand (19.08. 19:18, manuell aus /admin2)
- Fälligkeit der Soft-launch-Mail war 19.08. 22:01 UTC (20.08., 00:01 Berlin) — seither
  nur 401er.

Andere Mails (Verifizierung, Willkommen, So geht's) funktionieren, weil sie direkt
aus dem App-Kontext ausgelöst werden und nicht über den Cron-Schlüssel laufen.

## Fix

1. E-Mail-Infrastruktur-Setup erneut ausführen (idempotent). Das erneuert das
   Vault-Secret `email_queue_service_role_key`, ohne Cron oder Vault manuell
   anzufassen.
2. Direkt danach einen Lauf des Versenders prüfen: die Antwort muss 200 sein und
   Ergebnisse pro Kampagne enthalten.
3. Soft-launch-Mail nachträglich versenden — der Versender holt sie beim nächsten
   Lauf automatisch nach, da sie fällig ist und pro Person nur einmal verschickt
   wird (`campaign_sends` mit Unique-Key). Alternativ manuell in /admin2 anstoßen.
4. Kontrolle: `campaign_sends` für `campaign-soft-launch` muss danach eine Zeile
   pro bestätigtem Empfänger haben, `email_send_log` entsprechend `sent`-Zeilen.
   Fehlerfälle (`dlq`/`bounced`/`suppressed`) melde ich dir konkret.

Kein Code-Änderungsbedarf: Logik, Fälligkeitsdatum und Duplikatschutz sind korrekt,
es war ausschließlich der abgelaufene Zugriffsschlüssel des Zeitplans.

## Hinweis zu Live

Der Zeitplan auf der veröffentlichten Umgebung wird beim Publish eingerichtet.
Nach dem Fix empfiehlt sich ein erneutes Publish, damit dort derselbe Stand gilt.
