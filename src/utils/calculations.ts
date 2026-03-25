import { DayData, AppState, MonthlyStats, UserProfile, Debt, IncomeType } from '../types';

// რამდენი სამუშაო დღეა მოცემულ თვეში
export const getWorkDaysInMonth = (year: number, month: number, workDays: number[]): number => {
  if (!workDays || workDays.length === 0) return 22; // default
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = new Date(year, month, d).getDay();
    if (workDays.includes(dayOfWeek)) count++;
  }
  return count || 1; // მინ 1 რომ 0-ზე არ გაიყოს
};

// არის თუ არა მოცემული თარიღი სამუშაო დღე
export const isWorkDay = (dateStr: string, workDays: number[]): boolean => {
  if (!workDays || workDays.length === 0) return true;
  const d = new Date(dateStr + 'T00:00:00');
  return workDays.includes(d.getDay());
};

// დღიური შემოსავლის გეგმა კონკრეტული დღისთვის
export const getDailyTargetForDate = (dateStr: string, profile: UserProfile): number => {
  const d = new Date(dateStr + 'T00:00:00');
  const year = d.getFullYear();
  const month = d.getMonth();
  const workDays = profile.workDays || [];
  const workDay = isWorkDay(dateStr, workDays);

  if (profile.incomeType === 'freelance') {
    return profile.dailyTarget || 0;
  }

  if (profile.incomeType === 'salary') {
    if (!workDay) return 0;
    const workDaysCount = getWorkDaysInMonth(year, month, workDays);
    return Math.round(profile.salary / workDaysCount);
  }

  // 'both' - ხელფასი + დღიური დანამატი
  const dailyExtra = profile.dailyTarget || 0;
  if (!workDay) return dailyExtra; // არასამუშაო დღე - მხოლოდ დანამატი
  const workDaysCount = getWorkDaysInMonth(year, month, workDays);
  const dailySalary = Math.round(profile.salary / workDaysCount);
  return dailySalary + dailyExtra;
};

export const getDayStatus = (total: number, dailyBudget: number = 150): string => {
  const half = dailyBudget / 2;
  if (total > 0 && total < half) return 'status-critical';
  if (total >= half && total < dailyBudget) return 'status-yellow';
  if (total >= dailyBudget) return 'status-perfect';
  return 'bg-slate-800';
};

// ხარჯების სტატუსი: ბიუჯეტში ჯდება?
const getExpenseStatus = (expenses: number, budget: number): 'green' | 'yellow' | 'red' => {
  if (expenses <= budget) return 'green';
  if (expenses <= budget * 1.5) return 'yellow';
  return 'red';
};

// შემოსავლის სტატუსი: რამდენად შეასრულა გეგმა?
const getIncomeStatus = (income: number, target: number): 'green' | 'yellow' | 'red' => {
  if (target <= 0) return 'green';
  if (income >= target) return 'green';
  if (income >= target / 2) return 'yellow';
  return 'red';
};

// გაუმჯობესებული სტატუსი incomeType-ის მიხედვით
export const getDayStatusAdvanced = (
  incomeType: IncomeType,
  hasData: boolean,
  expenses: number,
  income: number,
  dailyBudget: number,
  dailyTarget: number,
): string => {
  if (!hasData) return 'bg-slate-800';

  if (incomeType === 'salary') {
    // ხელფასი: მწვანე = ხარჯი არ გადააჭარბა დღიურ ლიმიტს
    const status = getExpenseStatus(expenses, dailyBudget);
    if (status === 'green') return 'status-perfect';
    if (status === 'yellow') return 'status-yellow';
    return 'status-critical';
  }

  if (incomeType === 'freelance') {
    // ფრილანსი: შემოსავლის გეგმა
    const half = dailyTarget / 2;
    if (income > 0 && income < half) return 'status-critical';
    if (income >= half && income < dailyTarget) return 'status-yellow';
    if (income >= dailyTarget) return 'status-perfect';
    return 'bg-slate-800';
  }

  // ორივე: ნახევარი ხარჯი, ნახევარი შემოსავალი
  const expStatus = getExpenseStatus(expenses, dailyBudget);
  const incStatus = getIncomeStatus(income, dailyTarget);
  return `status-${expStatus}-${incStatus}`;
};

