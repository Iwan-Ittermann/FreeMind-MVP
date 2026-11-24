import { useEffect, useMemo, useRef, useState, type ReactNode, type CSSProperties } from 'react';
import { MotionConfig } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { toPng } from 'html-to-image';
import i18n from '@/i18n/config';
import { OpinionGraph } from '@/components/graph/OpinionGraph';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { RespectScale } from '@/components/chat/RespectScale';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { OPINION_DIFFERENCE_STEPS as STEPS } from '@/lib/opinion-difference';
import type { ChatRating, Opinion } from '@/types/graph';
import { cn } from '@/lib/utils';
import { Bell, CircleDot, HelpCircle, List, MessagesSquare, Settings } from 'lucide-react';
import { calculateTTLayout } from '@/lib/tt-layout';
import { WediumPresentationContext } from '@/contexts/WediumPresentationContext';

/** Hidden, noindex screenshot frames for slides. Demo data only; reuses real components. */

const QUESTION = 'Which party do you vote for – and why?';
const SAMPLE_OPINION = 'I vote for the party with the most concrete plan for affordable housing and public transport.';

const DEMO_TEXTS = [
  'Affordable housing matters most to me.', 'I care most about climate policy.', 'Lower taxes for small businesses.',
  'Better schools and childcare.', 'Stable pensions for everyone.', 'Faster digital administration.',
  'Safer streets in my town.', 'Fair rules for migration.', 'More money for hospitals.', 'Cheaper public transport.',
  'Less bureaucracy for farmers.', 'Strong support for Europe.', 'Protect civil liberties online.', 'Invest in rail, not roads.',
];
const DEMO_OPINIONS: Opinion[] = DEMO_TEXTS.map((text, i) => ({ id: `demo-${String(i + 1).padStart(2, '0')}`, text, visible: true, status: 'Visible' }));
// Angle input: disagreement between pairs (synthetic = opinion ratings only, no chat).
const DEMO_RATINGS: ChatRating[] = DEMO_OPINIONS.flatMap((a, i) => DEMO_OPINIONS.slice(i + 1).map((b, j) => {
  const k = i + j + 1;
  const d = Math.abs(((i * 37 + k * 53) % 100));
  return { opinionA: a.id, opinionB: b.id, empathy: 0, disagreement: d, isSynthetic: true };
})).filter((_, idx) => idx % 3 === 0);
// Radius input: received understanding × disagreement.
const DEMO_POINTS = new Map(DEMO_OPINIONS.map((o, i) => [o.id, [420, 60, 300, 180, 90, 240, 30, 150, 360, 120, 210, 75, 270, 45][i]]));

// Larger crowd for the phone mockup, so the circle reads as a lively discussion.
const PHONE_OPINIONS: Opinion[] = Array.from({ length: 26 }, (_, i) => ({ id: `phone-${String(i + 1).padStart(2, '0')}`, text: DEMO_TEXTS[i % DEMO_TEXTS.length], visible: true, status: 'Visible' }));
const PHONE_RATINGS: ChatRating[] = PHONE_OPINIONS.flatMap((a, i) => PHONE_OPINIONS.slice(i + 1).map((b, j) => {
  const k = i + j + 1;
  return { opinionA: a.id, opinionB: b.id, empathy: 0, disagreement: Math.abs((i * 37 + k * 53) % 100), isSynthetic: true };
})).filter((_, idx) => idx % 3 === 0);
const PHONE_POINTS = new Map(PHONE_OPINIONS.map((o, i) => [o.id, i === 0 ? 500 : ((i * 97) % 420) + 20]));

type GraphGeometry = { angle: { x: number; y: number } | null; radius: { x: number; y: number } | null; nodes: { x: number; y: number }[]; iconRadius: number };

type FrameDef = { id: string; w: number; h: number; render: (annotate: boolean) => ReactNode };

