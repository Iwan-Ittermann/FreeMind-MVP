export function shouldSendOnEnter(input: {
  key: string;
  shiftKey: boolean;
  isComposing: boolean;
  isMobile: boolean;
  simulation: boolean;
}) {
  return input.key === 'Enter' && !input.shiftKey && !input.isComposing
    && (input.simulation || !input.isMobile);
}