import React, { useMemo, useEffect, useRef } from 'react';
import { MapPin, MessageSquare, Briefcase, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppState } from '../types';
import { getDayStatusAdvanced, calculateDayTotal, getExpensesTotal, getDailyTargetForDate, isWorkDay } from '../utils/calculations';

interface CalendarProps {
  state: AppState;
  selectedMonth: string;
  onDaySelect: (date: string) => void;
}

export const Calendar: React.FC<CalendarProps> = ({ state, selectedMonth, onDaySelect }) => {
  const scrolledRef = useRef(false);

  useEffect(() => {
    if (!scrolledRef.current) {
      const el = document.querySelector('[data-today="true"]');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        scrolledRef.current = true;
      }
    }
  });

  const cards = useMemo(() => {
    const result = [];
    const start = new Date(2026, 0, 1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = today.toISOString().split('T')[0];
    const profile = state.profile;
    const workDays = profile?.workDays || [];

    for (let i = 0; i < 365; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);

      const currentMonth = d.getMonth();
      if (selectedMonth !== '' && currentMonth !== parseInt(selectedMonth)) {
        continue;
      }

      const key = d.toISOString().split('T')[0];
      const data = state.db[key];
      const total = calculateDayTotal(data);
      const expenses = getExpensesTotal(data);
      const dayTarget = profile ? getDailyTargetForDate(key, profile) : 150;
      const dailyBudget = profile?.dailyBudget || 150;
      const incomeType = profile?.incomeType || 'freelance';
      const statusClass = getDayStatusAdvanced(incomeType, !!data, expenses, total, dailyBudget, dayTarget);
      const isToday = key === todayKey;
      const isFuture = d > today;
      const dayNum = d.getDate();
      const workDay = isWorkDay(key, workDays);

      result.push(
        <div
          key={key}
          data-today={isToday ? 'true' : undefined}
          onClick={() => onDaySelect(key)}
          className={cn(
            'day-card p-2 rounded cursor-pointer transition-all transform hover:scale-108 hover:shadow-lg',
            statusClass,
            isFuture && 'opacity-40',
            !workDay && profile?.incomeType === 'both' && 'opacity-60'
          )}
          style={isToday ? {
            boxShadow: '0 0 0 3px #fbbf24, 0 0 20px rgba(251,191,36,0.4)',
            borderColor: '#fbbf24',
          } : undefined}
        >
          <div className={cn(
            'text-xs font-semibold flex items-center gap-0.5',
            isToday ? 'text-yellow-300' : 'text-slate-200'
          )}>
            {isToday && <MapPin className="inline-block w-3 h-3 -mt-0.5" />}
            {dayNum}
            {workDay && profile?.incomeType !== 'freelance' && (
              <Briefcase className="w-2.5 h-2.5 text-slate-400 ml-auto" />
            )}
          </div>
          <span className="text-[10px] font-mono text-slate-300 mt-0.5">
            {total}₾
          </span>
          <div className="flex items-center gap-0.5 mt-0.5">
            {data?.debtPaid && (
              <div title="ვალი გადახდილია">
                <Check className="w-2.5 h-2.5 text-pink-400" />
              </div>
            )}
            {data?.comment && (
              <div title={data.comment}>
                <MessageSquare className="w-2.5 h-2.5 text-slate-400" />
              </div>
            )}
          </div>
        </div>
      );
    }
    return result;
  }, [state.db, selectedMonth, onDaySelect, state.profile]);

  return (
    <div className="grid grid-cols-4 md:grid-cols-8 gap-1.5 p-3">
      {cards.length > 0 ? (
        cards
      ) : (
        <div className="col-span-full text-center text-slate-500 py-8 font-medium">
          დღის ჩანაწერი არ აქვს
        </div>
      )}
    </div>
  );
};
