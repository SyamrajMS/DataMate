import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const colors = ['#8b72ff', '#a58fff', '#c2b4ff', '#6950d4'];
const formatValue = (value, format) => format === 'currency'
  ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(value)
  : new Intl.NumberFormat('en-US', { notation: 'compact' }).format(value);

export default function BarChartComponent({ data, config }) {
  const { xAxis, yAxis, yLabel, valueFormat } = config;
  return (
    <div className="chart-wrap">
      <div className="chart-label">{yLabel ?? yAxis}</div>
      <ResponsiveContainer width="100%" height={270}>
        <BarChart data={data} margin={{ top: 14, right: 12, left: -12, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.08} strokeDasharray="3 5" />
          <XAxis dataKey={xAxis} axisLine={false} tickLine={false} tick={{ fill: 'currentColor', opacity: 0.5, fontSize: 11 }} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: 'currentColor', opacity: 0.48, fontSize: 11 }} tickFormatter={(value) => formatValue(value, valueFormat)} />
          <Tooltip cursor={{ fill: '#8b72ff', fillOpacity: 0.08 }} contentStyle={{ background: '#161b2c', border: '1px solid #2e3652', borderRadius: 12, color: '#f5f7ff', boxShadow: '0 12px 30px rgba(0,0,0,.28)' }} formatter={(value) => [formatValue(value, valueFormat), yLabel ?? yAxis]} />
          <Bar dataKey={yAxis} radius={[7, 7, 2, 2]} maxBarSize={52} animationDuration={800}>
            {data.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
