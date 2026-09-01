import React, { useState } from 'react';
import { api } from '../../api/client';
import type { TimelineEvent } from '../../types/api';

interface TimelineViewProps {
  selectedRepo: string;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ selectedRepo }) => {
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (searchTopic?: string) => {
    const t = (searchTopic || topic).trim();
    if (!t || isLoading) return;

    setIsLoading(true);
    setHasSearched(true);

    try {
      const res = await api.timeline(t, selectedRepo || undefined, 20);
      setEvents(res.events || []);
    } catch (e: any) {
      alert('Timeline failed: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Group events by year
  const groups: Record<string, TimelineEvent[]> = {};
  events.forEach((ev) => {
    const yr =
      ev.source_date && ev.source_date.length >= 4
        ? ev.source_date.substring(0, 4)
        : 'Historical Evolution';
    if (!groups[yr]) groups[yr] = [];
    groups[yr].push(ev);
  });

  return (
    <div className="flex-1 h-screen overflow-y-auto p-6 md:p-8">
      <div className="max-w-4xl mx-auto w-full flex flex-col gap-6 pb-20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-primary text-[22px]">history</span>
            <span className="font-label-caps text-[11px] text-primary uppercase tracking-wider">
              Temporal Lineage
            </span>
          </div>
          <h1 className="font-headline-md text-on-surface mb-2">How Did This Decision Evolve?</h1>
          <p className="font-body-lg text-on-surface-variant">
            Trace the genesis, modifications, and reversals of architectural components across
            historical PRs and issues.
          </p>
        </div>

        {/* Search Card */}
        <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-6 shadow-xl flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Enter topic: e.g. hooks, reconciler, state management, context"
                className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-3 font-body-md text-on-surface placeholder-on-surface-variant/40 focus:border-primary/60 outline-none transition-colors"
              />
            </div>
            <button
              onClick={() => handleSearch()}
              disabled={!topic.trim() || isLoading}
              className="bg-primary text-on-primary font-body-md font-semibold px-6 py-3 rounded-xl hover:bg-primary-fixed transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                  <span>Building timeline…</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">timeline</span>
                  <span>Build Timeline</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-label-caps text-[11px] text-on-surface-variant uppercase">
              Quick topics:
            </span>
            <button
              onClick={() => {
                setTopic('hooks');
                handleSearch('hooks');
              }}
              className="bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface-variant hover:text-on-surface px-3 py-1 rounded-full text-[12px] font-code-sm transition-colors cursor-pointer"
            >
              React Hooks
            </button>
            <button
              onClick={() => {
                setTopic('fiber reconciler');
                handleSearch('fiber reconciler');
              }}
              className="bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface-variant hover:text-on-surface px-3 py-1 rounded-full text-[12px] font-code-sm transition-colors cursor-pointer"
            >
              Fiber Reconciler
            </button>
            <button
              onClick={() => {
                setTopic('state management');
                handleSearch('state management');
              }}
              className="bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface-variant hover:text-on-surface px-3 py-1 rounded-full text-[12px] font-code-sm transition-colors cursor-pointer"
            >
              State Models
            </button>
          </div>
        </div>

        {/* Timeline Results */}
        {hasSearched && (
          <div className="flex flex-col gap-8">
            <div className="flex justify-between items-center border-b border-outline-variant pb-3">
              <h2 className="font-headline-sm text-on-surface">Timeline: "{topic}"</h2>
              <span className="font-code-sm text-primary text-[12px] bg-surface-container px-3 py-1 rounded-full border border-outline-variant">
                {events.length} historical events
              </span>
            </div>

            {events.length === 0 ? (
              <div className="text-on-surface-variant font-body-md pl-4">
                No chronological decisions found for this query.
              </div>
            ) : (
              <div className="flex flex-col gap-8 relative before:absolute before:left-[17px] before:top-4 before:bottom-4 before:w-[2px] before:bg-outline-variant">
                {Object.keys(groups)
                  .sort()
                  .map((year) => (
                    <div key={year} className="flex flex-col gap-4 relative">
                      <div className="flex items-center gap-3 pl-10">
                        <span className="font-headline-sm text-primary font-bold">{year}</span>
                        <div className="h-[1px] flex-1 bg-outline-variant/60" />
                      </div>

                      <div className="flex flex-col gap-4">
                        {groups[year].map((ev, i) => (
                          <div key={i} className="flex items-start gap-4 group pl-2">
                            <div className="w-8 h-8 rounded-full border-primary bg-primary/20 text-primary border flex items-center justify-center shrink-0 z-10 bg-background shadow-md">
                              <span className="material-symbols-outlined text-[16px]">
                                {ev.source_type === 'pr' ? 'merge_type' : 'task_alt'}
                              </span>
                            </div>

                            <div className="flex-1 bg-surface-container-low border border-outline-variant rounded-2xl p-5 hover:border-outline transition-colors shadow-lg">
                              <div className="flex justify-between items-start gap-3 mb-2">
                                <span className="font-body-md font-semibold text-on-surface text-[16px]">
                                  {ev.title}
                                </span>
                                <a
                                  href={ev.source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 font-code-sm text-[12px] whitespace-nowrap"
                                >
                                  <span>View Source</span>
                                  <span className="material-symbols-outlined text-[14px]">
                                    open_in_new
                                  </span>
                                </a>
                              </div>
                              <p className="font-body-md text-on-surface-variant text-[14px] leading-relaxed">
                                {ev.decision_summary || 'Decision logged in source thread.'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
