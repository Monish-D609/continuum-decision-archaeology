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
  // Simple markdown renderer for bold, code, and links
  const lines = text.split('\n');
  return lines.map((line, lineIdx) => {
    // Check for bold **text**
    const parts = line.split(/(\*\*.*?\*\*|`.*?`|\[.*?\]\(.*?\))/g);
    return (
      <p key={lineIdx} className="mb-2 last:mb-0">
        {parts.map((part, partIdx) => {
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
          const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
          if (linkMatch) {
            return (
              <a
                key={partIdx}
                href={linkMatch[2]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:text-primary-fixed"
              >
                {linkMatch[1]}
              </a>
            );
          }
          return part;
        })}
      </p>
    );
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
