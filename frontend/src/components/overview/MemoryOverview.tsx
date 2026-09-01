import React, { useEffect, useState, useRef } from 'react';
import { api } from '../../api/client';
import type { StatsResponse } from '../../types/api';

const QUICK_CHIPS = [
  { label: '💡 Why Hooks?', q: 'Why were React Hooks introduced instead of keeping class components?', mode: 'query' as const },
  { label: '⚰️ Rejected state models', q: 'What state management approaches were tried and rejected?', mode: 'graveyard' as const },
  { label: '🏗️ Why Fiber architecture?', q: 'Why was the Fiber architecture chosen for React reconciliation?', mode: 'query' as const },
  { label: '🔗 Why Context API?', q: 'Why was the Context API introduced alongside Redux?', mode: 'query' as const },
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
  Adopted:    'text-confirmed-emerald bg-confirmed-emerald/10 border-confirmed-emerald/30',
  Rejected:   'text-unknown-rose bg-unknown-rose/10 border-unknown-rose/30',
  Replaced:   'text-inferred-amber bg-inferred-amber/10 border-inferred-amber/30',
  Deprecated: 'text-on-surface-variant bg-surface-container border-outline-variant',
};

interface MemoryOverviewProps {
  selectedRepo: string;
  health: { status: string; recordCount: number; message: string } | null;
  onSelectPreset: (query: string, mode?: 'query' | 'graveyard') => void;
  onOpenChat: () => void;
}

function timeAgo(isoString: string | null): string {
  if (!isoString) return 'just now';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
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
    api.fetchStats().then(setStats).catch(() => {}).finally(() => setStatsLoading(false));
  }, [selectedRepo]);

  const totalDecisions = stats?.total_decisions ?? health?.recordCount ?? 0;
  const rejectedCount  = stats?.rejected_count ?? 0;
  const prCount        = stats?.pr_count ?? 0;
  const coverage       = stats?.knowledge_coverage_pct ?? 0;
  const syncedAt       = stats?.last_indexed_at ?? null;
  const displayRepo    = selectedRepo || (stats?.repositories[0]?.repo ?? 'facebook/react');

  const handleQuickSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickQuery.trim()) onSelectPreset(quickQuery.trim());
  };

  return (
    <div className="flex-1 w-full overflow-y-auto scrollbar-hide">
      <div className="max-w-[860px] mx-auto px-5 pt-10 pb-40 flex flex-col gap-8">

        {/* ── HERO ──────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 text-center items-center">
          {/* Brand pill */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 w-fit">
            <img src="/logo.png" alt="logo" className="w-4 h-4 object-contain" />
            <span className="font-label-caps text-primary text-[11px] uppercase tracking-widest">
              Continuum · Decision Archaeology
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-headline-lg text-on-surface text-[28px] sm:text-[34px] font-bold leading-tight max-w-[600px]">
            Ask <span className="text-primary">why</span> anything in your codebase was built the way it was.
          </h1>

          {/* Tagline */}
          <p className="font-body-lg text-on-surface-variant text-[15px] max-w-[520px] leading-relaxed">
            Continuum digs through GitHub PRs, issues, and commits to surface the real reasoning behind every engineering decision — with direct citations, no guessing.
          </p>

          {/* Live status */}
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2 h-2 rounded-full ${health?.status === 'healthy' ? 'bg-confirmed-emerald' : 'bg-inferred-amber animate-pulse'}`} />
            <span className="font-code-sm text-on-surface-variant/70 text-[12px]">
              {statsLoading
                ? 'Connecting…'
                : `${totalDecisions} decisions indexed from ${displayRepo} · synced ${timeAgo(syncedAt)}`}
            </span>
          </div>
        </div>

        {/* ── ASK CONTINUUM — the main input ───────────────────────── */}
        <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-5 flex flex-col gap-4 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
            <span className="font-label-caps text-[12px] text-on-surface uppercase tracking-wider font-semibold">Ask Continuum</span>
            <span className="ml-auto font-code-sm text-on-surface-variant/50 text-[11px]">Press Enter to send</span>
          </div>

          <form onSubmit={handleQuickSend} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={quickQuery}
              autoFocus
              onChange={(e) => setQuickQuery(e.target.value)}
              placeholder="e.g. Why was Redux chosen over MobX? Why were class components deprecated?"
              className="flex-1 bg-surface-container border border-outline-variant rounded-xl px-4 py-3 font-body-md text-on-surface placeholder-on-surface-variant/35 focus:border-primary/60 outline-none transition-colors text-[14px] shadow-inner"
            />
            <button
              type="submit"
              disabled={!quickQuery.trim()}
              className="bg-primary text-on-primary px-5 py-3 rounded-xl font-body-md font-medium hover:bg-primary-fixed transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-md flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_upward</span>
            </button>
          </form>

          {/* Quick chips */}
          <div className="flex flex-wrap gap-2">
            {QUICK_CHIPS.map((chip) => (
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

        {/* ── HOW IT WORKS — 3-step explainer ─────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: 'manage_search', title: 'Searches history', desc: 'Scans every PR, issue, and commit in the indexed repo for relevant context.' },
            { icon: 'link', title: 'Grounds every claim', desc: 'Each sentence in the answer is tied to a real GitHub thread — no fabrication.' },
            { icon: 'account_tree', title: 'Shows the full picture', desc: 'Surfaces what was decided, what was rejected, and where the architecture drifted.' },
          ].map((step) => (
            <div key={step.title} className="bg-surface-container-low border border-outline-variant rounded-2xl p-4 flex flex-col gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>{step.icon}</span>
              <span className="font-label-caps text-on-surface text-[13px] font-semibold">{step.title}</span>
              <span className="font-body-md text-on-surface-variant text-[13px] leading-relaxed">{step.desc}</span>
            </div>
          ))}
        </div>

        {/* ── METRIC STRIP ─────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          {[
            { icon: 'hub',        value: totalDecisions, label: 'Decisions',   color: 'text-primary' },
            { icon: 'skull',      value: rejectedCount,  label: 'Rejected',    color: 'text-unknown-rose' },
            { icon: 'merge_type', value: prCount,        label: 'PRs analyzed', color: 'text-on-surface' },
            { icon: 'radar',      value: 3,              label: 'Drift signals', color: 'text-inferred-amber' },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col gap-1 bg-surface-container border border-outline-variant rounded-xl px-4 py-3 min-w-[100px]">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant">{stat.icon}</span>
                {statsLoading ? (
                  <span className="w-10 h-4 rounded bg-surface-container-highest animate-pulse inline-block" />
                ) : (
                  <span className={`font-headline-sm font-bold text-[22px] ${stat.color}`}>{stat.value}</span>
                )}
              </div>
              <span className="font-label-caps text-on-surface-variant text-[11px] uppercase tracking-wider">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* ── DECISION LEDGER ──────────────────────────────────────── */}
        <div className="bg-surface-container-low border border-outline-variant rounded-2xl overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-outline-variant flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[16px]">book_2</span>
            <span className="font-label-caps text-[11px] text-on-surface uppercase tracking-wider">Decision Ledger</span>
            <span className="ml-auto font-code-sm text-on-surface-variant text-[11px]">{DECISION_LEDGER.length} records</span>
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
                      <span className="font-body-md text-on-surface text-[14px] group-hover:text-primary transition-colors">{d.title}</span>
                      <span className={`px-1.5 py-0.5 rounded border font-label-caps text-[10px] ${STATUS_STYLES[d.status]}`}>{d.status}</span>
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
    </div>
  );
};
