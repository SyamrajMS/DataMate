import { useId, useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CardHeader, EmptyState, numberValue, VisualizationCard } from './shared';
import type { VisualizationProps } from './types';

type ChartRow = Record<string, unknown> & { __chartValue: number };

/** Renders a time-series area chart from a standardized API payload. */
export default function TemporalChart({ payload }: VisualizationProps) {
  const { data, config } = payload;
  const { xAxis, yAxis, title } = config;
  const gradientId = `temporal-gradient-${useId().replaceAll(':', '')}`;
  const chartData = useMemo<ChartRow[]>(() => {
    if (!yAxis) return [];
    return data.reduce<ChartRow[]>((rows, row) => {
      const value = numberValue(row[yAxis]);
      if (value !== null) rows.push({ ...row, __chartValue: value });
      return rows;
    }, []);
  }, [data, yAxis]);

  if (!data?.length) return <VisualizationCard><EmptyState /></VisualizationCard>;
  if (!xAxis || !yAxis) {
    return <VisualizationCard><EmptyState message="This chart needs config.xAxis and config.yAxis from the API." /></VisualizationCard>;
  }
  if (!chartData.length) {
    return <VisualizationCard><EmptyState message={`No numeric values were found for “${yAxis}”.`} /></VisualizationCard>;
  }

  return (
    <VisualizationCard>
      <CardHeader eyebrow="Temporal analysis" title={title} />
      <div className="h-72 w-full px-3 pb-4 pt-5 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 10, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.32} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#e5e7eb" strokeDasharray="3 4" />
            <XAxis dataKey={xAxis} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} width={52} />
            <Tooltip
              cursor={{ stroke: '#a5b4fc', strokeWidth: 1 }}
              contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 8px 22px rgba(15, 23, 42, .12)' }}
              formatter={(value) => [numberValue(value)?.toLocaleString() ?? '—', yAxis]}
            />
            <Area type="monotone" dataKey="__chartValue" stroke="#4f46e5" strokeWidth={2.5} fill={`url(#${gradientId})`} activeDot={{ r: 5 }} animationDuration={700} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </VisualizationCard>
  );
}
