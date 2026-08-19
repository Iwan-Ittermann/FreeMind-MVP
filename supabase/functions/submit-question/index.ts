import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3.23.8'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
// Questions go to the person answering them, independent of the general admin notify address.
const QUESTION_NOTIFY_EMAIL = 'iwan@digitalpeacetalks.com'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

const BodySchema = z.object({
  question: z.string().trim().min(10).max(1000),
  email: z.string().trim().email().max(255).optional().or(z.literal('')),
})

const SYSTEM_PROMPT = `Du bist das Support-Team von freemind (freemind.chat), einer Plattform für respektvolle Diskussionen.
Nutzer geben eine Meinung zu einer Frage ab, sehen alle Meinungen als Punkte in einem "Auge"-Graphen,
bewerten den Meinungsunterschied (0–100 %) und chatten dann 1:1. Nach dem Chat bewerten sie, wie gut
sie sich verstanden gefühlt haben. Aus Meinungsunterschied × Chat-Bewertung entstehen Brückenpunkte,
die einen Punkt näher ins Zentrum bringen. Anmeldung ist per E-Mail + Passphrase (kein Passwort).
Antworte freundlich, konkret und in höchstens 120 Wörtern auf Deutsch. Wenn du etwas nicht weißt,
sag es und verweise auf iwan@digitalpeacetalks.com.`

async function draftAnswer(question: string): Promise<string> {
  if (!LOVABLE_API_KEY) return ''
  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: question },
        ],
      }),
    })
    if (!res.ok) {
      console.error('ai draft failed:', res.status, await res.text())
      return ''
    }
    const json = await res.json()
    return String(json?.choices?.[0]?.message?.content ?? '').trim()
  } catch (err) {
    console.error('ai draft error:', err)
    return ''
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return Response.json(
        { ok: false, error: 'invalid_payload', fields: parsed.error.flatten().fieldErrors },
        { status: 400, headers: corsHeaders },
      )
    }
    const question = parsed.data.question
    const email = parsed.data.email ? parsed.data.email.toLowerCase() : null

    const aiDraft = await draftAnswer(question)

    const { data: row, error } = await supabase
      .from('question_submissions')
      .insert({ question, email, ai_draft: aiDraft || null, status: 'new' })
      .select('id, created_at')
      .single()
    if (error) throw error

    const emailRes = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE}` },
      body: JSON.stringify({
        templateName: 'question-submitted',
        recipientEmail: QUESTION_NOTIFY_EMAIL,
        idempotencyKey: `question-submitted-${row.id}`,
        templateData: {
          question,
          aiDraft: aiDraft || '(kein Entwurf verfügbar)',
          senderEmail: email ?? '',
          submittedAt: row.created_at,
        },
      }),
    })
    if (!emailRes.ok) {
      console.error('notify email failed:', emailRes.status, await emailRes.text())
    }

    return Response.json({ ok: true, id: row.id }, { headers: corsHeaders })
  } catch (err) {
    console.error('submit-question error:', err)
    return Response.json({ ok: false, error: 'server_error' }, { status: 500, headers: corsHeaders })
  }
})
