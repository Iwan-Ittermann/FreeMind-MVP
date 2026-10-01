import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTopicData } from '@/hooks/useTopicData';
import { useAppSetting } from '@/hooks/useAppSettings';
import { useAllTopicChats, type AllTopicChatItem } from '@/hooks/useAllTopicChats';
import { calculateTTLayout, type TTLandmarks } from '@/lib/tt-layout';
import {
  assignStream,
  spiralPoints,
  streamClock,
  type SpiralCandidate,
  type SpiralPoint,
  type StreamEntry,
} from '@/lib/stream-spiral';
import type { LayoutConfig } from '@/types/graph';

/** Einheitsraum der Spirale: Zentrum 0,0 — Ringe wie im Hintergrund-SVG. */
const UNIT_LANDMARKS: TTLandmarks = { coreR: 140, blueR: 300, whiteR: 360 };
const UNIT_CONFIG: LayoutConfig = {
  centerX: 0,
  centerY: 0,
  outerRadius: 300,
  extremeRadius: 276,
  moderateRadius: 240,
  respectfulRadius: 75,
  nodeRadius: 6,
};

const DEFAULT_CYCLE_HOURS = 24;

export interface StreamFocus {
  /** Anzahl der Kandidaten = Spiralpunkte pro Umlauf. */
  n: number;
  cycle: number;
  currentIndex: number;
  tickMs: number;
  countdownMs: number;
  /** Alle Spiralpunkte des aktuellen Umlaufs (Einheitsraum). */
  points: SpiralPoint[];
  /** Vergangene + aktueller Eintrag dieses Umlaufs. */
  entries: StreamEntry[];
  /** Der aktuell gefeaturte Node (null, wenn keine Kandidaten). */
  current: StreamEntry | null;
  /** Bester Chat pro Node (höchstes gegenseitiges Respekt × Differenz). */
  bestChatFor: (nodeId: string) => AllTopicChatItem | null;
  /** Alle gestarteten Chats des Nodes, stärkste Verbindung zuerst. */
  chatsFor: (nodeId: string) => AllTopicChatItem[];
  /** Positionen der Kandidaten im Einheitsraum. */
  candidatePositions: Map<string, { x: number; y: number }>;
  loading: boolean;
}

interface DirectedPair {
  rater: string;
  target: string;
  empathy: number;
  disagreement: number;
}

/**
 * Wertet bei jeder Daten-Aktualisierung neu aus, welcher Node dem aktuell
 * heißen Spiralpunkt am nächsten liegt. Vergangene Takte werden einmalig über
 * pin_stream_entry festgeschrieben und danach nie mehr verändert.
 */
