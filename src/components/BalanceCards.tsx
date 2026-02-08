import React from 'react';
import { TrendingUp, TrendingDown, Wallet, CreditCard, PiggyBank } from 'lucide-react';
import { BalanceView, BalancePerAccount, AccountType } from '../types/transaction';

interface BalanceCardsProps {
  balance: BalanceView | null;
  loading: boolean;
  accountBalances: BalancePerAccount[];
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const getAccountBalance = (accountBalances: BalancePerAccount[], type: AccountType): number => {
  return accountBalances.find(a => a.account_type === type)?.balance || 0;
};

const BalanceCards: React.FC<BalanceCardsProps> = ({ balance, loading, accountBalances }) => {
  if (loading) {
    return (
      <div className="space-y-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[#1a1a24] rounded-2xl p-6 animate-pulse border border-white/5">
              <div className="h-4 bg-white/10 rounded w-24 mb-4"></div>
              <div className="h-8 bg-white/10 rounded w-36"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const balanceAmount = balance?.balance || 0;

  return (
    <div className="space-y-4 mb-8">
      {/* Main Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Balance Card */}
        <div className="bg-[#1a1a24] rounded-2xl p-6 border border-white/5 shadow-[0_0_30px_rgba(139,92,246,0.08)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-violet-500/15 rounded-xl flex items-center justify-center">
              <Wallet size={20} className="text-violet-400" />
            </div>
            <span className="text-sm font-medium text-gray-400">Total Saldo</span>
          </div>
          <p className={`text-3xl font-bold ${balanceAmount >= 0 ? 'text-white' : 'text-red-300'}`}>
            {formatCurrency(balanceAmount)}
          </p>
        </div>
        
        {/* Income Card */}
        <div className="bg-[#1a1a24] rounded-2xl p-6 border border-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.06)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-500/15 rounded-xl flex items-center justify-center">
              <TrendingUp size={20} className="text-emerald-400" />
            </div>
            <span className="text-sm font-medium text-gray-400">Pemasukan</span>
          </div>
          <p className="text-3xl font-bold text-emerald-400">
            {formatCurrency(balance?.total_income || 0)}
          </p>
        </div>
        
        {/* Expense Card */}
        <div className="bg-[#1a1a24] rounded-2xl p-6 border border-rose-500/10 shadow-[0_0_30px_rgba(244,63,94,0.06)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-rose-500/15 rounded-xl flex items-center justify-center">
              <TrendingDown size={20} className="text-rose-400" />
            </div>
            <span className="text-sm font-medium text-gray-400">Pengeluaran</span>
          </div>
          <p className="text-3xl font-bold text-rose-400">
            {formatCurrency(balance?.total_expense || 0)}
          </p>
        </div>
      </div>

      {/* Account Balance Cards */}
      <div className="grid grid-cols-3 gap-3">
        {/* Rekening */}
        <div className="bg-[#1a1a24] rounded-xl p-4 border border-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.06)]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-indigo-500/15 rounded-lg flex items-center justify-center">
              <Wallet size={16} className="text-indigo-400" />
            </div>
            <span className="text-xs font-medium text-gray-400">Rekening</span>
          </div>
          <p className="text-lg font-bold text-indigo-300">
            {formatCurrency(getAccountBalance(accountBalances, 'rekening'))}
          </p>
        </div>

        {/* Dana */}
        <div className="bg-[#1a1a24] rounded-xl p-4 border border-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.06)]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-blue-500/15 rounded-lg flex items-center justify-center">
              <CreditCard size={16} className="text-blue-400" />
            </div>
            <span className="text-xs font-medium text-gray-400">Dana</span>
          </div>
          <p className="text-lg font-bold text-blue-300">
            {formatCurrency(getAccountBalance(accountBalances, 'dana'))}
          </p>
        </div>

        {/* Pocket */}
        <div className="bg-[#1a1a24] rounded-xl p-4 border border-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.06)]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-amber-500/15 rounded-lg flex items-center justify-center">
              <PiggyBank size={16} className="text-amber-400" />
            </div>
            <span className="text-xs font-medium text-gray-400">Pocket</span>
          </div>
          <p className="text-lg font-bold text-amber-300">
            {formatCurrency(getAccountBalance(accountBalances, 'pocket'))}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BalanceCards;
