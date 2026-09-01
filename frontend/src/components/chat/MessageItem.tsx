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

function renderFormattedText(text: string): React.ReactNode {
  const paragraphs = text.split(/\n{2,}/);

  return paragraphs.map((block, blockIdx) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    // H2 header
    if (trimmed.startsWith('## ')) {
      return (
        <h3 key={blockIdx} className="font-headline-sm text-on-surface font-semibold mt-4 mb-2 text-[17px]">
          {trimmed.slice(3)}
        </h3>
      );
    }
    // H3 header (Archaeological Sections)
    if (trimmed.startsWith('### ')) {
      const title = trimmed.slice(4);
      let badgeStyle = "text-primary bg-primary/10 border-primary/20";
      if (title.includes('⚰️') || title.toLowerCase().includes('graveyard')) {
        badgeStyle = "text-unknown-rose bg-unknown-rose/10 border-unknown-rose/30";
      } else if (title.includes('📜') || title.toLowerCase().includes('decision')) {
        badgeStyle = "text-confirmed-emerald bg-confirmed-emerald/10 border-confirmed-emerald/30";
      } else if (title.includes('🧬') || title.toLowerCase().includes('drift')) {
        badgeStyle = "text-inferred-amber bg-inferred-amber/10 border-inferred-amber/30";
      } else if (title.includes('🏛️') || title.toLowerCase().includes('context')) {
        badgeStyle = "text-primary bg-primary/10 border-primary/20";
      }

      return (
        <div key={blockIdx} className="mt-5 mb-2.5">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border font-label-caps text-[12px] font-semibold tracking-wide ${badgeStyle}`}>
            {title}
          </div>
        </div>
      );
    }

    // Bullet list block
    const bulletLines = trimmed.split('\n').filter(l => l.trim().startsWith('- ') || l.trim().startsWith('* '));
    const allLines = trimmed.split('\n');
    const allBullets = allLines.every(l => l.trim() === '' || l.trim().startsWith('- ') || l.trim().startsWith('* '));
    if (allBullets && bulletLines.length > 0) {
      return (
        <ul key={blockIdx} className="list-none flex flex-col gap-2 my-2 pl-2">
          {bulletLines.map((line, i) => (
            <li key={i} className="flex gap-2 items-start">
              <span className="text-primary mt-1 shrink-0">▸</span>
              <span className="font-body-md text-on-surface leading-relaxed">{renderInline(line.replace(/^[-*]\s+/, ''))}</span>
            </li>
          ))}
        </ul>
      );
    }

    // Numbered list block
    const numberedLines = allLines.filter(l => /^\d+\.\s/.test(l.trim()));
    const allNumbered = allLines.every(l => l.trim() === '' || /^\d+\.\s/.test(l.trim()));
    if (allNumbered && numberedLines.length > 0) {
      return (
        <ol key={blockIdx} className="flex flex-col gap-2 my-2 pl-2">
          {numberedLines.map((line, i) => (
            <li key={i} className="flex gap-2 items-start">
              <span className="text-primary font-code-sm font-medium shrink-0">{i + 1}.</span>
              <span className="font-body-md text-on-surface leading-relaxed">{renderInline(line.replace(/^\d+\.\s+/, ''))}</span>
            </li>
          ))}
        </ol>
      );
    }

    // Regular paragraph (with inline rendering)
    return (
      <p key={blockIdx} className="font-body-lg text-on-surface leading-relaxed mb-0">
        {renderInline(trimmed.replace(/\n/g, ' '))}
      </p>
    );
  });
}

function renderInline(text: string): React.ReactNode {
  // Split on bold **text**, inline code `text`, and [label](url) links
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, partIdx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={partIdx} className="text-on-surface font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={partIdx}
          className="font-code-sm bg-surface-container-highest px-1.5 py-0.5 rounded text-primary text-[12px]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={partIdx}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:text-primary-fixed transition-colors"
        >
          {linkMatch[1]}
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
