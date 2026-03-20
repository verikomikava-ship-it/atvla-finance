import React, { useState, useMemo } from 'react';
import { AppState, BankLoan, BankProductType, BANK_PRODUCT_TYPES } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Plus, X, Check, ChevronDown, ChevronUp, Pencil, Calendar, Landmark } from 'lucide-react';

const COMPACT_INPUT = 'h-8 text-xs';
const COMPACT_BTN = 'h-7 text-[11px]';

interface BankLoansManagerProps {
  state: AppState;
  onAddBankLoan: (data: {
    type: BankProductType;
    name?: string;
    principal: number;
    monthlyInterest: number;
    paymentDay: number;
    startDate: string;
    endDate: string;
  }) => void;
  onRemoveBankLoan: (id: number) => void;
  onEditBankLoan: (id: number, updates: Partial<BankLoan>) => void;
}

const monthsBetween = (start: string, end: string): number => {
  const [sy, sm] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  return (ey - sy) * 12 + (em - sm) + 1;
};

const formatYM = (ym: string): string => {
  const [y, m] = ym.split('-');
  const months = ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'];
  return `${months[parseInt(m) - 1]} ${y}`;
};

export const BankLoansManager: React.FC<BankLoansManagerProps> = ({
  state,
  onAddBankLoan,
  onRemoveBankLoan,
  onEditBankLoan,
}) => {
  const [selectedType, setSelectedType] = useState<BankProductType | null>(null);
  const [customName, setCustomName] = useState('');
  const [principal, setPrincipal] = useState('');
  const [monthlyInterest, setMonthlyInterest] = useState('');
  const [paymentDay, setPaymentDay] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrincipal, setEditPrincipal] = useState('');
  const [editInterest, setEditInterest] = useState('');
  const [showClosed, setShowClosed] = useState(false);

  const activeLoans = useMemo(
    () => (state.bankLoans || []).filter((l) => l.active),
    [state.bankLoans]
  );
  const closedLoans = useMemo(
    () => (state.bankLoans || []).filter((l) => !l.active),
    [state.bankLoans]
  );

  const totalPrincipal = activeLoans.reduce((s, l) => s + l.principal, 0);
  const totalMonthlyInterest = activeLoans.reduce((s, l) => s + l.monthlyInterest, 0);

  const handleAdd = () => {
    if (!selectedType) { alert('აირჩიე პროდუქტის ტიპი'); return; }
    const numPrincipal = parseInt(principal) || 0;
    const numInterest = parseInt(monthlyInterest) || 0;
    const numPayDay = parseInt(paymentDay) || 0;
    if (selectedType === 'სხვა' && !customName.trim()) { alert('შეიყვანე სესხის სახელი'); return; }
    if (numPrincipal <= 0) { alert('შეიყვანე სწორი ძირი თანხა'); return; }
    if (numInterest <= 0) { alert('შეიყვანე სწორი პროცენტის თანხა'); return; }
    if (numPayDay < 1 || numPayDay > 31) { alert('შეიყვანე გადახდის დღე (1-31)'); return; }
    if (!startDate || !endDate) { alert('შეიყვანე ვადის დასაწყისი და დასასრული'); return; }
    if (startDate > endDate) { alert('დასაწყისი უნდა იყოს დასასრულამდე'); return; }

    onAddBankLoan({
      type: selectedType,
      name: customName.trim() || undefined,
      principal: numPrincipal,
      monthlyInterest: numInterest,
      paymentDay: numPayDay,
      startDate,
      endDate,
    });

    setSelectedType(null);
    setCustomName('');
    setPrincipal('');
    setMonthlyInterest('');
    setPaymentDay('');
    setStartDate('');
    setEndDate('');
  };

  const handleRemove = (loan: BankLoan) => {
    const typeInfo = BANK_PRODUCT_TYPES.find((t) => t.key === loan.type);
    if (window.confirm(`წაშალო "${typeInfo?.label}: ${loan.name || ''}"?\nეს ასევე წაშლის დაკავშირებულ ვალს და ბილებს.`)) {
      onRemoveBankLoan(loan.id);
    }
  };

  const startEdit = (l: BankLoan) => {
    setEditingId(l.id);
    setEditName(l.name || '');
    setEditPrincipal(l.principal.toString());
    setEditInterest(l.monthlyInterest.toString());
  };

  const saveEdit = () => {
    if (editingId === null) return;
    onEditBankLoan(editingId, {
      name: editName.trim() || undefined,
      principal: Math.max(1, parseInt(editPrincipal) || 0),
      monthlyInterest: Math.max(1, parseInt(editInterest) || 0),
    });
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  const getDaysUntilPayment = (payDay: number): number => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    let target = new Date(now.getFullYear(), now.getMonth(), payDay);
    target.setHours(0, 0, 0, 0);
    if (target <= now) {
      target = new Date(now.getFullYear(), now.getMonth() + 1, payDay);
    }
    return Math.floor((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  // რამდენი თვე გავიდა startDate-დან
  const getMonthsPassed = (startYM: string): number => {
    const now = new Date();
    const [sy, sm] = startYM.split('-').map(Number);
    return (now.getFullYear() - sy) * 12 + (now.getMonth() + 1 - sm);
  };

  const renderMonthCubes = (totalMonths: number, paidMonths: number, color: string) => {
    if (totalMonths <= 36) {
      // კუბიკები 12-იანი რიგებით
      const rows: number[][] = [];
      for (let i = 0; i < totalMonths; i += 12) {
        rows.push(Array.from({ length: Math.min(12, totalMonths - i) }, (_, j) => i + j));
      }
      return (
        <div className="space-y-1 mt-1.5">
          {rows.map((row, ri) => (
            <div key={ri} className="flex gap-0.5">
              {row.map((idx) => (
                <div
                  key={idx}
                  className={cn(
                    'flex-1 h-2 rounded-sm transition-all',
                    idx < paidMonths ? '' : 'bg-slate-200 dark:bg-slate-700'
                  )}
                  style={idx < paidMonths ? { backgroundColor: color } : undefined}
                />
              ))}
            </div>
          ))}
        </div>
      );
    }
    // 36+ თვე — პროგრეს ბარი
    return (
      <div className="mt-1.5">
        <Progress value={(paidMonths / totalMonths) * 100} className="h-2 bg-slate-200 dark:bg-slate-700" indicatorClassName="" style={{ ['--indicator-color' as string]: color }} />
      </div>
    );
  };

  const renderLoanCard = (loan: BankLoan) => {
    const typeInfo = BANK_PRODUCT_TYPES.find((t) => t.key === loan.type);
    const debt = state.debts.find((d) => d.id === loan.debtId);
    const paidBills = state.bills.filter((b) => loan.billIds.includes(b.id) && b.paid).length;
    const daysUntil = getDaysUntilPayment(loan.paymentDay);
    const monthsPassed = Math.max(0, Math.min(getMonthsPassed(loan.startDate), loan.totalMonths));
    const debtProgress = debt ? ((debt.paidAmount || 0) / debt.amount) * 100 : 0;

    if (loan.id === editingId) {
      return (
        <Card key={loan.id} className="p-2 border-l-4" style={{ borderLeftColor: typeInfo?.color, backgroundColor: `${typeInfo?.color}08` }}>
          <div className="space-y-1.5">
            <Input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="h-7 text-xs" placeholder="სახელი" />
            <div className="flex gap-1.5">
              <Input type="text" inputMode="numeric" value={editPrincipal} onChange={(e) => setEditPrincipal(e.target.value)} className="h-7 text-xs flex-1" placeholder="ძირი ₾" />
              <Input type="text" inputMode="numeric" value={editInterest} onChange={(e) => setEditInterest(e.target.value)} className="h-7 text-xs flex-1" placeholder="%/თვე ₾"
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
      <Card key={loan.id} className={cn(
        'border-l-4 overflow-hidden',
        !loan.active && 'opacity-60'
      )} style={{ borderLeftColor: typeInfo?.color, backgroundColor: `${typeInfo?.color}08` }}>
        <CardContent className="p-2">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              {/* სათაური */}
              <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                <span className="text-sm">{typeInfo?.icon}</span>
                <p className="font-bold text-xs" style={{ color: typeInfo?.color }}>{typeInfo?.label}</p>
                {loan.name && (
                  <span className="text-[10px] text-slate-600 dark:text-slate-400">· {loan.name}</span>
                )}
              </div>

              {/* ძირი + პროცენტი */}
              <div className="flex gap-3 text-xs mt-0.5">
                <div>
                  <span className="text-slate-600 dark:text-slate-400">ძირი: </span>
                  <span className="font-bold text-red-600 dark:text-red-400">{loan.principal}₾</span>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-slate-400">%/თვე: </span>
                  <span className="font-bold text-orange-600 dark:text-orange-400">{loan.monthlyInterest}₾</span>
                </div>
              </div>

              {/* ვადა */}
              <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-1">
                📅 {formatYM(loan.startDate)} — {formatYM(loan.endDate)} ({loan.totalMonths} თვე)
              </div>

              {/* ძირის დაფარვის პროგრესი */}
              {debt && !debt.paid && (
                <div className="mt-1.5">
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span style={{ color: typeInfo?.color }}>ძირის დაფარვა:</span>
                    <span className="font-bold" style={{ color: typeInfo?.color }}>
                      {debt.paidAmount || 0}₾ / {debt.amount}₾
                    </span>
                  </div>
                  <Progress value={debtProgress} className="h-1.5 bg-slate-200 dark:bg-slate-700" indicatorClassName={''} />
                </div>
              )}
              {debt?.paid && (
                <p className="text-[10px] text-green-600 dark:text-green-400 mt-1 font-bold">✅ ძირი თანხა დაფარულია</p>
              )}

              {/* თვეების კუბიკები */}
              <div className="mt-1">
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-slate-600 dark:text-slate-400">თვეები:</span>
                  <span className="font-bold" style={{ color: typeInfo?.color }}>
                    {monthsPassed}/{loan.totalMonths} ({paidBills} გადახდილი)
                  </span>
                </div>
                {renderMonthCubes(loan.totalMonths, monthsPassed, typeInfo?.color || '#64748b')}
              </div>

              {/* შემდეგი გადახდა */}
              {loan.active && (
                <div className="flex items-center gap-1 mt-1.5">
                  <Calendar className="h-3 w-3" style={{
                    color: daysUntil <= 3 ? '#f87171' : daysUntil <= 7 ? '#fbbf24' : '#10b981'
                  }} />
                  <p className="text-[10px] font-bold" style={{
                    color: daysUntil <= 3 ? '#f87171' : daysUntil <= 7 ? '#fbbf24' : '#10b981'
                  }}>
                    შემდეგი გადახდა: {daysUntil} დღეში (თვის {loan.paymentDay} რიცხვი)
                  </p>
                </div>
              )}
            </div>

            {/* მოქმედებები */}
            <div className="flex items-center gap-0.5 ml-1">
              <Button variant="ghost" size="icon" onClick={() => startEdit(loan)} className="h-6 w-6 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
                <Pencil className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleRemove(loan)} className="h-6 w-6 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">
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
      <h3 className="font-semibold text-sm flex items-center gap-1.5">
        <Landmark className="h-4 w-4" /> ბანკი
      </h3>

      {/* ტიპის არჩევა */}
      <div className="grid grid-cols-2 gap-1.5">
        {BANK_PRODUCT_TYPES.map((type) => (
          <button
            key={type.key}
            onClick={() => setSelectedType(selectedType === type.key ? null : type.key)}
            className={cn(
              'flex items-center gap-1.5 p-2 rounded-xl border-2 transition-all text-left',
              selectedType === type.key
                ? 'scale-[1.02]'
                : 'border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-100'
            )}
            style={{
              borderColor: selectedType === type.key ? type.color : undefined,
              backgroundColor: selectedType === type.key ? `${type.color}15` : undefined,
            }}
          >
            <span className="text-base">{type.icon}</span>
            <span className="text-[10px] font-bold" style={{ color: selectedType === type.key ? type.color : undefined }}>
              {type.label}
            </span>
          </button>
        ))}
      </div>

      {/* ფორმა — ტიპი არჩეულია */}
      {selectedType && (
        <div className="space-y-1.5 animate-fadeIn">
          <Input type="text" placeholder={selectedType === 'სხვა' ? 'სესხის სახელი *' : 'დამატებითი სახელი (არასავალდ.)'} value={customName} onChange={(e) => setCustomName(e.target.value)} className={COMPACT_INPUT} autoFocus={selectedType === 'სხვა'} />

          <div className="flex gap-1.5">
            <Input type="text" inputMode="numeric" placeholder="ძირი თანხა ₾ *" value={principal} onChange={(e) => setPrincipal(e.target.value)} className={cn('flex-1', COMPACT_INPUT)} />
            <Input type="text" inputMode="numeric" placeholder="% თვეში ₾ *" value={monthlyInterest} onChange={(e) => setMonthlyInterest(e.target.value)} className={cn('flex-1', COMPACT_INPUT)} />
          </div>

          <Input type="text" inputMode="numeric" placeholder="გადახდის დღე (1-31) *" value={paymentDay} onChange={(e) => setPaymentDay(e.target.value)} className={COMPACT_INPUT} />

          <div className="flex gap-1.5">
            <div className="flex-1">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 mb-0.5 block">ვადის დასაწყისი *</label>
              <Input type="month" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={COMPACT_INPUT} />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-slate-600 dark:text-slate-400 mb-0.5 block">ვადის დასასრული *</label>
              <Input type="month" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={COMPACT_INPUT} />
            </div>
          </div>

          {startDate && endDate && startDate <= endDate && (
            <p className="text-[10px] text-slate-600 dark:text-slate-400 text-center">
              ვადა: <span className="font-bold text-slate-800 dark:text-slate-200">{monthsBetween(startDate, endDate)} თვე</span>
            </p>
          )}

          <Button variant="default" onClick={handleAdd} className={cn('w-full', COMPACT_BTN)}>
            <Plus className="h-3 w-3 mr-1" /> დამატება
          </Button>
        </div>
      )}

      {/* სტატისტიკა */}
      {activeLoans.length > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-700/50">
          <CardContent className="p-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-blue-700 dark:text-blue-300">აქტიური:</span>
              <span className="font-bold text-blue-700 dark:text-blue-300">{activeLoans.length}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-red-600 dark:text-red-400">სულ ძირი:</span>
              <span className="font-bold text-red-600 dark:text-red-400">{totalPrincipal}₾</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-orange-600 dark:text-orange-400">ყოველთვიური %:</span>
              <span className="font-bold text-orange-600 dark:text-orange-400">{totalMonthlyInterest}₾</span>
            </div>
            <div className="flex justify-between text-xs text-blue-700 dark:text-blue-300 pt-1.5 border-t border-blue-200 dark:border-blue-700/50">
              <span>ყოველთვიური სულ:</span>
              <span className="font-bold">{totalMonthlyInterest}₾</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* სია */}
      <div className="space-y-2">
        {activeLoans.length === 0 && closedLoans.length === 0 ? (
          <p className="text-center text-slate-500 dark:text-slate-400 py-4">საბანკო პროდუქტი არ დამატებულა</p>
        ) : activeLoans.length === 0 ? (
          <p className="text-center text-slate-500 dark:text-slate-400 py-4">ყველა დახურულია</p>
        ) : (
          activeLoans.map(renderLoanCard)
        )}
      </div>

      {/* დახურული */}
      {closedLoans.length > 0 && (
        <div>
          <Button
            variant="ghost"
            onClick={() => setShowClosed(!showClosed)}
            className="w-full flex justify-between items-center text-sm font-bold text-green-600 dark:text-green-400 border-t border-slate-200 dark:border-slate-700 rounded-none pt-3"
          >
            <span className="flex items-center gap-1">
              <Check className="h-4 w-4" />
              დახურული ({closedLoans.length})
            </span>
            {showClosed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          {showClosed && (
            <div className="space-y-2 mt-2">{closedLoans.map(renderLoanCard)}</div>
          )}
        </div>
      )}
    </div>
  );
};
