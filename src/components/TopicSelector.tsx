import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Check, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUserTopics, UserTopic } from '@/hooks/useTopics';

interface TopicSelectorProps {
  currentTopicId?: string;
}

export function TopicSelector({ currentTopicId }: TopicSelectorProps) {
  const navigate = useNavigate();
  const { data: topics = [], isLoading } = useUserTopics();

  const currentTopic = topics.find(t => t.topic_id === currentTopicId);

  if (isLoading || topics.length === 0) {
    return null;
  }

  // Don't show selector if user has only one topic
  if (topics.length === 1) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <MessageCircle className="w-4 h-4" />
        <span className="font-medium text-foreground">{topics[0].title}</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="min-w-[200px] justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            <span className="truncate max-w-[150px]">
              {currentTopic?.title || 'Select Topic'}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[250px]">
        {topics.map((topic) => (
          <DropdownMenuItem
            key={topic.topic_id}
            onClick={() => navigate(`/topic/${topic.topic_id}`)}
            className="flex items-center justify-between"
          >
            <span className="truncate">{topic.title}</span>
            {topic.topic_id === currentTopicId && (
              <Check className="w-4 h-4 ml-2 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
