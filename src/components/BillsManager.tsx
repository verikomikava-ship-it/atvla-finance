import React, { useState } from 'react';
import { AppState, Bill, UTILITY_TYPES } from '../types';
import { getDaysUntilDue, getUrgencyColor } from '../utils/billWarnings';
import { Plus, X, Check, Calendar, Repeat, Pencil } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface BillsManagerProps {
  state: AppState;
  selectedMonth: string;
  onAddBill: (name: string, amount: number, isRecurring: boolean, dueDate?: string) => void;
  onRemoveBill: (id: number) => void;
  onToggleBillPaid: (id: number) => void;
  onEditBill: (id: number, updates: Partial<Bill>) => void;
  filterPrefix?: string; // "🏦" = მხოლოდ ბანკის, "" = ბანკის გარდა
}

export const BillsManager: React.FC<BillsManagerProps> = ({
  state,
  selectedMonth,
  onAddBill,
  onRemoveBill,
  onToggleBillPaid,
  onEditBill,
  filterPrefix,
}) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [dueDate, setDueDate] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDueDate, setEditDueDate] = useState('');

  const startEdit = (bill: Bill) => {
    setEditingId(bill.id);
    setEditName(bill.name);
    setEditAmount(bill.amount.toString());
    setEditDueDate(bill.dueDate || '');
  };

  const saveEdit = () => {
    if (editingId === null) return;
    onEditBill(editingId, {
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
      alert('შეიყვანე ბილის სახელი');
      return;
    }
    if (!numAmount || numAmount <= 0) {
      alert('შეიყვანე სწორი თანხა');
      return;
    }
    onAddBill(trimmedName, numAmount, isRecurring, dueDate || undefined);
    setName('');
    setAmount('');
    setIsRecurring(false);
    setDueDate('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  };

  const handleRemove = (id: number, billName: string, billAmount: number) => {
    if (window.confirm(`წაშალო "${billName}" - ${billAmount}₾?`)) {
      onRemoveBill(id);
    }
  };

  const currentMonth = parseInt(selectedMonth || '0');
  // კომუნალური ბილები გავფილტროთ — ისინი ცალკე ტაბშია
  const isUtilityBill = (name: string) => name.startsWith('კომუნალური:') || UTILITY_TYPES.some((u) => u.label === name);
  const monthlyBills = state.bills.filter((b) => {
    if ((b.reset_month ?? 0) !== currentMonth) return false;
    if (isUtilityBill(b.name)) return false;
    // filterPrefix: "🏦" = მხოლოდ ბანკის, "" = ბანკის გარეშე, undefined = ყველა
    if (filterPrefix === '🏦') return b.name.startsWith('🏦');
    if (filterPrefix === '') return !b.name.startsWith('🏦');
    return true;
  });
  const billsPaid = monthlyBills.filter((b) => b.paid).reduce((sum, b) => sum + b.amount, 0);
  const billsRemaining = monthlyBills
    .filter((b) => !b.paid)
    .reduce((sum, b) => sum + b.amount, 0);
  const billsTotal = monthlyBills.reduce((sum, b) => sum + b.amount, 0);

  const grandTotal = billsTotal;

  return (
    <div className="space-y-2">
      <p className="font-semibold text-sm">თვიური ბილები</p>

      <Input type="text" placeholder="ბილის სახელი" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={handleKeyDown} className="h-8 text-xs" />
      <Input type="text" inputMode="numeric" placeholder="თანხა ₾" value={amount} onChange={(e) => setAmount(e.target.value)} onKeyDown={handleKeyDown} className="h-8 text-xs" />

      <div className="relative">
        <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-600 dark:text-slate-400 pointer-events-none" />
        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="pl-8 h-8 text-xs" />
      </div>

      <label className="flex items-center gap-2 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer">
        <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="w-3.5 h-3.5" />
        <Repeat className="h-3 w-3 text-slate-600 dark:text-slate-400" />
        <span className="text-xs text-slate-700 dark:text-slate-300">ყველა თვეში (რეკურინგი)</span>
      </label>

      <Button onClick={handleAdd} className="w-full h-7 text-[11px]" variant="default">
        <Plus className="h-3 w-3 mr-1" /> ბილის დამატება
      </Button>

      {/* სტატისტიკა */}
      <Card className="bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-700/50">
        <CardContent className="p-2 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="flex items-center gap-1 text-blue-700 dark:text-blue-300"><Check className="h-2.5 w-2.5" />გადახდილი:</span>
            <span className="font-bold text-blue-700 dark:text-blue-300">{billsPaid}₾</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-blue-600 dark:text-blue-400">დარჩენილი:</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">{billsRemaining}₾</span>
          </div>
<div className="flex justify-between text-xs text-blue-800 dark:text-blue-200 pt-1.5 border-t border-blue-200 dark:border-blue-700/50">
            <span>სულ:</span>
            <span className="font-bold">{grandTotal}₾</span>
          </div>
          {grandTotal > 0 && <Progress value={(billsPaid / grandTotal) * 100} indicatorClassName="bg-blue-500" className="h-1 bg-blue-100 dark:bg-blue-900/30" />}
        </CardContent>
      </Card>

      {/* ბილების სია */}
      <div className="space-y-2">
        {monthlyBills.length === 0 ? (
          <p className="text-center text-slate-500 dark:text-slate-400 py-4">ამ თვეში ბილი არ დამატებულა</p>
        ) : (
          monthlyBills.map((bill) => {
            const daysUntilDue = bill.dueDate ? getDaysUntilDue(bill.dueDate) : null;
            const bgColor = bill.dueDate ? getUrgencyColor(daysUntilDue ?? 999, bill.paid) : '#475569';

            if (bill.id === editingId) {
              return (
                <Card key={bill.id} style={{ borderLeftColor: bgColor, borderLeftWidth: '4px' }} className="bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-700/50">
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
              <Card
                key={bill.id}
                style={{ borderLeftColor: bgColor, borderLeftWidth: '4px' }}
                className="bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-700/50"
              >
                <CardContent className="p-2 flex justify-between items-center">
                  <label className="flex items-center cursor-pointer flex-1">
                    <input type="checkbox" checked={bill.paid} onChange={() => onToggleBillPaid(bill.id)} className="w-3.5 h-3.5 mr-2 cursor-pointer" />
                    <div className={cn(bill.paid && 'line-through opacity-50')}>
                      <p className="font-bold text-xs text-blue-700 dark:text-blue-300">{bill.name}</p>
                      <p className="text-[10px] text-blue-600 dark:text-blue-400">{bill.amount}₾</p>
                      {daysUntilDue !== null && !bill.paid && (
                        <p className="text-xs font-bold" style={{ color: bgColor }}>
                          {daysUntilDue < 0 ? `დაგვიანებულია ${Math.abs(daysUntilDue)} დღით!` : daysUntilDue === 0 ? 'დღეს უნდა გადაიხადო!' : `${daysUntilDue} დღე დარჩა`}
                        </p>
                      )}
                    </div>
                  </label>
                  <div className="flex items-center gap-0.5 ml-1">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(bill)} className="h-6 w-6 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"><Pencil className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleRemove(bill.id, bill.name, bill.amount)} className="h-6 w-6 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10"><X className="h-3 w-3" /></Button>
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
