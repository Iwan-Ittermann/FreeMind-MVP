"""Generate the deterministic 72h /sim replay timeline.

Usage: python3 scripts/sim-timeline/generate.py [--seed 7]
Writes src/data/sim-timeline.json. Timing, chat pairs and ratings are computed
here (seeded, reproducible); only the message texts are written by the AI.
"""
import argparse, json, random, re, sys, concurrent.futures as cf
from pathlib import Path

sys.path.insert(0, "/tmp")
from lovable_ai import call_ai_json  # copied from the ai-gateway skill

ROOT = Path(__file__).resolve().parents[2]
H = 3600
DURATION = 72 * H

# Camp axis: 0 Haftung/Gesetz, 1 Jugendschutz, 2 Transparenz/Daten, 3 Freiheit/Minimal-Staat
CAMPS = {
    0: [0, 4, 7, 12, 15, 18, 23, 26, 27, 35],
    1: [2, 6, 10, 14, 16, 22, 29, 30, 31, 36],
    2: [1, 8, 11, 17, 19, 21, 24, 28, 37, 38],
    3: [3, 5, 9, 13, 20, 25, 32, 33, 34, 39],
}
CAMP_OF = {s: c for c, slots in CAMPS.items() for s in slots}
STARTERS = [0, 4, 27, 2, 6, 26, 1, 8, 24, 3, 5, 25]  # Startwelle 0–6h

# Scripted dramaturgy: (a, b, start_h, end_h, pattern, moment, brief)
SCRIPTED = [
    (0, 3, 8, 14, "hot", "clash", "Erster großer Clash: Zensurgefahr vs. Plattformmonopole. Gereizt, schnell, kurze Sätze, niemand gibt nach."),
    (2, 5, 16, 22, "hot", "clash", "Emotionaler Konflikt: 'Ihr opfert unsere Kinder für Werbegelder' vs. 'Ihr vernichtet mit Bürokratie die europäische Zukunft'. Persönlich, aufgeladen."),
    (18, 3, 24, 32, "slow", "shock", "Schockmoment: Olga erzählt sehr persönlich von Traumata und Ausbeutung als Moderatorin. Timo hält inne, wird nachdenklich, längere Beiträge, am Ende erkennt er ihre Erfahrung ausdrücklich an."),
    (18, 7, 26, 34, "slow", "shock", "Olga und David: David merkt, dass sein Fokus auf Desinformation die Menschen hinter der Moderation übersieht. Nachdenklich."),
    (21, 14, 36, 44, "evening", "bridge", "Unerwartete Allianz: Pfarrer und Content-Creatorin finden gemeinsam: nicht Inhalte zensieren, sondern Algorithmen entgiften (chronologischer Feed als Pflicht)."),
    (39, 6, 48, 60, "slow", "bridge", "Juristisch-psychologischer Konsens: Karl räumt ein, dass algorithmische Suchtschleifen keine Meinungen im Sinne des Grundgesetzes sind, sondern manipulative Mechaniken. Clara würdigt seine Prinzipientreue."),
    (0, 3, 54, 62, "evening", "bridge", "Marta und Timo treffen sich nach Tagen wieder: vorsichtige Annäherung, beide erkennen ein Argument des anderen an (Haftung nur für algorithmische Verstärkung, nicht für Inhalte)."),
    (2, 5, 60, 68, "slow", "bridge", "Selin und Ben versöhnen sich teilweise: Ben schlägt Design-Regeln nur für unter 16 vor, Selin erkennt an, dass kleine Startups geschützt werden müssen."),
]


def load_personas():
    src = (ROOT / "supabase/functions/_shared/sim-personas.ts").read_text()
    out = {}
    for m in re.finditer(r"slot: (\d+), name: '([^']+)', persona: '([^']+)', opinion: '([^']+)'", src):
        out[int(m[1])] = {"slot": int(m[1]), "name": m[2], "persona": m[3], "opinion": m[4]}
    assert len(out) == 40, len(out)
    return out


def join_times(rng):
    """Event curve: starters first, most join on day 1, a trickle afterwards."""
    t = {}
    for i, s in enumerate(STARTERS):
        t[s] = int(120 + i * (6 * H - 600) / len(STARTERS) + rng.randint(0, 600))
    rest = [s for s in range(40) if s not in t]
    rng.shuffle(rest)
    for i, s in enumerate(rest):
        if i < 16:
            t[s] = rng.randint(6 * H, 24 * H)
        elif i < 24:
            t[s] = rng.randint(24 * H, 44 * H)
        else:
            t[s] = rng.randint(44 * H, 58 * H)
    return t