export const calculateDayTotal = (data: DayData | undefined): number => {
  if (!data) return 0;
  return (data.incMain || 0) + (data.incExtra || 0);
};

// ხარჯების ჯამი (ძველი და ახალი ფორმატების მხარდაჭერა)
export const getExpensesTotal = (data: DayData | undefined): number => {
  if (!data) return 0;

  // ახალი ფორმატი: expenses მასივი
  const newExpenses = (data.expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);

  // ძველი ფორმატი: gas, shop, other
  const legacyExpenses = (data.gas || 0) + (data.shop || 0) + (data.other || 0);

  return newExpenses + legacyExpenses + (data.debt_exp || 0);
};

export const calculateBalance = (data: DayData | undefined): number => {
  if (!data) return 0;
  const inc = (data.incMain || 0) + (data.incExtra || 0);
  const exp = getExpensesTotal(data) + (data.kulaba || 0);
  return inc - exp;
};

export const calculateStats = (
  state: AppState
): { totalInc: number; totalExp: number; totalKulaba: number } => {
  let totalInc = 0;
  let totalExp = 0;
  let totalKulaba = 0;

  Object.entries(state.db).forEach(([, d]) => {
    const inc = (d.incMain || 0) + (d.incExtra || 0);
    const exp = getExpensesTotal(d);
    const kulaba = d.kulaba || 0;

    totalKulaba += kulaba;
    totalInc += inc;
    totalExp += exp;
  });

  state.bills.forEach((b) => {
    if (b.paid) {
      totalExp += +b.amount || 0;
    }
  });

  state.debts.forEach((d) => {
    if (d.paid) {
      totalExp += +d.amount || 0;
    }
  });

  (state.subscriptions || []).forEach((s) => {
    if (s.paid) {
      totalExp += +s.amount || 0;
    }
  });

  return { totalInc, totalExp, totalKulaba };
};

export const calculateMonthlyStats = (state: AppState): Record<number, MonthlyStats> => {
  const months: MonthlyStats[] = Array.from({ length: 12 }, () => ({
    inc: 0,
    exp: 0,
    kulaba: 0,
    debts: 0,
    bills: 0,
    bills_paid: 0,
    bills_remaining: 0,
  }));

  Object.entries(state.db).forEach(([date, d]) => {
    const m = new Date(date).getMonth();
    const inc = (d.incMain || 0) + (d.incExtra || 0);
    const exp = getExpensesTotal(d);

    months[m].inc += inc;
    months[m].exp += exp;
    months[m].debts += d.debt_exp || 0;
    months[m].kulaba += d.kulaba || 0;
  });

  state.bills.forEach((b) => {
    const billMonth = b.reset_month !== undefined ? b.reset_month : 0;
    const billAmount = +b.amount || 0;

    months[billMonth].bills += billAmount;

    if (b.paid) {
      months[billMonth].bills_paid += billAmount;
      months[billMonth].exp += billAmount;
    } else {
      months[billMonth].bills_remaining += billAmount;
    }
  });

  return Object.fromEntries(months.map((m, i) => [i, m]));
};

// ვალის დაფარვის გეგმა
export type DebtRepaymentPlan = {
  debt: Debt;
  suggestedDaily: number;  // რამდენი უნდა გადადოს დღეში
  daysToPayoff: number;    // რამდენ დღეში დაიფარება
  remainingAmount: number; // დარჩენილი თანხა
};

