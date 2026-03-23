import React, { useMemo } from 'react';
import { AppState } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getWorkDaysInMonth } from '../utils/calculations';

interface SmartAdvisorProps {
  state: AppState;
  selectedMonth: string;
}

type AlertLevel = 'critical' | 'warning' | 'info' | 'success';

type Insight = {
  level: AlertLevel;
  icon: string;
  title: string;
  message: string;
};

export const SmartAdvisor: React.FC<SmartAdvisorProps> = ({ state, selectedMonth }) => {
  const analysis = useMemo(() => {
    const now = new Date();
    const month = selectedMonth !== '' ? parseInt(selectedMonth) : now.getMonth();
    const year = now.getFullYear();
    const profile = state.profile;

    // === შემოსავლის გამოთვლა ===
    const workDaysInMonth = getWorkDaysInMonth(year, month, profile.workDays || [1, 2, 3, 4, 5]);

    // ხელფასი
    let monthlySalary = 0;
    if (profile.incomeType === 'salary' || profile.incomeType === 'both') {
      if (profile.payFrequency === 'monthly_1' || profile.payFrequency === 'monthly_2') {
        monthlySalary = profile.salary || 0;
      } else if (profile.payFrequency === 'biweekly') {
        monthlySalary = (profile.salary || 0) * 2;
      } else if (profile.payFrequency === 'weekly') {
        monthlySalary = (profile.salary || 0) * 4;
      }
    }

    // ყოველდღიური შემოსავალი
    let dailyIncome = 0;
    if (profile.incomeType === 'freelance' || profile.incomeType === 'both') {
      dailyIncome = profile.dailyTarget || 0;
    }
    const monthlyDailyIncome = dailyIncome * workDaysInMonth;

    // დამატებითი შემოსავალი
    const monthlyAdditional = (profile.additionalIncomes || []).reduce((sum, ai) => {
      if (ai.frequency === 'monthly') return sum + ai.amount;
      if (ai.frequency === 'weekly') return sum + ai.amount * 4;
      if (ai.frequency === 'daily') return sum + ai.amount * workDaysInMonth;
      return sum;
    }, 0);

    const totalMonthlyIncome = monthlySalary + monthlyDailyIncome + monthlyAdditional;

    // === ვალდებულებების გამოთვლა ===

    // ყოველთვიური გადასახადები (ამ თვის)
    const monthBills = state.bills.filter((b) => (b.reset_month ?? 0) === month);
    const billsTotal = monthBills.reduce((s, b) => s + b.amount, 0);

    // გამოწერები (ამ თვის)
    const monthSubs = (state.subscriptions || []).filter((s) => (s.reset_month ?? 0) === month);
    const subsTotal = monthSubs.reduce((s, sub) => s + sub.amount, 0);

    // ვალების ყოველთვიური გადახდა (საშუალო)
    const activeDebts = state.debts.filter((d) => !d.paid);
    const totalDebt = activeDebts.reduce((s, d) => s + Math.max(0, d.amount - (d.paidAmount || 0)), 0);
    // ვალის ყოველთვიური — თუ parts აქვს, გამოვიყენოთ; თუ არა, ვადაზე დავყოთ
    const monthlyDebtPayment = activeDebts.reduce((s, d) => {
      const remaining = d.amount - (d.paidAmount || 0);
      if (remaining <= 0) return s;
      const parts = d.parts || 1;
      return s + Math.ceil(remaining / parts);
    }, 0);

    // საშუალო ყოველდღიური ხარჯი (ბოლო 30 დღიდან)
    let avgDailyExpense = 0;
    let daysWithData = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const data = state.db[key];
      if (data) {
        const dayExp = (data.expenses || []).reduce((s, e) => s + e.amount, 0);
        avgDailyExpense += dayExp;
        daysWithData++;
      }
    }
    avgDailyExpense = daysWithData > 0 ? Math.round(avgDailyExpense / daysWithData) : 0;
    const monthlyLivingExpenses = avgDailyExpense * 30;

    // სულ ყოველთვიური ვალდებულებები
    const totalMonthlyObligations = billsTotal + subsTotal + monthlyDebtPayment + monthlyLivingExpenses;

    // ბალანსი
    const monthlyBalance = totalMonthlyIncome - totalMonthlyObligations;
    const deficitPercent = totalMonthlyIncome > 0
      ? Math.round((totalMonthlyObligations / totalMonthlyIncome) * 100)
      : 999;

    // === ინსაითები ===
    const insights: Insight[] = [];

    // 1. კრიტიკული — შემოსავალი < ვალდებულებები
    if (totalMonthlyIncome > 0 && monthlyBalance < 0) {
      const deficit = Math.abs(monthlyBalance);
      const dailyExtra = Math.ceil(deficit / workDaysInMonth);
      insights.push({
        level: 'critical',
        icon: '🚨',
        title: 'შემოსავალი არ გყოფნის!',
        message: `თვიური დეფიციტი: ${deficit}₾. დამატებით ${dailyExtra}₾/დღეში გჭირდება. იპოვე სამუშაო ან შეამცირე ხარჯები.`,
      });
    }

    // 2. გაფრთხილება — 80%+ მიდის ვალდებულებებში
    if (totalMonthlyIncome > 0 && deficitPercent >= 80 && monthlyBalance >= 0) {
      insights.push({
        level: 'warning',
        icon: '⚠️',
        title: 'შემოსავლის ' + deficitPercent + '% ვალდებულებებშია',
        message: `თავისუფალი რჩება მხოლოდ ${monthlyBalance}₾/თვე. ნებისმიერი გაუთვალისწინებელი ხარჯი პრობლემაა.`,
      });
    }

    // 3. ვალების პრიორიტეტი
    const highPriorityDebts = activeDebts.filter((d) => d.priority === 'high');
    if (highPriorityDebts.length > 0) {
      const hpTotal = highPriorityDebts.reduce((s, d) => s + Math.max(0, d.amount - (d.paidAmount || 0)), 0);
      insights.push({
        level: 'warning',
        icon: '🔴',
        title: `${highPriorityDebts.length} მაღალი პრიორიტეტის ვალი`,
        message: `სულ: ${hpTotal}₾. ეს ვალები პირველ რიგში უნდა დაიფაროს.`,
      });
    }

    // 4. ვადაგასული ბილები
    const today = new Date().toISOString().split('T')[0];
    const overdueBills = monthBills.filter((b) => !b.paid && b.dueDate && b.dueDate < today);
    if (overdueBills.length > 0) {
      const overdueTotal = overdueBills.reduce((s, b) => s + b.amount, 0);
      insights.push({
        level: 'critical',
        icon: '⏰',
        title: `${overdueBills.length} ვადაგასული გადასახადი!`,
        message: `${overdueTotal}₾ ვადაგასულია. გადაიხადე რაც შეიძლება მალე ჯარიმის თავიდან ასაცილებლად.`,
      });
    }

    // 5. მოახლოებული გადასახადები (3 დღეში)
    const threeDaysLater = new Date();
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    const threeDaysStr = threeDaysLater.toISOString().split('T')[0];
    const upcomingBills = monthBills.filter(
      (b) => !b.paid && b.dueDate && b.dueDate >= today && b.dueDate <= threeDaysStr
    );
    if (upcomingBills.length > 0) {
      const names = upcomingBills.map((b) => b.name).join(', ');
      const total = upcomingBills.reduce((s, b) => s + b.amount, 0);
      insights.push({
        level: 'warning',
        icon: '📆',
        title: '3 დღეში გადასახდელი',
        message: `${names} — სულ ${total}₾`,
      });
    }

    // 6. ბანკის სესხის ვადა მთავრდება
    for (const loan of state.bankLoans || []) {
      if (!loan.active) continue;
      const end = new Date(loan.endDate + '-01');
      const monthsLeft = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
      if (monthsLeft <= 3 && monthsLeft > 0) {
        insights.push({
          level: 'info',
          icon: '🏦',
          title: `სესხი მთავრდება ${monthsLeft} თვეში`,
          message: `${loan.name || loan.type} — ძირი: ${loan.principal}₾`,
        });
      }
    }

    // 7. დადებითი — კარგად ხარ
    if (totalMonthlyIncome > 0 && deficitPercent < 60) {
      insights.push({
        level: 'success',
        icon: '✅',
        title: 'ფინანსური მდგომარეობა კარგია',
        message: `შემოსავლის ${100 - deficitPercent}% თავისუფალია. გააგრძელე ასე!`,
      });
    }

    // 8. შემოსავალი არ არის დაყენებული
    if (totalMonthlyIncome === 0) {
      insights.push({
        level: 'info',
        icon: '💡',
        title: 'შემოსავალი არ არის მითითებული',
        message: 'დააყენე ხელფასი ან ყოველდღიური შემოსავალი რომ ჭკვიანი ანალიზი იმუშაოს.',
      });
    }

    return {
      totalMonthlyIncome,
      monthlySalary,
      monthlyDailyIncome,
      monthlyAdditional,
      billsTotal,
      subsTotal,
      monthlyDebtPayment,
      monthlyLivingExpenses,
      totalMonthlyObligations,
      monthlyBalance,
      deficitPercent,
      totalDebt,
      insights,
    };
  }, [state, selectedMonth]);

  if (analysis.insights.length === 0) return null;

  const levelStyles: Record<AlertLevel, { bg: string; border: string; iconColor: string }> = {
    critical: { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-300 dark:border-red-700', iconColor: 'text-red-500' },
    warning: { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-300 dark:border-amber-700', iconColor: 'text-amber-500' },
    info: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-300 dark:border-blue-700', iconColor: 'text-blue-500' },
    success: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-300 dark:border-emerald-700', iconColor: 'text-emerald-500' },
  };

  const a = analysis;

  return (
    <div className="space-y-2">
      {/* ფინანსური მიმოხილვა */}
      {a.totalMonthlyIncome > 0 && (
        <Card className="border-0 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800/50 dark:to-blue-900/20">
          <CardContent className="p-2.5">
            <div className="flex items-center gap-1.5 mb-2">
              <Zap className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">ფინანსური ანალიზი</span>
            </div>

            {/* შემოსავალი vs ვალდებულებები ბარი */}
            <div className="mb-2">
              <div className="flex justify-between text-[10px] mb-0.5">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">შემოსავალი: {a.totalMonthlyIncome}₾</span>
                <span className="text-red-500 font-bold">ვალდებულებები: {a.totalMonthlyObligations}₾</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    a.deficitPercent > 100 ? 'bg-red-500' : a.deficitPercent > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                  )}
                  style={{ width: `${Math.min(a.deficitPercent, 100)}%` }}
                />
              </div>
              <p className="text-[9px] text-center text-muted-foreground mt-0.5">
                {a.deficitPercent > 100
                  ? `🔴 ${a.deficitPercent - 100}% დეფიციტი`
                  : `თავისუფალი: ${100 - a.deficitPercent}% (${a.monthlyBalance}₾)`}
              </p>
            </div>

            {/* დეტალები */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[9px]">
              {a.monthlySalary > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">💼 ხელფასი:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{a.monthlySalary}₾</span>
                </div>
              )}
              {a.monthlyDailyIncome > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">📊 ყოველდღიური:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{a.monthlyDailyIncome}₾</span>
                </div>
              )}
              {a.monthlyAdditional > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">➕ დამატებითი:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{a.monthlyAdditional}₾</span>
                </div>
              )}
              {a.billsTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">📅 ბილები:</span>
                  <span className="font-bold text-red-500">{a.billsTotal}₾</span>
                </div>
              )}
              {a.subsTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">🔄 გამოწერები:</span>
                  <span className="font-bold text-red-500">{a.subsTotal}₾</span>
                </div>
              )}
              {a.monthlyDebtPayment > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">💸 ვალები:</span>
                  <span className="font-bold text-red-500">{a.monthlyDebtPayment}₾</span>
                </div>
              )}
              {a.monthlyLivingExpenses > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">🛒 ყოველდღიური:</span>
                  <span className="font-bold text-red-500">{a.monthlyLivingExpenses}₾</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ინსაითების ბარათები */}
      {analysis.insights
        .sort((a, b) => {
          const order: Record<AlertLevel, number> = { critical: 0, warning: 1, info: 2, success: 3 };
          return order[a.level] - order[b.level];
        })
        .map((insight, i) => {
          const style = levelStyles[insight.level];
          return (
            <div
              key={i}
              className={cn('flex items-start gap-2 px-2.5 py-2 rounded-xl border', style.bg, style.border)}
            >
              <span className="text-sm shrink-0 mt-0.5">{insight.icon}</span>
              <div className="min-w-0">
                <p className={cn('text-[11px] font-black', style.iconColor)}>{insight.title}</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{insight.message}</p>
              </div>
            </div>
          );
        })}
    </div>
  );
};
