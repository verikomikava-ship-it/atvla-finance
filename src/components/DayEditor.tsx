import React, { useState, useEffect, useRef } from 'react';
import { AppState, DayData, Expense, ExpenseCategory, ExpenseSubcategory, SUBCATEGORIES, SUBCATEGORY_LIST, UtilityType, UTILITY_TYPES, EXTRA_INCOME_SOURCES } from '../types';
import { calculateBalance, getExpensesTotal, getDailyTargetForDate, getAverageDailyExpenses, calculateDebtRepaymentPlan } from '../utils/calculations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { X, Save, Plus, Trash2, ArrowUp, ArrowDown, CheckSquare, BookOpen, CreditCard, Receipt, Check } from 'lucide-react';

const EMPTY_DAY: DayData = {
  incMain: 0,
  incExtra: 0,
  expenses: [],
  debt_exp: 0,
  kulaba: 0,
  comment: '',
};

// ძველი ფორმატის მონაცემების კონვერტაცია ახალ ფორმატში
const migrateDayData = (data: DayData): DayData => {
  const migrated = { ...data };

  // rune -> kulaba მიგრაცია
  if (data.rune && !data.kulaba) {
    migrated.kulaba = 27;
  }
  if (migrated.kulaba === undefined) {
    migrated.kulaba = 0;
  }

  if (data.expenses && data.expenses.length > 0) return migrated;

  const expenses: Expense[] = [];
  let idCounter = 1;

  if (data.gas && data.gas > 0) {
    expenses.push({ id: idCounter++, name: 'საწვავი', amount: data.gas, category: 'საჭირო' });
  }
  if (data.shop && data.shop > 0) {
    expenses.push({ id: idCounter++, name: 'მაღაზია', amount: data.shop, category: 'საჭირო' });
  }
  if (data.other && data.other > 0) {
    expenses.push({ id: idCounter++, name: 'სხვა', amount: data.other, category: 'სურვილი' });
  }

  return {
    ...migrated,
    expenses,
    gas: undefined,
    shop: undefined,
    other: undefined,
  };
};

interface DayEditorProps {
  date: string | null;
  state: AppState;
  onSave: (date: string, data: DayData, debtPayments?: { debtId: number; amount: number }[], billPayments?: { billId: number; paid: boolean }[]) => void;
  onClose: () => void;
}

