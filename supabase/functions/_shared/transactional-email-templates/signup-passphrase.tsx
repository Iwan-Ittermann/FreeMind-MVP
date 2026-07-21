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

interface Props {
  passphrase?: string
  appUrl?: string
}

const Email = ({
  passphrase = 'brave-ocean-dance-42',
  appUrl = 'https://freemind.chat',
}: Props) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Deine Passphrase für die Diskussion</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>Dein Zugang</Text>
        <Heading style={h1}>Deine Passphrase</Heading>
        <Text style={text}>
          Willkommen bei freemind! Mit dieser Passphrase nimmst du an der Diskussion teil.
          Sie ist an deine E-Mail-Adresse gebunden — bewahre sie sicher auf.
        </Text>
        <div style={phraseBox}>{passphrase}</div>
        <Text style={text}>
          Öffne die Diskussion und gib die Passphrase ein, wenn du deine Meinung teilst,
          chattest oder bewertest:
        </Text>
        <Text style={{ ...text, wordBreak: 'break-all' }}>
          <a href={appUrl} style={link}>{appUrl}</a>
        </Text>
        <Text style={muted}>
          Solltest du deine Passphrase verlieren, kannst du sie über die Anmeldeseite mit
          derselben E-Mail-Adresse erneut anfordern — wir senden dir dann dieselbe Passphrase.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Deine Passphrase für freemind',
  displayName: 'Passphrase',
  previewData: {
    passphrase: 'brave-ocean-dance-42',
    appUrl: 'https://freemind.chat',
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
const text = { fontSize: '16px', lineHeight: 1.5, margin: '0 0 16px' }
const phraseBox = {
  backgroundColor: '#f4f4f5',
  border: '2px solid #0a0a0a',
  padding: '18px 20px',
  fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
  fontSize: '20px',
  fontWeight: 700,
  letterSpacing: '0.02em',
  textAlign: 'center' as const,
  margin: '8px 0 24px',
  wordBreak: 'break-all' as const,
}
const link = { color: '#0a0a0a', textDecoration: 'underline' }
const muted = { fontSize: '13px', lineHeight: 1.5, color: '#525252', margin: '24px 0 0' }
