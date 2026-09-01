import React from 'react';

interface SidebarProps {
  activeView: 'chat' | 'blame' | 'timeline' | 'radar';
  onSelectView: (view: 'chat' | 'blame' | 'timeline' | 'radar') => void;
  onNewAudit: () => void;
  health: { status: string; recordCount: number; message: string } | null;
  onSelectPreset: (query: string, mode?: 'query' | 'graveyard') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onSelectView,
  onNewAudit,
  health,
  onSelectPreset,
}) => {
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
          <span className="font-headline-sm text-on-surface font-bold leading-tight">
            Continuum
          </span>
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

      {/* Navigation Scrollable Area */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-3 flex flex-col gap-6">
        {/* Tools */}
        <div>
          <div className="px-3 mb-2 font-label-caps text-on-surface-variant/70 uppercase tracking-wider text-[11px]">
            Tools
          </div>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => onSelectView('chat')}
              className={`w-full px-3 py-2 rounded-lg flex items-center gap-3 transition-colors text-left cursor-pointer ${
                activeView === 'chat'
                  ? 'bg-surface-container-highest text-primary font-medium'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
            >
              <span
                className="material-symbols-outlined text-[18px]"
                style={activeView === 'chat' ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                chat
              </span>
              <span className="font-body-md">Decision Chat</span>
            </button>

            <button
              onClick={() => onSelectView('blame')}
              className={`w-full px-3 py-2 rounded-lg flex items-center gap-3 transition-colors text-left cursor-pointer ${
                activeView === 'blame'
                  ? 'bg-surface-container-highest text-primary font-medium'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
            >
              <span
                className="material-symbols-outlined text-[18px]"
                style={activeView === 'blame' ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                manage_search
              </span>
              <span className="font-body-md">Blame-to-Why</span>
            </button>

            <button
              onClick={() => onSelectView('timeline')}
              className={`w-full px-3 py-2 rounded-lg flex items-center gap-3 transition-colors text-left cursor-pointer ${
                activeView === 'timeline'
                  ? 'bg-surface-container-highest text-primary font-medium'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
            >
              <span
                className="material-symbols-outlined text-[18px]"
                style={activeView === 'timeline' ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                history
              </span>
              <span className="font-body-md">Temporal Timeline</span>
            </button>

            <button
              onClick={() => onSelectView('radar')}
              className={`w-full px-3 py-2 rounded-lg flex items-center gap-3 transition-colors text-left cursor-pointer ${
                activeView === 'radar'
                  ? 'bg-surface-container-highest text-primary font-medium'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
            >
              <span
                className="material-symbols-outlined text-[18px]"
                style={activeView === 'radar' ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                radar
              </span>
              <span className="font-body-md">Drift Radar</span>
            </button>
          </div>
        </div>

        {/* Verified Audits */}
        <div>
          <div className="px-3 mb-2 font-label-caps text-on-surface-variant/70 uppercase tracking-wider text-[11px]">
            Verified Audits
          </div>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => {
                onSelectView('chat');
                onSelectPreset('Why were React Hooks introduced instead of keeping class components?');
              }}
              className="text-left text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors duration-200 rounded-lg px-3 py-2 flex items-center gap-3 group cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] opacity-70 group-hover:opacity-100">
                lightbulb
              </span>
              <span className="font-body-md truncate">React Hooks Genesis</span>
            </button>

            <button
              onClick={() => {
                onSelectView('chat');
                onSelectPreset('Why was the fiber architecture chosen for React reconciliation?');
              }}
              className="text-left text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors duration-200 rounded-lg px-3 py-2 flex items-center gap-3 group cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] opacity-70 group-hover:opacity-100">
                account_tree
              </span>
              <span className="font-body-md truncate">Fiber Architecture</span>
            </button>

            <button
              onClick={() => {
                onSelectView('chat');
                onSelectPreset('What state management approaches were rejected?', 'graveyard');
              }}
              className="text-left text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors duration-200 rounded-lg px-3 py-2 flex items-center gap-3 group cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-unknown-rose opacity-80 group-hover:opacity-100">
                skull
              </span>
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
