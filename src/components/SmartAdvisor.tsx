import React, { useMemo, useState } from 'react';
import { AppState, ExpenseCategory } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getWorkDaysInMonth, getExpensesTotal } from '../utils/calculations';

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
  const [expanded, setExpanded] = useState(true);

  const analysis = useMemo(() => {
    const now = new Date();
    const month = selectedMonth !== '' ? parseInt(selectedMonth) : now.getMonth();
    const year = now.getFullYear();
    const profile = state.profile;
    const today = now.toISOString().split('T')[0];

    // === შემოსავლის გამოთვლა ===
    const workDaysInMonth = getWorkDaysInMonth(year, month, profile.workDays || [1, 2, 3, 4, 5]);

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

    let dailyIncome = 0;
    if (profile.incomeType === 'freelance' || profile.incomeType === 'both') {
      dailyIncome = profile.dailyTarget || 0;
    }
    const monthlyDailyIncome = dailyIncome * workDaysInMonth;

    const monthlyAdditional = (profile.additionalIncomes || []).reduce((sum, ai) => {
      if (ai.frequency === 'monthly') return sum + ai.amount;
      if (ai.frequency === 'weekly') return sum + ai.amount * 4;
      if (ai.frequency === 'daily') return sum + ai.amount * workDaysInMonth;
      return sum;
    }, 0);

    const totalMonthlyIncome = monthlySalary + monthlyDailyIncome + monthlyAdditional;

    // === ვალდებულებები ===
    const monthBills = state.bills.filter((b) => (b.reset_month ?? 0) === month);
    const billsTotal = monthBills.reduce((s, b) => s + b.amount, 0);
    const monthSubs = (state.subscriptions || []).filter((s) => (s.reset_month ?? 0) === month);
    const subsTotal = monthSubs.reduce((s, sub) => s + sub.amount, 0);

    const activeDebts = state.debts.filter((d) => !d.paid);
    const totalDebt = activeDebts.reduce((s, d) => s + Math.max(0, d.amount - (d.paidAmount || 0)), 0);
    const monthlyDebtPayment = activeDebts.reduce((s, d) => {
      const remaining = d.amount - (d.paidAmount || 0);
      if (remaining <= 0) return s;
      return s + Math.ceil(remaining / (d.parts || 1));
    }, 0);

    // საშუალო ყოველდღიური ხარჯი
    let avgDailyExpense = 0;
    let daysWithData = 0;
    const expByCategory: Record<ExpenseCategory, number> = {
      'საჭირო': 0, 'აუცილებელი': 0, 'სურვილი': 0, 'გაუთვალისწინებელი': 0,
    };
    // ხარჯები subcategory-ით ბოლო 30 დღის
    const subcatTotals30: Record<string, { total: number; count: number; max: number }> = {};

    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const data = state.db[key];
      if (data) {
        const dayExp = (data.expenses || []).reduce((s, e) => s + e.amount, 0);
        avgDailyExpense += dayExp;
        daysWithData++;
        for (const exp of data.expenses || []) {
          if (exp.category) {
            expByCategory[exp.category] = (expByCategory[exp.category] || 0) + exp.amount;
          }
          const sub = exp.subcategory || 'სხვა';
          if (!subcatTotals30[sub]) subcatTotals30[sub] = { total: 0, count: 0, max: 0 };
          subcatTotals30[sub].total += exp.amount;
          subcatTotals30[sub].count += 1;
          subcatTotals30[sub].max = Math.max(subcatTotals30[sub].max, exp.amount);
        }
      }
    }
    avgDailyExpense = daysWithData > 0 ? Math.round(avgDailyExpense / daysWithData) : 0;
    const monthlyLivingExpenses = avgDailyExpense * 30;

    const totalMonthlyObligations = billsTotal + subsTotal + monthlyDebtPayment + monthlyLivingExpenses;
    const monthlyBalance = totalMonthlyIncome - totalMonthlyObligations;
    const deficitPercent = totalMonthlyIncome > 0
      ? Math.round((totalMonthlyObligations / totalMonthlyIncome) * 100)
      : 999;

    // === ჯანმრთელობის ქულა (0-100) ===
    let healthScore = 0;

    // 1. ვალი/შემოსავალი (25 ქულა) — DTI ratio
    if (totalMonthlyIncome > 0) {
      const dti = totalMonthlyObligations / totalMonthlyIncome;
      if (dti <= 0.3) healthScore += 25;
      else if (dti <= 0.5) healthScore += 20;
      else if (dti <= 0.7) healthScore += 12;
      else if (dti <= 1.0) healthScore += 5;
    }

    // 2. დანაზოგის რეიტი (25 ქულა) — kulaba / income
    const totalKulaba = Object.values(state.db).reduce((s, d) => s + (d.kulaba || 0), 0);
    const totalIncomeReal = Object.values(state.db).reduce((s, d) => s + (d.incMain || 0) + (d.incExtra || 0), 0);
    if (totalIncomeReal > 0) {
      const savingsRate = totalKulaba / totalIncomeReal;
      if (savingsRate >= 0.2) healthScore += 25;
      else if (savingsRate >= 0.1) healthScore += 18;
      else if (savingsRate >= 0.05) healthScore += 10;
      else if (savingsRate > 0) healthScore += 5;
    }

    // 3. ბილების დროულობა (20 ქულა)
    const allBillsCount = monthBills.length;
    const paidBillsCount = monthBills.filter((b) => b.paid).length;
    const overdueBills = monthBills.filter((b) => !b.paid && b.dueDate && b.dueDate < today);
    if (allBillsCount > 0) {
      const paidRate = paidBillsCount / allBillsCount;
      healthScore += Math.round(paidRate * 15);
      if (overdueBills.length === 0) healthScore += 5;
    } else {
      healthScore += 20; // ბილები არ აქვს — ნეიტრალური
    }

    // 4. ბიუჯეტის დაცვა (15 ქულა) — რამდენ დღეს ხარჯი < ბიუჯეტი
    const dailyBudget = profile.dailyBudget || profile.dailyTarget || 150;
    let daysUnderBudget = 0;
    let totalDaysChecked = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const data = state.db[key];
      if (data) {
        totalDaysChecked++;
        const dayExp = getExpensesTotal(data);
        if (dayExp <= dailyBudget) daysUnderBudget++;
      }
    }
    if (totalDaysChecked > 0) {
      healthScore += Math.round((daysUnderBudget / totalDaysChecked) * 15);
    } else {
      healthScore += 8;
    }

    // 5. საგანგებო ფონდი (15 ქულა) — kulaba / avgMonthlyExpenses
    if (monthlyLivingExpenses > 0) {
      const monthsCovered = totalKulaba / monthlyLivingExpenses;
      if (monthsCovered >= 3) healthScore += 15;
      else if (monthsCovered >= 1) healthScore += 10;
      else if (monthsCovered >= 0.5) healthScore += 5;
      else if (totalKulaba > 0) healthScore += 2;
    } else {
      healthScore += 8;
    }

    healthScore = Math.min(100, Math.max(0, healthScore));

    // === "ჯიბეში" — რეალურად რამდენი გაქვს დასახარჯი ===
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayDate = now.getDate();
    const daysRemaining = Math.max(1, daysInMonth - todayDate + 1);

    // ამ თვის რეალური შემოსავალი
    let monthActualIncome = 0;
    let monthActualExpenses = 0;
    Object.entries(state.db).forEach(([date, day]) => {
      if (new Date(date).getMonth() === month) {
        monthActualIncome += (day.incMain || 0) + (day.incExtra || 0);
        monthActualExpenses += getExpensesTotal(day) + (day.kulaba || 0);
      }
    });

    const unpaidBillsLeft = monthBills.filter((b) => !b.paid).reduce((s, b) => s + b.amount, 0);
    const unpaidSubsLeft = monthSubs.filter((s) => !s.paid).reduce((s, sub) => s + sub.amount, 0);
    const inMyPocket = monthActualIncome - monthActualExpenses - unpaidBillsLeft - unpaidSubsLeft;
    const dailySafeSpend = Math.max(0, Math.floor(inMyPocket / daysRemaining));

    // === 50/30/20 ანალიზი ===
    const totalCatExp = Object.values(expByCategory).reduce((s, v) => s + v, 0);
    const needsPercent = totalCatExp > 0 ? Math.round(((expByCategory['საჭირო'] + expByCategory['აუცილებელი']) / totalCatExp) * 100) : 0;
    const wantsPercent = totalCatExp > 0 ? Math.round((expByCategory['სურვილი'] / totalCatExp) * 100) : 0;
    const savingsPercent = totalIncomeReal > 0 ? Math.round((totalKulaba / totalIncomeReal) * 100) : 0;

    // === ხარჯვის ანომალიები ===
    const anomalies: string[] = [];
    const todayData = state.db[today];
    if (todayData) {
      for (const exp of todayData.expenses || []) {
        const sub = exp.subcategory || 'სხვა';
        const stats = subcatTotals30[sub];
        if (stats && stats.count >= 3) {
          const avg = stats.total / stats.count;
          if (exp.amount > avg * 2 && exp.amount > 20) {
            anomalies.push(`${sub}: ${exp.amount}₾ (საშუალო: ${Math.round(avg)}₾)`);
          }
        }
      }
      const todayTotal = getExpensesTotal(todayData);
      if (avgDailyExpense > 0 && todayTotal > avgDailyExpense * 2 && todayTotal > 30) {
        anomalies.push(`დღეს სულ: ${todayTotal}₾ (საშუალო: ${avgDailyExpense}₾/დღე)`);
      }
    }

    // === ფორეკასტი — შემდეგ 30 დღეში სად გელოდება კასის დეფიციტი ===
    let forecastBalance = inMyPocket;
    const expectedDailyInc = totalMonthlyIncome > 0 ? Math.round(totalMonthlyIncome / 30) : 0;
    let cashCrunchDate: string | null = null;
    for (let i = 1; i <= 30; i++) {
      const fd = new Date();
      fd.setDate(fd.getDate() + i);
      const fdStr = fd.toISOString().split('T')[0];

      forecastBalance += expectedDailyInc;
      forecastBalance -= avgDailyExpense;

      // გადასახადები ამ თარიღზე
      for (const bill of state.bills) {
        if (!bill.paid && bill.dueDate === fdStr) {
          forecastBalance -= bill.amount;
        }
      }
      for (const sub of state.subscriptions || []) {
        if (!sub.paid && sub.dueDate === fdStr) {
          forecastBalance -= sub.amount;
        }
      }

      if (forecastBalance < 0 && !cashCrunchDate) {
        cashCrunchDate = fdStr;
      }
    }

    // === ვალის სტრატეგია ===
    let debtStrategy: { snowballMonths: number; avalancheMonths: number; monthlySaved: number } | null = null;
    if (activeDebts.length >= 2 && monthlyBalance > 0) {
      const extraForDebt = Math.min(monthlyBalance, 200);

      // Snowball — პატარადან დიდისკენ
      const snowball = [...activeDebts].sort((a, b) => {
        const ra = a.amount - (a.paidAmount || 0);
        const rb = b.amount - (b.paidAmount || 0);
        return ra - rb;
      });
      let sbMonths = 0;
      let sbRemaining = snowball.map((d) => d.amount - (d.paidAmount || 0));
      while (sbRemaining.some((r) => r > 0) && sbMonths < 120) {
        sbMonths++;
        let extra = extraForDebt;
        for (let i = 0; i < sbRemaining.length; i++) {
          if (sbRemaining[i] <= 0) continue;
          const minPay = Math.ceil(snowball[i].amount / (snowball[i].parts || 12));
          const pay = minPay + extra;
          sbRemaining[i] -= pay;
          extra = sbRemaining[i] < 0 ? Math.abs(sbRemaining[i]) : 0;
          if (sbRemaining[i] < 0) sbRemaining[i] = 0;
        }
      }

      // Avalanche — მაღალი პრიორიტეტიდან
      const avalanche = [...activeDebts].sort((a, b) => {
        const po: Record<string, number> = { high: 0, medium: 1, low: 2 };
        return (po[a.priority || 'low'] || 2) - (po[b.priority || 'low'] || 2);
      });
      let avMonths = 0;
      let avRemaining = avalanche.map((d) => d.amount - (d.paidAmount || 0));
      while (avRemaining.some((r) => r > 0) && avMonths < 120) {
        avMonths++;
        let extra = extraForDebt;
        for (let i = 0; i < avRemaining.length; i++) {
          if (avRemaining[i] <= 0) continue;
          const minPay = Math.ceil(avalanche[i].amount / (avalanche[i].parts || 12));
          const pay = minPay + extra;
          avRemaining[i] -= pay;
          extra = avRemaining[i] < 0 ? Math.abs(avRemaining[i]) : 0;
          if (avRemaining[i] < 0) avRemaining[i] = 0;
        }
      }

      if (sbMonths !== avMonths) {
        debtStrategy = {
          snowballMonths: sbMonths,
          avalancheMonths: avMonths,
          monthlySaved: Math.abs(sbMonths - avMonths),
        };
      }
    }

    // === ინსაითები ===
    const insights: Insight[] = [];

    if (totalMonthlyIncome > 0 && monthlyBalance < 0) {
      const deficit = Math.abs(monthlyBalance);
      const dailyExtra = Math.ceil(deficit / workDaysInMonth);
      insights.push({
        level: 'critical',
        icon: '🚨',
        title: 'შემოსავალი არ გყოფნის!',
        message: `დეფიციტი: ${deficit}₾/თვე. გჭირდება +${dailyExtra}₾/დღეში.`,
      });
    }

    if (totalMonthlyIncome > 0 && deficitPercent >= 80 && monthlyBalance >= 0) {
      insights.push({
        level: 'warning',
        icon: '⚠️',
        title: `შემოსავლის ${deficitPercent}% ვალდებულებებშია`,
        message: `თავისუფალი: ${monthlyBalance}₾/თვე.`,
      });
    }

    if (overdueBills.length > 0) {
      insights.push({
        level: 'critical',
        icon: '⏰',
        title: `${overdueBills.length} ვადაგასული!`,
        message: `${overdueBills.reduce((s, b) => s + b.amount, 0)}₾ — გადაიხადე დაუყოვნებლივ.`,
      });
    }

    // მოახლოებული 3 დღეში
    const threeDays = new Date();
    threeDays.setDate(threeDays.getDate() + 3);
    const threeDaysStr = threeDays.toISOString().split('T')[0];
    const upcoming = monthBills.filter((b) => !b.paid && b.dueDate && b.dueDate >= today && b.dueDate <= threeDaysStr);
    if (upcoming.length > 0) {
      insights.push({
        level: 'warning',
        icon: '📆',
        title: `${upcoming.length} გადასახადი 3 დღეში`,
        message: `${upcoming.map((b) => b.name).join(', ')} — ${upcoming.reduce((s, b) => s + b.amount, 0)}₾`,
      });
    }

    // ანომალიები
    if (anomalies.length > 0) {
      insights.push({
        level: 'warning',
        icon: '📈',
        title: 'უჩვეულო ხარჯი!',
        message: anomalies.join(' · '),
      });
    }

    // ფორეკასტი
    if (cashCrunchDate) {
      const crunchDate = new Date(cashCrunchDate);
      const daysUntil = Math.ceil((crunchDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      insights.push({
        level: 'critical',
        icon: '💸',
        title: `კასის დეფიციტი ${daysUntil} დღეში!`,
        message: `${cashCrunchDate} — ბალანსი უარყოფითი გახდება. გაზარდე შემოსავალი ან შეამცირე ხარჯი.`,
      });
    }

    // 50/30/20
    if (totalCatExp > 0 && needsPercent > 60) {
      insights.push({
        level: 'info',
        icon: '📊',
        title: `საჭიროებები: ${needsPercent}% (რეკომენდაცია: 50%)`,
        message: `სურვილები: ${wantsPercent}%. შეამცირე აუცილებელი ხარჯები ${needsPercent - 50}%-ით.`,
      });
    }

    // ვალის სტრატეგია
    if (debtStrategy) {
      const better = debtStrategy.snowballMonths < debtStrategy.avalancheMonths ? 'Snowball' : 'Avalanche';
      const diff = Math.abs(debtStrategy.snowballMonths - debtStrategy.avalancheMonths);
      insights.push({
        level: 'info',
        icon: '🎯',
        title: `${better} სტრატეგია ${diff} თვით უკეთესია`,
        message: `Snowball: ${debtStrategy.snowballMonths} თვე · Avalanche: ${debtStrategy.avalancheMonths} თვე`,
      });
    }

    // მაღალი პრიორიტეტი
    const hpDebts = activeDebts.filter((d) => d.priority === 'high');
    if (hpDebts.length > 0) {
      insights.push({
        level: 'warning',
        icon: '🔴',
        title: `${hpDebts.length} მაღალი პრიორიტეტის ვალი`,
        message: `${hpDebts.reduce((s, d) => s + Math.max(0, d.amount - (d.paidAmount || 0)), 0)}₾`,
      });
    }

    // სესხის ვადა
    for (const loan of state.bankLoans || []) {
      if (!loan.active) continue;
      const end = new Date(loan.endDate + '-01');
      const ml = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
      if (ml <= 3 && ml > 0) {
        insights.push({
          level: 'info', icon: '🏦',
          title: `სესხი მთავრდება ${ml} თვეში`,
          message: `${loan.name || loan.type} — ${loan.principal}₾`,
        });
      }
    }

    // კარგია
    if (totalMonthlyIncome > 0 && deficitPercent < 60 && overdueBills.length === 0) {
      insights.push({
        level: 'success', icon: '✅',
        title: 'ფინანსური მდგომარეობა კარგია',
        message: `${100 - deficitPercent}% თავისუფალია.`,
      });
    }

    if (totalMonthlyIncome === 0) {
      insights.push({
        level: 'info', icon: '💡',
        title: 'შემოსავალი არ არის მითითებული',
        message: 'დააყენე პროფილში რომ ანალიზი იმუშაოს.',
      });
    }

    // === ახალი ჭკვიანი ანალიტიკა ===

    // 1. Net Worth — წმინდა ღირებულება
    const totalBankLoanDebt = (state.bankLoans || [])
      .filter((l) => l.active)
      .reduce((s, l) => s + l.principal, 0);
    const totalLombardDebt = (state.lombards || [])
      .filter((l) => l.active)
      .reduce((s, l) => s + l.principal, 0);
    const netWorth = totalKulaba - totalDebt - totalBankLoanDebt - totalLombardDebt;

    // 2. Burn Rate — ხარჯვის სიჩქარე
    const targetDailyRate = totalMonthlyIncome > 0 ? Math.round(totalMonthlyIncome / daysInMonth) : 0;
    const burnRateRatio = targetDailyRate > 0 ? avgDailyExpense / targetDailyRate : 0;
    const burnRateStatus: 'fast' | 'normal' | 'slow' =
      burnRateRatio > 1.2 ? 'fast' : burnRateRatio < 0.8 ? 'slow' : 'normal';

    // 3. Spending Streaks — ხარჯვის სტრიქები
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    let kulabaStreak = 0;
    let tempKulabaStreak = 0;
    for (let i = 0; i < 90; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const data = state.db[key];
      if (data) {
        const dayExp = getExpensesTotal(data);
        if (dayExp <= dailyBudget) {
          tempStreak++;
          if (i === currentStreak) currentStreak = tempStreak;
        } else {
          tempStreak = 0;
        }
        bestStreak = Math.max(bestStreak, tempStreak);

        if ((data.kulaba || 0) > 0) {
          tempKulabaStreak++;
          if (i < 30) kulabaStreak = tempKulabaStreak;
        } else {
          tempKulabaStreak = 0;
        }
      } else {
        tempStreak = 0;
        tempKulabaStreak = 0;
      }
    }

    // 4. Top 3 Money Drains — 3 ყველაზე დიდი ხარჯი
    const subcatRanking = Object.entries(subcatTotals30)
      .map(([name, s]) => ({ name, total: s.total, count: s.count }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);

    // 5. Weekend vs Weekday — შაბათ-კვირა vs სამუშაო
    let weekdayTotal = 0, weekdayCount = 0, weekendTotal = 0, weekendCount = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const data = state.db[key];
      if (data) {
        const dayExp = getExpensesTotal(data);
        const dow = d.getDay();
        if (dow === 0 || dow === 6) {
          weekendTotal += dayExp;
          weekendCount++;
        } else {
          weekdayTotal += dayExp;
          weekdayCount++;
        }
      }
    }
    const avgWeekday = weekdayCount > 0 ? Math.round(weekdayTotal / weekdayCount) : 0;
    const avgWeekend = weekendCount > 0 ? Math.round(weekendTotal / weekendCount) : 0;
    const weekendPremium = avgWeekday > 0 ? Math.round(((avgWeekend - avgWeekday) / avgWeekday) * 100) : 0;

    // 6. Latte Factor — პატარა ყოველდღიური ხარჯები
    const latteFactor: { name: string; dailyAvg: number; yearlyTotal: number }[] = [];
    for (const [name, s] of Object.entries(subcatTotals30)) {
      if (s.count >= 5 && s.total / s.count < 15) {
        const dailyAvg = Math.round(s.total / 30);
        if (dailyAvg > 0) {
          latteFactor.push({ name, dailyAvg, yearlyTotal: dailyAvg * 365 });
        }
      }
    }

    // 7. Financial Independence — ფინანსური დამოუკიდებლობა
    const monthlyFullExpenses = monthlyLivingExpenses + billsTotal + subsTotal + monthlyDebtPayment;
    const fiMonths = monthlyFullExpenses > 0 ? totalKulaba / monthlyFullExpenses : 0;
    const fiLabel = fiMonths >= 6 ? '6+ თვე' : fiMonths >= 3 ? '3-6 თვე' : fiMonths >= 1 ? '1-3 თვე' : fiMonths >= (7 / 30) ? '1 კვირა+' : 'არ აქვს';

    // 8. Adaptive Budget — ადაპტიური ბიუჯეტი
    // ბოლო 7 დღის ხარჯი vs ბიუჯეტი
    let last7Expenses = 0, last7Days = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const data = state.db[key];
      if (data) {
        last7Expenses += getExpensesTotal(data);
        last7Days++;
      }
    }
    const last7Avg = last7Days > 0 ? Math.round(last7Expenses / last7Days) : 0;
    const adaptiveBudget = Math.round(dailyBudget + (dailyBudget - last7Avg) * 0.5);
    const cappedAdaptive = Math.max(Math.round(dailyBudget * 0.7), Math.min(Math.round(dailyBudget * 1.3), adaptiveBudget));

    // 9. Category Drift — კატეგორიის ცვლილება (ეს თვე vs წინა)
    const prevMonth = month === 0 ? 11 : month - 1;
    const catThisMonth: Record<string, number> = {};
    const catPrevMonth: Record<string, number> = {};
    Object.entries(state.db).forEach(([date, day]) => {
      const dm = new Date(date).getMonth();
      for (const exp of day.expenses || []) {
        const sub = exp.subcategory || 'სხვა';
        if (dm === month) catThisMonth[sub] = (catThisMonth[sub] || 0) + exp.amount;
        if (dm === prevMonth) catPrevMonth[sub] = (catPrevMonth[sub] || 0) + exp.amount;
      }
    });
    const categoryDrifts: { name: string; change: number; thisMonth: number; prevMonth: number }[] = [];
    for (const [name, amount] of Object.entries(catThisMonth)) {
      const prev = catPrevMonth[name] || 0;
      if (prev > 0) {
        const change = Math.round(((amount - prev) / prev) * 100);
        if (Math.abs(change) > 30 && amount > 20) {
          categoryDrifts.push({ name, change, thisMonth: amount, prevMonth: prev });
        }
      }
    }
    categoryDrifts.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

    // 10. Kulaba Velocity — დანაზოგის სიჩქარე და მიზნის ETA
    let kulabaLast30 = 0;
    let kulabaDaysWithData = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const data = state.db[key];
      if (data && (data.kulaba || 0) > 0) {
        kulabaLast30 += data.kulaba;
        kulabaDaysWithData++;
      }
    }
    const avgDailyKulaba = kulabaDaysWithData > 0 ? kulabaLast30 / kulabaDaysWithData : 0;
    const goalRemaining = Math.max(0, state.goal - totalKulaba);
    const daysToGoal = avgDailyKulaba > 0 ? Math.ceil(goalRemaining / avgDailyKulaba) : 999;

    // 11. Expense Elasticity — ფიქსირებული vs ცვალებადი
    const fixedExpenses = billsTotal + subsTotal + monthlyDebtPayment;
    const variableExpenses = monthlyLivingExpenses;
    const totalExpForElasticity = fixedExpenses + variableExpenses;
    const flexibilityRatio = totalExpForElasticity > 0 ? Math.round((variableExpenses / totalExpForElasticity) * 100) : 50;

    // 12. Lombard Cost Visibility
    const lombardInsights: { name: string; totalPaid: number; principal: number; costRatio: number }[] = [];
    for (const l of state.lombards || []) {
      if (!l.active) continue;
      const paidBills = l.billIds.map(id => state.bills.find(b => b.id === id)).filter(b => b?.paid);
      const totalInterestPaid = paidBills.reduce((s, b) => s + (b?.amount || 0), 0);
      if (totalInterestPaid > 0) {
        lombardInsights.push({
          name: l.itemName,
          totalPaid: totalInterestPaid,
          principal: l.principal,
          costRatio: Math.round((totalInterestPaid / l.principal) * 100),
        });
      }
    }

    // 13. Subscription Annual View
    const subsAnnualCost = (state.subscriptions || [])
      .filter(s => !s.paid || true) // ყველა გამოწერა
      .reduce((s, sub) => s + sub.amount * 12, 0);

    // === ახალი ინსაითები ===

    // Burn Rate
    if (burnRateStatus === 'fast' && avgDailyExpense > 0) {
      insights.push({
        level: 'warning', icon: '🔥',
        title: `ხარჯავ ძალიან სწრაფად!`,
        message: `${avgDailyExpense}₾/დღე (ნორმა: ${targetDailyRate}₾). ამ ტემპით თვის ბოლომდე ვერ მიაღწევ.`,
      });
    }

    // Weekend premium
    if (weekendPremium > 40 && avgWeekend > 20) {
      insights.push({
        level: 'info', icon: '📅',
        title: `შაბათ-კვირა ${weekendPremium}%-ით ძვირი`,
        message: `სამუშაო: ${avgWeekday}₾ · შაბათ-კვირა: ${avgWeekend}₾/დღე`,
      });
    }

    // Latte factor
    for (const lf of latteFactor.slice(0, 1)) {
      insights.push({
        level: 'info', icon: '☕',
        title: `${lf.name}: ${lf.dailyAvg}₾/დღე = ${lf.yearlyTotal}₾/წელი`,
        message: `ეს პატარა ხარჯი წელიწადში ${lf.yearlyTotal}₾ ჯდება.`,
      });
    }

    // Category drift
    for (const drift of categoryDrifts.slice(0, 1)) {
      insights.push({
        level: drift.change > 0 ? 'warning' : 'success',
        icon: drift.change > 0 ? '📈' : '📉',
        title: `${drift.name}: ${drift.change > 0 ? '+' : ''}${drift.change}% ცვლილება`,
        message: `ეს თვე: ${drift.thisMonth}₾ · წინა: ${drift.prevMonth}₾`,
      });
    }

    // Kulaba velocity
    if (state.goal > 0 && totalKulaba > 0 && daysToGoal < 999 && daysToGoal > 0) {
      const eta = new Date();
      eta.setDate(eta.getDate() + daysToGoal);
      insights.push({
        level: 'info', icon: '🏺',
        title: `მიზანი: ${daysToGoal} დღეში (${eta.toLocaleDateString('ka-GE', { month: 'short', day: 'numeric' })})`,
        message: `${totalKulaba}₾ / ${state.goal}₾ · საშუალო: ${Math.round(avgDailyKulaba)}₾/დღე`,
      });
    }

    // Spending streaks
    if (currentStreak >= 3) {
      insights.push({
        level: 'success', icon: '🔥',
        title: `${currentStreak} დღე ბიუჯეტში! ${currentStreak >= bestStreak ? '🏆 რეკორდი!' : `(რეკ: ${bestStreak})`}`,
        message: kulabaStreak > 0 ? `ასევე ${kulabaStreak} დღე ზედიზედ ზოგავ!` : 'გააგრძელე ასე!',
      });
    }

    // Lombard cost warning
    for (const li of lombardInsights) {
      if (li.costRatio >= 80) {
        insights.push({
          level: 'critical', icon: '🏪',
          title: `${li.name}: პროცენტი = ძირის ${li.costRatio}%!`,
          message: `გადახდილი: ${li.totalPaid}₾ · ძირი: ${li.principal}₾. განიხილე გამოსყიდვა.`,
        });
      }
    }

    // Flexibility warning
    if (flexibilityRatio < 25 && totalExpForElasticity > 0) {
      insights.push({
        level: 'warning', icon: '🔒',
        title: `ხარჯების ${100 - flexibilityRatio}% ფიქსირებულია`,
        message: `მხოლოდ ${flexibilityRatio}% შეგიძლია შეამცირო. ფიქსირებული: ${fixedExpenses}₾/თვე.`,
      });
    }

    // Adaptive budget suggestion
    if (last7Avg > 0 && Math.abs(cappedAdaptive - dailyBudget) > 5) {
      if (cappedAdaptive > dailyBudget) {
        insights.push({
          level: 'success', icon: '💪',
          title: `ბონუს ბიუჯეტი: ${cappedAdaptive}₾ დღეს`,
          message: `კარგად ზოგავდი — +${cappedAdaptive - dailyBudget}₾ ბონუსი ნორმალურ ${dailyBudget}₾-ს.`,
        });
      } else {
        insights.push({
          level: 'warning', icon: '📉',
          title: `შემცირებული ბიუჯეტი: ${cappedAdaptive}₾ დღეს`,
          message: `ბოლო 7 დღე ზედმეტად ხარჯავდი. ნორმა ${dailyBudget}₾ → ${cappedAdaptive}₾.`,
        });
      }
    }

    return {
      totalMonthlyIncome, monthlySalary, monthlyDailyIncome, monthlyAdditional,
      billsTotal, subsTotal, monthlyDebtPayment, monthlyLivingExpenses,
      totalMonthlyObligations, monthlyBalance, deficitPercent, totalDebt,
      healthScore, inMyPocket, dailySafeSpend, daysRemaining,
      needsPercent, wantsPercent, savingsPercent,
      insights,
      // ახალი მონაცემები UI-სთვის
      netWorth, burnRateRatio, burnRateStatus,
      currentStreak, bestStreak, kulabaStreak,
      subcatRanking, avgWeekday, avgWeekend, weekendPremium,
      fiMonths, fiLabel,
      cappedAdaptive, dailyBudget,
      flexibilityRatio, fixedExpenses, variableExpenses,
      subsAnnualCost, totalKulaba, goalRemaining, daysToGoal,
      latteFactor, categoryDrifts, lombardInsights,
    };
  }, [state, selectedMonth]);

  const a = analysis;

  const levelStyles: Record<AlertLevel, { bg: string; border: string; iconColor: string }> = {
    critical: { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-300 dark:border-red-700', iconColor: 'text-red-500' },
    warning: { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-300 dark:border-amber-700', iconColor: 'text-amber-500' },
    info: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-300 dark:border-blue-700', iconColor: 'text-blue-500' },
    success: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-300 dark:border-emerald-700', iconColor: 'text-emerald-500' },
  };

  const scoreColor = a.healthScore >= 70 ? '#10b981' : a.healthScore >= 40 ? '#f59e0b' : '#ef4444';
  const scoreLabel = a.healthScore >= 80 ? 'შესანიშნავი' : a.healthScore >= 60 ? 'კარგი' : a.healthScore >= 40 ? 'საშუალო' : a.healthScore >= 20 ? 'სუსტი' : 'კრიტიკული';

  return (
    <div className="space-y-2">
      {/* ჰედერი — ჯანმრთელობის ქულა + ჯიბეში */}
      <Card className="border-0 bg-gradient-to-r from-slate-50 to-indigo-50 dark:from-slate-800/50 dark:to-indigo-900/20">
        <CardContent className="p-2.5">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between mb-2"
          >
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">ჭკვიანი მრჩეველი</span>
              {a.insights.filter((i) => i.level === 'critical').length > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </div>
            {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>

          {/* ჯანმრთელობის ქულა + ჯიბეში — ყოველთვის ჩანს */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {/* ქულა */}
            <div className="relative">
              <svg viewBox="0 0 36 36" className="w-14 h-14 mx-auto">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-200 dark:text-slate-700"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke={scoreColor} strokeWidth="3"
                  strokeDasharray={`${a.healthScore}, 100`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-black" style={{ color: scoreColor }}>{a.healthScore}</span>
              </div>
              <p className="text-[8px] font-bold mt-0.5" style={{ color: scoreColor }}>{scoreLabel}</p>
            </div>

            {/* ჯიბეში */}
            <div>
              <p className="text-[8px] text-muted-foreground mb-0.5">💰 ჯიბეში</p>
              <p className={cn('text-lg font-black', a.inMyPocket >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                {a.inMyPocket}₾
              </p>
              <p className="text-[8px] text-muted-foreground">{a.daysRemaining} დღე დარჩა</p>
            </div>

            {/* დღიური ლიმიტი */}
            <div>
              <p className="text-[8px] text-muted-foreground mb-0.5">📊 დღეს</p>
              <p className={cn('text-lg font-black', a.dailySafeSpend >= (a.totalMonthlyIncome > 0 ? 20 : 0) ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400')}>
                {a.dailySafeSpend}₾
              </p>
              <p className="text-[8px] text-muted-foreground">უსაფრთხო</p>
            </div>
          </div>

          {/* 50/30/20 მინი ბარი */}
          {a.needsPercent + a.wantsPercent > 0 && (
            <div className="mt-2">
              <div className="flex h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                <div className="bg-blue-500 transition-all" style={{ width: `${a.needsPercent}%` }} title={`საჭირო: ${a.needsPercent}%`} />
                <div className="bg-orange-400 transition-all" style={{ width: `${a.wantsPercent}%` }} title={`სურვილი: ${a.wantsPercent}%`} />
                <div className="bg-emerald-500 transition-all" style={{ width: `${a.savingsPercent}%` }} title={`დანაზოგი: ${a.savingsPercent}%`} />
              </div>
              <div className="flex justify-between text-[8px] mt-0.5 text-muted-foreground">
                <span>🔵 საჭირო {a.needsPercent}%</span>
                <span>🟠 სურვილი {a.wantsPercent}%</span>
                <span>🟢 დანაზოგი {a.savingsPercent}%</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ჩამოშლადი ნაწილი */}
      {expanded && (
        <>
          {/* ფინანსური მიმოხილვა */}
          {a.totalMonthlyIncome > 0 && (
            <Card className="border-0 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800/50 dark:to-blue-900/20">
              <CardContent className="p-2.5">
                <div className="mb-1.5">
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">შემოსავალი: {a.totalMonthlyIncome}₾</span>
                    <span className="text-red-500 font-bold">ვალდებულებები: {a.totalMonthlyObligations}₾</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-500',
                        a.deficitPercent > 100 ? 'bg-red-500' : a.deficitPercent > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                      )}
                      style={{ width: `${Math.min(a.deficitPercent, 100)}%` }}
                    />
                  </div>
                  <p className="text-[8px] text-center text-muted-foreground mt-0.5">
                    {a.deficitPercent > 100
                      ? `🔴 ${a.deficitPercent - 100}% დეფიციტი`
                      : `თავისუფალი: ${100 - a.deficitPercent}% (${a.monthlyBalance}₾)`}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[9px]">
                  {a.monthlySalary > 0 && (
                    <div className="flex justify-between"><span className="text-muted-foreground">💼 ხელფასი:</span><span className="font-bold text-emerald-600 dark:text-emerald-400">{a.monthlySalary}₾</span></div>
                  )}
                  {a.monthlyDailyIncome > 0 && (
                    <div className="flex justify-between"><span className="text-muted-foreground">📊 ყოველდღიური:</span><span className="font-bold text-emerald-600 dark:text-emerald-400">{a.monthlyDailyIncome}₾</span></div>
                  )}
                  {a.billsTotal > 0 && (
                    <div className="flex justify-between"><span className="text-muted-foreground">📅 ბილები:</span><span className="font-bold text-red-500">{a.billsTotal}₾</span></div>
                  )}
                  {a.subsTotal > 0 && (
                    <div className="flex justify-between"><span className="text-muted-foreground">🔄 გამოწერები:</span><span className="font-bold text-red-500">{a.subsTotal}₾</span></div>
                  )}
                  {a.monthlyDebtPayment > 0 && (
                    <div className="flex justify-between"><span className="text-muted-foreground">💸 ვალები:</span><span className="font-bold text-red-500">{a.monthlyDebtPayment}₾</span></div>
                  )}
                  {a.monthlyLivingExpenses > 0 && (
                    <div className="flex justify-between"><span className="text-muted-foreground">🛒 საყოფაცხოვრებო:</span><span className="font-bold text-red-500">{a.monthlyLivingExpenses}₾</span></div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ახალი მეტრიკები — Net Worth, Burn Rate, Streaks, FI */}
          <div className="grid grid-cols-4 gap-1.5">
            {/* Net Worth */}
            <div className="rounded-xl bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-800/40 dark:to-slate-800/20 p-2 text-center border border-slate-200 dark:border-slate-700">
              <p className="text-[7px] text-muted-foreground mb-0.5">💎 წმინდა ღირ.</p>
              <p className={cn('text-xs font-black', a.netWorth >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                {a.netWorth >= 0 ? '' : '-'}{Math.abs(a.netWorth)}₾
              </p>
            </div>
            {/* Burn Rate */}
            <div className={cn('rounded-xl p-2 text-center border',
              a.burnRateStatus === 'fast' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
              : a.burnRateStatus === 'slow' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700'
              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700')}>
              <p className="text-[7px] text-muted-foreground mb-0.5">
                {a.burnRateStatus === 'fast' ? '🔥' : a.burnRateStatus === 'slow' ? '🐢' : '⚡'} ტემპი
              </p>
              <p className={cn('text-xs font-black',
                a.burnRateStatus === 'fast' ? 'text-red-600 dark:text-red-400'
                : a.burnRateStatus === 'slow' ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-blue-600 dark:text-blue-400')}>
                {Math.round(a.burnRateRatio * 100)}%
              </p>
            </div>
            {/* Streaks */}
            <div className="rounded-xl bg-gradient-to-b from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-900/10 p-2 text-center border border-amber-200 dark:border-amber-700">
              <p className="text-[7px] text-muted-foreground mb-0.5">🔥 სტრიქი</p>
              <p className="text-xs font-black text-amber-600 dark:text-amber-400">{a.currentStreak} დღე</p>
            </div>
            {/* FI */}
            <div className={cn('rounded-xl p-2 text-center border',
              a.fiMonths >= 1 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700'
              : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700')}>
              <p className="text-[7px] text-muted-foreground mb-0.5">🛡️ ბუფერი</p>
              <p className={cn('text-xs font-black', a.fiMonths >= 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400')}>
                {a.fiLabel}
              </p>
            </div>
          </div>

          {/* Top 3 ხარჯი + Weekend/Weekday */}
          {a.subcatRanking.length > 0 && (
            <div className="rounded-xl bg-gradient-to-r from-slate-50 to-rose-50 dark:from-slate-800/40 dark:to-rose-900/10 p-2.5 border border-slate-200 dark:border-slate-700">
              <p className="text-[9px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">🏆 ტოპ 3 ხარჯი (30 დღე)</p>
              <div className="space-y-1">
                {a.subcatRanking.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 w-4">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-[10px]">
                        <span className="font-bold truncate">{item.name}</span>
                        <span className="font-black text-rose-600 dark:text-rose-400">{item.total}₾</span>
                      </div>
                      <div className="h-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mt-0.5">
                        <div
                          className="h-full rounded-full bg-rose-400 dark:bg-rose-500"
                          style={{ width: `${a.subcatRanking[0] ? Math.round((item.total / a.subcatRanking[0].total) * 100) : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {a.weekendPremium !== 0 && (a.avgWeekday > 0 || a.avgWeekend > 0) && (
                <div className="mt-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 flex justify-between text-[9px]">
                  <span className="text-muted-foreground">📊 სამუშაო: {a.avgWeekday}₾/დღე</span>
                  <span className={cn('font-bold', a.weekendPremium > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400')}>
                    შაბ-კვ: {a.avgWeekend}₾ ({a.weekendPremium > 0 ? '+' : ''}{a.weekendPremium}%)
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Flexibility Bar — ფიქსირებული vs ცვალებადი */}
          {a.fixedExpenses + a.variableExpenses > 0 && (
            <div className="rounded-xl bg-gradient-to-r from-slate-50 to-purple-50 dark:from-slate-800/40 dark:to-purple-900/10 p-2.5 border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between text-[9px] mb-1">
                <span className="font-bold text-slate-600 dark:text-slate-400">🔒 ფიქსირებული: {a.fixedExpenses}₾</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">🔄 ცვალებადი: {a.variableExpenses}₾</span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                <div className="bg-slate-500 dark:bg-slate-400" style={{ width: `${100 - a.flexibilityRatio}%` }} />
                <div className="bg-purple-500 dark:bg-purple-400" style={{ width: `${a.flexibilityRatio}%` }} />
              </div>
              <p className="text-[8px] text-center text-muted-foreground mt-0.5">
                {a.flexibilityRatio < 30 ? '⚠️ მხოლოდ ' : ''}
                {a.flexibilityRatio}% შეგიძლია შეამცირო
              </p>
            </div>
          )}

          {/* გამოწერების წლიური ღირებულება */}
          {a.subsAnnualCost > 0 && (
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700">
              <span className="text-[9px] text-violet-600 dark:text-violet-400 font-bold">🔄 გამოწერები წელიწადში:</span>
              <span className="text-sm font-black text-violet-700 dark:text-violet-300">{a.subsAnnualCost}₾</span>
            </div>
          )}

          {/* ინსაითები */}
          {a.insights
            .sort((x, y) => {
              const order: Record<AlertLevel, number> = { critical: 0, warning: 1, info: 2, success: 3 };
              return order[x.level] - order[y.level];
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
        </>
      )}
    </div>
  );
};
