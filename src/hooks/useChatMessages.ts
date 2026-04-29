import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { BOT_USER_ID } from '@/lib/constants';
import { getAnimationChannel } from '@/lib/animation-channel';

export interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  isOwn: boolean;
  createdAt: Date;
  replyToId: string | null;
  audioUrl: string | null;
  transcript: string | null;
}

interface ReadOnlyChatMessageRow {
  id: string | null;
  sender_id: string | null;
  content: string | null;
  created_at: string | null;
  reply_to_id: string | null;
  audio_url: string | null;
  transcript: string | null;
}

interface ChatMessageRow {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  reply_to_id?: string | null;
  audio_url?: string | null;
  transcript?: string | null;
}

interface SupabaseReadOnlyRpc {
  rpc: (
    fn: 'get_readonly_chat_messages',
    args: { _source_opinion_id: string; _target_opinion_id: string },
  ) => Promise<{ data: ReadOnlyChatMessageRow[] | null; error: Error | null }>;
}

interface UseChatMessagesResult {
  messages: ChatMessage[];
  isLoading: boolean;
  sendMessage: (content: string, replyToId?: string | null) => Promise<void>;
  sendVoiceMessage: (audioBlob: Blob) => Promise<void>;
  isSending: boolean;
  isBotTyping: boolean;
}

