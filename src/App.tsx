import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeftRight, CloudOff, RefreshCw, X } from 'lucide-react';
import { supabase } from './lib/supabase';
import * as api from './lib/api';
import { readJson, writeJson } from './lib/storage';
import {
  PendingOp,
  getQueue,
  enqueue,
  subscribeQueue,
  syncQueue,
  applyPendingToTransactions,
  applyPendingToBalances,
} from './lib/offlineQueue';
import { notify, setInAppNotificationListener, checkSpendingAlerts } from './lib/notifications';
import { TransactionWithBalance, BalanceView, BalancePerAccount, TransactionFormData, TransferFormData } from './types/transaction';
import Header from './components/Header';
import BalanceCards from './components/BalanceCards';
import ExpenseChart from './components/ExpenseChart';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import TransferForm from './components/TransferForm';
import './App.css';

const getErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object') {
    const maybeError = error as { message?: string; details?: string; hint?: string };
    return maybeError.message || maybeError.details || maybeError.hint || 'Unknown error';
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error';
};

// Salinan data terakhir dari server, dipakai saat aplikasi dibuka offline.
const CACHE_KEYS = {
  transactions: 'balance-cache-transactions',
  balance: 'balance-cache-balance',
  accounts: 'balance-cache-accounts',
};

const EMPTY_BALANCE: BalanceView = { total_income: 0, total_expense: 0, balance: 0 };

interface Toast {
  id: number;
  title: string;
  body: string;
}

