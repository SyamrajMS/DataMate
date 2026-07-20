/**
 * Stable contract returned by the analytics API for every visual response.
 * A directive wrapper can extend this shape with `ui_directive` for dispatching.
 */
export type DataRow = Record<string, unknown>;

export interface VisualizationConfig {
  /** Database field used for the horizontal/category axis. */
  xAxis?: string;
  /** Database field used for the metric/value axis. */
  yAxis?: string;
  /** Human-readable title displayed on the visualization. */
  title?: string;
  /** Optional KPI label. It may also be used as a preferred metric field. */
  metricLabel?: string;
}

export interface APIPayload {
  /** Raw rows returned from the database. */
  data: DataRow[];
  config: VisualizationConfig;
}

/** Every plug-and-play visualization receives exactly this prop shape. */
export interface VisualizationProps {
  payload: APIPayload;
}

export type UIDirective =
  | 'TEMPORAL_SERIES'
  | 'CATEGORICAL_ASSERTION'
  | 'RELATIONAL_TABLE'
  | 'METRIC_CARD';

export interface DirectivePayload extends APIPayload {
  ui_directive: UIDirective;
}

/** Optional metadata returned alongside a visualization by the FastAPI service. */
export interface AnalyticsResponse extends DirectivePayload {
  /** Conversational explanation displayed above the rendered component. */
  message?: string;
  /** SQL can be returned for audit/debug views without coupling UI components to it. */
  sql?: string;
  /** Correlation identifier to include in feedback or support requests. */
  request_id?: string;
}
