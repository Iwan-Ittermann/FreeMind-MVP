/// <reference types="npm:@types/react@18.3.1" />
// Standard layout for all new wedium x freemind mails: white page, navy text,
// coral accents, one card per content block, one primary button.
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'

export const W = { navy: '#27255c', coral: '#f05b3d', peri: '#878ef2', periSoft: '#eef0fe', line: '#e3e5f2', muted: '#6b6f91' }
const font = "'Albert Sans', Arial, Helvetica, sans-serif"

export function WediumShell({ preview, badge, heading, children, trackingUrl }: { preview: string; badge?: string; heading: string; children: React.ReactNode; trackingUrl?: string }) {
  return (
    <Html lang="de" dir="ltr"><Head /><Preview>{preview}</Preview>
      <Body style={{ backgroundColor: '#ffffff', fontFamily: font, color: W.navy, margin: 0 }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '28px 20px 32px' }}>
          <Text style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: W.navy, margin: '0 0 18px' }}>
            freemind <span style={{ color: W.coral }}>×</span> wedium
          </Text>
          {badge ? <Text style={{ display: 'inline-block', backgroundColor: W.coral, color: '#ffffff', fontSize: '12px', fontWeight: 700, borderRadius: '999px', padding: '4px 12px', margin: '0 0 14px' }}>{badge}</Text> : null}
          <Heading style={{ fontSize: '28px', lineHeight: '34px', fontWeight: 800, margin: '0 0 18px', color: W.navy }}>{heading}</Heading>
          {children}
          <Text style={{ fontSize: '11px', lineHeight: '17px', color: W.muted, margin: '28px 0 0', borderTop: `1px solid ${W.line}`, paddingTop: '14px' }}>
            Du bekommst diese Mail, weil du dich für den wedium-Test auf freemind.chat angemeldet hast.
          </Text>
          {trackingUrl ? <Img src={trackingUrl} width="1" height="1" alt="" style={{ display: 'block', width: '1px', height: '1px', border: 0 }} /> : null}
        </Container>
      </Body>
    </Html>
  )
}

export const Para = ({ children }: { children: React.ReactNode }) =>
  <Text style={{ fontSize: '16px', lineHeight: '25px', margin: '0 0 16px', whiteSpace: 'pre-wrap' }}>{children}</Text>

export const Label = ({ children }: { children: React.ReactNode }) =>
  <Text style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: W.muted, margin: '0 0 6px' }}>{children}</Text>

export function OpinionCard({ label, text }: { label: string; text: string }) {
  return (
    <Section style={{ borderLeft: `4px solid ${W.coral}`, backgroundColor: W.periSoft, borderRadius: '6px', padding: '12px 16px', margin: '0 0 18px' }}>
      <Label>{label}</Label>
      <Text style={{ fontSize: '15px', lineHeight: '22px', fontStyle: 'italic', margin: 0 }}>„{text}“</Text>
    </Section>
  )
}

/** Chat bubble: partner left (light), own right (navy). */
export function Bubble({ own, text, caption }: { own?: boolean; text: string; caption?: string }) {
  return (
    <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ margin: '0 0 8px' }}><tbody><tr>
      <td align={own ? 'right' : 'left'}>
        {caption ? <Text style={{ fontSize: '11px', color: W.muted, margin: '0 4px 3px' }}>{caption}</Text> : null}
        <div style={{ display: 'inline-block', maxWidth: '82%', textAlign: 'left', backgroundColor: own ? W.navy : W.periSoft, color: own ? '#ffffff' : W.navy, borderRadius: own ? '16px 16px 4px 16px' : '16px 16px 16px 4px', padding: '10px 14px', fontSize: '15px', lineHeight: '21px', whiteSpace: 'pre-wrap' }}>{text}</div>
      </td>
    </tr></tbody></table>
  )
}

/** Static picture of the understanding scale at the bottom of the chat. */
export function UnderstandingScale({ question }: { question: string }) {
  const steps = ['Gar nicht', 'Wenig', 'Teils/Teils', 'Gut', 'Sehr gut']
  return (
    <Section style={{ border: `1px solid ${W.line}`, borderRadius: '10px', padding: '12px', margin: '6px 0 18px', backgroundColor: '#fafbff' }}>
      <Text style={{ fontSize: '12px', textAlign: 'center', color: W.muted, margin: '0 0 8px' }}>{question}</Text>
      <table role="presentation" width="100%" cellPadding={0} cellSpacing={4}><tbody><tr>
        {steps.map((s, i) => (
          <td key={s} align="center" style={{ border: `1px solid ${i === 3 ? W.coral : W.line}`, borderRadius: '6px', padding: '8px 2px', fontSize: '11px', fontWeight: i === 3 ? 700 : 400, color: i === 3 ? W.coral : W.navy, width: '20%' }}>{s}</td>
        ))}
      </tr></tbody></table>
      <Text style={{ fontSize: '11px', textAlign: 'center', color: W.muted, margin: '8px 0 0' }}>So sieht die Skala aus: ganz unten im Chat, direkt über dem Eingabefeld</Text>
    </Section>
  )
}

export function PrimaryButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Section style={{ margin: '8px 0 14px' }}>
      <Button href={href} style={{ backgroundColor: W.coral, color: '#ffffff', fontSize: '16px', fontWeight: 700, borderRadius: '999px', padding: '14px 26px' }}>{children}</Button>
    </Section>
  )
}
