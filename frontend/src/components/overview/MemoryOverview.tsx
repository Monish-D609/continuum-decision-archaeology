import React, { useEffect, useState, useRef } from 'react';
import { api } from '../../api/client';
import type { StatsResponse } from '../../types/api';

// ── Seeded investigation history (replaced by real data when backend supports it) ──
// Structured as application data so it can be swapped for real API data later.
const SEEDED_INVESTIGATIONS = [
  {
    id: 'inv-hooks',
    question: 'Why were React Hooks introduced instead of keeping class components?',
    topic: 'State Management',
    sources: 7,
    confidence: 'High' as const,
    age: '2 hours ago',
    mode: 'query' as const,
    icon: '💡',
  },
  {
    id: 'inv-fiber',
    question: 'Why was the Fiber architecture chosen for React reconciliation?',
    topic: 'Architecture',
    sources: 12,
    confidence: 'High' as const,
    age: 'Yesterday',
    mode: 'query' as const,
    icon: '🏗️',
  },
  {
    id: 'inv-graveyard',
    question: 'What state management approaches were tried and rejected?',
    topic: 'State Management',
    sources: 5,
    confidence: 'High' as const,
    age: '2 days ago',
    mode: 'graveyard' as const,
    icon: '⚰️',
  },
  {
    id: 'inv-context',
    question: 'Why was the Context API introduced alongside Redux?',
    topic: 'Architecture',
    sources: 4,
    confidence: 'Medium' as const,
    age: '4 days ago',
    mode: 'query' as const,
    icon: '🔗',
  },
];

const DECISION_LEDGER = [
  { title: 'React Hooks', topic: 'State Management', status: 'Adopted' as const, evidence: 7 },
  { title: 'Flux Architecture', topic: 'State Management', status: 'Replaced' as const, evidence: 5 },
  { title: 'Fiber Reconciler', topic: 'Architecture', status: 'Adopted' as const, evidence: 12 },
  { title: 'Redux (global)', topic: 'State Management', status: 'Adopted' as const, evidence: 9 },
  { title: 'MobX', topic: 'State Management', status: 'Rejected' as const, evidence: 3 },
  { title: 'Context API', topic: 'Architecture', status: 'Adopted' as const, evidence: 4 },
  { title: 'createClass()', topic: 'Component Model', status: 'Deprecated' as const, evidence: 6 },
];

const STATUS_STYLES: Record<string, string> = {
  Adopted: 'text-confirmed-emerald bg-confirmed-emerald/10 border-confirmed-emerald/30',
  Rejected: 'text-unknown-rose bg-unknown-rose/10 border-unknown-rose/30',
  Replaced: 'text-inferred-amber bg-inferred-amber/10 border-inferred-amber/30',
  Deprecated: 'text-on-surface-variant bg-surface-container border-outline-variant',
  'Under Review': 'text-info-sky bg-info-sky/10 border-info-sky/30',
};

interface MemoryOverviewProps {
  selectedRepo: string;
  health: { status: string; recordCount: number; message: string } | null;
  onSelectPreset: (query: string, mode?: 'query' | 'graveyard') => void;
  onOpenChat: () => void;
}

