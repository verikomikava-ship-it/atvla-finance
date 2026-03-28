import React, { useState, useRef, useEffect } from 'react';
import { AppState, UserProfile } from '../types';
import { BillAlerts } from './BillAlerts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings2, Check, X, Target, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { MONTH_NAMES } from '@/utils/constants';
import { cn } from '@/lib/utils';

interface HeaderProps {
  state: AppState;
  selectedMonth: string;
  totalInc: number;
  totalExp: number;
  totalKulaba: number;
  onGoalChange: (goal: number, goalName: string) => void;
  onProfileChange: (profile: UserProfile) => void;
  onMonthChange: (month: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  state,
  selectedMonth,
  totalInc,
  totalExp,
  totalKulaba,
  onGoalChange,
  onProfileChange,
  onMonthChange,
}) => {
  const netBalance = totalInc - totalExp;

  // Goal editor
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [goalNameInput, setGoalNameInput] = useState('');
  const goalInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingGoal && goalInputRef.current) goalInputRef.current.focus();
  }, [isEditingGoal]);

  const openGoalEditor = () => {
    setGoalInput(state.goal ? state.goal.toString() : '');
    setGoalNameInput(state.goalName || '');
    setIsEditingGoal(true);
  };

  const saveGoal = () => {
    onGoalChange(Math.max(0, parseInt(goalInput) || 0), goalNameInput.trim());
    setIsEditingGoal(false);
  };

  // Profile editor
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileSalary, setProfileSalary] = useState('');
  const [profileDailyTarget, setProfileDailyTarget] = useState('');
  const [profileWorkDays, setProfileWorkDays] = useState<number[]>([]);

  const WEEK_DAYS = [
    { value: 1, label: 'ორშ' }, { value: 2, label: 'სამ' }, { value: 3, label: 'ოთხ' },
    { value: 4, label: 'ხუთ' }, { value: 5, label: 'პარ' }, { value: 6, label: 'შაბ' }, { value: 0, label: 'კვი' },
  ];

  const openProfileEditor = () => {
    setProfileSalary(state.profile?.salary?.toString() || '');
    setProfileDailyTarget(state.profile?.dailyTarget?.toString() || '');
    setProfileWorkDays(state.profile?.workDays || [1, 2, 3, 4, 5]);
    setIsEditingProfile(true);
  };

  const saveProfile = () => {
    onProfileChange({
      ...state.profile,
      salary: Math.max(0, parseInt(profileSalary) || 0),
      dailyTarget: Math.max(0, parseInt(profileDailyTarget) || 0),
      workDays: profileWorkDays,
    });
    setIsEditingProfile(false);
  };

  const needsSalary = state.profile?.incomeType === 'salary' || state.profile?.incomeType === 'both';
  const needsDailyTarget = state.profile?.incomeType === 'freelance' || state.profile?.incomeType === 'both';
  const needsWorkDays = state.profile?.incomeType === 'salary' || state.profile?.incomeType === 'both';

  const goalAmount = state.goal || 0;
  const kulabaProgress = goalAmount > 0 ? Math.min((totalKulaba / goalAmount) * 100, 100) : 0;

  return (
    <header className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-lg">
      <div className="px-4 pt-3 pb-2">
        {/* Row 1: Title + Month + Profile */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">🏺</span>
          <div className="flex-1">
            <h1 className="font-black text-base leading-none">Atvla Finance</h1>
            <p className="text-[10px] text-white/70 leading-none mt-0.5">ჩემი ფინანსები</p>
          </div>

          {/* Month selector */}
          <select
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            className="bg-white/20 backdrop-blur text-white border border-white/30 rounded-xl px-3 py-1.5 text-sm font-semibold outline-none hover:bg-white/30 transition-colors cursor-pointer"
          >
            {MONTH_NAMES.map((month, index) => (
              <option key={index} value={index.toString()} className="text-slate-800 bg-white font-medium">
                {month}
              </option>
            ))}
            <option value="" className="text-slate-800 bg-white font-medium">ყველა თვე</option>
          </select>

          {/* Profile edit button */}
          <button
            onClick={openProfileEditor}
            title="პროფილის რედაქტირება"
            className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>

        {/* Row 2: Stats — Income | Expenses | Balance | Goal */}
        <div className="grid grid-cols-4 gap-2">
          {/* Income */}
          <div className="bg-white/15 backdrop-blur rounded-xl px-2 py-2 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <TrendingUp className="w-3 h-3 text-emerald-200" />
              <p className="text-[9px] font-semibold text-emerald-200">შემოსავ.</p>
            </div>
            <p className="text-sm font-black text-white leading-none">{totalInc.toLocaleString()}₾</p>
          </div>

          {/* Expenses */}
          <div className="bg-white/15 backdrop-blur rounded-xl px-2 py-2 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <TrendingDown className="w-3 h-3 text-red-200" />
              <p className="text-[9px] font-semibold text-red-200">გასავ.</p>
            </div>
            <p className="text-sm font-black text-white leading-none">{totalExp.toLocaleString()}₾</p>
          </div>

          {/* Balance */}
          <div className={cn(
            'backdrop-blur rounded-xl px-2 py-2 text-center',
            netBalance >= 0 ? 'bg-emerald-400/30' : 'bg-red-400/30'
          )}>
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Wallet className="w-3 h-3 text-white/80" />
              <p className="text-[9px] font-semibold text-white/80">ბალანსი</p>
            </div>
            <p className={cn(
              'text-sm font-black leading-none',
              netBalance >= 0 ? 'text-emerald-200' : 'text-red-200'
            )}>
              {netBalance >= 0 ? '+' : ''}{netBalance.toLocaleString()}₾
            </p>
          </div>

          {/* Goal / Kulaba */}
          <div
            className={cn(
              'backdrop-blur rounded-xl px-2 py-2 cursor-pointer transition-colors',
              state.goalProjectId
                ? 'bg-amber-400/30 hover:bg-amber-400/40'
                : 'bg-white/15 hover:bg-white/25'
            )}
            onClick={state.goalProjectId ? undefined : openGoalEditor}
          >
            <div className="flex items-center gap-1 mb-0.5">
              <Target className="w-3 h-3 text-amber-200" />
              <p className="text-[9px] font-semibold text-amber-200 truncate">
                {state.goalProjectId ? '🏗️ ' : ''}{state.goalName || 'მიზანი'}
              </p>
            </div>
            {goalAmount > 0 ? (
              <>
                <p className="text-[11px] font-black text-white leading-none mb-1">
                  {totalKulaba.toLocaleString()}₾ <span className="font-normal text-white/60">/ {goalAmount.toLocaleString()}₾</span>
                </p>
                <div className="h-1 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-300 rounded-full transition-all duration-500"
                    style={{ width: `${kulabaProgress}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="text-[10px] text-white/50">+ მიზნის დაწესება</p>
            )}
          </div>
        </div>
      </div>

      {/* Goal editor panel */}
      {isEditingGoal && (
        <div className="mx-4 mb-2 p-3 bg-white/20 backdrop-blur rounded-xl border border-white/30 space-y-2">
          <p className="text-xs font-bold text-white/90">🎯 მიზნის რედაქტირება</p>
          <Input
            ref={goalInputRef}
            type="text"
            placeholder="რისთვის აგროვებ? (სახელი)"
            value={goalNameInput}
            onChange={(e) => setGoalNameInput(e.target.value)}
            className="h-8 text-xs bg-white/90 text-slate-800 border-0"
          />
          <div className="flex gap-2">
            <Input
              type="text"
              inputMode="numeric"
              placeholder="თანხა ₾"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveGoal(); if (e.key === 'Escape') setIsEditingGoal(false); }}
              className="flex-1 h-8 text-xs bg-white/90 text-slate-800 border-0"
            />
            <Button size="sm" onClick={saveGoal} className="h-8 w-8 p-0 bg-white text-blue-600 hover:bg-white/90">
              <Check className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsEditingGoal(false)} className="h-8 w-8 p-0 text-white hover:bg-white/20">
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Profile editor panel */}
      {isEditingProfile && state.profile && (
        <div className="mx-4 mb-2 p-3 bg-white/20 backdrop-blur rounded-xl border border-white/30 space-y-2">
          <p className="text-xs font-bold text-white/90">⚙️ პროფილის რედაქტირება</p>
          {needsSalary && (
            <div className="flex gap-2 items-center">
              <span className="text-[10px] text-white/80 w-16 shrink-0">ხელფასი:</span>
              <Input type="text" inputMode="numeric" value={profileSalary}
                onChange={(e) => setProfileSalary(e.target.value)}
                className="h-7 text-xs flex-1 bg-white/90 text-slate-800 border-0" placeholder="₾" />
            </div>
          )}
          {needsDailyTarget && (
            <div className="flex gap-2 items-center">
              <span className="text-[10px] text-white/80 w-16 shrink-0">
                {state.profile.incomeType === 'both' ? 'დანამატი:' : 'დღიური:'}
              </span>
              <Input type="text" inputMode="numeric" value={profileDailyTarget}
                onChange={(e) => setProfileDailyTarget(e.target.value)}
                className="h-7 text-xs flex-1 bg-white/90 text-slate-800 border-0" placeholder="₾/დღე" />
            </div>
          )}
          {needsWorkDays && (
            <div>
              <span className="text-[10px] text-white/80 block mb-1">სამუშაო დღეები:</span>
              <div className="flex gap-1">
                {WEEK_DAYS.map((wd) => (
                  <button key={wd.value}
                    onClick={() => setProfileWorkDays(prev =>
                      prev.includes(wd.value) ? prev.filter(d => d !== wd.value) : [...prev, wd.value]
                    )}
                    className={cn(
                      'flex-1 py-1 rounded text-[9px] font-bold border transition-all',
                      profileWorkDays.includes(wd.value)
                        ? 'border-white bg-white text-blue-600'
                        : 'border-white/40 bg-white/10 text-white/70'
                    )}
                  >
                    {wd.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button size="sm" onClick={saveProfile} className="h-7 px-3 bg-white text-blue-600 hover:bg-white/90 text-xs">
              <Check className="h-3 w-3 mr-1" /> შენახვა
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsEditingProfile(false)}
              className="h-7 px-3 text-white hover:bg-white/20 text-xs">
              <X className="h-3 w-3 mr-1" /> გაუქმება
            </Button>
          </div>
        </div>
      )}

      {/* Bill Alerts */}
      <div className="px-4 pb-2">
        <BillAlerts bills={state.bills} debts={state.debts} subscriptions={state.subscriptions || []} />
      </div>
    </header>
  );
};
