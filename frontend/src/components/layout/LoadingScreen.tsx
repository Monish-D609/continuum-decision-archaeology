import React, { useEffect, useState } from 'react';

interface LoadingScreenProps {
  onComplete: () => void;
}

const BOOT_SEQUENCE = [
  { ms: 0,    text: 'Initializing knowledge graph…' },
  { ms: 800,  text: 'Connecting to decision records…' },
  { ms: 1600, text: 'Loading 75 indexed decisions…' },
  { ms: 2400, text: 'Calibrating semantic retrieval…' },
  { ms: 3000, text: 'Continuum is ready.' },
];

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
  const [lineIndex, setLineIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Advance boot sequence lines
    BOOT_SEQUENCE.forEach((step, i) => {
      setTimeout(() => {
        setLineIndex(i);
        setProgress(Math.round(((i + 1) / BOOT_SEQUENCE.length) * 100));
      }, step.ms);
    });

    // Start fade-out
    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, 3600);

    // Signal completion
    const doneTimer = setTimeout(() => {
      onComplete();
    }, 4100);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(189,194,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(189,194,255,1) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Center content */}
      <div className="relative flex flex-col items-center gap-10 max-w-sm w-full px-8">

        {/* Logo mark */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl border border-primary/30 bg-primary/10 flex items-center justify-center shadow-lg">
            <span
              className="material-symbols-outlined text-primary text-[34px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              hub
            </span>
          </div>

          <div className="text-center">
            <div className="font-headline-md text-on-surface font-semibold text-[22px] leading-tight">
              Continuum
            </div>
            <div className="font-label-caps text-on-surface-variant text-[11px] uppercase tracking-[0.2em] mt-0.5">
              Decision Archaeology
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full flex flex-col gap-2">
          <div className="w-full h-[2px] bg-surface-container-highest rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Boot sequence log */}
          <div className="flex flex-col gap-1 min-h-[80px]">
            {BOOT_SEQUENCE.slice(0, lineIndex + 1).map((step, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 transition-opacity duration-300 ${
                  i === lineIndex ? 'opacity-100' : 'opacity-30'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[13px] ${
                    i < lineIndex
                      ? 'text-confirmed-emerald'
                      : i === lineIndex && lineIndex === BOOT_SEQUENCE.length - 1
                      ? 'text-confirmed-emerald'
                      : 'text-primary'
                  }`}
                  style={
                    i === lineIndex && lineIndex < BOOT_SEQUENCE.length - 1
                      ? { fontVariationSettings: "'FILL' 1" }
                      : { fontVariationSettings: "'FILL' 1" }
                  }
                >
                  {i < lineIndex
                    ? 'check_circle'
                    : lineIndex === BOOT_SEQUENCE.length - 1
                    ? 'check_circle'
                    : 'radio_button_unchecked'}
                </span>
                <span className="font-code-sm text-[12px] text-on-surface-variant">
                  {step.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Version tag */}
        <div className="font-code-sm text-on-surface-variant/30 text-[10px] tracking-widest uppercase">
          v2.0 · Engineering Memory Platform
        </div>
      </div>
    </div>
  );
};