export const calculateDebtRepaymentPlan = (
  debts: Debt[],
  dailyBudget: number,       // დღიური ბიუჯეტი (შემოსავალი - ბილები) / 30
  averageDailyExpenses: number // საშუალო დღიური ხარჯი
): DebtRepaymentPlan[] => {
  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };

  // აქტიური ვალები პრიორიტეტით
  const activeDebts = debts
    .filter((d) => !d.paid)
    .sort((a, b) => {
      const pa = priorityOrder[a.priority || 'medium'];
      const pb = priorityOrder[b.priority || 'medium'];
      return pa - pb;
    });

  if (activeDebts.length === 0) return [];

  // რამდენი რჩება ვალისთვის ყოველდღე
  const availableForDebt = Math.max(0, dailyBudget - averageDailyExpenses);

  return activeDebts.map((debt) => {
    const totalParts = debt.parts || 1;
    const paidParts = debt.paidParts || 0;
    const partsRemaining = Math.round(debt.amount * ((totalParts - paidParts) / totalParts));
    // paidAmount-ის გათვალისწინება (ნაწილობრივი გადახდა)
    const remainingAmount = Math.max(0, Math.min(partsRemaining, debt.amount - (debt.paidAmount || 0)));
    const suggestedDaily = activeDebts.length > 0
      ? Math.round(availableForDebt / activeDebts.length)
      : 0;
    const daysToPayoff = suggestedDaily > 0 ? Math.ceil(remainingAmount / suggestedDaily) : 999;

    return { debt, suggestedDaily, daysToPayoff, remainingAmount };
  });
};

// საშუალო დღიური ხარჯის გამოთვლა ბოლო 30 დღის მონაცემებით
export const getAverageDailyExpenses = (db: Record<string, DayData>): number => {
  const today = new Date();
  let totalExpenses = 0;
  let daysWithData = 0;

  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const data = db[key];
    if (data) {
      totalExpenses += getExpensesTotal(data);
      daysWithData++;
    }
  }

  return daysWithData > 0 ? Math.round(totalExpenses / daysWithData) : 0;
};

// დღიური გეგმის გამოთვლა — რამდენი უნდა გადადო ყოველდღე თითოეული გადასახადისთვის
export type DailyPlanEntry = {
  targetId: number;
  targetType: 'bill' | 'debt' | 'subscription';
  name: string;
  totalAmount: number;
  alreadySaved: number;
  remaining: number;
  daysLeft: number;
  dailyAmount: number;
  dueDate: string;
  icon: string;
  overdue?: boolean; // ვადაგასულია?
};

