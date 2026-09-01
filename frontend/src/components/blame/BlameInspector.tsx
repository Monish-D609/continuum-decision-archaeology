import React, { useState } from 'react';
import { api } from '../../api/client';
import type { BlameResponse } from '../../types/api';
import { CitationProofCard } from '../chat/CitationProofCard';

interface BlameInspectorProps {
  selectedRepo: string;
}

export const BlameInspector: React.FC<BlameInspectorProps> = ({ selectedRepo }) => {
  const [filePath, setFilePath] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BlameResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSample = () => {
    setFilePath('packages/react-reconciler/src/ReactFiberHooks.js');
    setCode(`function mountState(initialState) {
  var hook = mountWorkInProgressHook();
  if (typeof initialState === 'function') {
    initialState = initialState();
  }
  hook.memoizedState = hook.baseState = initialState;
  var queue = hook.queue = {
    pending: null,
    interleaved: null,
    lanes: NoLanes,
    dispatch: null,
    lastRenderedReducer: basicStateReducer,
    lastRenderedState: initialState
  };
  var dispatch = queue.dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue);
  return [hook.memoizedState, dispatch];
}`);
  };

  const handleBlame = async () => {
    if (!code.trim() || isLoading) return;
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await api.blame(code, filePath || undefined, selectedRepo || undefined);
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Blame analysis failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportADR = async () => {
    if (!result) return;
    const question = filePath
      ? `Why does code in ${filePath} exist?`
      : 'Why does this code snippet exist?';
    try {
      const res = await api.exportADR(
        question,
        result.answer,
        result.citations || [],
        result.confidence_summary || 'partial_evidence'
      );
      const blob = new Blob([res.content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert('ADR Export failed: ' + e.message);
    }
  };

  return (
    <div className="flex-1 h-screen overflow-y-auto p-6 md:p-8">
      <div className="max-w-4xl mx-auto w-full flex flex-col gap-6 pb-20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-primary text-[22px]">manage_search</span>
            <span className="font-label-caps text-[11px] text-primary uppercase tracking-wider">
              Semantic Git Blame
            </span>
          </div>
          <h1 className="font-headline-md text-on-surface mb-2">Why Does This Code Exist?</h1>
          <p className="font-body-lg text-on-surface-variant">
            Paste a code snippet or module — Continuum recovers the architectural debates, PR reviews,
            and tradeoffs that justified its implementation.
          </p>
        </div>

        {/* Input Card */}
        <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-6 shadow-xl flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="filePath"
              className="font-label-caps text-[11px] text-on-surface-variant uppercase tracking-wider"
            >
              File Path (Optional Context)
            </label>
            <input
              id="filePath"
              type="text"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              placeholder="e.g. packages/react-reconciler/src/ReactFiberBeginWork.js"
              className="bg-surface-container border border-outline-variant rounded-lg px-3.5 py-2 font-code-sm text-on-surface placeholder-on-surface-variant/40 focus:border-primary/60 outline-none transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label
                htmlFor="code"
                className="font-label-caps text-[11px] text-on-surface-variant uppercase tracking-wider"
              >
                Code Snippet <span className="text-unknown-rose">*</span>
              </label>
              <button
                type="button"
                onClick={loadSample}
                className="font-code-sm text-primary text-[12px] hover:underline cursor-pointer"
              >
                Load Sample React Fiber Code
              </button>
            </div>
            <textarea
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste the code you want to understand…"
              className="bg-surface-container border border-outline-variant rounded-xl p-4 font-code-sm text-[13px] text-on-surface placeholder-on-surface-variant/40 focus:border-primary/60 outline-none transition-colors min-h-[160px] resize-y"
            />
          </div>

          <button
            onClick={handleBlame}
            disabled={!code.trim() || isLoading}
            className="bg-primary text-on-primary font-body-md font-semibold py-3 px-6 rounded-xl hover:bg-primary-fixed transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                <span>Searching historical PR discussions…</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">search</span>
                <span>Explain Why This Exists</span>
              </>
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-surface-container-low border border-unknown-rose/30 text-unknown-rose rounded-2xl p-4 font-body-md">
            ⚠️ {error}
          </div>
        )}

        {/* Result Area */}
        {result && (
          <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-6 shadow-xl flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  psychology
                </span>
                <h2 className="font-headline-sm text-on-surface">Archaeological Rationale</h2>
              </div>
              <button
                onClick={handleExportADR}
                className="bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface px-3.5 py-1.5 rounded-lg font-body-md text-[13px] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px] text-primary">download</span>
                <span>Export ADR</span>
              </button>
            </div>

            <div className="font-body-lg text-on-surface space-y-3 leading-relaxed whitespace-pre-line">
              {result.answer}
            </div>

            {/* Citations */}
            {result.citations && result.citations.length > 0 && (
              <div className="pt-2 flex flex-col gap-3">
                <span className="font-label-caps text-on-surface-variant uppercase text-[11px] tracking-wider">
                  Historical Evidence Sources ({result.citations.length})
                </span>
                <div className="flex flex-col gap-2.5">
                  {result.citations.map((c, idx) => (
                    <CitationProofCard key={idx} citation={c} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
