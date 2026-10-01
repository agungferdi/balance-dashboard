import React, { useRef, useState } from 'react';
import { Plus, Minus, Send, Wallet, CreditCard, PiggyBank, Camera, Loader2, ScanLine, X } from 'lucide-react';
import { scanReceipt } from '../lib/receipt';
import { notify } from '../lib/notifications';
import {
  TransactionType,
  ExpenseCategory,
  IncomeCategory,
  AccountType,
  TransactionFormData,
  BalancePerAccount,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from '../types/transaction';

interface TransactionFormProps {
  onSubmit: (data: TransactionFormData) => Promise<void>;
  loading: boolean;
  accountBalances: BalancePerAccount[];
}

const PAYMENT_SOURCES: { value: AccountType; label: string }[] = [
  { value: 'rekening', label: 'Rekening' },
  { value: 'dana', label: 'Dana' },
  { value: 'pocket', label: 'Pocket' },
];

const getAccountIcon = (accountType: AccountType) => {
  switch (accountType) {
    case 'rekening':
      return <Wallet size={14} />;
    case 'pocket':
      return <PiggyBank size={14} />;
    default:
      return <CreditCard size={14} />;
  }
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const TransactionForm: React.FC<TransactionFormProps> = ({ onSubmit, loading, accountBalances }) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('Foods');
  const [incomeCategory, setIncomeCategory] = useState<IncomeCategory>('Salary');
  const [paymentSource, setPaymentSource] = useState<AccountType>('rekening');
  const [notes, setNotes] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanMessage, setScanMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReceiptSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setScanning(true);
    setScanProgress(0);
    setScanMessage(null);
    try {
      const result = await scanReceipt(file, (progress, status) => {
        if (status === 'recognizing text') setScanProgress(progress);
      });

      if (!result.total) {
        setScanMessage({ kind: 'error', text: 'Total tidak terbaca. Coba foto ulang lebih dekat & terang, atau isi manual.' });
        notify('Scan struk gagal', 'Total tidak terbaca dari foto struk.', 'receipt');
        return;
      }

      setType('expense');
      if (result.category) setExpenseCategory(result.category);
      setPrice(String(result.total));
      setQuantity('1');
      setNotes(result.merchant ? `${result.merchant} (struk)` : 'Struk');

      const summary = `${formatCurrency(result.total)}${result.merchant ? ` · ${result.merchant}` : ''}${result.category ? ` · ${result.category}` : ''}`;
      setScanMessage({ kind: 'success', text: `Terbaca: ${summary}. Periksa lalu tekan Simpan.` });
      notify('Struk berhasil dibaca', summary, 'receipt');
    } catch (error) {
      console.error('Receipt scan failed:', error);
      const offlineHint = navigator.onLine ? '' : ' Saat offline, scan hanya bisa dipakai jika engine OCR sudah pernah diunduh.';
      setScanMessage({ kind: 'error', text: `Gagal memproses struk.${offlineHint}` });
      notify('Scan struk gagal', 'Struk tidak bisa diproses.', 'receipt');
    } finally {
      setScanning(false);
    }
  };

  const getBalance = (accountType: AccountType): number => {
    return accountBalances.find(a => a.account_type === accountType)?.balance || 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData: TransactionFormData = {
      type,
      notes,
      price: parseFloat(price),
      quantity: parseInt(quantity) || 1,
    };

    if (type === 'expense') {
      formData.expense_category = expenseCategory;
      formData.payment_source = paymentSource;
    } else {
      formData.income_category = incomeCategory;
    }

    await onSubmit(formData);
    setScanMessage(null);
    setNotes('');
    setPrice('');
    setQuantity('1');
  };

  return (
    <div className="bg-white dark:bg-[#1a1a24] rounded-2xl p-6 shadow-sm dark:shadow-[0_0_30px_rgba(139,92,246,0.06)] border border-gray-100 dark:border-white/5 transition-colors duration-300">
      <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Plus size={16} className="text-white" />
        </div>
        Transaksi Baru
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Receipt Scan */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleReceiptSelected}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={scanning}
            className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border-2 border-dashed border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-500/5 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 disabled:opacity-60 transition-all"
          >
            {scanning ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Membaca struk... {scanProgress > 0 ? `${Math.round(scanProgress * 100)}%` : ''}
              </>
            ) : (
              <>
                <Camera size={16} />
                Scan Struk
              </>
            )}
          </button>
          {scanMessage && (
            <div
              className={`mt-2 px-3 py-2 rounded-lg text-xs flex items-start gap-2 ${
                scanMessage.kind === 'success'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
              }`}
            >
              <ScanLine size={14} className="mt-0.5 shrink-0" />
              <span className="flex-1">{scanMessage.text}</span>
              <button type="button" onClick={() => setScanMessage(null)} className="shrink-0 opacity-60 hover:opacity-100">
                <X size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Type Toggle */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200
              ${type === 'expense' 
                ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/30' 
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10'}`}
          >
            <Minus size={18} />
            Pengeluaran
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200
              ${type === 'income' 
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30' 
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10'}`}
          >
            <Plus size={18} />
            Pemasukan
          </button>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Kategori</label>
          {type === 'expense' ? (
            <select
              value={expenseCategory}
              onChange={(e) => setExpenseCategory(e.target.value as ExpenseCategory)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:border-indigo-500 transition-all"
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="bg-white dark:bg-[#1a1a24] text-gray-700 dark:text-gray-200">{cat}</option>
              ))}
            </select>
          ) : (
            <select
              value={incomeCategory}
              onChange={(e) => setIncomeCategory(e.target.value as IncomeCategory)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:border-indigo-500 transition-all"
            >
              {INCOME_CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="bg-white dark:bg-[#1a1a24] text-gray-700 dark:text-gray-200">{cat}</option>
              ))}
            </select>
          )}
        </div>

        {/* Payment Source (only for expenses) */}
        {type === 'expense' && (
          <div>
            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Bayar Dari</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PAYMENT_SOURCES.map((source) => (
                <button
                  key={source.value}
                  type="button"
                  onClick={() => setPaymentSource(source.value)}
                  className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl text-xs font-semibold transition-all duration-200
                    ${paymentSource === source.value
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/20'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10'}`}
                >
                  {getAccountIcon(source.value)}
                  <span>{source.label}</span>
                  <span className={`text-[10px] ${paymentSource === source.value ? 'text-white/80' : 'text-gray-400 dark:text-gray-500'}`}>
                    {formatCurrency(getBalance(source.value))}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Catatan</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contoh: Makan siang, Gaji"
            className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
          />
        </div>

        {/* Price & Quantity */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Jumlah (Rp)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
              required
              min="1"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Qty</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              required
              className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border-2 border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:border-indigo-500 transition-all text-center"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !price}
          className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40"
        >
          <Send size={18} />
          {loading ? 'Menyimpan...' : 'Simpan Transaksi'}
        </button>
      </form>
    </div>
  );
};

export default TransactionForm;
