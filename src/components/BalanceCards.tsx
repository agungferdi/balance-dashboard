import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Wallet, CreditCard, PiggyBank } from 'lucide-react';
import { BalanceView, BalancePerAccount, AccountType, ACCOUNT_TYPES, INVESTED_ACCOUNT_TYPES } from '../types/transaction';

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

const CORE_ACCOUNT_TYPES: AccountType[] = ['rekening', 'dana', 'pocket'];
const EXTRA_ACCOUNT_TYPES: AccountType[] = ['Saham', 'Crypto', 'Futures', 'Jago', 'Gopay', 'Reksadana'];

const getAccountStyle = (type: AccountType) => {
  switch (type) {
    case 'rekening':
      return {
        border: 'border-indigo-100 dark:border-indigo-500/10',
        shadow: 'shadow-sm dark:shadow-[0_0_20px_rgba(99,102,241,0.06)]',
        iconWrap: 'bg-indigo-50 dark:bg-indigo-500/15',
        iconColor: 'text-indigo-500 dark:text-indigo-400',
        amountColor: 'text-indigo-600 dark:text-indigo-300',
        icon: <Wallet size={16} className="text-indigo-500 dark:text-indigo-400" />,
      };
    case 'dana':
      return {
        border: 'border-blue-100 dark:border-blue-500/10',
        shadow: 'shadow-sm dark:shadow-[0_0_20px_rgba(59,130,246,0.06)]',
        iconWrap: 'bg-blue-50 dark:bg-blue-500/15',
        iconColor: 'text-blue-500 dark:text-blue-400',
        amountColor: 'text-blue-600 dark:text-blue-300',
        icon: <CreditCard size={16} className="text-blue-500 dark:text-blue-400" />,
      };
    case 'pocket':
      return {
        border: 'border-amber-100 dark:border-amber-500/10',
        shadow: 'shadow-sm dark:shadow-[0_0_20px_rgba(245,158,11,0.06)]',
        iconWrap: 'bg-amber-50 dark:bg-amber-500/15',
        iconColor: 'text-amber-500 dark:text-amber-400',
        amountColor: 'text-amber-600 dark:text-amber-300',
        icon: <PiggyBank size={16} className="text-amber-500 dark:text-amber-400" />,
      };
    case 'Saham':
      return {
        border: 'border-emerald-100 dark:border-emerald-500/10',
        shadow: 'shadow-sm dark:shadow-[0_0_20px_rgba(16,185,129,0.06)]',
        iconWrap: 'bg-emerald-50 dark:bg-emerald-500/15',
        iconColor: 'text-emerald-500 dark:text-emerald-400',
        amountColor: 'text-emerald-600 dark:text-emerald-300',
        icon: <TrendingUp size={16} className="text-emerald-500 dark:text-emerald-400" />,
      };
    case 'Crypto':
      return {
        border: 'border-cyan-100 dark:border-cyan-500/10',
        shadow: 'shadow-sm dark:shadow-[0_0_20px_rgba(6,182,212,0.06)]',
        iconWrap: 'bg-cyan-50 dark:bg-cyan-500/15',
        iconColor: 'text-cyan-500 dark:text-cyan-400',
        amountColor: 'text-cyan-600 dark:text-cyan-300',
        icon: <CreditCard size={16} className="text-cyan-500 dark:text-cyan-400" />,
      };
    case 'Futures':
      return {
        border: 'border-rose-100 dark:border-rose-500/10',
        shadow: 'shadow-sm dark:shadow-[0_0_20px_rgba(244,63,94,0.06)]',
        iconWrap: 'bg-rose-50 dark:bg-rose-500/15',
        iconColor: 'text-rose-500 dark:text-rose-400',
        amountColor: 'text-rose-600 dark:text-rose-300',
        icon: <TrendingDown size={16} className="text-rose-500 dark:text-rose-400" />,
      };
    case 'Jago':
      return {
        border: 'border-sky-100 dark:border-sky-500/10',
        shadow: 'shadow-sm dark:shadow-[0_0_20px_rgba(14,165,233,0.06)]',
        iconWrap: 'bg-sky-50 dark:bg-sky-500/15',
        iconColor: 'text-sky-500 dark:text-sky-400',
        amountColor: 'text-sky-600 dark:text-sky-300',
        icon: <Wallet size={16} className="text-sky-500 dark:text-sky-400" />,
      };
    case 'Gopay':
      return {
        border: 'border-teal-100 dark:border-teal-500/10',
        shadow: 'shadow-sm dark:shadow-[0_0_20px_rgba(20,184,166,0.06)]',
        iconWrap: 'bg-teal-50 dark:bg-teal-500/15',
        iconColor: 'text-teal-500 dark:text-teal-400',
        amountColor: 'text-teal-600 dark:text-teal-300',
        icon: <CreditCard size={16} className="text-teal-500 dark:text-teal-400" />,
      };
    case 'Reksadana':
      return {
        border: 'border-lime-100 dark:border-lime-500/10',
        shadow: 'shadow-sm dark:shadow-[0_0_20px_rgba(132,204,22,0.06)]',
        iconWrap: 'bg-lime-50 dark:bg-lime-500/15',
        iconColor: 'text-lime-500 dark:text-lime-400',
        amountColor: 'text-lime-600 dark:text-lime-300',
        icon: <PiggyBank size={16} className="text-lime-500 dark:text-lime-400" />,
      };
    default:
      return {
        border: 'border-gray-100 dark:border-white/10',
        shadow: 'shadow-sm dark:shadow-[0_0_20px_rgba(255,255,255,0.03)]',
        iconWrap: 'bg-gray-50 dark:bg-white/10',
        iconColor: 'text-gray-500 dark:text-gray-400',
        amountColor: 'text-gray-600 dark:text-gray-300',
        icon: <Wallet size={16} className="text-gray-500 dark:text-gray-400" />,
      };
  }
};

