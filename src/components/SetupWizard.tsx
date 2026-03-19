import React, { useState } from 'react';
import { UserProfile, PayFrequency, Bill, UTILITY_TYPES } from '../types';
import { getWorkDaysInMonth } from '../utils/calculations';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Briefcase, Rocket, Layers, ArrowLeft, ArrowRight, Plus, X, Check, Calendar } from 'lucide-react';

// ყოველთვიური გადასახადის კატეგორიები
const BILL_CATEGORIES = [
  { key: 'კომუნალური', label: 'კომუნალური', icon: '🏠', color: '#14b8a6', hasSubTypes: true },
  { key: 'ქირა', label: 'ქირა', icon: '🏢', color: '#8b5cf6' },
  { key: 'სესხი', label: 'სესხი / განვადება', icon: '🏦', color: '#ef4444' },
  { key: 'ინტერნეტი', label: 'ინტერნეტი', icon: '🌐', color: '#3b82f6' },
  { key: 'დაზღვევა', label: 'დაზღვევა', icon: '🛡️', color: '#f59e0b' },
  { key: 'ტელეფონი', label: 'ტელეფონი', icon: '📱', color: '#06b6d4' },
  { key: 'გამოწერები', label: 'გამოწერები', icon: '🔄', color: '#a855f7' },
  { key: 'სხვა', label: 'სხვა', icon: '📝', color: '#64748b' },
] as const;

interface SetupWizardProps {
  onComplete: (profile: UserProfile, bills: Bill[]) => void;
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

export const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [bills, setBills] = useState<Bill[]>([]);

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

  const handleFinish = () => {
    const finalProfile: UserProfile = {
      ...profile,
      dailyTarget,
      dailyBudget,
      setupCompleted: true,
    };
    onComplete(finalProfile, bills);
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

  const nativeInputClass = "flex h-10 w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 transition-colors";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Step 0: მისასალმებელი */}
        {step === 0 && (
          <Card className="border-border/50 bg-card/80 backdrop-blur animate-fadeIn">
            <CardContent className="pt-8 pb-8 text-center space-y-6">
              <div className="text-6xl mb-4">🏺</div>
              <CardTitle className="text-3xl font-black text-amber-400">ჩემი ფინანსები</CardTitle>
              <CardDescription className="text-base">
                მართე შენი ყოველდღიური ფინანსები, დააგროვე კულაბაში და მიაღწიე შენს მიზანს
              </CardDescription>
              <div className="pt-4">
                <Button onClick={() => setStep(1)} size="lg" className="text-lg px-10 py-6">
                  დაწყება
                </Button>
              </div>
              <p className="text-muted-foreground/50 text-xs">პირველი ნაბიჯი - შენი შემოსავალი</p>
            </CardContent>
          </Card>
        )}

        {/* Step 1: შემოსავლის ტიპი */}
        {step === 1 && (
          <Card className="border-border/50 bg-card/80 backdrop-blur animate-fadeIn">
            <CardHeader className="text-center">
              <Badge variant="warning" className="mx-auto mb-2 uppercase tracking-wider text-xs">ნაბიჯი 1/4</Badge>
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
              <Badge variant="warning" className="mx-auto mb-2 uppercase tracking-wider text-xs">ნაბიჯი 2/4</Badge>
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
                          'flex-1 py-2.5 rounded-lg text-xs font-bold border transition-all',
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
                      {workDaysInMonth} სამუშაო დღე ამ თვეში · დღიურად: <span className="text-emerald-400 font-bold">{dailySalary}{'\u20BE'}</span>
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
                      <div key={ai.id} className="flex justify-between items-center p-2.5 rounded-lg border border-border bg-card">
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
                    className="w-20 rounded-lg border border-border bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                  />
                  <select
                    value={newAiFrequency}
                    onChange={(e) => setNewAiFrequency(e.target.value as 'monthly' | 'weekly' | 'daily')}
                    className="bg-background/50 px-2 rounded-lg border border-border text-sm outline-none focus:ring-2 focus:ring-ring transition-colors"
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
              <Badge variant="warning" className="mx-auto mb-2 uppercase tracking-wider text-xs">ნაბიჯი 3/4</Badge>
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
                      <div key={name} className="flex justify-between items-center p-2.5 rounded-lg border" style={{ borderColor: `${color}40`, backgroundColor: `${color}08` }}>
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
                        'flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all text-center',
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
                      className="flex-1 h-10 rounded-lg border border-border bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="გადახდის დღე"
                      value={newBillDueDay}
                      onChange={(e) => setNewBillDueDay(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-36 h-10 rounded-lg border border-border bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
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

              <div className="flex gap-3 pt-2">
                <Button variant="secondary" onClick={() => setStep(2)} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" /> უკან
                </Button>
                <Button onClick={() => setStep(4)} className="flex-[2]">
                  {Object.keys(uniqueBills).length === 0 ? 'გამოტოვება' : 'შემდეგი'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: შეჯამება */}
        {step === 4 && (
          <Card className="border-border/50 bg-card/80 backdrop-blur animate-fadeIn">
            <CardHeader className="text-center">
              <Badge variant="warning" className="mx-auto mb-2 uppercase tracking-wider text-xs">ნაბიჯი 4/4</Badge>
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
                          <span className="text-emerald-400">
                            +{ai.amount}{'\u20BE'}/{ai.frequency === 'monthly' ? 'თვე' : ai.frequency === 'weekly' ? 'კვირა' : 'დღე'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border-t border-border pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">თვიური შემოსავალი:</span>
                      <span className="font-bold text-emerald-400">{monthlyIncome}{'\u20BE'}</span>
                    </div>
                  </div>

                  {Object.keys(uniqueBills).length > 0 && (
                    <div className="border-t border-border pt-2">
                      <span className="text-muted-foreground text-sm">ყოველთვიური გადასახადი:</span>
                      {Object.entries(uniqueBills).map(([name, amount]) => (
                        <div key={name} className="flex justify-between text-sm mt-1">
                          <span>{name}</span>
                          <span className="text-red-400">-{amount}{'\u20BE'}/თვე</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm mt-1 pt-1 border-t border-border/50">
                        <span className="text-muted-foreground">სულ:</span>
                        <Badge variant="danger">-{monthlyBillsTotal}{'\u20BE'}/თვე</Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* მაჩვენებლები */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="border-2 border-emerald-500/50 bg-emerald-500/10">
                  <CardContent className="pt-4 pb-4 text-center">
                    <p className="text-emerald-300/80 text-xs mb-1">დღიური გეგმა</p>
                    <p className="text-3xl font-black text-emerald-400">{dailyTarget}{'\u20BE'}</p>
                    <p className="text-emerald-300/50 text-[10px] mt-1">
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
                <Button variant="secondary" onClick={() => setStep(3)} className="flex-1">
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
            {[1, 2, 3, 4].map((s) => (
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
