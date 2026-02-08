export type TransactionType = 'income' | 'expense';

export type ExpenseCategory = 'Foods' | 'Transportation' | 'Equipment' | 'Entertainment';

export type IncomeCategory = 'Salary' | 'Etc';

export type AccountType = 'rekening' | 'dana' | 'pocket';

export interface Transaction {
  id: string;
  type: TransactionType;
  expense_category: ExpenseCategory | null;
  income_category: IncomeCategory | null;
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
export const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'rekening', label: 'Rekening' },
  { value: 'dana', label: 'Dana' },
  { value: 'pocket', label: 'Pocket' },
];
