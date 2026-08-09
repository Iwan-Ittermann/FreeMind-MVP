insert into public.topics (title, description, is_active, url_slug, status, short_code)
values ('Welches Haustier magst du am liebsten - und warum?', null, true, 'welches-haustier-magst-du-am-liebsten', 'Active', 'pt74')
on conflict (short_code) do update set title = excluded.title;

insert into public.app_settings (key, value) values
  ('test_topic_short_code', 'pt74'),
  ('real_topic_short_code', '7mm9'),
  ('opinions_open_at', '2026-08-19T22:01:00Z'),
  ('discussion_open_at', '2026-08-22T22:01:00Z')
on conflict (key) do update set value = excluded.value, updated_at = now();

update public.email_templates
set body_md = 'In wenigen Tagen startet die Diskussion.

Nimm dir jetzt kurz Zeit, dich vorzubereiten:

- Halte deine Passphrase bereit: `{{passphrase}}`
- Probier die Plattform schon einmal im Testbereich aus: [{{testUrl}}]({{testUrl}})
- Überlege dir, was du zur Frage sagen möchtest

Wir freuen uns auf dich!

[FAQ]({{faqUrl}})',
    updated_at = now()
where key = 'campaign-prepare';