function App() {
  const [transactions, setTransactions] = useState<TransactionWithBalance[]>(() => readJson(CACHE_KEYS.transactions, []));
  const [balance, setBalance] = useState<BalanceView | null>(() => readJson<BalanceView | null>(CACHE_KEYS.balance, null));
  const [accountBalances, setAccountBalances] = useState<BalancePerAccount[]>(() => readJson(CACHE_KEYS.accounts, []));
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [pendingOps, setPendingOps] = useState<PendingOp[]>(getQueue);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => subscribeQueue(setPendingOps), []);

  useEffect(() => {
    setInAppNotificationListener((title, body) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, title, body }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 6000);
    });
    return () => setInAppNotificationListener(null);
  }, []);

  const fetchTransactions = useCallback(async () => {
    setLoadingTransactions(true);
    try {
      const { data, error } = await supabase
        .from('transactions_with_balance')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
      writeJson(CACHE_KEYS.transactions, data || []);
    } catch (error) {
      // Offline: tetap tampilkan data cache yang sudah dimuat saat inisialisasi.
      console.error('Error fetching transactions:', error);
    } finally {
      setLoadingTransactions(false);
    }
  }, []);

  const fetchBalance = useCallback(async () => {
    setLoadingBalance(true);
    try {
      const { data, error } = await supabase
        .from('balance_view')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setBalance(data || EMPTY_BALANCE);
      writeJson(CACHE_KEYS.balance, data || EMPTY_BALANCE);
    } catch (error) {
      console.error('Error fetching balance:', error);
      setBalance((prev) => prev || EMPTY_BALANCE);
    } finally {
      setLoadingBalance(false);
    }
  }, []);

  const fetchAccountBalances = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('balance_per_account')
        .select('*');

      if (error) throw error;
      setAccountBalances(data || []);
      writeJson(CACHE_KEYS.accounts, data || []);
    } catch (error) {
      console.error('Error fetching account balances:', error);
    }
  }, []);

  const refreshAll = useCallback(
    () => Promise.all([fetchTransactions(), fetchBalance(), fetchAccountBalances()]),
    [fetchTransactions, fetchBalance, fetchAccountBalances]
  );

  const runSync = useCallback(async () => {
    if (!navigator.onLine || getQueue().length === 0) return;
    setSyncing(true);
    try {
      const result = await syncQueue();
      if (result.synced > 0) {
        notify('Sinkronisasi selesai', `${result.synced} perubahan yang dicatat saat offline sudah tersimpan.`, 'sync');
      }
      if (result.failed > 0) {
        notify('Sebagian gagal disinkronkan', `${result.failed} perubahan ditolak server dan dibatalkan.`, 'sync-failed');
      }
      if (result.synced > 0 || result.failed > 0) {
        await refreshAll();
      }
    } finally {
      setSyncing(false);
    }
  }, [refreshAll]);

  useEffect(() => {
    refreshAll();
    runSync();
  }, [refreshAll, runSync]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      runSync().then(refreshAll);
    };
    const handleOffline = () => setIsOnline(false);
    const handleVisible = () => {
      if (document.visibilityState === 'visible') runSync();
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisible);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisible);
    };
  }, [runSync, refreshAll]);

  // Data yang ditampilkan = data server + perubahan yang masih menunggu sync.
  const displayTransactions = useMemo(
    () => applyPendingToTransactions(transactions, pendingOps),
    [transactions, pendingOps]
  );
  const displayAccountBalances = useMemo(
    () => applyPendingToBalances(accountBalances, pendingOps),
    [accountBalances, pendingOps]
  );
  const displayBalance = useMemo<BalanceView | null>(() => {
    if (!balance) return balance;
    const pendingAdds = pendingOps.filter((op): op is Extract<PendingOp, { kind: 'add' }> => op.kind === 'add');
    const sum = (type: 'income' | 'expense') =>
      pendingAdds.filter((op) => op.data.type === type).reduce((s, op) => s + op.data.price * op.data.quantity, 0);
    const income = sum('income');
    const expense = sum('expense');
    return {
      total_income: Number(balance.total_income) + income,
      total_expense: Number(balance.total_expense) + expense,
      balance: Number(balance.balance) + income - expense,
    };
  }, [balance, pendingOps]);
  const visibleTransactions = useMemo(() => displayTransactions.filter((t) => !t.is_hidden), [displayTransactions]);

  useEffect(() => {
    if (!loadingTransactions) checkSpendingAlerts(visibleTransactions);
  }, [visibleTransactions, loadingTransactions]);

  // Jalankan aksi langsung saat online; simpan ke antrean saat offline atau jaringan putus.
  const runOrQueue = async (op: PendingOp, action: () => Promise<void>) => {
    // Transaksi yang belum ter-sync belum ada di server — edit/hapus cukup di antrean.
    const targetsPending = getQueue().some((q) => (q.kind === 'add' || q.kind === 'transfer') && q.txId === op.txId);
    if (!navigator.onLine || targetsPending) {
      enqueue(op);
      return;
    }
    try {
      await action();
      await refreshAll();
    } catch (error) {
      if (api.isNetworkError(error)) {
        enqueue(op);
        return;
      }
      throw error;
    }
  };

  const handleAddTransaction = async (formData: TransactionFormData) => {
    setSubmitting(true);
    const txId = api.newId();
    const capturedAt = new Date().toISOString();
    try {
      await runOrQueue({ opId: api.newId(), kind: 'add', capturedAt, txId, data: formData }, () =>
        api.addTransaction(txId, formData)
      );
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('Gagal menyimpan transaksi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransfer = async (data: TransferFormData) => {
    setTransferring(true);
    const txId = api.newId();
    const capturedAt = new Date().toISOString();
    try {
      if (data.from_account === data.to_account) {
        throw new Error('Akun asal dan tujuan tidak boleh sama');
      }
      if (!Number.isFinite(data.amount) || data.amount <= 0) {
        throw new Error('Jumlah transfer harus lebih dari 0');
      }
      await runOrQueue({ opId: api.newId(), kind: 'transfer', capturedAt, txId, data }, () => api.transfer(txId, data));
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('Error transferring:', { raw: error, message });
      alert(`Gagal melakukan transfer: ${message}`);
    } finally {
      setTransferring(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm('Hapus transaksi ini?')) return;

    try {
      await runOrQueue({ opId: api.newId(), kind: 'delete', capturedAt: new Date().toISOString(), txId: id }, () =>
        api.deleteTransaction(id)
      );
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Gagal menghapus transaksi');
    }
  };

  const handleEditTransaction = async (id: string, price: number, quantity: number) => {
    try {
      await runOrQueue(
        { opId: api.newId(), kind: 'edit', capturedAt: new Date().toISOString(), txId: id, price, quantity },
        () => api.editTransaction(id, price, quantity)
      );
    } catch (error) {
      console.error('Error updating transaction:', error);
      alert('Gagal mengubah transaksi');
    }
  };

  return (
    <div className="min-h-screen">
      <Header />

      {(!isOnline || pendingOps.length > 0) && (
        <div
          className={`text-xs font-medium ${
            isOnline
              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
              : 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300'
          }`}
        >
          <div className="max-w-5xl mx-auto px-4 py-2 flex items-center gap-2">
            {isOnline ? <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} /> : <CloudOff size={14} />}
            <span className="flex-1">
              {!isOnline
                ? `Offline — perubahan disimpan di perangkat${pendingOps.length ? ` (${pendingOps.length} menunggu)` : ''} dan otomatis disinkronkan saat online.`
                : syncing
                  ? `Menyinkronkan ${pendingOps.length} perubahan...`
                  : `${pendingOps.length} perubahan menunggu sinkronisasi.`}
            </span>
            {isOnline && !syncing && pendingOps.length > 0 && (
              <button onClick={runSync} className="underline font-semibold">
                Sync sekarang
              </button>
            )}
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 py-8">
        <BalanceCards balance={displayBalance} loading={loadingBalance && !balance} accountBalances={displayAccountBalances} />
        <ExpenseChart transactions={visibleTransactions} loading={loadingTransactions && transactions.length === 0} />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <TransactionForm onSubmit={handleAddTransaction} loading={submitting} accountBalances={displayAccountBalances} />

            {/* Transfer Toggle Button */}
            <button
              type="button"
              onClick={() => setShowTransfer(!showTransfer)}
              className={`w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 ${
                showTransfer
                  ? 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200 dark:bg-[#1a1a24] dark:text-gray-400 dark:hover:bg-[#1e1e28] dark:border-white/5'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30'
              }`}
            >
              <ArrowLeftRight size={16} />
              {showTransfer ? 'Tutup Transfer' : 'Transfer Antar Akun'}
            </button>

            {/* Transfer Form (collapsible) */}
            {showTransfer && (
              <TransferForm onSubmit={handleTransfer} loading={transferring} accountBalances={displayAccountBalances} />
            )}
          </div>
          <div className="lg:col-span-3">
            <TransactionList
              transactions={displayTransactions}
              loading={loadingTransactions && transactions.length === 0}
              onDelete={handleDeleteTransaction}
              onEdit={handleEditTransaction}
            />
          </div>
        </div>
      </main>
      <footer className="text-center py-6 text-gray-400 dark:text-gray-600 text-sm">
        © 2025 Balance · Track your money smartly
      </footer>

      {/* In-app notifications (fallback ketika izin notifikasi belum diberikan) */}
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:w-80 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="bg-white dark:bg-[#1a1a24] border border-gray-100 dark:border-white/10 shadow-xl rounded-xl p-3 flex items-start gap-2"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 dark:text-white">{toast.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{toast.body}</p>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
