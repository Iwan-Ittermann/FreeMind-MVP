insert into public.email_templates (key, subject, heading, body_md)
values (
  'nudge-opinion',
  'Noch {{daysLeft}} Tage — deine Meinung fehlt',
  'Deine Meinung fehlt',
  E'Hi! Auf freemind diskutieren gerade **{{opinionCount}} Leute** über „{{topicTitle}}" — **{{messageCount}} Nachrichten** bisher. Du bist angemeldet, aber deine Meinung fehlt noch.\n\n**Aus den Chats:**\n\n{{quotesBlock}}\n\nAm {{endDate}} endet die Diskussion. Die Top 5 mit den meisten Brückenpunkten bekommen je **50 €**. Bei {{opinionCount}} Teilnehmenden ist das eine ziemlich gute Quote.\n\nEin Satz reicht. Danach siehst du alle anderen.\n\n[Meinung posten]({{goUrl}})\n\nPassphrase: {{passphrase}}'
)
on conflict (key) do nothing;