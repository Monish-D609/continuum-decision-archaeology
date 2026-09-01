import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LoadingScreen } from './components/layout/LoadingScreen';
import { DecisionChat } from './components/chat/DecisionChat';
import { BlameInspector } from './components/blame/BlameInspector';
import { TimelineView } from './components/timeline/TimelineView';
import { DriftRadarView } from './components/radar/DriftRadarView';
import { api } from './api/client';
import type { ChatSession, ChatSessionDetail } from './types/api';

export const App: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeView, setActiveView] = useState<'chat' | 'blame' | 'timeline' | 'radar'>('chat');
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [health, setHealth] = useState<{ status: string; recordCount: number; message: string } | null>(null);
  const [presetQuery, setPresetQuery] = useState<{ text: string; mode?: 'query' | 'graveyard' } | null>(null);

  // Chat history state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loadSession, setLoadSession] = useState<ChatSessionDetail | null>(null);
  const [chatKey, setChatKey] = useState(0);
  const [sessionLoading, setSessionLoading] = useState<string | null>(null); // sessionId being loaded

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await api.checkHealth();
        setHealth({ status: res.status, recordCount: res.record_count, message: res.message });
      } catch {
        setHealth({ status: 'offline', recordCount: 0, message: 'Server offline' });
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load session list on mount
  useEffect(() => {
    api.listSessions().then((r) => setSessions(r.sessions)).catch(() => {});
  }, []);

  const handleNewAudit = () => {
    setActiveView('chat');
    setPresetQuery(null);
    setLoadSession(null);
    setChatKey((k) => k + 1); // remount DecisionChat → clears messages + sessionId
  };

  const handleSelectPreset = (query: string, mode?: 'query' | 'graveyard') => {
    setActiveView('chat');
    setPresetQuery({ text: query, mode });
    setLoadSession(null);
  };

  const handleLoadSession = async (sessionId: string) => {
    setSessionLoading(sessionId);
    try {
      const detail = await api.getSession(sessionId);
      // Increment key so DecisionChat fully remounts with the loaded session
      setChatKey((k) => k + 1);
      setLoadSession(detail);
      setActiveView('chat');
    } catch {
      alert('Could not load session — please try again.');
    } finally {
      setSessionLoading(null);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await api.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (loadSession?.id === sessionId) setLoadSession(null);
    } catch {}
  };

  const handleSessionCreated = (sessionId: string, title: string) => {
    const newSession: ChatSession = {
      id: sessionId,
      title,
      repo_url: selectedRepo || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setSessions((prev) => [newSession, ...prev]);
  };

  return (
    <div className="font-body-md text-body-md overflow-hidden flex h-screen w-full bg-background">
      {!isLoaded && <LoadingScreen onComplete={() => setIsLoaded(true)} />}

      <Sidebar
        activeView={activeView}
        onSelectView={setActiveView}
        onNewAudit={handleNewAudit}
        health={health}
        onSelectPreset={handleSelectPreset}
        sessions={sessions}
        onLoadSession={handleLoadSession}
        onDeleteSession={handleDeleteSession}
        sessionLoading={sessionLoading}
      />

      <main className="flex-1 md:ml-64 h-screen flex flex-col relative bg-background overflow-hidden">
        <Header selectedRepo={selectedRepo} onSelectRepo={setSelectedRepo} />

        <div className="flex-1 flex flex-col relative overflow-hidden">
          {activeView === 'chat' && (
            <DecisionChat
              key={chatKey}
              selectedRepo={selectedRepo}
              externalQuery={presetQuery}
              onClearExternalQuery={() => setPresetQuery(null)}
              health={health}
              loadSession={loadSession}
              onSessionCreated={handleSessionCreated}
            />
          )}
          {activeView === 'blame' && <BlameInspector selectedRepo={selectedRepo} />}
          {activeView === 'timeline' && <TimelineView selectedRepo={selectedRepo} />}
          {activeView === 'radar' && <DriftRadarView selectedRepo={selectedRepo} />}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface-container-lowest border-t border-outline-variant flex justify-around items-center z-50">
        {(['chat', 'blame', 'timeline', 'radar'] as const).map((view) => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className={`flex flex-col items-center gap-1 ${activeView === view ? 'text-primary' : 'text-on-surface-variant'}`}
          >
            <span className="material-symbols-outlined" style={activeView === view ? { fontVariationSettings: "'FILL' 1" } : {}}>
              {view === 'chat' ? 'chat' : view === 'blame' ? 'manage_search' : view === 'timeline' ? 'history' : 'radar'}
            </span>
            <span className="font-body-md text-[10px] capitalize">{view}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};
