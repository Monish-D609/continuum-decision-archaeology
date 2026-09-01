export type ConfidenceLevel = 'confirmed' | 'inferred' | 'unknown';
export type ConfidenceSummary = 'strong_evidence' | 'partial_evidence' | 'insufficient_evidence';

export interface Citation {
  text: string;
  source_url: string;
  source_type: string;
  source_id: string;
  confidence: ConfidenceLevel;
  author?: string | null;
  quote?: string | null;
}

export interface ConfidenceBreakdown {
  confirmed: number;
  inferred: number;
  unknown: number;
}

export interface QueryResponse {
  answer: string;
  citations: Citation[];
  confidence_summary: ConfidenceSummary;
  confidence_breakdown: ConfidenceBreakdown;
  decision_records_used: string[];
  is_insufficient_evidence: boolean;
}

export interface BlameResponse {
  answer: string;
  citations: Citation[];
  confidence_summary: ConfidenceSummary;
  confidence_breakdown: ConfidenceBreakdown;
}

export interface TimelineEvent {
  id: string;
  title: string;
  decision_summary: string;
  source_url: string;
  source_date?: string | null;
  source_type: string;
}

export interface TimelineResponse {
  events: TimelineEvent[];
  query: string;
  total: number;
}

export interface DriftViolation {
  decision_id: string;
  title: string;
  source_url: string;
  violation_reason: string;
  severity: 'high' | 'medium' | 'low';
}

export interface DriftRadarResponse {
  principle: string;
  violations: DriftViolation[];
  clean_count: number;
  total_scanned: number;
}

export interface ADRExportResponse {
  filename: string;
  content: string;
}

export interface HealthResponse {
  status: string;
  record_count: number;
  message: string;
}
