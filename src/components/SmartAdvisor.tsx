import React, { useMemo, useState } from 'react';
import { AppState, ExpenseCategory } from '../types';
// Card removed — using plain divs for lighter UI
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
  const [expanded, setExpanded] = useState(false);
  const [showAllInsights, setShowAllInsights] = useState(false);

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
      const paidBillsCount = state.bills.filter((b) => loan.billIds.includes(b.id) && b.paid).length;
      const monthsRemaining = Math.max(0, loan.totalMonths - paidBillsCount);
      if (monthsRemaining <= 3 && monthsRemaining > 0) {
        insights.push({
          level: 'info', icon: '🏦',
          title: `სესხი მთავრდება ${monthsRemaining} თვეში`,
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

    // === ახალი ედონები ===

    // 14. ხელფასამდე დათვლა
    let daysToPayday = -1;
    if (profile.incomeType === 'salary' || profile.incomeType === 'both') {
      // ხელფასის დღე — თვეში 1-ჯერ: payFrequency monthly_1 = 1 რიცხვი, monthly_2 = 15 რიცხვი
      const payDay = profile.payFrequency === 'monthly_2' ? 15 : 1;
      const todayD = now.getDate();
      if (todayD < payDay) {
        daysToPayday = payDay - todayD;
      } else {
        const nextMonth = new Date(year, month + 1, payDay);
        daysToPayday = Math.ceil((nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    // 15. No-Spend Days — ფუფუნების გარეშე დღეები ამ თვეში
    let noSpendDays = 0;
    let totalMonthDays = 0;
    Object.entries(state.db).forEach(([date, day]) => {
      if (new Date(date).getMonth() === month) {
        totalMonthDays++;
        const wantsSpending = (day.expenses || [])
          .filter((e) => e.category === 'სურვილი')
          .reduce((s, e) => s + e.amount, 0);
        if (wantsSpending === 0) noSpendDays++;
      }
    });

    // 16. თვის პროგნოზი — ამ ტემპით რამდენს დახარჯავ
    const predictedMonthExpense = monthActualExpenses + (avgDailyExpense * Math.max(0, daysRemaining - 1))
      + unpaidBillsLeft + unpaidSubsLeft;
    const monthBudgetTarget = totalMonthlyIncome;
    const willOverspend = monthBudgetTarget > 0 && predictedMonthExpense > monthBudgetTarget;

    // 17. Rollover ბიუჯეტი — ზუსტი დღიური გადატანა
    let rolloverTotal = 0;
    for (let i = 1; i <= todayDate - 1; i++) {
      const d = new Date(year, month, i);
      const key = d.toISOString().split('T')[0];
      const data = state.db[key];
      const dayExp = data ? getExpensesTotal(data) : 0;
      rolloverTotal += dailyBudget - dayExp;
    }
    const rolloverBudget = Math.round(dailyBudget + (rolloverTotal / Math.max(1, daysRemaining)));
    const cappedRollover = Math.max(Math.round(dailyBudget * 0.5), Math.min(Math.round(dailyBudget * 2), rolloverBudget));

    // 18. Monthly Report Card — A-F ქულები
    const getGrade = (score: number): string => {
      if (score >= 90) return 'A';
      if (score >= 75) return 'B';
      if (score >= 60) return 'C';
      if (score >= 40) return 'D';
      return 'F';
    };
    // ხარჯვის კონტროლი
    const spendingScore = totalDaysChecked > 0 ? Math.round((daysUnderBudget / totalDaysChecked) * 100) : 50;
    // დანაზოგის რეიტი
    const savingsScore = totalIncomeReal > 0 ? Math.min(100, Math.round((totalKulaba / totalIncomeReal) * 500)) : 0;
    // ბილების დროულობა
    const billScore = allBillsCount > 0 ? Math.round((paidBillsCount / allBillsCount) * 100) : 100;
    // ბიუჯეტის დაცვა (avgDaily vs budget)
    const budgetScore = dailyBudget > 0 ? Math.min(100, Math.round((1 - Math.max(0, avgDailyExpense - dailyBudget) / dailyBudget) * 100)) : 50;

    const reportCard = {
      spending: getGrade(spendingScore),
      savings: getGrade(savingsScore),
      bills: getGrade(billScore),
      budget: getGrade(budgetScore),
    };

    // 19. ბილის გადახდის შეხსენება — დღეს ვადაა
    const billsDueToday = state.bills.filter((b) => !b.paid && b.dueDate === today);
    const subsDueToday = (state.subscriptions || []).filter((s) => !s.paid && s.dueDate === today);

    if (billsDueToday.length > 0) {
      insights.unshift({
        level: 'critical', icon: '🔔',
        title: `დღეს ვადაა: ${billsDueToday.map(b => b.name).join(', ')}!`,
        message: `${billsDueToday.reduce((s, b) => s + b.amount, 0)}₾ — გადაიხადე დღესვე!`,
      });
    }
    if (subsDueToday.length > 0) {
      insights.unshift({
        level: 'warning', icon: '🔔',
        title: `გამოწერის ვადა: ${subsDueToday.map(s => s.name).join(', ')}!`,
        message: `${subsDueToday.reduce((s, sub) => s + sub.amount, 0)}₾`,
      });
    }

    // No-Spend Day insight
    if (totalMonthDays >= 5) {
      insights.push({
        level: noSpendDays >= totalMonthDays * 0.4 ? 'success' : 'info',
        icon: '🚫',
        title: `${noSpendDays}/${totalMonthDays} დღე ფუფუნების გარეშე`,
        message: noSpendDays < 10 ? 'ცადე 10-ს მიაღწიო ამ თვეში!' : 'შესანიშნავი თავშეკავება!',
      });
    }

    // Month prediction
    if (willOverspend && avgDailyExpense > 0) {
      insights.push({
        level: 'warning', icon: '🔮',
        title: `პროგნოზი: ${Math.round(predictedMonthExpense)}₾ ხარჯი ამ თვეში`,
        message: `ბიუჯეტი: ${monthBudgetTarget}₾. გადააჭარბებ ~${Math.round(predictedMonthExpense - monthBudgetTarget)}₾-ით.`,
      });
    }

    // Payday countdown
    if (daysToPayday > 0 && daysToPayday <= 7) {
      insights.push({
        level: 'info', icon: '💰',
        title: `ხელფასამდე ${daysToPayday} დღე`,
        message: `ჯიბეში: ${inMyPocket}₾ · გასტანე ${daysToPayday} დღე.`,
      });
    }

    // 20. End-of-day reminder logic
    const todayHasData = !!state.db[today];
    const isEvening = now.getHours() >= 20;
    const showEntryReminder = !todayHasData && isEvening;

    if (showEntryReminder) {
      insights.unshift({
        level: 'info', icon: '📝',
        title: 'დღეს ჯერ არაფერი ჩაგიწერია!',
        message: '30 წამი საკმარისია — შეავსე რომ სტატისტიკა ზუსტი იყოს.',
      });
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
      // ახალი ედონები
      daysToPayday, noSpendDays, totalMonthDays,
      predictedMonthExpense, willOverspend,
      cappedRollover, rolloverTotal,
      reportCard,
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
  // scoreLabel used below if needed
  const _scoreLabel = a.healthScore >= 80 ? 'შესანიშნავი' : a.healthScore >= 60 ? 'კარგი' : a.healthScore >= 40 ? 'საშუალო' : a.healthScore >= 20 ? 'სუსტი' : 'კრიტიკული'; void _scoreLabel;

  const criticalInsights = a.insights.filter((i) => i.level === 'critical');
  const warningInsights = a.insights.filter((i) => i.level === 'warning');
  const otherInsights = a.insights.filter((i) => i.level === 'info' || i.level === 'success');
  const sortedInsights = [...criticalInsights, ...warningInsights, ...otherInsights];
  // ჩაკეცილ მდგომარეობაში მაქსიმუმ 2 კრიტიკული ჩანს
  const collapsedInsights = criticalInsights.slice(0, 2);

  return (
    <div className="space-y-1.5">
      {/* === კომპაქტური ჰედერი — ყოველთვის ჩანს === */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full rounded-xl bg-gradient-to-r from-slate-50 to-indigo-50 dark:from-slate-800/50 dark:to-indigo-900/20 border border-slate-200/60 dark:border-slate-700/60 p-2.5 transition-all hover:shadow-md"
      >
        <div className="flex items-center gap-3">
          {/* მინი ქულა */}
          <div className="relative shrink-0">
            <svg viewBox="0 0 36 36" className="w-11 h-11">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" stroke="currentColor" strokeWidth="3.5" className="text-slate-200 dark:text-slate-700" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" stroke={scoreColor} strokeWidth="3.5" strokeDasharray={`${a.healthScore}, 100`} className="transition-all duration-1000" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[11px] font-black" style={{ color: scoreColor }}>{a.healthScore}</span>
            </div>
          </div>

          {/* ძირითადი რიცხვები */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="h-3 w-3 text-indigo-500" />
              <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">მრჩეველი</span>
              {criticalInsights.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[8px] font-black animate-pulse">
                  {criticalInsights.length}
                </span>
              )}
              {warningInsights.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[8px] font-black">
                  {warningInsights.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              <span className={cn('font-black', a.inMyPocket >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                💰 {a.inMyPocket}₾
              </span>
              <span className="text-muted-foreground">·</span>
              <span className={cn('font-bold', a.dailySafeSpend >= 20 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500')}>
                📊 {a.dailySafeSpend}₾/დღე
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{a.daysRemaining} დღე</span>
            </div>
          </div>

          {/* გაშლის ისარი */}
          <div className="shrink-0">
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>

        {/* კრიტიკული გაფრთხილებები — ჩაკეცილშიც ჩანს */}
        {!expanded && collapsedInsights.length > 0 && (
          <div className="mt-2 space-y-1">
            {collapsedInsights.map((insight, i) => (
              <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-100 dark:bg-red-900/30 text-[10px]">
                <span>{insight.icon}</span>
                <span className="font-bold text-red-600 dark:text-red-400 truncate">{insight.title}</span>
              </div>
            ))}
          </div>
        )}
      </button>

      {/* === ჩამოშლადი ნაწილი === */}
      {expanded && (
        <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">

          {/* 50/30/20 ბარი */}
          {a.needsPercent + a.wantsPercent > 0 && (
            <div className="px-2.5">
              <div className="flex h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                <div className="bg-blue-500 transition-all" style={{ width: `${a.needsPercent}%` }} />
                <div className="bg-orange-400 transition-all" style={{ width: `${a.wantsPercent}%` }} />
                <div className="bg-emerald-500 transition-all" style={{ width: `${a.savingsPercent}%` }} />
              </div>
              <div className="flex justify-between text-[8px] mt-0.5 text-muted-foreground">
                <span>🔵 საჭირო {a.needsPercent}%</span>
                <span>🟠 სურვილი {a.wantsPercent}%</span>
                <span>🟢 დანაზოგი {a.savingsPercent}%</span>
              </div>
            </div>
          )}

          {/* შემოსავალი vs ვალდებულებები — კომპაქტური */}
          {a.totalMonthlyIncome > 0 && (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 p-2.5">
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">შემოსავალი: {a.totalMonthlyIncome}₾</span>
                <span className="text-red-500 font-bold">ვალდებულებები: {a.totalMonthlyObligations}₾</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all',
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
          )}

          {/* 4 მინი მეტრიკა */}
          <div className="grid grid-cols-4 gap-1">
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 p-1.5 text-center">
              <p className="text-[7px] text-muted-foreground">💎 წმინდა</p>
              <p className={cn('text-[11px] font-black', a.netWorth >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500')}>
                {a.netWorth >= 0 ? '' : '-'}{Math.abs(a.netWorth)}₾
              </p>
            </div>
            <div className={cn('rounded-lg border p-1.5 text-center',
              a.burnRateStatus === 'fast' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700')}>
              <p className="text-[7px] text-muted-foreground">{a.burnRateStatus === 'fast' ? '🔥' : '⚡'} ტემპი</p>
              <p className={cn('text-[11px] font-black',
                a.burnRateStatus === 'fast' ? 'text-red-500' : a.burnRateStatus === 'slow' ? 'text-emerald-500' : 'text-blue-500')}>
                {Math.round(a.burnRateRatio * 100)}%
              </p>
            </div>
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-1.5 text-center">
              <p className="text-[7px] text-muted-foreground">🔥 სტრიქი</p>
              <p className="text-[11px] font-black text-amber-600 dark:text-amber-400">{a.currentStreak}დ</p>
            </div>
            <div className={cn('rounded-lg border p-1.5 text-center',
              a.fiMonths >= 1 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700'
              : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700')}>
              <p className="text-[7px] text-muted-foreground">🛡️ ბუფერი</p>
              <p className={cn('text-[11px] font-black', a.fiMonths >= 1 ? 'text-emerald-500' : 'text-orange-500')}>{a.fiLabel}</p>
            </div>
          </div>

          {/* Report Card — ინლაინ */}
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700">
            <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400">📊 ანგარიში</span>
            <div className="flex items-center gap-2">
              {([
                ['ხარჯვა', a.reportCard.spending],
                ['დანაზოგი', a.reportCard.savings],
                ['ბილები', a.reportCard.bills],
                ['ბიუჯეტი', a.reportCard.budget],
              ] as const).map(([label, grade]) => {
                const gc = grade === 'A' ? 'text-emerald-600' : grade === 'B' ? 'text-blue-600' : grade === 'C' ? 'text-amber-600' : 'text-red-600';
                return (
                  <span key={label} className="text-[9px]">
                    <span className="text-muted-foreground">{label}:</span>
                    <span className={cn('font-black ml-0.5', gc)}>{grade}</span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* ინსაითები */}
          {sortedInsights.length > 0 && (
            <div className="space-y-1">
              {(showAllInsights ? sortedInsights : sortedInsights.slice(0, 4)).map((insight, i) => {
                const style = levelStyles[insight.level];
                return (
                  <div key={i} className={cn('flex items-start gap-2 px-2.5 py-1.5 rounded-xl border', style.bg, style.border)}>
                    <span className="text-sm shrink-0">{insight.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-[10px] font-black', style.iconColor)}>{insight.title}</p>
                      <p className="text-[9px] text-muted-foreground leading-tight">{insight.message}</p>
                    </div>
                  </div>
                );
              })}
              {sortedInsights.length > 4 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowAllInsights(!showAllInsights); }}
                  className="w-full py-1 text-[9px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {showAllInsights ? 'ნაკლები ▲' : `კიდევ ${sortedInsights.length - 4} ინსაითი ▼`}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
