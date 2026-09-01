import React, { useState } from 'react';
import { api } from '../../api/client';
import type { DriftRadarResponse } from '../../types/api';

interface DriftRadarViewProps {
  selectedRepo: string;
}

export const DriftRadarView: React.FC<DriftRadarViewProps> = ({ selectedRepo }) => {
  const [principle, setPrinciple] = useState('');
  const [recentN, setRecentN] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DriftRadarResponse | null>(null);

  const handleScan = async (scanPrinciple?: string) => {
    const p = (scanPrinciple || principle).trim();
    if (!p || isLoading) return;

    setIsLoading(true);

    try {
      const data = await api.driftRadar(p, recentN, selectedRepo || undefined);
      setResult(data);
    } catch (e: any) {
      alert('Drift scan error: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const violations = result?.violations || [];
  const total = result?.total_scanned || 0;
  const clean = result?.clean_count || 0;
  const driftPct = total > 0 ? Math.round((violations.length / total) * 100) : 0;

  return (
    <div className="flex-1 h-screen overflow-y-auto p-6 md:p-8">
      <div className="max-w-4xl mx-auto w-full flex flex-col gap-6 pb-20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-primary text-[22px]">radar</span>
            <span className="font-label-caps text-[11px] text-primary uppercase tracking-wider">
              Invariant Checker
            </span>
          </div>
          <h1 className="font-headline-md text-on-surface mb-2">Architectural Drift Radar</h1>
          <p className="font-body-lg text-on-surface-variant">
            Enter a team rule or architectural invariant. Continuum scans historical decisions and
            flags any silent contradictions.
          </p>
        </div>

        {/* Input Card */}
        <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-6 shadow-xl flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="principle"
              className="font-label-caps text-[11px] text-on-surface-variant uppercase tracking-wider"
            >
              Architectural Principle / Rule <span className="text-unknown-rose">*</span>
            </label>
            <textarea
              id="principle"
              value={principle}
              onChange={(e) => setPrinciple(e.target.value)}
              placeholder="e.g. All state mutations must be immutable without direct object mutation"
              className="bg-surface-container border border-outline-variant rounded-xl p-3.5 font-body-md text-on-surface placeholder-on-surface-variant/40 focus:border-primary/60 outline-none transition-colors min-h-[90px] resize-y"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-label-caps text-[11px] text-on-surface-variant uppercase">
              Presets:
            </span>
            <button
              onClick={() => {
                const rule =
                  'State updates must be purely immutable without direct mutation of existing objects';
                setPrinciple(rule);
                handleScan(rule);
              }}
              className="bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface-variant hover:text-on-surface px-3 py-1 rounded-full text-[12px] font-code-sm transition-colors cursor-pointer"
            >
              Immutability Rule
            </button>
            <button
              onClick={() => {
                const rule =
                  'Components must not access global window or document directly without a wrapper';
                setPrinciple(rule);
                handleScan(rule);
              }}
              className="bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface-variant hover:text-on-surface px-3 py-1 rounded-full text-[12px] font-code-sm transition-colors cursor-pointer"
            >
              DOM Encapsulation
            </button>
            <button
              onClick={() => {
                const rule =
                  'All side-effects must be declared inside lifecycle or hook primitives rather than render phase';
                setPrinciple(rule);
                handleScan(rule);
              }}
              className="bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface-variant hover:text-on-surface px-3 py-1 rounded-full text-[12px] font-code-sm transition-colors cursor-pointer"
            >
              Side-Effect Isolation
            </button>
          </div>

          <button
            onClick={() => handleScan()}
            disabled={!principle.trim() || isLoading}
            className="bg-primary text-on-primary font-body-md font-semibold py-3 px-6 rounded-xl hover:bg-primary-fixed transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                <span>Scanning decisions for drift…</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">satellite_alt</span>
                <span>Scan Decisions for Drift</span>
              </>
            )}
          </button>
        </div>

        {/* Results Area */}
        {result && (
          <div className="flex flex-col gap-6">
            {/* Gauge / Stats Card */}
            <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div
                  className={`w-20 h-20 rounded-full border-4 flex flex-col items-center justify-center shadow-lg ${
                    violations.length > 0
                      ? 'border-unknown-rose/80 bg-unknown-rose/10 text-unknown-rose'
                      : 'border-confirmed-emerald/80 bg-confirmed-emerald/10 text-confirmed-emerald'
                  }`}
                >
                  <span className="font-headline-sm font-bold">{driftPct}%</span>
                  <span className="font-label-caps text-[9px] uppercase tracking-wider text-on-surface-variant">
                    Drift
                  </span>
                </div>

                <div>
                  <h3 className="font-headline-sm text-on-surface mb-1">Audit Summary</h3>
                  <p className="font-body-md text-on-surface-variant text-[13px]">
                    Scanned {total} decision records against principle
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="bg-surface-container px-4 py-2.5 rounded-xl border border-outline-variant flex flex-col items-center">
                  <span className="font-headline-sm text-unknown-rose font-bold">
                    {violations.length}
                  </span>
                  <span className="font-label-caps text-[10px] text-on-surface-variant uppercase">
                    Violations
                  </span>
                </div>

                <div className="bg-surface-container px-4 py-2.5 rounded-xl border border-outline-variant flex flex-col items-center">
                  <span className="font-headline-sm text-confirmed-emerald font-bold">{clean}</span>
                  <span className="font-label-caps text-[10px] text-on-surface-variant uppercase">
                    Compliant
                  </span>
                </div>
              </div>
            </div>

            {/* Violation List */}
            <div className="flex flex-col gap-4">
              {violations.length === 0 ? (
                <div className="bg-confirmed-emerald/10 border border-confirmed-emerald/30 rounded-2xl p-6 text-center text-confirmed-emerald font-body-lg">
                  ✅ Zero architectural drift detected. All {total} scanned decisions comply with your
                  stated invariant.
                </div>
              ) : (
                <>
                  <span className="font-label-caps text-on-surface-variant uppercase text-[11px] tracking-wider">
                    Detected Violations ({violations.length})
                  </span>
                  <div className="flex flex-col gap-3">
                    {violations.map((v, i) => {
                      const sev = (v.severity || 'medium').toLowerCase();
                      const badgeStyle =
                        sev === 'high'
                          ? 'bg-unknown-rose/20 text-unknown-rose border-unknown-rose/30'
                          : sev === 'medium'
                          ? 'bg-inferred-amber/20 text-inferred-amber border-inferred-amber/30'
                          : 'bg-confirmed-emerald/20 text-confirmed-emerald border-confirmed-emerald/30';

                      return (
                        <div
                          key={i}
                          className="bg-surface-container-low border border-outline-variant hover:border-outline rounded-2xl p-5 flex flex-col gap-2.5 transition-colors shadow-lg"
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded-full font-label-caps text-[10px] border ${badgeStyle} uppercase font-semibold`}
                              >
                                {v.severity || 'MEDIUM'} RISK
                              </span>
                              <span className="font-body-md font-semibold text-on-surface text-[15px]">
                                {v.title}
                              </span>
                            </div>
                            <a
                              href={v.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 font-code-sm text-[12px]"
                            >
                              <span>Source</span>
                              <span className="material-symbols-outlined text-[14px]">
                                open_in_new
                              </span>
                            </a>
                          </div>

                          <p className="font-body-md text-on-surface-variant text-[14px] leading-relaxed bg-surface-container p-3 rounded-xl border border-outline-variant/50">
                            {v.violation_reason}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
