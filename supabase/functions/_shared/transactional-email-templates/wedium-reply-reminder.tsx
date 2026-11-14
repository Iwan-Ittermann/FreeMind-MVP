import * as React from 'npm:react@18.3.1';
import { Body, Container, Head, Heading, Html, Preview, Text, Button, Img } from 'npm:@react-email/components@0.0.22';
import type { TemplateEntry } from './registry.ts';
interface Props { subject?: string; heading?: string; body?: string; goUrl?: string; trackingUrl?: string }
const Email = ({ subject = 'Eine Nachricht wartet auf deine Antwort', heading = 'Dein Gegenüber hat dir geschrieben', body = '', goUrl = 'https://freemind.chat/wedium/go', trackingUrl }: Props) => (
  <Html lang="de"><Head /><Preview>{subject}</Preview><Body style={{ backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }}><Container style={{ padding: '32px 24px', maxWidth: '560px', color: '#27255c' }}>
    <Text>freemind x wedium</Text><Heading>{heading}</Heading>
    <Text style={{ whiteSpace: 'pre-wrap', lineHeight: '24px' }}>{body}</Text>
    <Button href={goUrl} style={{ backgroundColor: '#27255c', color: '#ffffff', padding: '12px 20px' }}>Nachricht öffnen und antworten</Button>
    <Text>Dein persönlicher Link meldet dich direkt an. Öffne anschließend im Chats-Tab den Chat mit der oben zitierten Nachricht.</Text>
    {trackingUrl ? <Img src={trackingUrl} width="1" height="1" alt="" /> : null}
  </Container></Body></Html>
);
export const template = { component: Email, subject: (data: Record<string, unknown>) => String(data.subject ?? 'Eine Nachricht wartet auf deine Antwort'), displayName: 'wedium: Antwort-Erinnerung' } satisfies TemplateEntry;