import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { AppState, DayData, Debt, DebtPriority, UserProfile, Bill, Subscription, Loan, Lombard, BankLoan, BankProductType } from '@/types';
import { useAppState } from '@/hooks/useAppState';
import { useAuth } from '@/hooks/useAuth';
import { useFirestoreSync } from '@/hooks/useFirestoreSync';
import { calculateStats } from '@/utils/calculations';
import { MONTH_NAMES } from '@/utils/constants';
import { Header } from '@/components/Header';
import { Calendar } from '@/components/Calendar';
import { DayEditor } from '@/components/DayEditor';
import { DebtsManager } from '@/components/DebtsManager';
import { BillsManager } from '@/components/BillsManager';
import { SubscriptionsManager } from '@/components/SubscriptionsManager';
import { LoansManager } from '@/components/LoansManager';
import { BankLoansManager } from '@/components/BankLoansManager';
import { StatsView } from '@/components/StatsView';
import { UtilitiesManager } from '@/components/UtilitiesManager';
import { ToolsMenu } from '@/components/ToolsMenu';
import { DiaryView } from '@/components/DiaryView';
import { EventsView } from '@/components/EventsView';
import { SetupWizard } from '@/components/SetupWizard';
import { AuthModal } from '@/components/AuthModal';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { Menu, X, Cloud, CloudOff, Moon, Sun } from 'lucide-react';
import './App.css';

