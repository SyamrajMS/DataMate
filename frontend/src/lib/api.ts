import type { AnalyticsResponse, DataRow, DirectivePayload, UIDirective, VisualizationConfig } from '../components/visualizations/types';
import { getToken } from './auth';

export interface AnalyticsQueryRequest {
  query: string;
  conversation_id?: string;
  model?: string;
  api_key?: string;
}

export interface AnalyticsRequestOptions {
  signal?: AbortSignal;
}

export class ApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

const directiveValues: UIDirective[] = [
  'TEMPORAL_SERIES',
  'CATEGORICAL_ASSERTION',
  'RELATIONAL_TABLE',
  'METRIC_CARD',
  'TEXT_REPLY',
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

export function parseAnalyticsResponse(value: unknown): AnalyticsResponse {
  // Supports both a direct response and a common FastAPI wrapper: { payload: {...} }.
  const candidate = isRecord(value) && isRecord(value.payload) ? value.payload : value;
  if (!isRecord(candidate) || !isDirective(candidate.ui_directive)) {
    throw new ApiError('The API response is missing a supported ui_directive.');
  }
  if (!Array.isArray(candidate.data) || !candidate.data.every(isDataRow)) {
    throw new ApiError('The API response must include data as an array of objects.');
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

/** 
 * Centralized API Client Module 
 * All interactions with the backend should go through here.
 */
export const API = {
  /** Sends a natural-language question to the FastAPI analytics endpoint. */
  async runQuery(
    request: AnalyticsQueryRequest,
    options: AnalyticsRequestOptions = {},
  ): Promise<AnalyticsResponse> {
    let response: Response;
    const token = getToken();
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        cache: 'no-store',
        signal: options.signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(request),
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      throw new ApiError(`Unable to reach the analytics API at ${apiUrl}.`);
    }

    const rawBody: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = isRecord(rawBody) && typeof rawBody.detail === 'string' ? rawBody.detail : null;
      throw new ApiError(detail ?? `The analytics API returned HTTP ${response.status}.`, response.status);
    }
    return parseAnalyticsResponse(rawBody);
  },

  /** Fetches the query history from the backend. */
  async getHistory(limit: number = 50) {
    const historyUrl = `${configuredBaseUrl}/api/history?limit=${limit}`;
    let response: Response;
    const token = getToken();
    try {
      response = await fetch(historyUrl, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    } catch (error) {
      throw new ApiError(`Unable to reach the history API at ${historyUrl}.`);
    }

    const rawBody: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = isRecord(rawBody) && typeof rawBody.detail === 'string' ? rawBody.detail : null;
      throw new ApiError(detail ?? `The API returned HTTP ${response.status}.`, response.status);
    }
    return rawBody;
  }
};
