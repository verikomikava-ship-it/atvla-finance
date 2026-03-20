import React, { useState } from 'react';
import { User, ConfirmationResult } from 'firebase/auth';
import { UserProfile, PayFrequency, Bill, Debt, Lombard, BankLoan, BankProductType, BANK_PRODUCT_TYPES, UTILITY_TYPES } from '../types';
import { getWorkDaysInMonth } from '../utils/calculations';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Briefcase, Rocket, Layers, ArrowLeft, ArrowRight, Plus, X, Check, Calendar, Package, Landmark, Cloud, CloudOff } from 'lucide-react';

// ყოველთვიური გადასახადის კატეგორიები (სესხი ამოიღო — ცალკე "ბანკი" step-ში გადავიდა)
const BILL_CATEGORIES = [
  { key: 'კომუნალური', label: 'კომუნალური', icon: '🏠', color: '#14b8a6', hasSubTypes: true },
  { key: 'ქირა', label: 'ქირა', icon: '🏢', color: '#8b5cf6' },
  { key: 'ინტერნეტი', label: 'ინტერნეტი', icon: '🌐', color: '#3b82f6' },
  { key: 'დაზღვევა', label: 'დაზღვევა', icon: '🛡️', color: '#f59e0b' },
  { key: 'ტელეფონი', label: 'ტელეფონი', icon: '📱', color: '#06b6d4' },
  { key: 'გამოწერები', label: 'გამოწერები', icon: '🔄', color: '#a855f7' },
  { key: 'სხვა', label: 'სხვა', icon: '📝', color: '#64748b' },
] as const;

interface SetupWizardProps {
  onComplete: (profile: UserProfile, bills: Bill[], debts?: Debt[], lombards?: Lombard[], bankLoans?: BankLoan[]) => void;
  // Auth props
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

const DEFAULT_WORK_DAYS = [1, 2, 3, 4, 5]; // ორშაბათი-პარასკევი

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

export const SetupWizard: React.FC<SetupWizardProps> = ({
  onComplete, user, authLoading,
  onSignInWithGoogle, onSignInWithEmail, onSignUpWithEmail,
  onSendPhoneCode, onConfirmPhoneCode,
}) => {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [bills, setBills] = useState<Bill[]>([]);

  // Auth state (step 0.5)
  const [authTab, setAuthTab] = useState<'google' | 'email' | 'phone'>('google');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authIsSignUp, setAuthIsSignUp] = useState(false);
  const [authPhone, setAuthPhone] = useState('+995');
  const [authConfirmResult, setAuthConfirmResult] = useState<ConfirmationResult | null>(null);
  const [authSmsCode, setAuthSmsCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  // String state ინფუთებისთვის (Electron-ში number value არ მუშაობს)
  const [salaryInput, setSalaryInput] = useState('');
  const [dailyTargetInput, setDailyTargetInput] = useState('');
  const [newBillName, setNewBillName] = useState('');
  const [newBillAmount, setNewBillAmount] = useState('');
  const [newBillDueDay, setNewBillDueDay] = useState('');
  const [selectedBillCategory, setSelectedBillCategory] = useState<string | null>(null);
  const [selectedUtilityType, setSelectedUtilityType] = useState<string | null>(null);
  const [customBillName, setCustomBillName] = useState('');
  const [newAiName, setNewAiName] = useState('');
  const [newAiAmount, setNewAiAmount] = useState('');
  const [newAiFrequency, setNewAiFrequency] = useState<'monthly' | 'weekly' | 'daily'>('monthly');

  // ლობარდის state
  const [lombardItems, setLombardItems] = useState<{
    itemName: string; principal: number; monthlyInterest: number;
    contractNumber?: string; paymentDay: number;
  }[]>([]);
  const [lombItemName, setLombItemName] = useState('');
  const [lombPrincipal, setLombPrincipal] = useState('');
  const [lombInterest, setLombInterest] = useState('');
  const [lombContract, setLombContract] = useState('');
  const [lombPayDay, setLombPayDay] = useState('');

  // ბანკი state
  const [bankItems, setBankItems] = useState<{
    type: BankProductType; name?: string; principal: number;
    monthlyInterest: number; paymentDay: number; startDate: string; endDate: string;
  }[]>([]);
  const [bankType, setBankType] = useState<BankProductType | null>(null);
  const [bankName, setBankName] = useState('');
  const [bankPrincipal, setBankPrincipal] = useState('');
  const [bankInterest, setBankInterest] = useState('');
  const [bankPayDay, setBankPayDay] = useState('');
  const [bankStart, setBankStart] = useState('');
  const [bankEnd, setBankEnd] = useState('');

  // სინქრონიზაცია: string → profile number
  const updateSalary = (val: string) => {
    setSalaryInput(val);
    setProfile((p) => ({ ...p, salary: Math.max(0, parseInt(val) || 0) }));
  };

  const updateDailyTarget = (val: string) => {
    setDailyTargetInput(val);
    setProfile((p) => ({ ...p, dailyTarget: Math.max(0, parseInt(val) || 0) }));
  };

  const toggleWorkDay = (day: number) => {
    setProfile((p) => {
      const current = p.workDays || [];
      const next = current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day];
      return { ...p, workDays: next };
    });
  };

  // უნიკალური ბილები
  const uniqueBills = bills.reduce<Record<string, number>>((acc, b) => {
    acc[b.name] = b.amount;
    return acc;
  }, {});
  const monthlyBillsTotal = Object.values(uniqueBills).reduce((sum, amount) => sum + amount, 0);

  // სამუშაო დღეები ამ თვეში
  const now = new Date();
  const workDaysInMonth = getWorkDaysInMonth(now.getFullYear(), now.getMonth(), profile.workDays || DEFAULT_WORK_DAYS);

  // თვიური შემოსავალი
  const getMonthlyIncome = (): number => {
    let monthly = 0;

    if (profile.incomeType === 'salary' || profile.incomeType === 'both') {
      monthly += profile.salary;
    }
    if (profile.incomeType === 'freelance') {
      monthly += (profile.dailyTarget || 0) * 30;
    }
    if (profile.incomeType === 'both') {
      monthly += (profile.dailyTarget || 0) * 30;
    }

    profile.additionalIncomes.forEach((ai) => {
      switch (ai.frequency) {
        case 'monthly': monthly += ai.amount; break;
        case 'weekly': monthly += (ai.amount * 52) / 12; break;
        case 'daily': monthly += ai.amount * 30; break;
      }
    });

    return Math.round(monthly);
  };

  const monthlyIncome = getMonthlyIncome();

  // დღიური ხელფასი (სამუშაო დღეებზე)
  const dailySalary = profile.salary > 0 ? Math.round(profile.salary / workDaysInMonth) : 0;

