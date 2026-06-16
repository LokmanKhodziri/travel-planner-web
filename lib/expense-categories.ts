import type { ExpenseCategory } from "@/types/api";

export const EXPENSE_CATEGORY_OPTIONS: {
  value: ExpenseCategory;
  label: string;
  description: string;
}[] = [
  {
    value: "TRANSPORT",
    label: "Transport",
    description: "Flights, taxis, fuel, parking, public transport",
  },
  {
    value: "ACCOMMODATION",
    label: "Accommodation",
    description: "Hotels, hostels, rentals",
  },
  {
    value: "FOOD",
    label: "Food & drinks",
    description: "Meals, cafes, groceries, halal dining",
  },
  {
    value: "ACTIVITIES",
    label: "Activities",
    description: "Tickets, tours, entrance fees, events",
  },
  {
    value: "SHOPPING",
    label: "Shopping",
    description: "Souvenirs, gifts, supplies",
  },
  {
    value: "OTHER",
    label: "Other",
    description: "Visa fees, insurance, misc travel costs",
  },
];

export const CURRENCY_OPTIONS = ["MYR", "USD", "SGD", "EUR", "GBP", "IDR", "THB"];

export function expenseCategoryLabel(category: ExpenseCategory) {
  return (
    EXPENSE_CATEGORY_OPTIONS.find((option) => option.value === category)?.label ??
    category
  );
}

export function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function groupExpensesByCurrency<T extends { amount: number; currency: string }>(
  expenses: T[],
) {
  return expenses.reduce<Record<string, number>>((totals, expense) => {
    totals[expense.currency] = (totals[expense.currency] ?? 0) + expense.amount;
    return totals;
  }, {});
}

export function groupExpensesByCategory<T extends { amount: number; category: ExpenseCategory }>(
  expenses: T[],
) {
  return expenses.reduce<Partial<Record<ExpenseCategory, number>>>(
    (totals, expense) => {
      totals[expense.category] = (totals[expense.category] ?? 0) + expense.amount;
      return totals;
    },
    {},
  );
}
