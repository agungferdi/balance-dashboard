import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { TransactionWithBalance } from '../types/transaction';

interface ExpenseChartProps {
  transactions: TransactionWithBalance[];
  loading: boolean;
}

interface DailyData {
  date: string;
  fullDate: string;
  expense: number;
}

const formatCurrency = (amount: number): string => {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}jt`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)}rb`;
  }
  return amount.toString();
};

const formatFullCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-lg rounded-xl p-3 shadow-lg border border-white/20">
        <p className="text-sm font-semibold text-white mb-2">{payload[0]?.payload?.fullDate}</p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-white/70">{entry.name}:</span>
              <span className="text-sm font-bold" style={{ color: entry.color }}>
                {formatFullCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const ExpenseChart: React.FC<ExpenseChartProps> = ({ transactions, loading }) => {
  const chartData = useMemo(() => {
    // Group transactions by date
    const dailyMap = new Map<string, { expense: number }>();
    
    // Get last 14 days
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      dailyMap.set(dateKey, { expense: 0 });
    }
    
    // Aggregate transactions
    transactions.forEach((t) => {
      const dateKey = new Date(t.created_at).toISOString().split('T')[0];
      if (dailyMap.has(dateKey)) {
        const current = dailyMap.get(dateKey)!;
        if (t.type === 'expense') {
          current.expense += t.total;
        }
      }
    });
    
    // Convert to array
    const data: DailyData[] = [];
    dailyMap.forEach((value, key) => {
      const date = new Date(key);
      data.push({
        date: new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(date),
        fullDate: new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date),
        expense: value.expense,
      });
    });
    
    return data;
  }, [transactions]);

  const totalExpenseToday = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return transactions
      .filter(t => t.type === 'expense' && t.created_at.startsWith(today))
      .reduce((sum, t) => sum + t.total, 0);
  }, [transactions]);

  if (loading) {
    return (
      <div className="bg-[#1a1a24] rounded-2xl p-5 border border-white/5 shadow-[0_0_30px_rgba(139,92,246,0.05)] mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-violet-500/15 rounded-lg flex items-center justify-center">
            <TrendingUp size={16} className="text-violet-400" />
          </div>
          <h2 className="text-base font-bold text-white">Grafik 14 Hari Terakhir</h2>
        </div>
        <div className="h-40 bg-white/5 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-[#1a1a24] rounded-2xl p-5 border border-white/5 shadow-[0_0_30px_rgba(139,92,246,0.05)] mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-violet-500/15 rounded-lg flex items-center justify-center">
            <TrendingUp size={16} className="text-violet-400" />
          </div>
          <h2 className="text-base font-bold text-white">Grafik Pengeluaran 14 Hari</h2>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-500">Hari ini</p>
          <p className="text-xs font-bold text-rose-300">-{formatFullCurrency(totalExpenseToday)}</p>
        </div>
      </div>

      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.35)' }}
              dy={5}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.35)' }}
              tickFormatter={formatCurrency}
              dx={-5}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="expense"
              name="Pengeluaran"
              stroke="#fb7185"
              strokeWidth={2}
              fill="url(#expenseGradient)"
              dot={{ fill: '#fb7185', strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, stroke: 'rgba(255,255,255,0.5)', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Stats */}
      <div className="mt-4 pt-4 border-t border-white/5">
        <div className="bg-rose-500/10 rounded-xl p-3">
          <p className="text-[10px] text-rose-400 font-medium mb-1">Total Pengeluaran (14 hari)</p>
          <p className="text-base font-bold text-rose-400">
            {formatFullCurrency(chartData.reduce((sum, d) => sum + d.expense, 0))}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExpenseChart;
