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
import { TrendingUp, Utensils, Car, Wrench, Gamepad2, MoreHorizontal } from 'lucide-react';
import { TransactionWithBalance } from '../types/transaction';
import { useTheme } from '../context/ThemeContext';

interface ExpenseChartProps {
  transactions: TransactionWithBalance[];
  loading: boolean;
}

interface DailyData {
  date: string;
  fullDate: string;
  dateKey: string;
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

const getCatIcon = (cat: string | null) => {
  switch (cat) {
    case 'Foods': return <Utensils size={12} />;
    case 'Transportation': return <Car size={12} />;
    case 'Equipment': return <Wrench size={12} />;
    case 'Entertainment': return <Gamepad2 size={12} />;
    default: return <MoreHorizontal size={12} />;
  }
};

const DetailTooltip = ({ active, payload, transactions, isDark }: any) => {
  if (!active || !payload || !payload.length) return null;

  const dateKey = payload[0]?.payload?.dateKey;
  const fullDate = payload[0]?.payload?.fullDate;
  const totalExpense = payload[0]?.value || 0;

  const dayTransactions: TransactionWithBalance[] = dateKey
    ? transactions.filter((t: TransactionWithBalance) => t.type === 'expense' && t.created_at.startsWith(dateKey))
    : [];

  return (
    <div className={`rounded-xl p-3 shadow-xl min-w-[200px] max-w-[260px] ${isDark ? 'bg-[#1e1e2a] border border-white/10' : 'bg-white border border-gray-200 shadow-lg'}`}>
      <p className={`text-xs font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-800'}`}>{fullDate}</p>
      <p className="text-sm font-bold text-rose-500 dark:text-rose-400 mb-2">
        -{formatFullCurrency(totalExpense)}
      </p>

      {dayTransactions.length > 0 && (
        <div className={`border-t pt-2 space-y-1.5 max-h-[150px] overflow-y-auto ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
          {dayTransactions.map((t: TransactionWithBalance) => (
            <div key={t.id} className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-rose-500/15 text-rose-500 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
                {getCatIcon(t.expense_category)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[11px] font-medium truncate ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                  {t.expense_category || 'Expense'}
                  {t.notes && <span className={isDark ? 'text-gray-500' : 'text-gray-400'}> · {t.notes}</span>}
                </p>
              </div>
              <span className="text-[11px] font-bold text-rose-500 dark:text-rose-400 flex-shrink-0">
                -{formatFullCurrency(t.total)}
              </span>
            </div>
          ))}
        </div>
      )}

      {dayTransactions.length === 0 && (
        <p className={`text-[10px] border-t pt-2 ${isDark ? 'text-gray-600 border-white/5' : 'text-gray-400 border-gray-100'}`}>Tidak ada pengeluaran</p>
      )}
    </div>
  );
};

const ExpenseChart: React.FC<ExpenseChartProps> = ({ transactions, loading }) => {
  const { isDark } = useTheme();

  const chartData = useMemo(() => {
    const dailyMap = new Map<string, { expense: number }>();
    
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      dailyMap.set(dateKey, { expense: 0 });
    }
    
    transactions.forEach((t) => {
      const dateKey = new Date(t.created_at).toISOString().split('T')[0];
      if (dailyMap.has(dateKey)) {
        const current = dailyMap.get(dateKey)!;
        if (t.type === 'expense') {
          current.expense += t.total;
        }
      }
    });
    
    const data: DailyData[] = [];
    dailyMap.forEach((value, key) => {
      const date = new Date(key);
      data.push({
        date: new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(date),
        fullDate: new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date),
        dateKey: key,
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
      <div className="bg-white dark:bg-[#1a1a24] rounded-2xl p-5 border border-gray-100 dark:border-white/5 shadow-sm dark:shadow-[0_0_30px_rgba(139,92,246,0.05)] mb-6 transition-colors duration-300">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-violet-50 dark:bg-violet-500/15 rounded-lg flex items-center justify-center">
            <TrendingUp size={16} className="text-violet-500 dark:text-violet-400" />
          </div>
          <h2 className="text-base font-bold text-gray-800 dark:text-white">Grafik 14 Hari Terakhir</h2>
        </div>
        <div className="h-40 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" />
      </div>
    );
  }

  const gridColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
  const tickColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)';

  return (
    <div className="bg-white dark:bg-[#1a1a24] rounded-2xl p-5 border border-gray-100 dark:border-white/5 shadow-sm dark:shadow-[0_0_30px_rgba(139,92,246,0.05)] mb-6 transition-colors duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-violet-50 dark:bg-violet-500/15 rounded-lg flex items-center justify-center">
            <TrendingUp size={16} className="text-violet-500 dark:text-violet-400" />
          </div>
          <h2 className="text-base font-bold text-gray-800 dark:text-white">Grafik Pengeluaran 14 Hari</h2>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-400 dark:text-gray-500">Hari ini</p>
          <p className="text-xs font-bold text-rose-500 dark:text-rose-300">-{formatFullCurrency(totalExpenseToday)}</p>
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
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: tickColor }}
              dy={5}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: tickColor }}
              tickFormatter={formatCurrency}
              dx={-5}
            />
            <Tooltip content={<DetailTooltip transactions={transactions} isDark={isDark} />} />
            <Area
              type="monotone"
              dataKey="expense"
              name="Pengeluaran"
              stroke="#fb7185"
              strokeWidth={2}
              fill="url(#expenseGradient)"
              dot={{ fill: '#fb7185', strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, stroke: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.2)', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Stats */}
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
        <div className="bg-rose-50 dark:bg-rose-500/10 rounded-xl p-3">
          <p className="text-[10px] text-rose-500 dark:text-rose-400 font-medium mb-1">Total Pengeluaran (14 hari)</p>
          <p className="text-base font-bold text-rose-600 dark:text-rose-400">
            {formatFullCurrency(chartData.reduce((sum, d) => sum + d.expense, 0))}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExpenseChart;
