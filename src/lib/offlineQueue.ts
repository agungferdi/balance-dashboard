import { readJson, writeJson } from './storage';
import { addTransaction, transfer, deleteTransaction, editTransaction, isNetworkError } from './api';
import {
  TransactionFormData,
  TransferFormData,
  TransactionWithBalance,
  BalancePerAccount,
  AccountType,
} from '../types/transaction';

export type PendingOp =
  | { opId: string; kind: 'add'; capturedAt: string; txId: string; data: TransactionFormData }
  | { opId: string; kind: 'transfer'; capturedAt: string; txId: string; data: TransferFormData }
  | { opId: string; kind: 'delete'; capturedAt: string; txId: string }
  | { opId: string; kind: 'edit'; capturedAt: string; txId: string; price: number; quantity: number };

const QUEUE_KEY = 'balance-outbox';

type Listener = (ops: PendingOp[]) => void;
const listeners = new Set<Listener>();

export const getQueue = (): PendingOp[] => readJson<PendingOp[]>(QUEUE_KEY, []);

const saveQueue = (ops: PendingOp[]) => {
  writeJson(QUEUE_KEY, ops);
  listeners.forEach((l) => l(ops));
};

export const subscribeQueue = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const enqueue = (op: PendingOp): void => {
  const queue = getQueue();

  // Hapus/edit transaksi yang belum pernah ter-sync cukup diselesaikan di antrean.
  if (op.kind === 'delete' || op.kind === 'edit') {
    const pendingAdd = queue.find((q) => (q.kind === 'add' || q.kind === 'transfer') && q.txId === op.txId);
    if (pendingAdd) {
      if (op.kind === 'delete') {
        saveQueue(queue.filter((q) => q.txId !== op.txId));
      } else if (pendingAdd.kind === 'add') {
        saveQueue(
          queue.map((q) =>
            q.opId === pendingAdd.opId && q.kind === 'add'
              ? { ...q, data: { ...q.data, price: op.price, quantity: op.quantity } }
              : q
          )
        );
      }
      return;
    }
  }

  saveQueue([...queue, op]);
};

const runOp = async (op: PendingOp): Promise<void> => {
  switch (op.kind) {
    case 'add':
      return addTransaction(op.txId, op.data, op.capturedAt);
    case 'transfer':
      return transfer(op.txId, op.data, op.capturedAt);
    case 'delete':
      return deleteTransaction(op.txId);
    case 'edit':
      return editTransaction(op.txId, op.price, op.quantity);
  }
};

export interface SyncResult {
  synced: number;
  failed: number;
  remaining: number;
}

let syncing: Promise<SyncResult> | null = null;

// Dijalankan berurutan sesuai urutan input. Error jaringan menghentikan sync (dicoba lagi nanti);
// error data (mis. ditolak database) membuang operasi itu agar antrean tidak macet selamanya.
export const syncQueue = (): Promise<SyncResult> => {
  if (syncing) return syncing;

  syncing = (async () => {
    let synced = 0;
    let failed = 0;

    for (const op of getQueue()) {
      if (!navigator.onLine) break;
      try {
        await runOp(op);
        synced++;
      } catch (error) {
        if (isNetworkError(error)) break;
        console.error('Dropping pending operation that the server rejected:', op, error);
        failed++;
      }
      saveQueue(getQueue().filter((q) => q.opId !== op.opId));
    }

    return { synced, failed, remaining: getQueue().length };
  })().finally(() => {
    syncing = null;
  });

  return syncing;
};

// ===== Tampilan optimistis untuk data yang belum ter-sync =====

export const applyPendingToTransactions = (
  transactions: TransactionWithBalance[],
  ops: PendingOp[]
): TransactionWithBalance[] => {
  const deleted = new Set(ops.filter((o) => o.kind === 'delete').map((o) => o.txId));
  const edits = new Map(
    ops.filter((o): o is Extract<PendingOp, { kind: 'edit' }> => o.kind === 'edit').map((o) => [o.txId, o])
  );

  const pending: TransactionWithBalance[] = ops.flatMap((op): TransactionWithBalance[] => {
    if (op.kind === 'add') {
      return [
        {
          id: op.txId,
          type: op.data.type,
          expense_category: op.data.type === 'expense' ? op.data.expense_category ?? null : null,
          income_category: op.data.type === 'expense' ? null : op.data.income_category ?? null,
          from_account: op.data.type === 'expense' ? op.data.payment_source || 'rekening' : null,
          to_account: op.data.type === 'income' ? 'rekening' : null,
          notes: op.data.notes || null,
          price: op.data.price,
          quantity: op.data.quantity,
          total: op.data.price * op.data.quantity,
          created_at: op.capturedAt,
          running_balance: 0,
          is_pending: true,
        },
      ];
    }
    if (op.kind === 'transfer') {
      return [
        {
          id: op.txId,
          type: 'transfer',
          expense_category: null,
          income_category: null,
          from_account: op.data.from_account,
          to_account: op.data.to_account,
          notes: op.data.notes || `Transfer ${op.data.from_account} ke ${op.data.to_account}`,
          price: op.data.amount,
          quantity: 1,
          total: op.data.amount,
          created_at: op.capturedAt,
          running_balance: 0,
          is_pending: true,
        },
      ];
    }
    return [];
  });

  const server = transactions
    .filter((t) => !deleted.has(t.id))
    .map((t) => {
      const edit = edits.get(t.id);
      return edit ? { ...t, price: edit.price, quantity: edit.quantity, total: edit.price * edit.quantity, is_pending: true } : t;
    });

  return [...pending, ...server].sort((a, b) => b.created_at.localeCompare(a.created_at));
};

export const applyPendingToBalances = (balances: BalancePerAccount[], ops: PendingOp[]): BalancePerAccount[] => {
  const result = new Map<AccountType, number>(balances.map((b) => [b.account_type, Number(b.balance)]));
  const add = (account: AccountType, amount: number) => result.set(account, (result.get(account) || 0) + amount);

  ops.forEach((op) => {
    if (op.kind === 'add') {
      const total = op.data.price * op.data.quantity;
      if (op.data.type === 'income') add('rekening', total);
      else add(op.data.payment_source || 'rekening', -total);
    } else if (op.kind === 'transfer') {
      add(op.data.from_account, -op.data.amount);
      add(op.data.to_account, op.data.amount);
    }
  });

  return Array.from(result.entries()).map(([account_type, balance]) => ({ account_type, balance }));
};
