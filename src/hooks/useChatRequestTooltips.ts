import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'freemind_chat_request_tooltip_count';

export function useChatRequestTooltips() {
  const [tooltipMessage, setTooltipMessage] = useState<string | null>(null);

  const getCount = useCallback(() => {
    const val = localStorage.getItem(STORAGE_KEY);
    return val ? parseInt(val, 10) : 0;
  }, []);

  const onNewIncomingRequest = useCallback((t: (key: string) => string) => {
    const count = getCount();
    if (count >= 2) return; // Only show for first 2

    const newCount = count + 1;
    localStorage.setItem(STORAGE_KEY, String(newCount));

    if (newCount === 1) {
      setTooltipMessage(t('chatRequestTooltip.first'));
    } else if (newCount === 2) {
      setTooltipMessage(t('chatRequestTooltip.second'));
    }

    // Auto-dismiss after 6 seconds
    setTimeout(() => setTooltipMessage(null), 6000);
  }, [getCount]);

  const dismissTooltip = useCallback(() => {
    setTooltipMessage(null);
  }, []);

  return {
    tooltipMessage,
    onNewIncomingRequest,
    dismissTooltip,
    hasShownAllTooltips: getCount() >= 2,
  };
}
