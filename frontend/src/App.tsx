import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DecisionChat } from './components/chat/DecisionChat';
import { BlameInspector } from './components/blame/BlameInspector';
import { TimelineView } from './components/timeline/TimelineView';
import { DriftRadarView } from './components/radar/DriftRadarView';
import { api } from './api/client';

export const App: React.FC = () => {
  const [activeView, setActiveView] = useState<'chat' | 'blame' | 'timeline' | 'radar'>('chat');
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [health, setHealth] = useState<{ status: string; recordCount: number; message: string } | null>(
    null
  );
  const [presetQuery, setPresetQuery] = useState<{ text: string; mode?: 'query' | 'graveyard' } | null>(
    null
  );

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await api.checkHealth();
        setHealth({
          status: res.status,
          recordCount: res.record_count,
          message: res.message,
        });
      } catch {
        setHealth({ status: 'offline', recordCount: 0, message: 'Server offline' });
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleNewAudit = () => {
    setActiveView('chat');
    setPresetQuery(null);
  };

  const handleSelectPreset = (query: string, mode?: 'query' | 'graveyard') => {
    setActiveView('chat');
    setPresetQuery({ text: query, mode });
  };

  return (
    <div className="font-body-md text-body-md overflow-hidden flex h-screen w-full bg-background">
      {/* Sidebar */}
      <Sidebar
        activeView={activeView}
        onSelectView={setActiveView}
        onNewAudit={handleNewAudit}
        health={health}
        onSelectPreset={handleSelectPreset}
      />

      {/* Main Area */}
      <main className="flex-1 md:ml-64 h-screen flex flex-col relative bg-background overflow-hidden">
        {/* Top Header */}
        <Header selectedRepo={selectedRepo} onSelectRepo={setSelectedRepo} />

        {/* Dynamic Viewport */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {activeView === 'chat' && (
            <DecisionChat
              selectedRepo={selectedRepo}
              externalQuery={presetQuery}
              onClearExternalQuery={() => setPresetQuery(null)}
              health={health}
            />
          )}

          {activeView === 'blame' && <BlameInspector selectedRepo={selectedRepo} />}

          {activeView === 'timeline' && <TimelineView selectedRepo={selectedRepo} />}

          {activeView === 'radar' && <DriftRadarView selectedRepo={selectedRepo} />}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface-container-lowest border-t border-outline-variant flex justify-around items-center z-50">
        <button
          onClick={() => setActiveView('chat')}
          className={`flex flex-col items-center gap-1 ${
            activeView === 'chat' ? 'text-primary' : 'text-on-surface-variant'
          }`}
        >
          <span
            className="material-symbols-outlined"
            style={activeView === 'chat' ? { fontVariationSettings: "'FILL' 1" } : {}}
          >
            chat
          </span>
          <span className="font-body-md text-[10px]">Chat</span>
        </button>

        <button
          onClick={() => setActiveView('blame')}
          className={`flex flex-col items-center gap-1 ${
            activeView === 'blame' ? 'text-primary' : 'text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined">manage_search</span>
          <span className="font-body-md text-[10px]">Blame</span>
        </button>

        <button
          onClick={() => setActiveView('timeline')}
          className={`flex flex-col items-center gap-1 ${
            activeView === 'timeline' ? 'text-primary' : 'text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined">history</span>
          <span className="font-body-md text-[10px]">Timeline</span>
        </button>

        <button
          onClick={() => setActiveView('radar')}
          className={`flex flex-col items-center gap-1 ${
            activeView === 'radar' ? 'text-primary' : 'text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined">radar</span>
          <span className="font-body-md text-[10px]">Radar</span>
        </button>
      </nav>
    </div>
  );
};
