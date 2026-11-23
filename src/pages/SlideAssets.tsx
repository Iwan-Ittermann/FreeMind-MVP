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
        className="slide-frame relative overflow-hidden border border-border bg-card text-card-foreground"
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

function distanceToSegment(p: GraphAnchor, a: GraphAnchor, b: GraphAnchor) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function trimToNodeEdges(a: GraphAnchor, b: GraphAnchor, iconRadius: number, targetIsCenter = false): LineEndpoints {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  const startOffset = Math.min(iconRadius + 3, length * 0.35);
  const endOffset = targetIsCenter && b.id === 'centre' ? 0 : Math.min(iconRadius + 3, length * 0.35);
  return {
    x1: a.x + (dx / length) * startOffset,
    y1: a.y + (dy / length) * startOffset,
    x2: b.x - (dx / length) * endOffset,
    y2: b.y - (dy / length) * endOffset,
  };
}

function GraphFrame({ size, annotate }: { size: number; annotate: boolean }) {
  const lm = useMemo(() => { const w = size * 0.75; return { coreR: (140 / 600) * w, blueR: (300 / 600) * w, whiteR: (360 / 600) * w }; }, [size]);
  const c = size / 2;
  // Same layout call as OpinionGraph, so annotations use the real node positions.
  const anchors = useMemo(() => {
    const outer = size * 0.48;
    const nodes: GraphAnchor[] = calculateTTLayout(DEMO_OPINIONS, DEMO_RATINGS, { centerX: c, centerY: c, outerRadius: outer, extremeRadius: outer * 0.92, moderateRadius: outer * 0.8, respectfulRadius: outer * 0.25, nodeRadius: Math.max(3, size * 0.012) }, lm, DEMO_POINTS).nodes
      .map(n => ({ id: n.id, x: n.x, y: n.y, r: Math.hypot(n.x - c, n.y - c), a: Math.atan2(n.y - c, n.x - c) }));
    const iconRadius = 18 * Math.min(1, (Math.max(3, size * 0.012) / 6) * 1.6);
    const centreNode = [...nodes].sort((p, q) => p.r - q.r)[0];
    const centre: GraphAnchor = centreNode?.r <= iconRadius
      ? centreNode
      : { id: 'centre', x: c, y: c, r: 0, a: 0 };
    const isClear = (a: GraphAnchor, b: GraphAnchor) => nodes
      .filter(n => n.id !== a.id && n.id !== b.id)
      .every(n => distanceToSegment(n, a, b) > iconRadius + 1);
    const visibleLength = (a: GraphAnchor, b: GraphAnchor) => Math.hypot(b.x - a.x, b.y - a.y) - 2 * (iconRadius + 3);

    // Radius: use the longest unobstructed radial segment. The centre person is
    // the destination, not an obstacle; the line stops at both icon borders.
    const radiusNode = nodes
      .filter(n => n.id !== centre.id && visibleLength(n, centre) > 12 && isClear(n, centre))
      .sort((p, q) => visibleLength(q, centre) - visibleLength(p, centre))[0];

    // Angle: one direct, unobstructed connection between two different people.
    // Keep the radius person out of this pair so the two ideas stay separate.
    let pair: GraphAnchor[] = [];
    let best = -Infinity;
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      if (a.id === centre.id || b.id === centre.id || a.id === radiusNode?.id || b.id === radiusNode?.id) continue;
      const gap = Math.abs(a.a - b.a);
      const length = visibleLength(a, b);
      if (gap < 0.45 || gap > 1.5 || length <= 12 || !isClear(a, b)) continue;
      const clearance = Math.min(...nodes.filter(n => n.id !== a.id && n.id !== b.id).map(n => distanceToSegment(n, a, b) - iconRadius));
      const score = length + Math.min(clearance, 8) * 4;
      if (score > best) { best = score; pair = [a, b]; }
    }
    return { pair, radiusNode, centre, iconRadius };
  }, [size, c, lm]);
  const [A, B] = anchors.pair;
  const R = anchors.radiusNode;
  const angleLine = A && B ? trimToNodeEdges(A, B, anchors.iconRadius) : null;
  const radiusLine = R ? trimToNodeEdges(R, anchors.centre, anchors.iconRadius, true) : null;
  return (
    <div className="relative h-full w-full" style={{ '--wedium-node': '242 43% 22%' } as CSSProperties}>
      <WediumPresentationContext.Provider value>
        <OpinionGraph opinions={DEMO_OPINIONS} ratings={DEMO_RATINGS} width={size} height={size} showLabels="none" chrome="naked" ttMode ttLandmarks={lm} nodePoints={DEMO_POINTS} showNodePoints={false} />
      </WediumPresentationContext.Provider>
      {annotate && (angleLine || radiusLine) && (
        <svg className="pointer-events-none absolute inset-0 text-foreground" width={size} height={size} aria-hidden>
          <g stroke="currentColor" fill="none" strokeWidth={2} strokeLinecap="round">
            {angleLine && <line {...angleLine} />}
            {radiusLine && <line {...radiusLine} />}
          </g>
        </svg>
      )}
      {annotate && (
        <div className="pointer-events-none absolute inset-0 text-foreground">
          <span className="slide-anno absolute bottom-16 right-4 max-w-[170px] text-right">Angle = disagreement</span>
          <span className="slide-anno absolute left-4 top-3 max-w-[210px]">Radius = feeling understood × disagreement</span>
          <span className="slide-anno absolute bottom-3 left-4">Centre: the best listeners</span>
        </div>
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
    { id: 'graph-annotated', ...size(480, 480), render: () => null },
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
                  {f.id.startsWith('graph')
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
