import React, { useState, useMemo } from 'react';
import { AppState, Bill, UTILITY_TYPES } from '../types';
import { getDaysUntilDue, getUrgencyColor } from '../utils/billWarnings';
import { Plus, X, Check, Calendar, Repeat, Pencil, Zap } from 'lucide-react';
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
}

export const BillsManager: React.FC<BillsManagerProps> = ({
  state,
  selectedMonth,
  onAddBill,
  onRemoveBill,
  onToggleBillPaid,
  onEditBill,
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
  const monthlyBills = state.bills.filter((b) => (b.reset_month ?? 0) === currentMonth);
  const billsPaid = monthlyBills.filter((b) => b.paid).reduce((sum, b) => sum + b.amount, 0);
  const billsRemaining = monthlyBills
    .filter((b) => !b.paid)
    .reduce((sum, b) => sum + b.amount, 0);
  const billsTotal = monthlyBills.reduce((sum, b) => sum + b.amount, 0);

  // კომუნალურის აგრეგაცია ყოველდღიური ხარჯებიდან ამ თვისთვის
  const utilityPayments = useMemo(() => {
    const payments: { type: string; icon: string; color: string; amount: number; date: string }[] = [];
    Object.entries(state.db).forEach(([dateKey, dayData]) => {
      const d = new Date(dateKey + 'T00:00:00');
      if (d.getMonth() !== currentMonth) return;
      (dayData.expenses || []).forEach((exp) => {
        if (exp.subcategory === 'კომუნალური' && exp.amount > 0) {
          const utilInfo = UTILITY_TYPES.find((u) => u.key === exp.utilityType);
          payments.push({
            type: exp.utilityType === 'სხვა' && exp.utilityCustomName
              ? exp.utilityCustomName
              : (utilInfo?.label || exp.utilityType || 'კომუნალური'),
            icon: utilInfo?.icon || '🏠',
            color: utilInfo?.color || '#64748b',
            amount: exp.amount,
            date: dateKey,
          });
        }
      });
    });
    return payments;
  }, [state.db, currentMonth]);

  const utilityTotal = utilityPayments.reduce((sum, p) => sum + p.amount, 0);
  // ჯგუფებად — ტიპის მიხედვით
  const utilityByType = useMemo(() => {
    const grouped: Record<string, { icon: string; color: string; total: number; payments: typeof utilityPayments }> = {};
    utilityPayments.forEach((p) => {
      if (!grouped[p.type]) {
        grouped[p.type] = { icon: p.icon, color: p.color, total: 0, payments: [] };
      }
      grouped[p.type].total += p.amount;
      grouped[p.type].payments.push(p);
    });
    return grouped;
  }, [utilityPayments]);

  const grandTotal = billsTotal + utilityTotal;

  return (
    <div className="space-y-2">
      <p className="font-semibold text-sm">თვიური ბილები</p>

      <Input type="text" placeholder="ბილის სახელი" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={handleKeyDown} className="h-8 text-xs" />
      <Input type="text" inputMode="numeric" placeholder="თანხა ₾" value={amount} onChange={(e) => setAmount(e.target.value)} onKeyDown={handleKeyDown} className="h-8 text-xs" />

      <div className="relative">
        <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="pl-8 h-8 text-xs" />
      </div>

      <label className="flex items-center gap-2 p-1.5 hover:bg-slate-800 rounded cursor-pointer">
        <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="w-3.5 h-3.5" />
        <Repeat className="h-3 w-3 text-slate-400" />
        <span className="text-xs text-slate-300">ყველა თვეში (რეკურინგი)</span>
      </label>

      <Button onClick={handleAdd} className="w-full h-7 text-[11px]" variant="default">
        <Plus className="h-3 w-3 mr-1" /> ბილის დამატება
      </Button>

      {/* სტატისტიკა */}
      <Card className="bg-blue-500/10 border-blue-700/50">
        <CardContent className="p-2 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="flex items-center gap-1 text-blue-300"><Check className="h-2.5 w-2.5" />გადახდილი:</span>
            <span className="font-bold text-blue-300">{billsPaid}₾</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-blue-400">დარჩენილი:</span>
            <span className="font-bold text-blue-400">{billsRemaining}₾</span>
          </div>
          {utilityTotal > 0 && (
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-1 text-teal-300"><Zap className="h-2.5 w-2.5" />კომუნალური:</span>
              <span className="font-bold text-teal-300">{utilityTotal}₾</span>
            </div>
          )}
          <div className="flex justify-between text-xs text-blue-200 pt-1.5 border-t border-blue-700">
            <span>სულ:</span>
            <span className="font-bold">{grandTotal}₾</span>
          </div>
          {grandTotal > 0 && <Progress value={(billsPaid / grandTotal) * 100} indicatorClassName="bg-blue-400" className="h-1 bg-blue-900/50" />}
        </CardContent>
      </Card>

      {/* კომუნალური — ავტომატური აგრეგაცია */}
      {utilityPayments.length > 0 && (
        <Card className="bg-teal-500/10 border-teal-700/50 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 bg-teal-900/30 border-b border-teal-700/30">
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-teal-400" />
              <span className="text-xs font-bold text-teal-300">კომუნალური</span>
            </div>
            <span className="text-sm font-black text-teal-300">{utilityTotal}₾</span>
          </div>
          <CardContent className="p-2 space-y-1">
            {Object.entries(utilityByType).map(([type, data]) => (
              <div key={type} className="flex items-center justify-between px-2 py-1 rounded-md" style={{ backgroundColor: `${data.color}10` }}>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{data.icon}</span>
                  <span className="text-xs font-bold" style={{ color: data.color }}>{type}</span>
                  {data.payments.length > 1 && (
                    <span className="text-[9px] text-slate-500">({data.payments.length}x)</span>
                  )}
                </div>
                <span className="text-xs font-black" style={{ color: data.color }}>{data.total}₾</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ბილების სია */}
      <div className="space-y-2">
        {monthlyBills.length === 0 && utilityPayments.length === 0 ? (
          <p className="text-center text-slate-500 py-4">ამ თვეში ბილი არ დამატებულა</p>
        ) : monthlyBills.length === 0 ? null : (
          monthlyBills.map((bill) => {
            const daysUntilDue = bill.dueDate ? getDaysUntilDue(bill.dueDate) : null;
            const bgColor = bill.dueDate ? getUrgencyColor(daysUntilDue ?? 999, bill.paid) : '#475569';

            if (bill.id === editingId) {
              return (
                <Card key={bill.id} style={{ borderLeftColor: bgColor, borderLeftWidth: '4px' }} className="bg-blue-500/10 border-blue-700/50">
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
                className="bg-blue-500/10 border-blue-700/50"
              >
                <CardContent className="p-2 flex justify-between items-center">
                  <label className="flex items-center cursor-pointer flex-1">
                    <input type="checkbox" checked={bill.paid} onChange={() => onToggleBillPaid(bill.id)} className="w-3.5 h-3.5 mr-2 cursor-pointer" />
                    <div className={cn(bill.paid && 'line-through opacity-50')}>
                      <p className="font-bold text-xs text-blue-300">{bill.name}</p>
                      <p className="text-[10px] text-blue-200">{bill.amount}₾</p>
                      {daysUntilDue !== null && !bill.paid && (
                        <p className="text-xs font-bold" style={{ color: bgColor }}>
                          {daysUntilDue < 0 ? `დაგვიანებულია ${Math.abs(daysUntilDue)} დღით!` : daysUntilDue === 0 ? 'დღეს უნდა გადაიხადო!' : `${daysUntilDue} დღე დარჩა`}
                        </p>
                      )}
                    </div>
                  </label>
                  <div className="flex items-center gap-0.5 ml-1">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(bill)} className="h-6 w-6 text-slate-400 hover:text-slate-200"><Pencil className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleRemove(bill.id, bill.name, bill.amount)} className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/10"><X className="h-3 w-3" /></Button>
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
