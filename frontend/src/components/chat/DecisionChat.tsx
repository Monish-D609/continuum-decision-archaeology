import React, { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../../api/client';
import type { Citation, ChatSessionDetail } from '../../types/api';
import { MessageItem, type ChatMessage } from './MessageItem';
import { MemoryOverview } from '../overview/MemoryOverview';

interface DecisionChatProps {
  selectedRepo: string;
  externalQuery?: { text: string; mode?: 'query' | 'graveyard' } | null;
  onClearExternalQuery?: () => void;
  health: { status: string; recordCount: number; message: string } | null;
  loadSession?: ChatSessionDetail | null;
  onSessionCreated?: (sessionId: string, title: string) => void;
}

export const DecisionChat: React.FC<DecisionChatProps> = ({
  selectedRepo,
  externalQuery,
  onClearExternalQuery,
  health,
  loadSession,
  onSessionCreated,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'query' | 'graveyard'>('query');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load a saved session when directed from the sidebar
  useEffect(() => {
    if (!loadSession) return;
    setSessionId(loadSession.id);
    const restored: ChatMessage[] = loadSession.messages.map((m) => {
      if (m.role === 'user') {
        return { id: m.id, role: 'user' as const, content: m.content, mode: (m.mode as 'query' | 'graveyard') || 'query' };
      }
      return {
        id: m.id,
        role: 'assistant' as const,
        question: '',
        mode: (m.mode as 'query' | 'graveyard') || 'query',
        data: {
          answer: m.content,
          citations: m.citations || [],
          confidence_summary: (m.confidence_summary as any) || 'partial_evidence',
          confidence_breakdown: { confirmed: 0, inferred: 0, unknown: 0 },
          decision_records_used: [],
          is_insufficient_evidence: m.is_insufficient_evidence,
        },
      };
    });
    setMessages(restored);
  }, [loadSession]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (externalQuery) {
      if (externalQuery.mode) setMode(externalQuery.mode);
      handleSend(externalQuery.text, externalQuery.mode || mode);
      if (onClearExternalQuery) onClearExternalQuery();
    }
  }, [externalQuery]);

  const handleSend = async (queryText?: string, queryMode?: 'query' | 'graveyard') => {
    const textToSend = (queryText || input).trim();
    const activeMode = queryMode || mode;
    if (!textToSend || isLoading) return;

    setInput('');
    setIsLoading(true);

    // Auto-create session on first message
    let activeSessionId = sessionId;
    if (!activeSessionId) {
      try {
        const sess = await api.createSession(textToSend.slice(0, 80), selectedRepo || undefined);
        activeSessionId = sess.id;
        setSessionId(sess.id);
        onSessionCreated?.(sess.id, textToSend.slice(0, 80));
      } catch {
        // Non-fatal — continue without persistence
      }
    }

    const userMessage: ChatMessage = {
      id: String(Date.now()),
      role: 'user',
      content: textToSend,
      mode: activeMode,
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      const response =
        activeMode === 'graveyard'
          ? await api.graveyard(textToSend, selectedRepo, activeSessionId ?? undefined)
          : await api.query(textToSend, selectedRepo, activeSessionId ?? undefined);

      const assistantMessage: ChatMessage = {
        id: String(Date.now() + 1),
        role: 'assistant',
        data: response,
        question: textToSend,
        mode: activeMode,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: String(Date.now() + 1),
        role: 'error',
        content: err.message || 'Failed to retrieve archaeological decision records.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleExportADR = async (
    question: string,
    answer: string,
    citations: Citation[],
    confidence: string
  ) => {
    try {
      const res = await api.exportADR(question, answer, citations, confidence);
      const blob = new Blob([res.content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert('ADR Export failed: ' + e.message);
    }
  };

  // ── Engineering Memory Overview (replaces empty chatbot state) ──
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col relative h-full overflow-hidden">
        <MemoryOverview
          selectedRepo={selectedRepo}
          health={health}
          onSelectPreset={(q, m) => {
            if (m) setMode(m);
            handleSend(q, m || mode);
          }}
          onOpenChat={() => {
            if (textareaRef.current) textareaRef.current.focus();
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col relative h-full overflow-hidden">
      {/* Messages Viewport */}
      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-40">
          <div className="text-center max-w-xl">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6 shadow-glow">
              <span
                className="material-symbols-outlined text-primary text-[32px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                travel_explore
              </span>
            </div>

            <h1 className="font-headline-md text-on-surface mb-3">
              {mode === 'graveyard' ? '⚰️ The Graveyard' : 'Decision Archaeology'}
            </h1>

            <p className="font-body-lg text-on-surface-variant mb-8">
              {mode === 'graveyard'
                ? 'Explore architectural approaches that were explicitly rejected. Learn what NOT to do before you re-introduce it.'
                : 'Ask the why behind any engineering decision. Every answer is citation-grounded with direct PR links — zero hallucination.'}
            </p>

            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() =>
                  handleSend('Why were React Hooks introduced instead of keeping class components?')
                }
                className="bg-surface-container-low hover:bg-surface-container border border-outline-variant px-4 py-2 rounded-full font-body-md text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              >
                💡 Why were Hooks introduced?
              </button>

              <button
                onClick={() => {
                  setMode('graveyard');
                  handleSend('What state management approaches were rejected?', 'graveyard');
                }}
                className="bg-surface-container-low hover:bg-surface-container border border-outline-variant hover:border-unknown-rose/40 px-4 py-2 rounded-full font-body-md text-on-surface-variant hover:text-unknown-rose transition-colors cursor-pointer"
              >
                ⚰️ Rejected state management?
              </button>

              <button
                onClick={() =>
                  handleSend('Why was the fiber architecture chosen for React reconciliation?')
                }
                className="bg-surface-container-low hover:bg-surface-container border border-outline-variant px-4 py-2 rounded-full font-body-md text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              >
                🏗️ Why Fiber architecture?
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 w-full max-w-[820px] mx-auto flex flex-col relative z-10 px-4 pt-2 overflow-y-auto scrollbar-hide pb-[200px]">
          <div className="flex flex-col gap-8 w-full">
            {messages.map((msg) => (
              <MessageItem key={msg.id} message={msg} onExportADR={handleExportADR} />
            ))}

            {isLoading && (
              <div className="flex gap-4 w-full">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                    <span className="material-symbols-outlined text-primary text-[18px]">
                      smart_toy
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 py-4">
                  <span className="w-2 h-2 rounded-full bg-primary loading-dot" />
                  <span className="w-2 h-2 rounded-full bg-primary loading-dot" />
                  <span className="w-2 h-2 rounded-full bg-primary loading-dot" />
                  <span className="font-code-sm text-on-surface-variant ml-2">
                    Searching decision records…
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Sticky Bottom Input Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-background via-background/95 to-transparent pt-10 pb-6 px-4">
        <div className="max-w-[780px] mx-auto flex flex-col gap-3">
          {/* Mode Switcher + Quick Chips */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center bg-surface-container-low p-0.5 rounded-lg border border-outline-variant">
              <button
                onClick={() => setMode('query')}
                className={`px-3 py-1.5 rounded-md font-body-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                  mode === 'query'
                    ? 'bg-surface-container text-on-surface shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[14px] text-primary">
                  lightbulb
                </span>
                <span>Ask Why</span>
              </button>

              <button
                onClick={() => setMode('graveyard')}
                className={`px-3 py-1.5 rounded-md font-body-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                  mode === 'graveyard'
                    ? 'bg-surface-container text-unknown-rose shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">skull</span>
                <span>Graveyard</span>
              </button>
            </div>

            <div className="hidden sm:flex gap-2">
              <button
                onClick={() =>
                  handleSend('Why was CreateClass deprecated in favor of ES6 classes?')
                }
                className="bg-surface-container-low hover:bg-surface-container border border-outline-variant px-3 py-1.5 rounded-full font-body-md text-on-surface-variant hover:text-on-surface transition-colors whitespace-nowrap text-[13px] cursor-pointer"
              >
                CreateClass vs ES6
              </button>
              <button
                onClick={() =>
                  handleSend('Why did React switch from stack reconciler to fiber reconciler?')
                }
                className="bg-surface-container-low hover:bg-surface-container border border-outline-variant px-3 py-1.5 rounded-full font-body-md text-on-surface-variant hover:text-on-surface transition-colors whitespace-nowrap text-[13px] cursor-pointer"
              >
                Stack vs Fiber
              </button>
            </div>
          </div>

          {/* Textarea Input */}
          <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-2 flex items-end gap-2 focus-within:border-primary/60 transition-colors shadow-xl">
            <button
              onClick={() => textareaRef.current?.focus()}
              className="text-on-surface-variant hover:text-on-surface p-2 rounded-xl transition-colors shrink-0 mb-1"
              title="Attach Context"
            >
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
            </button>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = '';
                e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                mode === 'graveyard'
                  ? 'Search rejected approaches and anti-patterns…'
                  : 'Unearth decisions…'
              }
              rows={1}
              style={{ minHeight: '44px' }}
              className="w-full bg-transparent border-none text-on-surface font-body-lg placeholder-on-surface-variant/50 focus:ring-0 resize-none max-h-[200px] py-3 px-1 outline-none"
            />

            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="bg-primary text-on-primary p-2.5 rounded-xl hover:bg-primary-fixed transition-colors shrink-0 mb-1 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-md"
            >
              <span
                className="material-symbols-outlined text-[18px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                arrow_upward
              </span>
            </button>
          </div>

          <div className="text-center font-body-md text-on-surface-variant/50 text-[12px] mt-0.5">
            Continuum grounds every claim with direct PR and issue citations.
          </div>
        </div>
      </div>
    </div>
  );
};