export function useStreamFocus(topicId: string): StreamFocus {
  const queryClient = useQueryClient();
  const { data } = useTopicData(topicId);
  const { data: allChats = [] } = useAllTopicChats(topicId, !!topicId);
  const { data: startedSetting } = useAppSetting(`stream_started_at_${topicId}`);
  const { data: cycleSetting } = useAppSetting(`stream_cycle_hours_${topicId}`);

  // Fallback-Start: Erstellungszeitpunkt des Themas.
  const { data: topicCreatedAt } = useQuery({
    queryKey: ['topicCreatedAt', topicId],
    enabled: !!topicId,
    staleTime: Infinity,
    queryFn: async () => {
      const { data: row, error } = await supabase
        .from('topics')
        .select('created_at')
        .eq('id', topicId)
        .single();
      if (error) throw error;
      return row.created_at as string;
    },
  });

  // Gerichtete Paare (wer hat wen bewertet) — Grundlage für Kandidaten
  // (beidseitige Bewertung = beidseitiger Chat) und beste-Chat-Auswahl.
  const { data: directedPairs = [] } = useQuery({
    queryKey: ['streamDirectedPairs', topicId],
    enabled: !!topicId,
    refetchInterval: 4000,
    queryFn: async (): Promise<DirectedPair[]> => {
      const { data: rows, error } = await supabase.rpc('get_topic_directed_pairs', {
        _topic_id: topicId,
      });
      if (error) throw error;
      return (rows ?? []).map((r) => ({
        rater: r.rater_opinion_id as string,
        target: r.target_opinion_id as string,
        empathy: Number(r.empathy ?? 0),
        disagreement: Number(r.disagreement ?? 0),
      }));
    },
  });

  // Festgeschriebene Vergangenheits-Einträge dieses Themas.
  const { data: pinnedRaw } = useQuery({
    queryKey: ['streamHistory', topicId],
    enabled: !!topicId,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .like('key', `stream_entry_${topicId}_%`);
      if (error) throw error;
      return rows ?? [];
    },
  });

  // Uhr für Takt + Countdown (1s reicht; Auswahl wird nur bei Daten-Updates neu bewertet).
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const startedAtMs = useMemo(() => {
    const raw = startedSetting?.value ?? topicCreatedAt;
    const parsed = raw ? Date.parse(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : Date.now();
  }, [startedSetting?.value, topicCreatedAt]);

  const cycleMs = useMemo(() => {
    const hours = Number(cycleSetting?.value);
    return (Number.isFinite(hours) && hours > 0 ? hours : DEFAULT_CYCLE_HOURS) * 3600 * 1000;
  }, [cycleSetting?.value]);

  // Kandidaten: Punkte ≥ 0 und mindestens ein beidseitig bewerteter Chat.
  const candidateIds = useMemo(() => {
    if (!data) return new Set<string>();
    const dirs = new Map<string, Set<string>>();
    for (const p of directedPairs) {
      if (!dirs.has(p.rater)) dirs.set(p.rater, new Set());
      dirs.get(p.rater)!.add(p.target);
    }
    const out = new Set<string>();
    for (const op of data.opinions) {
      const pts = data.nodePoints.get(op.id) ?? 0;
      if (pts < 0) continue;
      const partners = dirs.get(op.id);
      if (!partners) continue;
      for (const partner of partners) {
        if (dirs.get(partner)?.has(op.id)) {
          out.add(op.id);
          break;
        }
      }
    }
    return out;
  }, [data, directedPairs]);

  // Positionen im Einheitsraum (deterministisch, bildschirmunabhängig).
  const candidatePositions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    if (!data || candidateIds.size === 0) return map;
    const candidates = data.opinions.filter((o) => candidateIds.has(o.id));
    const layout = calculateTTLayout(candidates, data.ratings, UNIT_CONFIG, UNIT_LANDMARKS, data.nodePoints);
    for (const node of layout.nodes) map.set(node.id, { x: node.x, y: node.y });
    return map;
  }, [data, candidateIds]);

  const n = candidateIds.size;
  const clock = useMemo(
    () => streamClock(nowMs, startedAtMs, cycleMs, n),
    [nowMs, startedAtMs, cycleMs, n],
  );

  // Gepinnte Einträge des aktuellen Umlaufs: Punkt-Index → Node-ID.
  const pinned = useMemo(() => {
    const map = new Map<number, string>();
    const prefix = `stream_entry_${topicId}_${clock.cycle}_`;
    for (const row of pinnedRaw ?? []) {
      if (!row.key.startsWith(prefix)) continue;
      const idx = Number(row.key.slice(prefix.length));
      if (Number.isInteger(idx) && idx >= 0) map.set(idx, row.value);
    }
    return map;
  }, [pinnedRaw, topicId, clock.cycle]);

  const entries = useMemo(() => {
    if (n === 0) return [];
    const candidates: SpiralCandidate[] = [...candidatePositions.entries()].map(([id, p]) => ({
      id,
      x: p.x,
      y: p.y,
    }));
    return assignStream(candidates, n, clock.cycle, pinned);
  }, [candidatePositions, n, clock.cycle, pinned]);

  const current = entries.find((e) => e.index === clock.index) ?? null;

  // Vergangene Takte festhalten: erster Betrachter nach dem Übergang schreibt,
  // alle weiteren Aufrufe sind No-ops (ON CONFLICT DO NOTHING).
  const pinningRef = useRef(new Set<string>());
  useEffect(() => {
    if (!topicId || n === 0) return;
    for (const e of entries) {
      if (e.pinned || e.index >= clock.index) continue;
      const dedupe = `${clock.cycle}:${e.index}`;
      if (pinningRef.current.has(dedupe)) continue;
      pinningRef.current.add(dedupe);
      supabase
        .rpc('pin_stream_entry', {
          _topic_id: topicId,
          _cycle: clock.cycle,
          _point_index: e.index,
          _node_id: e.nodeId,
        })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['streamHistory', topicId] });
        });
    }
  }, [entries, clock.index, clock.cycle, topicId, n, queryClient]);

  // Bester Chat pro Node: höchste Summe der gerichteten Respekt × Differenz.
  const bestChatFor = useMemo(() => {
    const pairScore = new Map<string, number>();
    for (const p of directedPairs) {
      const key = [p.rater, p.target].sort().join('|');
      pairScore.set(key, (pairScore.get(key) ?? 0) + p.empathy * p.disagreement);
    }
    const best = new Map<string, { chat: AllTopicChatItem; score: number }>();
    for (const chat of allChats) {
      const key = [chat.opinionAId, chat.opinionBId].sort().join('|');
      const score = pairScore.get(key) ?? 0;
      for (const nodeId of [chat.opinionAId, chat.opinionBId]) {
        const cur = best.get(nodeId);
        if (!cur || score > cur.score || (score === cur.score && chat.id < cur.chat.id)) {
          best.set(nodeId, { chat, score });
        }
      }
    }
    return (nodeId: string) => best.get(nodeId)?.chat ?? null;
  }, [directedPairs, allChats]);

  const chatsFor = useMemo(() => {
    const pairScore = new Map<string, number>();
    for (const p of directedPairs) {
      const key = [p.rater, p.target].sort().join('|');
      pairScore.set(key, (pairScore.get(key) ?? 0) + p.empathy * p.disagreement);
    }
    return (nodeId: string) => allChats
      .filter((chat) => chat.opinionAId === nodeId || chat.opinionBId === nodeId)
      .sort((a, b) => {
        const scoreA = pairScore.get([a.opinionAId, a.opinionBId].sort().join('|')) ?? 0;
        const scoreB = pairScore.get([b.opinionAId, b.opinionBId].sort().join('|')) ?? 0;
        return scoreB - scoreA || b.messageCount - a.messageCount || a.id.localeCompare(b.id);
      });
  }, [directedPairs, allChats]);

  return {
    n,
    cycle: clock.cycle,
    currentIndex: clock.index,
    tickMs: clock.tickMs,
    countdownMs: clock.countdownMs,
    points: n > 0 ? spiralPoints(n, clock.cycle) : [],
    entries,
    current,
    bestChatFor,
    chatsFor,
    candidatePositions,
    loading: !data,
  };
}
