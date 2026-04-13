import { useState, useEffect } from 'react';
import { Bot, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAppSetting, useUpdateAppSetting } from '@/hooks/useAppSettings';
import { useAllTopics } from '@/hooks/useTopics';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function AIBotPanel() {
  const { data: topics } = useAllTopics(true);
  // Pick the oldest (original) topic as primary, not the newest
  const primaryTopic = topics?.length
    ? [...topics].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0]
    : undefined;

  const { data: enabledSetting, isLoading: loadingEnabled } = useAppSetting('ai_bot_enabled');
  const { data: opinionSetting, isLoading: loadingOpinion } = useAppSetting('ai_bot_opinion_text');
  const { data: promptSetting, isLoading: loadingPrompt } = useAppSetting('ai_bot_system_prompt');

  const updateSetting = useUpdateAppSetting();

  const [enabled, setEnabled] = useState(false);
  const [opinionText, setOpinionText] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized && !loadingEnabled && !loadingOpinion && !loadingPrompt) {
      setEnabled(enabledSetting?.value === 'true');
      setOpinionText(opinionSetting?.value || 'I am the AI assistant. I am here to help facilitate constructive dialogue.');
      setSystemPrompt(promptSetting?.value || 'You are a helpful AI assistant participating in a discussion forum. Be concise, respectful, and encourage constructive dialogue between participants with different viewpoints.');
      setInitialized(true);
    }
  }, [initialized, loadingEnabled, loadingOpinion, loadingPrompt, enabledSetting, opinionSetting, promptSetting]);

  const upsertSetting = async (key: string, value: string) => {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key, value }, { onConflict: 'key' });
    if (error) throw error;
  };

  const handleSave = async () => {
    if (!primaryTopic) {
      toast.error(t('admin.toast.noTopicFound'));
      return;
    }

    setIsSaving(true);
    try {
      // Save all settings
      await upsertSetting('ai_bot_enabled', enabled ? 'true' : 'false');
      await upsertSetting('ai_bot_opinion_text', opinionText);
      await upsertSetting('ai_bot_system_prompt', systemPrompt);

      // Upsert or delete bot opinion
      if (enabled) {
        const { error } = await supabase.rpc('upsert_bot_opinion', {
          _topic_id: primaryTopic.id,
          _text: opinionText,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc('delete_bot_opinion', {
          _topic_id: primaryTopic.id,
        });
        if (error) throw error;
      }

      // Invalidate queries
      updateSetting.reset();
      toast.success(t('admin.toast.aiBotSaved'));
    } catch (err: any) {
      console.error('Failed to save AI bot settings:', err);
      toast.error(err.message || t('admin.toast.failedToSave'));
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = loadingEnabled || loadingOpinion || loadingPrompt;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
          <Bot className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">AI Bot Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Configure the AI bot that appears as a node on the graph
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 space-y-6">
        {/* Enable toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base font-medium">Enable AI Bot</Label>
            <p className="text-sm text-muted-foreground">
              Show the bot as a node users can chat with
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        {/* Opinion text */}
        <div className="space-y-2">
          <Label>Bot Opinion Text</Label>
          <p className="text-xs text-muted-foreground">
            This text appears on the graph as the bot's "opinion" and in chat as its initial statement
          </p>
          <Textarea
            value={opinionText}
            onChange={(e) => setOpinionText(e.target.value)}
            rows={3}
            placeholder="The bot's opinion text..."
            className="bg-background"
          />
        </div>

        {/* System prompt */}
        <div className="space-y-2">
          <Label>System Prompt / Context</Label>
          <p className="text-xs text-muted-foreground">
            Instructions for the AI on how to behave. This is sent as the system prompt with every message.
          </p>
          <Textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={6}
            placeholder="You are a helpful assistant..."
            className="bg-background font-mono text-sm"
          />
        </div>

        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
