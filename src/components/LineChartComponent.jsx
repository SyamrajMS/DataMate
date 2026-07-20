import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const formatValue = (value, format) => format === 'currency'
  ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(value)
  : new Intl.NumberFormat('en-US', { notation: 'compact' }).format(value);

export default function LineChartComponent({ data, config }) {
  const { xAxis, yAxis, yLabel, valueFormat } = config;
  return (
    <div className="chart-wrap">
      <div className="chart-label">{yLabel ?? yAxis}</div>
      <ResponsiveContainer width="100%" height={270}>
        <AreaChart data={data} margin={{ top: 14, right: 12, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c5cff" stopOpacity={0.38} />
              <stop offset="100%" stopColor="#7c5cff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.08} strokeDasharray="3 5" />
          <XAxis dataKey={xAxis} axisLine={false} tickLine={false} tick={{ fill: 'currentColor', opacity: 0.48, fontSize: 12 }} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: 'currentColor', opacity: 0.48, fontSize: 11 }} tickFormatter={(value) => formatValue(value, valueFormat)} />
          <Tooltip cursor={{ stroke: '#7c5cff', strokeOpacity: 0.45 }} contentStyle={{ background: '#161b2c', border: '1px solid #2e3652', borderRadius: 12, color: '#f5f7ff', boxShadow: '0 12px 30px rgba(0,0,0,.28)' }} formatter={(value) => [formatValue(value, valueFormat), yLabel ?? yAxis]} />
          <Area type="monotone" dataKey={yAxis} stroke="#8b72ff" strokeWidth={3} fill="url(#revenueGradient)" activeDot={{ r: 5, fill: '#d4ccff', stroke: '#8b72ff', strokeWidth: 3 }} animationDuration={850} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
