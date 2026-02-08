import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { supabase } from './lib/supabase';
import { TransactionWithBalance, BalanceView, BalancePerAccount, TransactionFormData, TransferFormData } from './types/transaction';
import Header from './components/Header';
import BalanceCards from './components/BalanceCards';
import ExpenseChart from './components/ExpenseChart';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import TransferForm from './components/TransferForm';
import './App.css';

function App() {
  const [transactions, setTransactions] = useState<TransactionWithBalance[]>([]);
  const [balance, setBalance] = useState<BalanceView | null>(null);
  const [accountBalances, setAccountBalances] = useState<BalancePerAccount[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);

  const fetchTransactions = useCallback(async () => {
    setLoadingTransactions(true);
    try {
      const { data, error } = await supabase
        .from('transactions_with_balance')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
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
      setBalance(data || { total_income: 0, total_expense: 0, balance: 0 });
    } catch (error) {
      console.error('Error fetching balance:', error);
      setBalance({ total_income: 0, total_expense: 0, balance: 0 });
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
    } catch (error) {
      console.error('Error fetching account balances:', error);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
    fetchBalance();
    fetchAccountBalances();
  }, [fetchTransactions, fetchBalance, fetchAccountBalances]);

  const handleAddTransaction = async (formData: TransactionFormData) => {
    setSubmitting(true);
    try {
      const insertData: any = {
        type: formData.type,
        notes: formData.notes || null,
        price: formData.price,
        quantity: formData.quantity,
      };

      if (formData.type === 'expense') {
        insertData.expense_category = formData.expense_category;
        insertData.income_category = null;
      } else {
        insertData.income_category = formData.income_category;
        insertData.expense_category = null;
      }

      const { data: txData, error } = await supabase
        .from('transactions')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      // Insert into account_balances
      const total = formData.price * formData.quantity;
      if (formData.type === 'income') {
        // Income always goes to rekening
        const { error: abError } = await supabase
          .from('account_balances')
          .insert([{
            transaction_id: txData.id,
            account_type: 'rekening',
            amount: total,
            notes: `Income masuk ke rekening`,
          }]);
        if (abError) throw abError;
      } else {
        // Expense: deduct from selected payment source
        const paymentSource = formData.payment_source || 'rekening';
        const { error: abError } = await supabase
          .from('account_balances')
          .insert([{
            transaction_id: txData.id,
            account_type: paymentSource,
            amount: -total,
            notes: `Bayar dari ${paymentSource}`,
          }]);
        if (abError) throw abError;
      }

      await Promise.all([fetchTransactions(), fetchBalance(), fetchAccountBalances()]);
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('Gagal menyimpan transaksi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransfer = async (data: TransferFormData) => {
    setTransferring(true);
    try {
      const { error } = await supabase
        .from('account_balances')
        .insert([
          {
            account_type: data.from_account,
            amount: -data.amount,
            notes: data.notes || `Transfer ke ${data.to_account}`,
          },
          {
            account_type: data.to_account,
            amount: data.amount,
            notes: data.notes || `Transfer dari ${data.from_account}`,
          },
        ]);

      if (error) throw error;

      await Promise.all([fetchBalance(), fetchAccountBalances()]);
    } catch (error) {
      console.error('Error transferring:', error);
      alert('Gagal melakukan transfer');
    } finally {
      setTransferring(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm('Hapus transaksi ini?')) return;

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await Promise.all([fetchTransactions(), fetchBalance(), fetchAccountBalances()]);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Gagal menghapus transaksi');
    }
  };

  const handleEditTransaction = async (id: string, price: number, quantity: number) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ price, quantity })
        .eq('id', id);

      if (error) throw error;

      await Promise.all([fetchTransactions(), fetchBalance(), fetchAccountBalances()]);
    } catch (error) {
      console.error('Error updating transaction:', error);
      alert('Gagal mengubah transaksi');
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <BalanceCards balance={balance} loading={loadingBalance} accountBalances={accountBalances} />
        <ExpenseChart transactions={transactions} loading={loadingTransactions} />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <TransactionForm onSubmit={handleAddTransaction} loading={submitting} accountBalances={accountBalances} />
            
            {/* Transfer Toggle Button */}
            <button
              type="button"
              onClick={() => setShowTransfer(!showTransfer)}
              className={`w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 ${
                showTransfer
                  ? 'bg-white text-gray-500 hover:bg-gray-50 shadow-xl'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40'
              }`}
            >
              <ArrowLeftRight size={16} />
              {showTransfer ? 'Tutup Transfer' : 'Transfer Antar Akun'}
            </button>

            {/* Transfer Form (collapsible) */}
            {showTransfer && (
              <TransferForm onSubmit={handleTransfer} loading={transferring} accountBalances={accountBalances} />
            )}
          </div>
          <div className="lg:col-span-3">
            <TransactionList
              transactions={transactions}
              loading={loadingTransactions}
              onDelete={handleDeleteTransaction}
              onEdit={handleEditTransaction}
            />
          </div>
        </div>
      </main>
      <footer className="text-center py-6 text-white/40 text-sm">
        © 2025 Balance · Track your money smartly
      </footer>
    </div>
  );
}

export default App;
