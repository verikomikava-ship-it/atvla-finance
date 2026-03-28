import React, { useState } from 'react';
import { User, ConfirmationResult } from 'firebase/auth';
import { UserProfile, PayFrequency, Bill, Debt, Lombard, BankLoan, BankProductType, BANK_PRODUCT_TYPES, UTILITY_TYPES } from '../types';
import { getWorkDaysInMonth } from '../utils/calculations';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Briefcase, Rocket, Layers, ArrowLeft, ArrowRight, Plus, X, Check, Cloud, CloudOff, ChevronDown, ChevronRight } from 'lucide-react';

const BILL_PRESETS = [
  { name: 'ქირა', icon: '🏢' },
  { name: 'დაზღვევა', icon: '🛡️' },
  { name: 'ტელეფონი', icon: '📱' },
  { name: 'ინტერნეტი', icon: '🌐' },
  { name: 'Netflix', icon: '🎬' },
] as const;

interface SetupWizardProps {
  onComplete: (profile: UserProfile, bills: Bill[], debts?: Debt[], lombards?: Lombard[], bankLoans?: BankLoan[], walletBalance?: number) => void;
  user: User | null;
  authLoading: boolean;
  onSignInWithGoogle: () => Promise<void>;
  onSignInWithEmail: (email: string, password: string) => Promise<void>;
  onSignUpWithEmail: (email: string, password: string) => Promise<void>;
  onSendPhoneCode: (phone: string, recaptchaId: string) => Promise<ConfirmationResult>;
  onConfirmPhoneCode: (result: ConfirmationResult, code: string) => Promise<void>;
}

const WEEK_DAYS = [
  { value: 1, label: 'ორშ' },
  { value: 2, label: 'სამ' },
  { value: 3, label: 'ოთხ' },
  { value: 4, label: 'ხუთ' },
  { value: 5, label: 'პარ' },
  { value: 6, label: 'შაბ' },
  { value: 0, label: 'კვი' },
];

const DEFAULT_WORK_DAYS = [1, 2, 3, 4, 5];

const DEFAULT_PROFILE: UserProfile = {
  setupCompleted: false,
  incomeType: 'salary',
  salary: 0,
  payFrequency: 'monthly_1',
  workDays: DEFAULT_WORK_DAYS,
  dailyTarget: 0,
  additionalIncomes: [],
  dailyBudget: 0,
};

const inputClass = "flex h-11 w-full rounded-xl border border-border bg-background/50 px-3 py-2 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 transition-colors";

