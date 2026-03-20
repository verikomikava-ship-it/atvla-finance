import React, { useState, useMemo } from 'react';
import { AppState, Loan } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Plus, X, Check, Clock, AlertTriangle, ChevronDown, ChevronUp, Pencil, HandCoins } from 'lucide-react';

interface LoansManagerProps {
  state: AppState;
  onAddLoan: (loan: Omit<Loan, 'id'>) => void;
  onRemoveLoan: (id: number) => void;
  onToggleLoanReturned: (id: number) => void;
  onEditLoan: (id: number, updates: Partial<Loan>) => void;
}

const getDaysUntil = (dateStr: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = dateStr.split('-').map(Number);
  const due = new Date(y, m - 1, d);
  due.setHours(0, 0, 0, 0);
  return Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const formatDate = (dateStr: string): string => {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

export const LoansManager: React.FC<LoansManagerProps> = ({
  state,
  onAddLoan,
  onRemoveLoan,
  onToggleLoanReturned,
  onEditLoan,
}) => {
  const [borrowerName, setBorrowerName] = useState('');
  const [amount, setAmount] = useState('');
  const [loanDate, setLoanDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [comment, setComment] = useState('');
  const [showReturned, setShowReturned] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editComment, setEditComment] = useState('');

  const startEdit = (loan: Loan) => {
    setEditingId(loan.id);
    setEditName(loan.borrowerName);
    setEditAmount(loan.amount.toString());
    setEditDueDate(loan.dueDate || '');
    setEditComment(loan.comment || '');
  };

  const saveEdit = () => {
    if (editingId === null) return;
    onEditLoan(editingId, {
      borrowerName: editName.trim() || 'უსახელო',
      amount: Math.max(1, parseInt(editAmount) || 0),
      dueDate: editDueDate || undefined,
      comment: editComment.trim() || undefined,
    });
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  const handleAdd = () => {
    const name = borrowerName.trim();
    const numAmount = parseInt(amount) || 0;
    if (!name) return;
    if (numAmount <= 0) return;

    onAddLoan({
      borrowerName: name,
      amount: numAmount,
      loanDate: loanDate || new Date().toISOString().split('T')[0],
      dueDate: dueDate || undefined,
      returned: false,
      comment: comment.trim() || undefined,
    });

    setBorrowerName('');
    setAmount('');
    setDueDate('');
    setComment('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  };

  const handleRemove = (id: number, name: string, amt: number) => {
    if (window.confirm(`წაშალო "${name}" - ${amt}₾?`)) {
      onRemoveLoan(id);
    }
  };

  const loans = state.loans || [];
  const activeLoans = useMemo(() =>
    loans.filter((l) => !l.returned).sort((a, b) => {
      if (a.dueDate && b.dueDate) return getDaysUntil(a.dueDate) - getDaysUntil(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    }),
    [loans]
  );
  const returnedLoans = useMemo(() => loans.filter((l) => l.returned), [loans]);

  const totalActive = activeLoans.reduce((sum, l) => sum + l.amount, 0);
  const totalReturned = returnedLoans.reduce((sum, l) => sum + l.amount, 0);

  const renderLoanCard = (loan: Loan) => {
    const daysUntil = loan.dueDate ? getDaysUntil(loan.dueDate) : null;

    if (loan.id === editingId) {
      return (
        <Card key={loan.id} className="p-2 border-l-4 border-l-cyan-500 bg-cyan-50 dark:bg-cyan-500/10">
          <div className="space-y-1.5">
            <Input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="h-7 text-xs" placeholder="ვის" />
            <div className="flex gap-1.5">
              <Input type="text" inputMode="numeric" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="h-7 text-xs flex-1" placeholder="₾" />
              <Input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} className="h-7 text-xs flex-1" />
            </div>
            <Input type="text" value={editComment} onChange={(e) => setEditComment(e.target.value)} className="h-7 text-xs" placeholder="კომენტარი" />
            <div className="flex gap-1.5 justify-end">
              <Button variant="default" size="icon" onClick={saveEdit} className="h-7 w-7"><Check className="h-3 w-3" /></Button>
              <Button variant="outline" size="icon" onClick={cancelEdit} className="h-7 w-7"><X className="h-3 w-3" /></Button>
            </div>
          </div>
        </Card>
      );
    }

    return (
      <Card
        key={loan.id}
        className={cn(
          'p-2 border-l-4',
          loan.returned
            ? 'border-l-green-500 bg-green-50 dark:bg-green-500/10 opacity-60'
            : daysUntil !== null && daysUntil < 0
            ? 'border-l-red-500 bg-red-50 dark:bg-red-500/10'
            : 'border-l-cyan-500 bg-cyan-50 dark:bg-cyan-500/10'
        )}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <HandCoins className="h-3 w-3 text-cyan-600 dark:text-cyan-400" />
              <p className={cn('font-bold text-xs', loan.returned ? 'text-green-700 dark:text-green-300 line-through' : 'text-cyan-700 dark:text-cyan-300')}>
                {loan.borrowerName}
              </p>
            </div>
            <p className="text-xs text-cyan-700 dark:text-cyan-300 font-bold">{loan.amount}₾</p>

            <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
              <span>გასესხდა: {formatDate(loan.loanDate)}</span>
              {loan.dueDate && <span>ვადა: {formatDate(loan.dueDate)}</span>}
            </div>

            {loan.comment && (
              <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 italic">"{loan.comment}"</p>
            )}

            {!loan.returned && daysUntil !== null && (
              <div className="flex items-center gap-1 mt-1">
                {daysUntil < 0 ? (
                  <AlertTriangle className="h-3 w-3 text-red-500 dark:text-red-400" />
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
                    ? `${Math.abs(daysUntil)} დღით დაგვიანებულია!`
                    : daysUntil === 0
                    ? 'დღეს უნდა დაბრუნდეს!'
                    : `${daysUntil} დღე დარჩა`}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-0.5 ml-1">
            <input
              type="checkbox"
              checked={loan.returned}
              onChange={() => onToggleLoanReturned(loan.id)}
              className="w-3.5 h-3.5 cursor-pointer"
              title={loan.returned ? 'დაბრუნებული' : 'დაბრუნებულად მონიშვნა'}
            />
            {!loan.returned && (
              <Button variant="ghost" size="icon" onClick={() => startEdit(loan)} className="h-6 w-6 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
                <Pencil className="h-3 w-3" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => handleRemove(loan.id, loan.borrowerName, loan.amount)} className="h-6 w-6 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm">გასესხებული თანხა</h3>

      <Input type="text" placeholder="ვის ასესხე?" value={borrowerName} onChange={(e) => setBorrowerName(e.target.value)} onKeyDown={handleKeyDown} className="h-8 text-xs" />
      <div className="flex gap-1.5">
        <input
          type="text"
          inputMode="numeric"
          placeholder="თანხა ₾"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          className="flex-1 h-8 rounded-2xl border border-border bg-background/50 px-3 py-1 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
        />
        <Input type="text" placeholder="კომენტარი" value={comment} onChange={(e) => setComment(e.target.value)} className="flex-1 h-8 text-xs" />
      </div>
      <div className="flex gap-1.5">
        <div className="flex-1">
          <label className="text-[10px] text-muted-foreground">გასესხების თარიღი</label>
          <Input type="date" value={loanDate} onChange={(e) => setLoanDate(e.target.value)} className="h-8 text-xs" />
        </div>
        <div className="flex-1">
          <label className="text-[10px] text-muted-foreground">დაბრუნების ვადა</label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-8 text-xs" />
        </div>
      </div>

      <Button variant="default" onClick={handleAdd} className="w-full h-7 text-[11px]">
        <Plus className="h-3 w-3 mr-1" /> გასესხების დამატება
      </Button>

      {/* სტატისტიკა */}
      <Card className="bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-700/50">
        <CardContent className="p-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="flex items-center gap-1 text-cyan-700 dark:text-cyan-300"><HandCoins className="h-2.5 w-2.5" />გასესხებული:</span>
            <span className="font-bold text-cyan-700 dark:text-cyan-300">{totalActive}₾</span>
          </div>
          {totalReturned > 0 && (
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400"><Check className="h-2.5 w-2.5" />დაბრუნებული:</span>
              <span className="font-bold text-green-600 dark:text-green-400">{totalReturned}₾</span>
            </div>
          )}
          <div className="flex justify-between text-xs text-cyan-700 dark:text-cyan-300 mt-1.5 pt-1.5 border-t border-cyan-200 dark:border-cyan-700/50">
            <span>სულ:</span>
            <span className="font-bold">{totalActive + totalReturned}₾</span>
          </div>
        </CardContent>
      </Card>

      {/* აქტიური სესხები */}
      <div className="space-y-1.5">
        {activeLoans.length === 0 && returnedLoans.length === 0 ? (
          <p className="text-center text-slate-500 dark:text-slate-400 py-4">არავის არაფერი გაქვს გასესხებული</p>
        ) : activeLoans.length === 0 ? (
          <p className="text-center text-slate-500 dark:text-slate-400 py-4">ყველა თანხა დაბრუნებულია!</p>
        ) : (
          activeLoans.map((loan) => renderLoanCard(loan))
        )}
      </div>

      {/* დაბრუნებული სესხები */}
      {returnedLoans.length > 0 && (
        <div>
          <Button
            variant="ghost"
            onClick={() => setShowReturned(!showReturned)}
            className="w-full flex justify-between items-center text-sm font-bold text-green-600 dark:text-green-400 border-t border-slate-200 dark:border-slate-700 rounded-none pt-3"
          >
            <span className="flex items-center gap-1">
              <Check className="h-4 w-4" />
              დაბრუნებული ({returnedLoans.length})
            </span>
            {showReturned ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          {showReturned && (
            <div className="space-y-1.5 mt-2">
              {returnedLoans.map((loan) => renderLoanCard(loan))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
