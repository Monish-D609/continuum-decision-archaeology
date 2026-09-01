import React from 'react';
import type { ConfidenceBreakdown } from '../../types/api';

interface ConfidenceMatrixProps {
  breakdown: ConfidenceBreakdown;
}

export const ConfidenceMatrix: React.FC<ConfidenceMatrixProps> = ({ breakdown }) => {
  const total = (breakdown.confirmed || 0) + (breakdown.inferred || 0) + (breakdown.unknown || 0);
  if (total === 0) return null;

  const confirmedPct = Math.round(((breakdown.confirmed || 0) / total) * 100);
  const inferredPct = Math.round(((breakdown.inferred || 0) / total) * 100);
  const unknownPct = Math.round(((breakdown.unknown || 0) / total) * 100);

  return (
    <div className="flex flex-col gap-1 w-full max-w-xs">
      <div className="flex justify-between items-center">
        <span className="font-label-caps text-on-surface-variant tracking-wider uppercase text-[11px]">
          Confidence Matrix
        </span>
        <span className="font-code-sm text-primary font-medium">{confirmedPct}% Verified</span>
      </div>

      <div
        className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden flex cursor-help"
        title={`${breakdown.confirmed || 0} Confirmed, ${breakdown.inferred || 0} Inferred, ${
          breakdown.unknown || 0
        } Unknown`}
      >
        {confirmedPct > 0 && (
          <div className="h-full bg-confirmed-emerald" style={{ width: `${confirmedPct}%` }} />
        )}
        {inferredPct > 0 && (
          <div className="h-full bg-inferred-amber" style={{ width: `${inferredPct}%` }} />
        )}
        {unknownPct > 0 && (
          <div className="h-full bg-unknown-rose" style={{ width: `${unknownPct}%` }} />
        )}
      </div>

      <div className="flex gap-3 font-code-sm text-on-surface-variant/70 text-[11px]">
        {breakdown.confirmed > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-confirmed-emerald inline-block" />
            {breakdown.confirmed} confirmed
          </span>
        )}
        {breakdown.inferred > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-inferred-amber inline-block" />
            {breakdown.inferred} inferred
          </span>
        )}
        {breakdown.unknown > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-unknown-rose inline-block" />
            {breakdown.unknown} unknown
          </span>
        )}
      </div>
    </div>
  );
};
