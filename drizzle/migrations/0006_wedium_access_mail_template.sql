insert into public.email_templates (key, subject, heading, body_md) values ('campaign-wedium-access',
'Dein 1-Klick-Zugang: So startest du direkt in die Diskussion',
'Schneller einsteigen mit deinem persönlichen Direktlink',
$m$Die wedium-Live-Diskussion läuft – und wir möchten dir den Einstieg so einfach wie möglich machen.

Bei freemind gibt es bewusst keine klassischen Passwörter: Deine persönliche Passphrase sichert deine anonyme Teilnahme. Damit du sie nicht manuell eintippen musst, haben wir dir einen Direktlink eingerichtet. Ein Klick genügt, und du bist sofort startklar:

[Direkt zur Live-Diskussion →]({{goUrl}})

**Falls du das Gerät wechselst:** Deine Passphrase lautet `{{passphrase}}`. Du kannst sie auf jedem Gerät oben rechts über das Zahnrad-Menü eingeben.

**„{{eventQuestion}}"**

Egal ob Klarnamenpflicht, verlässlicher Jugendschutz, algorithmische Transparenz oder werbefreie Feeds: Was fehlt dir im digitalen Raum am meisten? Was würde die Plattformen wirklich besser machen?

Die Diskussion läuft nur bis **Sonntag, 15. November**. Ein einziger Satz von dir genügt, um deinen Punkt im Diskurskreis zu setzen und andere zum Nachdenken zu bringen.

Wir freuen uns auf deine Perspektive!$m$)
on conflict (key) do nothing;
