export const suggestions = [
  'Show revenue trend for the last 6 months',
  'Compare top customer segments by revenue',
  'List orders that need attention',
];

const responses = {
  trend: {
    ui_directive: 'TEMPORAL_SERIES',
    title: 'Monthly revenue trend',
    summary: 'Revenue grew 18.4% over the last six months, with a strong finish in June.',
    config: { xAxis: 'month', yAxis: 'revenue', yLabel: 'Revenue', valueFormat: 'currency' },
    data: [
      { month: 'Jan', revenue: 48200 }, { month: 'Feb', revenue: 51600 },
      { month: 'Mar', revenue: 49800 }, { month: 'Apr', revenue: 58500 },
      { month: 'May', revenue: 62300 }, { month: 'Jun', revenue: 70100 },
    ],
  },
  category: {
    ui_directive: 'CATEGORICAL_ASSERTION',
    title: 'Revenue by customer segment',
    summary: 'Enterprise accounts contribute 44% of recognized revenue this quarter.',
    config: { xAxis: 'segment', yAxis: 'revenue', yLabel: 'Revenue', valueFormat: 'currency' },
    data: [
      { segment: 'Enterprise', revenue: 184200 }, { segment: 'Mid-market', revenue: 126500 },
      { segment: 'SMB', revenue: 73200 }, { segment: 'Startup', revenue: 41800 },
    ],
  },
  table: {
    ui_directive: 'RELATIONAL_TABLE',
    title: 'Orders requiring attention',
    summary: 'Five orders are currently delayed or have payment exceptions.',
    config: { valueFormat: 'number' },
    data: [
      { order_id: '#ORD-1048', customer: 'Northstar Labs', status: 'Payment review', amount: '$12,480', updated: '18 min ago' },
      { order_id: '#ORD-1043', customer: 'Apex Ventures', status: 'Delayed', amount: '$8,920', updated: '43 min ago' },
      { order_id: '#ORD-1038', customer: 'Juniper & Co.', status: 'Payment review', amount: '$6,310', updated: '1 hr ago' },
      { order_id: '#ORD-1029', customer: 'Horizon Systems', status: 'Delayed', amount: '$15,240', updated: '2 hrs ago' },
      { order_id: '#ORD-1021', customer: 'Cedar Studio', status: 'Delayed', amount: '$3,780', updated: '4 hrs ago' },
    ],
  },
};

export function getMockResponse(query) {
  const lower = query.toLowerCase();
  if (/(order|list|attention|detail)/.test(lower)) return responses.table;
  if (/(segment|compare|customer|categor)/.test(lower)) return responses.category;
  return responses.trend;
}
