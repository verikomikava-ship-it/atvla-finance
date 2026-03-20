import React, { useMemo, useState, useRef, useEffect } from 'react';
import { AppState, UserProfile } from '../types';
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
  CreditCard,
  Receipt,
  Repeat,
  Pencil,
  Check,
  X,
  Wallet,
  Settings2,
} from 'lucide-react';

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

  const { debtsPaid, debtsRemaining, debtsTotal } = useMemo(() => {
    const paid = state.debts.filter((d) => d.paid).reduce((sum, d) => sum + d.amount, 0);
    const remaining = state.debts.filter((d) => !d.paid).reduce((sum, d) => sum + d.amount, 0);
    return { debtsPaid: paid, debtsRemaining: remaining, debtsTotal: paid + remaining };
  }, [state.debts]);

  const { billsPaid, billsRemaining, billsTotal } = useMemo(() => {
    const monthBills = state.bills.filter((b) => (b.reset_month ?? 0) === currentMonth);
    const paid = monthBills.filter((b) => b.paid).reduce((sum, b) => sum + b.amount, 0);
    const remaining = monthBills.filter((b) => !b.paid).reduce((sum, b) => sum + b.amount, 0);
    return { billsPaid: paid, billsRemaining: remaining, billsTotal: paid + remaining };
  }, [state.bills, currentMonth]);

  const { subsPaid, subsRemaining, subsTotal } = useMemo(() => {
    const monthSubs = (state.subscriptions || []).filter((s) => (s.reset_month ?? 0) === currentMonth);
    const paid = monthSubs.filter((s) => s.paid).reduce((sum, s) => sum + s.amount, 0);
    const remaining = monthSubs.filter((s) => !s.paid).reduce((sum, s) => sum + s.amount, 0);
    return { subsPaid: paid, subsRemaining: remaining, subsTotal: paid + remaining };
  }, [state.subscriptions, currentMonth]);

  const netBalance = totalInc - totalExp;

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

      {/* სტატ ბოქსები - კომპაქტური */}
      <div className="grid grid-cols-5 gap-2 text-center">
        <Card className="border-0 bg-emerald-50 dark:bg-emerald-900/20">
          <CardContent className="p-2">
            <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400 mx-auto mb-0.5" />
            <p className="text-emerald-700 dark:text-emerald-300 font-bold text-sm">{totalInc}₾</p>
            <p className="text-emerald-500 dark:text-emerald-400 text-[10px]">შემოსავალი</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-2">
            <TrendingDown className="h-3 w-3 text-red-500 mx-auto mb-0.5" />
            <p className="text-red-600 dark:text-red-400 font-bold text-sm">{totalExp}₾</p>
            <p className="text-red-400 text-[10px]">გასავალი</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-purple-50 dark:bg-purple-900/20">
          <CardContent className="p-2">
            <CreditCard className="h-3 w-3 text-purple-500 mx-auto mb-0.5" />
            <p className="text-purple-700 dark:text-purple-300 font-bold text-xs">{debtsTotal}₾</p>
            <p className="text-purple-500 text-[10px] mb-1">ვალები</p>
            <div className="text-[10px] flex justify-between">
              <span className="text-purple-600 dark:text-purple-400 flex items-center gap-px"><Check className="h-2.5 w-2.5" />{debtsPaid}₾</span>
              <span className="text-purple-400">{debtsRemaining}₾</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="p-2">
            <Receipt className="h-3 w-3 text-blue-500 mx-auto mb-0.5" />
            <p className="text-blue-700 dark:text-blue-300 font-bold text-xs">{billsTotal}₾</p>
            <p className="text-blue-500 text-[10px] mb-1">ბილები</p>
            <div className="text-[10px] flex justify-between">
              <span className="text-blue-600 dark:text-blue-400 flex items-center gap-px"><Check className="h-2.5 w-2.5" />{billsPaid}₾</span>
              <span className="text-blue-400">{billsRemaining}₾</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-teal-50 dark:bg-teal-900/20">
          <CardContent className="p-2">
            <Repeat className="h-3 w-3 text-teal-500 mx-auto mb-0.5" />
            <p className="text-teal-700 dark:text-teal-300 font-bold text-xs">{subsTotal}₾</p>
            <p className="text-teal-500 text-[10px] mb-1">გამოწერები</p>
            <div className="text-[10px] flex justify-between">
              <span className="text-teal-600 dark:text-teal-400 flex items-center gap-px"><Check className="h-2.5 w-2.5" />{subsPaid}₾</span>
              <span className="text-teal-400">{subsRemaining}₾</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </header>
  );
};
