import React, { useState } from 'react';
import { Plus, Minus, Send } from 'lucide-react';
import {
  TransactionType,
  ExpenseCategory,
  IncomeCategory,
  TransactionFormData,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from '../types/transaction';

interface TransactionFormProps {
  onSubmit: (data: TransactionFormData) => Promise<void>;
  loading: boolean;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ onSubmit, loading }) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('Foods');
  const [incomeCategory, setIncomeCategory] = useState<IncomeCategory>('Salary');
  const [notes, setNotes] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');

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
    } else {
      formData.income_category = incomeCategory;
    }

    await onSubmit(formData);
    setNotes('');
    setPrice('');
    setQuantity('1');
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-xl">
      <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
          <Plus size={16} className="text-white" />
        </div>
        Transaksi Baru
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Type Toggle */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200
              ${type === 'expense' 
                ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/30' 
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
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
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            <Plus size={18} />
            Pemasukan
          </button>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Kategori</label>
          {type === 'expense' ? (
            <select
              value={expenseCategory}
              onChange={(e) => setExpenseCategory(e.target.value as ExpenseCategory)}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          ) : (
            <select
              value={incomeCategory}
              onChange={(e) => setIncomeCategory(e.target.value as IncomeCategory)}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
            >
              {INCOME_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Catatan</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contoh: Makan siang, Gaji"
            className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder:text-gray-400"
          />
        </div>

        {/* Price & Quantity */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Jumlah (Rp)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
              required
              min="1"
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder:text-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Qty</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              required
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-center"
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
