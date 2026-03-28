import React, { useMemo } from 'react';
import { AppState, SUBCATEGORIES, EXTRA_INCOME_SOURCES, ExpenseCategory } from '../types';
import { X, Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MONTH_NAMES } from '@/utils/constants';

interface BalanceHistoryModalProps {
  state: AppState;
  selectedMonth: string;
  onClose: () => void;
}

const WEEKDAYS_FULL = ['კვირა', 'ორშაბათი', 'სამშაბათი', 'ოთხშაბათი', 'ხუთშაბათი', 'პარასკევი', 'შაბათი'];

const CATEGORY_META: Record<ExpenseCategory, { label: string; color: string; bg: string }> = {
  'საჭირო':             { label: 'საჭირო',     color: 'text-blue-600 dark:text-blue-400',     bg: 'bg-blue-100 dark:bg-blue-900/30' },
  'აუცილებელი':         { label: 'აუცილ.',     color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  'სურვილი':            { label: 'სურვილი',    color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  'გაუთვალისწინებელი': { label: 'გაუთვალ.',   color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-100 dark:bg-amber-900/30' },
};

const subcategoryIcon = (sub?: string) =>
  sub && SUBCATEGORIES[sub as keyof typeof SUBCATEGORIES]
    ? SUBCATEGORIES[sub as keyof typeof SUBCATEGORIES].icon
    : '📝';

const sourceInfo = (key: string) =>
  EXTRA_INCOME_SOURCES.find(s => s.key === key) ?? { icon: '📝', label: key };

export const BalanceHistoryModal: React.FC<BalanceHistoryModalProps> = ({ state, selectedMonth, onClose }) => {
  const entries = useMemo(() => {
    const month = selectedMonth === '' ? null : parseInt(selectedMonth);
    return Object.entries(state.db)
      .filter(([date, day]) => {
        const hasInc = (day.incMain || 0) > 0 || (day.incExtra || 0) > 0;
        const hasExp = day.expenses && day.expenses.length > 0;
        if (!hasInc && !hasExp) return false;
        if (month !== null && new Date(date).getMonth() !== month) return false;
        return true;
      })
      .sort(([a], [b]) => b.localeCompare(a));
  }, [state.db, selectedMonth]);

  const totalInc = useMemo(
    () => entries.reduce((s, [, d]) => s + (d.incMain || 0) + (d.incExtra || 0), 0),
    [entries]
  );
  const totalExp = useMemo(
    () => entries.reduce((s, [, d]) => s + (d.expenses || []).reduce((es, e) => es + e.amount, 0), 0),
    [entries]
  );
  const netBalance = totalInc - totalExp;

  const monthLabel = selectedMonth === '' ? 'ყველა თვე' : MONTH_NAMES[parseInt(selectedMonth)];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* modal */}
      <div className="relative w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className={cn(
          'rounded-t-3xl sm:rounded-t-2xl px-5 py-4 flex-shrink-0',
          netBalance >= 0
            ? 'bg-gradient-to-r from-blue-600 to-emerald-600'
            : 'bg-gradient-to-r from-blue-600 to-rose-600'
        )}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-white" />
              <h2 className="font-black text-white text-base">ბალანსის ისტორია</h2>
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
              <p className="text-[9px] text-white/70">📈 შემოსავალი</p>
              <p className="text-sm font-black text-emerald-200">+{totalInc.toLocaleString()}₾</p>
            </div>
            <div className="bg-white/20 rounded-xl py-2">
              <p className="text-[9px] text-white/70">📉 გასავალი</p>
              <p className="text-sm font-black text-rose-200">-{totalExp.toLocaleString()}₾</p>
            </div>
            <div className="bg-white/30 rounded-xl py-2">
              <p className="text-[9px] text-white/70">💰 ბალანსი · {monthLabel}</p>
              <p className={cn(
                'text-sm font-black',
                netBalance >= 0 ? 'text-emerald-200' : 'text-rose-200'
              )}>
                {netBalance >= 0 ? '+' : ''}{netBalance.toLocaleString()}₾
              </p>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Wallet className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">ჩანაწერები არ არის</p>
              <p className="text-xs mt-1 opacity-70">{monthLabel}-ში ვერ მოიძებნა</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {entries.map(([date, day]) => {
                const dateObj = new Date(date + 'T00:00:00');
                const dow = dateObj.getDay();
                const d = dateObj.getDate();
                const m = dateObj.getMonth() + 1;
                const dayInc = (day.incMain || 0) + (day.incExtra || 0);
                const dayExp = (day.expenses || []).reduce((s, e) => s + e.amount, 0);
                const dayNet = dayInc - dayExp;
                const isWeekend = dow === 0 || dow === 6;

                return (
                  <div key={date} className="px-4 py-3">
                    {/* Date row */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0',
                          isWeekend
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
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

                      {/* Day net */}
                      <div className="text-right">
                        <span className={cn(
                          'text-sm font-black',
                          dayNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        )}>
                          {dayNet >= 0 ? '+' : ''}{dayNet.toLocaleString()}₾
                        </span>
                        {dayInc > 0 && dayExp > 0 && (
                          <p className="text-[9px] text-slate-400 leading-none mt-0.5">
                            <span className="text-emerald-500">+{dayInc.toLocaleString()}</span>
                            {' / '}
                            <span className="text-rose-500">-{dayExp.toLocaleString()}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Transactions */}
                    <div className="space-y-1 pl-10">
                      {/* Main income */}
                      {(day.incMain || 0) > 0 && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <TrendingUp className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                            <span className="text-[11px] text-slate-600 dark:text-slate-400">💼 ძირითადი შემოსავალი</span>
                          </div>
                          <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400">
                            +{(day.incMain || 0).toLocaleString()}₾
                          </span>
                        </div>
                      )}

                      {/* Extra income */}
                      {(day.incExtra || 0) > 0 && (() => {
                        const info = sourceInfo(day.incExtraSource || 'სხვა');
                        return (
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <TrendingUp className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                              <span className="text-sm flex-shrink-0">{info.icon}</span>
                              <div className="min-w-0">
                                <span className="text-[11px] text-slate-600 dark:text-slate-400">{info.label}</span>
                                {day.incExtraNote && (
                                  <p className="text-[9px] text-slate-400 truncate">{day.incExtraNote}</p>
                                )}
                              </div>
                            </div>
                            <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                              +{(day.incExtra || 0).toLocaleString()}₾
                            </span>
                          </div>
                        );
                      })()}

                      {/* Expenses */}
                      {(day.expenses || []).map((exp) => {
                        const catMeta = CATEGORY_META[exp.category];
                        const icon = subcategoryIcon(exp.subcategory);
                        return (
                          <div key={exp.id} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <TrendingDown className="w-3 h-3 text-rose-400 flex-shrink-0" />
                              <span className="text-sm flex-shrink-0">{icon}</span>
                              <div className="min-w-0">
                                <span className="text-[11px] text-slate-600 dark:text-slate-400 truncate block">
                                  {exp.name || exp.subcategory || 'გასავალი'}
                                </span>
                                <span className={cn(
                                  'text-[9px] font-semibold px-1 py-0.5 rounded-full',
                                  catMeta.bg, catMeta.color
                                )}>
                                  {catMeta.label}
                                </span>
                              </div>
                            </div>
                            <span className="text-[12px] font-bold text-rose-600 dark:text-rose-400 flex-shrink-0">
                              -{exp.amount.toLocaleString()}₾
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
