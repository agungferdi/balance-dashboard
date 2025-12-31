import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabase';
import { TransactionWithBalance, BalanceView, TransactionFormData } from './types/transaction';
import Header from './components/Header';
import BalanceCards from './components/BalanceCards';
import ExpenseChart from './components/ExpenseChart';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import './App.css';

function App() {
  const [transactions, setTransactions] = useState<TransactionWithBalance[]>([]);
  const [balance, setBalance] = useState<BalanceView | null>(null);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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

  useEffect(() => {
    fetchTransactions();
    fetchBalance();
  }, [fetchTransactions, fetchBalance]);

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

      const { error } = await supabase
        .from('transactions')
        .insert([insertData]);

      if (error) throw error;

      await Promise.all([fetchTransactions(), fetchBalance()]);
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('Gagal menyimpan transaksi');
    } finally {
      setSubmitting(false);
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

      await Promise.all([fetchTransactions(), fetchBalance()]);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Gagal menghapus transaksi');
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <BalanceCards balance={balance} loading={loadingBalance} />
        <ExpenseChart transactions={transactions} loading={loadingTransactions} />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2">
            <TransactionForm onSubmit={handleAddTransaction} loading={submitting} />
          </div>
          <div className="lg:col-span-3">
            <TransactionList
              transactions={transactions}
              loading={loadingTransactions}
              onDelete={handleDeleteTransaction}
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
