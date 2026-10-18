"""Retime replay datasets for visitor UX (keeps all texts, ratings and order).

Usage: python3 scripts/sim-timeline/retime_ux.py
- No day/night rhythm: activity is spread evenly across the 72h loop.
- Chats start within the first simulated minutes, so first-time visitors see
  flights and ratings in their first ~30 real seconds.
- Per-chat replies keep a readable minimum gap (presentation seconds × speed).
Monotone time warp: event order (opinion → chat_open → message → rating) is preserved.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
D = 72 * 3600
SPEED = 180
MIN_REPLY_GAP = 14 * SPEED  # ~14 real seconds between replies in a chat
LEAD = 60  # first event one sim minute in
WEIGHT = {'message': 1.0, 'chat_open': 1.0, 'rating': 1.0, 'opinion': 0.6, 'difference_rating': 0.08}
FILES = {
    'social': ['src/data/sim-timeline.json', 'supabase/functions/_shared/sim-timeline.json'],
    'august': ['src/data/sim-august-timeline.json', 'supabase/functions/_shared/sim-august-timeline.json'],
}


def retime(events):
    events = sorted(events, key=lambda e: (e['t'], e['type']))
    total = sum(WEIGHT.get(e['type'], 0.5) for e in events)
    acc, span = 0.0, D - LEAD - 600
    for e in events:
        # concave curve: denser at the start, still building through the loop
        e['t'] = int(LEAD + span * (acc / total) ** 1.15)
        acc += WEIGHT.get(e['type'], 0.5)
    last = {}
    for e in events:
        if e['type'] == 'message':
            prev = last.get(e['chat'])
            if prev is not None and e['t'] < prev + MIN_REPLY_GAP:
                e['t'] = prev + MIN_REPLY_GAP
            last[e['chat']] = e['t']
        elif e['type'] == 'rating' and e.get('chat') in last:
            e['t'] = max(e['t'], last[e['chat']] + 30)
        e['t'] = min(e['t'], D - 60)
    return sorted(events, key=lambda e: (e['t'], e['type']))


for name, paths in FILES.items():
    data = json.loads((ROOT / paths[0]).read_text())
    if data.get('ux_retimed'):
        print(name, 'already retimed'); continue
    data['timeline'] = retime(data['timeline'])
    data['ux_retimed'] = True
    out = json.dumps(data, ensure_ascii=False, indent=1)
    for p in paths:
        (ROOT / p).write_text(out)
    first = next(e['t'] for e in data['timeline'] if e['type'] == 'message')
    print(name, 'first message at sim', first, 's = real', round(first / SPEED, 1), 's')
