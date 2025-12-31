import React from 'react';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { BalanceView } from '../types/transaction';

interface BalanceCardsProps {
  balance: BalanceView | null;
  loading: boolean;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const BalanceCards: React.FC<BalanceCardsProps> = ({ balance, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 animate-pulse border border-white/20">
            <div className="h-4 bg-white/20 rounded w-24 mb-4"></div>
            <div className="h-8 bg-white/20 rounded w-36"></div>
          </div>
        ))}
      </div>
    );
  }

  const balanceAmount = balance?.balance || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {/* Total Balance Card */}
      <div className="bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Wallet size={20} className="text-white" />
          </div>
          <span className="text-sm font-medium text-white/70">Total Saldo</span>
        </div>
        <p className={`text-3xl font-bold ${balanceAmount >= 0 ? 'text-white' : 'text-red-300'}`}>
          {formatCurrency(balanceAmount)}
        </p>
      </div>
      
      {/* Income Card */}
      <div className="bg-gradient-to-br from-emerald-500/30 to-emerald-600/10 backdrop-blur-lg rounded-2xl p-6 border border-emerald-400/30 shadow-xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-emerald-500/30 rounded-xl flex items-center justify-center">
            <TrendingUp size={20} className="text-emerald-300" />
          </div>
          <span className="text-sm font-medium text-emerald-200/80">Pemasukan</span>
        </div>
        <p className="text-3xl font-bold text-emerald-300">
          {formatCurrency(balance?.total_income || 0)}
        </p>
      </div>
      
      {/* Expense Card */}
      <div className="bg-gradient-to-br from-rose-500/30 to-rose-600/10 backdrop-blur-lg rounded-2xl p-6 border border-rose-400/30 shadow-xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-rose-500/30 rounded-xl flex items-center justify-center">
            <TrendingDown size={20} className="text-rose-300" />
          </div>
          <span className="text-sm font-medium text-rose-200/80">Pengeluaran</span>
        </div>
        <p className="text-3xl font-bold text-rose-300">
          {formatCurrency(balance?.total_expense || 0)}
        </p>
      </div>
    </div>
  );
};

export default BalanceCards;
