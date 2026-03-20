import React, { useState, useMemo } from 'react';
import { AppState, Debt, DebtPriority } from '../types';
import { calculateDebtRepaymentPlan, getAverageDailyExpenses } from '../utils/calculations';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Plus, X, Check, Clock, AlertTriangle, ChevronDown, ChevronUp, Pencil, TrendingDown } from 'lucide-react';

const COMPACT_INPUT = 'h-8 text-xs';
const COMPACT_BTN = 'h-7 text-[11px]';

interface DebtsManagerProps {
  state: AppState;
  onAddDebt: (name: string, amount: number, priority: DebtPriority, dueDate?: string, parts?: number) => void;
  onRemoveDebt: (id: number) => void;
  onToggleDebtPaid: (id: number) => void;
  onPayDebtPart: (id: number) => void;
  onEditDebt: (id: number, updates: Partial<Debt>) => void;
}

const PRIORITY_CONFIG: Record<DebtPriority, { label: string; color: string; border: string; bg: string }> = {
  high: { label: 'მაღალი', color: '#ef4444', border: 'border-red-200 dark:border-red-700/50', bg: 'from-red-50 to-red-100 dark:from-red-500/10 dark:to-red-900/30' },
  medium: { label: 'საშუალო', color: '#f59e0b', border: 'border-amber-200 dark:border-amber-700/50', bg: 'from-amber-50 to-amber-100 dark:from-amber-500/10 dark:to-amber-900/30' },
  low: { label: 'დაბალი', color: '#10b981', border: 'border-green-200 dark:border-green-700/50', bg: 'from-green-50 to-green-100 dark:from-green-500/10 dark:to-green-900/30' },
};

const getDaysUntil = (dateStr: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = dateStr.split('-').map(Number);
  const due = new Date(y, m - 1, d);
  due.setHours(0, 0, 0, 0);
  return Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

type DebtGroup = {
  name: string;
  debts: Debt[];
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
};

const PRIORITY_BADGE_VARIANT: Record<DebtPriority, 'danger' | 'warning' | 'success'> = {
  high: 'danger',
  medium: 'warning',
  low: 'success',
};

const PRIORITY_INDICATOR_CLASS: Record<DebtPriority, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-emerald-500',
};

const PRIORITY_BG_CLASS: Record<DebtPriority, string> = {
  high: 'bg-red-50 dark:bg-red-500/10',
  medium: 'bg-amber-50 dark:bg-amber-500/10',
  low: 'bg-emerald-50 dark:bg-emerald-500/10',
};

