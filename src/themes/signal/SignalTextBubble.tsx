import { useLayoutEffect, useRef, useState } from 'react';

/** Measure the HTML text itself so SVG bubbles never clip lines or reserve empty space. */
export function SignalTextBubble({ text, maxWidth, anchor = 'center', below = false }: {
  text: string;
  maxWidth: number;
  anchor?: 'center' | 'left' | 'right';
  below?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: maxWidth, height: 54 });
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      const width = Math.ceil(element.offsetWidth);
      const height = Math.ceil(element.offsetHeight);
      setSize(previous => previous.width === width && previous.height === height ? previous : { width, height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [text, maxWidth]);
  const x = anchor === 'left' ? 0 : anchor === 'right' ? -size.width : -size.width / 2;
  return (
    <foreignObject x={x} y={below ? 0 : -size.height} width={maxWidth} height={size.height + 2} overflow="visible">
      <div ref={ref} data-graph-text-bubble className="inline-block max-w-full align-top rounded-md border border-primary/50 bg-card px-2 py-1 text-center text-[10px] leading-[14px] text-card-foreground shadow-md">
        <div className="line-clamp-3 break-words">{text}</div>
      </div>
    </foreignObject>
  );
}