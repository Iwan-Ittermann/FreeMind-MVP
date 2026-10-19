"""Group existing AI opinion ratings; preserve all values and non-rating events.

Run after UX retiming. Real August records are deliberately never rewritten.
"""
import json
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PATHS = ('src/data/sim-timeline.json', 'supabase/functions/_shared/sim-timeline.json')
SPEED = 180


def batch_ratings(data):
    if data.get('opinion_rating_batches') == 1:
        return data
    joins = {e['slot']: e['t'] for e in data['timeline'] if e['type'] == 'opinion'}
    rng = random.Random(f"opinion-batches:{data['seed']}")
    for slot in sorted(joins):
        events = sorted(
            (e for e in data['timeline'] if e['type'] == 'difference_rating' and e['from_slot'] == slot),
            key=lambda e: (joins[e['to_slot']], e['t'], e['to_slot']),
        )
        previous = None
        batch = 0
        while events:
            remaining = len(events)
            choices = [size for size in range(3, 6) if remaining >= size and remaining - size not in (1, 2)]
            if not choices:
                raise ValueError(f'Cannot partition {remaining} ratings for slot {slot}')
            size = rng.choice(choices)
            group, events = events[:size], events[size:]
            ready = max(joins[slot], *(joins[e['to_slot']] for e in group)) + SPEED
            if previous is None:
                timestamp = ready
            else:
                timestamp = max(ready, previous + rng.randint(12, 24) * SPEED,
                                round(sum(e['t'] for e in group) / size))
            if timestamp >= data['duration_seconds']:
                raise ValueError(f'Rating batch exceeds loop for slot {slot}')
            for event in group:
                event['t'] = timestamp
                event['batch_id'] = f'opinion:{slot}:{batch}'
            previous = timestamp
            batch += 1
    data['timeline'].sort(key=lambda e: (e['t'], e['type']))
    data['opinion_rating_batches'] = 1
    return data


if __name__ == '__main__':
    data = json.loads((ROOT / PATHS[0]).read_text())
    result = json.dumps(batch_ratings(data), ensure_ascii=False, indent=1)
    for path in PATHS:
        (ROOT / path).write_text(result)
    print('AI opinion ratings grouped; August unchanged')