import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { AppState, DayData, Debt, DebtPriority, UserProfile, Bill, Subscription, Loan, Lombard, BankLoan, BankProductType, Project, ProjectType, VACATION_CATEGORIES } from '@/types';
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
import { ProjectsManager } from '@/components/ProjectsManager';
import { StatsView } from '@/components/StatsView';
import { UtilitiesManager } from '@/components/UtilitiesManager';
import { ToolsMenu } from '@/components/ToolsMenu';
import { DiaryView } from '@/components/DiaryView';
import { EventsView } from '@/components/EventsView';
import { SmartAdvisor } from '@/components/SmartAdvisor';
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
  const [activeTab, setActiveTab] = useState<'debts' | 'payments' | 'bank' | 'loans' | 'projects' | 'stats'>('payments');
  const [paymentSubTab, setPaymentSubTab] = useState<'bills' | 'utilities' | 'subscriptions' | 'bankInterest'>('bills');
  const [debtSubTab, setDebtSubTab] = useState<'personal' | 'bankPrincipal'>('personal');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showMotivation, setShowMotivation] = useState(false);
  const [showMotivationEditor, setShowMotivationEditor] = useState(false);
  const [editMotivationMsg, setEditMotivationMsg] = useState('');
  const [editMotivationHour, setEditMotivationHour] = useState(9);

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

  // სამოტივაციო წერილის დღიური ჩვენება
  useEffect(() => {
    const msg = state.profile?.motivationalMessage;
    if (!msg || !state.profile?.setupCompleted) return;

    const hour = state.profile.motivationHour ?? 9;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const lastShown = localStorage.getItem('motivation_last_shown');

    // თუ დღეს უკვე ნაჩვენებია, აღარ აჩვენო
    if (lastShown === todayStr) return;

    // თუ საათი მოვიდა ან გადაცდენილია
    if (now.getHours() >= hour) {
      setShowMotivation(true);
      localStorage.setItem('motivation_last_shown', todayStr);
    }
  }, [state.profile]);

  const handleSetupComplete = useCallback(
    (profile: UserProfile, bills: Bill[], setupDebts?: Debt[], setupLombards?: Lombard[], setupBankLoans?: BankLoan[], walletBalance?: number) => {
      // თუ rerun-ია (უკვე იყო setupCompleted), replace ხდება
      const isRerun = state.profile?.incomeType !== undefined;
      const newState: AppState = {
        ...state,
        profile,
        bills: isRerun ? bills : [...state.bills, ...bills],
        debts: isRerun ? (setupDebts || state.debts) : [...state.debts, ...(setupDebts || [])],
        lombards: isRerun ? (setupLombards || state.lombards || []) : [...(state.lombards || []), ...(setupLombards || [])],
        bankLoans: isRerun ? (setupBankLoans || state.bankLoans || []) : [...(state.bankLoans || []), ...(setupBankLoans || [])],
        walletBalance: walletBalance !== undefined ? walletBalance : state.walletBalance,
      };
      updateState(newState);
    },
    [state, updateState]
  );

  const handleWalletUpdate = useCallback(
    (amount: number) => {
      updateState({ ...state, walletBalance: amount });
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

      // 👛 ჯიბე ავტო-განახლება — ძველი vs ახალი delta
      let updatedWallet = state.walletBalance;
      if (updatedWallet !== undefined) {
        const old = state.db[date];
        const oldInc = (old?.incMain || 0) + (old?.incExtra || 0);
        const oldExp = (old?.expenses || []).reduce((s, e) => s + e.amount, 0);
        const newInc = (data.incMain || 0) + (data.incExtra || 0);
        const newExp = (data.expenses || []).reduce((s, e) => s + e.amount, 0);
        const delta = (newInc - oldInc) - (newExp - oldExp);
        if (delta !== 0) {
          updatedWallet = Math.max(0, updatedWallet + delta);
        }
      }

      const newState: AppState = {
        ...state,
        db: { ...state.db, [date]: data },
        debts: updatedDebts,
        bills: updatedBills,
        walletBalance: updatedWallet,
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
      updateState({ ...state, goal, goalName, goalProjectId: undefined });
    },
    [state, updateState]
  );

  const handleLinkProjectToGoal = useCallback(
    (projectId: number | null) => {
      if (projectId === null) {
        updateState({ ...state, goalProjectId: undefined });
        return;
      }
      const project = (state.projects || []).find(p => p.id === projectId);
      if (!project) return;
      const inventoryTotal = project.inventoryItems.reduce((s, i) => s + i.cost, 0);
      updateState({ ...state, goalProjectId: projectId, goal: inventoryTotal, goalName: project.name });
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
      projects: [],
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

  // ===== პროექტები =====
  const handleAddProject = useCallback((name: string, description?: string, type?: ProjectType) => {
    const ts = Date.now();
    const newProject: Project = {
      id: ts,
      name,
      description,
      type: type || 'standard',
      inventoryItems: type === 'vacation'
        ? VACATION_CATEGORIES.map((cat, i) => ({ id: ts + i + 1, name: cat.name, cost: 0, purchased: false }))
        : [],
      monthlyCosts: [],
      active: true,
      createdAt: new Date().toISOString().split('T')[0],
    };
    updateState({ ...state, projects: [...(state.projects || []), newProject] });
  }, [state, updateState]);

  const handleRemoveProject = useCallback((id: number) => {
    updateState({ ...state, projects: (state.projects || []).filter(p => p.id !== id) });
  }, [state, updateState]);

  const handleEditProject = useCallback((id: number, updates: Partial<Project>) => {
    updateState({
      ...state,
      projects: (state.projects || []).map(p => p.id === id ? { ...p, ...updates } : p),
    });
  }, [state, updateState]);

  const handleAddInventoryItem = useCallback((projectId: number, name: string, cost: number) => {
    updateState({
      ...state,
      projects: (state.projects || []).map(p =>
        p.id === projectId
          ? { ...p, inventoryItems: [...p.inventoryItems, { id: Date.now(), name, cost, purchased: false }] }
          : p
      ),
    });
  }, [state, updateState]);

  const handleRemoveInventoryItem = useCallback((projectId: number, itemId: number) => {
    updateState({
      ...state,
      projects: (state.projects || []).map(p =>
        p.id === projectId
          ? { ...p, inventoryItems: p.inventoryItems.filter(i => i.id !== itemId) }
          : p
      ),
    });
  }, [state, updateState]);

  const handleToggleInventoryPurchased = useCallback((projectId: number, itemId: number) => {
    updateState({
      ...state,
      projects: (state.projects || []).map(p =>
        p.id === projectId
          ? { ...p, inventoryItems: p.inventoryItems.map(i => i.id === itemId ? { ...i, purchased: !i.purchased } : i) }
          : p
      ),
    });
  }, [state, updateState]);

  const handleAddMonthlyCost = useCallback((projectId: number, name: string, amount: number) => {
    updateState({
      ...state,
      projects: (state.projects || []).map(p =>
        p.id === projectId
          ? { ...p, monthlyCosts: [...p.monthlyCosts, { id: Date.now(), name, amount }] }
          : p
      ),
    });
  }, [state, updateState]);

  const handleRemoveMonthlyCost = useCallback((projectId: number, costId: number) => {
    updateState({
      ...state,
      projects: (state.projects || []).map(p =>
        p.id === projectId
          ? { ...p, monthlyCosts: p.monthlyCosts.filter(c => c.id !== costId) }
          : p
      ),
    });
  }, [state, updateState]);

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
          existingProfile={state.profile?.incomeType ? state.profile : undefined}
          existingBills={state.bills?.length ? state.bills : undefined}
          existingBankLoans={state.bankLoans?.length ? state.bankLoans : undefined}
          existingLombards={state.lombards?.length ? state.lombards : undefined}
          existingWalletBalance={state.walletBalance}
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
    { key: 'debts' as const, label: 'ძირი ვალები', icon: '💰' },
    { key: 'payments' as const, label: 'გადასახდელები', icon: '📅' },
    { key: 'bank' as const, label: 'სესხები', icon: '🏦' },
    { key: 'projects' as const, label: 'პროექტები', icon: '🏗️' },
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
          onMonthChange={setSelectedMonth}
          onWalletUpdate={handleWalletUpdate}
          onRerunSetup={handleRerunSetup}
        />

        <main className="px-3 py-2 space-y-2">
          <SmartAdvisor state={state} selectedMonth={selectedMonth} />

          {/* პროექტების summary widget */}
          {(state.projects || []).filter(p => p.active).length > 0 && (() => {
            const activeProjects = (state.projects || []).filter(p => p.active);
            const totalInv = activeProjects.reduce((s, p) => s + p.inventoryItems.reduce((si, i) => si + i.cost, 0), 0);
            const totalPurchased = activeProjects.reduce((s, p) => s + p.inventoryItems.filter(i => i.purchased).reduce((si, i) => si + i.cost, 0), 0);
            const progress = totalInv > 0 ? Math.round((totalPurchased / totalInv) * 100) : 0;
            return (
              <button
                onClick={() => { setActiveTab('projects'); setSidebarOpen(true); }}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-3 text-white text-left hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md active:scale-[0.98]"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold opacity-90">🏗️ ჩემი პროექტები ({activeProjects.length})</span>
                  <span className="text-[10px] opacity-70">დააჭირე სანახავად →</span>
                </div>
                <div className="flex gap-3">
                  {activeProjects.slice(0, 3).map(p => (
                    <div key={p.id} className="flex-1 bg-white/15 rounded-lg p-2 min-w-0">
                      <p className="text-[10px] truncate font-semibold">{p.type === 'vacation' ? '🏖️' : '🏗️'} {p.name}</p>
                      <p className="text-sm font-black">{p.inventoryItems.reduce((s, i) => s + i.cost, 0).toLocaleString()}₾</p>
                    </div>
                  ))}
                  {activeProjects.length > 3 && (
                    <div className="flex items-center justify-center bg-white/15 rounded-lg px-2">
                      <span className="text-xs font-bold">+{activeProjects.length - 3}</span>
                    </div>
                  )}
                </div>
                {totalInv > 0 && (
                  <div className="mt-2">
                    <div className="flex justify-between text-[10px] opacity-80 mb-0.5">
                      <span>ნაყიდი: {totalPurchased.toLocaleString()}₾ / {totalInv.toLocaleString()}₾</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-white/80 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}
              </button>
            );
          })()}

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
        {/* Sidebar header — mobile-ზე close button + month select */}
        <div className="md:hidden p-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="flex-1 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition-colors text-sm"
          >
            {MONTH_NAMES.map((month, index) => (
              <option key={index} value={index.toString()}>{month}</option>
            ))}
            <option value="">ყველა თვე</option>
          </select>
          <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-700">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex-1 py-3 px-1 transition-all duration-200 border-b-2 flex flex-col items-center justify-center gap-0.5',
                  activeTab === tab.key
                    ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'text-slate-400 border-transparent hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                )}
              >
                <span className="text-base">{tab.icon}</span>
                <span className="text-[9px] font-bold leading-none">{tab.label.split(' ')[0]}</span>
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
                  { key: 'bills' as const, label: 'ყოველთვიური', icon: '📅', count: state.bills.filter((b) => !b.paid && !b.name.startsWith('🏦') && (b.reset_month ?? 0) === (selectedMonth !== '' ? parseInt(selectedMonth) : new Date().getMonth())).length },
                  { key: 'utilities' as const, label: 'კომუნალური', icon: '⚡', count: 0 },
                  { key: 'subscriptions' as const, label: 'გამოწერები', icon: '🔄', count: (state.subscriptions || []).filter((s) => !s.paid && (s.reset_month ?? 0) === (selectedMonth !== '' ? parseInt(selectedMonth) : new Date().getMonth())).length },
                  { key: 'bankInterest' as const, label: 'ბანკის %', icon: '🏦', count: state.bills.filter((b) => !b.paid && b.name.startsWith('🏦') && (b.reset_month ?? 0) === (selectedMonth !== '' ? parseInt(selectedMonth) : new Date().getMonth())).length },
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
                  filterPrefix=""
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
              {paymentSubTab === 'bankInterest' && (
                <BillsManager
                  state={state}
                  selectedMonth={selectedMonth}
                  onAddBill={handleAddBill}
                  onRemoveBill={handleRemoveBill}
                  onToggleBillPaid={handleToggleBillPaid}
                  onEditBill={handleEditBill}
                  filterPrefix="🏦"
                />
              )}
            </>
          )}

          {/* ===== ძირი ვალები ===== */}
          {activeTab === 'debts' && (
            <>
              <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 gap-0.5">
                {([
                  { key: 'personal' as const, label: '💸 პირადი ვალები', count: state.debts.filter((d) => !d.paid && !d.name.startsWith('🏦')).length },
                  { key: 'bankPrincipal' as const, label: '🏦 ბანკის ძირი', count: state.debts.filter((d) => !d.paid && d.name.startsWith('🏦')).length },
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
                  filterPrefix=""
                />
              )}
              {debtSubTab === 'bankPrincipal' && (
                <DebtsManager
                  state={state}
                  onAddDebt={handleAddDebt}
                  onRemoveDebt={handleRemoveDebt}
                  onToggleDebtPaid={handleToggleDebtPaid}
                  onPayDebtPart={handlePayDebtPart}
                  onEditDebt={handleEditDebt}
                  filterPrefix="🏦"
                />
              )}
            </>
          )}

          {/* ===== სესხების მართვა (ბანკი/ლომბარდი) ===== */}
          {activeTab === 'bank' && (
            <BankLoansManager
              state={state}
              onAddBankLoan={handleAddBankLoan}
              onRemoveBankLoan={handleRemoveBankLoan}
              onEditBankLoan={handleEditBankLoan}
              onToggleBillPaid={handleToggleBillPaid}
            />
          )}

          {/* ===== პროექტები ===== */}
          {activeTab === 'projects' && (
            <ProjectsManager
              state={state}
              onAddProject={handleAddProject}
              onRemoveProject={handleRemoveProject}
              onEditProject={handleEditProject}
              onAddInventoryItem={handleAddInventoryItem}
              onRemoveInventoryItem={handleRemoveInventoryItem}
              onToggleInventoryPurchased={handleToggleInventoryPurchased}
              onAddMonthlyCost={handleAddMonthlyCost}
              onRemoveMonthlyCost={handleRemoveMonthlyCost}
              onLinkProjectToGoal={handleLinkProjectToGoal}
              goalProjectId={state.goalProjectId}
            />
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

      <ToolsMenu
        state={state}
        onImport={handleImportData}
        onReset={handleResetData}
        onRerunSetup={handleRerunSetup}
        onCleanOrphans={handleCleanOrphans}
        onEditMotivation={() => {
          setEditMotivationMsg(state.profile?.motivationalMessage || '');
          setEditMotivationHour(state.profile?.motivationHour ?? 9);
          setShowMotivationEditor(true);
        }}
      />

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

      {/* სამოტივაციო წერილის მოდალი */}
      {showMotivation && state.profile?.motivationalMessage && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setShowMotivation(false)}>
          <div
            className="bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 rounded-3xl p-1 max-w-sm w-full animate-fadeIn shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-slate-900 rounded-[22px] p-6 space-y-4">
              <div className="text-center">
                <div className="text-4xl mb-2">💌</div>
                <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                  წერილი შენს თავს
                </h2>
                <p className="text-[10px] text-slate-400 mt-1">ყოველდღიური შეხსენება</p>
              </div>
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 border border-purple-100 dark:border-purple-800">
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {state.profile.motivationalMessage}
                </p>
              </div>
              <button
                onClick={() => setShowMotivation(false)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-sm hover:opacity-90 transition-opacity"
              >
                💪 გავიგე, წავედი!
              </button>
              <button
                onClick={() => {
                  setShowMotivation(false);
                  setEditMotivationMsg(state.profile.motivationalMessage || '');
                  setEditMotivationHour(state.profile.motivationHour ?? 9);
                  setShowMotivationEditor(true);
                }}
                className="w-full text-[10px] text-slate-400 hover:text-purple-500 transition-colors"
              >
                ✏️ წერილის რედაქტირება
              </button>
            </div>
          </div>
        </div>
      )}

      {/* სამოტივაციო წერილის რედაქტორი */}
      {showMotivationEditor && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setShowMotivationEditor(false)}>
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="text-3xl mb-1">💌</div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">სამოტივაციო წერილი</h2>
            </div>
            <textarea
              value={editMotivationMsg}
              onChange={e => setEditMotivationMsg(e.target.value)}
              className="w-full min-h-[100px] resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="დაუწერე წერილი შენს თავს..."
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">⏰ საათი:</span>
              <select
                value={editMotivationHour}
                onChange={e => setEditMotivationHour(parseInt(e.target.value))}
                className="bg-white dark:bg-slate-800 text-sm px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowMotivationEditor(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                გაუქმება
              </button>
              <button
                onClick={() => {
                  updateState({
                    ...state,
                    profile: {
                      ...state.profile,
                      motivationalMessage: editMotivationMsg.trim() || undefined,
                      motivationHour: editMotivationHour,
                    },
                  });
                  setShowMotivationEditor(false);
                }}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-sm hover:opacity-90"
              >
                შენახვა
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
