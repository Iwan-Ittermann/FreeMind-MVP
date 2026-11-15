/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'
import { Bubble, Label, OpinionCard, Para, PrimaryButton, UnderstandingScale, WediumShell } from './wedium-layout.tsx'

type Segment = 'understanding' | 'reply' | 'start-chat' | 'opinion'
interface Props {
  subject?: string; heading?: string; body?: string; segment?: Segment
  ownOpinion?: string; partnerOpinion?: string; partnerMessage?: string; ownMessage?: string
  unratedCount?: string; unansweredCount?: string; goUrl?: string; trackingUrl?: string
}

const CTA: Record<Segment, string> = {
  understanding: 'Verständnis jetzt bewerten',
  reply: 'Antworten und bewerten',
  'start-chat': 'Jetzt ein Gespräch starten',
  opinion: 'Meinung jetzt posten',
}

const Email = ({ subject = 'Endspurt: Heute bis 23:59 Uhr', heading = 'Endspurt!', body = '', segment = 'start-chat', ownOpinion = '', partnerOpinion = '', partnerMessage = '', ownMessage = '', unratedCount = '0', unansweredCount = '0', goUrl = 'https://freemind.chat/wedium/go', trackingUrl }: Props) => (
  <WediumShell preview={subject} badge="Nur noch heute · bis 23:59 Uhr" heading={heading} trackingUrl={trackingUrl}>
    {body ? <Para>{body}</Para> : null}
    {ownOpinion ? <OpinionCard label="Deine Meinung" text={ownOpinion} /> : null}

    {segment === 'understanding' && (<>
      <Label>Dein Gespräch</Label>
      {partnerOpinion ? <Bubble caption="Meinung deines Gegenübers" text={partnerOpinion} /> : null}
      {partnerMessage ? <Bubble caption="Gegenüber" text={partnerMessage} /> : null}
      {ownMessage ? <Bubble own caption="Du" text={ownMessage} /> : null}
      <Para><strong>Das Wichtigste zum Schluss:</strong> Wie gut hat dich dein Gegenüber verstanden? Deine Bewertung auf der Skala entscheidet, wer Brückenpunkte bekommt.{Number(unratedCount) > 1 ? ` Das gilt für ${unratedCount} deiner Gespräche.` : ''}</Para>
      <UnderstandingScale question="Wie gut versteht der/die andere dich?" />
    </>)}

    {segment === 'reply' && (<>
      <Label>Wartet auf deine Antwort</Label>
      {partnerOpinion ? <Bubble caption="Meinung deines Gegenübers" text={partnerOpinion} /> : null}
      {partnerMessage ? <Bubble caption="Neue Nachricht" text={partnerMessage} /> : null}
      <Bubble own text="…" caption="Du" />
      <Para>Ein kurzer Satz reicht. Sobald ihr beide geschrieben habt, öffnet sich unten im Chat die Skala: Bewerte dort, wie gut dein Gegenüber dich verstanden hat.{Number(unansweredCount) > 1 ? ` Insgesamt warten ${unansweredCount} Nachrichten auf dich.` : ''}</Para>
    </>)}

    {segment === 'start-chat' && (
      <Para>Öffne im Graph eine Meinung, die deiner widerspricht, und stell eine ehrliche Frage. Nach der ersten Antwort kannst du unten im Chat bewerten, wie gut ihr euch versteht.</Para>
    )}

    {segment === 'opinion' && (
      <Para>Bis 23:59 Uhr kannst du deine Meinung noch auf die Karte setzen. Ein Satz genügt: Welches Gesetz wünschst du dir für Social Media?</Para>
    )}

    <PrimaryButton href={goUrl}>{CTA[segment]}</PrimaryButton>
    <Para>Dein persönlicher Link meldet dich direkt an. Beim Öffnen erscheinen außerdem zwei kurze Abschlussfragen, das dauert 30 Sekunden.</Para>
  </WediumShell>
)

export const template = {
  component: Email,
  subject: (d: Record<string, unknown>) => String(d.subject ?? 'Endspurt: Heute bis 23:59 Uhr'),
  displayName: 'wedium: Endspurt (individuell)',
  previewData: { segment: 'understanding', ownOpinion: 'Ich wünsche mir ein Gesetz, das Algorithmen transparent macht.', partnerOpinion: 'Radikal freie Meinungsäußerung.', partnerMessage: 'Wer soll denn kontrollieren, was transparent genug ist?', ownMessage: 'Eine unabhängige Stelle, wie bei Lebensmitteln.' },
} satisfies TemplateEntry
