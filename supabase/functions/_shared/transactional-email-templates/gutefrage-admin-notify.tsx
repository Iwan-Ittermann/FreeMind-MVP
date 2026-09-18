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
  email?: string
  confirmedAt?: string
  confirmedTotal?: number
}

const Email = ({
  email = 'user@example.com',
  confirmedAt = new Date().toISOString(),
  confirmedTotal,
}: Props) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Neue Vorregistrierung fuer das Gutefrage-Event</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Neue Gutefrage-Vorregistrierung</Heading>
        <Text style={text}>
          <strong>E-Mail:</strong> {email}
          <br />
          <strong>Bestätigt am:</strong> {confirmedAt}
          {typeof confirmedTotal === 'number' ? (
            <>
              <br />
              <strong>Bestätigte Anmeldungen:</strong> {confirmedTotal} von 100
            </>
          ) : null}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Neue Gutefrage-Vorregistrierung',
  displayName: 'Gutefrage admin notification',
  previewData: { email: 'user@example.com', confirmedAt: new Date().toISOString(), confirmedTotal: 7 },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif', color: '#0a0a0a' }
const container = { padding: '32px 24px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 900, margin: '0 0 24px', color: '#0a0a0a' }
const text = { fontSize: '15px', lineHeight: 1.6, margin: 0 }
