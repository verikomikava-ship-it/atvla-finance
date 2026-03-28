import React, { useMemo } from 'react';
import { AppState, SUBCATEGORIES, ExpenseCategory } from '../types';
import { X, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MONTH_NAMES } from '@/utils/constants';

interface ExpenseHistoryModalProps {
  state: AppState;
  selectedMonth: string;
  onClose: () => void;
}

const WEEKDAYS_FULL = ['კვირა', 'ორშაბათი', 'სამშაბათი', 'ოთხშაბათი', 'ხუთშაბათი', 'პარასკევი', 'შაბათი'];

const CATEGORY_META: Record<ExpenseCategory, { label: string; color: string; bg: string }> = {
  'საჭირო':             { label: 'საჭირო',             color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-100 dark:bg-blue-900/30' },
  'აუცილებელი':         { label: 'აუცილებელი',         color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  'სურვილი':            { label: 'სურვილი',            color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  'გაუთვალისწინებელი': { label: 'გაუთვალ.',           color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-100 dark:bg-amber-900/30' },
};

const subcategoryIcon = (sub?: string) =>
  sub && SUBCATEGORIES[sub as keyof typeof SUBCATEGORIES]
    ? SUBCATEGORIES[sub as keyof typeof SUBCATEGORIES].icon
    : '📝';

export const ExpenseHistoryModal: React.FC<ExpenseHistoryModalProps> = ({ state, selectedMonth, onClose }) => {
  const entries = useMemo(() => {
    const month = selectedMonth === '' ? null : parseInt(selectedMonth);
    return Object.entries(state.db)
      .filter(([date, day]) => {
        if (!day.expenses || day.expenses.length === 0) return false;
        if (month !== null && new Date(date).getMonth() !== month) return false;
        return true;
      })
      .sort(([a], [b]) => b.localeCompare(a));
  }, [state.db, selectedMonth]);

  const totalExp = useMemo(
    () => entries.reduce((s, [, d]) => s + (d.expenses || []).reduce((es, e) => es + e.amount, 0), 0),
    [entries]
  );

  const totalDays = entries.length;

  const topCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    entries.forEach(([, d]) =>
      (d.expenses || []).forEach(e => {
        counts[e.category] = (counts[e.category] || 0) + e.amount;
      })
    );
    const top = Object.entries(counts).sort(([, a], [, b]) => b - a)[0];
    return top ? top[0] as ExpenseCategory : null;
  }, [entries]);

  const monthLabel = selectedMonth === '' ? 'ყველა თვე' : MONTH_NAMES[parseInt(selectedMonth)];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* modal */}
      <div className="relative w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="bg-gradient-to-r from-rose-500 to-red-600 rounded-t-3xl sm:rounded-t-2xl px-5 py-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-white" />
              <h2 className="font-black text-white text-base">გასავლების ისტორია</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white/20 rounded-xl py-2">
              <p className="text-[9px] text-rose-100">📅 დღეები</p>
              <p className="text-sm font-black text-white">{totalDays}</p>
            </div>
            <div className="bg-white/20 rounded-xl py-2">
              <p className="text-[9px] text-rose-100">🏷️ მეტი გავიდა</p>
              <p className="text-[11px] font-black text-white truncate px-1">
                {topCategory ? CATEGORY_META[topCategory].label : '—'}
              </p>
            </div>
            <div className="bg-white/30 rounded-xl py-2">
              <p className="text-[9px] text-rose-100">სულ · {monthLabel}</p>
              <p className="text-sm font-black text-white">{totalExp.toLocaleString()}₾</p>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <TrendingDown className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">გასავლები არ არის</p>
              <p className="text-xs mt-1 opacity-70">{monthLabel}-ში ჩანაწერი ვერ მოიძებნა</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {entries.map(([date, day]) => {
                const dateObj = new Date(date + 'T00:00:00');
                const dow = dateObj.getDay();
                const d = dateObj.getDate();
                const m = dateObj.getMonth() + 1;
                const dayTotal = (day.expenses || []).reduce((s, e) => s + e.amount, 0);
                const isWeekend = dow === 0 || dow === 6;

                return (
                  <div key={date} className="px-5 py-3">
                    {/* Date row */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black',
                          isWeekend
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                            : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'
                        )}>
                          {d}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {WEEKDAYS_FULL[dow]}
                          </p>
                          <p className="text-[9px] text-slate-400">{d}/{m < 10 ? '0' + m : m}</p>
                        </div>
                      </div>
                      <span className="text-sm font-black text-rose-600 dark:text-rose-400">
                        -{dayTotal.toLocaleString()}₾
                      </span>
                    </div>

                    {/* Expense items */}
                    <div className="space-y-1 pl-10">
                      {(day.expenses || []).map((exp) => {
                        const catMeta = CATEGORY_META[exp.category];
                        const icon = subcategoryIcon(exp.subcategory);
                        return (
                          <div key={exp.id} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-sm flex-shrink-0">{icon}</span>
                              <div className="min-w-0">
                                <span className="text-[11px] text-slate-600 dark:text-slate-400 truncate block">
                                  {exp.name || exp.subcategory || 'გასავალი'}
                                </span>
                                <span className={cn(
                                  'text-[9px] font-semibold px-1.5 py-0.5 rounded-full',
                                  catMeta.bg, catMeta.color
                                )}>
                                  {catMeta.label}
                                </span>
                              </div>
                            </div>
                            <span className="text-[12px] font-bold text-rose-600 dark:text-rose-400 flex-shrink-0 ml-1">
                              {exp.amount.toLocaleString()}₾
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer handle */}
        <div className="sm:hidden h-1 w-10 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto my-2 flex-shrink-0" />
      </div>
    </div>
  );
};