def message_times(rng, start, end, n, pattern):
    if pattern == "hot":  # ping-pong bursts of 2–5 min
        ts, cur = [], start + rng.randint(0, 1800)
        for i in range(n):
            ts.append(cur)
            cur += rng.randint(60, 300) if (i + 1) % 5 else rng.randint(1800, 5400)
        return ts
    if pattern == "evening":  # roughly one message per evening slot / few hours
        span = max(end - start, H)
        return sorted(start + int(span * (i + rng.random() * 0.6) / n) for i in range(n))
    # slow: hours between replies, occasional quick follow-up
    ts, cur = [], start + rng.randint(0, 3600)
    for _ in range(n):
        ts.append(cur)
        cur += rng.choice([rng.randint(120, 900), rng.randint(2 * H, 5 * H), rng.randint(40 * 60, 90 * 60)])
    return ts


def write_chat(chat, P):
    a, b = P[chat["a"]], P[chat["b"]]
    prompt = f"""Thema der Diskussion: „Wie könnte Social Media wieder positiver werden?"
Schreibe einen realistischen privaten Chat (deutsch, Du-Form, wie Messenger: kurz, manchmal Tippfehler-frei aber umgangssprachlich, keine Emojis-Flut, keine Anrede-Floskeln) mit genau {chat['n']} Nachrichten, abwechselnd beginnend mit {a['name']}.
{a['name']}: {a['persona']}. Meinung: {a['opinion']}
{b['name']}: {b['persona']}. Meinung: {b['opinion']}
Dramaturgie: {chat['brief']}
Jede Nachricht 1–3 Sätze, max. 280 Zeichen. Markiere pro Nachricht mit "warm": true, wenn der/die Schreibende ein Argument des Gegenübers ausdrücklich anerkennt oder die eigene Position differenziert, sonst false. "tone": "hostile" | "neutral" | "warm".
Antworte als JSON: {{"messages":[{{"sender":"{a['name']}","text":"...","warm":false,"tone":"neutral"}}]}}"""
    for _ in range(3):
        try:
            r = call_ai_json(prompt); msgs = (json.loads(r) if isinstance(r, str) else r)["messages"]
            if len(msgs) >= chat["n"] - 2:
                return msgs[: chat["n"]]
        except Exception as e:  # retry on malformed output
            print("retry", chat["id"], e, file=sys.stderr)
    raise RuntimeError(f"chat {chat['id']} failed")


