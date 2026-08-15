UPDATE public.email_templates
SET subject = 'So funktioniert freemind',
    heading = 'SO GEHT''S',
    body_md = 'Eine Woche. Eine Frage. Fünf Menschen gewinnen je 100 €.

**Der Kreis**

Alle Meinungen zur Frage der Woche stehen gemeinsam in einem Kreis.

![Der freemind Kreis mit allen Meinungen]({{graphImg}})

**Schritt 1**

Klicke eine Meinung an und bewerte, wie groß eure Meinungsverschiedenheit ist.

![Skala für den Meinungsunterschied]({{diffImg}})

Je unterschiedlicher zwei Meinungen sind, desto weiter stehen sie sich im Kreis gegenüber.

**Schritt 2**

Du bekommst Punkte, wenn du mit Menschen chattest, die anders denken als du – und dein Gegenüber das Gespräch gut bewertet.

![Skala: Wie gut versteht der oder die andere dich?]({{understandingImg}})

**Ein Beispiel**

![Meinungsunterschied 10 mal Chat-Bewertung 5 gleich 50 Punkte]({{handImg}})

**Am Ende**

Die fünf Menschen mit den meisten Punkten erhalten ein Losungswort und damit ihr Preisgeld.

[Alles nachlesen]({{sogehtsUrl}})',
    updated_at = now()
WHERE key = 'campaign-sogehts';