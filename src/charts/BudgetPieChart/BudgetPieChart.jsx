import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '../../utils/formatters.js';

function BudgetPieChart({ data }) {
  if (!data.length) {
    return (
      <div style={{ height: 260, display: 'grid', placeItems: 'center', color: 'var(--color-muted)', fontWeight: 900 }}>
        No data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="spent" nameKey="name" innerRadius={64} outerRadius={104} paddingAngle={3}>
          {data.map((entry) => (
            <Cell key={entry.id} fill={entry.color} stroke="#111111" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ border: '2px solid #111', borderRadius: 12, boxShadow: '4px 4px 0 #111' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default BudgetPieChart;
