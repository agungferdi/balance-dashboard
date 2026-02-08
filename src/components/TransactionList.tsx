import React, { useState, useEffect } from 'react';
import { Trash2, Edit, Utensils, Car, Wrench, Gamepad2, Banknote, MoreHorizontal, Clock, X, Save, Wallet, CreditCard, PiggyBank } from 'lucide-react';
import { TransactionWithBalance, AccountType } from '../types/transaction';
import { supabase } from '../lib/supabase';

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

const getAccountBadge = (accountType: AccountType) => {
  switch (accountType) {
    case 'rekening':
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-500/15 text-indigo-400">
          <Wallet size={10} /> Rek
        </span>
      );
    case 'dana':
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/15 text-blue-400">
          <CreditCard size={10} /> Dana
        </span>
      );
    case 'pocket':
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-400">
          <PiggyBank size={10} /> Pocket
        </span>
      );
    default:
      return null;
  }
};

const TransactionList: React.FC<TransactionListProps> = ({ transactions, loading, onDelete, onEdit }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [accountMap, setAccountMap] = useState<Record<string, AccountType>>({});

  // Fetch account_balances to know which account each transaction used
  useEffect(() => {
    const fetchAccountInfo = async () => {
      if (transactions.length === 0) return;
      const txIds = transactions.map(t => t.id);
      const { data, error } = await supabase
        .from('account_balances')
        .select('transaction_id, account_type')
        .in('transaction_id', txIds);
      
      if (!error && data) {
        const map: Record<string, AccountType> = {};
        data.forEach(row => {
          if (row.transaction_id) {
            map[row.transaction_id] = row.account_type as AccountType;
          }
        });
        setAccountMap(map);
      }
    };
    fetchAccountInfo();
  }, [transactions]);

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
      <div className="bg-[#1a1a24] rounded-2xl shadow-[0_0_30px_rgba(139,92,246,0.05)] border border-white/5 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
          <Clock size={18} className="text-violet-400" />
          <h2 className="text-lg font-bold text-white">Riwayat Transaksi</h2>
        </div>
        <div className="divide-y divide-white/5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="px-6 py-4 animate-pulse flex items-center gap-4">
              <div className="w-10 h-10 bg-white/10 rounded-xl"></div>
              <div className="flex-1">
                <div className="h-4 bg-white/10 rounded w-28 mb-2"></div>
                <div className="h-3 bg-white/5 rounded w-20"></div>
              </div>
              <div className="h-5 bg-white/10 rounded w-24"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-[#1a1a24] rounded-2xl shadow-[0_0_30px_rgba(139,92,246,0.05)] border border-white/5 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
          <Clock size={18} className="text-violet-400" />
          <h2 className="text-lg font-bold text-white">Riwayat Transaksi</h2>
        </div>
        <div className="px-6 py-16 text-center">
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clock size={28} className="text-gray-600" />
          </div>
          <p className="text-gray-400 font-medium">Belum ada transaksi</p>
          <p className="text-gray-600 text-sm mt-1">Mulai catat pengeluaran dan pemasukan Anda</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1a24] rounded-2xl shadow-[0_0_30px_rgba(139,92,246,0.05)] border border-white/5 overflow-hidden">
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-violet-400" />
          <h2 className="text-lg font-bold text-white">Riwayat Transaksi</h2>
        </div>
        <span className="text-sm text-gray-500">{transactions.length} transaksi</span>
      </div>
      <div className="divide-y divide-white/5 max-h-[480px] overflow-y-auto">
        {transactions.map((transaction) => (
          <div 
            key={transaction.id} 
            className="px-6 py-4 flex items-center gap-4 hover:bg-white/[0.03] transition-colors group"
          >
            {editingId === transaction.id ? (
              // Edit Mode
              <>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  transaction.type === 'income' 
                    ? 'bg-emerald-500/15 text-emerald-400' 
                    : 'bg-rose-500/15 text-rose-400'
                }`}>
                  {getCategoryIcon(transaction)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-gray-200">
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
                        className="w-full px-3 py-1.5 text-sm bg-white/5 border-2 border-indigo-500/30 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500"
                        autoFocus
                      />
                    </div>
                    <div className="w-20">
                      <input
                        type="number"
                        value={editQuantity}
                        onChange={(e) => setEditQuantity(e.target.value)}
                        placeholder="Qty"
                        className="w-full px-3 py-1.5 text-sm bg-white/5 border-2 border-indigo-500/30 rounded-lg text-gray-200 focus:outline-none focus:border-indigo-500"
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
                    className="p-2 text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded-lg transition-all"
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
                    ? 'bg-emerald-500/15 text-emerald-400' 
                    : 'bg-rose-500/15 text-rose-400'
                }`}>
                  {getCategoryIcon(transaction)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-200">
                      {getCategoryLabel(transaction)}
                    </span>
                    {transaction.notes && (
                      <span className="text-sm text-gray-500 truncate">
                        · {transaction.notes}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                    {formatDate(transaction.created_at)}
                    {transaction.quantity > 1 && (
                      <span className="bg-white/5 px-1.5 py-0.5 rounded text-gray-400 ml-1">
                        ×{transaction.quantity}
                      </span>
                    )}
                    {accountMap[transaction.id] && (
                      <span className="ml-1">
                        {getAccountBadge(accountMap[transaction.id])}
                      </span>
                    )}
                  </p>
                </div>
                
                <span className={`text-sm font-bold whitespace-nowrap ${
                  transaction.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.total)}
                </span>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => startEditing(transaction)}
                    className="p-2 text-gray-600 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all"
                    title="Edit"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => onDelete(transaction.id)}
                    className="p-2 text-gray-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
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
