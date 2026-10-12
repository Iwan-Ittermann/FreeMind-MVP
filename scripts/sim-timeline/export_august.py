#!/usr/bin/env python3
"""Export the real August discussion (topic 7mm9) as an anonymized replay timeline.

No user IDs, e-mails or IPs leave the database: participants become numbered
slots. Hidden content and bots are dropped. Long quiet phases are compressed and
the whole event is scaled onto the same 72h loop the AI simulation uses.

Run: python3 scripts/sim-timeline/export_august.py
"""
import json, subprocess
from datetime import datetime

TOPIC_CODE = '7mm9'
DURATION = 72 * 3600
MAX_GAP = 2 * 3600  # quiet phases longer than this are shortened to it
BOT_PREFIX = '00000000-0000-0000-0000-0000000000'
OUT = ['src/data/sim-august-timeline.json', 'supabase/functions/_shared/sim-august-timeline.json']


def q(sql):
    out = subprocess.check_output(['psql', '-At', '-c', f"select coalesce(json_agg(x), '[]') from ({sql}) x"])
    return json.loads(out)


def ts(v):
    return datetime.fromisoformat(v.replace('Z', '+00:00')).timestamp()


topic = q(f"select id, title from topics where short_code='{TOPIC_CODE}'")[0]
tid = topic['id']
ops = q(f"""select id, user_id, text, created_at from opinions where topic_id='{tid}'
  and coalesce(visible, true) and user_id::text not like '{BOT_PREFIX}%' and text !~* '^\\s*test' order by created_at""")
slot_of = {o['id']: i for i, o in enumerate(ops)}
user_slot = {o['user_id']: i for i, o in enumerate(ops)}
chats = q(f"select id, opinion_a_id, opinion_b_id, created_at from chats where topic_id='{tid}' order by created_at")
chats = [c for c in chats if c['opinion_a_id'] in slot_of and c['opinion_b_id'] in slot_of]
chat_key = {c['id']: f'a{i:02d}' for i, c in enumerate(chats)}
ids = ','.join(f"'{c['id']}'" for c in chats) or "null"
msgs = q(f"""select chat_id, sender_id, content, created_at from chat_messages where chat_id in ({ids})
  and coalesce(visible, true) and coalesce(content, '') <> '' order by created_at""")
diffs = q(f"select rater_opinion_id, target_opinion_id, disagreement, coalesce(updated_at, created_at) at from opinion_ratings where topic_id='{tid}'")
resp = q(f"select chat_id, rater_id, empathy, disagreement, created_at from chat_ratings where chat_id in ({ids}) order by created_at")

events = []  # (real_ts, order, event)
for o in ops:
    events.append((ts(o['created_at']), 0, {'type': 'opinion', 'slot': slot_of[o['id']], 'text': o['text']}))
op_time = {o['id']: ts(o['created_at']) for o in ops}
chat_spec = []
for c in chats:
    a, b = slot_of[c['opinion_a_id']], slot_of[c['opinion_b_id']]
    t = max(ts(c['created_at']), op_time[c['opinion_a_id']], op_time[c['opinion_b_id']]) + 1
    chat_spec.append({'id': chat_key[c['id']], 'a': a, 'b': b, 'moment': 'real'})
    events.append((t, 1, {'type': 'chat_open', 'chat': chat_key[c['id']], 'from_slot': a, 'to_slot': b, 'moment': 'real'}))
chat_open = {e[2]['chat']: e[0] for e in events if e[2]['type'] == 'chat_open'}
for m in msgs:
    s = user_slot.get(m['sender_id'])
    if s is None: continue
    k = chat_key[m['chat_id']]
    events.append((max(ts(m['created_at']), chat_open[k] + 1), 2, {'type': 'message', 'chat': k, 'sender_slot': s, 'text': m['content']}))
for d in diffs:
    a, b = slot_of.get(d['rater_opinion_id']), slot_of.get(d['target_opinion_id'])
    if a is None or b is None: continue
    t = max(ts(d['at']), op_time[d['rater_opinion_id']], op_time[d['target_opinion_id']]) + 1
    events.append((t, 3, {'type': 'difference_rating', 'from_slot': a, 'to_slot': b, 'disagreement': int(d['disagreement'])}))
spec_by = {c['id']: c for c in chat_spec}
for r in resp:
    s = user_slot.get(r['rater_id'])
    k = chat_key[r['chat_id']]
    c = spec_by[k]
    if s not in (c['a'], c['b']): continue
    other = c['b'] if s == c['a'] else c['a']
    events.append((max(ts(r['created_at']), chat_open[k] + 2), 4, {'type': 'rating', 'chat': k, 'from_slot': s, 'to_slot': other,
                   'respect': int(r['empathy']), 'disagreement': int(r['disagreement']) * 10, 'bridge': int(r['empathy']) >= 65}))

events.sort(key=lambda e: (e[0], e[1]))
# Compress quiet phases, then scale onto the loop (5 min lead-in, 30 min tail).
comp, prev, acc = [], None, 0.0
for t, o, e in events:
    if prev is not None: acc += min(t - prev, MAX_GAP)
    prev = t
    comp.append((acc, e))
span = comp[-1][0] or 1
scale = (DURATION - 300 - 1800) / span
timeline, last = [], 0
for c, e in comp:
    t = max(last + 1, int(300 + c * scale))
    last = t
    timeline.append({'t': t, **e})

data = {'version': 1, 'dataset': 'august', 'topic': topic['title'], 'duration_seconds': DURATION,
        'personas': len(ops), 'chats': chat_spec, 'timeline': timeline,
        'persona_list': [{'slot': i, 'name': f'Teilnehmer:in {i + 1}', 'opinion': o['text']} for i, o in enumerate(ops)]}
for p in OUT:
    with open(p, 'w') as f: json.dump(data, f, ensure_ascii=False, indent=1)
print(len(ops), 'opinions', len(chat_spec), 'chats', len(timeline), 'events', 'scale', round(scale, 3))
