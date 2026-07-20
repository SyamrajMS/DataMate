import { displayValue, EmptyState, VisualizationCard } from './shared';
import type { DataRow, VisualizationProps } from './types';

function resolveMetric(row: DataRow, preferredKey?: string): unknown {
  if (preferredKey && preferredKey in row) return row[preferredKey];
  return Object.values(row)[0];
}

/** A glassmorphism-styled KPI card for one-value query responses. */
export default function MetricCard({ payload }: VisualizationProps) {
  const { data, config } = payload;
  if (!data?.length || !data[0]) return <VisualizationCard><EmptyState /></VisualizationCard>;

  const preferredMetricKey = config.yAxis ?? config.metricLabel;
  const metric = resolveMetric(data[0], preferredMetricKey);

  return (
    <VisualizationCard>
      <div className="relative isolate overflow-hidden bg-gradient-to-br from-white via-indigo-50/70 to-violet-100/70 px-6 py-7 backdrop-blur-xl dark:from-gray-900 dark:via-indigo-950/60 dark:to-violet-950/50">
        <div className="absolute -right-8 -top-8 -z-10 h-32 w-32 rounded-full bg-indigo-400/20 blur-3xl" />
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">{config.metricLabel ?? 'Key metric'}</p>
        {config.title && <h2 className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-300">{config.title}</h2>}
        <p className="mt-3 break-words text-4xl font-extrabold tracking-tight text-gray-950 sm:text-5xl dark:text-white">{displayValue(metric)}</p>
      </div>
    </VisualizationCard>
  );
}
