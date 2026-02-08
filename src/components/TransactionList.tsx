import React, { useState, useEffect, useMemo } from 'react';
import { Trash2, Edit, Utensils, Car, Wrench, Gamepad2, Banknote, MoreHorizontal, Clock, X, Save, Wallet, CreditCard, PiggyBank, Search, Filter } from 'lucide-react';
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
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
          <Wallet size={10} /> Rek
        </span>
      );
    case 'dana':
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
          <CreditCard size={10} /> Dana
        </span>
      );
    case 'pocket':
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
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
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const ALL_CATEGORIES = [
    { value: 'all', label: 'Semua' },
    { value: 'income', label: 'Pemasukan', group: 'type' },
    { value: 'expense', label: 'Pengeluaran', group: 'type' },
    { value: 'Foods', label: 'Foods', group: 'expense' },
    { value: 'Transportation', label: 'Transport', group: 'expense' },
    { value: 'Equipment', label: 'Equipment', group: 'expense' },
    { value: 'Entertainment', label: 'Entertain', group: 'expense' },
    { value: 'Salary', label: 'Salary', group: 'income' },
    { value: 'Etc', label: 'Etc', group: 'income' },
  ];

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNotes = t.notes?.toLowerCase().includes(q);
        const matchCategory = (t.expense_category || t.income_category || '').toLowerCase().includes(q);
        const matchAmount = formatCurrency(t.total).toLowerCase().includes(q);
        if (!matchNotes && !matchCategory && !matchAmount) return false;
      }
      // Category filter
      if (categoryFilter !== 'all') {
        if (categoryFilter === 'income') return t.type === 'income';
        if (categoryFilter === 'expense') return t.type === 'expense';
        return t.expense_category === categoryFilter || t.income_category === categoryFilter;
      }
      return true;
    });
  }, [transactions, searchQuery, categoryFilter]);

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
      <div className="bg-white dark:bg-[#1a1a24] rounded-2xl shadow-sm dark:shadow-[0_0_30px_rgba(139,92,246,0.05)] border border-gray-100 dark:border-white/5 overflow-hidden transition-colors duration-300">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5 flex items-center gap-2">
          <Clock size={18} className="text-violet-500 dark:text-violet-400" />
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">Riwayat Transaksi</h2>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-white/5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="px-6 py-4 animate-pulse flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-200 dark:bg-white/10 rounded-xl"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-28 mb-2"></div>
                <div className="h-3 bg-gray-100 dark:bg-white/5 rounded w-20"></div>
              </div>
              <div className="h-5 bg-gray-200 dark:bg-white/10 rounded w-24"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-white dark:bg-[#1a1a24] rounded-2xl shadow-sm dark:shadow-[0_0_30px_rgba(139,92,246,0.05)] border border-gray-100 dark:border-white/5 overflow-hidden transition-colors duration-300">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5 flex items-center gap-2">
          <Clock size={18} className="text-violet-500 dark:text-violet-400" />
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">Riwayat Transaksi</h2>
        </div>
        <div className="px-6 py-16 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clock size={28} className="text-gray-300 dark:text-gray-600" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Belum ada transaksi</p>
          <p className="text-gray-400 dark:text-gray-600 text-sm mt-1">Mulai catat pengeluaran dan pemasukan Anda</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1a1a24] rounded-2xl shadow-sm dark:shadow-[0_0_30px_rgba(139,92,246,0.05)] border border-gray-100 dark:border-white/5 overflow-hidden transition-colors duration-300">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-violet-500 dark:text-violet-400" />
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">Riwayat Transaksi</h2>
        </div>
        <span className="text-sm text-gray-400 dark:text-gray-500">{filteredTransactions.length} / {transactions.length}</span>
      </div>

      {/* Search & Filter Bar */}
      <div className="px-6 py-3 border-b border-gray-100 dark:border-white/5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari transaksi..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 rounded-xl border transition-all ${
              showFilters || categoryFilter !== 'all'
                ? 'bg-indigo-50 border-indigo-200 text-indigo-500 dark:bg-indigo-500/15 dark:border-indigo-500/30 dark:text-indigo-400'
                : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-gray-600 dark:bg-white/5 dark:border-white/10 dark:text-gray-500 dark:hover:text-gray-300'
            }`}
          >
            <Filter size={14} />
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-1.5">
            {ALL_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategoryFilter(cat.value)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  categoryFilter === cat.value
                    ? 'bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-400 dark:border-indigo-500/30'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-transparent dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {filteredTransactions.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="text-gray-400 dark:text-gray-500 text-sm">
            {searchQuery || categoryFilter !== 'all' 
              ? 'Tidak ada transaksi yang cocok' 
              : 'Belum ada transaksi'}
          </p>
        </div>
      ) : (
      <div className="divide-y divide-gray-100 dark:divide-white/5 max-h-[480px] overflow-y-auto">
        {filteredTransactions.map((transaction) => (
          <div 
            key={transaction.id} 
            className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors group"
          >
            {editingId === transaction.id ? (
              // Edit Mode
              <>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  transaction.type === 'income' 
                    ? 'bg-emerald-50 text-emerald-500 dark:bg-emerald-500/15 dark:text-emerald-400' 
                    : 'bg-rose-50 text-rose-500 dark:bg-rose-500/15 dark:text-rose-400'
                }`}>
                  {getCategoryIcon(transaction)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
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
                        className="w-full px-3 py-1.5 text-sm bg-gray-50 dark:bg-white/5 border-2 border-indigo-300 dark:border-indigo-500/30 rounded-lg text-gray-700 dark:text-gray-200 focus:outline-none focus:border-indigo-500"
                        autoFocus
                      />
                    </div>
                    <div className="w-20">
                      <input
                        type="number"
                        value={editQuantity}
                        onChange={(e) => setEditQuantity(e.target.value)}
                        placeholder="Qty"
                        className="w-full px-3 py-1.5 text-sm bg-gray-50 dark:bg-white/5 border-2 border-indigo-300 dark:border-indigo-500/30 rounded-lg text-gray-700 dark:text-gray-200 focus:outline-none focus:border-indigo-500"
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
                    className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-all"
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
                    ? 'bg-emerald-50 text-emerald-500 dark:bg-emerald-500/15 dark:text-emerald-400' 
                    : 'bg-rose-50 text-rose-500 dark:bg-rose-500/15 dark:text-rose-400'
                }`}>
                  {getCategoryIcon(transaction)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      {getCategoryLabel(transaction)}
                    </span>
                    {transaction.notes && (
                      <span className="text-sm text-gray-400 dark:text-gray-500 truncate">
                        · {transaction.notes}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-1">
                    {formatDate(transaction.created_at)}
                    {transaction.quantity > 1 && (
                      <span className="bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded text-gray-500 dark:text-gray-400 ml-1">
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
                  transaction.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.total)}
                </span>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => startEditing(transaction)}
                    className="p-2 text-gray-300 dark:text-gray-600 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-all"
                    title="Edit"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => onDelete(transaction.id)}
                    className="p-2 text-gray-300 dark:text-gray-600 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all"
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
      )}
    </div>
  );
};

export default TransactionList;