function Frame({ id, w, h, children, registerRef }: { id: string; w: number; h: number; children: ReactNode; registerRef: (id: string, el: HTMLDivElement | null) => void }) {
  return (
    <div className="flex flex-col items-start gap-2">
      <div className="slide-asset-controls flex items-center gap-3 text-base text-muted-foreground">
        <span className="font-mono">{id} · {w}×{h}</span>
      </div>
      <div
        ref={(el) => registerRef(id, el)}
        data-slide-frame={id}
        className={cn("slide-frame relative overflow-hidden text-card-foreground", id === "graph-annotated" ? "bg-transparent" : "border border-border bg-card")}
        style={{ width: w, height: h, borderRadius: 24 }}
      >
        {children}
      </div>
    </div>
  );
}

function PostFrame() {
  return (
    <div className="flex h-full flex-col gap-5 p-6">
      <h2 className="slide-key font-semibold leading-tight text-foreground">{QUESTION}</h2>
      <Textarea readOnly value={SAMPLE_OPINION} className="min-h-0 flex-1 resize-none" />
      <Button className="slide-key h-14 w-full">{i18n.getFixedT('en')('tt.publishOpinion', { defaultValue: 'Publish opinion' })}</Button>
    </div>
  );
}

function ChatFrame() {
  const t0 = new Date('2026-11-12T18:00:00Z');
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-5 py-4">
        <p className="slide-key font-semibold text-foreground">Anonymous · Chat</p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-end gap-3 overflow-hidden px-4 py-3">
        <ChatBubble id="m1" isOwn={false} timestamp={t0} content="Why is housing your top issue?" />
        <ChatBubble id="m2" isOwn timestamp={new Date(t0.getTime() + 60000)} content="Rents doubled here. And for you?" />
      </div>
      <div className="border-t border-border p-3">
        <ChatComposer value="" onChange={() => {}} onSend={() => {}} placeholder={i18n.getFixedT('en')('chat.typePlaceholder', { defaultValue: 'Write a message…' })} />
      </div>
    </div>
  );
}

function RateFrame() {
  const t = i18n.getFixedT('en');
  const activeIdx = 3; // mid-high distance
  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div>
        <p className="slide-key mb-3 font-semibold text-foreground">How far apart are we?</p>
        <div className="flex items-center gap-1.5">
          {STEPS.map((step, i) => (
            <div key={step.value} className={cn('flex h-12 flex-1 items-center justify-center rounded-full border',
              i === activeIdx ? 'border-destructive bg-destructive text-destructive-foreground' : 'border-border/60 text-muted-foreground')}>
              <step.Icon className="h-6 w-6" />
            </div>
          ))}
        </div>
        <p className="mt-2 text-center text-muted-foreground">{t(STEPS[activeIdx].key)}</p>
      </div>
      <div>
        <p className="slide-key mb-3 font-semibold text-foreground">I felt understood</p>
        <RespectScale value={72} onChange={() => {}} lowLabel={t('tt.understandingStep.notAtAll')} highLabel={t('tt.understandingStep.veryGood')} />
      </div>
      <Button className="slide-key mt-auto h-14 w-full">Submit</Button>
    </div>
  );
}

type GraphAnchor = { id: string; x: number; y: number; r: number; a: number };
type LineEndpoints = { x1: number; y1: number; x2: number; y2: number };

