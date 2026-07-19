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
}

const Email = ({ email = 'user@example.com', confirmedAt = new Date().toISOString() }: Props) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Neue Anmeldung bei freemind</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Neue bestätigte Anmeldung</Heading>
        <Text style={text}>
          <strong>E-Mail:</strong> {email}
          <br />
          <strong>Bestätigt am:</strong> {confirmedAt}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Neue Anmeldung bei freemind',
  displayName: 'Admin signup notification',
  previewData: { email: 'user@example.com', confirmedAt: new Date().toISOString() },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif', color: '#0a0a0a' }
const container = { padding: '32px 24px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 900, margin: '0 0 24px', color: '#0a0a0a' }
const text = { fontSize: '15px', lineHeight: 1.6, margin: 0 }