def rate(rng, rater, target, msgs_until, t):
    """Semantic-distance rating: far apart → quick + sensitive to warmth; close → late, muted."""
    dist = abs(CAMP_OF[rater] - CAMP_OF[target])
    warm_from_target = sum(1 for m in msgs_until if m["slot"] == target and m["warm"])
    hostile = sum(1 for m in msgs_until if m["slot"] == target and m["tone"] == "hostile")
    if dist >= 2:
        respect = 25 + 18 * warm_from_target - 12 * hostile + rng.randint(-5, 8)
        if warm_from_target >= 2:
            respect = max(respect, 75 + rng.randint(0, 20))
        delay = rng.randint(30, 600)
    elif dist == 1:
        respect = 45 + 15 * warm_from_target - 8 * hostile + rng.randint(-6, 6)
        delay = rng.randint(900, 3 * H)
    else:
        respect = 55 + 5 * warm_from_target + rng.randint(-5, 5)
        delay = rng.randint(4 * H, 10 * H)
    disagreement = min(100, max(0, 15 + 28 * dist + rng.randint(-8, 8)))
    return {"t": t + delay, "respect": int(min(100, max(0, respect))), "disagreement": disagreement}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", type=int, default=7)
    args = ap.parse_args()
    rng = random.Random(args.seed)
    P = load_personas()
    joins = join_times(rng)

    chats = []
    for i, (a, b, sh, eh, pat, moment, brief) in enumerate(SCRIPTED):
        chats.append(dict(id=f"c{i:02d}", a=a, b=b, start=sh * H, end=eh * H, pattern=pat, moment=moment, brief=brief, n=rng.randint(7, 10)))
    # Organic background chats, mostly across camps, mostly on day 1–2
    pairs = {(c["a"], c["b"]) for c in chats} | {(c["b"], c["a"]) for c in chats}
    while len(chats) < 26:
        a, b = rng.sample(range(40), 2)
        if (a, b) in pairs or (rng.random() < 0.7 and CAMP_OF[a] == CAMP_OF[b]):
            continue
        pairs |= {(a, b), (b, a)}
        start = max(joins[a], joins[b]) + rng.randint(600, 4 * H)
        if start > 66 * H:
            continue
        pat = rng.choice(["hot", "slow", "slow", "evening"])
        dist = abs(CAMP_OF[a] - CAMP_OF[b])
        brief = ("Sachlicher, aber spürbarer Widerspruch; gegen Ende eventuell kleine Annäherung." if dist >= 2
                 else "Nahe Positionen, Details werden diskutiert, eher unaufgeregt.")
        chats.append(dict(id=f"c{len(chats):02d}", a=a, b=b, start=start, end=min(start + rng.randint(6, 30) * H, 71 * H),
                          pattern=pat, moment="organic", brief=brief, n=rng.randint(4, 8)))
    # ensure scripted participants have joined before their chat
    for c in chats:
        for s in (c["a"], c["b"]):
            joins[s] = min(joins[s], c["start"] - 900)

    with cf.ThreadPoolExecutor(6) as ex:
        texts = dict(zip([c["id"] for c in chats], ex.map(lambda c: write_chat(c, P), chats)))

    events = [dict(t=joins[s], type="opinion", slot=s, text=P[s]["opinion"]) for s in range(40)]
    for c in chats:
        ts = message_times(rng, c["start"], c["end"], len(texts[c["id"]]), c["pattern"])
        events.append(dict(t=ts[0] - rng.randint(30, 240), type="chat_open", chat=c["id"], from_slot=c["a"], to_slot=c["b"], moment=c["moment"]))
        timeline_msgs = []
        for i, (m, t) in enumerate(zip(texts[c["id"]], ts)):
            slot = c["a"] if i % 2 == 0 else c["b"]
            mm = dict(slot=slot, warm=bool(m.get("warm")) and c["moment"] != "clash", tone=m.get("tone", "neutral"))
            timeline_msgs.append(mm)
            events.append(dict(t=t, type="message", chat=c["id"], sender_slot=slot, text=str(m["text"])[:400],
                               warm=mm["warm"], heat="high" if c["pattern"] == "hot" else "normal"))
            # rating checkpoints: mid-chat and at the end, per participant
            if i in (len(ts) // 2, len(ts) - 1):
                for rater, target in ((c["a"], c["b"]), (c["b"], c["a"])):
                    if i == len(ts) // 2 and abs(CAMP_OF[rater] - CAMP_OF[target]) < 2:
                        continue  # close camps rate only at the end
                    r = rate(rng, rater, target, timeline_msgs, t)
                    events.append(dict(t=min(r["t"], DURATION - 60), type="rating", chat=c["id"], from_slot=rater, to_slot=target,
                                       respect=r["respect"], disagreement=r["disagreement"],
                                       bridge=r["respect"] >= 75 and abs(CAMP_OF[rater] - CAMP_OF[target]) >= 2))
    events = sorted((e for e in events if 0 <= e["t"] < DURATION), key=lambda e: (e["t"], e["type"]))
    out = dict(version=2, topic="Wie könnte Social Media wieder positiver werden?", duration_seconds=DURATION, seed=args.seed,
               personas=[dict(slot=s, name=P[s]["name"], camp=CAMP_OF[s]) for s in range(40)],
               chats=[dict(id=c["id"], a=c["a"], b=c["b"], moment=c["moment"]) for c in chats], timeline=events)
    dest = ROOT / "src/data/sim-timeline.json"
    dest.parent.mkdir(exist_ok=True)
    dest.write_text(json.dumps(out, ensure_ascii=False, indent=1))
    kinds = {}
    for e in events:
        kinds[e["type"]] = kinds.get(e["type"], 0) + 1
    print("wrote", dest, kinds, "bridges:", sum(1 for e in events if e.get("bridge")))


if __name__ == "__main__":
    main()
