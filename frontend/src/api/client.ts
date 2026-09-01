import type {
  QueryResponse,
  BlameResponse,
  TimelineResponse,
  DriftRadarResponse,
  ADRExportResponse,
  HealthResponse,
  Citation,
} from '../types/api';

const API_BASE = window.location.origin;

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}/api${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`;
    try {
      const err = await response.json();
      errorMsg = err.detail || errorMsg;
    } catch {
      // Ignore JSON parse error
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  checkHealth: (): Promise<HealthResponse> => {
    return request<HealthResponse>('/health');
  },

  query: (question: string, repo?: string): Promise<QueryResponse> => {
    return request<QueryResponse>('/query', {
      method: 'POST',
      body: JSON.stringify({ question, repo: repo || undefined }),
    });
  },

  graveyard: (question: string, repo?: string): Promise<QueryResponse> => {
    return request<QueryResponse>('/graveyard', {
      method: 'POST',
      body: JSON.stringify({ question, repo: repo || undefined }),
    });
  },

  blame: (codeSnippet: string, filePath?: string, repo?: string): Promise<BlameResponse> => {
    return request<BlameResponse>('/blame', {
      method: 'POST',
      body: JSON.stringify({
        code_snippet: codeSnippet,
        file_path: filePath || undefined,
        repo: repo || undefined,
      }),
    });
  },

  timeline: (query: string, repo?: string, topK: number = 20): Promise<TimelineResponse> => {
    const params = new URLSearchParams({ query, top_k: String(topK) });
    if (repo) params.set('repo', repo);
    return request<TimelineResponse>(`/timeline?${params.toString()}`);
  },

  driftRadar: (principle: string, recentN: number = 20, repo?: string): Promise<DriftRadarResponse> => {
    return request<DriftRadarResponse>('/drift-radar', {
      method: 'POST',
      body: JSON.stringify({
        principle,
        recent_n: recentN,
        repo: repo || undefined,
      }),
    });
  },

  exportADR: (
    question: string,
    answer: string,
    citations: Citation[],
    confidenceSummary: string
  ): Promise<ADRExportResponse> => {
    return request<ADRExportResponse>('/export-adr', {
      method: 'POST',
      body: JSON.stringify({
        question,
        answer,
        citations,
        confidence_summary: confidenceSummary,
      }),
    });
  },
};