export const DayEditor: React.FC<DayEditorProps> = ({ date, state, onSave, onClose }) => {
  const [formData, setFormData] = useState<DayData>(EMPTY_DAY);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (date) {
      const rawData = state.db[date] || EMPTY_DAY;
      setFormData(migrateDayData(rawData));
    }
  }, [date, state.db]);

  // აქტიური ვალები (ვალის გადახდის subcategory-სთვის)
  const activeDebts = state.debts.filter((d) => !d.paid);

  // გადაუხდელი ბილები ამ თვისთვის (ყოველთვიური გადასახადი subcategory-სთვის)
  const currentBillMonth = date ? new Date(date + 'T00:00:00').getMonth() : new Date().getMonth();
  const unpaidBills = state.bills.filter((b) => !b.paid && (b.reset_month ?? 0) === currentBillMonth);

  // Escape-ით დახურვა
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleChange = (field: keyof DayData, value: number | boolean | string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // ხარჯების მართვა
  const addExpense = (subcategory?: ExpenseSubcategory) => {
    const sub = subcategory || 'მაღაზია';
    const info = SUBCATEGORIES[sub];
    setFormData((prev) => ({
      ...prev,
      expenses: [
        ...prev.expenses,
        {
          id: Date.now(),
          name: info.label,
          amount: 0,
          category: info.defaultCategory,
          subcategory: sub,
        },
      ],
    }));
  };

  const updateExpense = (id: number, field: keyof Expense, value: string | number | ExpenseCategory) => {
    setFormData((prev) => ({
      ...prev,
      expenses: prev.expenses.map((e) =>
        e.id === id ? { ...e, [field]: value } : e
      ),
    }));
  };

  const updateExpenseSubcategory = (id: number, subcategory: ExpenseSubcategory) => {
    const info = SUBCATEGORIES[subcategory];
    setFormData((prev) => ({
      ...prev,
      expenses: prev.expenses.map((e) =>
        e.id === id
          ? {
              ...e,
              subcategory,
              name: info.label,
              category: info.defaultCategory,
              debtId: subcategory === 'ვალის გადახდა' ? e.debtId : undefined,
              billId: subcategory === 'ყოველთვიური გადასახადი' ? e.billId : undefined,
              utilityType: subcategory === 'კომუნალური' ? e.utilityType : undefined,
              utilityCustomName: subcategory === 'კომუნალური' ? e.utilityCustomName : undefined,
            }
          : e
      ),
    }));
  };

  const updateExpenseUtility = (expenseId: number, utilityType: UtilityType) => {
    const utilInfo = UTILITY_TYPES.find((u) => u.key === utilityType);
    setFormData((prev) => ({
      ...prev,
      expenses: prev.expenses.map((e) =>
        e.id === expenseId
          ? {
              ...e,
              utilityType,
              name: `კომუნალური: ${utilInfo?.label || utilityType}`,
              utilityCustomName: utilityType === 'სხვა' ? e.utilityCustomName : undefined,
            }
          : e
      ),
    }));
  };

  const updateExpenseDebt = (expenseId: number, debtId: number) => {
    const debt = activeDebts.find((d) => d.id === debtId);
    if (!debt) return;
    setFormData((prev) => ({
      ...prev,
      expenses: prev.expenses.map((e) =>
        e.id === expenseId
          ? { ...e, debtId, name: `ვალი: ${debt.name}` }
          : e
      ),
    }));
  };

  const updateExpenseBill = (expenseId: number, billId: number) => {
    const bill = unpaidBills.find((b) => b.id === billId);
    if (!bill) return;
    setFormData((prev) => ({
      ...prev,
      expenses: prev.expenses.map((e) =>
        e.id === expenseId
          ? { ...e, billId, name: `გადასახადი: ${bill.name}`, amount: bill.amount }
          : e
      ),
    }));
  };

  const removeExpense = (id: number) => {
    setFormData((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== id),
    }));
  };

  const handleSave = () => {
    if (date) {
      // ცარიელი ხარჯების გაფილტვრა
      const cleanedExpenses = formData.expenses.filter((e) => e.amount > 0);
      const cleanedData: DayData = {
        ...formData,
        expenses: cleanedExpenses,
        gas: undefined,
        shop: undefined,
        other: undefined,
      };

      // ვალის გადახდები — ახალი გადახდები რომლებიც ჯერ არ იყო შენახული
      const previousExpenses = (state.db[date]?.expenses || []);
      const debtPayments: { debtId: number; amount: number }[] = [];

      cleanedExpenses
        .filter((e) => e.subcategory === 'ვალის გადახდა' && e.debtId && e.amount > 0)
        .forEach((e) => {
          // ძველი გადახდის ოდენობა ამ expense-სთვის
          const prevExpense = previousExpenses.find((pe) => pe.id === e.id);
          const prevAmount = (prevExpense?.subcategory === 'ვალის გადახდა' && prevExpense?.debtId === e.debtId)
            ? prevExpense.amount
            : 0;
          const diff = e.amount - prevAmount;
          if (diff !== 0) {
            debtPayments.push({ debtId: e.debtId!, amount: diff });
          }
        });

      // ძველი ხარჯები რომლებიც წაიშალა ან შეიცვალა — დაბრუნება
      previousExpenses
        .filter((pe) => pe.subcategory === 'ვალის გადახდა' && pe.debtId && pe.amount > 0)
        .forEach((pe) => {
          const stillExists = cleanedExpenses.find((e) => e.id === pe.id && e.debtId === pe.debtId);
          if (!stillExists) {
            debtPayments.push({ debtId: pe.debtId!, amount: -pe.amount });
          }
        });

      // ბილის გადახდები
      const billPayments: { billId: number; paid: boolean }[] = [];

      // ახალი ბილის გადახდები
      cleanedExpenses
        .filter((e) => e.subcategory === 'ყოველთვიური გადასახადი' && e.billId && e.amount > 0)
        .forEach((e) => {
          const prevExpense = previousExpenses.find((pe) => pe.id === e.id);
          const wasBillPayment = prevExpense?.subcategory === 'ყოველთვიური გადასახადი' && prevExpense?.billId === e.billId;
          if (!wasBillPayment) {
            billPayments.push({ billId: e.billId!, paid: true });
          }
        });

      // წაშლილი ბილის გადახდები — unpaid-ზე დაბრუნება
      previousExpenses
        .filter((pe) => pe.subcategory === 'ყოველთვიური გადასახადი' && pe.billId && pe.amount > 0)
        .forEach((pe) => {
          const stillExists = cleanedExpenses.find((e) => e.id === pe.id && e.billId === pe.billId);
          if (!stillExists) {
            billPayments.push({ billId: pe.billId!, paid: false });
          }
        });

      onSave(
        date,
        cleanedData,
        debtPayments.length > 0 ? debtPayments : undefined,
        billPayments.length > 0 ? billPayments : undefined
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const dailyTarget = (date && state.profile) ? getDailyTargetForDate(date, state.profile) : (state.profile?.dailyTarget || 150);
  const dailyBudget = state.profile?.dailyBudget || dailyTarget;
  const balance = calculateBalance(formData);
  const income = (formData.incMain || 0) + (formData.incExtra || 0);
  const expensesOnly = getExpensesTotal(formData);
  const expenses = expensesOnly + (formData.kulaba || 0);

  // ბილების ჯამი ამ თვეში (გადაუხდელი)
  const currentMonth = date ? new Date(date + 'T00:00:00').getMonth() : new Date().getMonth();
  const unpaidBillsTotal = state.bills
    .filter((b) => !b.paid && (b.reset_month ?? 0) === currentMonth)
    .reduce((sum, b) => sum + b.amount, 0);

  // ვალების ინფო
  const totalDebtRemaining = activeDebts.reduce((sum, d) => {
    const parts = d.parts || 1;
    const paidParts = d.paidParts || 0;
    const partsRemaining = Math.round(d.amount * ((parts - paidParts) / parts));
    return sum + Math.max(0, Math.min(partsRemaining, d.amount - (d.paidAmount || 0)));
  }, 0);
  // საშუალო ხარჯი და ვალისთვის ხელმისაწვდომი
  const avgExpenses = getAverageDailyExpenses(state.db);
  const availableForDebt = Math.max(0, dailyBudget - avgExpenses);
  const suggestedDebtPayment = activeDebts.length > 0 ? Math.round(availableForDebt / activeDebts.length) : 0;

  // დღეს რა დარჩა ხარჯვისთვის
  const spentToday = expensesOnly;
  const remainingBudget = dailyBudget - spentToday;
  const balanceColor =
    balance >= dailyTarget ? 'text-emerald-600 dark:text-emerald-400' : balance < 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400';

  const goalProgress = Math.min((income / dailyTarget) * 100, 100);
  const goalColor = goalProgress >= 100 ? '#10b981' : goalProgress >= 50 ? '#f59e0b' : '#ef4444';

  // კატეგორიების ჯამები
  const categoryTotals = {
    საჭირო: formData.expenses.filter((e) => e.category === 'საჭირო').reduce((sum, e) => sum + (e.amount || 0), 0),
    აუცილებელი: formData.expenses.filter((e) => e.category === 'აუცილებელი').reduce((sum, e) => sum + (e.amount || 0), 0),
    სურვილი: formData.expenses.filter((e) => e.category === 'სურვილი').reduce((sum, e) => sum + (e.amount || 0), 0),
    გაუთვალისწინებელი: formData.expenses.filter((e) => e.category === 'გაუთვალისწინებელი').reduce((sum, e) => sum + (e.amount || 0), 0),
  };

  const CATEGORY_ORDER: ExpenseCategory[] = ['საჭირო', 'აუცილებელი', 'სურვილი', 'გაუთვალისწინებელი'];
  const CATEGORY_STYLE: Record<ExpenseCategory, { bg: string; border: string; text: string; icon: string }> = {
    'საჭირო': { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-700', text: 'text-emerald-700 dark:text-emerald-300', icon: '✓' },
    'აუცილებელი': { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-700', text: 'text-red-700 dark:text-red-300', icon: '!' },
    'სურვილი': { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-700', text: 'text-orange-700 dark:text-orange-300', icon: '✦' },
    'გაუთვალისწინებელი': { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-700', text: 'text-purple-700 dark:text-purple-300', icon: '?' },
  };

  const nextCategory = (current: ExpenseCategory): ExpenseCategory => {
    const idx = CATEGORY_ORDER.indexOf(current);
    return CATEGORY_ORDER[(idx + 1) % CATEGORY_ORDER.length];
  };

  if (!date) return null;

  // თარიღის ფორმატირება
  const dateObj = new Date(date + 'T00:00:00');
  const weekDays = ['კვირა', 'ორშაბათი', 'სამშაბათი', 'ოთხშაბათი', 'ხუთშაბათი', 'პარასკევი', 'შაბათი'];
  const displayDate = `${dateObj.getDate()} - ${weekDays[dateObj.getDay()]}`;

  // კულაბაში მაქსიმუმ რამდენი შეიძლება ჩაიდოს (ბალანსი კულაბის გარეშე)
  const availableForKulaba = income - getExpensesTotal(formData);

  return (
    <div
      className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="flex gap-3 max-w-[900px] w-full max-h-[90vh] animate-fadeIn" onKeyDown={handleKeyDown}>
      {/* მარცხენა პანელი — დღიური */}
      <Card className="hidden md:flex flex-col w-[400px] border-amber-200 dark:border-amber-700 shadow-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' }}>
        <div className="px-4 py-2.5 flex items-center gap-2 border-b border-amber-200 dark:border-amber-700" style={{ background: 'linear-gradient(90deg, #fef3c7, #fffbeb)' }}>
          <BookOpen className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <p className="text-sm font-bold text-amber-700 dark:text-amber-300">დღიური</p>
          <span className="text-xs text-amber-500 dark:text-amber-400 ml-auto">{displayDate}</span>
        </div>
        <div className="flex-1 relative overflow-y-auto">
          <div className="absolute left-8 top-0 bottom-0 w-px bg-amber-300/40" />
          <textarea
            placeholder="რა მოხდა დღეს... &#10;&#10;ჩაწერე აზრები, მოვლენები, გეგმები..."
            value={formData.comment}
            onChange={(e) => handleChange('comment', e.target.value)}
            className="w-full h-full min-h-[300px] p-4 pl-12 text-sm text-amber-900 placeholder-amber-400 resize-none focus:outline-none"
            style={{
              background: 'transparent',
              lineHeight: '2',
              backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, rgba(180,140,80,0.12) 31px, rgba(180,140,80,0.12) 32px)',
            }}
          />
        </div>
      </Card>

      {/* მარჯვენა პანელი — ფინანსური */}
      <Card
        ref={modalRef}
        className="w-full md:w-[480px] max-h-[90vh] overflow-y-auto border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl"
      >
        {/* ჰედერი */}
        <CardHeader className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex-row items-center justify-between space-y-0 px-3 py-2">
          <div>
            <CardTitle className="text-base font-black text-blue-700 dark:text-blue-300">{displayDate}</CardTitle>
            <p className="text-[10px] text-muted-foreground">{date}</p>
          </div>
          {/* პროგრეს ბარი ჰედერში */}
          <div className="flex-1 mx-3">
            <div className="flex justify-between text-[10px] mb-0.5">
              <span className="text-muted-foreground">{income}/{dailyTarget}₾</span>
              <span style={{ color: goalColor }} className="font-bold">{Math.round(goalProgress)}%</span>
            </div>
            <Progress
              value={goalProgress}
              className="h-1.5"
              indicatorClassName={cn(
                'transition-all duration-500',
                goalProgress >= 100 ? 'bg-emerald-500' : goalProgress >= 50 ? 'bg-amber-500' : 'bg-red-500'
              )}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground rounded-full h-7 w-7"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="px-3 py-2 space-y-2.5">
          {/* შემოსავალი */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">შემოსავალი</p>
              <label className="flex items-center gap-1.5 cursor-pointer hover:bg-accent rounded px-1.5 py-0.5 transition-colors">
                <CheckSquare className="h-3 w-3 text-blue-500" />
                <span className="text-[10px] font-medium">{dailyTarget}₾</span>
                <input
                  type="checkbox"
                  checked={formData.incMain === dailyTarget}
                  onChange={(e) => handleChange('incMain', e.target.checked ? dailyTarget : 0)}
                  className="w-3.5 h-3.5 cursor-pointer accent-amber-500"
                />
              </label>
            </div>
            <div className="space-y-1.5">
              <Input
                type="text" inputMode="numeric"
                placeholder="ძირითადი შემოსავალი"
                value={formData.incMain || ''}
                onChange={(e) => handleChange('incMain', +e.target.value)}
                className="h-8 text-sm"
              />
              <div className="space-y-1">
                <div className="flex gap-1.5">
                  <Input
                    type="text" inputMode="numeric"
                    placeholder="დამატებითი"
                    value={formData.incExtra || ''}
                    onChange={(e) => handleChange('incExtra', +e.target.value)}
                    className="h-8 text-sm flex-1"
                  />
                </div>
                {(formData.incExtra || 0) > 0 && (
                  <div className="space-y-1 animate-fadeIn">
                    <div className="flex flex-wrap gap-1">
                      {EXTRA_INCOME_SOURCES.map((src) => (
                        <button
                          key={src.key}
                          type="button"
                          onClick={() => handleChange('incExtraSource' as keyof DayData, src.key)}
                          className={cn(
                            'px-1.5 py-0.5 rounded-full text-[9px] font-bold border transition-all',
                            formData.incExtraSource === src.key
                              ? 'scale-105'
                              : 'opacity-50 hover:opacity-100'
                          )}
                          style={{
                            borderColor: src.color,
                            color: src.color,
                            backgroundColor: formData.incExtraSource === src.key ? `${src.color}20` : 'transparent',
                          }}
                        >
                          {src.icon} {src.label}
                        </button>
                      ))}
                    </div>
                    {formData.incExtraSource === 'სხვა' && (
                      <Input
                        type="text"
                        placeholder="საიდან მიიღე?"
                        value={formData.incExtraNote || ''}
                        onChange={(e) => handleChange('incExtraNote' as keyof DayData, e.target.value)}
                        className="h-6 text-[10px]"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ბიუჯეტის ინფო */}
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className={cn('rounded-xl px-1.5 py-1 border', remainingBudget >= 0 ? 'border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20' : 'border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20')}>
              <p className="text-[9px] text-muted-foreground">ხარჯვის ლიმიტი</p>
              <p className={cn('text-sm font-black', remainingBudget >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>{remainingBudget}₾</p>
            </div>
            {unpaidBillsTotal > 0 && (
              <div className="rounded-xl px-1.5 py-1 border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20">
                <p className="text-[9px] text-muted-foreground flex items-center justify-center gap-0.5"><Receipt className="h-2.5 w-2.5" />ბილები</p>
                <p className="text-sm font-black text-blue-600 dark:text-blue-400">{unpaidBillsTotal}₾</p>
              </div>
            )}
            {totalDebtRemaining > 0 && (
              <div className="rounded-xl px-1.5 py-1 border border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20">
                <p className="text-[9px] text-muted-foreground flex items-center justify-center gap-0.5"><CreditCard className="h-2.5 w-2.5" />ვალები</p>
                <p className="text-sm font-black text-purple-600 dark:text-purple-400">{totalDebtRemaining}₾</p>
              </div>
            )}
          </div>

          {/* ვალის დაფარვის რჩევა + პწიჩკა */}
          {activeDebts.length > 0 && suggestedDebtPayment > 0 && (() => {
            const repaymentPlans = calculateDebtRepaymentPlan(state.debts, dailyBudget, avgExpenses);
            const topPlan = repaymentPlans[0];
            return (
              <div className={cn(
                'px-2 py-1.5 rounded-md border text-[10px] transition-colors',
                formData.debtPaid
                  ? 'border-pink-300 dark:border-pink-700 bg-pink-50 dark:bg-pink-900/20'
                  : 'border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20'
              )}>
                <div className="flex justify-between items-center gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                    <div
                      className={cn(
                        'w-4 h-4 rounded border-2 flex items-center justify-center transition-all cursor-pointer',
                        formData.debtPaid
                          ? 'bg-pink-500 border-pink-500'
                          : 'border-purple-400 hover:border-pink-400'
                      )}
                      onClick={() => handleChange('debtPaid', !formData.debtPaid)}
                    >
                      {formData.debtPaid && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className={cn(
                      'font-bold',
                      formData.debtPaid ? 'text-pink-600 dark:text-pink-400' : 'text-purple-600 dark:text-purple-400'
                    )}>
                      {suggestedDebtPayment}₾/დღე
                    </span>
                  </label>
                  <div className="flex items-center gap-2 text-right">
                    {topPlan && (
                      <span className={cn(
                        'font-bold',
                        formData.debtPaid ? 'text-pink-600 dark:text-pink-400' : 'text-red-600 dark:text-red-400'
                      )}>
                        {topPlan.debt.name} · {topPlan.remainingAmount}₾ · {topPlan.daysToPayoff} დღე
                      </span>
                    )}
                  </div>
                </div>
                {formData.debtPaid && repaymentPlans.length > 1 && (
                  <div className="mt-1 pt-1 border-t border-pink-200 dark:border-pink-700 flex flex-wrap gap-x-3 gap-y-0.5">
                    {repaymentPlans.slice(1).map((plan) => (
                      <span key={plan.debt.id} className="text-pink-500">
                        {plan.debt.name}: {plan.daysToPayoff} დღე
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ხარჯები */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">ხარჯები</p>
              {formData.expenses.length > 0 && (
                <div className="flex flex-wrap gap-x-1 gap-y-0.5">
                  {categoryTotals.საჭირო > 0 && (
                    <Badge variant="success" className="text-[9px] px-1 py-0">საჭირო: {categoryTotals.საჭირო}₾</Badge>
                  )}
                  {categoryTotals.აუცილებელი > 0 && (
                    <Badge variant="danger" className="text-[9px] px-1 py-0">აუცილებელი: {categoryTotals.აუცილებელი}₾</Badge>
                  )}
                  {categoryTotals.სურვილი > 0 && (
                    <Badge variant="warning" className="text-[9px] px-1 py-0">სურვილი: {categoryTotals.სურვილი}₾</Badge>
                  )}
                  {categoryTotals.გაუთვალისწინებელი > 0 && (
                    <Badge className="text-[9px] px-1 py-0 bg-purple-500/15 text-purple-400 border-transparent">გაუთვ.: {categoryTotals.გაუთვალისწინებელი}₾</Badge>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              {formData.expenses.map((expense) => (
                <div key={expense.id} className="space-y-1">
                  <div className="flex gap-1.5 items-center">
                    <div className="relative flex-1">
                      <select
                        value={expense.subcategory || ''}
                        onChange={(e) => updateExpenseSubcategory(expense.id, e.target.value as ExpenseSubcategory)}
                        className={cn(
                          'w-full h-7 text-xs pl-6 pr-2 rounded-md border bg-background appearance-none cursor-pointer',
                          'border-border focus:outline-none focus:ring-1 focus:ring-ring',
                          'text-foreground'
                        )}
                      >
                        {!expense.subcategory && <option value="">აირჩიე კატეგორია</option>}
                        {SUBCATEGORY_LIST.map((sub) => (
                          <option key={sub} value={sub}>
                            {SUBCATEGORIES[sub].icon} {SUBCATEGORIES[sub].label}
                          </option>
                        ))}
                      </select>
                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none">
                        {expense.subcategory ? SUBCATEGORIES[expense.subcategory].icon : '📋'}
                      </span>
                    </div>
                    <Input
                      type="text" inputMode="numeric"
                      placeholder="₾"
                      value={expense.amount || ''}
                      onChange={(e) => updateExpense(expense.id, 'amount', +e.target.value)}
                      className="w-16 h-7 text-xs"
                    />
                    <button
                      onClick={() =>
                        updateExpense(expense.id, 'category', nextCategory(expense.category))
                      }
                      className={cn(
                        'px-1.5 py-1 rounded-full text-[9px] font-bold whitespace-nowrap border transition-colors cursor-pointer',
                        CATEGORY_STYLE[expense.category].bg,
                        CATEGORY_STYLE[expense.category].border,
                        CATEGORY_STYLE[expense.category].text
                      )}
                      title="დააჭირე კატეგორიის შესაცვლელად"
                    >
                      {CATEGORY_STYLE[expense.category].icon} {expense.category}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeExpense(expense.id)}
                      className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  {expense.subcategory === 'სხვა' && (
                    <Input
                      type="text"
                      placeholder="მიუთითე რაზე..."
                      value={expense.name === 'სხვა' ? '' : expense.name}
                      onChange={(e) => updateExpense(expense.id, 'name', e.target.value || 'სხვა')}
                      className="h-6 text-[10px] ml-6"
                    />
                  )}
                  {expense.subcategory === 'ვალის გადახდა' && activeDebts.length > 0 && (
                    <div className="ml-6 space-y-1">
                      <select
                        value={expense.debtId || ''}
                        onChange={(e) => updateExpenseDebt(expense.id, +e.target.value)}
                        className={cn(
                          'w-full h-6 text-[10px] pl-2 pr-1 rounded-md border bg-background appearance-none cursor-pointer',
                          'border-purple-200 dark:border-purple-700 focus:outline-none focus:ring-1 focus:ring-purple-500',
                          'text-purple-700 dark:text-purple-300'
                        )}
                      >
                        <option value="">აირჩიე ვალი...</option>
                        {activeDebts.map((debt) => {
                          const remaining = debt.amount - (debt.paidAmount || 0);
                          return (
                            <option key={debt.id} value={debt.id}>
                              💸 {debt.name} — {remaining}₾ დარჩენილი (სულ: {debt.amount}₾)
                            </option>
                          );
                        })}
                      </select>
                      {expense.debtId && (() => {
                        const linkedDebt = activeDebts.find((d) => d.id === expense.debtId);
                        if (!linkedDebt) return null;
                        const remaining = linkedDebt.amount - (linkedDebt.paidAmount || 0);
                        const afterPayment = remaining - (expense.amount || 0);
                        return (
                          <div className="flex items-center gap-2 text-[9px] px-1">
                            <span className="text-purple-600 dark:text-purple-400">
                              {linkedDebt.name}: {linkedDebt.amount}₾
                            </span>
                            {(linkedDebt.paidAmount || 0) > 0 && (
                              <span className="text-emerald-600 dark:text-emerald-400">
                                გადახდილი: {linkedDebt.paidAmount}₾
                              </span>
                            )}
                            {expense.amount > 0 && (
                              <span className={cn(
                                'font-bold',
                                afterPayment <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                              )}>
                                → {afterPayment <= 0 ? 'სრულად დაფარული!' : `დარჩება: ${afterPayment}₾`}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  {expense.subcategory === 'ვალის გადახდა' && activeDebts.length === 0 && (
                    <p className="ml-6 text-[9px] text-muted-foreground">აქტიური ვალები არ არის</p>
                  )}
                  {expense.subcategory === 'ყოველთვიური გადასახადი' && unpaidBills.length > 0 && (
                    <div className="ml-6 space-y-1">
                      <select
                        value={expense.billId || ''}
                        onChange={(e) => updateExpenseBill(expense.id, +e.target.value)}
                        className={cn(
                          'w-full h-6 text-[10px] pl-2 pr-1 rounded-md border bg-background appearance-none cursor-pointer',
                          'border-blue-200 dark:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500',
                          'text-blue-700 dark:text-blue-300'
                        )}
                      >
                        <option value="">აირჩიე გადასახადი...</option>
                        {unpaidBills.map((bill) => (
                          <option key={bill.id} value={bill.id}>
                            📅 {bill.name} — {bill.amount}₾
                            {bill.dueDate ? ` (ვადა: ${bill.dueDate})` : ''}
                          </option>
                        ))}
                      </select>
                      {expense.billId && (() => {
                        const linkedBill = unpaidBills.find((b) => b.id === expense.billId);
                        if (!linkedBill) return null;
                        return (
                          <div className="flex items-center gap-2 text-[9px] px-1">
                            <span className="text-blue-600 dark:text-blue-400">
                              {linkedBill.name}: {linkedBill.amount}₾
                            </span>
                            {linkedBill.dueDate && (
                              <span className="text-amber-600 dark:text-amber-400">
                                ვადა: {linkedBill.dueDate}
                              </span>
                            )}
                            {expense.amount > 0 && (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                → გადახდილი!
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  {expense.subcategory === 'ყოველთვიური გადასახადი' && unpaidBills.length === 0 && (
                    <p className="ml-6 text-[9px] text-muted-foreground">ამ თვეში გადაუხდელი ბილები არ არის</p>
                  )}
                  {expense.subcategory === 'კომუნალური' && (
                    <div className="ml-6 space-y-1">
                      <div className="flex flex-wrap gap-1">
                        {UTILITY_TYPES.map((util) => (
                          <button
                            key={util.key}
                            type="button"
                            onClick={() => updateExpenseUtility(expense.id, util.key)}
                            className={cn(
                              'px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all',
                              expense.utilityType === util.key
                                ? 'ring-1 ring-offset-1 ring-offset-white dark:ring-offset-slate-900'
                                : 'opacity-60 hover:opacity-100'
                            )}
                            style={{
                              borderColor: util.color,
                              color: util.color,
                              backgroundColor: expense.utilityType === util.key ? `${util.color}20` : 'transparent',
                              boxShadow: expense.utilityType === util.key ? `0 0 8px ${util.color}30` : 'none',
                            }}
                          >
                            {util.icon} {util.label}
                          </button>
                        ))}
                      </div>
                      {expense.utilityType === 'სხვა' && (
                        <Input
                          type="text"
                          placeholder="მიუთითე რა კომუნალურია..."
                          value={expense.utilityCustomName || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData((prev) => ({
                              ...prev,
                              expenses: prev.expenses.map((ex) =>
                                ex.id === expense.id
                                  ? { ...ex, utilityCustomName: val, name: `კომუნალური: ${val || 'სხვა'}` }
                                  : ex
                              ),
                            }));
                          }}
                          className="h-6 text-[10px]"
                        />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={() => addExpense()}
              className="w-full mt-1.5 h-7 text-xs border-dashed border-border text-muted-foreground hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
            >
              <Plus className="h-3 w-3 mr-1" />
              ხარჯის დამატება
            </Button>
          </div>

          {/* კულაბა */}
          <div className="px-2.5 py-2 bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-900/10 rounded-2xl border border-amber-200 dark:border-amber-700">
            <div className="flex gap-2 items-center">
              <span className="text-sm">🏺</span>
              <Input
                type="text" inputMode="numeric"
                placeholder="კულაბა ₾"
                value={formData.kulaba || ''}
                onChange={(e) => handleChange('kulaba', Math.max(0, +e.target.value))}
                className="flex-1 h-7 text-xs border-amber-200 dark:border-amber-700 focus-visible:ring-amber-500"
              />
              {availableForKulaba > 0 && (
                <>
                  <span className="text-[9px] text-amber-600 dark:text-amber-400">{availableForKulaba}₾</span>
                  <Button
                    variant="warning"
                    size="sm"
                    onClick={() => handleChange('kulaba', availableForKulaba)}
                    className="text-[10px] font-bold h-7 px-2"
                  >
                    ყველა
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* დღიური — მობილურზე */}
          <div className="md:hidden rounded-2xl overflow-hidden border border-amber-200 dark:border-amber-700" style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' }}>
            <div className="px-2.5 py-1 flex items-center gap-1.5 border-b border-amber-200 dark:border-amber-700" style={{ background: 'linear-gradient(90deg, #fef3c7, #fffbeb)' }}>
              <BookOpen className="h-3 w-3 text-amber-600 dark:text-amber-400" />
              <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">დღიური</p>
            </div>
            <div className="relative">
              <div className="absolute left-6 top-0 bottom-0 w-px bg-amber-300/40" />
              <textarea
                placeholder="რა მოხდა დღეს..."
                value={formData.comment}
                onChange={(e) => handleChange('comment', e.target.value)}
                rows={3}
                className="w-full p-2 pl-8 text-xs text-amber-900 placeholder-amber-400 resize-none focus:outline-none"
                style={{
                  background: 'transparent',
                  lineHeight: '1.7',
                  backgroundImage: 'repeating-linear-gradient(transparent, transparent 20px, rgba(180,140,80,0.15) 20px, rgba(180,140,80,0.15) 21px)',
                }}
              />
            </div>
          </div>

          {/* ბალანსი + ღილაკები ერთ რიგში */}
          <div className="flex gap-2 items-stretch">
            <Card className="border-blue-200 dark:border-blue-700 bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10 flex-1">
              <CardContent className="p-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[9px] text-blue-500">ბალანსი</p>
                    <p className={cn('text-lg font-black', balanceColor)}>
                      {balance >= 0 ? '+' : ''}{balance}₾
                    </p>
                  </div>
                  <div className="text-right text-[10px] space-y-0.5">
                    <p className="text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-0.5">
                      <ArrowUp className="h-2.5 w-2.5" /> {income}₾
                    </p>
                    <p className="text-red-500 flex items-center justify-end gap-0.5">
                      <ArrowDown className="h-2.5 w-2.5" /> {expenses}₾
                    </p>
                    {(formData.kulaba || 0) > 0 && (
                      <p className="text-amber-600 dark:text-amber-400">🏺 {formData.kulaba}₾</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="flex flex-col gap-1.5 w-24">
              <Button
                variant="default"
                onClick={handleSave}
                className="flex-1 font-black text-xs"
              >
                <Save className="h-3.5 w-3.5 mr-1" />
                შენახვა
              </Button>
              <Button
                variant="secondary"
                onClick={onClose}
                className="flex-1 text-xs"
              >
                გაუქმება
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};
