/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  confirmUrl?: string
}

const Email = ({ confirmUrl = 'https://freemind.chat' }: Props) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Bestätige deine Anmeldung bei freemind</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>Produktive ideologische Reibung</Text>
        <Heading style={h1}>Bestätige deine Anmeldung</Heading>
        <Text style={text}>
          Klick auf den Button, um deine Anmeldung bei freemind abzuschließen.
          Erst danach bist du wirklich dabei.
        </Text>
        <Button href={confirmUrl} style={button}>
          Anmeldung bestätigen
        </Button>
        <Text style={muted}>
          Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:
          <br />
          <span style={{ wordBreak: 'break-all' }}>{confirmUrl}</span>
        </Text>
        <Text style={muted}>
          Der Link ist 48 Stunden gültig. Falls du dich nicht angemeldet hast, ignoriere diese E-Mail einfach.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Bestätige deine Anmeldung bei freemind',
  displayName: 'Signup confirmation',
  previewData: { confirmUrl: 'https://freemind.chat/confirm?token=preview' },
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
const text = { fontSize: '16px', lineHeight: 1.5, margin: '0 0 16px' }
const button = {
  backgroundColor: '#0a0a0a',
  color: '#ffffff',
  padding: '14px 28px',
  fontSize: '13px',
  fontWeight: 700,
  letterSpacing: '0.05em',
  textTransform: 'uppercase' as const,
  textDecoration: 'none',
  display: 'inline-block',
  margin: '32px 0',
}
const muted = { fontSize: '13px', lineHeight: 1.5, color: '#525252', margin: '16px 0 0' }