const BalanceCards: React.FC<BalanceCardsProps> = ({ balance, loading, accountBalances }) => {
  const [hideExtraAccounts, setHideExtraAccounts] = useState(false);

  if (loading) {
    return (
      <div className="space-y-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-[#1a1a24] rounded-2xl p-6 animate-pulse border border-gray-100 dark:border-white/5">
              <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-24 mb-4"></div>
              <div className="h-8 bg-gray-200 dark:bg-white/10 rounded w-36"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const balanceAmount = balance?.balance || 0;
  const totalInvested = INVESTED_ACCOUNT_TYPES.reduce((total, accountType) => {
    return total + getAccountBalance(accountBalances, accountType);
  }, 0);

  const visibleAccounts = hideExtraAccounts
    ? ACCOUNT_TYPES.filter(account => CORE_ACCOUNT_TYPES.includes(account.value))
    : ACCOUNT_TYPES;

  return (
    <div className="space-y-4 mb-8">
      {/* Main Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Balance Card */}
        <div className="bg-white dark:bg-[#1a1a24] rounded-2xl p-6 border border-gray-100 dark:border-white/5 shadow-sm dark:shadow-[0_0_30px_rgba(139,92,246,0.08)] transition-colors duration-300">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-violet-50 dark:bg-violet-500/15 rounded-xl flex items-center justify-center">
              <Wallet size={20} className="text-violet-500 dark:text-violet-400" />
            </div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Saldo</span>
          </div>
          <p className={`text-3xl font-bold ${balanceAmount >= 0 ? 'text-gray-800 dark:text-white' : 'text-red-500 dark:text-red-300'}`}>
            {formatCurrency(balanceAmount)}
          </p>
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/5">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Invested</p>
            <p className="text-sm font-bold text-violet-600 dark:text-violet-300">{formatCurrency(totalInvested)}</p>
          </div>
        </div>
        
        {/* Income Card */}
        <div className="bg-white dark:bg-[#1a1a24] rounded-2xl p-6 border border-emerald-100 dark:border-emerald-500/10 shadow-sm dark:shadow-[0_0_30px_rgba(16,185,129,0.06)] transition-colors duration-300">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-500/15 rounded-xl flex items-center justify-center">
              <TrendingUp size={20} className="text-emerald-500 dark:text-emerald-400" />
            </div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Pemasukan</span>
          </div>
          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(balance?.total_income || 0)}
          </p>
        </div>
        
        {/* Expense Card */}
        <div className="bg-white dark:bg-[#1a1a24] rounded-2xl p-6 border border-rose-100 dark:border-rose-500/10 shadow-sm dark:shadow-[0_0_30px_rgba(244,63,94,0.06)] transition-colors duration-300">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-rose-50 dark:bg-rose-500/15 rounded-xl flex items-center justify-center">
              <TrendingDown size={20} className="text-rose-500 dark:text-rose-400" />
            </div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Pengeluaran</span>
          </div>
          <p className="text-3xl font-bold text-rose-600 dark:text-rose-400">
            {formatCurrency(balance?.total_expense || 0)}
          </p>
        </div>
      </div>

      {/* Account Balance Cards */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300">Saldo Per Akun</h3>
        <button
          type="button"
          onClick={() => setHideExtraAccounts(prev => !prev)}
          className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
        >
          {hideExtraAccounts ? 'Show akun tambahan' : `Hide akun tambahan (${EXTRA_ACCOUNT_TYPES.length})`}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {visibleAccounts.map((account) => {
          const style = getAccountStyle(account.value);
          return (
            <div
              key={account.value}
              className={`bg-white dark:bg-[#1a1a24] rounded-xl p-4 border ${style.border} ${style.shadow} transition-colors duration-300`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 ${style.iconWrap} rounded-lg flex items-center justify-center ${style.iconColor}`}>
                  {style.icon}
                </div>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{account.label}</span>
              </div>
              <p className={`text-lg font-bold ${style.amountColor}`}>
                {formatCurrency(getAccountBalance(accountBalances, account.value))}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BalanceCards;
