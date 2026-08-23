# Notfall-Fix: App liest und schreibt keine Daten mehr

## Was kaputt ist (bestätigt)

Ein Live-Test gegen die Datenbank mit dem App-Schlüssel gibt sofort Fehler:

- Meinungen laden: `permission denied for function has_role`
- Chats laden: `permission denied for function is_chat_participant`

Ursache: beim letzten Security-Durchgang wurde `EXECUTE` für die Rollen `anon` und `authenticated` auf internen Hilfsfunktionen entzogen. Diese Funktionen werden aber **innerhalb der RLS-Policies** aufgerufen, und Policies laufen mit der Rolle des Nutzers. Dadurch schlägt jede Abfrage auf Tabellen mit solchen Policies komplett fehl — daher keine Nodes im Admin-Panel, kein Graph, und "Posten" bricht ab.

Betroffene Funktionen (in Policies referenziert, aber ohne Rechte für Client-Rollen):
`has_role`, `is_chat_participant`, `can_view_opinion`, `event_setting`, `is_real_event_topic`, `fake_node_user_id`.

Betroffene Tabellen u.a.: `opinions`, `chats`, `chat_messages`, `chat_message_reactions`, `chat_ratings`, `chat_requests`, `opinion_ratings`, `opinion_ips`, `app_settings`, `audit_logs`, `court_cases`, `fake_nodes`.

## Fix (eine Migration, sofort)

1. `GRANT EXECUTE` auf die oben genannten Hilfsfunktionen an `anon` und `authenticated` zurückgeben. Das ist sicher: alle sind `SECURITY DEFINER` mit fixem `search_path` und geben nur boolesche/Einzelwerte über die eigene `auth.uid()` bzw. Settings zurück — sie öffnen keine Daten, sie sind die Bedingung *für* die Policies.
2. Danach den kompletten Funktionsbestand prüfen: jede Funktion, die in einer RLS-Policy vorkommt oder direkt vom Client per RPC gerufen wird, muss Rechte für die passende Client-Rolle haben. Fehlende Fälle in derselben Migration nachziehen (z.B. `get_time_weighted_ratings`, falls vom Client genutzt).

## Verifikation vor Abschluss

- Lesetest mit App-Schlüssel: `opinions`, `chats`, `chat_messages` liefern Daten statt `42501`.
- Angemeldeter End-to-End-Test im Browser auf `/go`: Meinung posten funktioniert, Graph zeigt Nodes, Chatliste lädt.
- Admin-Panel: Node-Liste ist wieder gefüllt.
- Security-Linter laufen lassen, damit keine neue echte Lücke entsteht.

## Nachtrag zur Security-Memory

Regel festhalten: `EXECUTE` für `anon`/`authenticated` darf niemals von Funktionen entzogen werden, die in RLS-Policies vorkommen — der Entzug bricht die gesamte Tabelle, statt sie zu schützen.
