import React, { useMemo, useState } from 'react';
import { Bill, Debt, Subscription } from '../types';
import { getAllPaymentWarnings, PaymentWarning } from '../utils/billWarnings';
import { Bell, AlertTriangle, ChevronUp, ChevronDown, CreditCard, RefreshCw, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface BillAlertsProps {
  bills: Bill[];
  debts: Debt[];
  subscriptions: Subscription[];
}

export const BillAlerts: React.FC<BillAlertsProps> = ({ bills, debts, subscriptions }) => {
  const [isOpen, setIsOpen] = useState(false);
  const warnings = useMemo(() => getAllPaymentWarnings(bills, debts, subscriptions), [bills, debts, subscriptions]);

  if (warnings.length === 0) return null;

  const todayWarnings = warnings.filter((w) => w.daysUntilDue === 0);
  const overdueWarnings = warnings.filter((w) => w.daysUntilDue < 0);
  const upcomingWarnings = warnings.filter((w) => w.daysUntilDue > 0);
  const urgentCount = todayWarnings.length + overdueWarnings.length;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'debt':
        return <CreditCard className="h-3 w-3 opacity-70" />;
      case 'subscription':
        return <RefreshCw className="h-3 w-3 opacity-70" />;
      default:
        return <FileText className="h-3 w-3 opacity-70" />;
    }
  };

  const renderWarning = (w: PaymentWarning) => (
    <div
      key={`${w.type}-${w.id}`}
      className="flex items-center justify-between px-3 py-1.5 rounded text-xs font-bold"
      style={{ backgroundColor: `${w.color}20`, borderLeft: `3px solid ${w.color}`, color: w.color }}
    >
      <span className="flex items-center gap-1.5">
        {getTypeIcon(w.type)}
        {w.daysUntilDue < 0
          ? `${w.name} - ${Math.abs(w.daysUntilDue)} დღით დაგვიანებულია!`
          : w.daysUntilDue === 0
          ? `${w.name} - დღეს უნდა გადაიხადო!`
          : `${w.name} - ${w.daysUntilDue} დღე დარჩა`}
      </span>
      <span>{w.amount}₾</span>
    </div>
  );

  return (
    <div className="mb-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-300 transition-colors text-xs font-bold shadow-sm"
      >
        <span className="flex items-center gap-2">
          <Bell className="h-3.5 w-3.5 text-blue-500" />
          <span className="text-slate-700 dark:text-slate-300">
            გადასახდელები ({warnings.length})
          </span>
          {urgentCount > 0 && (
            <Badge variant="danger" className="text-[10px] px-1.5 py-0.5">
              <AlertTriangle className="h-2.5 w-2.5 mr-1" />
              {urgentCount} სასწრაფო
            </Badge>
          )}
        </span>
        {isOpen ? (
          <ChevronUp className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
        )}
      </button>

      {isOpen && (
        <Card className="mt-2 bg-transparent border-0 shadow-none">
          <CardContent className="p-0 space-y-1 max-h-40 overflow-y-auto">
            {overdueWarnings.length > 0 && (
              <div className="space-y-1">
                {overdueWarnings.map(renderWarning)}
              </div>
            )}

            {todayWarnings.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] text-red-600 dark:text-red-400 font-bold uppercase tracking-wider mt-1">დღეს გადასახდელი:</p>
                {todayWarnings.map(renderWarning)}
              </div>
            )}

            {upcomingWarnings.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider mt-1">მოახლოვებული:</p>
                {upcomingWarnings.map(renderWarning)}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