  // დღიური გეგმა სამუშაო დღეზე
  const getDailyTarget = (): number => {
    if (profile.incomeType === 'freelance') {
      return profile.dailyTarget || 0;
    }
    if (profile.incomeType === 'salary') {
      return dailySalary;
    }
    // both
    return dailySalary + (profile.dailyTarget || 0);
  };

  const dailyTarget = getDailyTarget();
  // ბიუჯეტი = (თვიური შემოსავალი - ბილები) / 30
  const dailyBudget = Math.round((monthlyIncome - monthlyBillsTotal) / 30);

  const addAdditionalIncome = () => {
    if (!newAiName.trim() || !newAiAmount) return;
    setProfile((prev) => ({
      ...prev,
      additionalIncomes: [
        ...prev.additionalIncomes,
        {
          id: Date.now(),
          name: newAiName.trim(),
          amount: Math.max(0, parseInt(newAiAmount) || 0),
          frequency: newAiFrequency,
        },
      ],
    }));
    setNewAiName('');
    setNewAiAmount('');
  };

  const removeAdditionalIncome = (id: number) => {
    setProfile((prev) => ({
      ...prev,
      additionalIncomes: prev.additionalIncomes.filter((ai) => ai.id !== id),
    }));
  };

  const addBill = () => {
    if (!newBillName.trim() || !newBillAmount) return;
    const ts = Date.now();
    const currentYear = new Date().getFullYear();
    const dueDay = parseInt(newBillDueDay) || 1;
    const billsToAdd: Bill[] = [];

    for (let month = 0; month < 12; month++) {
      const lastDayOfMonth = new Date(currentYear, month + 1, 0).getDate();
      const actualDay = Math.min(dueDay, lastDayOfMonth);
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(actualDay).padStart(2, '0');

      billsToAdd.push({
        id: ts + month,
        name: newBillName.trim(),
        amount: Math.max(0, parseInt(newBillAmount) || 0),
        date: '',
        paid: false,
        reset_month: month,
        dueDate: `${currentYear}-${monthStr}-${dayStr}`,
        isRecurring: true,
      });
    }

    setBills((prev) => [...prev, ...billsToAdd]);
    setNewBillName('');
    setNewBillAmount('');
    setNewBillDueDay('');
    setSelectedBillCategory(null);
    setSelectedUtilityType(null);
    setCustomBillName('');
  };

  const selectBillCategory = (key: string) => {
    setSelectedBillCategory(key);
    setSelectedUtilityType(null);
    const cat = BILL_CATEGORIES.find((c) => c.key === key);
    if (cat && key !== 'კომუნალური' && key !== 'სხვა') {
      setNewBillName(cat.label);
    } else if (key === 'სხვა') {
      setNewBillName('');
    }
  };

  const selectUtilitySubType = (utilKey: string) => {
    setSelectedUtilityType(utilKey);
    const util = UTILITY_TYPES.find((u) => u.key === utilKey);
    setNewBillName(`კომუნალური: ${util?.label || utilKey}`);
  };

  const removeBillGroup = (name: string) => {
    setBills((prev) => prev.filter((b) => b.name !== name));
  };

  // ლობარდის ფუნქციები
  const addLombardItem = () => {
    const name = lombItemName.trim();
    const pr = parseInt(lombPrincipal) || 0;
    const interest = parseInt(lombInterest) || 0;
    const day = parseInt(lombPayDay) || 0;
    if (!name) { alert('შეიყვანე ნივთის დასახელება'); return; }
    if (pr <= 0) { alert('შეიყვანე სწორი ძირი თანხა'); return; }
    if (interest <= 0) { alert('შეიყვანე სწორი ყოველთვიური პროცენტი'); return; }
    if (day < 1 || day > 31) { alert('შეიყვანე გადახდის დღე (1-31)'); return; }
    setLombardItems((prev) => [...prev, {
      itemName: name, principal: pr, monthlyInterest: interest,
      contractNumber: lombContract.trim() || undefined, paymentDay: day,
    }]);
    setLombItemName(''); setLombPrincipal(''); setLombInterest('');
    setLombContract(''); setLombPayDay('');
  };

  const removeLombardItem = (index: number) => {
    setLombardItems((prev) => prev.filter((_, i) => i !== index));
  };

  // ბანკის ფუნქციები
  const addBankItem = () => {
    if (!bankType) { alert('აირჩიე პროდუქტის ტიპი'); return; }
    if (bankType === 'სხვა' && !bankName.trim()) { alert('შეიყვანე სესხის სახელი'); return; }
    const pr = parseInt(bankPrincipal) || 0;
    const interest = parseInt(bankInterest) || 0;
    const day = parseInt(bankPayDay) || 0;
    if (pr <= 0) { alert('შეიყვანე სწორი ძირი თანხა'); return; }
    if (interest <= 0) { alert('შეიყვანე სწორი პროცენტის თანხა'); return; }
    if (day < 1 || day > 31) { alert('შეიყვანე გადახდის დღე (1-31)'); return; }
    if (!bankStart || !bankEnd) { alert('შეიყვანე ვადა'); return; }
    if (bankStart > bankEnd) { alert('დასაწყისი უნდა იყოს დასასრულამდე'); return; }
    setBankItems((prev) => [...prev, {
      type: bankType, name: bankName.trim() || undefined, principal: pr,
      monthlyInterest: interest, paymentDay: day, startDate: bankStart, endDate: bankEnd,
    }]);
    setBankType(null); setBankName(''); setBankPrincipal(''); setBankInterest('');
    setBankPayDay(''); setBankStart(''); setBankEnd('');
  };

  const removeBankItem = (index: number) => {
    setBankItems((prev) => prev.filter((_, i) => i !== index));
  };

  const bankMonthsBetween = (start: string, end: string): number => {
    const [sy, sm] = start.split('-').map(Number);
    const [ey, em] = end.split('-').map(Number);
    return (ey - sy) * 12 + (em - sm) + 1;
  };

