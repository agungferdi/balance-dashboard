export type TransactionType = 'income' | 'expense' | 'transfer';

export type ExpenseCategory = 'Foods' | 'Transportation' | 'Equipment' | 'Entertainment';

export type IncomeCategory = 'Salary' | 'Etc';

export type AccountType =
  | 'rekening'
  | 'dana'
  | 'pocket'
  | 'Saham'
  | 'Crypto'
  | 'Futures'
  | 'Jago'
  | 'Gopay'
  | 'Reksadana';

export interface Transaction {
  id: string;
  type: TransactionType;
  expense_category: ExpenseCategory | null;
  income_category: IncomeCategory | null;
  from_account?: AccountType | null;
  to_account?: AccountType | null;
  notes: string | null;
  price: number;
  quantity: number;
  total: number;
  created_at: string;
}

export interface TransactionWithBalance extends Transaction {
  running_balance: number;
}

export interface BalanceView {
  total_income: number;
  total_expense: number;
  balance: number;
}

export interface BalancePerAccount {
  account_type: AccountType;
  balance: number;
}

export interface TransactionFormData {
  type: TransactionType;
  expense_category?: ExpenseCategory;
  income_category?: IncomeCategory;
  notes: string;
  price: number;
  quantity: number;
  payment_source?: AccountType;
}

export interface TransferFormData {
  from_account: AccountType;
  to_account: AccountType;
  amount: number;
  notes: string;
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = ['Foods', 'Transportation', 'Equipment', 'Entertainment'];
export const INCOME_CATEGORIES: IncomeCategory[] = ['Salary', 'Etc'];
export const INVESTED_ACCOUNT_TYPES: AccountType[] = ['Crypto', 'Saham', 'Futures', 'Jago', 'Reksadana'];
export const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'rekening', label: 'Rekening' },
  { value: 'dana', label: 'Dana' },
  { value: 'pocket', label: 'Pocket' },
  { value: 'Saham', label: 'Saham' },
  { value: 'Crypto', label: 'Crypto' },
  { value: 'Futures', label: 'Futures' },
  { value: 'Jago', label: 'Jago' },
  { value: 'Gopay', label: 'Gopay' },
  { value: 'Reksadana', label: 'Reksadana' },
];
