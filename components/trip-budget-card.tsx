"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { ApiExpense, ApiTripBudget, ExpenseCategory } from "@/types/api";
import {
  CURRENCY_OPTIONS,
  EXPENSE_CATEGORY_OPTIONS,
  expenseCategoryLabel,
  formatMoney,
} from "@/lib/expense-categories";
import {
  getBudgetProgress,
  getSpentByCategoryInCurrency,
  getSpentInCurrency,
  parseCategoryBudgets,
  sumCategoryBudgets,
} from "@/lib/budget-utils";
import { Button } from "./ui/button";
import { ChevronDown, PiggyBank, Target } from "lucide-react";

interface TripBudgetCardProps {
  tripId: string;
  expenses: ApiExpense[];
  onBudgetChange?: (budget: ApiTripBudget | null) => void;
}

const fieldClass =
  "box-border w-full min-w-0 max-w-full rounded-lg border border-gray-300 p-2.5 text-sm";

function BudgetProgressBar({
  label,
  spent,
  budget,
  currency,
}: {
  label: string;
  spent: number;
  budget: number;
  currency: string;
}) {
  const progress = getBudgetProgress(spent, budget);
  if (!progress) return null;

  return (
    <div className='space-y-1.5'>
      <div className='flex items-center justify-between gap-2 text-xs'>
        <span className='font-medium text-gray-700'>{label}</span>
        <span className={progress.over ? "font-medium text-red-600" : "text-gray-500"}>
          {formatMoney(spent, currency)} / {formatMoney(budget, currency)}
        </span>
      </div>
      <div className='h-2 overflow-hidden rounded-full bg-gray-100'>
        <div
          className={`h-full rounded-full transition-all ${
            progress.over ? "bg-red-500" : "bg-emerald-500"
          }`}
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      <p
        className={`text-[11px] ${
          progress.over ? "text-red-600" : "text-emerald-700"
        }`}
      >
        {progress.over
          ? `${formatMoney(Math.abs(progress.remaining), currency)} over budget`
          : `${formatMoney(progress.remaining, currency)} left`}
      </p>
    </div>
  );
}