  const handleFinish = () => {
    const finalProfile: UserProfile = {
      ...profile,
      dailyTarget,
      dailyBudget,
      setupCompleted: true,
    };

    // ლობარდების გენერაცია: debts + bills + lombard records
    const setupDebts: Debt[] = [];
    const setupLombards: Lombard[] = [];
    const lombardBills: Bill[] = [];
    const currentYear = new Date().getFullYear();
    const today = new Date().toISOString().split('T')[0];

    lombardItems.forEach((item, idx) => {
      const baseId = Date.now() + idx * 1000;
      const debtId = baseId;
      const billIds: number[] = [];

      // ვალი (ძირი თანხა)
      setupDebts.push({
        id: debtId,
        name: `🏪 ლობარდი: ${item.itemName}`,
        amount: item.principal,
        paid: false,
        priority: 'high',
        paidAmount: 0,
      });

      // 12 ბილი (ყოველთვიური პროცენტი)
      for (let month = 0; month < 12; month++) {
        const billId = baseId + 1 + month;
        billIds.push(billId);
        const lastDay = new Date(currentYear, month + 1, 0).getDate();
        const actualDay = Math.min(item.paymentDay, lastDay);
        const monthStr = String(month + 1).padStart(2, '0');
        const dayStr = String(actualDay).padStart(2, '0');
        lombardBills.push({
          id: billId,
          name: `🏪 ლობარდი %: ${item.itemName}`,
          amount: item.monthlyInterest,
          date: '',
          paid: false,
          reset_month: month,
          dueDate: `${currentYear}-${monthStr}-${dayStr}`,
        });
      }

      setupLombards.push({
        id: baseId + 100,
        itemName: item.itemName,
        principal: item.principal,
        monthlyInterest: item.monthlyInterest,
        contractNumber: item.contractNumber,
        paymentDay: item.paymentDay,
        debtId,
        billIds,
        active: true,
        createdAt: today,
      });
    });

    // ბანკის პროდუქტების გენერაცია
    const setupBankLoans: BankLoan[] = [];
    bankItems.forEach((item, idx) => {
      const bankBaseId = Date.now() + 500000 + idx * 1000;
      const bankDebtId = bankBaseId;
      const bankBillIds: number[] = [];
      const [bsy, bsm] = item.startDate.split('-').map(Number);
      const [bey, bem] = item.endDate.split('-').map(Number);
      const bTotalMonths = (bey - bsy) * 12 + (bem - bsm) + 1;
      const bLabel = item.name ? `${item.type}: ${item.name}` : item.type;

      setupDebts.push({
        id: bankDebtId,
        name: `🏦 ${bLabel}`,
        amount: item.principal,
        paid: false,
        priority: 'high',
        paidAmount: 0,
        parts: bTotalMonths,
        paidParts: 0,
      });

      for (let month = 0; month < 12; month++) {
        const bBillId = bankBaseId + 1 + month;
        bankBillIds.push(bBillId);
        const bLastDay = new Date(currentYear, month + 1, 0).getDate();
        const bActualDay = Math.min(item.paymentDay, bLastDay);
        const bMonthStr = String(month + 1).padStart(2, '0');
        const bDayStr = String(bActualDay).padStart(2, '0');
        lombardBills.push({
          id: bBillId,
          name: `🏦 ${bLabel} %`,
          amount: item.monthlyInterest,
          date: '',
          paid: false,
          reset_month: month,
          dueDate: `${currentYear}-${bMonthStr}-${bDayStr}`,
        });
      }

      setupBankLoans.push({
        id: bankBaseId + 100,
        type: item.type,
        name: item.name,
        principal: item.principal,
        monthlyInterest: item.monthlyInterest,
        paymentDay: item.paymentDay,
        startDate: item.startDate,
        endDate: item.endDate,
        totalMonths: bTotalMonths,
        debtId: bankDebtId,
        billIds: bankBillIds,
        active: true,
        createdAt: today,
      });
    });

    onComplete(finalProfile, [...bills, ...lombardBills], setupDebts, setupLombards, setupBankLoans);
  };

  // ინსტალაციის გამოტოვება — default პროფილით
  const handleSkipSetup = () => {
    const skipProfile: UserProfile = {
      ...DEFAULT_PROFILE,
      dailyBudget: 150,
      setupCompleted: true,
    };
    onComplete(skipProfile, []);
  };

  // ვალიდაცია: შემდეგ ღილაკის ჩართვა
  const canProceedStep2 = (): boolean => {
    if (profile.incomeType === 'salary') return profile.salary > 0;
    if (profile.incomeType === 'freelance') return (profile.dailyTarget || 0) > 0;
    return profile.salary > 0; // 'both': ხელფასი სავალდებულო, დანამატი არა
  };

  // საჭირო ტიპები step2-ისთვის
  const needsSalary = profile.incomeType === 'salary' || profile.incomeType === 'both';
  const needsDailyTarget = profile.incomeType === 'freelance' || profile.incomeType === 'both';
  const needsWorkDays = profile.incomeType === 'salary' || profile.incomeType === 'both';

