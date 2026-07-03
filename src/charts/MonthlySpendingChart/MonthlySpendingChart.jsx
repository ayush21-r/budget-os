import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '../../utils/formatters.js';

function MonthlySpendingChart({ data }) {
  if (!data.some((item) => item.spent > 0)) {
    return (
      <div style={{ height: 300, display: 'grid', placeItems: 'center', color: 'var(--color-muted)', fontWeight: 900 }}>
        No data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#d8d0c3" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} />
        <YAxis tickFormatter={(value) => `₹${value / 1000}k`} tickLine={false} axisLine={false} />
        <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ border: '2px solid #111', borderRadius: 12, boxShadow: '4px 4px 0 #111' }} />
        <Bar dataKey="spent" fill="#111111" radius={[8, 8, 0, 0]} />
        <Bar dataKey="saved" fill="#D46A4C" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default MonthlySpendingChart;
