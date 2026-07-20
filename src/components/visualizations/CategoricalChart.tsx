import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CardHeader, EmptyState, numberValue, VisualizationCard } from './shared';
import type { VisualizationProps } from './types';

type ChartRow = Record<string, unknown> & { __chartValue: number };

/** Renders comparable category volumes with rounded, softly shadowed bars. */
export default function CategoricalChart({ payload }: VisualizationProps) {
  const { data, config } = payload;
  const { xAxis, yAxis, title } = config;
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
      <CardHeader eyebrow="Categorical analysis" title={title} />
      <div className="h-72 w-full px-3 pb-4 pt-5 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 10, left: -18, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="#e5e7eb" strokeDasharray="3 4" />
            <XAxis dataKey={xAxis} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} width={52} />
            <Tooltip
              cursor={{ fill: '#eef2ff' }}
              contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 8px 22px rgba(15, 23, 42, .12)' }}
              formatter={(value) => [numberValue(value)?.toLocaleString() ?? '—', yAxis]}
            />
            <Bar dataKey="__chartValue" fill="#4f46e5" radius={[8, 8, 2, 2]} maxBarSize={56} className="drop-shadow-[0_5px_7px_rgba(79,70,229,0.22)]" animationDuration={700} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </VisualizationCard>
  );
}
