import React, { useRef, useState } from 'react';
import { Plus, Minus, Send, Wallet, CreditCard, PiggyBank, Camera, Upload, Loader2, ScanLine, X } from 'lucide-react';
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
  { value: 'Gopay', label: 'Gopay' },
  { value: 'Shopeepay', label: 'ShopeePay' },
  { value: 'pocket', label: 'Pocket' },
];

const getAccountIcon = (accountType: AccountType) => {
  switch (accountType) {
    case 'rekening':
      return <Wallet size={12} />;
    case 'pocket':
      return <PiggyBank size={12} />;
    default:
      return <CreditCard size={12} />;
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
  const [scanStatus, setScanStatus] = useState('');
  const [scanMessage, setScanMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [scanCandidates, setScanCandidates] = useState<number[]>([]);
  const [scanRawText, setScanRawText] = useState('');
  const [showRawText, setShowRawText] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const clearScan = () => {
    setScanMessage(null);
    setScanCandidates([]);
    setScanRawText('');
    setShowRawText(false);
  };

  const handleReceiptSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setScanning(true);
    setScanProgress(0);
    setScanStatus('Menyiapkan gambar');
    clearScan();
    try {
      const result = await scanReceipt(file, (progress, status) => {
        setScanProgress(progress);
        setScanStatus(status === 'recognizing text' ? 'Membaca teks' : 'Menyiapkan gambar');
      });
      setScanRawText(result.rawText);

      if (!result.total) {
        setScanCandidates(result.candidates);
        setScanMessage({
          kind: 'error',
          text: result.candidates.length
            ? 'Total tidak terbaca otomatis. Pilih nominal yang benar di bawah, atau isi manual.'
            : 'Total tidak terbaca. Coba foto ulang: struk lurus, terang, dan memenuhi frame. Atau isi manual.',
        });
        notify('Scan struk gagal', 'Total tidak terbaca dari foto struk.', 'receipt');
        return;
      }

      setType('expense');
      if (result.category) setExpenseCategory(result.category);
      setPrice(String(result.total));
      setQuantity('1');
      setNotes(result.merchant ? `${result.merchant} (struk)` : 'Struk');

      const summary = `${formatCurrency(result.total)}${result.merchant ? ` · ${result.merchant}` : ''}${result.category ? ` · ${result.category}` : ''}`;
      setScanMessage({
        kind: 'success',
        text: `Terbaca: ${summary}. ${result.confident ? 'Cocok dengan tunai − kembali. ' : 'Mohon periksa angkanya. '}Lalu tekan Simpan.`,
      });
      if (!result.confident) setScanCandidates(result.candidates.filter((c) => c !== result.total));
      notify('Struk berhasil dibaca', summary, 'receipt');
    } catch (error) {
      console.error('Receipt scan failed:', error);
      const detail = error instanceof Error ? error.message : String(error);
      const offlineHint = navigator.onLine ? '' : ' Saat offline, scan hanya bisa dipakai jika engine OCR sudah pernah diunduh.';
      setScanMessage({ kind: 'error', text: `Gagal memproses struk (${detail}).${offlineHint}` });
      notify('Scan struk gagal', 'Struk tidak bisa diproses.', 'receipt');
    } finally {
      setScanning(false);
    }
  };

  const pickCandidate = (amount: number) => {
    setType('expense');
    setPrice(String(amount));
    setQuantity('1');
    setScanMessage({ kind: 'success', text: `Total diset ke ${formatCurrency(amount)}. Periksa lalu tekan Simpan.` });
    setScanCandidates([]);
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
    clearScan();
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
          {/* Kamera langsung (HP) dan unggah dari galeri/file dipisah: capture memaksa kamera. */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleReceiptSelected}
            className="hidden"
          />
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            onChange={handleReceiptSelected}
            className="hidden"
          />
          {scanning ? (
            <div className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border-2 border-dashed border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-500/5">
              <Loader2 size={16} className="animate-spin" />
              {scanStatus}... {scanProgress > 0 ? `${Math.round(scanProgress * 100)}%` : ''}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border-2 border-dashed border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-500/5 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all"
              >
                <Camera size={16} />
                Foto Struk
              </button>
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                className="py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border-2 border-dashed border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-500/5 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all"
              >
                <Upload size={16} />
                Upload Struk
              </button>
            </div>
          )}
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
              <button type="button" onClick={clearScan} className="shrink-0 opacity-60 hover:opacity-100">
                <X size={12} />
              </button>
            </div>
          )}
          {scanCandidates.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {scanCandidates.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => pickCandidate(amount)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-indigo-500/15 dark:hover:text-indigo-300 transition-all"
                >
                  {formatCurrency(amount)}
                </button>
              ))}
            </div>
          )}
          {scanRawText && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setShowRawText((prev) => !prev)}
                className="text-[11px] text-gray-400 dark:text-gray-500 underline"
              >
                {showRawText ? 'Sembunyikan teks hasil scan' : 'Lihat teks hasil scan'}
              </button>
              {showRawText && (
                <pre className="mt-1 max-h-40 overflow-auto p-2 rounded-lg bg-gray-50 dark:bg-white/5 text-[10px] leading-tight text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {scanRawText}
                </pre>
              )}
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
            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Bayar Dari</label>
            <div className="grid grid-cols-4 gap-1.5">
              {PAYMENT_SOURCES.map((source) => (
                <button
                  key={source.value}
                  type="button"
                  onClick={() => setPaymentSource(source.value)}
                  className={`flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg text-[11px] font-semibold min-w-0 transition-all duration-200
                    ${paymentSource === source.value
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/20'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10'}`}
                >
                  {getAccountIcon(source.value)}
                  <span className="truncate max-w-full">{source.label}</span>
                  <span className={`text-[9px] truncate max-w-full ${paymentSource === source.value ? 'text-white/80' : 'text-gray-400 dark:text-gray-500'}`}>
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
