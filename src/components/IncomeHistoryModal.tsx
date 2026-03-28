import React, { useMemo } from 'react';
import { AppState, EXTRA_INCOME_SOURCES } from '../types';
import { X, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MONTH_NAMES } from '@/utils/constants';

interface IncomeHistoryModalProps {
  state: AppState;
  selectedMonth: string;
  onClose: () => void;
}

const WEEKDAYS_FULL = ['კვირა', 'ორშაბათი', 'სამშაბათი', 'ოთხშაბათი', 'ხუთშაბათი', 'პარასკევი', 'შაბათი'];

const sourceInfo = (key: string) =>
  EXTRA_INCOME_SOURCES.find(s => s.key === key) ?? { icon: '📝', label: key, color: '#64748b' };

export const IncomeHistoryModal: React.FC<IncomeHistoryModalProps> = ({ state, selectedMonth, onClose }) => {
  const entries = useMemo(() => {
    const month = selectedMonth === '' ? null : parseInt(selectedMonth);
    return Object.entries(state.db)
      .filter(([date, day]) => {
        if ((day.incMain || 0) === 0 && (day.incExtra || 0) === 0) return false;
        if (month !== null && new Date(date).getMonth() !== month) return false;
        return true;
      })
      .sort(([a], [b]) => b.localeCompare(a));
  }, [state.db, selectedMonth]);

  const totalInc = useMemo(
    () => entries.reduce((s, [, d]) => s + (d.incMain || 0) + (d.incExtra || 0), 0),
    [entries]
  );

  const totalMain = useMemo(() => entries.reduce((s, [, d]) => s + (d.incMain || 0), 0), [entries]);
  const totalExtra = useMemo(() => entries.reduce((s, [, d]) => s + (d.incExtra || 0), 0), [entries]);

  const monthLabel = selectedMonth === '' ? 'ყველა თვე' : MONTH_NAMES[parseInt(selectedMonth)];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* modal */}
      <div className="relative w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-t-3xl sm:rounded-t-2xl px-5 py-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-white" />
              <h2 className="font-black text-white text-base">შემოსავლების ისტორია</h2>
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
              <p className="text-[9px] text-emerald-100">💼 ძირითადი</p>
              <p className="text-sm font-black text-white">{totalMain.toLocaleString()}₾</p>
            </div>
            <div className="bg-white/20 rounded-xl py-2">
              <p className="text-[9px] text-emerald-100">➕ დამატებითი</p>
              <p className="text-sm font-black text-white">{totalExtra.toLocaleString()}₾</p>
            </div>
            <div className="bg-white/30 rounded-xl py-2">
              <p className="text-[9px] text-emerald-100">სულ · {monthLabel}</p>
              <p className="text-sm font-black text-white">{totalInc.toLocaleString()}₾</p>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <TrendingUp className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">შემოსავლები არ არის</p>
              <p className="text-xs mt-1 opacity-70">{monthLabel}-ში ჩანაწერი ვერ მოიძებნა</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {entries.map(([date, day]) => {
                const dateObj = new Date(date + 'T00:00:00');
                const dow = dateObj.getDay();
                const d = dateObj.getDate();
                const m = dateObj.getMonth() + 1;
                const dayTotal = (day.incMain || 0) + (day.incExtra || 0);
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
                            : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
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
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                        +{dayTotal.toLocaleString()}₾
                      </span>
                    </div>

                    {/* Income items */}
                    <div className="space-y-1 pl-10">
                      {(day.incMain || 0) > 0 && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">💼</span>
                            <span className="text-[11px] text-slate-600 dark:text-slate-400">ძირითადი შემოსავალი</span>
                          </div>
                          <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400">
                            {(day.incMain || 0).toLocaleString()}₾
                          </span>
                        </div>
                      )}

                      {(day.incExtra || 0) > 0 && (() => {
                        const info = sourceInfo(day.incExtraSource || 'სხვა');
                        return (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-sm flex-shrink-0">{info.icon}</span>
                              <div className="min-w-0">
                                <span className="text-[11px] text-slate-600 dark:text-slate-400">
                                  {info.label}
                                </span>
                                {day.incExtraNote && (
                                  <p className="text-[9px] text-slate-400 truncate">{day.incExtraNote}</p>
                                )}
                              </div>
                            </div>
                            <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400 flex-shrink-0 ml-2">
                              {(day.incExtra || 0).toLocaleString()}₾
                            </span>
                          </div>
                        );
                      })()}
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