function timeAgo(isoString: string | null): string {
  if (!isoString) return 'Just now';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export const MemoryOverview: React.FC<MemoryOverviewProps> = ({
  selectedRepo,
  health,
  onSelectPreset,
  onOpenChat,
}) => {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const [quickQuery, setQuickQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const s = await api.fetchStats();
        setStats(s);
      } catch {
        // Stats unavailable — UI degrades gracefully with skeleton values
      } finally {
        setStatsLoading(false);
      }
    };
    load();
  }, [selectedRepo]);

  const totalDecisions = stats?.total_decisions ?? health?.recordCount ?? 0;
  const rejectedCount = stats?.rejected_count ?? 0;
  const prCount = stats?.pr_count ?? 0;
  const issueCount = stats?.issue_count ?? 0;
  const coverage = stats?.knowledge_coverage_pct ?? 0;
  const syncedAt = stats?.last_indexed_at ?? null;

  const activeRepo = selectedRepo
    ? stats?.repositories.find((r) => r.repo === selectedRepo) || null
    : null;

  const displayRepo = selectedRepo || (stats?.repositories[0]?.repo ?? 'facebook/react');

  const handleQuickSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickQuery.trim()) {
      onSelectPreset(quickQuery.trim());
    }
  };

  // Stat pill component
  const StatPill: React.FC<{
    icon: string;
    value: number | string;
    label: string;
    color?: string;
    skeleton?: boolean;
  }> = ({ icon, value, label, color = 'text-on-surface', skeleton }) => (
    <div className="flex flex-col gap-1 bg-surface-container border border-outline-variant rounded-xl px-4 py-3 min-w-[100px]">
      <div className="flex items-center gap-1.5">
        <span className="material-symbols-outlined text-[16px] text-on-surface-variant">{icon}</span>
        {skeleton ? (
          <span className="w-10 h-4 rounded bg-surface-container-highest animate-pulse inline-block" />
        ) : (
          <span className={`font-headline-sm font-bold text-[22px] ${color}`}>{value}</span>
        )}
      </div>
      <span className="font-label-caps text-on-surface-variant text-[11px] uppercase tracking-wider">{label}</span>
    </div>
  );

  return (
    <div className="flex-1 h-full overflow-y-auto scrollbar-hide">
      <div className="max-w-[900px] mx-auto px-5 pt-4 pb-40 flex flex-col gap-7">

        {/* ── Engineering Memory Header ──────────────────────────────── */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-label-caps text-[10px] text-on-surface-variant/60 uppercase tracking-widest">
                Engineering Memory
              </span>
              <span className={`w-1.5 h-1.5 rounded-full ${health?.status === 'healthy' ? 'bg-confirmed-emerald' : 'bg-inferred-amber animate-pulse'}`} />
              <span className="font-code-sm text-on-surface-variant/60 text-[11px]">
                {syncedAt ? `Synced ${timeAgo(syncedAt)}` : 'Connecting…'}
              </span>
            </div>
            <h1 className="font-headline-lg text-on-surface text-[22px] font-semibold">
              {displayRepo}
            </h1>
          </div>
          <button
            onClick={onOpenChat}
            className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-xl font-body-md font-medium hover:bg-primary-fixed transition-colors cursor-pointer shadow-md text-[14px]"
          >
            <span className="material-symbols-outlined text-[16px]">search</span>
            Investigate
          </button>
        </div>

        {/* ── Metric Strip ──────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          <StatPill icon="hub" value={totalDecisions} label="Decisions" color="text-primary" skeleton={statsLoading} />
          <StatPill icon="skull" value={rejectedCount} label="Rejected" color="text-unknown-rose" skeleton={statsLoading} />
          <StatPill icon="merge_type" value={prCount} label="PRs Analyzed" skeleton={statsLoading} />
          <StatPill icon="task_alt" value={issueCount} label="Issues" skeleton={statsLoading} />
          <StatPill icon="radar" value={3} label="Drift Signals" color="text-inferred-amber" />
        </div>

        {/* ── Two-column middle section ──────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* RECENT INVESTIGATIONS */}
          <div className="bg-surface-container-low border border-outline-variant rounded-2xl overflow-hidden">
            <div className="px-4 pt-4 pb-3 border-b border-outline-variant flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[16px]">history</span>
                <span className="font-label-caps text-[11px] text-on-surface uppercase tracking-wider">Recent Investigations</span>
              </div>
              <span className="font-code-sm text-on-surface-variant text-[11px]">{SEEDED_INVESTIGATIONS.length} sessions</span>
            </div>
            <div className="divide-y divide-outline-variant/40">
              {SEEDED_INVESTIGATIONS.map((inv) => (
                <button
                  key={inv.id}
                  onClick={() => onSelectPreset(inv.question, inv.mode)}
                  className="w-full text-left px-4 py-3 hover:bg-surface-container transition-colors group cursor-pointer"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-[16px] mt-0.5 shrink-0">{inv.icon}</span>
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="font-body-md text-on-surface text-[14px] leading-snug group-hover:text-primary transition-colors line-clamp-2">
                        {inv.question}
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-code-sm text-on-surface-variant text-[11px]">
                          {inv.topic}
                        </span>
                        <span className="text-outline-variant">·</span>
                        <span className="font-code-sm text-on-surface-variant text-[11px]">
                          {inv.sources} sources
                        </span>
                        <span className="text-outline-variant">·</span>
                        <span className={`font-code-sm text-[11px] ${inv.confidence === 'High' ? 'text-confirmed-emerald' : 'text-inferred-amber'}`}>
                          {inv.confidence} confidence
                        </span>
                        <span className="text-outline-variant">·</span>
                        <span className="font-code-sm text-on-surface-variant/60 text-[11px]">{inv.age}</span>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant/40 group-hover:text-primary transition-colors shrink-0 mt-0.5">
                      chevron_right
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* DECISION LEDGER */}
          <div className="bg-surface-container-low border border-outline-variant rounded-2xl overflow-hidden">
            <div className="px-4 pt-4 pb-3 border-b border-outline-variant flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[16px]">book_2</span>
                <span className="font-label-caps text-[11px] text-on-surface uppercase tracking-wider">Decision Ledger</span>
              </div>
              <span className="font-code-sm text-on-surface-variant text-[11px]">{DECISION_LEDGER.length} records</span>
            </div>
            <div className="divide-y divide-outline-variant/40">
              {DECISION_LEDGER.map((d, i) => (
                <button
                  key={i}
                  onClick={() => onSelectPreset(`Why was ${d.title} ${d.status === 'Rejected' ? 'rejected' : 'chosen'}? What were the tradeoffs?`)}
                  className="w-full text-left px-4 py-2.5 hover:bg-surface-container transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-body-md text-on-surface text-[14px] group-hover:text-primary transition-colors">
                          {d.title}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded border font-label-caps text-[10px] ${STATUS_STYLES[d.status]}`}>
                          {d.status}
                        </span>
                      </div>
                      <span className="font-code-sm text-on-surface-variant text-[11px]">{d.topic}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="material-symbols-outlined text-[14px] text-on-surface-variant/50">link</span>
                      <span className="font-code-sm text-on-surface-variant text-[12px]">{d.evidence}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Knowledge Health ───────────────────────────────────────── */}
        <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[16px]">monitoring</span>
              <span className="font-label-caps text-[11px] text-on-surface uppercase tracking-wider">Knowledge Health</span>
            </div>
            <span className={`font-headline-sm font-bold ${coverage >= 70 ? 'text-confirmed-emerald' : coverage >= 40 ? 'text-inferred-amber' : 'text-unknown-rose'}`}>
              {statsLoading ? '—' : `${coverage}%`}
            </span>
          </div>

          {/* Coverage Bar */}
          <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${coverage >= 70 ? 'bg-confirmed-emerald' : coverage >= 40 ? 'bg-inferred-amber' : 'bg-unknown-rose'}`}
              style={{ width: `${coverage}%` }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-surface-container rounded-xl p-3 border border-outline-variant/60">
              <div className="font-headline-sm font-bold text-on-surface">{prCount}</div>
              <div className="font-label-caps text-[10px] text-on-surface-variant uppercase">PR Decisions</div>
            </div>
            <div className="bg-surface-container rounded-xl p-3 border border-outline-variant/60">
              <div className="font-headline-sm font-bold text-on-surface">{issueCount}</div>
              <div className="font-label-caps text-[10px] text-on-surface-variant uppercase">Issue Records</div>
            </div>
            <div className="bg-surface-container rounded-xl p-3 border border-outline-variant/60">
              <div className="font-headline-sm font-bold text-unknown-rose">{rejectedCount}</div>
              <div className="font-label-caps text-[10px] text-on-surface-variant uppercase">Rejected Alts</div>
            </div>
            <div className="bg-surface-container rounded-xl p-3 border border-outline-variant/60 border-inferred-amber/30">
              <div className="font-headline-sm font-bold text-inferred-amber">3</div>
              <div className="font-label-caps text-[10px] text-on-surface-variant uppercase">Drift Signals</div>
            </div>
          </div>

          {/* Drift Signals mini-list */}
          <div className="flex flex-col gap-1.5 pt-1 border-t border-outline-variant/50">
            <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">Active Drift Signals</span>
            {[
              { sev: 'High', msg: 'Authentication implementation diverges from historical decision', color: 'text-unknown-rose' },
              { sev: 'Med', msg: 'State management pattern differs from established decision', color: 'text-inferred-amber' },
              { sev: 'Low', msg: 'Caching layer introduced without corresponding decision record', color: 'text-on-surface-variant' },
            ].map((signal, i) => (
              <button
                key={i}
                onClick={() => onSelectPreset(`Detect architectural drift: ${signal.msg}`)}
                className="flex items-start gap-2 text-left hover:bg-surface-container rounded-lg px-2 py-1.5 transition-colors group cursor-pointer"
              >
                <span className={`font-label-caps text-[10px] font-semibold shrink-0 mt-0.5 ${signal.color}`}>{signal.sev}</span>
                <span className="font-code-sm text-on-surface-variant text-[12px] group-hover:text-on-surface transition-colors">{signal.msg}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Ask Continuum ──────────────────────────────────────────── */}
        <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[16px]">psychology</span>
            <span className="font-label-caps text-[11px] text-on-surface uppercase tracking-wider">Ask Continuum</span>
          </div>

          <form onSubmit={handleQuickSend} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={quickQuery}
              onChange={(e) => setQuickQuery(e.target.value)}
              placeholder="Ask anything about this repository's engineering history…"
              className="flex-1 bg-surface-container border border-outline-variant rounded-xl px-4 py-2.5 font-body-md text-on-surface placeholder-on-surface-variant/40 focus:border-primary/60 outline-none transition-colors text-[14px]"
            />
            <button
              type="submit"
              disabled={!quickQuery.trim()}
              className="bg-primary text-on-primary px-4 py-2.5 rounded-xl font-body-md font-medium hover:bg-primary-fixed transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_upward</span>
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Why were Hooks introduced?', q: 'Why were React Hooks introduced instead of keeping class components?', mode: 'query' as const },
              { label: '⚰️ Rejected approaches?', q: 'What state management approaches were tried and rejected?', mode: 'graveyard' as const },
              { label: 'Why Fiber architecture?', q: 'Why was the Fiber architecture chosen for React reconciliation?', mode: 'query' as const },
              { label: 'Authentication decisions', q: 'What decisions were made about authentication and security architecture?', mode: 'query' as const },
            ].map((chip) => (
              <button
                key={chip.label}
                onClick={() => onSelectPreset(chip.q, chip.mode)}
                className={`px-3 py-1.5 rounded-full font-body-md text-[13px] transition-colors cursor-pointer border ${
                  chip.mode === 'graveyard'
                    ? 'bg-unknown-rose/10 border-unknown-rose/30 text-unknown-rose hover:bg-unknown-rose/20'
                    : 'bg-surface-container border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
