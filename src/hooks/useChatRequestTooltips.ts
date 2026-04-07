import { useCallback } from 'react';
import { toast } from 'sonner';

const STORAGE_KEY = 'freemind_chat_request_tooltip_count';

export function useChatRequestTooltips() {
  const getCount = useCallback(() => {
    const val = localStorage.getItem(STORAGE_KEY);
    return val ? parseInt(val, 10) : 0;
  }, []);

  const onNewIncomingRequest = useCallback((t: (key: string) => string) => {
    const count = getCount();
    if (count >= 2) return;

    const newCount = count + 1;
    localStorage.setItem(STORAGE_KEY, String(newCount));

    if (newCount === 1) {
      toast.info(t('chatRequestTooltip.first'), { duration: 6000 });
    } else if (newCount === 2) {
      toast.info(t('chatRequestTooltip.second'), { duration: 6000 });
    }
  }, [getCount]);

  return {
    onNewIncomingRequest,
    hasShownAllTooltips: getCount() >= 2,
  };
}
