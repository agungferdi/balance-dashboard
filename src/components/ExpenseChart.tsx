import React, { useMemo, useState } from 'react';
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
  amount: number;
}

type ChartRangeKey = '3d' | '7d' | '14d' | '1m' | '2m' | '3m' | 'all';
type ChartMode = 'expense' | 'income';

const CHART_RANGE_OPTIONS: { value: ChartRangeKey; label: string; days: number | null }[] = [
  { value: '3d', label: '3 Hari', days: 3 },
  { value: '7d', label: '1 Minggu', days: 7 },
  { value: '14d', label: '14 Hari', days: 14 },
  { value: '1m', label: '1 Bulan', days: 30 },
  { value: '2m', label: '2 Bulan', days: 60 },
  { value: '3m', label: '3 Bulan', days: 90 },
  { value: 'all', label: 'All Time', days: null },
];

const CHART_MODE_OPTIONS: { value: ChartMode; label: string }[] = [
  { value: 'expense', label: 'Pengeluaran' },
  { value: 'income', label: 'Pemasukan' },
];

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

const DetailTooltip = ({ active, payload, transactions, isDark, mode }: any) => {
  if (!active || !payload || !payload.length) return null;

  const dateKey = payload[0]?.payload?.dateKey;
  const fullDate = payload[0]?.payload?.fullDate;
  const totalAmount = payload[0]?.value || 0;
  const isExpenseMode = mode === 'expense';
  const amountClass = isExpenseMode
    ? 'text-rose-500 dark:text-rose-400'
    : 'text-emerald-500 dark:text-emerald-400';
  const iconClass = isExpenseMode
    ? 'bg-rose-500/15 text-rose-500 dark:text-rose-400'
    : 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400';

  const dayTransactions: TransactionWithBalance[] = dateKey
    ? transactions.filter((t: TransactionWithBalance) => t.type === mode && t.created_at.startsWith(dateKey))
    : [];

  return (
    <div className={`rounded-xl p-3 shadow-xl min-w-[200px] max-w-[260px] ${isDark ? 'bg-[#1e1e2a] border border-white/10' : 'bg-white border border-gray-200 shadow-lg'}`}>
      <p className={`text-xs font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-800'}`}>{fullDate}</p>
      <p className={`text-sm font-bold mb-2 ${amountClass}`}>
        {isExpenseMode ? '-' : '+'}{formatFullCurrency(totalAmount)}
      </p>

      {dayTransactions.length > 0 && (
        <div className={`border-t pt-2 space-y-1.5 max-h-[150px] overflow-y-auto ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
          {dayTransactions.map((t: TransactionWithBalance) => (
            <div key={t.id} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${iconClass}`}>
                {getCatIcon(t.expense_category)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[11px] font-medium truncate ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                  {isExpenseMode ? (t.expense_category || 'Expense') : (t.income_category || 'Income')}
                  {t.notes && <span className={isDark ? 'text-gray-500' : 'text-gray-400'}> · {t.notes}</span>}
                </p>
              </div>
              <span className={`text-[11px] font-bold flex-shrink-0 ${amountClass}`}>
                {isExpenseMode ? '-' : '+'}{formatFullCurrency(t.total)}
              </span>
            </div>
          ))}
        </div>
      )}

      {dayTransactions.length === 0 && (
        <p className={`text-[10px] border-t pt-2 ${isDark ? 'text-gray-600 border-white/5' : 'text-gray-400 border-gray-100'}`}>
          {isExpenseMode ? 'Tidak ada pengeluaran' : 'Tidak ada pemasukan'}
        </p>
      )}
    </div>
  );
};

