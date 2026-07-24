/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { renderBlocks } from '../../_shared/render-email-body.ts'

interface Props {
  subject?: string
  heading?: string
  body?: string
  // Legacy fallback if caller doesn't interpolate ahead of time.
  confirmUrl?: string
}

const Email = ({
  subject = 'Bestätige deine Anmeldung bei freemind',
  heading = 'Bestätige deine Anmeldung',
  body = '',
  confirmUrl,
}: Props) => {
  const resolvedBody = body ||
    `Klick auf den Button, um deine Anmeldung bei freemind abzuschließen.\n\n[Anmeldung bestätigen](${confirmUrl ?? 'https://freemind.chat'})`
  return (
    <Html lang="de" dir="ltr">
      <Head />
      <Preview>{subject}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={eyebrow}>Produktive ideologische Reibung</Text>
          <Heading style={h1}>{heading}</Heading>
          {renderBlocks(resolvedBody)}
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, unknown>) =>
    String(d.subject ?? 'Bestätige deine Anmeldung bei freemind'),
  displayName: 'Signup confirmation',
  previewData: {
    subject: 'Bestätige deine Anmeldung bei freemind',
    heading: 'Bestätige deine Anmeldung',
    body: 'Klick auf den Button, um deine Anmeldung abzuschließen.\n\n[Anmeldung bestätigen](https://freemind.chat/confirm?token=preview)',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'Arial, Helvetica, sans-serif',
  color: '#0a0a0a',
}
const container = { padding: '32px 24px', maxWidth: '560px', margin: '0 auto' }
const eyebrow = {
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
