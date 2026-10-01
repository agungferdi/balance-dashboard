import { supabase } from './supabase';
import { TransactionFormData, TransferFormData } from '../types/transaction';

// ID dibuat di klien agar operasi yang di-sync ulang tidak membuat data ganda:
// insert kedua dengan ID yang sama gagal dengan unique violation (23505) dan dianggap sudah tersimpan.
export const newId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
};

const UNIQUE_VIOLATION = '23505';

export const isNetworkError = (error: unknown): boolean => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  const message =
    error && typeof error === 'object' && 'message' in error ? String((error as { message: unknown }).message) : String(error);
  return /failed to fetch|networkerror|network request failed|load failed/i.test(message);
};

export async function addTransaction(id: string, formData: TransactionFormData, createdAt?: string): Promise<void> {
  const insertData: Record<string, unknown> = {
    id,
    type: formData.type,
    notes: formData.notes || null,
    price: formData.price,
    quantity: formData.quantity,
    expense_category: formData.type === 'expense' ? formData.expense_category : null,
    income_category: formData.type === 'expense' ? null : formData.income_category,
  };
  if (createdAt) insertData.created_at = createdAt;

  const { error } = await supabase.from('transactions').insert([insertData]);
  if (error) {
    if (error.code === UNIQUE_VIOLATION) return;
    throw error;
  }

  const total = formData.price * formData.quantity;
  // Income selalu masuk ke rekening; expense dipotong dari sumber pembayaran.
  const accountType = formData.type === 'income' ? 'rekening' : formData.payment_source || 'rekening';
  const { error: abError } = await supabase.from('account_balances').insert([
    {
      transaction_id: id,
      account_type: accountType,
      amount: formData.type === 'income' ? total : -total,
      notes: formData.type === 'income' ? 'Income masuk ke rekening' : `Bayar dari ${accountType}`,
      ...(createdAt ? { created_at: createdAt } : {}),
    },
  ]);

  if (abError) {
    // Roll back agar tidak ada transaksi tanpa mutasi saldo.
    await supabase.from('transactions').delete().eq('id', id);
    throw abError;
  }
}

export async function transfer(id: string, data: TransferFormData, createdAt?: string): Promise<void> {
  if (data.from_account === data.to_account) {
    throw new Error('Akun asal dan tujuan tidak boleh sama');
  }
  if (!Number.isFinite(data.amount) || data.amount <= 0) {
    throw new Error('Jumlah transfer harus lebih dari 0');
  }

  const { error: transferTxError } = await supabase.from('transactions').insert([
    {
      id,
      type: 'transfer',
      from_account: data.from_account,
      to_account: data.to_account,
      notes: data.notes || `Transfer ${data.from_account} ke ${data.to_account}`,
      price: data.amount,
      quantity: 1,
      expense_category: null,
      income_category: null,
      ...(createdAt ? { created_at: createdAt } : {}),
    },
  ]);

  if (transferTxError) {
    if (transferTxError.code === UNIQUE_VIOLATION) return;
    throw transferTxError;
  }

  const { error: accountBalanceError } = await supabase.from('account_balances').insert([
    {
      transaction_id: id,
      account_type: data.from_account,
      amount: -data.amount,
      notes: data.notes || `Transfer ke ${data.to_account}`,
      ...(createdAt ? { created_at: createdAt } : {}),
    },
    {
      transaction_id: id,
      account_type: data.to_account,
      amount: data.amount,
      notes: data.notes || `Transfer dari ${data.from_account}`,
      ...(createdAt ? { created_at: createdAt } : {}),
    },
  ]);

  if (accountBalanceError) {
    // Roll back transfer transaction to avoid leaving half-complete data.
    await supabase.from('transactions').delete().eq('id', id);
    throw accountBalanceError;
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
}

export async function editTransaction(id: string, price: number, quantity: number): Promise<void> {
  const { error } = await supabase.from('transactions').update({ price, quantity }).eq('id', id);
  if (error) throw error;
}
