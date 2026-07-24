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
  // Legacy fallbacks if caller passes raw fields.
  passphrase?: string
  appUrl?: string
}

const Email = ({
  subject = 'Deine Passphrase für freemind',
  heading = 'Deine Passphrase',
  body = '',
  passphrase,
  appUrl,
}: Props) => {
  const resolvedBody = body ||
    `Willkommen bei freemind!\n\n\`${passphrase ?? '...'}\`\n\n[${appUrl ?? 'https://freemind.chat'}](${appUrl ?? 'https://freemind.chat'})`
  return (
    <Html lang="de" dir="ltr">
      <Head />
      <Preview>{subject}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={eyebrow}>Dein Zugang</Text>
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
    String(d.subject ?? 'Deine Passphrase für freemind'),
  displayName: 'Passphrase',
  previewData: {
    subject: 'Deine Passphrase für freemind',
    heading: 'Deine Passphrase',
    body: 'Willkommen bei freemind!\n\n`brave-ocean-dance-42`\n\n[https://freemind.chat](https://freemind.chat)',
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
