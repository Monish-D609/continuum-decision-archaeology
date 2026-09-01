import React from 'react';
import type { QueryResponse, Citation } from '../../types/api';
import { ConfidenceMatrix } from './ConfidenceMatrix';
import { CitationProofCard } from './CitationProofCard';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content?: string;
  data?: QueryResponse;
  mode?: 'query' | 'graveyard';
  question?: string;
}

interface MessageItemProps {
  message: ChatMessage;
  onExportADR: (question: string, answer: string, citations: Citation[], confidence: string) => void;
}

// Strip LLM instruction echoes and JSON code blocks from answers before rendering
function cleanAnswer(raw: string): string {
  // Remove JSON code blocks the LLM appended
  let text = raw.replace(/```(?:json)?[\s\S]*?```/gi, '');
  // Remove sections the LLM echos from the prompt (everything from ## Strict to end)
  const stripHeadings = ['## strict', '## response format', '## response', 'output valid json'];
  const lines = text.split('\n');
  let cutIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase().trim();
    if (stripHeadings.some(h => lower.startsWith(h))) {
      cutIdx = i;
      break;
    }
  }
  if (cutIdx !== -1) text = lines.slice(0, cutIdx).join('\n');
  return text.trim();
}

function renderFormattedText(raw: string): React.ReactNode {
  const text = cleanAnswer(raw);
  const blocks = text.split(/\n{2,}/);

  return blocks.map((block, blockIdx) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    // Skip standalone horizontal rules
    if (/^-{3,}$/.test(trimmed) || /^\*{3,}$/.test(trimmed)) return null;

    // H1
    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
      return (
        <h2 key={blockIdx} className="font-headline-md text-on-surface font-bold mt-6 mb-3 text-[20px]">
          {trimmed.slice(2)}
        </h2>
      );
    }

    // H2 — filter out instruction-echo headings
    if (trimmed.startsWith('## ')) {
      const title = trimmed.slice(3);
      const lower = title.toLowerCase();
      if (lower.startsWith('strict') || lower.startsWith('response format') || lower.startsWith('response')) return null;
      return (
        <h3 key={blockIdx} className="font-headline-sm text-on-surface font-semibold mt-5 mb-2 text-[17px]">
          {title}
        </h3>
      );
    }

    // H3 — Archaeological section badges
    if (trimmed.startsWith('### ')) {
      const title = trimmed.slice(4);
      let badgeStyle = 'text-primary bg-primary/10 border-primary/20';
      if (title.includes('⚰️') || title.toLowerCase().includes('graveyard')) {
        badgeStyle = 'text-unknown-rose bg-unknown-rose/10 border-unknown-rose/30';
      } else if (title.includes('📜') || title.toLowerCase().includes('decision') || title.toLowerCase().includes('author')) {
        badgeStyle = 'text-confirmed-emerald bg-confirmed-emerald/10 border-confirmed-emerald/30';
      } else if (title.includes('🧬') || title.toLowerCase().includes('drift') || title.toLowerCase().includes('legacy')) {
        badgeStyle = 'text-inferred-amber bg-inferred-amber/10 border-inferred-amber/30';
      } else if (title.includes('🏛️') || title.toLowerCase().includes('context') || title.toLowerCase().includes('stratum')) {
        badgeStyle = 'text-primary bg-primary/10 border-primary/20';
      }
      return (
        <div key={blockIdx} className="mt-6 mb-3">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold tracking-wide text-[13px] ${badgeStyle}`}>
            {title}
          </div>
        </div>
      );
    }

    const lines = trimmed.split('\n');

    // Mixed or pure bullet list — collect consecutive bullet + continuation lines
    const hasBullets = lines.some(l => l.trim().startsWith('- ') || l.trim().startsWith('* '));
    if (hasBullets) {
      const items: string[] = [];
      let current = '';
      for (const line of lines) {
        const t = line.trim();
        if (t.startsWith('- ') || t.startsWith('* ')) {
          if (current) items.push(current.trim());
          current = t.replace(/^[-*]\s+/, '');
        } else if (t && current) {
          current += ' ' + t;
        } else if (!t && current) {
          items.push(current.trim());
          current = '';
        }
      }
      if (current) items.push(current.trim());

      return (
        <ul key={blockIdx} className="list-none flex flex-col gap-2.5 my-2 pl-1">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2.5 items-start">
              <span className="text-primary mt-[3px] shrink-0 text-[14px]">▸</span>
              <span className="font-body-md text-on-surface leading-relaxed">{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
    }

    // Numbered list
    const hasNumbered = lines.some(l => /^\d+\.\s/.test(l.trim()));
    if (hasNumbered) {
      const items: string[] = [];
      let current = '';
      for (const line of lines) {
        const t = line.trim();
        if (/^\d+\.\s/.test(t)) {
          if (current) items.push(current.trim());
          current = t.replace(/^\d+\.\s+/, '');
        } else if (t && current) {
          current += ' ' + t;
        }
      }
      if (current) items.push(current.trim());

      return (
        <ol key={blockIdx} className="flex flex-col gap-2.5 my-2 pl-1">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2.5 items-start">
              <span className="text-primary font-code-sm font-semibold shrink-0 min-w-[20px]">{i + 1}.</span>
              <span className="font-body-md text-on-surface leading-relaxed">{renderInline(item)}</span>
            </li>
          ))}
        </ol>
      );
    }

    // [CONFIRMED] / [INFERRED] tags
    const tagMatch = trimmed.match(/^\[(CONFIRMED|INFERRED|UNKNOWN)\](.*)$/i);
    if (tagMatch) {
      const tag = tagMatch[1].toUpperCase();
      const rest = tagMatch[2].trim();
      const tagColor = tag === 'CONFIRMED'
        ? 'text-confirmed-emerald border-confirmed-emerald/40 bg-confirmed-emerald/10'
        : tag === 'INFERRED'
        ? 'text-inferred-amber border-inferred-amber/40 bg-inferred-amber/10'
        : 'text-unknown-rose border-unknown-rose/40 bg-unknown-rose/10';
      return (
        <p key={blockIdx} className="flex items-baseline gap-2 font-body-md text-on-surface leading-relaxed">
          <span className={`font-code-sm font-bold text-[11px] px-1.5 py-0.5 border rounded shrink-0 ${tagColor}`}>{tag}</span>
          <span>{renderInline(rest)}</span>
        </p>
      );
    }

    // Regular paragraph
    return (
      <p key={blockIdx} className="font-body-md text-on-surface leading-[1.8] tracking-[0.01em]">
        {renderInline(trimmed.replace(/\n/g, ' '))}
      </p>
    );
  });
}

function renderInline(text: string): React.ReactNode {
  // Match: ***bold-italic***, **bold**, *italic*, `code`, [label](url)
  const parts = text.split(/(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, idx) => {
    if (part.startsWith('***') && part.endsWith('***')) {
      return <strong key={idx} className="text-on-surface font-bold italic">{part.slice(3, -3)}</strong>;
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx} className="text-on-surface font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={idx} className="text-on-surface-variant italic">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return <code key={idx} className="font-code-sm bg-surface-container-highest px-1.5 py-0.5 rounded text-primary text-[12px]">{part.slice(1, -1)}</code>;
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={idx}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 bg-primary/15 hover:bg-primary text-primary hover:text-on-primary font-code-sm font-semibold px-2 py-0.5 rounded-md border border-primary/40 hover:border-primary transition-all text-[12px] align-middle no-underline mx-0.5"
        >
          <span>{linkMatch[1]}</span>
          <span className="material-symbols-outlined text-[11px]">open_in_new</span>
        </a>
      );
    }
    return part;
  });
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, onExportADR }) => {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end w-full">
        <div className="bg-surface-container px-5 py-3.5 rounded-2xl max-w-[85%] text-on-surface font-body-lg leading-relaxed shadow-sm">
          {message.mode === 'graveyard' && (
            <span className="bg-unknown-rose/10 text-unknown-rose border border-unknown-rose/30 px-2 py-0.5 rounded-full font-label-caps text-[10px] mr-2">
              ⚰️ Graveyard
            </span>
          )}
          {message.content}
        </div>
      </div>
    );
  }

  if (message.role === 'error') {
    return (
      <div className="flex gap-4 w-full">
        <div className="flex-shrink-0 mt-1">
          <div className="w-8 h-8 rounded-full bg-unknown-rose/20 flex items-center justify-center border border-unknown-rose/30">
            <span className="material-symbols-outlined text-unknown-rose text-[18px]">error</span>
          </div>
        </div>
        <div className="font-body-md text-unknown-rose py-3">{message.content}</div>
      </div>
    );
  }

  const data = message.data;
  if (!data) return null;

  return (
    <div className="flex gap-4 w-full">
      <div className="flex-shrink-0 mt-1">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
          <span className="material-symbols-outlined text-primary text-[18px]">smart_toy</span>
        </div>
      </div>

      <div className="flex flex-col gap-5 max-w-full flex-1">
        <div className="font-body-lg text-on-surface space-y-3 leading-relaxed">
          {renderFormattedText(data.answer)}
        </div>

        {/* Citations and Confidence Box */}
        {((data.citations && data.citations.length > 0) ||
          data.confidence_breakdown) && (
          <div className="mt-2 bg-surface-container-lowest rounded-xl border border-outline-variant p-4 flex flex-col gap-4">
            {data.confidence_breakdown && (
              <ConfidenceMatrix breakdown={data.confidence_breakdown} />
            )}

            {data.citations && data.citations.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="font-label-caps text-on-surface-variant tracking-wider uppercase text-[11px]">
                  Evidence Sources ({data.citations.length})
                </span>
                <div className="flex flex-col gap-2.5">
                  {data.citations.map((citation, index) => (
                    <CitationProofCard key={index} citation={citation} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        <div className="flex gap-2 pt-1 border-t border-outline-variant">
          <button
            onClick={() =>
              onExportADR(
                message.question || 'Engineering Decision',
                data.answer,
                data.citations || [],
                data.confidence_summary
              )
            }
            className="flex items-center gap-1.5 text-on-surface-variant hover:text-on-surface border border-outline-variant hover:border-primary/50 px-3 py-1.5 rounded-lg font-body-md transition-colors text-[13px] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[14px] text-primary">download</span>
            <span>Export ADR</span>
          </button>
        </div>
      </div>
    </div>
  );
};
