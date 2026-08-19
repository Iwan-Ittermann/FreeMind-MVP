/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  question?: string
  aiDraft?: string
  senderEmail?: string
  submittedAt?: string
}

const Email = ({
  question = 'Wie funktioniert freemind?',
  aiDraft = 'Entwurf …',
  senderEmail = '',
  submittedAt = new Date().toISOString(),
}: Props) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Neue Frage über /fragen</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Neue Frage eingereicht</Heading>
        <Text style={label}>Frage</Text>
        <Text style={text}>{question}</Text>
        <Hr style={hr} />
        <Text style={label}>Antwort-Entwurf (KI)</Text>
        <Text style={text}>{aiDraft}</Text>
        <Hr style={hr} />
        <Text style={meta}>
          Absender: {senderEmail || 'keine E-Mail angegeben'}
          <br />
          Eingereicht am: {submittedAt}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Neue Frage über freemind /fragen',
  displayName: 'Question submitted (admin)',
  previewData: {
    question: 'Wie funktioniert freemind?',
    aiDraft: 'freemind ist …',
    senderEmail: 'user@example.com',
    submittedAt: new Date().toISOString(),
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif', color: '#0a0a0a' }
const container = { padding: '32px 24px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 900, margin: '0 0 24px', color: '#0a0a0a' }
const label = { fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase' as const, margin: '0 0 4px', color: '#6b7a99' }
const text = { fontSize: '15px', lineHeight: 1.6, margin: '0 0 8px', whiteSpace: 'pre-wrap' as const }
const meta = { fontSize: '13px', lineHeight: 1.6, margin: 0, color: '#6b7a99' }
const hr = { borderColor: '#dbe4f0', margin: '20px 0' }