export default function TripBudgetCard({
  tripId,
  expenses,
  onBudgetChange,
}: TripBudgetCardProps) {
  const [budget, setBudget] = useState<ApiTripBudget | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState("MYR");
  const [totalAmount, setTotalAmount] = useState("");
  const [categoryAmounts, setCategoryAmounts] = useState<
    Partial<Record<ExpenseCategory, string>>
  >({});

  useEffect(() => {
    setLoading(true);
    api
      .getTripBudget(tripId)
      .then((saved) => {
        setBudget(saved);
        if (saved) {
          setCurrency(saved.currency);
          setTotalAmount(saved.totalAmount != null ? String(saved.totalAmount) : "");
          const parsed = parseCategoryBudgets(saved.categoryBudgets);
          setCategoryAmounts(
            Object.fromEntries(
              Object.entries(parsed).map(([key, value]) => [key, String(value)]),
            ) as Partial<Record<ExpenseCategory, string>>,
          );
        }
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load budget"),
      )
      .finally(() => setLoading(false));
  }, [tripId]);

  const spentTotal = useMemo(
    () => getSpentInCurrency(expenses, budget?.currency ?? currency),
    [expenses, budget?.currency, currency],
  );
  const spentByCategory = useMemo(
    () => getSpentByCategoryInCurrency(expenses, budget?.currency ?? currency),
    [expenses, budget?.currency, currency],
  );
  const totalProgress = getBudgetProgress(spentTotal, budget?.totalAmount);
  const categoryBudgets = parseCategoryBudgets(budget?.categoryBudgets);
  const allocatedCategories = sumCategoryBudgets(categoryBudgets);

  function resetFormFromBudget(saved: ApiTripBudget | null) {
    if (!saved) {
      setCurrency("MYR");
      setTotalAmount("");
      setCategoryAmounts({});
      return;
    }
    setCurrency(saved.currency);
    setTotalAmount(saved.totalAmount != null ? String(saved.totalAmount) : "");
    const parsed = parseCategoryBudgets(saved.categoryBudgets);
    setCategoryAmounts(
      Object.fromEntries(
        Object.entries(parsed).map(([key, value]) => [key, String(value)]),
      ) as Partial<Record<ExpenseCategory, string>>,
    );
  }

  function startEditing() {
    resetFormFromBudget(budget);
    setEditing(true);
    setExpanded(true);
    setError(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const parsedTotal = totalAmount.trim() ? Number(totalAmount) : null;
    const categoryBudgetsPayload = Object.fromEntries(
      Object.entries(categoryAmounts)
        .map(([key, value]) => {
          const amount = Number(value);
          return Number.isFinite(amount) && amount > 0
            ? [key, amount]
            : null;
        })
        .filter((entry): entry is [string, number] => Boolean(entry)),
    ) as Partial<Record<ExpenseCategory, number>>;

    if (
      (parsedTotal == null || !Number.isFinite(parsedTotal) || parsedTotal <= 0) &&
      Object.keys(categoryBudgetsPayload).length === 0
    ) {
      setError("Set a total budget and/or at least one category amount.");
      setSaving(false);
      return;
    }

    try {
      const saved = await api.saveTripBudget(tripId, {
        currency,
        totalAmount:
          parsedTotal != null && Number.isFinite(parsedTotal) && parsedTotal > 0
            ? parsedTotal
            : null,
        categoryBudgets:
          Object.keys(categoryBudgetsPayload).length > 0
            ? categoryBudgetsPayload
            : null,
      });
      setBudget(saved);
      onBudgetChange?.(saved);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save budget");
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    const confirmed = window.confirm("Remove this trip budget?");
    if (!confirmed) return;

    setSaving(true);
    setError(null);
    try {
      await api.clearTripBudget(tripId);
      setBudget(null);
      resetFormFromBudget(null);
      onBudgetChange?.(null);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear budget");
    } finally {
      setSaving(false);
    }
  }

  function handleSplitEvenly() {
    const total = Number(totalAmount);
    if (!Number.isFinite(total) || total <= 0) {
      setError("Enter a total budget first to split evenly.");
      return;
    }

    const perCategory = Math.floor((total / EXPENSE_CATEGORY_OPTIONS.length) * 100) / 100;
    const next: Partial<Record<ExpenseCategory, string>> = {};
    for (const option of EXPENSE_CATEGORY_OPTIONS) {
      next[option.value] = perCategory.toFixed(2);
    }
    setCategoryAmounts(next);
    setError(null);
  }

  return (
    <section className='min-w-0 rounded-xl border border-emerald-200 bg-emerald-50/50'>
      <button
        type='button'
        onClick={() => setExpanded((value) => !value)}
        className='flex w-full items-center justify-between gap-3 px-3 py-3 text-left sm:px-4'
      >
        <div className='flex items-center gap-2'>
          <PiggyBank className='h-5 w-5 text-emerald-700' />
          <div>
            <h3 className='font-semibold text-gray-900'>Trip budget</h3>
            <p className='text-xs text-gray-600'>
              Set a total and optional splits by category, then track spending.
            </p>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-500 transition ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {expanded && (
        <div className='space-y-4 border-t border-emerald-100 px-3 pb-4 pt-3 sm:px-4'>
          {loading ? (
            <p className='text-sm text-gray-500'>Loading budget...</p>
          ) : editing ? (
            <form onSubmit={handleSave} className='space-y-4'>
              <div className='grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_5.75rem]'>
                <label className='block min-w-0 space-y-1 text-sm'>
                  <span className='font-medium text-gray-700'>Total budget</span>
                  <input
                    type='number'
                    min='0.01'
                    step='0.01'
                    placeholder='e.g. 3000'
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    className={fieldClass}
                    inputMode='decimal'
                  />
                </label>
                <label className='block min-w-0 space-y-1 text-sm'>
                  <span className='font-medium text-gray-700'>Currency</span>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className={fieldClass}
                  >
                    {CURRENCY_OPTIONS.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className='flex flex-wrap items-center justify-between gap-2'>
                <p className='text-sm font-medium text-gray-800'>
                  Category splits <span className='font-normal text-gray-500'>(optional)</span>
                </p>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={handleSplitEvenly}
                  disabled={!totalAmount.trim()}
                >
                  Split evenly
                </Button>
              </div>

              <div className='grid min-w-0 gap-3 sm:grid-cols-2'>
                {EXPENSE_CATEGORY_OPTIONS.map((option) => (
                  <label key={option.value} className='block min-w-0 space-y-1 text-sm'>
                    <span className='text-gray-700'>{option.label}</span>
                    <input
                      type='number'
                      min='0'
                      step='0.01'
                      placeholder='0'
                      value={categoryAmounts[option.value] ?? ""}
                      onChange={(e) =>
                        setCategoryAmounts((prev) => ({
                          ...prev,
                          [option.value]: e.target.value,
                        }))
                      }
                      className={fieldClass}
                      inputMode='decimal'
                    />
                  </label>
                ))}
              </div>

              {error && <p className='text-sm text-red-600'>{error}</p>}

              <div className='flex flex-wrap gap-2'>
                <Button type='submit' disabled={saving} className='w-full sm:w-auto'>
                  {saving ? "Saving..." : "Save budget"}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  disabled={saving}
                  onClick={() => {
                    setEditing(false);
                    resetFormFromBudget(budget);
                    setError(null);
                  }}
                  className='w-full sm:w-auto'
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : budget ? (
            <div className='space-y-4'>
              {totalProgress && (
                <div className='rounded-lg border border-white bg-white/80 p-3'>
                  <div className='mb-2 flex items-center gap-2 text-sm font-medium text-gray-900'>
                    <Target className='h-4 w-4 text-emerald-700' />
                    Overall ({budget.currency})
                  </div>
                  <BudgetProgressBar
                    label='Total trip'
                    spent={spentTotal}
                    budget={totalProgress.budget}
                    currency={budget.currency}
                  />
                  {allocatedCategories > 0 && budget.totalAmount != null && (
                    <p className='mt-2 text-[11px] text-gray-500'>
                      Category splits total {formatMoney(allocatedCategories, budget.currency)}
                      {allocatedCategories !== budget.totalAmount
                        ? ` · ${formatMoney(
                            budget.totalAmount - allocatedCategories,
                            budget.currency,
                          )} unallocated`
                        : ""}
                    </p>
                  )}
                </div>
              )}

              {Object.keys(categoryBudgets).length > 0 && (
                <div className='space-y-3 rounded-lg border border-white bg-white/80 p-3'>
                  <p className='text-sm font-medium text-gray-900'>By category</p>
                  {EXPENSE_CATEGORY_OPTIONS.map((option) => {
                    const cap = categoryBudgets[option.value];
                    if (!cap) return null;
                    return (
                      <BudgetProgressBar
                        key={option.value}
                        label={expenseCategoryLabel(option.value)}
                        spent={spentByCategory[option.value] ?? 0}
                        budget={cap}
                        currency={budget.currency}
                      />
                    );
                  })}
                </div>
              )}

              <p className='text-xs text-gray-500'>
                Only expenses in {budget.currency} count toward this budget.
              </p>

              <div className='flex flex-wrap gap-2'>
                <Button type='button' variant='outline' size='sm' onClick={startEditing}>
                  Edit budget
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  disabled={saving}
                  onClick={() => void handleClear()}
                >
                  Remove budget
                </Button>
              </div>
            </div>
          ) : (
            <div className='space-y-3'>
              <p className='text-sm text-gray-600'>
                No budget set yet. Add a total for the trip and optionally cap food,
                transport, and other categories.
              </p>
              <Button type='button' onClick={startEditing} className='w-full sm:w-auto'>
                Set trip budget
              </Button>
            </div>
          )}

          {!editing && error && <p className='text-sm text-red-600'>{error}</p>}
        </div>
      )}
    </section>
  );
}