export const getDailyPlan = (state: AppState, dateStr: string): DailyPlanEntry[] => {
  const today = new Date(dateStr);
  today.setHours(0, 0, 0, 0);
  const plans: DailyPlanEntry[] = [];

  // რამდენი უკვე გადადებულია ამ target-ისთვის (dateStr-მდე ჩათვლით)
  const getSaved = (targetId: number, targetType: string): number => {
    let saved = 0;
    for (const [date, day] of Object.entries(state.db)) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      if (d < today) {
        for (const item of day.dailyPlanDone || []) {
          if (item.targetId === targetId && item.targetType === targetType) {
            saved += item.amount;
          }
        }
      }
    }
    return saved;
  };

  // 1. ყოველთვიური გადასახადები (bills) — მიმდინარე/მომავალი თვის
  const currentMonth = today.getMonth(); // 0-11

  // ბანკის სესხებთან დაკავშირებული ბილების ID-ები (ობოლის ფილტრისთვის)
  const activeLoanBillIds = new Set<number>();
  for (const loan of state.bankLoans || []) {
    if (loan.active) {
      for (const bid of loan.billIds) activeLoanBillIds.add(bid);
    }
  }
  // ობოლი ბილების ID-ები — სესხის ბილია მაგრამ სესხი აღარ არსებობს
  const allLoanBillIds = new Set<number>();
  for (const loan of state.bankLoans || []) {
    for (const bid of loan.billIds) allLoanBillIds.add(bid);
  }

  const billsByName: Record<string, typeof state.bills[0]> = {};
  for (const bill of state.bills) {
    if (bill.paid) continue;
    if (!bill.dueDate) continue;
    // ობოლი ბილი — სესხის ფორმატით (🏦) მაგრამ აქტიურ სესხს არ ეკუთვნის
    if (bill.name.startsWith('🏦') && !activeLoanBillIds.has(bill.id)) continue;

    const due = new Date(bill.dueDate);
    due.setHours(0, 0, 0, 0);
    const billMonth = due.getMonth();

    // წარსული თვეების ბილები გამოვტოვოთ (ისინი უკვე "გადახდილია" რეალურად)
    // მხოლოდ მიმდინარე თვე და მომავალი თვეები გამოჩნდეს
    if (billMonth !== currentMonth && due.getTime() < today.getTime()) continue;

    const existing = billsByName[bill.name];
    if (!existing || bill.dueDate < existing.dueDate!) {
      billsByName[bill.name] = bill;
    }
  }

  for (const bill of Object.values(billsByName)) {
    const due = new Date(bill.dueDate!);
    due.setHours(0, 0, 0, 0);
    const daysLeft = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const billMonth = due.getMonth();
    // ვადაგასულია მხოლოდ თუ ამ თვის ბილია და თარიღი გავიდა
    const isOverdue = billMonth === currentMonth && daysLeft <= 0;

    const saved = getSaved(bill.id, 'bill');
    const remaining = Math.max(0, bill.amount - saved);
    if (remaining <= 0) continue;

    plans.push({
      targetId: bill.id,
      targetType: 'bill',
      name: isOverdue ? `⚠️ ${bill.name}` : bill.name,
      totalAmount: bill.amount,
      alreadySaved: saved,
      remaining,
      daysLeft: isOverdue ? 0 : Math.max(1, daysLeft),
      dailyAmount: isOverdue ? remaining : Math.ceil(remaining / Math.max(1, daysLeft)),
      dueDate: bill.dueDate!,
      icon: isOverdue ? '🚨' : '📅',
      overdue: isOverdue,
    });
  }

  // 2. ვალები (debts) — ვადაგასულიც ჩართულია
  for (const debt of state.debts) {
    if (debt.paid) continue;
    if (!debt.dueDate) continue;

    const due = new Date(debt.dueDate);
    due.setHours(0, 0, 0, 0);
    const diffMs = due.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const isOverdue = daysLeft <= 0;

    const actualRemaining = debt.amount - (debt.paidAmount || 0);
    if (actualRemaining <= 0) continue;

    const saved = getSaved(debt.id, 'debt');
    const remaining = Math.max(0, actualRemaining - saved);
    if (remaining <= 0) continue;

    plans.push({
      targetId: debt.id,
      targetType: 'debt',
      name: isOverdue ? `⚠️ ${debt.name}` : debt.name,
      totalAmount: actualRemaining,
      alreadySaved: saved,
      remaining,
      daysLeft: isOverdue ? 0 : daysLeft,
      dailyAmount: isOverdue ? remaining : Math.ceil(remaining / daysLeft),
      dueDate: debt.dueDate,
      icon: isOverdue ? '🚨' : '💸',
      overdue: isOverdue,
    });
  }

  // 3. გამოწერები (subscriptions)
  for (const sub of state.subscriptions || []) {
    if (sub.paid) continue;
    if (!sub.dueDate) continue;

    const due = new Date(sub.dueDate);
    due.setHours(0, 0, 0, 0);
    const diffMs = due.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    const isOverdue = daysLeft <= 0;

    const saved = getSaved(sub.id, 'subscription');
    const remaining = Math.max(0, sub.amount - saved);
    if (remaining <= 0) continue;

    plans.push({
      targetId: sub.id,
      targetType: 'subscription',
      name: isOverdue ? `⚠️ ${sub.name}` : sub.name,
      totalAmount: sub.amount,
      alreadySaved: saved,
      remaining,
      daysLeft: isOverdue ? 0 : daysLeft,
      dailyAmount: isOverdue ? remaining : Math.ceil(remaining / daysLeft),
      dueDate: sub.dueDate,
      icon: isOverdue ? '🚨' : '🔄',
      overdue: isOverdue,
    });
  }

  // დალაგება — ვადაგასული პირველი, შემდეგ უახლოესი
  plans.sort((a, b) => {
    if (a.overdue && !b.overdue) return -1;
    if (!a.overdue && b.overdue) return 1;
    return a.daysLeft - b.daysLeft;
  });
  return plans;
};
