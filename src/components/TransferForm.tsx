import React, { useState } from 'react';
import { ArrowRight, Send, Wallet, CreditCard, PiggyBank } from 'lucide-react';
import { AccountType, TransferFormData, BalancePerAccount } from '../types/transaction';

interface TransferFormProps {
  onSubmit: (data: TransferFormData) => Promise<void>;
  loading: boolean;
  accountBalances: BalancePerAccount[];
}

const ACCOUNT_OPTIONS: { value: AccountType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'rekening', label: 'Rekening', icon: <Wallet size={16} />, color: 'indigo' },
  { value: 'dana', label: 'Dana', icon: <CreditCard size={16} />, color: 'blue' },
  { value: 'pocket', label: 'Pocket', icon: <PiggyBank size={16} />, color: 'amber' },
];

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const TransferForm: React.FC<TransferFormProps> = ({ onSubmit, loading, accountBalances }) => {
  const [fromAccount, setFromAccount] = useState<AccountType>('rekening');
  const [toAccount, setToAccount] = useState<AccountType>('dana');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const getBalance = (accountType: AccountType): number => {
    return accountBalances.find(a => a.account_type === accountType)?.balance || 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fromAccount === toAccount) {
      alert('Akun asal dan tujuan tidak boleh sama');
      return;
    }
    const transferAmount = parseFloat(amount);
    if (transferAmount > getBalance(fromAccount)) {
      alert('Saldo tidak mencukupi');
      return;
    }

    await onSubmit({
      from_account: fromAccount,
      to_account: toAccount,
      amount: transferAmount,
      notes,
    });
    setAmount('');
    setNotes('');
  };

  const availableTargets = ACCOUNT_OPTIONS.filter(a => a.value !== fromAccount);

  // Make sure toAccount is valid when fromAccount changes
  const handleFromChange = (val: AccountType) => {
    setFromAccount(val);
    if (val === toAccount) {
      const first = ACCOUNT_OPTIONS.find(a => a.value !== val);
      if (first) setToAccount(first.value);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-xl">
      <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
          <ArrowRight size={16} className="text-white" />
        </div>
        Transfer Antar Akun
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* From Account */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Dari Akun</label>
          <div className="grid grid-cols-3 gap-2">
            {ACCOUNT_OPTIONS.map((acc) => (
              <button
                key={acc.value}
                type="button"
                onClick={() => handleFromChange(acc.value)}
                className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl text-xs font-semibold transition-all duration-200
                  ${fromAccount === acc.value 
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg' 
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              >
                {acc.icon}
                <span>{acc.label}</span>
                <span className={`text-[10px] ${fromAccount === acc.value ? 'text-white/80' : 'text-gray-400'}`}>
                  {formatCurrency(getBalance(acc.value))}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* To Account */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Ke Akun</label>
          <div className="grid grid-cols-2 gap-2">
            {availableTargets.map((acc) => (
              <button
                key={acc.value}
                type="button"
                onClick={() => setToAccount(acc.value)}
                className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl text-xs font-semibold transition-all duration-200
                  ${toAccount === acc.value 
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg' 
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              >
                {acc.icon}
                <span>{acc.label}</span>
                <span className={`text-[10px] ${toAccount === acc.value ? 'text-white/80' : 'text-gray-400'}`}>
                  {formatCurrency(getBalance(acc.value))}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Jumlah (Rp)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            required
            min="1"
            className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder:text-gray-400"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Catatan</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contoh: Top up Dana, Sisihkan tabungan"
            className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder:text-gray-400"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !amount || fromAccount === toAccount}
          className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40"
        >
          <Send size={18} />
          {loading ? 'Memproses...' : 'Transfer'}
        </button>
      </form>
    </div>
  );
};

export default TransferForm;