export function useChatMessages(
  chatId: string | null,
  isBotChat = false,
  broadcastInfo?: { topicId: string; myOpinionId: string; theirOpinionId: string },
  readOnlyPair?: { sourceOpinionId: string; targetOpinionId: string; sourceUserId?: string | null },
): UseChatMessagesResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch existing messages
  // Include user?.id in query key to refetch when user changes (fixes isOwn calculation)
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['chat-messages', chatId, user?.id, readOnlyPair?.sourceOpinionId, readOnlyPair?.targetOpinionId, readOnlyPair?.sourceUserId],
    queryFn: async () => {
      if (readOnlyPair) {
        const { data, error } = await (supabase as unknown as SupabaseReadOnlyRpc).rpc('get_readonly_chat_messages', {
          _source_opinion_id: readOnlyPair.sourceOpinionId,
          _target_opinion_id: readOnlyPair.targetOpinionId,
        });

        if (error) throw error;

        return (data || [])
          .filter((msg): msg is ReadOnlyChatMessageRow & { id: string; sender_id: string; content: string; created_at: string } => !!msg.id && !!msg.sender_id && !!msg.content && !!msg.created_at)
          .map((msg): ChatMessage => ({
            id: msg.id,
            content: msg.content,
            senderId: msg.sender_id,
            isOwn: msg.sender_id === readOnlyPair.sourceUserId,
            createdAt: new Date(msg.created_at),
            replyToId: msg.reply_to_id ?? null,
            audioUrl: msg.audio_url ?? null,
            transcript: msg.transcript ?? null,
          }));
      }

      if (!chatId || !user?.id) return [];
      
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      return data.map((msg): ChatMessage => ({
        id: msg.id,
        content: msg.content,
        senderId: msg.sender_id,
        isOwn: msg.sender_id === user.id,
        createdAt: new Date(msg.created_at),
        replyToId: (msg as ChatMessageRow).reply_to_id ?? null,
        audioUrl: (msg as ChatMessageRow).audio_url ?? null,
        transcript: (msg as ChatMessageRow).transcript ?? null,
      }));
    },
    enabled: !!readOnlyPair || (!!chatId && !!user?.id),
  });

  // Mark other user's messages as read when chat is open
  useEffect(() => {
    if (!chatId || !user?.id || readOnlyPair) return;

    const markAsRead = async () => {
      const { error } = await supabase
        .from('chat_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('chat_id', chatId)
        .neq('sender_id', user.id)
        .is('read_at', null);

      if (error) {
        console.error('Failed to mark messages as read:', error);
        return;
      }

      // Force immediate refetch for badge updates
      queryClient.refetchQueries({ queryKey: ['unreadMessages'] });
    };

    markAsRead();
  }, [chatId, user?.id, messages.length, queryClient, readOnlyPair]);

  // Subscribe to real-time updates with unique channel name
  useEffect(() => {
    if (!chatId || readOnlyPair) return;

    // Use unique channel name with timestamp to avoid subscription conflicts
    const channelName = `chat-messages-${chatId}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          const message: ChatMessage = {
            id: newMsg.id,
            content: newMsg.content,
            senderId: newMsg.sender_id,
            isOwn: newMsg.sender_id === user?.id,
            createdAt: new Date(newMsg.created_at),
            replyToId: newMsg.reply_to_id ?? null,
            audioUrl: newMsg.audio_url ?? null,
            transcript: newMsg.transcript ?? null,
          };
          
          queryClient.setQueryData(['chat-messages', chatId, user?.id], (old: ChatMessage[] = []) => {
            if (old.some(m => m.id === message.id)) return old;
            return [...old, message];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const updated = payload.new as any;
          queryClient.setQueryData(['chat-messages', chatId, user?.id], (old: ChatMessage[] = []) => {
            return old.map(m => m.id === updated.id ? {
              ...m,
              content: updated.content,
              transcript: updated.transcript ?? null,
              audioUrl: updated.audio_url ?? null,
            } : m);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, user?.id, queryClient, readOnlyPair]);

  const [isBotTyping, setIsBotTyping] = useState(false);

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async ({ content, replyToId }: { content: string; replyToId?: string | null }) => {
      if (!chatId || !user?.id) throw new Error('Cannot send message');
      
      const insertData: any = {
        chat_id: chatId,
        sender_id: user.id,
        content,
      };
      if (replyToId) insertData.reply_to_id = replyToId;

      const { error } = await supabase
        .from('chat_messages')
        .insert(insertData);
      
      if (error) throw error;
    },
    onSuccess: async () => {
      // Broadcast animation event for the graph using the shared channel
      if (broadcastInfo && chatId) {
        try {
          const animChannel = getAnimationChannel(broadcastInfo.topicId);
          if (animChannel) {
            await animChannel.send({
              type: 'broadcast',
              event: 'message-animation',
              payload: {
                sourceOpinionId: broadcastInfo.myOpinionId,
                targetOpinionId: broadcastInfo.theirOpinionId,
                chatId,
              },
            });
          } else {
            console.warn('Animation channel not found for topic:', broadcastInfo.topicId);
          }
        } catch (err) {
          console.error('Failed to broadcast animation:', err);
        }
      }

      // If this is a bot chat, trigger the AI response
      if (isBotChat && chatId) {
        setIsBotTyping(true);
        try {
          const { error } = await supabase.functions.invoke('ai-chat', {
            body: { chatId },
          });
          if (error) {
            console.error('AI chat error:', error);
          }
        } catch (err) {
          console.error('Failed to get AI response:', err);
        } finally {
          setIsBotTyping(false);
        }
      }
    },
  });

  const sendMessage = async (content: string, replyToId?: string | null) => {
    await sendMutation.mutateAsync({ content, replyToId });
  };

  const sendVoiceMessage = async (audioBlob: Blob) => {
    if (!chatId || !user?.id) throw new Error('Cannot send voice message');

    const fileName = `${user.id}/${chatId}/${crypto.randomUUID()}.webm`;

    // 1. Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('voice-messages')
      .upload(fileName, audioBlob, { contentType: 'audio/webm' });

    if (uploadError) throw uploadError;

    // 2. Get public URL
    const { data: urlData } = supabase.storage
      .from('voice-messages')
      .getPublicUrl(fileName);

    const audioUrl = urlData.publicUrl;

    // 3. Insert message with audio_url
    const { data: insertedMsg, error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        chat_id: chatId,
        sender_id: user.id,
        content: '🎤 Voice message',
        audio_url: audioUrl,
      } as any)
      .select('id')
      .single();

    if (insertError) throw insertError;

    // 4. Broadcast animation
    if (broadcastInfo) {
      try {
        const animChannel = getAnimationChannel(broadcastInfo.topicId);
        if (animChannel) {
          await animChannel.send({
            type: 'broadcast',
            event: 'message-animation',
            payload: {
              sourceOpinionId: broadcastInfo.myOpinionId,
              targetOpinionId: broadcastInfo.theirOpinionId,
              chatId,
            },
          });
        }
      } catch (err) {
        console.error('Failed to broadcast animation:', err);
      }
    }

    // 5. Trigger transcription (fire-and-forget)
    supabase.functions.invoke('transcribe-voice', {
      body: { messageId: insertedMsg.id },
    }).catch(err => console.error('Transcription error:', err));
  };

  return {
    messages,
    isLoading,
    sendMessage,
    sendVoiceMessage,
    isSending: sendMutation.isPending,
    isBotTyping,
  };
}
