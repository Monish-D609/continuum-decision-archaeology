import React, { useState } from 'react';
import type { ChatSession } from '../../types/api';

interface SidebarProps {
  activeView: 'chat' | 'blame' | 'timeline' | 'radar';
  onSelectView: (view: 'chat' | 'blame' | 'timeline' | 'radar') => void;
  onNewAudit: () => void;
  health: { status: string; recordCount: number; message: string } | null;
  onSelectPreset: (query: string, mode?: 'query' | 'graveyard') => void;
  sessions: ChatSession[];
  onLoadSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onSelectView,
  onNewAudit,
  health,
  onSelectPreset,
  sessions,
  onLoadSession,
  onDeleteSession,
}) => {
  const [historyOpen, setHistoryOpen] = useState(true);
  const [hoveredSession, setHoveredSession] = useState<string | null>(null);

  return (
    <nav className="hidden md:flex flex-col h-screen fixed left-0 top-0 w-64 bg-surface-container-lowest border-r border-outline-variant z-40">
      {/* Brand */}
      <div className="px-6 py-5 flex items-center gap-3">
        <span
          className="material-symbols-outlined text-primary text-[28px]"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          hub
        </span>
        <div className="flex flex-col">
          <span className="font-headline-sm text-on-surface font-bold leading-tight">Continuum</span>
          <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">
            Decision Archaeology
          </span>
        </div>
      </div>

      {/* New Audit Button */}
      <div className="px-4 mb-6">
        <button
          onClick={onNewAudit}
          className="w-full bg-transparent border border-outline-variant hover:bg-surface-container-high text-on-surface transition-colors py-2 px-3 rounded-lg flex items-center gap-2 justify-start font-body-md cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>New Audit</span>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-3 flex flex-col gap-6">
        {/* Tools */}
        <div>
          <div className="px-3 mb-2 font-label-caps text-on-surface-variant/70 uppercase tracking-wider text-[11px]">
            Tools
          </div>
          <div className="flex flex-col gap-1">
            {[
              { view: 'chat' as const, icon: 'chat', label: 'Decision Chat' },
              { view: 'blame' as const, icon: 'manage_search', label: 'Blame-to-Why' },
              { view: 'timeline' as const, icon: 'history', label: 'Temporal Timeline' },
              { view: 'radar' as const, icon: 'radar', label: 'Drift Radar' },
            ].map(({ view, icon, label }) => (
              <button
                key={view}
                onClick={() => onSelectView(view)}
                className={`w-full px-3 py-2 rounded-lg flex items-center gap-3 transition-colors text-left cursor-pointer ${
                  activeView === view
                    ? 'bg-surface-container-highest text-primary font-medium'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                }`}
              >
                <span
                  className="material-symbols-outlined text-[18px]"
                  style={activeView === view ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {icon}
                </span>
                <span className="font-body-md">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Sessions */}
        <div>
          <button
            onClick={() => setHistoryOpen((o) => !o)}
            className="w-full px-3 mb-2 flex items-center justify-between group cursor-pointer"
          >
            <span className="font-label-caps text-on-surface-variant/70 uppercase tracking-wider text-[11px]">
              Recent Sessions
            </span>
            <span
              className={`material-symbols-outlined text-[14px] text-on-surface-variant/50 transition-transform ${historyOpen ? '' : '-rotate-90'}`}
            >
              expand_more
            </span>
          </button>

          {historyOpen && (
            <div className="flex flex-col gap-0.5">
              {sessions.length === 0 && (
                <p className="px-3 py-2 text-[12px] text-on-surface-variant/50 italic">
                  No sessions yet. Start a chat!
                </p>
              )}
              {sessions.slice(0, 20).map((s) => (
                <div
                  key={s.id}
                  className="relative flex items-center group rounded-lg hover:bg-surface-container-high transition-colors"
                  onMouseEnter={() => setHoveredSession(s.id)}
                  onMouseLeave={() => setHoveredSession(null)}
                >
                  <button
                    onClick={() => onLoadSession(s.id)}
                    className="flex-1 min-w-0 px-3 py-2 text-left cursor-pointer"
                  >
                    <p className="font-body-md text-on-surface-variant group-hover:text-on-surface text-[13px] truncate leading-snug">
                      {s.title || 'Untitled session'}
                    </p>
                    <p className="font-code-sm text-on-surface-variant/50 text-[10px] mt-0.5">
                      {timeAgo(s.updated_at)}
                    </p>
                  </button>

                  {hoveredSession === s.id && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteSession(s.id); }}
                      className="shrink-0 mr-2 p-1 rounded hover:bg-unknown-rose/20 text-on-surface-variant/40 hover:text-unknown-rose transition-colors cursor-pointer"
                      title="Delete session"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Verified Audits */}
        <div>
          <div className="px-3 mb-2 font-label-caps text-on-surface-variant/70 uppercase tracking-wider text-[11px]">
            Verified Audits
          </div>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => { onSelectView('chat'); onSelectPreset('Why were React Hooks introduced instead of keeping class components?'); }}
              className="text-left text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors duration-200 rounded-lg px-3 py-2 flex items-center gap-3 group cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] opacity-70 group-hover:opacity-100">lightbulb</span>
              <span className="font-body-md truncate">React Hooks Genesis</span>
            </button>
            <button
              onClick={() => { onSelectView('chat'); onSelectPreset('Why was the fiber architecture chosen for React reconciliation?'); }}
              className="text-left text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors duration-200 rounded-lg px-3 py-2 flex items-center gap-3 group cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] opacity-70 group-hover:opacity-100">account_tree</span>
              <span className="font-body-md truncate">Fiber Architecture</span>
            </button>
            <button
              onClick={() => { onSelectView('chat'); onSelectPreset('What state management approaches were rejected?', 'graveyard'); }}
              className="text-left text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors duration-200 rounded-lg px-3 py-2 flex items-center gap-3 group cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-unknown-rose opacity-80 group-hover:opacity-100">skull</span>
              <span className="font-body-md truncate text-unknown-rose/90">Rejected State Models</span>
            </button>
          </div>
        </div>
      </div>

      {/* Health Beacon */}
      <div className="p-3 border-t border-outline-variant flex flex-col gap-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/30">
          <span
            className={`w-2 h-2 rounded-full ${
              health?.status === 'healthy'
                ? 'bg-confirmed-emerald'
                : health?.status === 'degraded'
                ? 'bg-inferred-amber animate-pulse'
                : 'bg-unknown-rose'
            }`}
          />
          <span className="font-code-sm text-on-surface-variant text-[11px]">
            {health?.status === 'healthy'
              ? `${health.recordCount} decisions indexed`
              : health?.status === 'degraded'
              ? 'Degraded'
              : 'Connecting…'}
          </span>
        </div>
      </div>
    </nav>
  );
};
