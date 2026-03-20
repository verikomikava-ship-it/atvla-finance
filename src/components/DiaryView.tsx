import React, { useMemo, useState } from 'react';
import { AppState } from '../types';
import { BookOpen, ChevronUp, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface DiaryViewProps {
  state: AppState;
  selectedMonth: string;
}

const WEEKDAYS = ['კვირა', 'ორშაბათი', 'სამშაბათი', 'ოთხშაბათი', 'ხუთშაბათი', 'პარასკევი', 'შაბათი'];

export const DiaryView: React.FC<DiaryViewProps> = ({ state, selectedMonth }) => {
  const [isOpen, setIsOpen] = useState(false);

  const entries = useMemo(() => {
    const month = selectedMonth === '' ? null : parseInt(selectedMonth);

    return Object.entries(state.db)
      .filter(([, d]) => d.comment && d.comment.trim().length > 0)
      .filter(([date]) => {
        if (month === null) return true;
        return new Date(date).getMonth() === month;
      })
      .sort(([a], [b]) => b.localeCompare(a));
  }, [state.db, selectedMonth]);

  if (entries.length === 0) return null;

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-700 hover:border-amber-300 dark:hover:border-amber-600 transition-colors"
      >
        <span className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span className="text-amber-700 dark:text-amber-300 font-bold text-sm">დღიური</span>
          <span className="text-amber-500 dark:text-amber-400 text-xs">({entries.length} ჩანაწერი)</span>
        </span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-amber-500 dark:text-amber-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-amber-500 dark:text-amber-400" />
        )}
      </button>

      {isOpen && (
        <Card className="mt-2 bg-amber-50/50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-700 overflow-hidden">
          <CardContent className="p-0">
            <div className="max-h-80 overflow-y-auto">
              {entries.map(([date, data]) => {
                const dateObj = new Date(date + 'T00:00:00');
                const dayName = WEEKDAYS[dateObj.getDay()];
                const dayNum = dateObj.getDate();
                const monthNum = dateObj.getMonth() + 1;

                return (
                  <div key={date} className="border-b border-amber-200/50 dark:border-amber-700/50 last:border-b-0">
                    <div className="px-4 pt-3 pb-1 flex items-center gap-2">
                      <span className="text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                        {dayNum}/{monthNum} - {dayName}
                      </span>
                    </div>
                    <div className="relative px-4 pb-3">
                      <div className="absolute left-8 top-0 bottom-0 w-px bg-amber-300/30 dark:bg-amber-600/30" />
                      <p
                        className="pl-6 text-sm text-amber-900 dark:text-amber-200 whitespace-pre-wrap"
                        style={{ lineHeight: '1.8' }}
                      >
                        {data.comment}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