function distanceToSegment(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function trimToNodeEdges(a: GraphAnchor, b: GraphAnchor, iconRadius: number, endTrim = iconRadius + 3): LineEndpoints {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  const startOffset = Math.min(iconRadius + 3, length * 0.35);
  const endOffset = Math.min(endTrim, length * 0.35);
  return {
    x1: a.x + (dx / length) * startOffset,
    y1: a.y + (dy / length) * startOffset,
    x2: b.x - (dx / length) * endOffset,
    y2: b.y - (dy / length) * endOffset,
  };
}

function arcBetweenNodes(a: GraphAnchor, b: GraphAnchor, centre: GraphAnchor, iconRadius: number) {
  const radius = (a.r + b.r) / 2;
  const startAngle = Math.atan2(a.y - centre.y, a.x - centre.x);
  const endAngle = Math.atan2(b.y - centre.y, b.x - centre.x);
  let delta = endAngle - startAngle;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  const direction = Math.sign(delta) || 1;
  const trim = Math.min((iconRadius + 3) / radius, Math.abs(delta) * 0.3);
  const start = startAngle + direction * trim;
  const end = startAngle + delta - direction * trim;
  const point = (angle: number) => ({
    x: centre.x + Math.cos(angle) * radius,
    y: centre.y + Math.sin(angle) * radius,
  });
  const p1 = point(start);
  const p2 = point(end);
  return `M ${p1.x} ${p1.y} A ${radius} ${radius} 0 0 ${direction > 0 ? 1 : 0} ${p2.x} ${p2.y}`;
}

/** The old TT node star, reused for the graph centre so the middle reads as a
 * centre and not as one more person. Gold, but with a much softer glow than the
 * highscore stars used to have. */
const STAR_PATH = 'M20 8 L23 17 L32 20 L23 23 L20 32 L17 23 L8 20 L17 17 Z';
const STAR_UNIT_RADIUS = 12; // the path spans 8..32 around its own 20/20 origin
const STAR_VERTS: readonly [number, number][] = [[20, 8], [23, 17], [32, 20], [23, 23], [20, 32], [17, 23], [8, 20], [17, 17]];

/**
 * Largest scale at which the centre star still clears every other icon, so the
 * star can never overlap a neighbour that happens to sit close to the middle.
 */
function safeStarScale(nodes: GraphAnchor[], centre: GraphAnchor, iconRadius: number, maxScale: number) {
  const outline = (s: number) => STAR_VERTS.map(([x, y]) => ({ x: centre.x + (x - 20) * s, y: centre.y + (y - 20) * s }));
  const clear = (s: number) => nodes.filter(n => n.id !== centre.id).every(n => {
    const poly = outline(s);
    return poly.every((v, i) => distanceToSegment(n, v, poly[(i + 1) % poly.length]) > iconRadius + 2);
  });
  if (clear(maxScale)) return maxScale;
  let lo = 0.2, hi = maxScale;
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    if (clear(mid)) lo = mid; else hi = mid;
  }
  return lo;
}

