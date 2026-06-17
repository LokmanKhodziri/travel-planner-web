"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { ApiActivity, ApiExpense, ExpenseCategory } from "@/types/api";
import {
  CURRENCY_OPTIONS,
  EXPENSE_CATEGORY_OPTIONS,
  expenseCategoryLabel,
  formatMoney,
  groupExpensesByCategory,
  groupExpensesByCurrency,
} from "@/lib/expense-categories";
import { Button } from "./ui/button";
import {
  BedDouble,
  Bus,
  Coins,
  MapPin,
  Receipt,
  ShoppingBag,
  Ticket,
  Trash2,
  Utensils,
} from "lucide-react";

interface TripExpensesPanelProps {
  tripId: string;
  startDate: string;
  endDate: string;
  activities?: Pick<ApiActivity, "id" | "title" | "startTime">[];
}

const CATEGORY_ICONS: Record<ExpenseCategory, typeof Bus> = {
  TRANSPORT: Bus,
  ACCOMMODATION: BedDouble,
  FOOD: Utensils,
  ACTIVITIES: Ticket,
  SHOPPING: ShoppingBag,
  OTHER: Receipt,
};

function formatExpenseDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function TripExpensesPanel({
  tripId,
  startDate,
  endDate,
  activities = [],
}: TripExpensesPanelProps) {
  const defaultDate = startDate.slice(0, 10);
  const [expenses, setExpenses] = useState<ApiExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("MYR");
  const [category, setCategory] = useState<ExpenseCategory>("TRANSPORT");
  const [expenseDate, setExpenseDate] = useState(defaultDate);
  const [notes, setNotes] = useState("");
  const [activityId, setActivityId] = useState("");

  useEffect(() => {
    setLoading(true);
    api
      .getExpenses(tripId)
      .then(setExpenses)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load expenses"),
      )
      .finally(() => setLoading(false));
  }, [tripId]);

  const totalsByCurrency = useMemo(
    () => groupExpensesByCurrency(expenses),
    [expenses],
  );
  const totalsByCategory = useMemo(
    () => groupExpensesByCategory(expenses),
    [expenses],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (!title.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a title and a valid amount.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const created = await api.createExpense(tripId, {
        title: title.trim(),
        amount: parsedAmount,
        currency,
        category,
        expenseDate: new Date(`${expenseDate}T12:00:00`).toISOString(),
        notes: notes.trim() || undefined,
        activityId: activityId || undefined,
      });
      setExpenses((prev) => [created, ...prev]);
      setTitle("");
      setAmount("");
      setNotes("");
      setActivityId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add expense");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(expense: ApiExpense) {
    const confirmed = window.confirm(`Delete "${expense.title}"?`);
    if (!confirmed) return;

    try {
      await api.deleteExpense(tripId, expense.id);
      setExpenses((prev) => prev.filter((item) => item.id !== expense.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete expense");
    }
  }

  const linkedActivityTitle = (id: string | null) =>
    activities.find((activity) => activity.id === id)?.title;

  const selectedCategory = EXPENSE_CATEGORY_OPTIONS.find(
    (option) => option.value === category,
  );

  const fieldClass =
    "box-border w-full min-w-0 max-w-full rounded-lg border border-gray-300 p-3 text-base";

  return (
    <div className='min-w-0 max-w-full space-y-5 overflow-x-hidden sm:space-y-6'>
      <div>
        <h2 className='text-xl font-semibold text-gray-900'>Travel expenses</h2>
        <p className='mt-1 text-sm text-gray-500'>
          Track transport, accommodation, food, activities, and other trip costs
          in one place.
        </p>
      </div>

      <div className='grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-4 2xl:grid-cols-3'>
        {Object.entries(totalsByCurrency).map(([code, total]) => (
          <div
            key={code}
            className='rounded-xl border border-blue-200 bg-blue-50/60 p-4'
          >
            <div className='flex items-center gap-2 text-blue-700'>
              <Coins className='h-4 w-4' />
              <p className='text-xs font-semibold uppercase tracking-wide'>
                Total spent ({code})
              </p>
            </div>
            <p className='mt-2 text-2xl font-bold text-gray-900'>
              {formatMoney(total, code)}
            </p>
            <p className='mt-1 text-xs text-gray-500'>
              {expenses.filter((item) => item.currency === code).length} entries
            </p>
          </div>
        ))}
        {expenses.length === 0 && !loading && (
          <div className='rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 sm:col-span-2 2xl:col-span-3'>
            <p className='text-sm text-gray-500'>
              No expenses yet. Add your first travel cost below.
            </p>
          </div>
        )}
      </div>

      {expenses.length > 0 && (
        <div className='rounded-xl border border-gray-200 bg-white p-4'>
          <h3 className='mb-3 text-sm font-semibold text-gray-900'>
            Breakdown by category
          </h3>
          <div className='flex flex-wrap gap-2'>
            {EXPENSE_CATEGORY_OPTIONS.map((option) => {
              const total = totalsByCategory[option.value];
              if (!total) return null;
              const Icon = CATEGORY_ICONS[option.value];
              return (
                <span
                  key={option.value}
                  className='inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700'
                >
                  <Icon className='h-3.5 w-3.5' />
                  {option.label}: {total.toFixed(2)}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className='grid min-w-0 gap-5 xl:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] xl:items-start xl:gap-6'>
      <form
        onSubmit={handleSubmit}
        className='min-w-0 space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-3 sm:p-4 xl:sticky xl:top-4'
      >
        <h3 className='font-semibold text-gray-900'>Add expense</h3>
        <div className='grid min-w-0 gap-3 sm:gap-4'>
          <label className='block min-w-0 space-y-1 text-sm'>
            <span className='font-medium text-gray-700'>Description</span>
            <input
              type='text'
              placeholder='e.g. Grab to KLCC'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className={fieldClass}
            />
          </label>

          <div className='grid min-w-0 grid-cols-[minmax(0,1fr)_5.75rem] gap-3'>
            <label className='block min-w-0 space-y-1 text-sm'>
              <span className='font-medium text-gray-700'>Amount</span>
              <input
                type='number'
                min='0.01'
                step='0.01'
                placeholder='0.00'
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                inputMode='decimal'
                className={fieldClass}
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

          <label className='block min-w-0 space-y-1 text-sm'>
            <span className='font-medium text-gray-700'>Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className={fieldClass}
            >
              {EXPENSE_CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {selectedCategory && (
              <p className='text-xs text-gray-500'>{selectedCategory.description}</p>
            )}
          </label>

          <label className='block min-w-0 space-y-1 text-sm'>
            <span className='font-medium text-gray-700'>Date</span>
            <input
              type='date'
              value={expenseDate}
              min={startDate.slice(0, 10)}
              max={endDate.slice(0, 10)}
              onChange={(e) => setExpenseDate(e.target.value)}
              required
              className={fieldClass}
            />
          </label>

          {activities.length > 0 && (
            <label className='block min-w-0 space-y-1 text-sm'>
              <span className='font-medium text-gray-700'>
                Link to activity <span className='font-normal text-gray-400'>(optional)</span>
              </span>
              <select
                value={activityId}
                onChange={(e) => setActivityId(e.target.value)}
                className={fieldClass}
              >
                <option value=''>None</option>
                {activities.map((activity) => (
                  <option key={activity.id} value={activity.id}>
                    {activity.title}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className='block min-w-0 space-y-1 text-sm'>
            <span className='font-medium text-gray-700'>
              Notes <span className='font-normal text-gray-400'>(optional)</span>
            </span>
            <input
              type='text'
              placeholder='Add a short note'
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={fieldClass}
            />
          </label>
        </div>
        {error && <p className='text-sm text-red-600'>{error}</p>}
        <Button type='submit' disabled={submitting} className='w-full sm:w-auto'>
          {submitting ? "Saving..." : "Add expense"}
        </Button>
      </form>

      {expenses.length > 0 && (
      <div className='min-w-0 rounded-xl border border-gray-200 bg-white'>
        <div className='border-b border-gray-100 px-4 py-3'>
          <h3 className='font-semibold text-gray-900'>All expenses</h3>
        </div>
        {loading ? (
          <p className='p-4 text-sm text-gray-500'>Loading expenses...</p>
        ) : (
          <ul className='divide-y divide-gray-100'>
            {expenses.map((expense) => {
              const Icon = CATEGORY_ICONS[expense.category];
              const activityTitle = linkedActivityTitle(expense.activityId);

              return (
                <li
                  key={expense.id}
                  className='flex flex-col gap-3 px-3 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-4'
                >
                  <div className='min-w-0 flex-1'>
                    <div className='flex items-start gap-2'>
                      <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600'>
                        <Icon className='h-4 w-4' />
                      </span>
                      <div className='min-w-0'>
                        <p className='break-words font-medium text-gray-900'>
                          {expense.title}
                        </p>
                        <p className='text-xs text-gray-500'>
                          {expenseCategoryLabel(expense.category)} ·{" "}
                          {formatExpenseDate(expense.expenseDate)}
                        </p>
                      </div>
                    </div>
                    {expense.notes && (
                      <p className='mt-2 break-words pl-10 text-sm text-gray-600'>
                        {expense.notes}
                      </p>
                    )}
                    {activityTitle && (
                      <p className='mt-1 flex items-start gap-1 pl-10 text-xs text-blue-600'>
                        <MapPin className='mt-0.5 h-3 w-3 shrink-0' />
                        <span className='break-words'>Linked: {activityTitle}</span>
                      </p>
                    )}
                  </div>
                  <div className='flex items-center justify-between gap-3 border-t border-gray-100 pt-3 sm:shrink-0 sm:border-0 sm:pt-0'>
                    <p className='text-lg font-semibold text-gray-900'>
                      {formatMoney(expense.amount, expense.currency)}
                    </p>
                    <Button
                      type='button'
                      variant='destructive'
                      size='sm'
                      onClick={() => handleDelete(expense)}
                      aria-label={`Delete ${expense.title}`}
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      )}
      </div>
    </div>
  );
}