export const App: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const { state, updateState } = useAppState();
  const {
    user,
    loading: authLoading,
    signInWithGoogle,
    signInWithFacebook,
    sendPhoneCode,
    confirmPhoneCode,
    signInWithEmail,
    signUpWithEmail,
    logout,
  } = useAuth();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth().toString());
  const [activeTab, setActiveTab] = useState<'debts' | 'payments' | 'loans' | 'stats'>('payments');
  const [paymentSubTab, setPaymentSubTab] = useState<'bills' | 'utilities' | 'subscriptions'>('bills');
  const [debtSubTab, setDebtSubTab] = useState<'personal' | 'bank'>('personal');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  // Firestore სინქრონიზაცია
  const isRemoteUpdate = useRef(false);
  const { syncToFirestore } = useFirestoreSync(user, state, (remoteState) => {
    isRemoteUpdate.current = true;
    updateState(remoteState);
    setTimeout(() => { isRemoteUpdate.current = false; }, 300);
  });

  // state ცვლილებისას Firestore-ში გაგზავნა (მხოლოდ ლოკალური ცვლილებები)
  const prevState = useRef(state);
  useEffect(() => {
    if (state !== prevState.current && !isRemoteUpdate.current) {
      syncToFirestore(state);
    }
    prevState.current = state;
  }, [state, syncToFirestore]);

  const stats = useMemo(() => calculateStats(state), [state]);

  const handleSetupComplete = useCallback(
    (profile: UserProfile, bills: Bill[], setupDebts?: Debt[], setupLombards?: Lombard[], setupBankLoans?: BankLoan[]) => {
      const newState: AppState = {
        ...state,
        profile,
        bills: [...state.bills, ...bills],
        debts: [...state.debts, ...(setupDebts || [])],
        lombards: [...(state.lombards || []), ...(setupLombards || [])],
        bankLoans: [...(state.bankLoans || []), ...(setupBankLoans || [])],
      };
      updateState(newState);
    },
    [state, updateState]
  );

  const handleSaveDay = useCallback(
    (date: string, data: DayData, debtPayments?: { debtId: number; amount: number }[], billPayments?: { billId: number; paid: boolean }[]) => {
      let updatedDebts = state.debts;
      let updatedBills = state.bills;

      // ვალის გადახდების დამუშავება
      if (debtPayments && debtPayments.length > 0) {
        updatedDebts = state.debts.map((debt) => {
          const payments = debtPayments.filter((p) => p.debtId === debt.id);
          if (payments.length === 0) return debt;

          const totalPayment = payments.reduce((sum, p) => sum + p.amount, 0);
          const newPaidAmount = Math.max(0, (debt.paidAmount || 0) + totalPayment);
          const fullyPaid = newPaidAmount >= debt.amount;

          return {
            ...debt,
            paidAmount: Math.min(newPaidAmount, debt.amount),
            paid: fullyPaid,
          };
        });
      }

      // ბილის გადახდების დამუშავება
      if (billPayments && billPayments.length > 0) {
        updatedBills = state.bills.map((bill) => {
          const payment = billPayments.find((p) => p.billId === bill.id);
          if (!payment) return bill;
          return { ...bill, paid: payment.paid };
        });
      }

      const newState: AppState = {
        ...state,
        db: {
          ...state.db,
          [date]: data,
        },
        debts: updatedDebts,
        bills: updatedBills,
      };
      updateState(newState);
      setSelectedDay(null);
    },
    [state, updateState]
  );

  const handleCloseEditor = useCallback(() => {
    setSelectedDay(null);
  }, []);

  const handleGoalChange = useCallback(
    (goal: number, goalName: string) => {
      const newState: AppState = {
        ...state,
        goal,
        goalName,
      };
      updateState(newState);
    },
    [state, updateState]
  );

  const handleAddDebt = useCallback(
    (name: string, amount: number, priority: DebtPriority, dueDate?: string, parts?: number) => {
      const newState: AppState = {
        ...state,
        debts: [
          ...state.debts,
          {
            id: Date.now(),
            name,
            amount,
            paid: false,
            priority,
            dueDate,
            parts: parts || 1,
            paidParts: 0,
          },
        ],
      };
      updateState(newState);
    },
    [state, updateState]
  );

  const handleRemoveDebt = useCallback(
    (id: number) => {
      // ბანკის სესხთან დაკავშირებული ბილები + სესხიც წავშალოთ
      const linkedLoan = (state.bankLoans || []).find((l) => l.debtId === id);
      const billIdsToRemove = linkedLoan ? new Set(linkedLoan.billIds) : new Set<number>();
      const newState: AppState = {
        ...state,
        debts: state.debts.filter((d) => d.id !== id),
        bills: billIdsToRemove.size > 0 ? state.bills.filter((b) => !billIdsToRemove.has(b.id)) : state.bills,
        bankLoans: linkedLoan ? (state.bankLoans || []).filter((l) => l.id !== linkedLoan.id) : (state.bankLoans || []),
      };
      updateState(newState);
    },
    [state, updateState]
  );

  const handleToggleDebtPaid = useCallback(
    (id: number) => {
      const newState: AppState = {
        ...state,
        debts: state.debts.map((d) => (d.id === id ? { ...d, paid: !d.paid } : d)),
      };
      updateState(newState);
    },
    [state, updateState]
  );

  const handlePayDebtPart = useCallback(
    (id: number) => {
      const newState: AppState = {
        ...state,
        debts: state.debts.map((d) => {
          if (d.id !== id) return d;
          const totalParts = d.parts || 1;
          const newPaidParts = Math.min((d.paidParts || 0) + 1, totalParts);
          return {
            ...d,
            paidParts: newPaidParts,
            paid: newPaidParts >= totalParts,
          };
        }),
      };
      updateState(newState);
    },
    [state, updateState]
  );

  const handleAddBill = useCallback(
    (name: string, amount: number, isRecurring: boolean = false, dueDate?: string) => {
      const now = Date.now();
      const billsToAdd = [];

      if (isRecurring) {
        const dueDateDay = dueDate ? parseInt(dueDate.split('-')[2]) : undefined;
        const currentYear = new Date().getFullYear();

        for (let month = 0; month < 12; month++) {
          let monthDueDate: string | undefined = dueDate;
          if (dueDate && dueDateDay) {
            const lastDayOfMonth = new Date(currentYear, month + 1, 0).getDate();
            const actualDay = Math.min(dueDateDay, lastDayOfMonth);
            const monthStr = String(month + 1).padStart(2, '0');
            const dayStr = String(actualDay).padStart(2, '0');
            monthDueDate = `${currentYear}-${monthStr}-${dayStr}`;
          }

          billsToAdd.push({
            id: now + month,
            name,
            amount,
            date: '',
            paid: false,
            reset_month: month,
            dueDate: monthDueDate,
          });
        }
      } else {
        billsToAdd.push({
          id: now,
          name,
          amount,
          date: '',
          paid: false,
          reset_month: parseInt(selectedMonth || '0'),
          dueDate: dueDate,
        });
      }

      const newState: AppState = {
        ...state,
        bills: [...state.bills, ...billsToAdd],
      };
      updateState(newState);
    },
    [state, selectedMonth, updateState]
  );

  const handleRemoveBill = useCallback(
    (id: number) => {
      const newState: AppState = {
        ...state,
        bills: state.bills.filter((b) => b.id !== id),
      };
      updateState(newState);
    },
    [state, updateState]
  );

  const handleToggleBillPaid = useCallback(
    (id: number) => {
      const newState: AppState = {
        ...state,
        bills: state.bills.map((b) => (b.id === id ? { ...b, paid: !b.paid } : b)),
      };
      updateState(newState);
    },
    [state, updateState]
  );

  const handleAddSubscription = useCallback(
    (name: string, amount: number, dueDate?: string) => {
      const now = Date.now();
      const subsToAdd = [];
      const dueDateDay = dueDate ? parseInt(dueDate.split('-')[2]) : undefined;
      const currentYear = new Date().getFullYear();

      for (let month = 0; month < 12; month++) {
        let monthDueDate: string | undefined = dueDate;
        if (dueDate && dueDateDay) {
          const lastDayOfMonth = new Date(currentYear, month + 1, 0).getDate();
          const actualDay = Math.min(dueDateDay, lastDayOfMonth);
          const monthStr = String(month + 1).padStart(2, '0');
          const dayStr = String(actualDay).padStart(2, '0');
          monthDueDate = `${currentYear}-${monthStr}-${dayStr}`;
        }

        subsToAdd.push({
          id: now + month,
          name,
          amount,
          paid: false,
          reset_month: month,
          dueDate: monthDueDate,
        });
      }

      const newState: AppState = {
        ...state,
        subscriptions: [...(state.subscriptions || []), ...subsToAdd],
      };
      updateState(newState);
    },
    [state, updateState]
  );

  const handleRemoveSubscription = useCallback(
    (id: number) => {
      const newState: AppState = {
        ...state,
        subscriptions: (state.subscriptions || []).filter((s) => s.id !== id),
      };
      updateState(newState);
    },
    [state, updateState]
  );

  const handleToggleSubscriptionPaid = useCallback(
    (id: number) => {
      const newState: AppState = {
        ...state,
        subscriptions: (state.subscriptions || []).map((s) =>
          s.id === id ? { ...s, paid: !s.paid } : s
        ),
      };
      updateState(newState);
    },
    [state, updateState]
  );

  const handleImportData = useCallback(
    (newState: AppState) => {
      updateState(newState);
    },
    [updateState]
  );

  // პროფილის რედაქტირება
  const handleProfileChange = useCallback(
    (profile: UserProfile) => {
      updateState({ ...state, profile });
    },
    [state, updateState]
  );

  // ვალის რედაქტირება
  const handleEditDebt = useCallback(
    (id: number, updates: Partial<Debt>) => {
      updateState({
        ...state,
        debts: state.debts.map((d) => (d.id === id ? { ...d, ...updates } : d)),
      });
    },
    [state, updateState]
  );

  // ბილის რედაქტირება
  const handleEditBill = useCallback(
    (id: number, updates: Partial<Bill>) => {
      updateState({
        ...state,
        bills: state.bills.map((b) => (b.id === id ? { ...b, ...updates } : b)),
      });
    },
    [state, updateState]
  );

  // გამოწერის რედაქტირება
  const handleEditSubscription = useCallback(
    (id: number, updates: Partial<Subscription>) => {
      updateState({
        ...state,
        subscriptions: (state.subscriptions || []).map((s) =>
          s.id === id ? { ...s, ...updates } : s
        ),
      });
    },
    [state, updateState]
  );

  // სესხები (გასესხებული)
  const handleAddLoan = useCallback(
    (loan: Omit<Loan, 'id'>) => {
      updateState({
        ...state,
        loans: [...(state.loans || []), { ...loan, id: Date.now() }],
      });
    },
    [state, updateState]
  );

  const handleRemoveLoan = useCallback(
    (id: number) => {
      updateState({
        ...state,
        loans: (state.loans || []).filter((l) => l.id !== id),
      });
    },
    [state, updateState]
  );

  const handleToggleLoanReturned = useCallback(
    (id: number) => {
      updateState({
        ...state,
        loans: (state.loans || []).map((l) =>
          l.id === id ? { ...l, returned: !l.returned } : l
        ),
      });
    },
    [state, updateState]
  );

  const handleEditLoan = useCallback(
    (id: number, updates: Partial<Loan>) => {
      updateState({
        ...state,
        loans: (state.loans || []).map((l) =>
          l.id === id ? { ...l, ...updates } : l
        ),
      });
    },
    [state, updateState]
  );

  // ბანკი
  const handleAddBankLoan = useCallback(
    (data: { type: BankProductType; name?: string; principal: number; monthlyInterest: number; paymentDay: number; totalMonths: number; paidMonths: number; thisMonthPaid: boolean }) => {
      const now = Date.now();
      const today = new Date().toISOString().split('T')[0];
      const totalMonths = data.totalMonths;

      // startDate/endDate ავტომატურად გამოითვლება paidMonths-დან
      const startMonth = new Date();
      startMonth.setMonth(startMonth.getMonth() - data.paidMonths);
      const endMonth = new Date(startMonth);
      endMonth.setMonth(endMonth.getMonth() + totalMonths - 1);
      const startDate = `${startMonth.getFullYear()}-${String(startMonth.getMonth() + 1).padStart(2, '0')}`;
      const endDate = `${endMonth.getFullYear()}-${String(endMonth.getMonth() + 1).padStart(2, '0')}`;

      const typeLabel = data.type;
      const label = data.name ? `${typeLabel}: ${data.name}` : typeLabel;

      // ვალი (ძირი თანხა) — parts = totalMonths
      const debtId = now;
      const newDebt: Debt = {
        id: debtId,
        name: `🏦 ${label}`,
        amount: data.principal,
        paid: false,
        priority: 'high',
        paidAmount: 0,
        parts: totalMonths,
        paidParts: 0,
      };

      // ბილები (ყოველთვიური პროცენტი) — 12 თვეზე recurring
      const billIds: number[] = [];
      const newBills: Bill[] = [];
      const currentMonth = new Date().getMonth();

      // რომელი თვეები უკვე გადახდილია? startMonth-დან paidMonths რაოდენობა
      const startMonthIdx = startMonth.getMonth(); // startDate-ის თვე (0-11)
      const paidMonthIndices = new Set<number>();
      for (let i = 0; i < data.paidMonths; i++) {
        paidMonthIndices.add((startMonthIdx + i) % 12);
      }

      for (let month = 0; month < 12; month++) {
        const billId = now + 1 + month;
        billIds.push(billId);
        const year = new Date().getFullYear();
        const lastDay = new Date(year, month + 1, 0).getDate();
        const actualDay = Math.min(data.paymentDay, lastDay);
        const monthStr = String(month + 1).padStart(2, '0');
        const dayStr = String(actualDay).padStart(2, '0');

        // წარსულის თვეები ავტომატურად გადახდილი + ამ თვე თუ მონიშნეს
        const isPastPaid = paidMonthIndices.has(month) || (data.thisMonthPaid && month === currentMonth);

        newBills.push({
          id: billId,
          name: `🏦 ${label} %`,
          amount: data.monthlyInterest,
          date: '',
          paid: isPastPaid,
          reset_month: month,
          dueDate: `${year}-${monthStr}-${dayStr}`,
        });
      }

      const bankLoan: BankLoan = {
        id: now + 100,
        type: data.type,
        name: data.name,
        principal: data.principal,
        monthlyInterest: data.monthlyInterest,
        paymentDay: data.paymentDay,
        startDate,
        endDate,
        totalMonths,
        debtId,
        billIds,
        active: true,
        createdAt: today,
      };

      updateState({
        ...state,
        debts: [...state.debts, newDebt],
        bills: [...state.bills, ...newBills],
        bankLoans: [...(state.bankLoans || []), bankLoan],
      });
    },
    [state, updateState]
  );

  const handleRemoveBankLoan = useCallback(
    (id: number) => {
      const loan = (state.bankLoans || []).find((l) => l.id === id);
      if (!loan) return;
      updateState({
        ...state,
        debts: state.debts.filter((d) => d.id !== loan.debtId),
        bills: state.bills.filter((b) => !loan.billIds.includes(b.id)),
        bankLoans: (state.bankLoans || []).filter((l) => l.id !== id),
      });
    },
    [state, updateState]
  );

  const handleEditBankLoan = useCallback(
    (id: number, updates: Partial<BankLoan>) => {
      const loan = (state.bankLoans || []).find((l) => l.id === id);
      if (!loan) return;

      let updatedDebts = state.debts;
      let updatedBills = state.bills;
      const newName = updates.name !== undefined ? updates.name : loan.name;
      const label = newName ? `${loan.type}: ${newName}` : loan.type;

      if (updates.principal !== undefined || updates.name !== undefined) {
        updatedDebts = state.debts.map((d) =>
          d.id === loan.debtId ? { ...d, amount: updates.principal ?? loan.principal, name: `🏦 ${label}` } : d
        );
      }
      if (updates.monthlyInterest !== undefined || updates.name !== undefined) {
        updatedBills = state.bills.map((b) => {
          if (!loan.billIds.includes(b.id)) return b;
          return { ...b, amount: updates.monthlyInterest ?? loan.monthlyInterest, name: `🏦 ${label} %` };
        });
      }

      updateState({
        ...state,
        debts: updatedDebts,
        bills: updatedBills,
        bankLoans: (state.bankLoans || []).map((l) => l.id === id ? { ...l, ...updates } : l),
      });
    },
    [state, updateState]
  );

  // ინსტალაციაზე დაბრუნება — მონაცემები არ იკარგება
  const handleRerunSetup = useCallback(() => {
    updateState({
      ...state,
      profile: { ...state.profile, setupCompleted: false },
    });
  }, [state, updateState]);

  const handleResetData = useCallback(() => {
    const emptyState: AppState = {
      db: {},
      debts: [],
      bills: [],
      subscriptions: [],
      loans: [],
      lombards: [],
      bankLoans: [],
      goal: 0,
      goalName: '',
      profile: {
        setupCompleted: false,
        incomeType: 'salary',
        salary: 0,
        payFrequency: 'monthly_1',
        workDays: [1, 2, 3, 4, 5],
        dailyTarget: 0,
        additionalIncomes: [],
        dailyBudget: 150,
      },
    };
    updateState(emptyState);
    setSelectedDay(null);
  }, [updateState]);

  // ობოლი მონაცემების გაწმენდა
  const handleCleanOrphans = useCallback((): number => {
    let removed = 0;

    // აქტიური ბანკის სესხების ID-ები
    const activeLoanBillIds = new Set<number>();
    const activeLoanDebtIds = new Set<number>();
    for (const loan of state.bankLoans || []) {
      if (loan.active) {
        for (const bid of loan.billIds) activeLoanBillIds.add(bid);
        activeLoanDebtIds.add(loan.debtId);
      }
    }

    // ობოლი ბილები: ბანკის ბილი რომლის სესხი აღარ აქტიურია
    const orphanBankBills = state.bills.filter(b => {
      return b.name.startsWith('🏦') && !activeLoanBillIds.has(b.id);
    });

    // ობოლი ვალები: ბანკის ვალი რომლის სესხი აღარ არსებობს
    const orphanBankDebts = state.debts.filter(d => {
      return d.name.startsWith('🏦') && !activeLoanDebtIds.has(d.id);
    });

    // ობოლი ბანკის სესხები
    const activeDebtIds = new Set(state.debts.map(d => d.id));
    const orphanLoans = (state.bankLoans || []).filter(l => !activeDebtIds.has(l.debtId));

    // ავტომატურად წასაშლელი ID-ები
    const autoRemoveBillIds = new Set(orphanBankBills.map(b => b.id));
    const autoRemoveDebtIds = new Set(orphanBankDebts.map(d => d.id));
    removed = autoRemoveBillIds.size + autoRemoveDebtIds.size + orphanLoans.length;

    // ხელით საშლელი — ყველა დარჩენილი ვალი და ბილი
    const manualDebtIds = new Set<number>();
    const manualBillIds = new Set<number>();

    const remainingDebts = state.debts.filter(d => !autoRemoveDebtIds.has(d.id) && !d.paid);
    const remainingBills = state.bills.filter(b => !autoRemoveBillIds.has(b.id) && !b.paid);

    // ყველა ვალი/ბილი სიაში ჩვენება
    const items: string[] = [];
    if (remainingDebts.length > 0) {
      items.push('📌 ვალები:');
      remainingDebts.forEach(d => items.push(`  • ${d.name} (${d.amount - (d.paidAmount || 0)}₾)`));
    }
    if (remainingBills.length > 0) {
      items.push('📋 გადასახადები:');
      // ბილები სახელით გაერთიანებული (12 ინსტანციიდან 1 აჩვენე)
      const billNames = new Set<string>();
      remainingBills.forEach(b => billNames.add(b.name));
      billNames.forEach(name => {
        const first = remainingBills.find(b => b.name === name)!;
        items.push(`  • ${name} (${first.amount}₾)`);
      });
    }

    if (items.length > 0) {
      const autoMsg = removed > 0
        ? `✅ ავტომატურად ${removed} ობოლი წაიშალა.\n\n`
        : '';
      const wantManual = window.confirm(
        `${autoMsg}აქტიური ჩანაწერები:\n${items.join('\n')}\n\nგინდა რომელიმეს წაშლა?`
      );
      if (wantManual) {
        // თითო ვალზე ჰკითხე
        for (const debt of remainingDebts) {
          if (window.confirm(`წავშალო ვალი "${debt.name}" (${debt.amount - (debt.paidAmount || 0)}₾)?`)) {
            manualDebtIds.add(debt.id);
            removed++;
          }
        }
        // თითო ბილზე ჰკითხე (სახელით გაერთიანებული)
        const askedBillNames = new Set<string>();
        for (const bill of remainingBills) {
          if (askedBillNames.has(bill.name)) continue;
          askedBillNames.add(bill.name);
          if (window.confirm(`წავშალო გადასახადი "${bill.name}" (${bill.amount}₾)?`)) {
            // ამ სახელის ყველა ბილი წავშალოთ
            remainingBills.filter(b => b.name === bill.name).forEach(b => manualBillIds.add(b.id));
            removed++;
          }
        }
      }
    }

    if (removed > 0) {
      // ვალთან დაკავშირებული ბილებიც
      const linkedBillIds = new Set<number>();
      for (const loan of state.bankLoans || []) {
        if (manualDebtIds.has(loan.debtId) || autoRemoveDebtIds.has(loan.debtId)) {
          for (const bid of loan.billIds) linkedBillIds.add(bid);
        }
      }

      updateState({
        ...state,
        debts: state.debts.filter(d => !autoRemoveDebtIds.has(d.id) && !manualDebtIds.has(d.id)),
        bills: state.bills.filter(b =>
          !autoRemoveBillIds.has(b.id) && !manualBillIds.has(b.id) && !linkedBillIds.has(b.id)
        ),
        bankLoans: (state.bankLoans || []).filter(l =>
          activeDebtIds.has(l.debtId) && !manualDebtIds.has(l.debtId)
        ),
      });
    }
    return removed;
  }, [state, updateState]);

  // თუ setup არ არის გავლილი, wizard აჩვენე
  if (!state.profile?.setupCompleted) {
    return (
      <>
        <SetupWizard
          onComplete={handleSetupComplete}
          user={user}
          authLoading={authLoading}
          onSignInWithGoogle={signInWithGoogle}
          onSignInWithEmail={signInWithEmail}
          onSignUpWithEmail={signUpWithEmail}
          onSendPhoneCode={sendPhoneCode}
          onConfirmPhoneCode={confirmPhoneCode}
        />
        <button
          onClick={toggleTheme}
          className="fixed bottom-4 right-4 w-10 h-10 rounded-full flex items-center justify-center shadow-lg z-50 transition-colors bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600"
          title={isDark ? 'ღია თემა' : 'მუქი თემა'}
        >
          {isDark ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>
      </>
    );
  }

  const tabs = [
    { key: 'payments' as const, label: 'გადასახადები', icon: '📅' },
    { key: 'debts' as const, label: 'ვალები / სესხები', icon: '💸' },
    { key: 'loans' as const, label: 'გასესხებული', icon: '🤝' },
    { key: 'stats' as const, label: 'სტატისტიკა', icon: '📊' },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-white to-emerald-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 text-slate-800 dark:text-slate-200">
      {/* Main scrollable area (header + calendar) */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <Header
          state={state}
          selectedMonth={selectedMonth}
          totalInc={stats.totalInc}
          totalExp={stats.totalExp}
          totalKulaba={stats.totalKulaba}
          onGoalChange={handleGoalChange}
          onProfileChange={handleProfileChange}
        />

        <main className="px-3 py-2">
          <DiaryView state={state} selectedMonth={selectedMonth} />
          <EventsView state={state} selectedMonth={selectedMonth} />
          <Calendar state={state} selectedMonth={selectedMonth} onDaySelect={setSelectedDay} />
        </main>

        {/* Mobile: month selector + sidebar toggle */}
        <div className="md:hidden flex items-center gap-2 px-3 py-2 sticky bottom-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-700">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="flex-1 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm"
          >
            {MONTH_NAMES.map((month, index) => (
              <option key={index} value={index.toString()}>
                {month}
              </option>
            ))}
            <option value="">ყველა თვე</option>
          </select>
          <button
            onClick={() => setSidebarOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-emerald-600 text-white px-3 py-2 rounded-xl font-bold text-sm flex items-center gap-1"
          >
            <Menu className="w-4 h-4" />
            მენიუ
          </button>
        </div>
      </div>

      {/* Sidebar: overlay on mobile, fixed on desktop */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 bg-black/30 z-40" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={cn(
        'bg-white/95 dark:bg-slate-900/95 backdrop-blur border-l border-slate-200 dark:border-slate-700 flex flex-col',
        // Desktop
        'hidden md:flex md:w-96 md:h-screen md:relative',
        // Mobile overlay
        sidebarOpen && '!flex fixed inset-y-0 right-0 w-[85vw] max-w-96 z-50 h-screen'
      )}>
        <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="flex-1 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition-colors text-sm"
          >
            {MONTH_NAMES.map((month, index) => (
              <option key={index} value={index.toString()}>
                {month}
              </option>
            ))}
            <option value="">ყველა თვე</option>
          </select>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="border-b border-slate-200 dark:border-slate-700">
          <div className="flex text-xs font-bold">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex-1 py-2 px-1 transition-all duration-200 border-b-2 flex items-center justify-center gap-1.5',
                  activeTab === tab.key
                    ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'text-slate-400 border-transparent hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                )}
              >
                <span className="text-sm">{tab.icon}</span>
                <span className="text-[11px]">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">

          {/* ===== გადასახადები — შიდა ტაბებით ===== */}
          {activeTab === 'payments' && (
            <>
              {/* შიდა ტაბები */}
              <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 gap-0.5">
                {([
                  { key: 'bills' as const, label: 'ყოველთვიური', icon: '📅', count: state.bills.filter((b) => !b.paid && (b.reset_month ?? 0) === (selectedMonth !== '' ? parseInt(selectedMonth) : new Date().getMonth())).length },
                  { key: 'utilities' as const, label: 'კომუნალური', icon: '⚡', count: 0 },
                  { key: 'subscriptions' as const, label: 'გამოწერები', icon: '🔄', count: (state.subscriptions || []).filter((s) => !s.paid && (s.reset_month ?? 0) === (selectedMonth !== '' ? parseInt(selectedMonth) : new Date().getMonth())).length },
                ]).map((sub) => (
                  <button
                    key={sub.key}
                    onClick={() => setPaymentSubTab(sub.key)}
                    className={cn(
                      'flex-1 py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1',
                      paymentSubTab === sub.key
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    )}
                  >
                    <span>{sub.icon}</span>
                    <span>{sub.label}</span>
                    {sub.count > 0 && (
                      <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center">{sub.count}</span>
                    )}
                  </button>
                ))}
              </div>

              {paymentSubTab === 'bills' && (
                <BillsManager
                  state={state}
                  selectedMonth={selectedMonth}
                  onAddBill={handleAddBill}
                  onRemoveBill={handleRemoveBill}
                  onToggleBillPaid={handleToggleBillPaid}
                  onEditBill={handleEditBill}
                />
              )}
              {paymentSubTab === 'utilities' && (
                <UtilitiesManager
                  state={state}
                  selectedMonth={selectedMonth}
                  onToggleBillPaid={handleToggleBillPaid}
                  onAddUtility={(name, amount) => handleAddBill(name, amount, true)}
                />
              )}
              {paymentSubTab === 'subscriptions' && (
                <SubscriptionsManager
                  state={state}
                  selectedMonth={selectedMonth}
                  onAddSubscription={handleAddSubscription}
                  onRemoveSubscription={handleRemoveSubscription}
                  onToggleSubscriptionPaid={handleToggleSubscriptionPaid}
                  onEditSubscription={handleEditSubscription}
                />
              )}
            </>
          )}

          {/* ===== ვალები / სესხები — შიდა ტაბებით ===== */}
          {activeTab === 'debts' && (
            <>
              <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 gap-0.5">
                {([
                  { key: 'personal' as const, label: 'ვალები', icon: '💸', count: state.debts.filter((d) => !d.paid).length },
                  { key: 'bank' as const, label: 'ბანკები / მიკროსაფინანსო', icon: '🏦', count: (state.bankLoans || []).filter((l) => l.active).length + (state.lombards || []).length },
                ]).map((sub) => (
                  <button
                    key={sub.key}
                    onClick={() => setDebtSubTab(sub.key)}
                    className={cn(
                      'flex-1 py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1',
                      debtSubTab === sub.key
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    )}
                  >
                    <span>{sub.icon}</span>
                    <span>{sub.label}</span>
                    {sub.count > 0 && (
                      <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center">{sub.count}</span>
                    )}
                  </button>
                ))}
              </div>

              {debtSubTab === 'personal' && (
                <DebtsManager
                  state={state}
                  onAddDebt={handleAddDebt}
                  onRemoveDebt={handleRemoveDebt}
                  onToggleDebtPaid={handleToggleDebtPaid}
                  onPayDebtPart={handlePayDebtPart}
                  onEditDebt={handleEditDebt}
                />
              )}
              {debtSubTab === 'bank' && (
                <BankLoansManager
                  state={state}
                  onAddBankLoan={handleAddBankLoan}
                  onRemoveBankLoan={handleRemoveBankLoan}
                  onEditBankLoan={handleEditBankLoan}
                  onToggleBillPaid={handleToggleBillPaid}
                />
              )}
            </>
          )}

          {/* ===== გასესხებული ===== */}
          {activeTab === 'loans' && (
            <LoansManager
              state={state}
              onAddLoan={handleAddLoan}
              onRemoveLoan={handleRemoveLoan}
              onToggleLoanReturned={handleToggleLoanReturned}
              onEditLoan={handleEditLoan}
            />
          )}

          {/* ===== სტატისტიკა ===== */}
          {activeTab === 'stats' && (
            <StatsView
              state={state}
              totalInc={stats.totalInc}
              totalExp={stats.totalExp}
              totalKulaba={stats.totalKulaba}
            />
          )}
        </div>
      </aside>

      <ToolsMenu state={state} onImport={handleImportData} onReset={handleResetData} onRerunSetup={handleRerunSetup} onCleanOrphans={handleCleanOrphans} />

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="fixed bottom-4 left-[4.5rem] w-10 h-10 rounded-full flex items-center justify-center shadow-lg z-50 transition-colors bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600"
        title={isDark ? 'ღია თემა' : 'მუქი თემა'}
      >
        {isDark ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
      </button>

      {/* ღრუბლის ღილაკი */}
      {!authLoading && (
        <button
          onClick={() => setShowAuth(true)}
          className="fixed bottom-4 left-4 w-12 h-12 rounded-full flex items-center justify-center shadow-lg z-50 transition-colors"
          style={{
            backgroundColor: user ? '#22c55e' : '#64748b',
          }}
          title={user ? 'სინქრონიზებულია' : 'ავტორიზაცია'}
        >
          {user ? (
            <Cloud className="w-5 h-5 text-white" />
          ) : (
            <CloudOff className="w-5 h-5 text-white" />
          )}
        </button>
      )}

      {showAuth && (
        <AuthModal
          user={user}
          onSignInWithGoogle={signInWithGoogle}
          onSignInWithFacebook={signInWithFacebook}
          onSendPhoneCode={sendPhoneCode}
          onConfirmPhoneCode={confirmPhoneCode}
          onSignInWithEmail={signInWithEmail}
          onSignUpWithEmail={signUpWithEmail}
          onLogout={logout}
          onClose={() => setShowAuth(false)}
        />
      )}

      {selectedDay && (
        <DayEditor
          date={selectedDay}
          state={state}
          onSave={handleSaveDay}
          onClose={handleCloseEditor}
        />
      )}
    </div>
  );
};
