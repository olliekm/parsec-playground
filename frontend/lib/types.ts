// API Types

export interface GenerateRequest {
  prompt: string;
  json_schema: Record<string, any>;
  provider: string;
  model: string;
  temperature?: number;
  max_tokens?: number;
  template_id?: number;
}

export interface GenerateResponse {
  run_id: number;
  raw_output: string;
  parsed_output: any;
  validation_status: boolean;
  validation_errors: ValidationError[];
  latency_ms: number;
  tokens_used: number;
}

export interface ValidationError {
  path: string;
  message: string;
}

export interface Template {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  versions: TemplateVersion[];
}

export interface TemplateVersion {
  id: number;
  template_id: number;
  version: number;
  content: string;
  variables?: Record<string, any>;
  json_schema: Record<string, any>;
  created_at: string;
}

export interface TemplateCreate {
  name: string;
  content: string;
  variables?: Record<string, any>;
  json_schema: Record<string, any>;
}

export interface Run {
  id: number;
  template_id?: number;
  provider: string;
  model: string;
  prompt: string;
  json_schema: Record<string, any>;
  raw_output?: string;
  parsed_output?: any;
  validation_errors?: string[];
  latency_ms?: number;
  tokens_used?: number;
  retry_count: number;
  validation_status: boolean;
  created_at: string;
}

export interface HistoryResponse {
  runs: Run[];
  total: number;
  page: number;
  page_size: number;
}

export interface Analytics {
  template_id: number;
  template_name: string;
  total_runs: number;
  success_rate: number;
  avg_latency: number;
  p50_latency: number;
  p95_latency: number;
  p99_latency: number;
  total_tokens: number;
  avg_tokens: number;
  error_breakdown: Record<string, number>;
}

export interface StreamChunk {
  type: "chunk" | "done" | "error";
  delta?: string;
  accumulated?: string;
  parsed?: any;
  is_complete?: boolean;
  message?: string;
}
