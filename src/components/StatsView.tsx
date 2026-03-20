import React, { useMemo } from 'react';
import { AppState, ExpenseCategory, SUBCATEGORIES, UTILITY_TYPES, EXTRA_INCOME_SOURCES } from '../types';
import { calculateMonthlyStats, getExpensesTotal } from '../utils/calculations';
import { MONTH_NAMES } from '../utils/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Target, Flame, Calendar, BarChart3, PieChart, Zap, CreditCard, Receipt, Wallet } from 'lucide-react';

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  'საჭირო': '#10b981',
  'აუცილებელი': '#ef4444',
  'სურვილი': '#f97316',
  'გაუთვალისწინებელი': '#a855f7',
};

const CATEGORY_LABELS: ExpenseCategory[] = ['საჭირო', 'აუცილებელი', 'სურვილი', 'გაუთვალისწინებელი'];

type CategoryTotals = Record<ExpenseCategory, number>;

const DonutChart: React.FC<{ data: CategoryTotals; size?: number }> = ({ data, size = 120 }) => {
  const total = Object.values(data).reduce((s, v) => s + v, 0);
  if (total === 0) return <p className="text-slate-500 dark:text-slate-400 text-xs text-center py-4">ხარჯი არ არის</p>;

  const radius = (size - 16) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = 18;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const segments = CATEGORY_LABELS
    .filter((cat) => data[cat] > 0)
    .map((cat) => {
      const pct = data[cat] / total;
      const dashArray = `${circumference * pct} ${circumference * (1 - pct)}`;
      const dashOffset = -offset * circumference;
      offset += pct;
      return { cat, pct, dashArray, dashOffset, color: CATEGORY_COLORS[cat] };
    });

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((seg) => (
          <circle
            key={seg.cat}
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={seg.dashArray}
            strokeDashoffset={seg.dashOffset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" className="fill-slate-700 dark:fill-slate-200 text-sm font-black">
          {total}₾
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" className="fill-slate-500 dark:fill-slate-400 text-[9px]">
          სულ ხარჯი
        </text>
      </svg>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 text-[10px]">
        {segments.map((seg) => (
          <div key={seg.cat} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: seg.color }} />
            <span className="text-slate-600 dark:text-slate-400">{seg.cat}:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{data[seg.cat]}₾</span>
            <span className="text-slate-500 dark:text-slate-400">({Math.round(seg.pct * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ჰორიზონტალური ბარი
const HBar: React.FC<{ label: string; value: number; max: number; color: string; icon?: string }> = ({ label, value, max, color, icon }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between items-center text-[11px]">
        <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
          {icon && <span className="text-xs">{icon}</span>}
          {label}
        </span>
        <span className="font-bold" style={{ color }}>{value}₾</span>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
};

interface StatsViewProps {
  state: AppState;
  totalInc: number;
  totalExp: number;
  totalKulaba: number;
}

export const StatsView: React.FC<StatsViewProps> = ({ state, totalInc, totalExp, totalKulaba }) => {
  const monthlyStats = useMemo(() => calculateMonthlyStats(state), [state]);

  const { debtsPaid, debtsRemaining, debtsTotal } = useMemo(() => {
    const paid = state.debts.filter((d) => d.paid).reduce((sum, d) => sum + d.amount, 0);
    const remaining = state.debts.filter((d) => !d.paid).reduce((sum, d) => sum + d.amount, 0);
    return { debtsPaid: paid, debtsRemaining: remaining, debtsTotal: paid + remaining };
  }, [state.debts]);

  const { billsPaid, billsRemaining, billsTotal } = useMemo(() => {
    const paid = state.bills.filter((b) => b.paid).reduce((sum, b) => sum + b.amount, 0);
    const remaining = state.bills.filter((b) => !b.paid).reduce((sum, b) => sum + b.amount, 0);
    return { billsPaid: paid, billsRemaining: remaining, billsTotal: paid + remaining };
  }, [state.bills]);

  const netBalance = totalInc - totalExp;
  const dailyBudget = state.profile?.dailyBudget || 150;

  // საშუალო დღიური ხარჯი
  const avgDailyExpense = useMemo(() => {
    const days = Object.values(state.db);
    if (days.length === 0) return 0;
    const total = days.reduce((sum, d) => sum + getExpensesTotal(d), 0);
    return Math.round(total / days.length);
  }, [state.db]);

  // საშუალო დღიური შემოსავალი
  const avgDailyIncome = useMemo(() => {
    const days = Object.values(state.db);
    if (days.length === 0) return 0;
    const total = days.reduce((sum, d) => sum + (d.incMain || 0) + (d.incExtra || 0), 0);
    return Math.round(total / days.length);
  }, [state.db]);

  const streaks = useMemo(() => {
    const start = new Date(2026, 0, 1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let best = 0;
    let streak = 0;

    for (let i = 0; i < 365; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      if (d > today) break;

      const key = d.toISOString().split('T')[0];
      const data = state.db[key];
      const total = data ? (data.incMain || 0) + (data.incExtra || 0) : 0;

      if (total >= dailyBudget) {
        streak++;
        if (streak > best) best = streak;
      } else {
        streak = 0;
      }
    }
    return { current: streak, best };
  }, [state.db, dailyBudget]);

  // ტოპ ქვე-კატეგორიები (ხარჯების)
  const topSubcategories = useMemo(() => {
    const totals: Record<string, { amount: number; icon: string; color: string }> = {};
    Object.values(state.db).forEach((d) => {
      (d.expenses || []).forEach((e) => {
        if (e.amount > 0 && e.subcategory) {
          const info = SUBCATEGORIES[e.subcategory];
          const key = e.subcategory === 'კომუნალური' && e.utilityType
            ? `კომუნალური: ${e.utilityType}`
            : e.subcategory;
          if (!totals[key]) {
            const utilInfo = e.utilityType ? UTILITY_TYPES.find((u) => u.key === e.utilityType) : null;
            totals[key] = {
              amount: 0,
              icon: utilInfo?.icon || info?.icon || '📝',
              color: utilInfo?.color || CATEGORY_COLORS[e.category] || '#64748b',
            };
          }
          totals[key].amount += e.amount;
        }
      });
    });
    return Object.entries(totals)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount);
  }, [state.db]);

  const maxSubcategoryAmount = topSubcategories.length > 0 ? topSubcategories[0].amount : 0;

  // კომუნალურის აგრეგაცია
  const utilityTotals = useMemo(() => {
    const totals: Record<string, { amount: number; icon: string; color: string }> = {};
    Object.values(state.db).forEach((d) => {
      (d.expenses || []).forEach((e) => {
        if (e.subcategory === 'კომუნალური' && e.amount > 0 && e.utilityType) {
          const util = UTILITY_TYPES.find((u) => u.key === e.utilityType);
          const key = e.utilityType === 'სხვა' && e.utilityCustomName ? e.utilityCustomName : (util?.label || e.utilityType);
          if (!totals[key]) {
            totals[key] = { amount: 0, icon: util?.icon || '🏠', color: util?.color || '#64748b' };
          }
          totals[key].amount += e.amount;
        }
      });
    });
    return Object.entries(totals).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.amount - a.amount);
  }, [state.db]);

  const utilityTotal = utilityTotals.reduce((s, u) => s + u.amount, 0);

  // დამატებითი შემოსავლის წყაროები
  const extraIncomeSources = useMemo(() => {
    const totals: Record<string, { amount: number; count: number; icon: string; color: string }> = {};
    Object.values(state.db).forEach((d) => {
      if ((d.incExtra || 0) > 0 && d.incExtraSource) {
        const src = EXTRA_INCOME_SOURCES.find((s) => s.key === d.incExtraSource);
        const key = d.incExtraSource === 'სხვა' && d.incExtraNote ? d.incExtraNote : (src?.label || d.incExtraSource);
        if (!totals[key]) {
          totals[key] = { amount: 0, count: 0, icon: src?.icon || '📝', color: src?.color || '#64748b' };
        }
        totals[key].amount += d.incExtra || 0;
        totals[key].count++;
      }
    });
    return Object.entries(totals).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.amount - a.amount);
  }, [state.db]);

  const totalExtraIncome = extraIncomeSources.reduce((s, e) => s + e.amount, 0);

  // თვიური ხარჯების კატეგორიები
  const monthlyCategoryTotals = useMemo(() => {
    const result: Record<number, CategoryTotals> = {};
    for (let m = 0; m < 12; m++) {
      result[m] = { 'საჭირო': 0, 'აუცილებელი': 0, 'სურვილი': 0, 'გაუთვალისწინებელი': 0 };
    }
    Object.entries(state.db).forEach(([date, d]) => {
      const m = new Date(date).getMonth();
      (d.expenses || []).forEach((e) => {
        if (e.category && e.amount > 0) {
          result[m][e.category] += e.amount;
        }
      });
      if (d.gas && d.gas > 0) result[m]['საჭირო'] += d.gas;
      if (d.shop && d.shop > 0) result[m]['საჭირო'] += d.shop;
      if (d.other && d.other > 0) result[m]['სურვილი'] += d.other;
    });
    return result;
  }, [state.db]);

  const totalCategoryTotals = useMemo(() => {
    const total: CategoryTotals = { 'საჭირო': 0, 'აუცილებელი': 0, 'სურვილი': 0, 'გაუთვალისწინებელი': 0 };
    Object.values(monthlyCategoryTotals).forEach((m) => {
      CATEGORY_LABELS.forEach((cat) => { total[cat] += m[cat]; });
    });
    return total;
  }, [monthlyCategoryTotals]);

  const filledDays = Object.keys(state.db).length;
  const daysWithGoal = useMemo(
    () => Object.values(state.db).filter((d) => (d.incMain || 0) + (d.incExtra || 0) >= dailyBudget).length,
    [state.db, dailyBudget]
  );

  const goalAmount = state.goal || 0;
  const kulabaProgress = goalAmount > 0 ? Math.min((totalKulaba / goalAmount) * 100, 100) : 0;

  // თვიური ბარ-ჩარტის მაქსიმუმი
  const maxMonthlyInc = Math.max(...Object.values(monthlyStats).map((s) => s.inc), 1);

  return (
    <div className="space-y-3">
      {/* კულაბა */}
      <Card className="border-amber-200 dark:border-amber-700/50 bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10">
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏺</span>
              <div>
                <p className="text-xs text-amber-600 dark:text-amber-400">კულაბა</p>
                <p className="text-xl font-black text-amber-700 dark:text-amber-300">{totalKulaba}₾</p>
              </div>
            </div>
            {goalAmount > 0 && (
              <div className="text-right">
                <Badge variant={kulabaProgress >= 100 ? 'success' : 'warning'}>{Math.round(kulabaProgress)}%</Badge>
                <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70 mt-0.5">{state.goalName || 'მიზანი'}: {goalAmount}₾</p>
              </div>
            )}
          </div>
          {goalAmount > 0 && (
            <Progress
              value={kulabaProgress}
              indicatorClassName={cn('transition-all duration-700', kulabaProgress >= 100 ? 'bg-emerald-500' : 'bg-amber-500')}
            />
          )}
        </CardContent>
      </Card>

      {/* ძირითადი მაჩვენებლები */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="border-green-200 dark:border-green-700/50 bg-green-50 dark:bg-green-500/10">
          <CardContent className="p-2.5 text-center">
            <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400 mx-auto mb-1" />
            <p className="text-[10px] text-green-600 dark:text-green-400">შემოსავალი</p>
            <p className="text-lg font-black text-green-700 dark:text-green-300">{totalInc}₾</p>
            <p className="text-[9px] text-slate-500 dark:text-slate-400">საშ. {avgDailyIncome}₾/დღე</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-700/50 bg-red-50 dark:bg-red-500/10">
          <CardContent className="p-2.5 text-center">
            <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400 mx-auto mb-1" />
            <p className="text-[10px] text-red-600 dark:text-red-400">გასავალი</p>
            <p className="text-lg font-black text-red-700">{totalExp}₾</p>
            <p className="text-[9px] text-slate-500 dark:text-slate-400">საშ. {avgDailyExpense}₾/დღე</p>
          </CardContent>
        </Card>
        <Card className={cn('border-slate-200 dark:border-slate-700', netBalance >= 0 ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-red-50 dark:bg-red-500/10')}>
          <CardContent className="p-2.5 text-center">
            <Wallet className="w-4 h-4 mx-auto mb-1" style={{ color: netBalance >= 0 ? '#059669' : '#dc2626' }} />
            <p className="text-[10px] text-slate-600 dark:text-slate-400">ნეტო ბალანსი</p>
            <p className={cn('text-lg font-black', netBalance >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700')}>
              {netBalance >= 0 ? '+' : ''}{netBalance}₾
            </p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 dark:border-orange-700/50 bg-orange-50 dark:bg-orange-500/10">
          <CardContent className="p-2.5 text-center">
            <Flame className="w-4 h-4 text-orange-600 dark:text-orange-400 mx-auto mb-1" />
            <p className="text-[10px] text-orange-600 dark:text-orange-400">სტრიქი</p>
            <p className="text-lg font-black text-orange-700 dark:text-orange-300">{streaks.current} დღე</p>
            <p className="text-[9px] text-slate-500 dark:text-slate-400">ბესტ: {streaks.best} დღე</p>
          </CardContent>
        </Card>
      </div>

      {/* პროგრესი */}
      <Card className="border-slate-200 dark:border-slate-700">
        <CardContent className="p-3 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> შევსებული:</span>
            <span className="font-bold">{filledDays}/365</span>
          </div>
          <Progress value={(filledDays / 365) * 100} indicatorClassName="bg-slate-400" className="h-1.5" />
          <div className="flex justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1"><Target className="w-3 h-3" /> გეგმა შესრულებული:</span>
            <span className="font-bold text-green-600 dark:text-green-400">{daysWithGoal} დღე ({filledDays > 0 ? Math.round((daysWithGoal / filledDays) * 100) : 0}%)</span>
          </div>
        </CardContent>
      </Card>

      {/* ტოპ ხარჯვის კატეგორიები */}
      {topSubcategories.length > 0 && (
        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader className="pb-1 px-3 pt-3">
            <CardTitle className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4" /> სად იხარჯება ფული
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            {topSubcategories.slice(0, 10).map((sub) => (
              <HBar key={sub.name} label={sub.name} value={sub.amount} max={maxSubcategoryAmount} color={sub.color} icon={sub.icon} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* კომუნალური დეტალები */}
      {utilityTotals.length > 0 && (
        <Card className="border-teal-200 dark:border-teal-700/50 bg-teal-50 dark:bg-teal-500/10">
          <CardHeader className="pb-1 px-3 pt-3">
            <CardTitle className="text-sm text-teal-700 dark:text-teal-300 flex items-center gap-1.5">
              <Zap className="w-4 h-4" /> კომუნალური — {utilityTotal}₾
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-1.5">
            {utilityTotals.map((util) => (
              <div key={util.name} className="flex items-center justify-between px-2 py-1 rounded-xl" style={{ backgroundColor: `${util.color}10` }}>
                <span className="text-xs flex items-center gap-1.5">
                  <span>{util.icon}</span>
                  <span style={{ color: util.color }} className="font-bold">{util.name}</span>
                </span>
                <span className="text-xs font-black" style={{ color: util.color }}>{util.amount}₾</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* დამატებითი შემოსავლის წყაროები */}
      {extraIncomeSources.length > 0 && (
        <Card className="border-emerald-200 dark:border-emerald-700/50 bg-emerald-50 dark:bg-emerald-500/10">
          <CardHeader className="pb-1 px-3 pt-3">
            <CardTitle className="text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" /> დამატებითი შემოსავალი — {totalExtraIncome}₾
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-1.5">
            {extraIncomeSources.map((src) => (
              <div key={src.name} className="flex items-center justify-between px-2 py-1 rounded-xl" style={{ backgroundColor: `${src.color}10` }}>
                <span className="text-xs flex items-center gap-1.5">
                  <span>{src.icon}</span>
                  <span style={{ color: src.color }} className="font-bold">{src.name}</span>
                  {src.count > 1 && <span className="text-[9px] text-slate-500 dark:text-slate-400">({src.count}x)</span>}
                </span>
                <span className="text-xs font-black" style={{ color: src.color }}>{src.amount}₾</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ხარჯების კატეგორიები - donut */}
      <Card className="border-slate-200 dark:border-slate-700">
        <CardHeader className="pb-1 px-3 pt-3">
          <CardTitle className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <PieChart className="w-4 h-4" /> ხარჯების კატეგორიები
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <DonutChart data={totalCategoryTotals} size={140} />
        </CardContent>
      </Card>

      {/* თვიური ბარ-ჩარტი */}
      <Card className="border-slate-200 dark:border-slate-700">
        <CardHeader className="pb-1 px-3 pt-3">
          <CardTitle className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4" /> თვიური შედარება
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 space-y-2">
          {MONTH_NAMES.map((month, index) => {
            const stat = monthlyStats[index];
            if (stat.inc === 0 && stat.exp === 0) return null;
            const balance = stat.inc - stat.exp;

            return (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-blue-600 dark:text-blue-400 font-bold w-20">{month}</span>
                  <div className="flex gap-3 text-[10px]">
                    <span className="text-green-600 dark:text-green-400">+{stat.inc}₾</span>
                    <span className="text-red-600 dark:text-red-400">-{stat.exp}₾</span>
                    <span className={cn('font-bold', balance >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700')}>
                      {balance >= 0 ? '+' : ''}{balance}₾
                    </span>
                  </div>
                </div>
                <div className="flex gap-0.5 h-2.5">
                  <div className="bg-green-500/80 rounded-l-full transition-all" style={{ width: `${(stat.inc / maxMonthlyInc) * 100}%` }} />
                  <div className="bg-red-500/60 rounded-r-full transition-all" style={{ width: `${(stat.exp / maxMonthlyInc) * 100}%` }} />
                </div>
                {stat.kulaba > 0 && (
                  <p className="text-[9px] text-amber-600 dark:text-amber-400">🏺 {stat.kulaba}₾</p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ვალები & ბილები */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="border-purple-200 dark:border-purple-700/50 bg-purple-50 dark:bg-purple-500/10">
          <CardContent className="p-2.5">
            <div className="flex items-center gap-1.5 mb-2">
              <CreditCard className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span className="text-xs font-bold text-purple-700 dark:text-purple-300">ვალები</span>
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-purple-600 dark:text-purple-400">გადახდილი:</span>
                <span className="font-bold text-purple-700 dark:text-purple-300">{debtsPaid}₾</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-600 dark:text-purple-400">დარჩენილი:</span>
                <span className="font-bold text-purple-700 dark:text-purple-300">{debtsRemaining}₾</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-purple-200 dark:border-purple-700/50">
                <span className="text-purple-700 dark:text-purple-300">სულ:</span>
                <span className="font-bold text-purple-800 dark:text-purple-200">{debtsTotal}₾</span>
              </div>
            </div>
            {debtsTotal > 0 && (
              <Progress value={(debtsPaid / debtsTotal) * 100} indicatorClassName="bg-purple-400" className="h-1 mt-2" />
            )}
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-700/50 bg-blue-50 dark:bg-blue-500/10">
          <CardContent className="p-2.5">
            <div className="flex items-center gap-1.5 mb-2">
              <Receipt className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-bold text-blue-700 dark:text-blue-300">გადასახადი</span>
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-blue-600 dark:text-blue-400">გადახდილი:</span>
                <span className="font-bold text-blue-700 dark:text-blue-300">{billsPaid}₾</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600 dark:text-blue-400">დარჩენილი:</span>
                <span className="font-bold text-blue-700 dark:text-blue-300">{billsRemaining}₾</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-blue-200 dark:border-blue-700/50">
                <span className="text-blue-700 dark:text-blue-300">სულ:</span>
                <span className="font-bold text-blue-800 dark:text-blue-200">{billsTotal}₾</span>
              </div>
            </div>
            {billsTotal > 0 && (
              <Progress value={(billsPaid / billsTotal) * 100} indicatorClassName="bg-blue-400" className="h-1 mt-2" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* თვიური კატეგორიები */}
      <Card className="border-slate-200 dark:border-slate-700">
        <CardHeader className="pb-1 px-3 pt-3">
          <CardTitle className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <PieChart className="w-4 h-4" /> კატეგორიები თვიურად
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <div className="grid grid-cols-2 gap-2">
            {MONTH_NAMES.map((month, index) => {
              const catData = monthlyCategoryTotals[index];
              const hasData = Object.values(catData).some((v) => v > 0);
              if (!hasData) return null;

              return (
                <Card key={index} className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                  <CardContent className="p-2">
                    <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 mb-1 text-center">{month}</p>
                    <DonutChart data={catData} size={90} />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
