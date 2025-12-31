export type TransactionType = 'income' | 'expense';

export type ExpenseCategory = 'Foods' | 'Transportation' | 'Equipment' | 'Entertainment';

export type IncomeCategory = 'Salary' | 'Etc';

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

export interface TransactionFormData {
  type: TransactionType;
  expense_category?: ExpenseCategory;
  income_category?: IncomeCategory;
  notes: string;
  price: number;
  quantity: number;
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = ['Foods', 'Transportation', 'Equipment', 'Entertainment'];
export const INCOME_CATEGORIES: IncomeCategory[] = ['Salary', 'Etc'];
