import React, { useState } from 'react';
import { AppState, Subscription } from '../types';
import { getDaysUntilDue, getUrgencyColor } from '../utils/billWarnings';
import { Plus, X, Check, Calendar, Pencil } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface SubscriptionsManagerProps {
  state: AppState;
  selectedMonth: string;
  onAddSubscription: (name: string, amount: number, dueDate?: string) => void;
  onRemoveSubscription: (id: number) => void;
  onToggleSubscriptionPaid: (id: number) => void;
  onEditSubscription: (id: number, updates: Partial<Subscription>) => void;
}

export const SubscriptionsManager: React.FC<SubscriptionsManagerProps> = ({
  state,
  selectedMonth,
  onAddSubscription,
  onRemoveSubscription,
  onToggleSubscriptionPaid,
  onEditSubscription,
}) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDueDate, setEditDueDate] = useState('');

  const startEdit = (sub: Subscription) => {
    setEditingId(sub.id);
    setEditName(sub.name);
    setEditAmount(sub.amount.toString());
    setEditDueDate(sub.dueDate || '');
  };

  const saveEdit = () => {
    if (editingId === null) return;
    onEditSubscription(editingId, {
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
      alert('შეიყვანე გამოწერის სახელი');
      return;
    }
    if (!numAmount || numAmount <= 0) {
      alert('შეიყვანე სწორი თანხა');
      return;
    }
    onAddSubscription(trimmedName, numAmount, dueDate || undefined);
    setName('');
    setAmount('');
    setDueDate('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  };

  const handleRemove = (id: number, subName: string, subAmount: number) => {
    if (window.confirm(`წაშალო "${subName}" - ${subAmount}₾?`)) {
      onRemoveSubscription(id);
    }
  };

  const currentMonth = parseInt(selectedMonth || '0');
  const monthlySubs = (state.subscriptions || []).filter(
    (s) => (s.reset_month ?? 0) === currentMonth
  );
  const subsPaid = monthlySubs.filter((s) => s.paid).reduce((sum, s) => sum + s.amount, 0);
  const subsRemaining = monthlySubs.filter((s) => !s.paid).reduce((sum, s) => sum + s.amount, 0);
  const subsTotal = monthlySubs.reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="space-y-2">
      <p className="font-semibold text-sm">გამოწერები</p>

      <Input type="text" placeholder="გამოწერის სახელი" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={handleKeyDown} className="h-8 text-xs" />
      <Input type="text" inputMode="numeric" placeholder="თანხა ₾" value={amount} onChange={(e) => setAmount(e.target.value)} onKeyDown={handleKeyDown} className="h-8 text-xs" />

      <div className="relative">
        <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500 dark:text-slate-400 pointer-events-none" />
        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="pl-8 h-8 text-xs" />
      </div>

      <Button onClick={handleAdd} className="w-full h-7 text-[11px] bg-teal-600 hover:bg-teal-700 text-white">
        <Plus className="h-3 w-3 mr-1" /> გამოწერის დამატება
      </Button>

      {/* სტატისტიკა */}
      <Card className="bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-700/50 rounded-2xl">
        <CardContent className="p-2 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="flex items-center gap-1 text-teal-700 dark:text-teal-300"><Check className="h-2.5 w-2.5" />გადახდილი:</span>
            <span className="font-bold text-teal-700 dark:text-teal-300">{subsPaid}₾</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-teal-600 dark:text-teal-400">დარჩენილი:</span>
            <span className="font-bold text-teal-600 dark:text-teal-400">{subsRemaining}₾</span>
          </div>
          <div className="flex justify-between text-xs text-teal-800 dark:text-teal-200 pt-1.5 border-t border-teal-200 dark:border-teal-700/50">
            <span>სულ:</span>
            <span className="font-bold">{subsTotal}₾</span>
          </div>
          {subsTotal > 0 && <Progress value={(subsPaid / subsTotal) * 100} indicatorClassName="bg-teal-500" className="h-1 bg-teal-100 dark:bg-teal-900/30" />}
        </CardContent>
      </Card>

      {/* გამოწერების სია */}
      <div className="space-y-2">
        {monthlySubs.length === 0 ? (
          <p className="text-center text-slate-500 dark:text-slate-400 py-4">ამ თვეში გამოწერა არ დამატებულა</p>
        ) : (
          monthlySubs.map((sub) => {
            const daysUntilDue = sub.dueDate ? getDaysUntilDue(sub.dueDate) : null;
            const bgColor = sub.dueDate ? getUrgencyColor(daysUntilDue ?? 999, sub.paid) : '#475569';

            if (sub.id === editingId) {
              return (
                <Card key={sub.id} style={{ borderLeftColor: bgColor, borderLeftWidth: '4px' }} className="bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-700/50 rounded-2xl">
                  <CardContent className="p-2 space-y-1.5">
                    <Input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="h-7 text-xs" placeholder="სახელი" />
                    <div className="flex gap-1.5">
                      <Input type="text" inputMode="numeric" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="h-7 text-xs flex-1" placeholder="₾" onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }} />
                      <Input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} className="h-7 text-xs flex-1" />
                      <Button variant="default" size="icon" onClick={saveEdit} className="h-7 w-7 shrink-0"><Check className="h-3 w-3" /></Button>
                      <Button variant="outline" size="icon" onClick={cancelEdit} className="h-7 w-7 shrink-0"><X className="h-3 w-3" /></Button>
                    </div>
                  </CardContent>
                </Card>
              );
            }

            return (
              <Card key={sub.id} style={{ borderLeftColor: bgColor, borderLeftWidth: '4px' }} className="bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-700/50 rounded-2xl">
                <CardContent className="p-2 flex justify-between items-center">
                  <label className="flex items-center cursor-pointer flex-1">
                    <input type="checkbox" checked={sub.paid} onChange={() => onToggleSubscriptionPaid(sub.id)} className="w-3.5 h-3.5 mr-2 cursor-pointer" />
                    <div className={cn(sub.paid && 'line-through opacity-50')}>
                      <p className="font-bold text-xs text-teal-700 dark:text-teal-300">{sub.name}</p>
                      <p className="text-[10px] text-teal-600 dark:text-teal-400">{sub.amount}₾</p>
                      {daysUntilDue !== null && !sub.paid && (
                        <p className="text-xs font-bold" style={{ color: bgColor }}>
                          {daysUntilDue < 0 ? `დაგვიანებულია ${Math.abs(daysUntilDue)} დღით!` : daysUntilDue === 0 ? 'დღეს უნდა გადაიხადო!' : `${daysUntilDue} დღე დარჩა`}
                        </p>
                      )}
                    </div>
                  </label>
                  <div className="flex items-center gap-0.5 ml-1">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(sub)} className="h-6 w-6 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"><Pencil className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleRemove(sub.id, sub.name, sub.amount)} className="h-6 w-6 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"><X className="h-3 w-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
