import React, { useMemo, useState } from 'react';
import { AppState, EVENT_TYPES } from '../types';
import { CalendarDays, ChevronUp, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface EventsViewProps {
  state: AppState;
  selectedMonth: string;
}

const WEEKDAYS = ['კვირა', 'ორშაბათი', 'სამშაბათი', 'ოთხშაბათი', 'ხუთშაბათი', 'პარასკევი', 'შაბათი'];

export const EventsView: React.FC<EventsViewProps> = ({ state, selectedMonth }) => {
  const [isOpen, setIsOpen] = useState(false);

  const entries = useMemo(() => {
    const month = selectedMonth === '' ? null : parseInt(selectedMonth);

    return Object.entries(state.db)
      .filter(([, d]) => d.events && d.events.length > 0)
      .filter(([date]) => {
        if (month === null) return true;
        return new Date(date).getMonth() === month;
      })
      .sort(([a], [b]) => a.localeCompare(b));
  }, [state.db, selectedMonth]);

  if (entries.length === 0) return null;

  const totalEvents = entries.reduce((s, [, d]) => s + (d.events?.length || 0), 0);

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-teal-50 dark:bg-teal-900/20 border-2 border-teal-200 dark:border-teal-700 hover:border-teal-300 dark:hover:border-teal-600 transition-colors"
      >
        <span className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          <span className="text-teal-700 dark:text-teal-300 font-bold text-sm">ივენთები</span>
          <span className="text-teal-500 dark:text-teal-400 text-xs">({totalEvents})</span>
        </span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-teal-500 dark:text-teal-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-teal-500 dark:text-teal-400" />
        )}
      </button>

      {isOpen && (
        <Card className="mt-2 bg-teal-50/50 dark:bg-teal-900/20 border-2 border-teal-200 dark:border-teal-700 overflow-hidden">
          <CardContent className="p-0">
            <div className="max-h-80 overflow-y-auto">
              {entries.map(([date, data]) => {
                const dateObj = new Date(date + 'T00:00:00');
                const dayName = WEEKDAYS[dateObj.getDay()];
                const dayNum = dateObj.getDate();
                const monthNum = dateObj.getMonth() + 1;

                return (
                  <div key={date} className="border-b border-teal-200/50 dark:border-teal-700/50 last:border-b-0">
                    <div className="px-4 pt-3 pb-1">
                      <span className="text-teal-600 dark:text-teal-400 text-[10px] font-bold">
                        {dayNum}/{monthNum} - {dayName}
                      </span>
                    </div>
                    <div className="px-4 pb-3 space-y-1.5">
                      {data.events!.map((event) => {
                        const info = EVENT_TYPES[event.type];
                        return (
                          <div key={event.id} className="flex items-start gap-2 pl-2">
                            <span className="text-sm flex-shrink-0" style={{ color: info?.color }}>{info?.icon}</span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-teal-800 dark:text-teal-200">{info?.label}</span>
                                {event.time && (
                                  <span className="text-[10px] bg-teal-100 dark:bg-teal-800 text-teal-600 dark:text-teal-300 px-1.5 py-0.5 rounded-full font-mono">{event.time}</span>
                                )}
                                {event.budget && event.budget > 0 && (
                                  <span className="text-[10px] bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300 px-1.5 py-0.5 rounded-full">~{event.budget}₾</span>
                                )}
                              </div>
                              {event.personName && (
                                <p className="text-[11px] text-teal-600 dark:text-teal-400">👤 {event.personName}</p>
                              )}
                              {event.location && (
                                <p className="text-[11px] text-teal-600 dark:text-teal-400">📍 {event.location}</p>
                              )}
                              {event.note && (
                                <p className="text-[11px] text-teal-500 dark:text-teal-400 italic">{event.note}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
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
