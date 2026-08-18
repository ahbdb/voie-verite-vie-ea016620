import { formatProse, formatLitany } from '@/lib/prose-format';

/** Structured, readable rendering of a neuvaine prose text. */
export const NeuvaineProse = ({ text, className = '', dropCap = false }: { text?: string | null; className?: string; dropCap?: boolean }) => {
  const blocks = formatProse(text);
  if (blocks.length === 0) return null;

  return (
    <div className={`space-y-4 ${className}`}>
      {blocks.map((block, i) => {
        if (block.kind === 'heading') {
          return (
            <h3
              key={i}
              className="text-sm font-cinzel font-bold text-primary uppercase tracking-[0.12em] pt-2"
            >
              {block.text}
            </h3>
          );
        }
        if (block.kind === 'list') {
          return (
            <ol key={i} className="space-y-1.5">
              {block.items.map((item, j) => (
                <li key={j} className="flex gap-3 text-sm text-muted-foreground leading-relaxed">
                  <span className="shrink-0 w-7 text-right font-semibold text-cathedral-gold tabular-nums whitespace-nowrap">
                    {j + 1}.
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          );
        }
        return (
          <p
            key={i}
            className={`text-[0.95rem] leading-[1.85] text-muted-foreground ${
              dropCap && i === 0 && block.text.length > 220
                ? 'first-letter:float-left first-letter:mr-2 first-letter:mt-1 first-letter:font-cinzel first-letter:text-4xl first-letter:leading-none first-letter:text-cathedral-gold'
                : ''
            }`}
          >
            {block.text}
          </p>
        );
      })}
    </div>
  );
};

/** Liturgical two-part rendering of a litany: invocation → response. */
export const NeuvaineLitany = ({ text }: { text?: string | null }) => {
  const lines = formatLitany(text);
  if (lines.length === 0) return null;

  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        if (line.kind === 'caption') {
          return (
            <p key={i} className="text-xs uppercase tracking-[0.14em] text-cathedral-gold/80 mb-2">
              {line.text}
            </p>
          );
        }
        if (line.kind === 'invocation') {
          return (
            <div
              key={i}
              className="grid grid-cols-1 sm:grid-cols-[1fr_auto] sm:items-baseline gap-x-4 gap-y-0.5 py-1.5 border-b border-border/40"
            >
              <span className="text-sm text-foreground/90 leading-relaxed">{line.call}</span>
              <span className="text-xs italic text-primary sm:text-right whitespace-nowrap">
                {line.response}
              </span>
            </div>
          );
        }
        if (line.kind === 'versicle') {
          return (
            <div key={i} className="flex gap-2 py-1 text-sm">
              <span className="font-cinzel font-bold text-cathedral-gold shrink-0">{line.marker}.</span>
              <span className={line.marker === 'R' ? 'italic text-primary' : 'text-foreground/90'}>
                {line.text}
              </span>
            </div>
          );
        }
        if (line.kind === 'prayerHeading') {
          return (
            <h4
              key={i}
              className="text-sm font-cinzel font-bold text-primary uppercase tracking-[0.12em] pt-5"
            >
              {line.text}
            </h4>
          );
        }
        return (
          <p key={i} className="text-[0.95rem] leading-[1.85] text-muted-foreground italic">
            {line.text}
          </p>
        );
      })}
    </div>
  );
};

export default NeuvaineProse;