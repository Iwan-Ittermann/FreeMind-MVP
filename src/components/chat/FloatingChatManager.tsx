import { useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { AnimatePresence } from 'framer-motion';
import { FloatingChatWindow } from './FloatingChatWindow';
import { MinimizedChatBubble } from './MinimizedChatBubble';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface OpenChat {
  theirOpinionId: string;
  isMinimized: boolean;
}

const STORAGE_KEY = 'freemind_floating_chats';
const MAX_EXPANDED = 3;

function loadChats(): OpenChat[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveChats(chats: OpenChat[]) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
}

export interface FloatingChatManagerHandle {
  openChat: (theirOpinionId: string) => void;
}

interface FloatingChatManagerProps {
  topicId: string;
  myOpinionId?: string;
  unreadMessageCounts?: Map<string, number>;
}

export const FloatingChatManager = forwardRef<FloatingChatManagerHandle, FloatingChatManagerProps>(
  function FloatingChatManager({ topicId, myOpinionId, unreadMessageCounts }, ref) {
    const [openChats, setOpenChats] = useState<OpenChat[]>(loadChats);
    const { user } = useAuth();

    useEffect(() => { saveChats(openChats); }, [openChats]);

    const minimizedIds = openChats.filter(c => c.isMinimized).map(c => c.theirOpinionId);
    const { data: opinionTexts } = useQuery({
      queryKey: ['opinionTexts', minimizedIds],
      queryFn: async () => {
        if (minimizedIds.length === 0) return {};
        const { data } = await supabase
          .from('opinions_public')
          .select('id, text')
          .in('id', minimizedIds);
        const map: Record<string, string> = {};
        data?.forEach(o => { if (o.id) map[o.id] = o.text || '?'; });
        return map;
      },
      enabled: minimizedIds.length > 0,
    });

    const openChat = useCallback((theirOpinionId: string) => {
      setOpenChats(prev => {
        const exists = prev.find(c => c.theirOpinionId === theirOpinionId);
        if (exists) {
          return prev.map(c => c.theirOpinionId === theirOpinionId ? { ...c, isMinimized: false } : c);
        }
        const expanded = prev.filter(c => !c.isMinimized);
        let next = [...prev, { theirOpinionId, isMinimized: false }];
        if (expanded.length >= MAX_EXPANDED) {
          const oldest = expanded[0];
          next = next.map(c => c.theirOpinionId === oldest.theirOpinionId ? { ...c, isMinimized: true } : c);
        }
        return next;
      });
    }, []);

    const minimizeChat = useCallback((theirOpinionId: string) => {
      setOpenChats(prev => prev.map(c => c.theirOpinionId === theirOpinionId ? { ...c, isMinimized: true } : c));
    }, []);

    const expandChat = useCallback((theirOpinionId: string) => {
      setOpenChats(prev => {
        const expanded = prev.filter(c => !c.isMinimized && c.theirOpinionId !== theirOpinionId);
        let next = prev.map(c => c.theirOpinionId === theirOpinionId ? { ...c, isMinimized: false } : c);
        if (expanded.length >= MAX_EXPANDED) {
          const oldest = expanded[0];
          next = next.map(c => c.theirOpinionId === oldest.theirOpinionId ? { ...c, isMinimized: true } : c);
        }
        return next;
      });
    }, []);

    const closeChat = useCallback((theirOpinionId: string) => {
      setOpenChats(prev => prev.filter(c => c.theirOpinionId !== theirOpinionId));
    }, []);

    useImperativeHandle(ref, () => ({ openChat }), [openChat]);

    if (!user) return null;

    const expandedChats = openChats.filter(c => !c.isMinimized);
    const minimizedChats = openChats.filter(c => c.isMinimized);

    const BUBBLE_SIZE = 48;
    const BUBBLE_RIGHT = 24;
    const BUBBLE_BOTTOM = 24;
    const WINDOW_WIDTH = 360;
    const WINDOW_GAP = 8;
    const bubbleColumnWidth = minimizedChats.length > 0 ? BUBBLE_SIZE + BUBBLE_RIGHT : BUBBLE_RIGHT;

    return (
      <>
        {/* Minimized bubbles — vertical stack, right edge */}
        <div
          className="fixed z-50 flex flex-col-reverse gap-2"
          style={{ right: BUBBLE_RIGHT, bottom: BUBBLE_BOTTOM }}
        >
          <AnimatePresence>
            {minimizedChats.map(chat => (
              <MinimizedChatBubble
                key={chat.theirOpinionId}
                opinionText={opinionTexts?.[chat.theirOpinionId] || '?'}
                unreadCount={unreadMessageCounts?.get(chat.theirOpinionId) || 0}
                onClick={() => expandChat(chat.theirOpinionId)}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Expanded floating windows — horizontal stack, left of bubbles */}
        <AnimatePresence>
          {expandedChats.map((chat, index) => {
            const rightOffset = bubbleColumnWidth + (expandedChats.length - 1 - index) * (WINDOW_WIDTH + WINDOW_GAP);
            return (
              <FloatingChatWindow
                key={chat.theirOpinionId}
                theirOpinionId={chat.theirOpinionId}
                onMinimize={() => minimizeChat(chat.theirOpinionId)}
                onClose={() => closeChat(chat.theirOpinionId)}
                style={{ right: rightOffset }}
              />
            );
          })}
        </AnimatePresence>
      </>
    );
  }
);
