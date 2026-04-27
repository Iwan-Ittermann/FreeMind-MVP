import { Fragment } from 'react';

interface TopicTitleWithLinksProps {
  title: string;
  className?: string;
  linkClassName?: string;
}

function isSafeExternalUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function parseTitleSegments(title: string): Array<{ label: string; href?: string }> {
  const re = /\[([^\]]+)]\(([^)]+)\)/g;
  const out: Array<{ label: string; href?: string }> = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(title)) !== null) {
    if (match.index > lastIdx) out.push({ label: title.slice(lastIdx, match.index) });
    out.push({ label: match[1], href: isSafeExternalUrl(match[2]) ? match[2] : undefined });
    lastIdx = re.lastIndex;
  }

  if (lastIdx < title.length) out.push({ label: title.slice(lastIdx) });
  return out;
}

export function TopicTitleWithLinks({ title, className, linkClassName }: TopicTitleWithLinksProps) {
  const segments = parseTitleSegments(title);

  return (
    <span className={className}>
      {segments.map((segment, index) => (
        <Fragment key={`${segment.label}-${index}`}>
          {segment.href ? (
            <a
              href={segment.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
              className={linkClassName ?? 'underline decoration-foreground/60 underline-offset-4'}
            >
              {segment.label}
            </a>
          ) : (
            segment.label
          )}
        </Fragment>
      ))}
    </span>
  );
}