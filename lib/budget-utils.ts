import type { ApiExpense, ExpenseCategory } from "@/types/api";

export function sumCategoryBudgets(
  budgets: Partial<Record<ExpenseCategory, number>> | null | undefined,
) {
  if (!budgets) return 0;
  return Object.values(budgets).reduce((sum, value) => sum + (value ?? 0), 0);
}

export function getSpentInCurrency(expenses: ApiExpense[], currency: string) {
  return expenses
    .filter((expense) => expense.currency === currency)
    .reduce((sum, expense) => sum + expense.amount, 0);
}

export function getSpentByCategoryInCurrency(
  expenses: ApiExpense[],
  currency: string,
) {
  return expenses
    .filter((expense) => expense.currency === currency)
    .reduce<Partial<Record<ExpenseCategory, number>>>((totals, expense) => {
      totals[expense.category] = (totals[expense.category] ?? 0) + expense.amount;
      return totals;
    }, {});
}

export function getBudgetProgress(spent: number, budget?: number | null) {
  if (budget == null || budget <= 0) return null;

  const remaining = budget - spent;
  return {
    spent,
    budget,
    remaining,
    percent: Math.min(100, (spent / budget) * 100),
    over: remaining < 0,
  };
}

export function parseCategoryBudgets(
  value: unknown,
): Partial<Record<ExpenseCategory, number>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Partial<Record<ExpenseCategory, number>> = {};
  for (const [key, raw] of Object.entries(value)) {
    const amount = Number(raw);
    if (Number.isFinite(amount) && amount > 0) {
      result[key as ExpenseCategory] = amount;
    }
  }
  return result;
}