// ვალის დაფარვის გეგმის სექცია
const DebtRepaymentSection: React.FC<{ state: AppState; activeDebts: Debt[] }> = ({ state, activeDebts }) => {
  const dailyBudget = state.profile?.dailyBudget || 0;
  const avgExpenses = getAverageDailyExpenses(state.db);
  const plans = calculateDebtRepaymentPlan(activeDebts, dailyBudget, avgExpenses);
  const availableForDebt = Math.max(0, dailyBudget - avgExpenses);

  if (availableForDebt <= 0 && plans.length === 0) return null;

  return (
    <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-500/10 dark:to-purple-500/10 border-indigo-200 dark:border-indigo-700/50">
      <CardContent className="p-2">
        <div className="flex items-center gap-1 mb-1.5">
          <TrendingDown className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
          <p className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">დაფარვის გეგმა</p>
        </div>

        <div className="flex justify-between text-xs mb-2">
          <span className="text-slate-600 dark:text-slate-400">დღიური ბიუჯეტი: <span className="text-indigo-700 dark:text-indigo-300 font-bold">{dailyBudget}₾</span></span>
          <span className="text-slate-600 dark:text-slate-400">საშ. ხარჯი: <span className="text-red-600 dark:text-red-400 font-bold">{avgExpenses}₾</span></span>
        </div>

        {availableForDebt > 0 ? (
          <div className="space-y-1.5">
            <p className="text-[10px] text-emerald-700 dark:text-emerald-300">
              ვალისთვის ხელმისაწვდომი: <span className="font-bold">{availableForDebt}₾/დღე</span>
            </p>
            {plans.map((plan) => {
              const p = plan.debt.priority || 'medium';
              const color = p === 'high' ? 'text-red-600 dark:text-red-400' : p === 'medium' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400';
              return (
                <div key={plan.debt.id} className="flex justify-between items-center text-[10px] py-0.5 border-t border-slate-200 dark:border-slate-700">
                  <span className={cn('font-bold', color)}>
                    {PRIORITY_CONFIG[p].label} · {plan.debt.name}
                  </span>
                  <span className="text-slate-600 dark:text-slate-400">
                    {plan.remainingAmount}₾ · <span className="text-indigo-600 dark:text-indigo-400">{plan.suggestedDaily}₾/დღე</span> · <span className="font-bold">{plan.daysToPayoff > 365 ? '365+' : plan.daysToPayoff} დღე</span>
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[10px] text-amber-600 dark:text-amber-400">
            ბიუჯეტი ≤ საშ. ხარჯი — ჯერ ხარჯების შემცირება სჭირდება
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export const DebtsManager: React.FC<DebtsManagerProps> = ({
  state,
  onAddDebt,
  onRemoveDebt,
  onToggleDebtPaid,
  onPayDebtPart,
  onEditDebt,
}) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [priority, setPriority] = useState<DebtPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [parts, setParts] = useState('1');
  const [showPaidDebts, setShowPaidDebts] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDueDate, setEditDueDate] = useState('');

  const startEdit = (debt: Debt) => {
    setEditingId(debt.id);
    setEditName(debt.name);
    setEditAmount(debt.amount.toString());
    setEditDueDate(debt.dueDate || '');
  };

  const saveEdit = () => {
    if (editingId === null) return;
    onEditDebt(editingId, {
      name: editName.trim() || 'უსახელო',
      amount: Math.max(1, parseInt(editAmount) || 0),
      dueDate: editDueDate || undefined,
    });
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  const handleAdd = () => {
    const trimmedName = name.trim();
    const numAmount = +amount;
    if (!trimmedName) {
      alert('შეიყვანე სახელი');
      return;
    }
    if (!numAmount || numAmount <= 0) {
      alert('შეიყვანე სწორი თანხა');
      return;
    }
    const numParts = Math.max(1, Math.min(10, parseInt(parts) || 1));
    onAddDebt(trimmedName, numAmount, priority, dueDate || undefined, numParts);
    setName('');
    setAmount('');
    setPriority('medium');
    setDueDate('');
    setParts('1');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  };

  const handleRemove = (id: number, debtName: string, debtAmount: number) => {
    if (window.confirm(`წაშალო "${debtName}" - ${debtAmount}₾?`)) {
      onRemoveDebt(id);
    }
  };

  // აქტიური (გადაუხდელი) ვალები - პრიორიტეტით დალაგებული
  const activeDebts = useMemo(() => {
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return state.debts
      .filter((d) => !d.paid)
      .sort((a, b) => {
        const pa = priorityOrder[a.priority || 'medium'];
        const pb = priorityOrder[b.priority || 'medium'];
        if (pa !== pb) return pa - pb;
        // ვადის მიხედვით - ახლოს მყოფი პირველი
        if (a.dueDate && b.dueDate) return getDaysUntil(a.dueDate) - getDaysUntil(b.dueDate);
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return 0;
      });
  }, [state.debts]);

  // გადახდილი ვალები
  const paidDebts = useMemo(() => state.debts.filter((d) => d.paid), [state.debts]);

  // აქტიური ვალების დაჯგუფება
  const activeGroups = useMemo((): DebtGroup[] => {
    const groups: Record<string, Debt[]> = {};
    activeDebts.forEach((d) => {
      const key = d.name.toLowerCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(d);
    });
    return Object.entries(groups).map(([, debts]) => ({
      name: debts[0].name,
      debts,
      totalAmount: debts.reduce((s, d) => s + d.amount, 0),
      paidAmount: debts.reduce((s, d) => {
        const partsPaid = ((d.paidParts || 0) / (d.parts || 1)) * d.amount;
        return s + Math.max(partsPaid, d.paidAmount || 0);
      }, 0),
      remainingAmount: debts.reduce((s, d) => {
        const partsPaid = ((d.paidParts || 0) / (d.parts || 1)) * d.amount;
        const totalPaidForDebt = Math.max(partsPaid, d.paidAmount || 0);
        return s + d.amount - totalPaidForDebt;
      }, 0),
    }));
  }, [activeDebts]);

  const totalAll = state.debts.reduce((sum, d) => sum + d.amount, 0);
  const totalPaidFull = paidDebts.reduce((sum, d) => sum + d.amount, 0);
  const totalPartialPaid = activeDebts.reduce(
    (sum, d) => {
      const partsPaid = ((d.paidParts || 0) / (d.parts || 1)) * d.amount;
      return sum + Math.max(partsPaid, d.paidAmount || 0);
    },
    0
  );
  const totalPaid = totalPaidFull + totalPartialPaid;
  const totalRemaining = totalAll - totalPaid;

  const renderDebtCard = (debt: Debt, indented: boolean) => {
    const p = debt.priority || 'medium';
    const config = PRIORITY_CONFIG[p];
    const totalParts = debt.parts || 1;
    const currentPaidParts = debt.paidParts || 0;
    const partAmount = Math.round(debt.amount / totalParts);
    const paidAmount = Math.round((currentPaidParts / totalParts) * debt.amount);
    const progress = (currentPaidParts / totalParts) * 100;
    const daysUntil = debt.dueDate ? getDaysUntil(debt.dueDate) : null;

    if (debt.id === editingId) {
      return (
        <Card key={debt.id} className={cn('p-2 border-l-4', PRIORITY_BG_CLASS[p], indented && 'ml-2')} style={{ borderLeftColor: config.color }}>
          <div className="space-y-1.5">
            <Input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="h-7 text-xs" placeholder="სახელი" />
            <div className="flex gap-1.5">
              <Input type="text" inputMode="numeric" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="h-7 text-xs flex-1" placeholder="₾" onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }} />
              <Input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} className="h-7 text-xs flex-1" />
              <Button variant="default" size="icon" onClick={saveEdit} className="h-7 w-7 shrink-0"><Check className="h-3 w-3" /></Button>
              <Button variant="outline" size="icon" onClick={cancelEdit} className="h-7 w-7 shrink-0"><X className="h-3 w-3" /></Button>
            </div>
          </div>
        </Card>
      );
    }

    return (
      <Card
        key={debt.id}
        className={cn(
          'p-2 border-l-4',
          PRIORITY_BG_CLASS[p],
          indented && 'ml-2'
        )}
        style={{ borderLeftColor: config.color }}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <p className="font-bold text-xs text-purple-800 dark:text-purple-200">{debt.name}</p>
              <Badge variant={PRIORITY_BADGE_VARIANT[p]} className="text-[9px] px-1 py-0">
                {config.label}
              </Badge>
            </div>

            <p className="text-xs text-purple-700 dark:text-purple-300 font-bold">{debt.amount}₾</p>

            {/* ნაწილობრივი გადახდის ინფო (paidAmount) */}
            {(debt.paidAmount || 0) > 0 && (
              <div className="mt-1">
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-green-600 dark:text-green-400">
                    💸 გადახდილი: {debt.paidAmount}₾
                  </span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold">
                    დარჩა: {debt.amount - (debt.paidAmount || 0)}₾
                  </span>
                </div>
                <Progress
                  value={((debt.paidAmount || 0) / debt.amount) * 100}
                  className="h-1.5 bg-purple-100 dark:bg-purple-900/30"
                  indicatorClassName="bg-green-500"
                />
              </div>
            )}

            {daysUntil !== null && (
              <div className="flex items-center gap-1 mt-1">
                {daysUntil < 0 ? (
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                ) : (
                  <Clock className="h-3 w-3" style={{
                    color: daysUntil <= 3 ? '#f87171' : daysUntil <= 7 ? '#fbbf24' : '#10b981',
                  }} />
                )}
                <p
                  className="text-xs font-bold"
                  style={{
                    color: daysUntil < 0 ? '#ef4444' : daysUntil <= 3 ? '#f87171' : daysUntil <= 7 ? '#fbbf24' : '#10b981',
                  }}
                >
                  {daysUntil < 0
                    ? `${Math.abs(daysUntil)} დღით დაგვიანებული!`
                    : daysUntil === 0
                    ? 'დღეს უნდა დაბრუნო!'
                    : `${daysUntil} დღე დარჩა`}
                </p>
              </div>
            )}

            {/* ნაწილების პროგრესი */}
            {totalParts > 1 && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                  <span>
                    {currentPaidParts}/{totalParts} ნაწილი ({partAmount}₾ თითო)
                  </span>
                  <span className="font-bold" style={{ color: config.color }}>
                    {paidAmount}₾ / {debt.amount}₾
                  </span>
                </div>
                <Progress
                  value={progress}
                  indicatorClassName={PRIORITY_INDICATOR_CLASS[p]}
                />
                {/* ნაწილების ინდიკატორები — მრავალ ხაზი თუ ბევრია */}
                {totalParts <= 36 ? (
                  (() => {
                    const perRow = totalParts <= 12 ? totalParts : 12;
                    const rows: number[][] = [];
                    for (let i = 0; i < totalParts; i += perRow) {
                      rows.push(Array.from({ length: Math.min(perRow, totalParts - i) }, (_, j) => i + j));
                    }
                    return (
                      <div className="space-y-0.5 mt-1.5">
                        {rows.map((row, ri) => (
                          <div key={ri} className="flex gap-0.5">
                            {row.map((idx) => (
                              <div
                                key={idx}
                                className={cn(
                                  'flex-1 h-1.5 rounded-sm transition-all duration-300',
                                  idx < currentPaidParts ? PRIORITY_INDICATOR_CLASS[p] : 'bg-slate-200 dark:bg-slate-700'
                                )}
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    );
                  })()
                ) : (
                  <div className="flex gap-1 mt-1.5">
                    {Array.from({ length: totalParts }, (_, i) => (
                      <div
                        key={i}
                        className={cn(
                          'flex-1 h-1.5 rounded-full transition-all duration-300',
                          i < currentPaidParts ? PRIORITY_INDICATOR_CLASS[p] : 'bg-slate-200 dark:bg-slate-700'
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-0.5 ml-1">
            {totalParts > 1 && currentPaidParts < totalParts && (
              <Button variant="outline" size="sm" onClick={() => onPayDebtPart(debt.id)} className="h-6 text-[10px] px-1.5 font-bold" style={{ borderColor: `${config.color}50`, color: config.color, backgroundColor: `${config.color}15` }} title={`გადაიხადე ${partAmount}₾`}>
                +1
              </Button>
            )}
            {totalParts <= 1 && (
              <input type="checkbox" checked={debt.paid} onChange={() => onToggleDebtPaid(debt.id)} className="w-3.5 h-3.5 cursor-pointer" />
            )}
            <Button variant="ghost" size="icon" onClick={() => startEdit(debt)} className="h-6 w-6 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
              <Pencil className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleRemove(debt.id, debt.name, debt.amount)} className="h-6 w-6 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm">ვალების მენეჯმენტი</h3>

      <Input type="text" placeholder="ვის სახელი" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={handleKeyDown} className={COMPACT_INPUT} />
      <Input type="text" inputMode="numeric" placeholder="თანხა ₾" value={amount} onChange={(e) => setAmount(e.target.value)} onKeyDown={handleKeyDown} className={COMPACT_INPUT} />

      <div className="flex gap-1.5">
        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={cn('flex-1', COMPACT_INPUT)} />
        <select value={parts} onChange={(e) => setParts(e.target.value)} className="w-20 rounded-xl border border-border bg-background px-2 py-1 text-xs">
          {[1, 2, 3, 4, 5, 6].map((n) => (<option key={n} value={n}>{n} ნაწ.</option>))}
        </select>
      </div>

      <div className="flex gap-1.5">
        {(Object.entries(PRIORITY_CONFIG) as [DebtPriority, typeof PRIORITY_CONFIG[DebtPriority]][]).map(
          ([key, cfg]) => (
            <Button key={key} variant="outline" onClick={() => setPriority(key)} className={cn('flex-1', COMPACT_BTN, priority === key ? 'scale-105' : 'opacity-50 hover:opacity-75')} style={{ borderColor: priority === key ? cfg.color : undefined, backgroundColor: priority === key ? `${cfg.color}20` : 'transparent', color: cfg.color }}>
              {cfg.label}
            </Button>
          )
        )}
      </div>

      <Button variant="default" onClick={handleAdd} className={cn('w-full', COMPACT_BTN)}>
        <Plus className="h-3 w-3 mr-1" /> ვალის დამატება
      </Button>

      {/* სტატისტიკა */}
      <Card className="bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-700/50">
        <CardContent className="p-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="flex items-center gap-1 text-purple-700 dark:text-purple-300"><Check className="h-2.5 w-2.5" />გადახდილი:</span>
            <span className="font-bold text-purple-700 dark:text-purple-300">{Math.round(totalPaid)}₾</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400"><Clock className="h-2.5 w-2.5" />დარჩენილი:</span>
            <span className="font-bold text-purple-600 dark:text-purple-400">{Math.round(totalRemaining)}₾</span>
          </div>
          <div className="flex justify-between text-xs text-purple-800 dark:text-purple-200 mt-1.5 pt-1.5 border-t border-purple-200 dark:border-purple-700/50">
            <span>სულ:</span>
            <span className="font-bold">{totalAll}₾</span>
          </div>
          {totalAll > 0 && (
            <div className="mt-1.5">
              <Progress value={(totalPaid / totalAll) * 100} className="h-1.5 bg-purple-100 dark:bg-purple-900/30" indicatorClassName="bg-purple-500" />
              <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5 text-right">{Math.round((totalPaid / totalAll) * 100)}%</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ვალის დაფარვის გეგმა */}
      {activeDebts.length > 0 && state.profile && (
        <DebtRepaymentSection state={state} activeDebts={activeDebts} />
      )}

      {/* აქტიური ვალები */}
      <div className="space-y-3">
        {activeGroups.length === 0 && paidDebts.length === 0 ? (
          <p className="text-center text-slate-500 dark:text-slate-400 py-4">დაამატე პირველი ვალი</p>
        ) : activeGroups.length === 0 ? (
          <p className="text-center text-slate-500 dark:text-slate-400 py-4">ყველა ვალი გადახდილია!</p>
        ) : (
          activeGroups.map((group) => (
            <div key={group.name} className="space-y-1">
              {group.debts.length > 1 && (
                <div className="flex justify-between items-center px-2 py-1">
                  <span className="text-sm font-bold text-purple-800 dark:text-purple-200">{group.name}</span>
                  <span className="text-xs text-purple-700 dark:text-purple-300">
                    სულ: {group.totalAmount}₾
                    {group.paidAmount > 0 && (
                      <span className="text-green-600 dark:text-green-400 ml-2">
                        <Check className="h-3 w-3 inline mr-0.5" />
                        {Math.round(group.paidAmount)}₾
                      </span>
                    )}
                  </span>
                </div>
              )}
              {group.debts.map((debt) => renderDebtCard(debt, group.debts.length > 1))}
            </div>
          ))
        )}
      </div>

      {/* გადახდილი ვალები */}
      {paidDebts.length > 0 && (
        <div>
          <Button
            variant="ghost"
            onClick={() => setShowPaidDebts(!showPaidDebts)}
            className="w-full flex justify-between items-center text-sm font-bold text-green-600 dark:text-green-400 border-t border-slate-200 dark:border-slate-700 rounded-none pt-3"
          >
            <span className="flex items-center gap-1">
              <Check className="h-4 w-4" />
              გადახდილი ვალები ({paidDebts.length})
            </span>
            {showPaidDebts ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          {showPaidDebts && (
            <div className="space-y-2 mt-2">
              {paidDebts.map((debt) => (
                <Card
                  key={debt.id}
                  className="p-3 bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-700/50 opacity-60"
                >
                  <div className="flex justify-between items-center">
                    <div className="line-through">
                      <p className="font-bold text-green-700 dark:text-green-300">{debt.name}</p>
                      <p className="text-xs text-green-600 dark:text-green-400">{debt.amount}₾</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(debt.id, debt.name, debt.amount)}
                        className="h-8 w-8 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
