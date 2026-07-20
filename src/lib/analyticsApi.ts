import type { AnalyticsResponse, DataRow, DirectivePayload, UIDirective, VisualizationConfig } from '../components/visualizations/types';

export interface AnalyticsQueryRequest {
  query: string;
  conversation_id?: string;
}

export interface AnalyticsRequestOptions {
  signal?: AbortSignal;
}

export class AnalyticsApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'AnalyticsApiError';
  }
}

const directiveValues: UIDirective[] = [
  'TEMPORAL_SERIES',
  'CATEGORICAL_ASSERTION',
  'RELATIONAL_TABLE',
  'METRIC_CARD',
];

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:8000';
const configuredPath = import.meta.env.VITE_ANALYTICS_ENDPOINT ?? '/api/query';
const apiUrl = `${configuredBaseUrl}${configuredPath.startsWith('/') ? configuredPath : `/${configuredPath}`}`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDirective(value: unknown): value is UIDirective {
  return typeof value === 'string' && directiveValues.includes(value as UIDirective);
}

function isDataRow(value: unknown): value is DataRow {
  return isRecord(value);
}

function normalizeConfig(value: unknown): VisualizationConfig {
  if (!isRecord(value)) return {};
  return {
    xAxis: typeof value.xAxis === 'string' ? value.xAxis : undefined,
    yAxis: typeof value.yAxis === 'string' ? value.yAxis : undefined,
    title: typeof value.title === 'string' ? value.title : undefined,
    metricLabel: typeof value.metricLabel === 'string' ? value.metricLabel : undefined,
  };
}

/**
 * Validates the boundary between untrusted network data and the visualization
 * library. It makes malformed backend responses safe to render as errors.
 */
export function parseAnalyticsResponse(value: unknown): AnalyticsResponse {
  // Supports both a direct response and a common FastAPI wrapper: { payload: {...} }.
  const candidate = isRecord(value) && isRecord(value.payload) ? value.payload : value;
  if (!isRecord(candidate) || !isDirective(candidate.ui_directive)) {
    throw new AnalyticsApiError('The API response is missing a supported ui_directive.');
  }
  if (!Array.isArray(candidate.data) || !candidate.data.every(isDataRow)) {
    throw new AnalyticsApiError('The API response must include data as an array of objects.');
  }

  const response: DirectivePayload = {
    ui_directive: candidate.ui_directive,
    data: candidate.data,
    config: normalizeConfig(candidate.config),
  };

  return {
    ...response,
    message: typeof candidate.message === 'string' ? candidate.message : undefined,
    sql: typeof candidate.sql === 'string' ? candidate.sql : undefined,
    request_id: typeof candidate.request_id === 'string' ? candidate.request_id : undefined,
  };
}

/** Sends a natural-language question to the FastAPI analytics endpoint. */
export async function runAnalyticsQuery(
  request: AnalyticsQueryRequest,
  options: AnalyticsRequestOptions = {},
): Promise<AnalyticsResponse> {
  let response: Response;
  try {
    response = await fetch(apiUrl, {
      method: 'POST',
      cache: 'no-store',
      signal: options.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(request),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new AnalyticsApiError(`Unable to reach the analytics API at ${apiUrl}.`);
  }

  const rawBody: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = isRecord(rawBody) && typeof rawBody.detail === 'string' ? rawBody.detail : null;
    throw new AnalyticsApiError(detail ?? `The analytics API returned HTTP ${response.status}.`, response.status);
  }
  return parseAnalyticsResponse(rawBody);
}

export const analyticsEndpoint = apiUrl;