  const nativeInputClass = "flex h-10 w-full rounded-xl border border-border bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 transition-colors";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Step 0: მისასალმებელი + ავტორიზაცია */}
        {step === 0 && (
          <Card className="border-border/50 bg-card/80 backdrop-blur animate-fadeIn">
            <CardContent className="pt-8 pb-8 text-center space-y-6">
              <div className="text-6xl mb-4">🏺</div>
              <CardTitle className="text-3xl font-black text-blue-600">ჩემი ფინანსები</CardTitle>
              <CardDescription className="text-base">
                მართე შენი ყოველდღიური ფინანსები, დააგროვე კულაბაში და მიაღწიე შენს მიზანს
              </CardDescription>

              {/* ავტორიზაციის სექცია */}
              {!authLoading && (
                <div className="pt-2">
                  {user ? (
                    // შესულია
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
                      <p className="text-xs text-emerald-500 dark:text-emerald-400">შენი მონაცემები ავტომატურად შეინახება ღრუბელში</p>
                    </div>
                  ) : (
                    // არ არის შესული — რეგისტრაციის შეთავაზება
                    <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400">
                        <CloudOff className="w-5 h-5" />
                        <span className="font-bold text-sm">ღრუბლის სინქრონიზაცია</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        თუ გაივლი რეგისტრაციას, შენი მონაცემები შეინახება ღრუბელში და <strong className="text-slate-800 dark:text-slate-200">ყველა მოწყობილობაზე</strong> (ტელეფონი, ლეპტოპი, ტაბლეტი) სინქრონიზდება ავტომატურად.
                      </p>

                      {/* Auth tabs */}
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
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 border border-transparent'
                            )}
                          >
                            <span className="text-sm">{t.icon}</span> {t.label}
                          </button>
                        ))}
                      </div>

                      {authError && (
                        <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 p-2 rounded-xl">{authError}</p>
                      )}

                      {/* Google */}
                      {authTab === 'google' && (
                        <Button
                          className="w-full"
                          disabled={authBusy}
                          onClick={async () => {
                            setAuthError('');
                            setAuthBusy(true);
                            try { await onSignInWithGoogle(); }
                            catch (e) { setAuthError(e instanceof Error ? e.message : 'შეცდომა'); }
                            finally { setAuthBusy(false); }
                          }}
                        >
                          🔵 {authBusy ? 'იტვირთება...' : 'Google-ით შესვლა'}
                        </Button>
                      )}

                      {/* Email */}
                      {authTab === 'email' && (
                        <div className="space-y-2">
                          <input
                            type="email" placeholder="ელ-ფოსტა" value={authEmail}
                            onChange={(e) => setAuthEmail(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm outline-none focus:border-blue-500"
                          />
                          <input
                            type="password" placeholder="პაროლი (6+ სიმბოლო)" value={authPassword}
                            onChange={(e) => setAuthPassword(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm outline-none focus:border-blue-500"
                          />
                          <Button
                            className="w-full" disabled={authBusy || !authEmail || authPassword.length < 6}
                            onClick={async () => {
                              setAuthError('');
                              setAuthBusy(true);
                              try {
                                if (authIsSignUp) await onSignUpWithEmail(authEmail, authPassword);
                                else await onSignInWithEmail(authEmail, authPassword);
                              } catch (e) {
                                const msg = e instanceof Error ? e.message : 'შეცდომა';
                                if (msg.includes('wrong-password') || msg.includes('invalid-credential')) setAuthError('არასწორი პაროლი');
                                else if (msg.includes('user-not-found')) setAuthError('მომხმარებელი ვერ მოიძებნა');
                                else if (msg.includes('email-already')) setAuthError('ეს ელ-ფოსტა უკვე რეგისტრირებულია');
                                else setAuthError(msg);
                              } finally { setAuthBusy(false); }
                            }}
                          >
                            📧 {authBusy ? 'იტვირთება...' : authIsSignUp ? 'რეგისტრაცია' : 'შესვლა'}
                          </Button>
                          <button
                            onClick={() => { setAuthIsSignUp(!authIsSignUp); setAuthError(''); }}
                            className="text-xs text-slate-500 dark:text-slate-400 underline w-full text-center"
                          >
                            {authIsSignUp ? 'უკვე მაქვს ანგარიში' : 'არ მაქვს ანგარიში — რეგისტრაცია'}
                          </button>
                        </div>
                      )}

                      {/* Phone */}
                      {authTab === 'phone' && (
                        <div className="space-y-2">
                          {!authConfirmResult ? (
                            <>
                              <input
                                type="tel" value={authPhone} onChange={(e) => setAuthPhone(e.target.value)}
                                placeholder="+995 5XX XXX XXX"
                                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm outline-none focus:border-blue-500"
                              />
                              <Button
                                className="w-full" disabled={authBusy || authPhone.length < 9}
                                onClick={async () => {
                                  setAuthError('');
                                  setAuthBusy(true);
                                  try {
                                    const result = await onSendPhoneCode(authPhone, 'setup-recaptcha');
                                    setAuthConfirmResult(result);
                                  } catch (e) {
                                    const msg = e instanceof Error ? e.message : 'შეცდომა';
                                    if (msg.includes('not-allowed')) setAuthError('SMS ამ რეგიონში მიუწვდომელია');
                                    else setAuthError(msg);
                                  } finally { setAuthBusy(false); }
                                }}
                              >
                                📱 {authBusy ? 'იგზავნება...' : 'კოდის გაგზავნა'}
                              </Button>
                            </>
                          ) : (
                            <>
                              <p className="text-xs text-slate-500 dark:text-slate-400">SMS კოდი გამოგზავნილია</p>
                              <input
                                type="text" value={authSmsCode} onChange={(e) => setAuthSmsCode(e.target.value)}
                                placeholder="6-ნიშნა კოდი" maxLength={6}
                                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm text-center tracking-widest outline-none focus:border-blue-500"
                              />
                              <Button
                                className="w-full" disabled={authBusy || authSmsCode.length < 6}
                                onClick={async () => {
                                  setAuthError('');
                                  setAuthBusy(true);
                                  try { await onConfirmPhoneCode(authConfirmResult!, authSmsCode); }
                                  catch { setAuthError('არასწორი კოდი'); }
                                  finally { setAuthBusy(false); }
                                }}
                              >
                                {authBusy ? 'მოწმდება...' : 'დადასტურება'}
                              </Button>
                            </>
                          )}
                          <div id="setup-recaptcha" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 space-y-3">
                <Button onClick={() => setStep(1)} size="lg" className="text-lg px-10 py-6">
                  {user ? 'დაწყება' : 'გაგრძელება რეგისტრაციის გარეშე'}
                </Button>
                {!user && (
                  <p className="text-muted-foreground/40 text-[10px]">
                    რეგისტრაციის გარეშე მონაცემები მხოლოდ ამ მოწყობილობაზე შეინახება
                  </p>
                )}
                <div>
                  <Button variant="ghost" onClick={handleSkipSetup} className="text-sm text-muted-foreground hover:text-slate-800 dark:hover:text-slate-200">
                    გამოტოვება — ხელით შევავსებ
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 1: შემოსავლის ტიპი */}
        {step === 1 && (
          <Card className="border-border/50 bg-card/80 backdrop-blur animate-fadeIn">
            <CardHeader className="text-center">
              <Badge variant="warning" className="mx-auto mb-2 uppercase tracking-wider text-xs">ნაბიჯი 1/6</Badge>
              <CardTitle className="text-2xl font-black">როგორ იღებ შემოსავალს?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-3">
                <Card
                  className={cn(
                    'cursor-pointer transition-all hover:scale-105 border-2',
                    profile.incomeType === 'salary'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-border/80'
                  )}
                  onClick={() => {
                    setProfile((p) => ({ ...p, incomeType: 'salary' }));
                    setStep(2);
                  }}
                >
                  <CardContent className="pt-5 pb-5 text-center">
                    <Briefcase className="w-7 h-7 mx-auto mb-2 text-primary" />
                    <h3 className="text-sm font-black">ხელფასი</h3>
                    <p className="text-[10px] text-muted-foreground mt-1">ფიქსირებული</p>
                  </CardContent>
                </Card>

                <Card
                  className={cn(
                    'cursor-pointer transition-all hover:scale-105 border-2',
                    profile.incomeType === 'freelance'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-border/80'
                  )}
                  onClick={() => {
                    setProfile((p) => ({ ...p, incomeType: 'freelance' }));
                    setStep(2);
                  }}
                >
                  <CardContent className="pt-5 pb-5 text-center">
                    <Rocket className="w-7 h-7 mx-auto mb-2 text-primary" />
                    <h3 className="text-sm font-black">გამომუშავება</h3>
                    <p className="text-[10px] text-muted-foreground mt-1">ფრილანსი</p>
                  </CardContent>
                </Card>

                <Card
                  className={cn(
                    'cursor-pointer transition-all hover:scale-105 border-2',
                    profile.incomeType === 'both'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-border/80'
                  )}
                  onClick={() => {
                    setProfile((p) => ({ ...p, incomeType: 'both' }));
                    setStep(2);
                  }}
                >
                  <CardContent className="pt-5 pb-5 text-center">
                    <Layers className="w-7 h-7 mx-auto mb-2 text-primary" />
                    <h3 className="text-sm font-black">ორივე</h3>
                    <p className="text-[10px] text-muted-foreground mt-1">ხელფასი + დანამატი</p>
                  </CardContent>
                </Card>
              </div>

              <Button variant="secondary" onClick={() => setStep(0)} className="w-full mt-4">
                <ArrowLeft className="w-4 h-4 mr-2" /> უკან
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: შემოსავლის დეტალები */}
        {step === 2 && (
          <Card className="border-border/50 bg-card/80 backdrop-blur animate-fadeIn">
            <CardHeader className="text-center">
              <Badge variant="warning" className="mx-auto mb-2 uppercase tracking-wider text-xs">ნაბიჯი 2/6</Badge>
              <CardTitle className="text-2xl font-black">
                {profile.incomeType === 'salary' && 'ხელფასის დეტალები'}
                {profile.incomeType === 'freelance' && 'გამომუშავების გეგმა'}
                {profile.incomeType === 'both' && 'შემოსავლის დეტალები'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* ხელფასი (salary + both) */}
              {needsSalary && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">ხელფასი ({'\u20BE'})</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="მაგ: 2000"
                      value={salaryInput}
                      onChange={(e) => updateSalary(e.target.value.replace(/[^0-9]/g, ''))}
                      autoFocus
                      className={nativeInputClass}
                    />
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">რამდენჯერ ერიცხება?</label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { value: 'monthly_1', label: 'თვეში 1-ჯერ' },
                        { value: 'monthly_2', label: 'თვეში 2-ჯერ' },
                        { value: 'biweekly', label: '2 კვირაში 1-ჯერ' },
                        { value: 'weekly', label: 'კვირაში 1-ჯერ' },
                      ] as { value: PayFrequency; label: string }[]).map((freq) => (
                        <Button
                          key={freq.value}
                          variant="outline"
                          onClick={() => setProfile((p) => ({ ...p, payFrequency: freq.value }))}
                          className={cn(
                            'h-auto py-2.5 text-sm font-bold',
                            profile.payFrequency === freq.value
                              ? 'border-primary bg-primary/10 text-primary'
                              : ''
                          )}
                        >
                          <Calendar className="w-3.5 h-3.5 mr-1.5" />
                          {freq.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* სამუშაო დღეები (salary + both) */}
              {needsWorkDays && (
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">რომელ დღეებში მუშაობ?</label>
                  <div className="flex gap-1.5">
                    {WEEK_DAYS.map((wd) => (
                      <button
                        key={wd.value}
                        onClick={() => toggleWorkDay(wd.value)}
                        className={cn(
                          'flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all',
                          (profile.workDays || []).includes(wd.value)
                            ? 'border-primary bg-primary/20 text-primary'
                            : 'border-border bg-background/30 text-muted-foreground hover:border-border/80'
                        )}
                      >
                        {wd.label}
                      </button>
                    ))}
                  </div>
                  {profile.salary > 0 && (
                    <p className="text-xs text-muted-foreground/70 mt-2">
                      {workDaysInMonth} სამუშაო დღე ამ თვეში · დღიურად: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{dailySalary}{'\u20BE'}</span>
                    </p>
                  )}
                </div>
              )}

              {/* დანამატი / დღიური გეგმა (freelance + both) */}
              {needsDailyTarget && (
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">
                    {profile.incomeType === 'both' ? 'დღიური დანამატის გეგმა' : 'საშუალო დღიური გეგმა'} ({'\u20BE'})
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="მაგ: 150"
                    value={dailyTargetInput}
                    onChange={(e) => updateDailyTarget(e.target.value.replace(/[^0-9]/g, ''))}
                    autoFocus={profile.incomeType === 'freelance'}
                    className={nativeInputClass}
                  />
                  <p className="text-xs text-muted-foreground/60 mt-1.5">
                    {profile.incomeType === 'both'
                      ? 'ხელფასის გარდა რამდენის გამომუშავებას გეგმავ დღეში?'
                      : 'რამდენის გამომუშავებას გეგმავ დღეში?'
                    }
                  </p>
                </div>
              )}

              {/* დამატებითი შემოსავალი */}
              <div className="border-t border-border pt-4">
                <h3 className="text-sm font-bold mb-3">დამატებითი შემოსავალი (არასავალდებულო)</h3>
                <p className="text-xs text-muted-foreground/60 mb-3">მაგ: ქირა, მეორე სამსახური, პროცენტი...</p>

                {profile.additionalIncomes.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {profile.additionalIncomes.map((ai) => (
                      <div key={ai.id} className="flex justify-between items-center p-2.5 rounded-xl border border-border bg-card">
                        <div>
                          <span className="text-sm font-bold">{ai.name}</span>
                          <Badge variant="success" className="ml-2">{ai.amount}{'\u20BE'}</Badge>
                          <span className="text-muted-foreground text-xs ml-1">
                            /{ai.frequency === 'monthly' ? 'თვე' : ai.frequency === 'weekly' ? 'კვირა' : 'დღე'}
                          </span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeAdditionalIncome(ai.id)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Input type="text" placeholder="სახელი" value={newAiName} onChange={(e) => setNewAiName(e.target.value)} className="flex-1" />
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder={'\u20BE'}
                    value={newAiAmount}
                    onChange={(e) => setNewAiAmount(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-20 rounded-xl border border-border bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                  />
                  <select
                    value={newAiFrequency}
                    onChange={(e) => setNewAiFrequency(e.target.value as 'monthly' | 'weekly' | 'daily')}
                    className="bg-background/50 px-2 rounded-xl border border-border text-sm outline-none focus:ring-2 focus:ring-ring transition-colors"
                  >
                    <option value="monthly">თვე</option>
                    <option value="weekly">კვირა</option>
                    <option value="daily">დღე</option>
                  </select>
                  <Button variant="success" size="icon" onClick={addAdditionalIncome}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" /> უკან
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  className="flex-[2]"
                  disabled={!canProceedStep2()}
                >
                  შემდეგი
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: ყოველთვიური გადასახადი */}
        {step === 3 && (
          <Card className="border-border/50 bg-card/80 backdrop-blur animate-fadeIn">
            <CardHeader className="text-center">
              <Badge variant="warning" className="mx-auto mb-2 uppercase tracking-wider text-xs">ნაბიჯი 3/6</Badge>
              <CardTitle className="text-2xl font-black">ყოველთვიური გადასახადი</CardTitle>
              <CardDescription>აირჩიე კატეგორია და დაამატე შენი ხარჯები</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* დამატებული ბილების სია */}
              {Object.keys(uniqueBills).length > 0 && (
                <div className="space-y-1.5">
                  {Object.entries(uniqueBills).map(([name, amount]) => {
                    const cat = BILL_CATEGORIES.find((c) => name.startsWith(c.label) || name.startsWith('კომუნალური'));
                    const color = cat?.color || '#64748b';
                    return (
                      <div key={name} className="flex justify-between items-center p-2.5 rounded-xl border" style={{ borderColor: `${color}40`, backgroundColor: `${color}08` }}>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{cat?.icon || '📝'}</span>
                          <div>
                            <span className="font-bold text-sm" style={{ color }}>{name}</span>
                            <span className="text-xs text-muted-foreground ml-2">{amount}{'\u20BE'}/თვე</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => removeBillGroup(name)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                  <div className="text-right text-sm pt-1">
                    <span className="text-muted-foreground">სულ: </span>
                    <span className="text-primary font-bold">{monthlyBillsTotal}{'\u20BE'}/თვე</span>
                  </div>
                </div>
              )}

              {/* კატეგორიის არჩევა */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">აირჩიე კატეგორია:</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {BILL_CATEGORIES.map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => selectBillCategory(cat.key)}
                      className={cn(
                        'flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all text-center',
                        selectedBillCategory === cat.key
                          ? 'scale-105'
                          : 'border-border/50 hover:border-border opacity-70 hover:opacity-100'
                      )}
                      style={{
                        borderColor: selectedBillCategory === cat.key ? cat.color : undefined,
                        backgroundColor: selectedBillCategory === cat.key ? `${cat.color}15` : undefined,
                      }}
                    >
                      <span className="text-lg">{cat.icon}</span>
                      <span className="text-[10px] font-bold leading-tight" style={{ color: selectedBillCategory === cat.key ? cat.color : undefined }}>
                        {cat.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* კომუნალურის საბ-ტიპები */}
              {selectedBillCategory === 'კომუნალური' && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">რა კომუნალური?</p>
                  <div className="flex flex-wrap gap-1.5">
                    {UTILITY_TYPES.map((util) => (
                      <button
                        key={util.key}
                        type="button"
                        onClick={() => selectUtilitySubType(util.key)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all',
                          selectedUtilityType === util.key
                            ? 'scale-105'
                            : 'opacity-60 hover:opacity-100'
                        )}
                        style={{
                          borderColor: util.color,
                          color: util.color,
                          backgroundColor: selectedUtilityType === util.key ? `${util.color}20` : 'transparent',
                          boxShadow: selectedUtilityType === util.key ? `0 0 10px ${util.color}25` : 'none',
                        }}
                      >
                        {util.icon} {util.label}
                      </button>
                    ))}
                  </div>
                  {selectedUtilityType === 'სხვა' && (
                    <Input
                      type="text"
                      placeholder="რა კომუნალურია?"
                      value={customBillName}
                      onChange={(e) => {
                        setCustomBillName(e.target.value);
                        setNewBillName(`კომუნალური: ${e.target.value || 'სხვა'}`);
                      }}
                      className="h-9 text-sm"
                    />
                  )}
                </div>
              )}

              {/* სხვა — ხელით სახელი */}
              {selectedBillCategory === 'სხვა' && (
                <Input
                  type="text"
                  placeholder="სახელი (მაგ: პარკინგი, ბაღი...)"
                  value={newBillName}
                  onChange={(e) => setNewBillName(e.target.value)}
                  className="h-9 text-sm"
                  autoFocus
                />
              )}

              {/* თანხა და გადახდის დღე */}
              {selectedBillCategory && (selectedBillCategory !== 'კომუნალური' || selectedUtilityType) && (
                <div className="space-y-2 animate-fadeIn">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="თანხა ₾"
                      value={newBillAmount}
                      onChange={(e) => setNewBillAmount(e.target.value.replace(/[^0-9]/g, ''))}
                      onKeyDown={(e) => { if (e.key === 'Enter') addBill(); }}
                      autoFocus
                      className="flex-1 h-10 rounded-xl border border-border bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="გადახდის დღე"
                      value={newBillDueDay}
                      onChange={(e) => setNewBillDueDay(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-36 h-10 rounded-xl border border-border bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                    />
                  </div>
                  <Button
                    onClick={addBill}
                    disabled={!newBillName.trim() || !newBillAmount}
                    className="w-full h-9"
                    variant="default"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    დამატება
                  </Button>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="secondary" onClick={() => setStep(2)} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-1" /> უკან
                </Button>
                <Button variant="ghost" onClick={() => setStep(4)} className="text-muted-foreground text-xs">
                  არ მაქვს
                </Button>
                <Button onClick={() => setStep(4)} className="flex-[2]">
                  {Object.keys(uniqueBills).length === 0 ? 'გამოტოვება' : 'შემდეგი'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: ბანკი */}
        {step === 4 && (
          <Card className="border-border/50 bg-card/80 backdrop-blur animate-fadeIn">
            <CardHeader className="text-center">
              <Badge variant="warning" className="mx-auto mb-2 uppercase tracking-wider text-xs">ნაბიჯი 4/6</Badge>
              <CardTitle className="text-2xl font-black flex items-center justify-center gap-2">
                <Landmark className="w-6 h-6" /> ბანკი
              </CardTitle>
              <CardDescription>გაქვს სესხი, განვადება ან საკრედიტო ბარათი?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* დამატებული ბანკის პროდუქტები */}
              {bankItems.length > 0 && (
                <div className="space-y-1.5">
                  {bankItems.map((item, idx) => {
                    const typeInfo = BANK_PRODUCT_TYPES.find((t) => t.key === item.type);
                    const months = bankMonthsBetween(item.startDate, item.endDate);
                    return (
                      <div key={idx} className="flex justify-between items-center p-2.5 rounded-xl border" style={{ borderColor: `${typeInfo?.color}40`, backgroundColor: `${typeInfo?.color}08` }}>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{typeInfo?.icon}</span>
                          <div>
                            <span className="font-bold text-sm" style={{ color: typeInfo?.color }}>{typeInfo?.label}</span>
                            {item.name && <span className="text-[10px] text-muted-foreground ml-1">· {item.name}</span>}
                            <div className="text-[10px] text-muted-foreground">
                              ძირი: <span className="text-red-600 dark:text-red-400 font-bold">{item.principal}₾</span>
                              {' · '}%/თვე: <span className="text-orange-600 dark:text-orange-400 font-bold">{item.monthlyInterest}₾</span>
                              {' · '}{months} თვე
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => removeBankItem(idx)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ტიპის არჩევა */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">აირჩიე ტიპი:</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {BANK_PRODUCT_TYPES.map((type) => (
                    <button
                      key={type.key}
                      type="button"
                      onClick={() => setBankType(bankType === type.key ? null : type.key)}
                      className={cn(
                        'flex items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all text-left',
                        bankType === type.key ? 'scale-[1.02]' : 'border-border/50 opacity-60 hover:opacity-100'
                      )}
                      style={{
                        borderColor: bankType === type.key ? type.color : undefined,
                        backgroundColor: bankType === type.key ? `${type.color}15` : undefined,
                      }}
                    >
                      <span className="text-lg">{type.icon}</span>
                      <span className="text-[10px] font-bold" style={{ color: bankType === type.key ? type.color : undefined }}>{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ფორმა */}
              {bankType && (
                <div className="space-y-2 animate-fadeIn">
                  <Input type="text" placeholder={bankType === 'სხვა' ? 'სესხის სახელი *' : 'დამატებითი სახელი (არასავალდ.)'} value={bankName} onChange={(e) => setBankName(e.target.value)} className="h-9 text-sm" autoFocus={bankType === 'სხვა'} />
                  <div className="flex gap-2">
                    <input type="text" inputMode="numeric" placeholder="ძირი თანხა ₾ *" value={bankPrincipal}
                      onChange={(e) => setBankPrincipal(e.target.value.replace(/[^0-9]/g, ''))}
                      className="flex-1 h-10 rounded-xl border border-border bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                    />
                    <input type="text" inputMode="numeric" placeholder="% თვეში ₾ *" value={bankInterest}
                      onChange={(e) => setBankInterest(e.target.value.replace(/[^0-9]/g, ''))}
                      className="flex-1 h-10 rounded-xl border border-border bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                    />
                  </div>
                  <input type="text" inputMode="numeric" placeholder="გადახდის დღე (1-31) *" value={bankPayDay}
                    onChange={(e) => setBankPayDay(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full h-10 rounded-xl border border-border bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                  />
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-muted-foreground mb-0.5 block">ვადის დასაწყისი *</label>
                      <Input type="month" value={bankStart} onChange={(e) => setBankStart(e.target.value)} className="h-9 text-sm" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-muted-foreground mb-0.5 block">ვადის დასასრული *</label>
                      <Input type="month" value={bankEnd} onChange={(e) => setBankEnd(e.target.value)} className="h-9 text-sm" />
                    </div>
                  </div>
                  {bankStart && bankEnd && bankStart <= bankEnd && (
                    <p className="text-[10px] text-muted-foreground text-center">
                      ვადა: <span className="font-bold text-slate-800 dark:text-slate-200">{bankMonthsBetween(bankStart, bankEnd)} თვე</span>
                    </p>
                  )}
                  <Button onClick={addBankItem} className="w-full h-9" variant="default">
                    <Plus className="w-4 h-4 mr-1.5" /> დამატება
                  </Button>
                </div>
              )}

              <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-700/50 rounded-xl p-2.5 text-[11px] text-blue-600 dark:text-blue-400 space-y-0.5">
                <p>📌 ძირი თანხა ავტომატურად დაემატება <strong>ვალებში</strong> (კუბიკებით)</p>
                <p>📌 ყოველთვიური პროცენტი დაემატება <strong>ყოველთვიურ გადასახადებში</strong></p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="secondary" onClick={() => setStep(3)} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-1" /> უკან
                </Button>
                <Button variant="ghost" onClick={() => setStep(5)} className="text-muted-foreground text-xs">
                  არ მაქვს
                </Button>
                <Button onClick={() => setStep(5)} className="flex-[2]">
                  {bankItems.length === 0 ? 'გამოტოვება' : 'შემდეგი'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: ლობარდი */}
        {step === 5 && (
          <Card className="border-border/50 bg-card/80 backdrop-blur animate-fadeIn">
            <CardHeader className="text-center">
              <Badge variant="warning" className="mx-auto mb-2 uppercase tracking-wider text-xs">ნაბიჯი 5/6</Badge>
              <CardTitle className="text-2xl font-black">ლობარდი</CardTitle>
              <CardDescription>გაქვს ლობარდში ჩადებული ნივთი? დაამატე აქ</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {lombardItems.length > 0 && (
                <div className="space-y-1.5">
                  {lombardItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2.5 rounded-xl border border-amber-500/40 bg-amber-500/8">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <div>
                          <span className="font-bold text-sm text-amber-700 dark:text-amber-300">{item.itemName}</span>
                          {item.contractNumber && <span className="text-[10px] text-amber-600 dark:text-amber-400 ml-1.5">#{item.contractNumber}</span>}
                          <div className="text-[10px] text-muted-foreground">
                            ძირი: <span className="text-red-600 dark:text-red-400 font-bold">{item.principal}₾</span>
                            {' · '}%/თვე: <span className="text-orange-600 dark:text-orange-400 font-bold">{item.monthlyInterest}₾</span>
                            {' · '}გადახდა: <span className="text-blue-600 dark:text-blue-400">{item.paymentDay} რიცხვი</span>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => removeLombardItem(idx)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-2">
                <Input type="text" placeholder="ნივთის დასახელება *" value={lombItemName} onChange={(e) => setLombItemName(e.target.value)} className="h-9 text-sm" />
                <div className="flex gap-2">
                  <input type="text" inputMode="numeric" placeholder="ძირი თანხა ₾ *" value={lombPrincipal}
                    onChange={(e) => setLombPrincipal(e.target.value.replace(/[^0-9]/g, ''))}
                    className="flex-1 h-10 rounded-xl border border-border bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                  />
                  <input type="text" inputMode="numeric" placeholder="% თვეში ₾ *" value={lombInterest}
                    onChange={(e) => setLombInterest(e.target.value.replace(/[^0-9]/g, ''))}
                    className="flex-1 h-10 rounded-xl border border-border bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                  />
                </div>
                <div className="flex gap-2">
                  <input type="text" inputMode="numeric" placeholder="გადახდის დღე (1-31) *" value={lombPayDay}
                    onChange={(e) => setLombPayDay(e.target.value.replace(/[^0-9]/g, ''))}
                    onKeyDown={(e) => { if (e.key === 'Enter') addLombardItem(); }}
                    className="flex-1 h-10 rounded-xl border border-border bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                  />
                  <Input type="text" placeholder="ხელშეკრულება # (არასავალდ.)" value={lombContract} onChange={(e) => setLombContract(e.target.value)} className="flex-1 h-9 text-sm" />
                </div>
                <Button onClick={addLombardItem} className="w-full h-9" variant="default">
                  <Plus className="w-4 h-4 mr-1.5" /> ლობარდის დამატება
                </Button>
              </div>
              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-700/50 rounded-xl p-2.5 text-[11px] text-amber-700 dark:text-amber-300 space-y-0.5">
                <p>📌 ძირი თანხა ავტომატურად დაემატება <strong>ვალებში</strong></p>
                <p>📌 ყოველთვიური პროცენტი დაემატება <strong>ყოველთვიურ გადასახადებში</strong> (12 თვე)</p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="secondary" onClick={() => setStep(4)} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-1" /> უკან
                </Button>
                <Button variant="ghost" onClick={() => setStep(6)} className="text-muted-foreground text-xs">
                  არ მაქვს
                </Button>
                <Button onClick={() => setStep(6)} className="flex-[2]">
                  {lombardItems.length === 0 ? 'გამოტოვება' : 'შემდეგი'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 6: შეჯამება */}
        {step === 6 && (
          <Card className="border-border/50 bg-card/80 backdrop-blur animate-fadeIn">
            <CardHeader className="text-center">
              <Badge variant="warning" className="mx-auto mb-2 uppercase tracking-wider text-xs">ნაბიჯი 6/6</Badge>
              <CardTitle className="text-2xl font-black">შეჯამება</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Card className="border-border/50">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">შემოსავლის ტიპი:</span>
                    <span className="font-bold flex items-center gap-1.5">
                      {profile.incomeType === 'salary' && <><Briefcase className="w-4 h-4" /> ხელფასი</>}
                      {profile.incomeType === 'freelance' && <><Rocket className="w-4 h-4" /> გამომუშავება</>}
                      {profile.incomeType === 'both' && <><Layers className="w-4 h-4" /> ხელფასი + დანამატი</>}
                    </span>
                  </div>

                  {needsSalary && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">ხელფასი:</span>
                        <Badge variant="success" className="text-sm">{profile.salary}{'\u20BE'}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">სამუშაო დღეები:</span>
                        <span className="text-sm">
                          {WEEK_DAYS.filter((wd) => (profile.workDays || []).includes(wd.value)).map((wd) => wd.label).join(', ')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">დღიური ხელფასი:</span>
                        <Badge variant="success" className="text-sm">{dailySalary}{'\u20BE'}/დღე</Badge>
                      </div>
                    </>
                  )}

                  {needsDailyTarget && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">
                        {profile.incomeType === 'both' ? 'დღიური დანამატი:' : 'დღიური გეგმა:'}
                      </span>
                      <Badge variant="success" className="text-sm">{profile.dailyTarget}{'\u20BE'}/დღე</Badge>
                    </div>
                  )}

                  {profile.additionalIncomes.length > 0 && (
                    <div className="border-t border-border pt-2">
                      <span className="text-muted-foreground text-sm">დამატებითი:</span>
                      {profile.additionalIncomes.map((ai) => (
                        <div key={ai.id} className="flex justify-between text-sm mt-1">
                          <span>{ai.name}</span>
                          <span className="text-emerald-600 dark:text-emerald-400">
                            +{ai.amount}{'\u20BE'}/{ai.frequency === 'monthly' ? 'თვე' : ai.frequency === 'weekly' ? 'კვირა' : 'დღე'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border-t border-border pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">თვიური შემოსავალი:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{monthlyIncome}{'\u20BE'}</span>
                    </div>
                  </div>

                  {Object.keys(uniqueBills).length > 0 && (
                    <div className="border-t border-border pt-2">
                      <span className="text-muted-foreground text-sm">ყოველთვიური გადასახადი:</span>
                      {Object.entries(uniqueBills).map(([name, amount]) => (
                        <div key={name} className="flex justify-between text-sm mt-1">
                          <span>{name}</span>
                          <span className="text-red-600 dark:text-red-400">-{amount}{'\u20BE'}/თვე</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm mt-1 pt-1 border-t border-border/50">
                        <span className="text-muted-foreground">სულ:</span>
                        <Badge variant="danger">-{monthlyBillsTotal}{'\u20BE'}/თვე</Badge>
                      </div>
                    </div>
                  )}

                  {bankItems.length > 0 && (
                    <div className="border-t border-border pt-2">
                      <span className="text-muted-foreground text-sm flex items-center gap-1">
                        <Landmark className="w-3.5 h-3.5" /> ბანკი:
                      </span>
                      {bankItems.map((item, idx) => {
                        const typeInfo = BANK_PRODUCT_TYPES.find((t) => t.key === item.type);
                        return (
                          <div key={idx} className="flex justify-between text-sm mt-1">
                            <span style={{ color: typeInfo?.color }}>{typeInfo?.icon} {typeInfo?.label}{item.name ? `: ${item.name}` : ''}</span>
                            <span className="text-xs">
                              <span className="text-red-600 dark:text-red-400">{item.principal}₾</span>
                              <span className="text-muted-foreground mx-1">+</span>
                              <span className="text-orange-600 dark:text-orange-400">{item.monthlyInterest}₾/თვე</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {lombardItems.length > 0 && (
                    <div className="border-t border-border pt-2">
                      <span className="text-muted-foreground text-sm flex items-center gap-1">
                        <Package className="w-3.5 h-3.5" /> ლობარდი:
                      </span>
                      {lombardItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm mt-1">
                          <span className="text-amber-700 dark:text-amber-300">🏪 {item.itemName}</span>
                          <span className="text-xs">
                            <span className="text-red-600 dark:text-red-400">{item.principal}₾</span>
                            <span className="text-muted-foreground mx-1">+</span>
                            <span className="text-orange-600 dark:text-orange-400">{item.monthlyInterest}₾/თვე</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* მაჩვენებლები */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="border-2 border-emerald-500/50 bg-emerald-500/10">
                  <CardContent className="pt-4 pb-4 text-center">
                    <p className="text-emerald-600 dark:text-emerald-400 text-xs mb-1">დღიური გეგმა</p>
                    <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{dailyTarget}{'\u20BE'}</p>
                    <p className="text-emerald-500 dark:text-emerald-400 text-[10px] mt-1">
                      {profile.incomeType === 'both'
                        ? `${dailySalary}₾ ხელფასი + ${profile.dailyTarget}₾ დანამატი`
                        : 'სამუშაო დღეზე'
                      }
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-2 border-primary/50 bg-gradient-to-br from-primary/15 to-primary/5">
                  <CardContent className="pt-4 pb-4 text-center">
                    <p className="text-primary/80 text-xs mb-1">დღიური ბიუჯეტი</p>
                    <p className="text-3xl font-black text-primary">{dailyBudget}{'\u20BE'}</p>
                    <p className="text-primary/50 text-[10px] mt-1">ხარჯვის ლიმიტი</p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="secondary" onClick={() => setStep(5)} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" /> უკან
                </Button>
                <Button onClick={handleFinish} size="lg" className="flex-[2] text-lg">
                  🏺 დაწყება!
                  <Check className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* პროგრეს ინდიკატორი */}
        {step > 0 && (
          <div className="flex justify-center gap-2 mt-8">
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <div
                key={s}
                className={cn(
                  'h-2 rounded-full transition-all duration-300',
                  s <= step ? 'w-8 bg-primary' : 'w-4 bg-muted'
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
