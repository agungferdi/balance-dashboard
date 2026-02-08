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
            <div key={i} className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 animate-pulse border border-white/20">
              <div className="h-4 bg-white/20 rounded w-24 mb-4"></div>
              <div className="h-8 bg-white/20 rounded w-36"></div>
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

      {/* Account Balance Cards */}
      <div className="grid grid-cols-3 gap-3">
        {/* Rekening */}
        <div className="bg-gradient-to-br from-indigo-500/25 to-indigo-600/10 backdrop-blur-lg rounded-xl p-4 border border-indigo-400/25 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-indigo-500/30 rounded-lg flex items-center justify-center">
              <Wallet size={16} className="text-indigo-300" />
            </div>
            <span className="text-xs font-medium text-indigo-200/80">Rekening</span>
          </div>
          <p className="text-lg font-bold text-indigo-200">
            {formatCurrency(getAccountBalance(accountBalances, 'rekening'))}
          </p>
        </div>

        {/* Dana */}
        <div className="bg-gradient-to-br from-blue-500/25 to-blue-600/10 backdrop-blur-lg rounded-xl p-4 border border-blue-400/25 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-blue-500/30 rounded-lg flex items-center justify-center">
              <CreditCard size={16} className="text-blue-300" />
            </div>
            <span className="text-xs font-medium text-blue-200/80">Dana</span>
          </div>
          <p className="text-lg font-bold text-blue-200">
            {formatCurrency(getAccountBalance(accountBalances, 'dana'))}
          </p>
        </div>

        {/* Pocket */}
        <div className="bg-gradient-to-br from-amber-500/25 to-amber-600/10 backdrop-blur-lg rounded-xl p-4 border border-amber-400/25 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-amber-500/30 rounded-lg flex items-center justify-center">
              <PiggyBank size={16} className="text-amber-300" />
            </div>
            <span className="text-xs font-medium text-amber-200/80">Pocket</span>
          </div>
          <p className="text-lg font-bold text-amber-200">
            {formatCurrency(getAccountBalance(accountBalances, 'pocket'))}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BalanceCards;
