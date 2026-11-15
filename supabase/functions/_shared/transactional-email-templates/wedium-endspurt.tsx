/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import type { TemplateEntry } from './registry.ts'
import { Bubble, Label, OpinionCard, Para, PostScript, PrimaryButton, UnderstandingScale, WediumShell } from './wedium-layout.tsx'

type Segment = 'understanding' | 'reply' | 'start-chat' | 'opinion'
interface Props {
  subject?: string; heading?: string; body?: string; segment?: Segment
  ownOpinion?: string; partnerMessage?: string
  unratedCount?: string; unansweredCount?: string; goUrl?: string; trackingUrl?: string
}

const CTA: Record<Segment, string> = {
  understanding: 'Jetzt im Chat bewerten',
  reply: 'Direkt zum Chat und antworten',
  'start-chat': 'Jetzt ein Gespräch starten',
  opinion: 'Meinung jetzt posten',
}

const Email = ({ subject = 'Endspurt: Heute bis 23:59 Uhr', heading = 'Endspurt!', body = '', segment = 'start-chat', ownOpinion = '', partnerMessage = '', unratedCount = '0', unansweredCount = '0', goUrl = 'https://freemind.chat/wedium/go', trackingUrl }: Props) => (
  <WediumShell preview={subject} badge="Nur noch heute · bis 23:59 Uhr" heading={heading} trackingUrl={trackingUrl}>
    {body ? <Para>{body}</Para> : null}

    {segment === 'understanding' && (<>
      {partnerMessage ? <><Label>Letzte Nachricht deines Gegenübers</Label><Bubble text={partnerMessage} /></> : null}
      <Para><strong>Wie gut hast du dich in diesem Gespräch verstanden gefühlt?</strong> Ein Klick auf die Skala genügt, und dein Gegenüber bekommt Brückenpunkte.{Number(unratedCount) > 1 ? ` Das gilt für ${unratedCount} deiner Gespräche.` : ''}</Para>
      <UnderstandingScale />
    </>)}

    {segment === 'reply' && (<>
      <Label>Wartet auf deine Antwort</Label>
      {partnerMessage ? <Bubble text={partnerMessage} /> : null}
      <Para>Ein kurzer Satz reicht. Und danach: Wer hat dich gut verstanden? Wer hat dich beeindruckt? Ganz unten im Chat, direkt über dem Eingabefeld, bewertest du mit einem Klick, wie gut dich dein Gegenüber verstanden hat.{Number(unansweredCount) > 1 ? ` Insgesamt warten ${unansweredCount} Nachrichten auf dich.` : ''}</Para>
    </>)}

    {segment === 'start-chat' && (<>
      {ownOpinion ? <OpinionCard label="Deine Meinung" text={ownOpinion} /> : null}
      <Para>Öffne im Graph eine Meinung, die deiner widerspricht, und stell eine ehrliche Frage.</Para>
    </>)}

    {segment === 'opinion' && (
      <Para>Bis 23:59 Uhr kannst du deine Meinung noch auf die Karte setzen. Ein Satz genügt.</Para>
    )}

    <PrimaryButton href={goUrl}>{CTA[segment]}</PrimaryButton>
    <Para>Dein persönlicher Link meldet dich direkt an{segment === 'understanding' || segment === 'reply' ? ' und öffnet das Gespräch' : ''}.</Para>
    {segment === 'start-chat' || segment === 'opinion' ? <PostScript /> : null}
  </WediumShell>
)

export const template = {
  component: Email,
  subject: (d: Record<string, unknown>) => String(d.subject ?? 'Endspurt: Heute bis 23:59 Uhr'),
  displayName: 'wedium: Endspurt (individuell)',
  previewData: { segment: 'understanding', partnerMessage: 'Wer soll denn kontrollieren, was transparent genug ist?' },
} satisfies TemplateEntry