function GraphFrame({ size, annotate, opinions = DEMO_OPINIONS, ratings = DEMO_RATINGS, points = DEMO_POINTS, labels = true, onGeometry }: {
  size: number; annotate: boolean; opinions?: Opinion[]; ratings?: ChatRating[]; points?: Map<string, number>; labels?: boolean;
  onGeometry?: (g: GraphGeometry) => void;
}) {
  const lm = useMemo(() => { const w = size * 0.75; return { coreR: (140 / 600) * w, blueR: (300 / 600) * w, whiteR: (360 / 600) * w }; }, [size]);
  const c = size / 2;
  // Same layout call as OpinionGraph, so annotations use the real node positions.
  const anchors = useMemo(() => {
    const outer = size * 0.48;
    const nodes: GraphAnchor[] = calculateTTLayout(opinions, ratings, { centerX: c, centerY: c, outerRadius: outer, extremeRadius: outer * 0.92, moderateRadius: outer * 0.8, respectfulRadius: outer * 0.25, nodeRadius: Math.max(3, size * 0.012) }, lm, points).nodes
      .map(n => ({ id: n.id, x: n.x, y: n.y, r: Math.hypot(n.x - c, n.y - c), a: Math.atan2(n.y - c, n.x - c) }));
    const iconRadius = 18 * Math.min(1, (Math.max(3, size * 0.012) / 6) * 1.6);
    const centreNode = [...nodes].sort((p, q) => p.r - q.r)[0];
    // The centre is drawn as a star, so every line aims at the exact graph centre.
    const centre: GraphAnchor = { id: centreNode?.id ?? 'centre', x: c, y: c, r: 0, a: 0 };
    const isClear = (a: GraphAnchor, b: GraphAnchor) => nodes
      .filter(n => n.id !== a.id && n.id !== b.id)
      .every(n => distanceToSegment(n, a, b) > iconRadius + 1);
    const visibleLength = (a: GraphAnchor, b: GraphAnchor) => Math.hypot(b.x - a.x, b.y - a.y) - 2 * (iconRadius + 3);

    // Radius: use the longest unobstructed radial segment. The centre star is
    // the destination, not an obstacle; the line stops just outside its tips.
    const radiusNode = nodes
      .filter(n => n.id !== centre.id && visibleLength(n, centre) > 12 && isClear(n, centre))
      .sort((p, q) => visibleLength(q, centre) - visibleLength(p, centre))[0];

    // Angle: the two leftmost people sit on the same visible ring. Their small
    // radial difference comes only from collision resolution; the arc uses the
    // mean radius and stops at both icon borders.
    // Angle: two people on the same ring, as far apart as possible (≤ 100°), with an
    // arc that touches nobody else — so the angle is long enough to read.
    const others = nodes.filter(n => n.id !== centre.id && n.id !== radiusNode?.id && n.r > iconRadius * 3);
    const arcClear = (a: GraphAnchor, b: GraphAnchor) => {
      const rr = (a.r + b.r) / 2;
      let d = b.a - a.a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      const steps = 40;
      return nodes.filter(n => n.id !== a.id && n.id !== b.id).every(n => {
        for (let i = 1; i < steps; i++) {
          const t = a.a + (d * i) / steps;
          if (Math.hypot(c + Math.cos(t) * rr - n.x, c + Math.sin(t) * rr - n.y) < iconRadius + 3) return false;
        }
        return true;
      });
    };
    let pair: GraphAnchor[] = [];
    let best = 0;
    for (let i = 0; i < others.length; i++) for (let j = i + 1; j < others.length; j++) {
      const a = others[i], b = others[j];
      if (Math.abs(a.r - b.r) > iconRadius * 0.5) continue;
      let d = Math.abs(b.a - a.a); if (d > Math.PI) d = 2 * Math.PI - d;
      if (d > (100 * Math.PI) / 180 || d * a.r <= best) continue;
      if (arcClear(a, b)) { best = d * a.r; pair = [a, b]; }
    }
    if (!pair.length) pair = [...others].sort((a, b) => a.x - b.x).slice(0, 2);
    const starScale = safeStarScale(nodes, centre, iconRadius, (iconRadius + 2) / STAR_UNIT_RADIUS);
    return { nodes, pair, radiusNode, centre, iconRadius, starScale, hasCentreNode: !!centreNode && centreNode.r <= iconRadius };
  }, [size, c, lm, opinions, ratings, points]);
  const [A, B] = anchors.pair;
  const R = anchors.radiusNode;
  const starScale = anchors.starScale;
  const starTip = STAR_UNIT_RADIUS * starScale;
  const angleArc = A && B ? arcBetweenNodes(A, B, anchors.centre, anchors.iconRadius) : null;
  const radiusLine = R ? trimToNodeEdges(R, anchors.centre, anchors.iconRadius, starTip + 2) : null;
  useEffect(() => {
    if (!onGeometry) return;
    let angle: { x: number; y: number } | null = null;
    if (A && B) {
      const rr = (A.r + B.r) / 2;
      let d = B.a - A.a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      const m = A.a + d / 2;
      angle = { x: c + Math.cos(m) * rr, y: c + Math.sin(m) * rr };
    }
    // Anchor at the outer quarter of the radius line: the side that faces open space.
    const radius = radiusLine ? { x: radiusLine.x1 * 0.8 + radiusLine.x2 * 0.2, y: radiusLine.y1 * 0.8 + radiusLine.y2 * 0.2 } : null;
    onGeometry({ angle, radius, nodes: anchors.nodes, iconRadius: anchors.iconRadius });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [A?.id, B?.id, R?.id, size]);
  return (
    <div className="relative h-full w-full" style={{ '--wedium-node': '242 43% 22%' } as CSSProperties}>
      {/* The person icon that sits exactly in the middle makes room for the star. */}
      {anchors.hasCentreNode && (
        <style>{`.slide-frame [data-tt-node-id="${anchors.centre.id}"] { display: none !important; }`}</style>
      )}
      <WediumPresentationContext.Provider value>
        <OpinionGraph opinions={opinions} ratings={ratings} width={size} height={size} showLabels="none" chrome="naked" ttMode ttLandmarks={lm} nodePoints={points} showNodePoints={false} />
      </WediumPresentationContext.Provider>
      <svg className="pointer-events-none absolute inset-0 text-foreground" width={size} height={size} aria-hidden>
        <defs>
          <filter id="slide-centre-star-glow" x="-70%" y="-70%" width="240%" height="240%">
            <feGaussianBlur stdDeviation="2.1" result="blur" />
            <feFlood floodColor="#F5C542" floodOpacity="0.36" result="gold" />
            <feComposite in="gold" in2="blur" operator="in" result="glow" />
            <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <g data-centre-star transform={`translate(${c} ${c}) scale(${starScale.toFixed(3)}) translate(-20 -20)`}>
          <path d={STAR_PATH} fill="#F5C542" filter="url(#slide-centre-star-glow)" />
        </g>
        {annotate && (angleArc || radiusLine) && (
          <g stroke="currentColor" fill="none" strokeWidth={2} strokeLinecap="round">
            {angleArc && <path data-angle-arc d={angleArc} />}
            {radiusLine && <line data-radius-line {...radiusLine} />}
          </g>
        )}
      </svg>
      {annotate && labels && (
        <div className="pointer-events-none absolute inset-0 text-foreground">
          <span className="slide-anno absolute bottom-16 left-4 text-left">Angle =<br />disagreement</span>
          <span className="slide-anno slide-anno-formula absolute right-4 top-4 w-[240px] text-right">
            Understanding Others x<br />Disagreement =<br />Proximity to Center
          </span>
        </div>
      )}
    </div>
  );
}

const PHONE = { w: 340, h: 640, bezel: 10 };
const GRAPH_TOP = 96; // below the question header inside the screen
// Render the graph larger and scale it down: icons stay small, so the bigger crowd keeps air.
const PHONE_GRAPH_RENDER = 540;
const PHONE_GRAPH_BOX = 420;

/** Full UI as a phone, with the explanations outside the device (demo-day layout). */
function PhoneGraphFrame({ w, h, annotate }: { w: number; h: number; annotate: boolean }) {
  const [geo, setGeo] = useState<GraphGeometry>({ angle: null, radius: null, nodes: [], iconRadius: 0 });
  const screenW = PHONE.w - PHONE.bezel * 2;
  const px = (w - PHONE.w) / 2;
  const py = (h - PHONE.h) / 2;
  const k = PHONE_GRAPH_BOX / PHONE_GRAPH_RENDER;
  const boxLeft = (screenW - PHONE_GRAPH_BOX) / 2;
  const gx = px + PHONE.bezel + boxLeft; // graph origin in frame coords
  const gy = py + PHONE.bezel + GRAPH_TOP;
  const angle = geo.angle && { x: gx + geo.angle.x * k, y: gy + geo.angle.y * k };
  const radius = geo.radius && { x: gx + geo.radius.x * k, y: gy + geo.radius.y * k };
  const leftEnd = px - 18;
  const rightEnd = px + PHONE.w + 18;
  const nodes = geo.nodes.map(n => ({ x: gx + n.x * k, y: gy + n.y * k }));
  const clearance = geo.iconRadius * k + 12;
  const segClear = (a: { x: number; y: number }, b: { x: number; y: number }) => nodes.every(n => distanceToSegment(n, a, b) > clearance);
  // Leader: from the explained point, a short vertical step to a free row, then horizontally out of the phone.
  const leader = (pt: { x: number; y: number } | null, toX: number) => {
    if (!pt) return null;
    for (let i = 0; i < 80; i++) {
      for (const sgn of [1, -1]) {
        const y = pt.y + sgn * i * 3;
        const bend = { x: pt.x, y };
        const outer = { x: toX, y };
        const vert = i === 0 || segClear({ x: pt.x, y: pt.y + sgn * clearance }, bend);
        if (vert && segClear(i === 0 ? { x: pt.x + Math.sign(toX - pt.x) * 6, y } : bend, outer)) return { bend, outer, y };
      }
    }
    return { bend: pt, outer: { x: toX, y: pt.y }, y: pt.y };
  };
  // The pointer goes to whichever side of the phone the arc sits on.
  const angleSide = angle && angle.x > px + PHONE.w / 2 ? 'right' : 'left';
  const la = leader(angle, angleSide === 'right' ? rightEnd : leftEnd);
  const lr = leader(radius, rightEnd);
  return (
    <div className="relative h-full w-full">
      <div className="absolute overflow-hidden border-[10px] border-foreground/15 bg-background" style={{ left: px, top: py, width: PHONE.w, height: PHONE.h, borderRadius: 48 }}>
        <div className="absolute inset-x-0 top-0 flex items-center justify-between border-b border-border/30 px-4 py-3">
          <span className="slide-phone-logo font-medium lowercase tracking-tight text-foreground/90">freemind</span>
          <span className="flex items-center gap-3 text-foreground/70"><HelpCircle className="h-4 w-4" /><Bell className="h-4 w-4" /><Settings className="h-4 w-4" /></span>
        </div>
        <p className="slide-phone-q absolute inset-x-5 top-14 text-center font-serif italic text-foreground">{QUESTION}</p>
        <div className="absolute rounded-full bg-foreground/[0.05] ring-1 ring-foreground/10 shadow-[0_0_40px_hsl(var(--foreground)/0.08)]" style={{ top: GRAPH_TOP + 4, left: boxLeft + 4, width: PHONE_GRAPH_BOX - 8, height: PHONE_GRAPH_BOX - 8 }} />
        <div className="absolute" style={{ top: GRAPH_TOP, left: boxLeft, width: PHONE_GRAPH_RENDER, height: PHONE_GRAPH_RENDER, transform: `scale(${k})`, transformOrigin: '0 0' }}>
          <GraphFrame size={PHONE_GRAPH_RENDER} annotate={annotate} labels={false} opinions={PHONE_OPINIONS} ratings={PHONE_RATINGS} points={PHONE_POINTS} onGeometry={setGeo} />
        </div>
        <div className="absolute inset-x-0 bottom-0 flex h-14 border-t border-border/40 bg-background/80">
          {([['Opinions', List, false], ['Circle', CircleDot, true], ['Chats', MessagesSquare, false]] as const).map(([label, Icon, active]) => (
            <div key={label} className={cn('relative flex flex-1 flex-col items-center justify-center gap-1', active ? 'text-primary' : 'text-foreground/70')}>
              <Icon className="h-[18px] w-[18px]" />
              <span className="slide-phone-tab font-semibold uppercase tracking-[0.14em]">{label}</span>
              {active && <span className="absolute bottom-1 h-0.5 w-8 rounded-full bg-primary" />}
            </div>
          ))}
        </div>
      </div>
      {annotate && (
        <>
          <svg className="pointer-events-none absolute inset-0 text-foreground" width={w} height={h} aria-hidden>
            <g stroke="#F5C542" strokeWidth={2} fill="none" strokeLinecap="round">
              {angle && la && <polyline points={`${la.outer.x},${la.y} ${la.bend.x},${la.y} ${angle.x},${angle.y}`} />}
              {radius && lr && <polyline points={`${lr.outer.x},${lr.y} ${lr.bend.x},${lr.y} ${radius.x},${radius.y}`} />}
            </g>
            <g fill="#F5C542">
              {angle && <circle cx={angle.x} cy={angle.y} r={4} />}
              {radius && <circle cx={radius.x} cy={radius.y} r={4} />}
            </g>
          </svg>
          {angle && (
            <span className={cn('slide-anno absolute text-background [text-shadow:none]', angleSide === 'right' ? 'text-left' : 'text-right')}
              style={angleSide === 'right'
                ? { left: rightEnd + 10, top: (la?.y ?? angle.y) - 28, width: w - rightEnd - 30 }
                : { right: w - leftEnd + 10, top: (la?.y ?? angle.y) - 28, width: px - 50 }}>
              Angle =<br />disagreement
            </span>
          )}
          {radius && (
            <span className="slide-anno absolute text-left text-background" style={{ left: rightEnd + 10, top: (lr?.y ?? radius.y) - 42, width: w - rightEnd - 30 }}>
              Understanding Others ×<br />Disagreement =<br />Proximity to Center
            </span>
          )}
        </>
      )}
    </div>
  );
}

export default function SlideAssets() {
  const [params] = useSearchParams();
  const ow = Number(params.get('w')) || 0;
  const oh = Number(params.get('h')) || 0;
  const annotateParam = params.get('annotate') === '1';
  const refs = useRef(new Map<string, HTMLDivElement>());
  const [busy, setBusy] = useState(false);
  const enI18n = useMemo(() => i18n.cloneInstance({ lng: 'en' }), []);

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots'; meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => { meta.remove(); };
  }, []);

  const size = (w: number, h: number) => ({ w: ow || w, h: oh || h });
  const frames: FrameDef[] = [
    { id: 'step-1-post', ...size(360, 460), render: () => <PostFrame /> },
    { id: 'step-2-chat', ...size(360, 460), render: () => <ChatFrame /> },
    { id: 'step-3-rate', ...size(360, 460), render: () => <RateFrame /> },
    { id: 'graph', ...size(480, 480), render: () => null },
    { id: 'graph-annotated', ...size(1040, 720), render: () => null },
  ];

  const register = (id: string, el: HTMLDivElement | null) => { if (el) refs.current.set(id, el); else refs.current.delete(id); };
  const download = async (f: FrameDef) => {
    const el = refs.current.get(f.id); if (!el) return;
    const url = await toPng(el, { pixelRatio: 3, width: f.w, height: f.h, cacheBust: true });
    const a = document.createElement('a'); a.href = url; a.download = `${f.id}.png`; a.click();
  };
  const downloadAll = async () => { setBusy(true); try { for (const f of frames) { await download(f); await new Promise(r => setTimeout(r, 300)); } } finally { setBusy(false); } };

  return (
    <I18nextProvider i18n={enI18n}>
      <MotionConfig reducedMotion="always">
        <style>{`
          [data-sonner-toaster], [role="region"][aria-label*="otification"], .slide-assets-root ~ * { display: none !important; }
          .slide-frame, .slide-frame * { cursor: default !important; transition: none !important; animation: none !important; caret-color: transparent; }
          .slide-frame *:focus, .slide-frame *:focus-visible { outline: none !important; box-shadow: none !important; }
          .slide-frame { box-shadow: none !important; pointer-events: none; }
          .slide-frame p, .slide-frame span, .slide-frame textarea, .slide-frame button, .slide-frame div { font-size: max(18px, 1em); }
          .slide-frame textarea { font-size: 20px !important; line-height: 1.4 !important; }
          .slide-frame .slide-key, .slide-frame .slide-anno { font-size: 22px !important; line-height: 1.25; }
          .slide-frame .slide-anno { font-weight: 600; text-shadow: 0 0 6px hsl(var(--background)); }
          .slide-frame .slide-anno-formula { font-size: 19px !important; line-height: 1.3; }
          .slide-frame .slide-phone-q { font-size: 19px !important; line-height: 1.3; }
          .slide-frame .slide-phone-tab { font-size: 11px !important; line-height: 1; }
          .slide-frame .slide-phone-logo { font-size: 15px !important; line-height: 1; }
          .slide-frame [role="slider"] + div { font-size: 18px !important; }
          .slide-frame [role="slider"] + div span { font-size: 18px !important; }
        `}</style>
        <main className="slide-assets-root min-h-screen bg-background p-8 text-foreground">
          <div className="mb-6 flex items-center gap-3">
            <Button onClick={downloadAll} disabled={busy}>Download all</Button>
          </div>
          <div className="flex flex-wrap gap-8">
            {frames.map((f) => (
              <div key={f.id} className="flex flex-col gap-2">
                <Frame id={f.id} w={f.w} h={f.h} registerRef={register}>
                  {f.id === 'graph-annotated'
                    ? <PhoneGraphFrame w={f.w} h={f.h} annotate={annotateParam || !params.has('annotate')} />
                    : f.id.startsWith('graph')
                    ? <GraphFrame size={Math.min(f.w, f.h)} annotate={f.id === 'graph-annotated' && (annotateParam || !params.has('annotate'))} />
                    : f.render(false)}
                </Frame>
                <Button variant="outline" size="sm" className="self-start" onClick={() => download(f)}>Download PNG</Button>
              </div>
            ))}
          </div>
        </main>
      </MotionConfig>
    </I18nextProvider>
  );
}