export const SetupWizard: React.FC<SetupWizardProps> = ({
  onComplete, user, authLoading,
  onSignInWithGoogle, onSignInWithEmail, onSignUpWithEmail,
  onSendPhoneCode, onConfirmPhoneCode,
}) => {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);

  // Auth
  const [authTab, setAuthTab] = useState<'google' | 'email' | 'phone'>('google');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authIsSignUp, setAuthIsSignUp] = useState(false);
  const [authPhone, setAuthPhone] = useState('+995');
  const [authConfirmResult, setAuthConfirmResult] = useState<ConfirmationResult | null>(null);
  const [authSmsCode, setAuthSmsCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  // Step 1 inputs
  const [salaryInput, setSalaryInput] = useState('');
  const [dailyTargetInput, setDailyTargetInput] = useState('');

  // Step 3 — ჯიბეში ფული
  const [walletInput, setWalletInput] = useState('');

  // Step 2 — bills
  const [bills, setBills] = useState<Bill[]>([]);
  const [newBillName, setNewBillName] = useState('');
  const [newBillAmount, setNewBillAmount] = useState('');
  const [newBillDueDay, setNewBillDueDay] = useState('');

  // Step 2 — utilities
  const [utilityAmounts, setUtilityAmounts] = useState<Record<string, string>>({});

  // Step 2 — bank loans
  const [bankItems, setBankItems] = useState<{
    type: BankProductType; name?: string; principal: number;
    monthlyInterest: number; paymentDay: number;
    totalMonths: number; paidMonths: number;
    lateFee: number; dailyPenaltyRate: number;
  }[]>([]);
  const [bankType, setBankType] = useState<BankProductType | null>(null);
  const [bankName, setBankName] = useState('');
  const [bankPrincipal, setBankPrincipal] = useState('');
  const [bankInterest, setBankInterest] = useState('');
  const [bankPayDay, setBankPayDay] = useState('');
  const [bankTotalMonths, setBankTotalMonths] = useState('');
  const [bankPaidMonths, setBankPaidMonths] = useState('');

  // Step 2 — lombards
  const [lombardItems, setLombardItems] = useState<{
    itemName: string; principal: number; monthlyInterest: number;
    contractNumber?: string; paymentDay: number;
  }[]>([]);
  const [lombItemName, setLombItemName] = useState('');
  const [lombPrincipal, setLombPrincipal] = useState('');
  const [lombInterest, setLombInterest] = useState('');
  const [lombPayDay, setLombPayDay] = useState('');

  // Expandable sections
  const [openSection, setOpenSection] = useState<'bills' | 'utilities' | 'bank' | 'lombard' | null>(null);

  // === გამოთვლები ===
  const now = new Date();
  const workDaysInMonth = getWorkDaysInMonth(now.getFullYear(), now.getMonth(), profile.workDays || DEFAULT_WORK_DAYS);
  const dailySalary = profile.salary > 0 ? Math.round(profile.salary / workDaysInMonth) : 0;

  const getDailyTarget = (): number => {
    if (profile.incomeType === 'freelance') return profile.dailyTarget || 0;
    if (profile.incomeType === 'salary') return dailySalary;
    return dailySalary + (profile.dailyTarget || 0);
  };

  const getMonthlyIncome = (): number => {
    let monthly = 0;
    if (profile.incomeType === 'salary' || profile.incomeType === 'both') monthly += profile.salary;
    if (profile.incomeType === 'freelance' || profile.incomeType === 'both') monthly += (profile.dailyTarget || 0) * 30;
    profile.additionalIncomes.forEach((ai) => {
      if (ai.frequency === 'monthly') monthly += ai.amount;
      if (ai.frequency === 'weekly') monthly += (ai.amount * 52) / 12;
      if (ai.frequency === 'daily') monthly += ai.amount * 30;
    });
    return Math.round(monthly);
  };

  const dailyTarget = getDailyTarget();
  const monthlyIncome = getMonthlyIncome();

  // ბილების ჯამი
  const uniqueBills = bills.reduce<Record<string, number>>((acc, b) => { acc[b.name] = b.amount; return acc; }, {});
  const utilityTotal = Object.values(utilityAmounts).reduce((s, v) => s + (parseInt(v) || 0), 0);
  const monthlyBillsTotal = Object.values(uniqueBills).reduce((s, a) => s + a, 0) + utilityTotal;
  const bankMonthlyTotal = bankItems.reduce((s, b) => s + b.monthlyInterest, 0);
  const lombardMonthlyTotal = lombardItems.reduce((s, l) => s + l.monthlyInterest, 0);
  const totalMonthlyExpenses = monthlyBillsTotal + bankMonthlyTotal + lombardMonthlyTotal;
  const dailyBudget = Math.round(Math.max(0, monthlyIncome - totalMonthlyExpenses) / 30);

  // === ფუნქციები ===
  const updateSalary = (val: string) => {
    setSalaryInput(val);
    setProfile((p) => ({ ...p, salary: Math.max(0, parseInt(val) || 0) }));
  };

  const updateDailyTarget = (val: string) => {
    setDailyTargetInput(val);
    setProfile((p) => ({ ...p, dailyTarget: Math.max(0, parseInt(val) || 0) }));
  };

  const toggleWorkDay = (day: number) => {
    setProfile((p) => ({
      ...p,
      workDays: (p.workDays || []).includes(day)
        ? (p.workDays || []).filter((d) => d !== day)
        : [...(p.workDays || []), day],
    }));
  };

  const addBill = (name?: string) => {
    const billName = name || newBillName.trim();
    if (!billName || !newBillAmount) return;
    const ts = Date.now();
    const currentYear = new Date().getFullYear();
    const dueDay = parseInt(newBillDueDay) || 1;
    const billsToAdd: Bill[] = [];
    for (let month = 0; month < 12; month++) {
      const lastDay = new Date(currentYear, month + 1, 0).getDate();
      const actualDay = Math.min(dueDay, lastDay);
      billsToAdd.push({
        id: ts + month,
        name: billName,
        amount: Math.max(0, parseInt(newBillAmount) || 0),
        date: '',
        paid: false,
        reset_month: month,
        dueDate: `${currentYear}-${String(month + 1).padStart(2, '0')}-${String(actualDay).padStart(2, '0')}`,
        isRecurring: true,
      });
    }
    setBills((prev) => [...prev, ...billsToAdd]);
    setNewBillName('');
    setNewBillAmount('');
    setNewBillDueDay('');
  };

  const removeBillGroup = (name: string) => setBills((prev) => prev.filter((b) => b.name !== name));

  const addBankItem = () => {
    if (!bankType) return;
    const pr = parseInt(bankPrincipal) || 0;
    const interest = parseInt(bankInterest) || 0;
    const day = parseInt(bankPayDay) || 1;
    const total = parseInt(bankTotalMonths) || 12;
    const paid = parseInt(bankPaidMonths) || 0;
    if (pr <= 0 || interest <= 0) return;
    setBankItems((prev) => [...prev, {
      type: bankType, name: bankName.trim() || undefined, principal: pr,
      monthlyInterest: interest, paymentDay: Math.min(31, Math.max(1, day)),
      totalMonths: total, paidMonths: Math.min(paid, total),
      lateFee: 20, dailyPenaltyRate: 0.5,
    }]);
    setBankType(null); setBankName(''); setBankPrincipal(''); setBankInterest('');
    setBankPayDay(''); setBankTotalMonths(''); setBankPaidMonths('');
  };

  const addLombardItem = () => {
    const name = lombItemName.trim();
    const pr = parseInt(lombPrincipal) || 0;
    const interest = parseInt(lombInterest) || 0;
    const day = parseInt(lombPayDay) || 1;
    if (!name || pr <= 0 || interest <= 0) return;
    setLombardItems((prev) => [...prev, {
      itemName: name, principal: pr, monthlyInterest: interest,
      paymentDay: Math.min(31, Math.max(1, day)),
    }]);
    setLombItemName(''); setLombPrincipal(''); setLombInterest(''); setLombPayDay('');
  };

  const needsSalary = profile.incomeType === 'salary' || profile.incomeType === 'both';
  const needsDailyTarget = profile.incomeType === 'freelance' || profile.incomeType === 'both';

  const canProceedStep1 = (): boolean => {
    if (profile.incomeType === 'salary') return profile.salary > 0;
    if (profile.incomeType === 'freelance') return (profile.dailyTarget || 0) > 0;
    return profile.salary > 0;
  };

  // === handleFinish — ზუსტად იგივე ლოგიკა ===
  const handleFinish = () => {
    const finalProfile: UserProfile = {
      ...profile,
      dailyTarget,
      dailyBudget,
      setupCompleted: true,
    };

    const currentYear = new Date().getFullYear();
    const today = new Date().toISOString().split('T')[0];

    // კომუნალურების ბილები
    const utilityBills: Bill[] = [];
    Object.entries(utilityAmounts).forEach(([utilKey, amountStr]) => {
      const amount = parseInt(amountStr) || 0;
      if (amount <= 0) return;
      const util = UTILITY_TYPES.find((u) => u.key === utilKey);
      if (!util) return;
      const ts = Date.now() + utilityBills.length * 100;
      for (let month = 0; month < 12; month++) {
        utilityBills.push({
          id: ts + month,
          name: `კომუნალური: ${util.label}`,
          amount,
          date: '',
          paid: false,
          reset_month: month,
          isRecurring: true,
        });
      }
    });

    // ლომბარდები
    const setupDebts: Debt[] = [];
    const setupLombards: Lombard[] = [];
    const lombardBills: Bill[] = [];

    lombardItems.forEach((item, idx) => {
      const baseId = Date.now() + idx * 1000;
      const debtId = baseId;
      const billIds: number[] = [];
      setupDebts.push({
        id: debtId,
        name: `🏪 ლობარდი: ${item.itemName}`,
        amount: item.principal,
        paid: false,
        priority: 'high',
        paidAmount: 0,
      });
      for (let month = 0; month < 12; month++) {
        const billId = baseId + 1 + month;
        billIds.push(billId);
        const lastDay = new Date(currentYear, month + 1, 0).getDate();
        const actualDay = Math.min(item.paymentDay, lastDay);
        lombardBills.push({
          id: billId,
          name: `🏪 ლობარდი %: ${item.itemName}`,
          amount: item.monthlyInterest,
          date: '',
          paid: false,
          reset_month: month,
          dueDate: `${currentYear}-${String(month + 1).padStart(2, '0')}-${String(actualDay).padStart(2, '0')}`,
        });
      }
      setupLombards.push({
        id: baseId + 100,
        itemName: item.itemName,
        principal: item.principal,
        monthlyInterest: item.monthlyInterest,
        paymentDay: item.paymentDay,
        debtId,
        billIds,
        active: true,
        createdAt: today,
      });
    });

    // ბანკის პროდუქტები
    const setupBankLoans: BankLoan[] = [];
    bankItems.forEach((item, idx) => {
      const bankBaseId = Date.now() + 500000 + idx * 1000;
      const bankDebtId = bankBaseId;
      const bankBillIds: number[] = [];
      const bLabel = item.name ? `${item.type}: ${item.name}` : item.type;

      const startMonth = new Date();
      startMonth.setMonth(startMonth.getMonth() - item.paidMonths);
      const endMonth = new Date();
      endMonth.setMonth(endMonth.getMonth() + (item.totalMonths - item.paidMonths));

      setupDebts.push({
        id: bankDebtId,
        name: `🏦 ${bLabel}`,
        amount: item.principal,
        paid: false,
        priority: 'high',
        paidAmount: 0,
        parts: item.totalMonths,
        paidParts: item.paidMonths,
      });

      for (let month = 0; month < 12; month++) {
        const bBillId = bankBaseId + 1 + month;
        bankBillIds.push(bBillId);
        const bLastDay = new Date(currentYear, month + 1, 0).getDate();
        const bActualDay = Math.min(item.paymentDay, bLastDay);
        lombardBills.push({
          id: bBillId,
          name: `🏦 ${bLabel} %`,
          amount: item.monthlyInterest,
          date: '',
          paid: false,
          reset_month: month,
          dueDate: `${currentYear}-${String(month + 1).padStart(2, '0')}-${String(bActualDay).padStart(2, '0')}`,
        });
      }

      setupBankLoans.push({
        id: bankBaseId + 100,
        type: item.type,
        name: item.name,
        principal: item.principal,
        monthlyInterest: item.monthlyInterest,
        paymentDay: item.paymentDay,
        startDate: `${startMonth.getFullYear()}-${String(startMonth.getMonth() + 1).padStart(2, '0')}`,
        endDate: `${endMonth.getFullYear()}-${String(endMonth.getMonth() + 1).padStart(2, '0')}`,
        totalMonths: item.totalMonths,
        debtId: bankDebtId,
        billIds: bankBillIds,
        active: true,
        createdAt: today,
        lateFee: item.lateFee,
        dailyPenaltyRate: item.dailyPenaltyRate,
      });
    });

    const walletBalance = walletInput.trim() ? parseFloat(walletInput) || 0 : undefined;
    onComplete(finalProfile, [...bills, ...utilityBills, ...lombardBills], setupDebts, setupLombards, setupBankLoans, walletBalance);
  };

  const handleSkipSetup = () => {
    onComplete({ ...DEFAULT_PROFILE, dailyBudget: 150, setupCompleted: true }, []);
  };

  // === Section Toggle ===
  const toggleSection = (s: typeof openSection) => setOpenSection(openSection === s ? null : s);

  // === RENDER ===
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-emerald-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="min-h-full flex items-start justify-center p-4">
        <div className="w-full max-w-lg my-auto py-8">

        {/* === Step 0: მისალმება === */}
        {step === 0 && (
          <Card className="border-border/50 bg-card/80 backdrop-blur animate-fadeIn">
            <CardContent className="pt-8 pb-8 text-center space-y-6">
              <div className="text-6xl mb-4">🏺</div>
              <CardTitle className="text-3xl font-black text-blue-600">ჩემი ფინანსები</CardTitle>
              <CardDescription className="text-base">
                3 მარტივი ნაბიჯი და მზადაა
              </CardDescription>

              {!authLoading && (
                <div className="pt-2">
                  {user ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400">
                        <Cloud className="w-5 h-5" />
                        <span className="font-bold text-sm">ღრუბელთან დაკავშირებულია</span>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-black text-xs font-bold">
                            {(user.displayName || user.email || '?')[0].toUpperCase()}
                          </div>
                        )}
                        <span className="text-sm text-slate-700 dark:text-slate-300">{user.displayName || user.email || user.phoneNumber}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400">
                        <CloudOff className="w-5 h-5" />
                        <span className="font-bold text-sm">ღრუბლის სინქრონიზაცია</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        რეგისტრაცია = მონაცემები <strong className="text-slate-800 dark:text-slate-200">ყველა მოწყობილობაზე</strong>
                      </p>

                      <div className="flex gap-1">
                        {([
                          { key: 'google' as const, label: 'Google', icon: '🔵' },
                          { key: 'email' as const, label: 'ელ-ფოსტა', icon: '📧' },
                          { key: 'phone' as const, label: 'ტელეფონი', icon: '📱' },
                        ]).map((t) => (
                          <button
                            key={t.key}
                            onClick={() => { setAuthTab(t.key); setAuthError(''); }}
                            className={cn(
                              'flex-1 text-xs py-1.5 rounded-xl transition-colors',
                              authTab === t.key
                                ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700/50'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-transparent'
                            )}
                          >
                            <span className="text-sm">{t.icon}</span> {t.label}
                          </button>
                        ))}
                      </div>

                      {authError && (
                        <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 p-2 rounded-xl">{authError}</p>
                      )}

                      {authTab === 'google' && (
                        <Button className="w-full" disabled={authBusy}
                          onClick={async () => {
                            setAuthError(''); setAuthBusy(true);
                            try { await onSignInWithGoogle(); }
                            catch (e) { setAuthError(e instanceof Error ? e.message : 'შეცდომა'); }
                            finally { setAuthBusy(false); }
                          }}
                        >
                          🔵 {authBusy ? 'იტვირთება...' : 'Google-ით შესვლა'}
                        </Button>
                      )}

                      {authTab === 'email' && (
                        <div className="space-y-2">
                          <input type="email" placeholder="ელ-ფოსტა" value={authEmail}
                            onChange={(e) => setAuthEmail(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:border-blue-500" />
                          <input type="password" placeholder="პაროლი (6+ სიმბოლო)" value={authPassword}
                            onChange={(e) => setAuthPassword(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:border-blue-500" />
                          <Button className="w-full" disabled={authBusy || !authEmail || authPassword.length < 6}
                            onClick={async () => {
                              setAuthError(''); setAuthBusy(true);
                              try {
                                if (authIsSignUp) await onSignUpWithEmail(authEmail, authPassword);
                                else await onSignInWithEmail(authEmail, authPassword);
                              } catch (e: unknown) {
                                const msg = e instanceof Error ? e.message : 'შეცდომა';
                                if (msg.includes('not-found') || msg.includes('invalid')) {
                                  setAuthIsSignUp(true);
                                  setAuthError('ანგარიში არ მოიძებნა — ხელახლა დააჭირე რეგისტრაციისთვის');
                                } else { setAuthError(msg); }
                              } finally { setAuthBusy(false); }
                            }}>
                            {authBusy ? '...' : authIsSignUp ? '📧 რეგისტრაცია' : '📧 შესვლა'}
                          </Button>
                        </div>
                      )}

                      {authTab === 'phone' && (
                        <div className="space-y-2">
                          {!authConfirmResult ? (
                            <>
                              <input type="tel" placeholder="+995 5XX XXX XXX" value={authPhone}
                                onChange={(e) => setAuthPhone(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:border-blue-500" />
                              <div id="recaptcha-container" />
                              <Button className="w-full" disabled={authBusy || authPhone.length < 9}
                                onClick={async () => {
                                  setAuthError(''); setAuthBusy(true);
                                  try { const r = await onSendPhoneCode(authPhone, 'recaptcha-container'); setAuthConfirmResult(r); }
                                  catch (e) { setAuthError(e instanceof Error ? e.message : 'შეცდომა'); }
                                  finally { setAuthBusy(false); }
                                }}>
                                {authBusy ? '...' : '📱 კოდის გაგზავნა'}
                              </Button>
                            </>
                          ) : (
                            <>
                              <input type="text" inputMode="numeric" placeholder="SMS კოდი" value={authSmsCode}
                                onChange={(e) => setAuthSmsCode(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:border-blue-500" />
                              <Button className="w-full" disabled={authBusy || authSmsCode.length < 4}
                                onClick={async () => {
                                  setAuthError(''); setAuthBusy(true);
                                  try { await onConfirmPhoneCode(authConfirmResult!, authSmsCode); }
                                  catch (e) { setAuthError(e instanceof Error ? e.message : 'არასწორი კოდი'); }
                                  finally { setAuthBusy(false); }
                                }}>
                                {authBusy ? '...' : '✓ დადასტურება'}
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 space-y-3">
                <Button onClick={() => setStep(1)} size="lg" className="text-lg px-10 py-6 w-full">
                  {user ? '🚀 დაწყება' : 'გაგრძელება'}
                </Button>
                <Button variant="ghost" onClick={handleSkipSetup} className="text-sm text-muted-foreground">
                  გამოტოვება
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* === Step 1: შემოსავალი === */}
        {step === 1 && (
          <Card className="border-border/50 bg-card/80 backdrop-blur animate-fadeIn">
            <CardContent className="pt-6 pb-6 space-y-5">
              <div className="text-center">
                <Badge variant="warning" className="mb-2 uppercase tracking-wider text-xs">1/3</Badge>
                <CardTitle className="text-2xl font-black">შემოსავალი</CardTitle>
              </div>

              {/* ტიპის არჩევა */}
              <div className="grid grid-cols-3 gap-2">
                {([
                  { type: 'salary' as const, icon: <Briefcase className="w-5 h-5" />, label: 'ხელფასი' },
                  { type: 'freelance' as const, icon: <Rocket className="w-5 h-5" />, label: 'გამომუშავება' },
                  { type: 'both' as const, icon: <Layers className="w-5 h-5" />, label: 'ორივე' },
                ]).map(({ type, icon, label }) => (
                  <button
                    key={type}
                    onClick={() => setProfile((p) => ({ ...p, incomeType: type }))}
                    className={cn(
                      'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all',
                      profile.incomeType === type
                        ? 'border-primary bg-primary/10 scale-105'
                        : 'border-border hover:border-border/80'
                    )}
                  >
                    <span className="text-primary">{icon}</span>
                    <span className="text-xs font-black">{label}</span>
                  </button>
                ))}
              </div>

              {/* ხელფასი */}
              {needsSalary && (
                <div className="space-y-3 animate-fadeIn">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">ხელფასი (₾)</label>
                    <input
                      type="text" inputMode="numeric" placeholder="მაგ: 2000"
                      value={salaryInput} autoFocus
                      onChange={(e) => updateSalary(e.target.value.replace(/[^0-9]/g, ''))}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">რამდენჯერ ერიცხება?</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {([
                        { value: 'monthly_1' as PayFrequency, label: 'თვეში 1-ჯერ' },
                        { value: 'monthly_2' as PayFrequency, label: 'თვეში 2-ჯერ' },
                        { value: 'biweekly' as PayFrequency, label: '2 კვირაში' },
                        { value: 'weekly' as PayFrequency, label: 'კვირაში' },
                      ]).map((f) => (
                        <button key={f.value}
                          onClick={() => setProfile((p) => ({ ...p, payFrequency: f.value }))}
                          className={cn('py-2 rounded-xl border text-xs font-bold transition-all',
                            profile.payFrequency === f.value ? 'border-primary bg-primary/10 text-primary' : 'border-border'
                          )}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">სამუშაო დღეები</label>
                    <div className="flex gap-1">
                      {WEEK_DAYS.map((wd) => (
                        <button key={wd.value} onClick={() => toggleWorkDay(wd.value)}
                          className={cn('flex-1 py-2 rounded-xl text-xs font-bold border transition-all',
                            (profile.workDays || []).includes(wd.value)
                              ? 'border-primary bg-primary/20 text-primary'
                              : 'border-border text-muted-foreground'
                          )}
                        >
                          {wd.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ფრილანსი */}
              {needsDailyTarget && (
                <div className="animate-fadeIn">
                  <label className="text-sm text-muted-foreground mb-1 block">
                    {profile.incomeType === 'both' ? 'დღიური დანამატი (₾)' : 'დღიური გეგმა (₾)'}
                  </label>
                  <input
                    type="text" inputMode="numeric" placeholder="მაგ: 150"
                    value={dailyTargetInput}
                    autoFocus={profile.incomeType === 'freelance'}
                    onChange={(e) => updateDailyTarget(e.target.value.replace(/[^0-9]/g, ''))}
                    className={inputClass}
                  />
                </div>
              )}

              {/* შეჯამება */}
              {monthlyIncome > 0 && (
                <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-700/50 rounded-xl p-3 text-center">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">თვიური შემოსავალი</p>
                  <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{monthlyIncome}₾</p>
                  {dailyTarget > 0 && (
                    <p className="text-xs text-emerald-500 dark:text-emerald-400">დღიურად: {dailyTarget}₾</p>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <Button variant="secondary" onClick={() => setStep(0)} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-1" /> უკან
                </Button>
                <Button onClick={() => setStep(2)} className="flex-[2]" disabled={!canProceedStep1()}>
                  შემდეგი <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* === Step 2: ხარჯები (ყველაფერი ერთ ეკრანზე) === */}
        {step === 2 && (
          <Card className="border-border/50 bg-card/80 backdrop-blur animate-fadeIn">
            <CardContent className="pt-6 pb-6 space-y-3">
              <div className="text-center">
                <Badge variant="warning" className="mb-2 uppercase tracking-wider text-xs">2/3</Badge>
                <CardTitle className="text-2xl font-black">ყოველთვიური ხარჯები</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">დაამატე რაც გაქვს — დანარჩენს შემდეგ</p>
              </div>

              {/* === ბილები === */}
              <div className="rounded-xl border border-border overflow-hidden">
                <button onClick={() => toggleSection('bills')}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="text-sm font-bold flex items-center gap-2">
                    📅 გადასახადები
                    {Object.keys(uniqueBills).length > 0 && (
                      <Badge variant="default" className="text-[10px]">{Object.values(uniqueBills).reduce((s, a) => s + a, 0)}₾</Badge>
                    )}
                  </span>
                  {openSection === 'bills' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {openSection === 'bills' && (
                  <div className="p-3 space-y-2 border-t border-border animate-fadeIn">
                    {/* სწრაფი ღილაკები */}
                    <div className="flex flex-wrap gap-1">
                      {BILL_PRESETS.filter((p) => !uniqueBills[p.name]).map((p) => (
                        <button key={p.name}
                          onClick={() => setNewBillName(p.name)}
                          className={cn('px-2.5 py-1 rounded-full text-xs font-bold border transition-all',
                            newBillName === p.name ? 'border-primary bg-primary/10 text-primary' : 'border-border'
                          )}
                        >
                          {p.icon} {p.name}
                        </button>
                      ))}
                    </div>
                    {/* ფორმა */}
                    <div className="flex gap-1.5">
                      <Input type="text" placeholder="სახელი" value={newBillName}
                        onChange={(e) => setNewBillName(e.target.value)} className="flex-1 h-9 text-sm" />
                      <input type="text" inputMode="numeric" placeholder="₾" value={newBillAmount}
                        onChange={(e) => setNewBillAmount(e.target.value.replace(/[^0-9]/g, ''))}
                        className="w-16 h-9 rounded-xl border border-border bg-background/50 px-2 text-sm text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <input type="text" inputMode="numeric" placeholder="დღე" value={newBillDueDay}
                        onChange={(e) => setNewBillDueDay(e.target.value.replace(/[^0-9]/g, ''))}
                        onKeyDown={(e) => { if (e.key === 'Enter') addBill(); }}
                        className="w-12 h-9 rounded-xl border border-border bg-background/50 px-2 text-sm text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <Button size="icon" className="h-9 w-9 shrink-0" onClick={() => addBill()} disabled={!newBillName.trim() || !newBillAmount}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {/* სია */}
                    {Object.entries(uniqueBills).map(([name, amount]) => (
                      <div key={name} className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <span className="text-sm">{name} — <strong>{amount}₾</strong>/თვე</span>
                        <button onClick={() => removeBillGroup(name)} className="text-red-400 hover:text-red-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* === კომუნალური === */}
              <div className="rounded-xl border border-border overflow-hidden">
                <button onClick={() => toggleSection('utilities')}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="text-sm font-bold flex items-center gap-2">
                    ⚡ კომუნალური
                    {utilityTotal > 0 && <Badge variant="default" className="text-[10px]">{utilityTotal}₾</Badge>}
                  </span>
                  {openSection === 'utilities' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {openSection === 'utilities' && (
                  <div className="p-3 space-y-2 border-t border-border animate-fadeIn">
                    {UTILITY_TYPES.map((util) => (
                      <div key={util.key} className="flex items-center gap-2">
                        <span className="text-lg w-7 text-center">{util.icon}</span>
                        <span className="text-xs font-bold flex-1" style={{ color: util.color }}>{util.label}</span>
                        <input type="text" inputMode="numeric" placeholder="₾/თვე"
                          value={utilityAmounts[util.key] || ''}
                          onChange={(e) => setUtilityAmounts((prev) => ({ ...prev, [util.key]: e.target.value.replace(/[^0-9]/g, '') }))}
                          className="w-20 h-8 rounded-lg border border-border bg-background/50 px-2 text-sm text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* === ბანკი === */}
              <div className="rounded-xl border border-border overflow-hidden">
                <button onClick={() => toggleSection('bank')}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="text-sm font-bold flex items-center gap-2">
                    🏦 სესხი / განვადება
                    {bankItems.length > 0 && <Badge variant="default" className="text-[10px]">{bankItems.length}</Badge>}
                  </span>
                  {openSection === 'bank' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {openSection === 'bank' && (
                  <div className="p-3 space-y-2 border-t border-border animate-fadeIn">
                    {/* დამატებულები */}
                    {bankItems.map((item, idx) => {
                      const typeInfo = BANK_PRODUCT_TYPES.find((t) => t.key === item.type);
                      return (
                        <div key={idx} className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                          <span className="text-xs">{typeInfo?.icon} {typeInfo?.label}{item.name ? `: ${item.name}` : ''} — <strong>{item.principal}₾</strong> · {item.monthlyInterest}₾/თვე</span>
                          <button onClick={() => setBankItems((p) => p.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                    {/* ტიპი */}
                    <div className="flex flex-wrap gap-1">
                      {BANK_PRODUCT_TYPES.slice(0, 6).map((type) => (
                        <button key={type.key}
                          onClick={() => setBankType(bankType === type.key ? null : type.key)}
                          className={cn('px-2 py-1 rounded-full text-[10px] font-bold border transition-all',
                            bankType === type.key ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'border-border'
                          )}
                        >
                          {type.icon} {type.label}
                        </button>
                      ))}
                    </div>
                    {bankType && (
                      <div className="space-y-1.5 animate-fadeIn">
                        <Input type="text" placeholder="სახელი (არასავალდ.)" value={bankName}
                          onChange={(e) => setBankName(e.target.value)} className="h-8 text-xs" />
                        <div className="flex gap-1.5">
                          <input type="text" inputMode="numeric" placeholder="ძირი ₾" value={bankPrincipal}
                            onChange={(e) => setBankPrincipal(e.target.value.replace(/[^0-9]/g, ''))}
                            className="flex-1 h-8 rounded-lg border border-border bg-background/50 px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                          <input type="text" inputMode="numeric" placeholder="თვეში ₾" value={bankInterest}
                            onChange={(e) => setBankInterest(e.target.value.replace(/[^0-9]/g, ''))}
                            className="flex-1 h-8 rounded-lg border border-border bg-background/50 px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                        </div>
                        <div className="flex gap-1.5">
                          <input type="text" inputMode="numeric" placeholder="დღე (1-31)" value={bankPayDay}
                            onChange={(e) => setBankPayDay(e.target.value.replace(/[^0-9]/g, ''))}
                            className="flex-1 h-8 rounded-lg border border-border bg-background/50 px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                          <input type="text" inputMode="numeric" placeholder="სულ თვე" value={bankTotalMonths}
                            onChange={(e) => setBankTotalMonths(e.target.value.replace(/[^0-9]/g, ''))}
                            className="flex-1 h-8 rounded-lg border border-border bg-background/50 px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                          <input type="text" inputMode="numeric" placeholder="გადახდილი" value={bankPaidMonths}
                            onChange={(e) => setBankPaidMonths(e.target.value.replace(/[^0-9]/g, ''))}
                            className="flex-1 h-8 rounded-lg border border-border bg-background/50 px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                        </div>
                        <Button onClick={addBankItem} size="sm" className="w-full h-8 text-xs" disabled={!bankPrincipal || !bankInterest}>
                          <Plus className="w-3 h-3 mr-1" /> დამატება
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* === ლომბარდი === */}
              <div className="rounded-xl border border-border overflow-hidden">
                <button onClick={() => toggleSection('lombard')}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="text-sm font-bold flex items-center gap-2">
                    🏪 ლომბარდი
                    {lombardItems.length > 0 && <Badge variant="default" className="text-[10px]">{lombardItems.length}</Badge>}
                  </span>
                  {openSection === 'lombard' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {openSection === 'lombard' && (
                  <div className="p-3 space-y-2 border-t border-border animate-fadeIn">
                    {lombardItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <span className="text-xs">🏪 {item.itemName} — <strong>{item.principal}₾</strong> · {item.monthlyInterest}₾/თვე</span>
                        <button onClick={() => setLombardItems((p) => p.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <div className="space-y-1.5">
                      <Input type="text" placeholder="ნივთის სახელი" value={lombItemName}
                        onChange={(e) => setLombItemName(e.target.value)} className="h-8 text-xs" />
                      <div className="flex gap-1.5">
                        <input type="text" inputMode="numeric" placeholder="ძირი ₾" value={lombPrincipal}
                          onChange={(e) => setLombPrincipal(e.target.value.replace(/[^0-9]/g, ''))}
                          className="flex-1 h-8 rounded-lg border border-border bg-background/50 px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                        <input type="text" inputMode="numeric" placeholder="% თვეში ₾" value={lombInterest}
                          onChange={(e) => setLombInterest(e.target.value.replace(/[^0-9]/g, ''))}
                          className="flex-1 h-8 rounded-lg border border-border bg-background/50 px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                        <input type="text" inputMode="numeric" placeholder="დღე" value={lombPayDay}
                          onChange={(e) => setLombPayDay(e.target.value.replace(/[^0-9]/g, ''))}
                          onKeyDown={(e) => { if (e.key === 'Enter') addLombardItem(); }}
                          className="w-14 h-8 rounded-lg border border-border bg-background/50 px-2 text-xs text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                      </div>
                      <Button onClick={addLombardItem} size="sm" className="w-full h-8 text-xs" disabled={!lombItemName.trim() || !lombPrincipal || !lombInterest}>
                        <Plus className="w-3 h-3 mr-1" /> დამატება
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* ჯამი */}
              {totalMonthlyExpenses > 0 && (
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-700/50 rounded-xl p-2.5 text-center">
                  <p className="text-xs text-red-600 dark:text-red-400">სულ ყოველთვიური ხარჯი</p>
                  <p className="text-xl font-black text-red-700 dark:text-red-300">{totalMonthlyExpenses}₾</p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-1" /> უკან
                </Button>
                <Button onClick={() => setStep(3)} className="flex-[2]">
                  {totalMonthlyExpenses === 0 ? 'გამოტოვება' : 'შემდეგი'} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* === Step 3: მზადაა === */}
        {step === 3 && (
          <Card className="border-border/50 bg-card/80 backdrop-blur animate-fadeIn">
            <CardContent className="pt-6 pb-6 space-y-5">
              <div className="text-center">
                <Badge variant="warning" className="mb-2 uppercase tracking-wider text-xs">3/3</Badge>
                <CardTitle className="text-2xl font-black">მზადაა! 🎉</CardTitle>
              </div>

              {/* მთავარი ციფრები */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border-2 border-emerald-500/50 bg-emerald-500/10 p-4 text-center">
                  <p className="text-emerald-600 dark:text-emerald-400 text-xs mb-1">შემოსავალი</p>
                  <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{monthlyIncome}₾</p>
                  <p className="text-emerald-500 text-[10px] mt-0.5">თვეში</p>
                </div>
                <div className="rounded-xl border-2 border-primary/50 bg-primary/10 p-4 text-center">
                  <p className="text-primary/80 text-xs mb-1">ბიუჯეტი</p>
                  <p className="text-3xl font-black text-primary">{dailyBudget}₾</p>
                  <p className="text-primary/50 text-[10px] mt-0.5">დღეში</p>
                </div>
              </div>

              {/* დეტალები */}
              <div className="space-y-1.5 text-sm">
                {needsSalary && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">💼 ხელფასი:</span>
                    <span className="font-bold text-emerald-600">{profile.salary}₾</span>
                  </div>
                )}
                {needsDailyTarget && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">📊 დღიური გეგმა:</span>
                    <span className="font-bold text-emerald-600">{dailyTarget}₾</span>
                  </div>
                )}
                {Object.keys(uniqueBills).length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">📅 გადასახადები:</span>
                    <span className="font-bold text-red-500">{Object.values(uniqueBills).reduce((s, a) => s + a, 0)}₾/თვე</span>
                  </div>
                )}
                {utilityTotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">⚡ კომუნალური:</span>
                    <span className="font-bold text-red-500">{utilityTotal}₾/თვე</span>
                  </div>
                )}
                {bankItems.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">🏦 სესხები:</span>
                    <span className="font-bold text-red-500">{bankMonthlyTotal}₾/თვე</span>
                  </div>
                )}
                {lombardItems.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">🏪 ლომბარდი:</span>
                    <span className="font-bold text-red-500">{lombardMonthlyTotal}₾/თვე</span>
                  </div>
                )}
                {monthlyIncome > 0 && (
                  <div className="flex justify-between pt-1.5 border-t border-border">
                    <span className="text-muted-foreground font-bold">თავისუფალი:</span>
                    <span className={cn('font-black', monthlyIncome - totalMonthlyExpenses >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                      {monthlyIncome - totalMonthlyExpenses}₾/თვე
                    </span>
                  </div>
                )}
              </div>

              {/* ჯიბეში ფული — ახლა რამდენი გაქვს? */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-700">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">👛</span>
                  <div>
                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">ახლა რამდენი გაქვს ჯიბეში?</p>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400">ახლა ხელთ რამდენი ნაღდი ფული გაქვს (ან ბარათზე)</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={walletInput}
                    onChange={e => setWalletInput(e.target.value)}
                    placeholder="0"
                    className={cn(inputClass, 'flex-1 text-lg font-bold text-emerald-700 dark:text-emerald-300')}
                  />
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold text-lg">₾</span>
                </div>
                <p className="text-[10px] text-emerald-500 dark:text-emerald-500 mt-1.5">
                  * სავალდებულო არ არის — მოგვიანებით შეგიძლია შეიყვანო
                </p>
              </div>

              {/* სამოტივაციო წერილი */}
              <div className="space-y-2 p-3 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800">
                <div className="text-center">
                  <span className="text-lg">💌</span>
                  <p className="text-sm font-bold text-purple-700 dark:text-purple-300">დაუწერე წერილი შენს თავს</p>
                  <p className="text-[10px] text-purple-500 dark:text-purple-400">ეს შეტყობინება ყოველდღე გაგიხსენებს შენს მიზნებს</p>
                </div>
                <textarea
                  value={profile.motivationalMessage || ''}
                  onChange={e => setProfile({ ...profile, motivationalMessage: e.target.value })}
                  className={cn(inputClass, 'min-h-[80px] resize-none text-sm')}
                  placeholder="მაგ: შენ ამას შეძლებ! გააგრძელე და არასოდეს არ დანებდე. შენი ოცნება ახდება! 💪"
                />
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-purple-600 dark:text-purple-400">⏰ რა საათზე გაგახსენო?</span>
                  <select
                    value={profile.motivationHour ?? 9}
                    onChange={e => setProfile({ ...profile, motivationHour: parseInt(e.target.value) })}
                    className="bg-white dark:bg-slate-800 text-sm px-2 py-1 rounded-lg border border-purple-200 dark:border-purple-700"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="secondary" onClick={() => setStep(2)} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-1" /> უკან
                </Button>
                <Button onClick={handleFinish} size="lg" className="flex-[2] text-lg py-6">
                  🏺 დაწყება! <Check className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* პროგრესი */}
        {step > 0 && (
          <div className="flex justify-center gap-2 mt-8">
            {[1, 2, 3].map((s) => (
              <div key={s}
                className={cn('h-2 rounded-full transition-all duration-300',
                  s <= step ? 'w-10 bg-primary' : 'w-4 bg-muted'
                )}
              />
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