const ExpenseChart: React.FC<ExpenseChartProps> = ({ transactions, loading }) => {
  const { isDark } = useTheme();
  const [selectedMode, setSelectedMode] = useState<ChartMode>('expense');
  const [selectedRange, setSelectedRange] = useState<ChartRangeKey>('14d');

  const modeConfig = useMemo(() => {
    if (selectedMode === 'income') {
      return {
        title: 'Pemasukan',
        stroke: '#34d399',
        gradient: '#10b981',
        amountClass: 'text-emerald-500 dark:text-emerald-300',
        quickBg: 'bg-emerald-50 dark:bg-emerald-500/10',
        quickText: 'text-emerald-500 dark:text-emerald-400',
        quickValue: 'text-emerald-600 dark:text-emerald-400',
        sign: '+',
      };
    }

    return {
      title: 'Pengeluaran',
      stroke: '#fb7185',
      gradient: '#f43f5e',
      amountClass: 'text-rose-500 dark:text-rose-300',
      quickBg: 'bg-rose-50 dark:bg-rose-500/10',
      quickText: 'text-rose-500 dark:text-rose-400',
      quickValue: 'text-rose-600 dark:text-rose-400',
      sign: '-',
    };
  }, [selectedMode]);

  const selectedRangeConfig = useMemo(() => {
    return CHART_RANGE_OPTIONS.find(option => option.value === selectedRange) || CHART_RANGE_OPTIONS[2];
  }, [selectedRange]);

  const selectedModeTransactions = useMemo(() => {
    return transactions.filter((t) => t.type === selectedMode);
  }, [transactions, selectedMode]);

  const chartData = useMemo(() => {
    const dailyMap = new Map<string, { expense: number }>();
    
    const today = new Date();
    const startDate = new Date(today);

    if (selectedRangeConfig.days === null) {
      if (selectedModeTransactions.length > 0) {
        const firstTimestamp = Math.min(
          ...selectedModeTransactions.map((t) => new Date(t.created_at).getTime())
        );
        startDate.setTime(firstTimestamp);
      }
    } else {
      startDate.setDate(startDate.getDate() - (selectedRangeConfig.days - 1));
    }

    startDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    for (let date = new Date(startDate); date <= today; date.setDate(date.getDate() + 1)) {
      const dateKey = date.toISOString().split('T')[0];
      dailyMap.set(dateKey, { expense: 0 });
    }
    
    selectedModeTransactions.forEach((t) => {
      const dateKey = new Date(t.created_at).toISOString().split('T')[0];
      if (dailyMap.has(dateKey)) {
        const current = dailyMap.get(dateKey)!;
        current.expense += t.total;
      }
    });
    
    const data: DailyData[] = [];
    dailyMap.forEach((value, key) => {
      const date = new Date(key);
      data.push({
        date: new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(date),
        fullDate: new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date),
        dateKey: key,
          amount: value.expense,
      });
    });
    
    return data;
  }, [selectedModeTransactions, selectedRangeConfig.days]);

  const xAxisInterval = useMemo(() => {
    const days = chartData.length;
    if (days <= 7) return 0;
    if (days <= 14) return 1;
    if (days <= 30) return 4;
    if (days <= 60) return 9;
    if (days <= 90) return 14;
    return Math.floor(days / 8);
  }, [chartData.length]);

  const totalAmountToday = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return transactions
      .filter(t => t.type === selectedMode && t.created_at.startsWith(today))
      .reduce((sum, t) => sum + t.total, 0);
  }, [transactions, selectedMode]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#1a1a24] rounded-2xl p-5 border border-gray-100 dark:border-white/5 shadow-sm dark:shadow-[0_0_30px_rgba(139,92,246,0.05)] mb-6 transition-colors duration-300">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-violet-50 dark:bg-violet-500/15 rounded-lg flex items-center justify-center">
            <TrendingUp size={16} className="text-violet-500 dark:text-violet-400" />
          </div>
          <h2 className="text-base font-bold text-gray-800 dark:text-white">Grafik Pengeluaran</h2>
        </div>
        <div className="h-40 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" />
      </div>
    );
  }

  const gridColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
  const tickColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)';

  return (
    <div className="bg-white dark:bg-[#1a1a24] rounded-2xl p-5 border border-gray-100 dark:border-white/5 shadow-sm dark:shadow-[0_0_30px_rgba(139,92,246,0.05)] mb-6 transition-colors duration-300">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-violet-50 dark:bg-violet-500/15 rounded-lg flex items-center justify-center">
            <TrendingUp size={16} className="text-violet-500 dark:text-violet-400" />
          </div>
            <h2 className="text-base font-bold text-gray-800 dark:text-white">Grafik {modeConfig.title} {selectedRangeConfig.label}</h2>
        </div>
          <div className="flex items-start gap-2 flex-wrap justify-end">
            <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-white/5 rounded-lg">
              {CHART_MODE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedMode(option.value)}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${
                    selectedMode === option.value
                      ? 'bg-white dark:bg-[#242431] text-gray-700 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <select
              value={selectedRange}
              onChange={(e) => setSelectedRange(e.target.value as ChartRangeKey)}
              className="px-2.5 py-1.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-[11px] font-semibold text-gray-600 dark:text-gray-300 focus:outline-none focus:border-violet-500 transition-all"
              aria-label="Pilih periode grafik"
            >
              {CHART_RANGE_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  className="bg-white dark:bg-[#1a1a24] text-gray-700 dark:text-gray-200"
                >
                  {option.label}
                </option>
              ))}
            </select>
            <div className="text-right min-w-[90px]">
            <p className="text-[10px] text-gray-400 dark:text-gray-500">Hari ini</p>
              <p className={`text-xs font-bold ${modeConfig.amountClass}`}>{modeConfig.sign}{formatFullCurrency(totalAmountToday)}</p>
          </div>
        </div>
      </div>

      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={modeConfig.gradient} stopOpacity={0.3} />
                <stop offset="95%" stopColor={modeConfig.gradient} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: tickColor }}
              interval={xAxisInterval}
              dy={5}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: tickColor }}
              tickFormatter={formatCurrency}
              dx={-5}
            />
              <Tooltip content={<DetailTooltip transactions={transactions} isDark={isDark} mode={selectedMode} />} />
            <Area
              type="monotone"
                dataKey="amount"
                name={modeConfig.title}
                stroke={modeConfig.stroke}
              strokeWidth={2}
              fill="url(#expenseGradient)"
                dot={{ fill: modeConfig.stroke, strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, stroke: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.2)', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Stats */}
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
        <div className={`${modeConfig.quickBg} rounded-xl p-3`}>
          <p className={`text-[10px] font-medium mb-1 ${modeConfig.quickText}`}>Total {modeConfig.title} ({selectedRangeConfig.label})</p>
          <p className={`text-base font-bold ${modeConfig.quickValue}`}>
            {formatFullCurrency(chartData.reduce((sum, d) => sum + d.amount, 0))}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExpenseChart;
