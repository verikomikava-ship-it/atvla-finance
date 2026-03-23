import React, { useMemo, useState, useRef, useEffect } from 'react';
import { AppState, UserProfile, SUBCATEGORIES, ExpenseSubcategory, EXTRA_INCOME_SOURCES } from '../types';
import { BillAlerts } from './BillAlerts';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Target,
  TrendingUp,
  TrendingDown,
  Pencil,
  Check,
  X,
  Wallet,
  Settings2,
} from 'lucide-react';
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from 'recharts';
import { SmartAdvisor } from './SmartAdvisor';

interface HeaderProps {
  state: AppState;
  selectedMonth: string;
  totalInc: number;
  totalExp: number;
  totalKulaba: number;
  onGoalChange: (goal: number, goalName: string) => void;
  onProfileChange: (profile: UserProfile) => void;
}

export const Header: React.FC<HeaderProps> = ({
  state,
  selectedMonth,
  totalInc,
  totalExp,
  totalKulaba,
  onGoalChange,
  onProfileChange,
}) => {
  const currentMonth = parseInt(selectedMonth || '0');


  const netBalance = totalInc - totalExp;

  // შემოსავლის დაყოფა
  const incomeBreakdown = useMemo(() => {
    type ChartItem = { label: string; value: number; percent: number; color: string };
    const monthDays = Object.entries(state.db).filter(([date]) => {
      const m = new Date(date).getMonth();
      return selectedMonth === '' || m === currentMonth;
    });

    let mainInc = 0;
    let extraInc = 0;
    const extraBySource: Record<string, number> = {};

    for (const [, day] of monthDays) {
      mainInc += day.incMain || 0;
      if (day.incExtra > 0) {
        extraInc += day.incExtra;
        const src = day.incExtraSource || 'სხვა';
        extraBySource[src] = (extraBySource[src] || 0) + day.incExtra;
      }
    }

    const total = mainInc + extraInc;
    if (total === 0) return [{ label: 'მონაცემები არ არის', value: 0, percent: 100, color: '#d1d5db' }] as ChartItem[];

    const items: ChartItem[] = [];
    if (mainInc > 0) items.push({ label: 'ძირითადი', value: mainInc, percent: Math.round((mainInc / total) * 100), color: '#10b981' });

    const srcColors: Record<string, string> = {};
    EXTRA_INCOME_SOURCES.forEach((s) => { srcColors[s.key] = s.color; });

    Object.entries(extraBySource)
      .sort((a, b) => b[1] - a[1])
      .forEach(([src, val]) => {
        items.push({ label: src, value: val, percent: Math.round((val / total) * 100), color: srcColors[src] || '#64748b' });
      });

    return items;
  }, [state.db, selectedMonth, currentMonth]);

  // გასავლის დაყოფა (კალენდარი + ბილები + გამოწერები + ვალები)
  const expenseBreakdown = useMemo(() => {
    type ChartItem = { label: string; value: number; percent: number; color: string };
    const monthDays = Object.entries(state.db).filter(([date]) => {
      const m = new Date(date).getMonth();
      return selectedMonth === '' || m === currentMonth;
    });

    const groups: Record<string, { value: number; color: string; icon: string }> = {};

    // 1. კალენდრიდან ხარჯები (subcategory-ით)
    for (const [, day] of monthDays) {
      for (const exp of day.expenses || []) {
        const sub = exp.subcategory || 'სხვა';
        if (!groups[sub]) {
          const info = SUBCATEGORIES[sub as ExpenseSubcategory];
          groups[sub] = { value: 0, color: '#64748b', icon: info?.icon || '📝' };
        }
        groups[sub].value += exp.amount;
      }
    }

    // 2. ყოველთვიური გადასახადები (bills)
    const paidBills = state.bills.filter((b) => b.paid);
    const billsTotal = paidBills.reduce((s, b) => s + (+b.amount || 0), 0);
    if (billsTotal > 0) {
      groups['ყოველთვიური'] = { value: billsTotal, color: '#0891b2', icon: '📅' };
    }

    // 3. გამოწერები (subscriptions)
    const paidSubs = (state.subscriptions || []).filter((s) => s.paid);
    const subsTotal = paidSubs.reduce((s, sub) => s + (+sub.amount || 0), 0);
    if (subsTotal > 0) {
      groups['გამოწერები'] = { value: subsTotal, color: '#8b5cf6', icon: '🔄' };
    }

    // 4. ვალები (debts)
    const paidDebts = state.debts.filter((d) => d.paid);
    const debtsTotal = paidDebts.reduce((s, d) => s + (+d.amount || 0), 0);
    if (debtsTotal > 0) {
      groups['ვალები'] = { value: debtsTotal, color: '#ef4444', icon: '💸' };
    }

    const total = Object.values(groups).reduce((s, g) => s + g.value, 0);
    if (total === 0) return [{ label: 'მონაცემები არ არის', value: 0, percent: 100, color: '#d1d5db' }] as ChartItem[];

    const subColors: Record<string, string> = {
      'მაღაზია': '#f59e0b', 'სუპერმარკეტი': '#eab308', 'ბაზარი': '#84cc16',
      'საწვავი': '#ef4444', 'რესტორანი': '#f97316', 'კაფე': '#d97706',
      'აფთიაქი': '#ec4899', 'ტრანსპორტი': '#8b5cf6', 'კომუნალური': '#06b6d4',
      'ჯანმრთელობა': '#14b8a6', 'განათლება': '#3b82f6', 'გართობა': '#a855f7',
      'ტანისამოსი': '#e11d48', 'ტექნიკა': '#6366f1', 'სახლი': '#0ea5e9',
      'საჩუქარი': '#f43f5e', 'სილამაზე': '#d946ef', 'სპორტი': '#22c55e',
      'შინაური ცხოველი': '#a3e635', 'ვალის გადახდა': '#78716c',
      'ყოველთვიური': '#0891b2', 'გამოწერები': '#8b5cf6', 'ვალები': '#ef4444',
      'სხვა': '#64748b',
    };

    const allItems = Object.entries(groups)
      .sort((a, b) => b[1].value - a[1].value)
      .map(([key, g]) => {
        const info = SUBCATEGORIES[key as ExpenseSubcategory];
        return {
          label: info ? `${info.icon} ${info.label}` : `${g.icon} ${key}`,
          value: g.value,
          percent: Math.round((g.value / total) * 100),
          color: subColors[key] || g.color,
        };
      });

    // max 6 rings, group rest
    if (allItems.length <= 6) return allItems;
    const top = allItems.slice(0, 5);
    const restVal = allItems.slice(5).reduce((s, d) => s + d.value, 0);
    top.push({ label: '📝 დანარჩენი', value: restVal, percent: Math.round((restVal / total) * 100), color: '#94a3b8' });
    return top;
  }, [state.db, state.bills, state.debts, state.subscriptions, selectedMonth, currentMonth]);

  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [goalNameInput, setGoalNameInput] = useState('');
  const goalInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingGoal && goalInputRef.current) {
      goalInputRef.current.focus();
    }
  }, [isEditingGoal]);

  const openGoalEditor = () => {
    setGoalInput(state.goal ? state.goal.toString() : '');
    setGoalNameInput(state.goalName || '');
    setIsEditingGoal(true);
  };

  const saveGoal = () => {
    const amount = Math.max(0, parseInt(goalInput) || 0);
    onGoalChange(amount, goalNameInput.trim());
    setIsEditingGoal(false);
  };

  // პროფილის რედაქტირება
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileSalary, setProfileSalary] = useState('');
  const [profileDailyTarget, setProfileDailyTarget] = useState('');
  const [profileWorkDays, setProfileWorkDays] = useState<number[]>([]);

  const WEEK_DAYS = [
    { value: 1, label: 'ორშ' },
    { value: 2, label: 'სამ' },
    { value: 3, label: 'ოთხ' },
    { value: 4, label: 'ხუთ' },
    { value: 5, label: 'პარ' },
    { value: 6, label: 'შაბ' },
    { value: 0, label: 'კვი' },
  ];

  const openProfileEditor = () => {
    setProfileSalary(state.profile?.salary?.toString() || '');
    setProfileDailyTarget(state.profile?.dailyTarget?.toString() || '');
    setProfileWorkDays(state.profile?.workDays || [1, 2, 3, 4, 5]);
    setIsEditingProfile(true);
  };

  const toggleProfileWorkDay = (day: number) => {
    setProfileWorkDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const saveProfile = () => {
    const updated: UserProfile = {
      ...state.profile,
      salary: Math.max(0, parseInt(profileSalary) || 0),
      dailyTarget: Math.max(0, parseInt(profileDailyTarget) || 0),
      workDays: profileWorkDays,
    };
    onProfileChange(updated);
    setIsEditingProfile(false);
  };

  const needsSalary = state.profile?.incomeType === 'salary' || state.profile?.incomeType === 'both';
  const needsDailyTarget = state.profile?.incomeType === 'freelance' || state.profile?.incomeType === 'both';
  const needsWorkDays = state.profile?.incomeType === 'salary' || state.profile?.incomeType === 'both';

  const goalAmount = state.goal || 0;
  const kulabaProgress = goalAmount > 0 ? Math.min((totalKulaba / goalAmount) * 100, 100) : 0;
  const progressIndicatorClass = kulabaProgress >= 100
    ? 'bg-emerald-500'
    : kulabaProgress >= 60
      ? 'bg-amber-500'
      : 'bg-indigo-500';

  return (
    <header className="flex-shrink-0 bg-background px-3 py-2 border-b border-border">
      {/* კულაბა - კომპაქტური */}
      <Card className="mb-2 border-blue-200 dark:border-blue-700 bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-blue-900/20 dark:to-emerald-900/20">
        <CardContent className="px-3 py-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <span className="text-base">🏺</span>
              <div>
                <h2 className="text-blue-700 dark:text-blue-300 font-bold text-sm">ჩემი კულაბა</h2>
                <p className="text-slate-500 dark:text-slate-400 text-[10px]">დაგროვებული თანხა</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-blue-700 dark:text-blue-300">{totalKulaba}₾</p>
              {goalAmount > 0 && (
                <p className="text-[10px] text-blue-400">/ {goalAmount}₾</p>
              )}
            </div>
          </div>

          {goalAmount > 0 && (
            <div className="mt-1.5">
              <Progress value={kulabaProgress} className="h-2" indicatorClassName={progressIndicatorClass} />
              <p className="text-[9px] text-blue-400 text-right mt-0.5">{Math.round(kulabaProgress)}%</p>
            </div>
          )}

          {isEditingGoal ? (
            <div className="mt-1.5 space-y-1.5 p-2 bg-background/50 rounded border border-border">
              <Input
                ref={goalInputRef}
                type="text"
                placeholder="რისთვის აგროვებ?"
                value={goalNameInput}
                onChange={(e) => setGoalNameInput(e.target.value)}
                className="h-8 text-xs"
              />
              <div className="flex gap-1.5">
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="თანხა ₾"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  className="flex-1 h-8 text-xs"
                  onKeyDown={(e) => { if (e.key === 'Enter') saveGoal(); if (e.key === 'Escape') setIsEditingGoal(false); }}
                />
                <Button variant="default" size="sm" onClick={saveGoal} className="h-8 w-8 p-0">
                  <Check className="h-3 w-3" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsEditingGoal(false)} className="h-8 w-8 p-0">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ) : (
            <div onClick={openGoalEditor} className="mt-1 cursor-pointer group">
              {goalAmount > 0 ? (
                <p className="text-xs text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  {state.goalName || 'მიზანი'}: <span className="font-bold">{goalAmount}₾</span>
                  <Pencil className="h-2.5 w-2.5 text-muted-foreground ml-1" />
                </p>
              ) : (
                <p className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                  + მიზნის დაწესება
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ნეტო ბალანსი + პროფილი */}
      <div className="flex justify-between items-center mb-2">
        <Badge variant={netBalance >= 0 ? 'success' : 'danger'} className="text-xs font-semibold px-2 py-0.5 gap-1">
          <Wallet className="h-3 w-3" />
          ნეტო: {netBalance >= 0 ? '+' : ''}{netBalance}₾
        </Badge>
        <div className="flex items-center gap-2">
          {state.profile && !isEditingProfile && (
            <span className="text-[10px] text-muted-foreground">
              {needsSalary && `ხელფასი: ${state.profile.salary}₾`}
              {state.profile.incomeType === 'both' && ' + '}
              {needsDailyTarget && `გეგმა: ${state.profile.dailyTarget}₾/დღე`}
            </span>
          )}
          <Button variant="ghost" size="icon" onClick={isEditingProfile ? () => setIsEditingProfile(false) : openProfileEditor} className="h-6 w-6 text-muted-foreground hover:text-foreground">
            <Settings2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {isEditingProfile && state.profile && (
        <Card className="mb-2 border-border bg-card/80">
          <CardContent className="p-2 space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground">პროფილის რედაქტირება</p>
            {needsSalary && (
              <div className="flex gap-1.5 items-center">
                <span className="text-[10px] text-muted-foreground w-14 shrink-0">ხელფასი:</span>
                <Input type="text" inputMode="numeric" value={profileSalary} onChange={(e) => setProfileSalary(e.target.value)} className="h-7 text-xs flex-1" placeholder="₾" />
              </div>
            )}
            {needsDailyTarget && (
              <div className="flex gap-1.5 items-center">
                <span className="text-[10px] text-muted-foreground w-14 shrink-0">{state.profile.incomeType === 'both' ? 'დანამატი:' : 'დღიური:'}</span>
                <Input type="text" inputMode="numeric" value={profileDailyTarget} onChange={(e) => setProfileDailyTarget(e.target.value)} className="h-7 text-xs flex-1" placeholder="₾/დღე" />
              </div>
            )}
            {needsWorkDays && (
              <div>
                <span className="text-[10px] text-muted-foreground block mb-1">სამუშაო დღეები:</span>
                <div className="flex gap-1">
                  {WEEK_DAYS.map((wd) => (
                    <button
                      key={wd.value}
                      onClick={() => toggleProfileWorkDay(wd.value)}
                      className={`flex-1 py-1 rounded text-[10px] font-bold border transition-all ${
                        profileWorkDays.includes(wd.value)
                          ? 'border-primary bg-primary/20 text-primary'
                          : 'border-border bg-background/30 text-muted-foreground'
                      }`}
                    >
                      {wd.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-1.5 items-center justify-end">
              <Button variant="default" size="sm" onClick={saveProfile} className="h-7 w-7 p-0">
                <Check className="h-3 w-3" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsEditingProfile(false)} className="h-7 w-7 p-0">
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <BillAlerts bills={state.bills} debts={state.debts} subscriptions={state.subscriptions || []} />

      <SmartAdvisor state={state} selectedMonth={selectedMonth} />

      {/* შემოსავალი / გასავალი — ერთი დიდი რადიალური გრაფიკი */}
      <div className="grid grid-cols-2 gap-2">
        {/* შემოსავალი */}
        <Card className="border-0 bg-emerald-50 dark:bg-emerald-900/20">
          <CardContent className="p-2.5">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">შემოსავალი</span>
            </div>
            {totalInc > 0 ? (
              <div style={{ width: '100%', height: 160 }} className="relative">
                <ResponsiveContainer>
                  <RadialBarChart
                    cx="50%" cy="50%"
                    innerRadius="15%" outerRadius="90%"
                    startAngle={180} endAngle={-180}
                    data={(() => {
                      const items = incomeBreakdown.filter((d) => d.value > 0);
                      const maxVal = Math.max(...items.map((d) => d.value));
                      return [...items].reverse().map((d) => ({ ...d, fill: d.color, fullMark: maxVal }));
                    })()}
                    barSize={Math.max(8, Math.min(18, 80 / Math.max(incomeBreakdown.filter((d) => d.value > 0).length, 1)))}
                  >
                    <RadialBar
                      dataKey="value"
                      cornerRadius={8}
                      background={{ fill: 'rgba(0,0,0,0.05)' }}
                      isAnimationActive={true}
                      animationDuration={800}
                      label={{ position: 'insideStart', fill: '#fff', fontSize: 9, fontWeight: 700, formatter: (val: unknown) => `${val}₾` }}
                    />
                    <Tooltip
                      formatter={(val) => [`${val}₾`, '']}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.label || ''}
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">{totalInc}₾</p>
                    <p className="text-[8px] text-emerald-500 dark:text-emerald-400">ჯამი</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-[10px] text-muted-foreground py-8">მონაცემები არ არის</p>
            )}
            <div className="space-y-0.5">
              {incomeBreakdown.filter((d) => d.value > 0).map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[10px]">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600 dark:text-slate-400 truncate flex-1">{item.label}</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 shrink-0">{item.value}₾</span>
                  <span className="text-slate-400 dark:text-slate-500 shrink-0 w-7 text-right">{item.percent}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* გასავალი */}
        <Card className="border-0 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-2.5">
            <div className="flex items-center gap-1 mb-1">
              <TrendingDown className="h-3 w-3 text-red-500" />
              <span className="text-[11px] font-bold text-red-600 dark:text-red-400">გასავალი</span>
            </div>
            {totalExp > 0 ? (
              <div style={{ width: '100%', height: 160 }} className="relative">
                <ResponsiveContainer>
                  <RadialBarChart
                    cx="50%" cy="50%"
                    innerRadius="15%" outerRadius="90%"
                    startAngle={180} endAngle={-180}
                    data={(() => {
                      const items = expenseBreakdown.filter((d) => d.value > 0);
                      const maxVal = Math.max(...items.map((d) => d.value));
                      return [...items].reverse().map((d) => ({ ...d, fill: d.color, fullMark: maxVal }));
                    })()}
                    barSize={Math.max(8, Math.min(18, 80 / Math.max(expenseBreakdown.filter((d) => d.value > 0).length, 1)))}
                  >
                    <RadialBar
                      dataKey="value"
                      cornerRadius={8}
                      background={{ fill: 'rgba(0,0,0,0.05)' }}
                      isAnimationActive={true}
                      animationDuration={800}
                      label={{ position: 'insideStart', fill: '#fff', fontSize: 9, fontWeight: 700, formatter: (val: unknown) => `${val}₾` }}
                    />
                    <Tooltip
                      formatter={(val) => [`${val}₾`, '']}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.label || ''}
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-lg font-black text-red-600 dark:text-red-400">{totalExp}₾</p>
                    <p className="text-[8px] text-red-400">ჯამი</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-[10px] text-muted-foreground py-8">მონაცემები არ არის</p>
            )}
            <div className="space-y-0.5 max-h-[80px] overflow-y-auto">
              {expenseBreakdown.filter((d) => d.value > 0).map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[10px]">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600 dark:text-slate-400 truncate flex-1">{item.label}</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 shrink-0">{item.value}₾</span>
                  <span className="text-slate-400 dark:text-slate-500 shrink-0 w-7 text-right">{item.percent}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </header>
  );
};
