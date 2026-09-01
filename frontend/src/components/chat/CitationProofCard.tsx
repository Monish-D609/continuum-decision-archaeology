import React from 'react';
import type { Citation } from '../../types/api';

interface CitationProofCardProps {
  citation: Citation;
}

export const CitationProofCard: React.FC<CitationProofCardProps> = ({ citation }) => {
  const badgeColor =
    citation.confidence === 'confirmed'
      ? 'bg-confirmed-emerald/20 text-confirmed-emerald border border-confirmed-emerald/30'
      : citation.confidence === 'inferred'
      ? 'bg-inferred-amber/20 text-inferred-amber border border-inferred-amber/30'
      : 'bg-unknown-rose/20 text-unknown-rose border border-unknown-rose/30';

  const dotColor =
    citation.confidence === 'confirmed'
      ? 'bg-confirmed-emerald'
      : citation.confidence === 'inferred'
      ? 'bg-inferred-amber'
      : 'bg-unknown-rose';

  return (
    <div className="bg-surface-container p-3.5 rounded-xl border border-outline-variant flex flex-col gap-2 relative overflow-hidden group hover:border-outline transition-colors shadow-sm">
      <div className={`absolute top-0 left-0 w-[2px] h-full ${dotColor}`} />
      <div className="flex justify-between items-start pl-1">
        <div className="flex items-center gap-2 flex-wrap">
          {citation.author && (
            <div className="flex items-center gap-1.5">
              <img
                alt={`@${citation.author}`}
                className="w-5 h-5 rounded-full border border-outline-variant"
                src={`https://github.com/${citation.author}.png?size=20`}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="font-code-sm text-on-surface text-[12px]">@{citation.author}</span>
            </div>
          )}

          <span className="bg-surface-container-highest px-1.5 py-0.5 rounded font-label-caps text-[11px] text-on-surface-variant flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
            {citation.source_type.toUpperCase()} #{citation.source_id}
          </span>

          <span className={`px-2 py-0.5 rounded-full font-label-caps text-[10px] ${badgeColor}`}>
            {citation.confidence}
          </span>
        </div>

        <a
          href={citation.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 text-[12px] font-code-sm"
        >
          <span>View Source</span>
          <span className="material-symbols-outlined text-[14px]">open_in_new</span>
        </a>
      </div>

      <p className="font-body-md text-on-surface pl-1 text-[14px] leading-relaxed">
        {citation.text}
      </p>

      {citation.quote && (
        <blockquote className="font-code-sm text-on-surface-variant/80 border-l-2 border-primary/50 pl-3 my-1 italic bg-surface-container-lowest/50 py-1 rounded-r text-[12px]">
          "{citation.quote}"
        </blockquote>
      )}
    </div>
  );
};
