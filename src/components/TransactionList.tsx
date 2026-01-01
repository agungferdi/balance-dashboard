import React, { useState } from 'react';
import { Trash2, Edit, Utensils, Car, Wrench, Gamepad2, Banknote, MoreHorizontal, Clock, X, Save } from 'lucide-react';
import { TransactionWithBalance } from '../types/transaction';

interface TransactionListProps {
  transactions: TransactionWithBalance[];
  loading: boolean;
  onDelete: (id: string) => Promise<void>;
  onEdit: (id: string, price: number, quantity: number) => Promise<void>;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const getCategoryIcon = (transaction: TransactionWithBalance) => {
  if (transaction.type === 'income') {
    if (transaction.income_category === 'Salary') return <Banknote size={18} />;
    return <MoreHorizontal size={18} />;
  }
  
  switch (transaction.expense_category) {
    case 'Foods': return <Utensils size={18} />;
    case 'Transportation': return <Car size={18} />;
    case 'Equipment': return <Wrench size={18} />;
    case 'Entertainment': return <Gamepad2 size={18} />;
    default: return <MoreHorizontal size={18} />;
  }
};

const getCategoryLabel = (transaction: TransactionWithBalance): string => {
  if (transaction.type === 'income') {
    return transaction.income_category || 'Income';
  }
  return transaction.expense_category || 'Expense';
};

const TransactionList: React.FC<TransactionListProps> = ({ transactions, loading, onDelete, onEdit }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editQuantity, setEditQuantity] = useState('');

  const startEditing = (transaction: TransactionWithBalance) => {
    setEditingId(transaction.id);
    setEditPrice(transaction.price.toString());
    setEditQuantity(transaction.quantity.toString());
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditPrice('');
    setEditQuantity('');
  };

  const saveEdit = async (id: string) => {
    const price = parseFloat(editPrice);
    const quantity = parseInt(editQuantity) || 1;
    
    if (price && price > 0) {
      await onEdit(id, price, quantity);
      cancelEditing();
    }
  };
  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Clock size={18} className="text-indigo-500" />
          <h2 className="text-lg font-bold text-gray-800">Riwayat Transaksi</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="px-6 py-4 animate-pulse flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-200 rounded-xl"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-28 mb-2"></div>
                <div className="h-3 bg-gray-100 rounded w-20"></div>
              </div>
              <div className="h-5 bg-gray-200 rounded w-24"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Clock size={18} className="text-indigo-500" />
          <h2 className="text-lg font-bold text-gray-800">Riwayat Transaksi</h2>
        </div>
        <div className="px-6 py-16 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clock size={28} className="text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">Belum ada transaksi</p>
          <p className="text-gray-400 text-sm mt-1">Mulai catat pengeluaran dan pemasukan Anda</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-indigo-500" />
          <h2 className="text-lg font-bold text-gray-800">Riwayat Transaksi</h2>
        </div>
        <span className="text-sm text-gray-400">{transactions.length} transaksi</span>
      </div>
      <div className="divide-y divide-gray-50 max-h-[480px] overflow-y-auto">
        {transactions.map((transaction) => (
          <div 
            key={transaction.id} 
            className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors group"
          >
            {editingId === transaction.id ? (
              // Edit Mode
              <>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  transaction.type === 'income' 
                    ? 'bg-emerald-100 text-emerald-600' 
                    : 'bg-rose-100 text-rose-600'
                }`}>
                  {getCategoryIcon(transaction)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-gray-800">
                      {getCategoryLabel(transaction)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="number"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        placeholder="Harga"
                        className="w-full px-3 py-1.5 text-sm border-2 border-indigo-200 rounded-lg focus:outline-none focus:border-indigo-500"
                        autoFocus
                      />
                    </div>
                    <div className="w-20">
                      <input
                        type="number"
                        value={editQuantity}
                        onChange={(e) => setEditQuantity(e.target.value)}
                        placeholder="Qty"
                        className="w-full px-3 py-1.5 text-sm border-2 border-indigo-200 rounded-lg focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => saveEdit(transaction.id)}
                    className="p-2 text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-all"
                    title="Simpan"
                  >
                    <Save size={16} />
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                    title="Batal"
                  >
                    <X size={16} />
                  </button>
                </div>
              </>
            ) : (
              // View Mode
              <>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  transaction.type === 'income' 
                    ? 'bg-emerald-100 text-emerald-600' 
                    : 'bg-rose-100 text-rose-600'
                }`}>
                  {getCategoryIcon(transaction)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800">
                      {getCategoryLabel(transaction)}
                    </span>
                    {transaction.notes && (
                      <span className="text-sm text-gray-400 truncate">
                        · {transaction.notes}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                    {formatDate(transaction.created_at)}
                    {transaction.quantity > 1 && (
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 ml-1">
                        ×{transaction.quantity}
                      </span>
                    )}
                  </p>
                </div>
                
                <span className={`text-sm font-bold whitespace-nowrap ${
                  transaction.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.total)}
                </span>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => startEditing(transaction)}
                    className="p-2 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all"
                    title="Edit"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => onDelete(transaction.id)}
                    className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                    title="Hapus"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransactionList;
