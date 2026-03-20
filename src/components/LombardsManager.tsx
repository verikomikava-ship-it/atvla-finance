import React, { useState, useMemo } from 'react';
import { AppState, Lombard } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Plus, X, Check, Package, FileText, ChevronDown, ChevronUp, Pencil, Calendar } from 'lucide-react';

const COMPACT_INPUT = 'h-8 text-xs';
const COMPACT_BTN = 'h-7 text-[11px]';

interface LombardsManagerProps {
  state: AppState;
  onAddLombard: (data: {
    itemName: string;
    principal: number;
    monthlyInterest: number;
    contractNumber?: string;
    paymentDay: number;
  }) => void;
  onRemoveLombard: (id: number) => void;
  onEditLombard: (id: number, updates: Partial<Lombard>) => void;
}

export const LombardsManager: React.FC<LombardsManagerProps> = ({
  state,
  onAddLombard,
  onRemoveLombard,
  onEditLombard,
}) => {
  const [itemName, setItemName] = useState('');
  const [principal, setPrincipal] = useState('');
  const [monthlyInterest, setMonthlyInterest] = useState('');
  const [contractNumber, setContractNumber] = useState('');
  const [paymentDay, setPaymentDay] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editPrincipal, setEditPrincipal] = useState('');
  const [editInterest, setEditInterest] = useState('');
  const [editContract, setEditContract] = useState('');
  const [editPayDay, setEditPayDay] = useState('');
  const [showClosed, setShowClosed] = useState(false);

  const activeLombards = useMemo(
    () => (state.lombards || []).filter((l) => l.active),
    [state.lombards]
  );
  const closedLombards = useMemo(
    () => (state.lombards || []).filter((l) => !l.active),
    [state.lombards]
  );

  const totalPrincipal = activeLombards.reduce((s, l) => s + l.principal, 0);
  const totalMonthlyInterest = activeLombards.reduce((s, l) => s + l.monthlyInterest, 0);

  // დაკავშირებული ვალის ინფორმაცია
  const getDebtInfo = (lombardId: number) => {
    const lombard = (state.lombards || []).find((l) => l.id === lombardId);
    if (!lombard) return null;
    const debt = state.debts.find((d) => d.id === lombard.debtId);
    return debt;
  };

  // ბილების გადახდის სტატუსი
  const getBillsStatus = (lombard: Lombard) => {
    const bills = state.bills.filter((b) => lombard.billIds.includes(b.id));
    const paid = bills.filter((b) => b.paid).length;
    return { total: bills.length, paid };
  };

  const handleAdd = () => {
    const trimmedName = itemName.trim();
    const numPrincipal = +principal;
    const numInterest = +monthlyInterest;
    const numPayDay = parseInt(paymentDay);

    if (!trimmedName) {
      alert('შეიყვანე ნივთის დასახელება');
      return;
    }
    if (!numPrincipal || numPrincipal <= 0) {
      alert('შეიყვანე სწორი ძირი თანხა');
      return;
    }
    if (!numInterest || numInterest <= 0) {
      alert('შეიყვანე სწორი ყოველთვიური პროცენტი');
      return;
    }
    if (!numPayDay || numPayDay < 1 || numPayDay > 31) {
      alert('შეიყვანე გადახდის დღე (1-31)');
      return;
    }

    onAddLombard({
      itemName: trimmedName,
      principal: numPrincipal,
      monthlyInterest: numInterest,
      contractNumber: contractNumber.trim() || undefined,
      paymentDay: numPayDay,
    });

    setItemName('');
    setPrincipal('');
    setMonthlyInterest('');
    setContractNumber('');
    setPaymentDay('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  };

  const handleRemove = (lombard: Lombard) => {
    if (window.confirm(`წაშალო ლობარდი "${lombard.itemName}"?\nეს ასევე წაშლის დაკავშირებულ ვალს და ბილებს.`)) {
      onRemoveLombard(lombard.id);
    }
  };

  const startEdit = (l: Lombard) => {
    setEditingId(l.id);
    setEditItemName(l.itemName);
    setEditPrincipal(l.principal.toString());
    setEditInterest(l.monthlyInterest.toString());
    setEditContract(l.contractNumber || '');
    setEditPayDay(l.paymentDay.toString());
  };

  const saveEdit = () => {
    if (editingId === null) return;
    onEditLombard(editingId, {
      itemName: editItemName.trim() || 'უსახელო',
      principal: Math.max(1, parseInt(editPrincipal) || 0),
      monthlyInterest: Math.max(1, parseInt(editInterest) || 0),
      contractNumber: editContract.trim() || undefined,
      paymentDay: Math.max(1, Math.min(31, parseInt(editPayDay) || 1)),
    });
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  // გადახდის შემდეგი დღე
  const getNextPaymentDate = (payDay: number): string => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), payDay);
    if (thisMonth > now) {
      return thisMonth.toLocaleDateString('ka-GE');
    }
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, payDay);
    return nextMonth.toLocaleDateString('ka-GE');
  };

  const getDaysUntilPayment = (payDay: number): number => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    let target = new Date(now.getFullYear(), now.getMonth(), payDay);
    target.setHours(0, 0, 0, 0);
    if (target <= now) {
      target = new Date(now.getFullYear(), now.getMonth() + 1, payDay);
      target.setHours(0, 0, 0, 0);
    }
    return Math.floor((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const renderLombardCard = (lombard: Lombard) => {
    const debt = getDebtInfo(lombard.id);
    const billsStatus = getBillsStatus(lombard);
    const daysUntil = getDaysUntilPayment(lombard.paymentDay);
    const debtProgress = debt ? ((debt.paidAmount || 0) / debt.amount) * 100 : 0;

    if (lombard.id === editingId) {
      return (
        <Card key={lombard.id} className="bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-700/50 p-2 rounded-2xl">
          <div className="space-y-1.5">
            <Input type="text" value={editItemName} onChange={(e) => setEditItemName(e.target.value)} className="h-7 text-xs" placeholder="ნივთის დასახელება" />
            <div className="flex gap-1.5">
              <Input type="text" inputMode="numeric" value={editPrincipal} onChange={(e) => setEditPrincipal(e.target.value)} className="h-7 text-xs flex-1" placeholder="ძირი თანხა ₾" />
              <Input type="text" inputMode="numeric" value={editInterest} onChange={(e) => setEditInterest(e.target.value)} className="h-7 text-xs flex-1" placeholder="% თვეში ₾" />
            </div>
            <div className="flex gap-1.5">
              <Input type="text" value={editContract} onChange={(e) => setEditContract(e.target.value)} className="h-7 text-xs flex-1" placeholder="ხელშეკრულება #" />
              <Input type="text" inputMode="numeric" value={editPayDay} onChange={(e) => setEditPayDay(e.target.value)} className="h-7 text-xs w-20" placeholder="დღე"
                onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
              />
              <Button variant="default" size="icon" onClick={saveEdit} className="h-7 w-7 shrink-0"><Check className="h-3 w-3" /></Button>
              <Button variant="outline" size="icon" onClick={cancelEdit} className="h-7 w-7 shrink-0"><X className="h-3 w-3" /></Button>
            </div>
          </div>
        </Card>
      );
    }

    return (
      <Card key={lombard.id} className={cn(
        'border-l-4 overflow-hidden',
        lombard.active ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-700/50 rounded-2xl' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-2xl opacity-60'
      )}>
        <CardContent className="p-2">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              {/* სათაური + კონტრაქტი */}
              <div className="flex items-center gap-1.5 mb-0.5">
                <Package className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <p className="font-bold text-xs text-amber-700 dark:text-amber-300">{lombard.itemName}</p>
                {lombard.contractNumber && (
                  <Badge variant="outline" className="text-[8px] px-1 py-0 border-amber-300 dark:border-amber-600/50 text-amber-600 dark:text-amber-400">
                    <FileText className="h-2 w-2 mr-0.5" />
                    {lombard.contractNumber}
                  </Badge>
                )}
              </div>

              {/* ძირი თანხა + პროცენტი */}
              <div className="flex gap-3 text-xs mt-1">
                <div>
                  <span className="text-slate-600 dark:text-slate-400">ძირი: </span>
                  <span className="font-bold text-red-600 dark:text-red-400">{lombard.principal}₾</span>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-slate-400">%/თვე: </span>
                  <span className="font-bold text-orange-600 dark:text-orange-400">{lombard.monthlyInterest}₾</span>
                </div>
              </div>

              {/* ვალის პროგრესი */}
              {debt && !debt.paid && (
                <div className="mt-1.5">
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className="text-amber-700 dark:text-amber-300">💸 ძირის დაფარვა:</span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold">
                      {debt.paidAmount || 0}₾ / {debt.amount}₾
                    </span>
                  </div>
                  <Progress value={debtProgress} className="h-1.5 bg-amber-100 dark:bg-amber-900/50" indicatorClassName="bg-amber-500" />
                </div>
              )}
              {debt?.paid && (
                <p className="text-[10px] text-green-600 dark:text-green-400 mt-1 font-bold">✅ ძირი თანხა სრულად დაფარულია</p>
              )}

              {/* ბილების სტატუსი */}
              <div className="flex items-center gap-2 mt-1 text-[10px]">
                <span className="text-slate-600 dark:text-slate-400">📅 პროცენტი: {billsStatus.paid}/{billsStatus.total} თვე გადახდილი</span>
              </div>

              {/* გადახდის თარიღი */}
              {lombard.active && (
                <div className="flex items-center gap-1 mt-1">
                  <Calendar className="h-3 w-3" style={{
                    color: daysUntil <= 3 ? '#f87171' : daysUntil <= 7 ? '#fbbf24' : '#10b981'
                  }} />
                  <p className="text-[10px] font-bold" style={{
                    color: daysUntil <= 3 ? '#f87171' : daysUntil <= 7 ? '#fbbf24' : '#10b981'
                  }}>
                    შემდეგი: {getNextPaymentDate(lombard.paymentDay)} ({daysUntil} დღე)
                  </p>
                </div>
              )}
            </div>

            {/* მოქმედებები */}
            <div className="flex items-center gap-0.5 ml-1">
              <Button variant="ghost" size="icon" onClick={() => startEdit(lombard)} className="h-6 w-6 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
                <Pencil className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleRemove(lombard)} className="h-6 w-6 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm">ლობარდი</h3>

      {/* ფორმა */}
      <Input type="text" placeholder="ნივთის დასახელება *" value={itemName} onChange={(e) => setItemName(e.target.value)} onKeyDown={handleKeyDown} className={COMPACT_INPUT} />

      <div className="flex gap-1.5">
        <Input type="text" inputMode="numeric" placeholder="ძირი თანხა ₾ *" value={principal} onChange={(e) => setPrincipal(e.target.value)} onKeyDown={handleKeyDown} className={cn('flex-1', COMPACT_INPUT)} />
        <Input type="text" inputMode="numeric" placeholder="% თვეში ₾ *" value={monthlyInterest} onChange={(e) => setMonthlyInterest(e.target.value)} onKeyDown={handleKeyDown} className={cn('flex-1', COMPACT_INPUT)} />
      </div>

      <div className="flex gap-1.5">
        <Input type="text" inputMode="numeric" placeholder="გადახდის დღე (1-31) *" value={paymentDay} onChange={(e) => setPaymentDay(e.target.value)} onKeyDown={handleKeyDown} className={cn('flex-1', COMPACT_INPUT)} />
        <Input type="text" placeholder="ხელშეკრულება # (არასავალდებულო)" value={contractNumber} onChange={(e) => setContractNumber(e.target.value)} onKeyDown={handleKeyDown} className={cn('flex-1', COMPACT_INPUT)} />
      </div>

      <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-700/50 rounded-2xl p-2 text-[10px] text-amber-700 dark:text-amber-300 space-y-0.5">
        <p>📌 ძირი თანხა ავტომატურად დაემატება <strong>ვალებში</strong></p>
        <p>📌 ყოველთვიური პროცენტი დაემატება <strong>ყოველთვიურ გადასახადებში</strong> (12 თვე)</p>
      </div>

      <Button variant="default" onClick={handleAdd} className={cn('w-full', COMPACT_BTN)}>
        <Plus className="h-3 w-3 mr-1" /> ლობარდის დამატება
      </Button>

      {/* სტატისტიკა */}
      {activeLombards.length > 0 && (
        <Card className="bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-700/50 rounded-2xl">
          <CardContent className="p-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-amber-700 dark:text-amber-300">აქტიური ლობარდები:</span>
              <span className="font-bold text-amber-700 dark:text-amber-300">{activeLombards.length}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-red-600 dark:text-red-400">სულ ძირი თანხა:</span>
              <span className="font-bold text-red-600 dark:text-red-400">{totalPrincipal}₾</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-orange-600 dark:text-orange-400">ყოველთვიური %:</span>
              <span className="font-bold text-orange-600 dark:text-orange-400">{totalMonthlyInterest}₾</span>
            </div>
            <div className="flex justify-between text-xs text-amber-800 dark:text-amber-200 pt-1.5 border-t border-amber-200 dark:border-amber-700/50">
              <span>წლიური % ჯამი:</span>
              <span className="font-bold">{totalMonthlyInterest * 12}₾</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* აქტიური ლობარდები */}
      <div className="space-y-2">
        {activeLombards.length === 0 && closedLombards.length === 0 ? (
          <p className="text-center text-slate-500 dark:text-slate-400 py-4">ლობარდი არ დამატებულა</p>
        ) : activeLombards.length === 0 ? (
          <p className="text-center text-slate-500 dark:text-slate-400 py-4">ყველა ლობარდი დახურულია</p>
        ) : (
          activeLombards.map(renderLombardCard)
        )}
      </div>

      {/* დახურული ლობარდები */}
      {closedLombards.length > 0 && (
        <div>
          <Button
            variant="ghost"
            onClick={() => setShowClosed(!showClosed)}
            className="w-full flex justify-between items-center text-sm font-bold text-green-600 dark:text-green-400 border-t border-slate-200 dark:border-slate-700 rounded-none pt-3"
          >
            <span className="flex items-center gap-1">
              <Check className="h-4 w-4" />
              დახურული ლობარდები ({closedLombards.length})
            </span>
            {showClosed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          {showClosed && (
            <div className="space-y-2 mt-2">
              {closedLombards.map(renderLombardCard)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
