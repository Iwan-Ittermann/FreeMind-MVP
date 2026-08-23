/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { renderBlocks } from '../../_shared/render-email-body.ts'

interface Props {
  subject?: string
  heading?: string
  body?: string
  eyebrow?: string
  trackingUrl?: string
}

const Email = ({
  subject = 'freemind',
  heading = 'freemind',
  body = '',
  eyebrow = 'freemind',
  trackingUrl = '',
}: Props) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>{subject}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrowStyle}>{eyebrow}</Text>
        <Heading style={h1}>{heading}</Heading>
        {renderBlocks(body)}
        <Hr style={hr} />
        <Text style={footerStyle}>
          E-Mail-Einstellungen (Tagesbericht und Benachrichtigungen) änderst du in freemind über das
          Glocken-Symbol oben rechts:{' '}
          <Link href="https://freemind.chat/go" style={footerLink}>
            freemind.chat/go
          </Link>
        </Text>
        {trackingUrl ? (
          <Img src={trackingUrl} width="1" height="1" alt="" style={pixel} />
        ) : null}
      </Container>
    </Body>
  </Html>
)

function makeTemplate(displayName: string, fallbackSubject: string, eyebrow: string) {
  return {
    component: (props: Props) => <Email {...props} eyebrow={props.eyebrow ?? eyebrow} />,
    subject: (d: Record<string, unknown>) => String(d.subject ?? fallbackSubject),
    displayName,
    previewData: {
      subject: fallbackSubject,
      heading: fallbackSubject,
      body: 'Beispieltext.\n\n[https://freemind.chat](https://freemind.chat)',
    },
  } satisfies TemplateEntry
}

export const welcomeTemplate = makeTemplate('Willkommen', 'Willkommen bei freemind!', 'Willkommen')
export const softLaunchTemplate = makeTemplate('Soft Launch', 'Soft Launch', 'Soft Launch')
export const startTemplate = makeTemplate('Start today', 'Heute startet es!', 'Start')
export const finalDayTemplate = makeTemplate('Final day', 'Letzter Tag', 'Letzter Tag')
export const dailyReportTemplate = makeTemplate(
  'Tagesbericht',
  'Der Tagesbericht',
  'Tagesbericht',
)
export const dailyBriefTemplate = makeTemplate(
  'Dein Tag (Kurz-Mail)',
  'Dein Tag bei freemind',
  'Dein Tag',
)

export const sogehtsTemplate = makeTemplate(
  "So geht's",
  'So funktioniert freemind',
  "So geht's",
)
export const nudgeRateTemplate = makeTemplate(
  'Nudge: Bewerten',
  'Deine Meinung steht — jetzt bewerten',
  'Nächster Schritt',
)
export const nudgeChatTemplate = makeTemplate(
  'Nudge: Diskutieren',
  'Du hast bewertet — jetzt diskutieren',
  'Nächster Schritt',
)

export const notificationDigestTemplate = makeTemplate(
  'Benachrichtigungen (täglich)',
  'Ungelesene Benachrichtigungen',
  'Benachrichtigungen',
)

const pixel = { display: 'block', width: '1px', height: '1px', border: 0 }
const hr = { borderColor: '#e5e5e5', margin: '32px 0 16px' }
const footerStyle = { fontSize: '11px', lineHeight: '18px', color: '#6b7280', margin: 0 }
const footerLink = { color: '#ff5a1f', textDecoration: 'underline' }


const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'Arial, Helvetica, sans-serif',
  color: '#0a0a0a',
}
const container = { padding: '32px 24px', maxWidth: '560px', margin: '0 auto' }
const eyebrowStyle = {
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.2em',
  textTransform: 'uppercase' as const,
  color: '#ff5a1f',
  margin: '0 0 16px',
}
const h1 = {
  fontSize: '32px',
  fontWeight: 900,
  lineHeight: 1,
  textTransform: 'uppercase' as const,
  letterSpacing: '-0.02em',
  margin: '0 0 24px',
  color: '#0a0a0a',
}
