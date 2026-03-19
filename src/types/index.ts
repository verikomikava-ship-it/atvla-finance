export type ExpenseCategory = 'საჭირო' | 'აუცილებელი' | 'სურვილი' | 'გაუთვალისწინებელი';

export type ExpenseSubcategory =
  | 'საწვავი'
  | 'მაღაზია'
  | 'სუპერმარკეტი'
  | 'ბაზარი'
  | 'რესტორანი'
  | 'კაფე'
  | 'აფთიაქი'
  | 'ტრანსპორტი'
  | 'კომუნალური'
  | 'ჯანმრთელობა'
  | 'განათლება'
  | 'გართობა'
  | 'ტანისამოსი'
  | 'ტექნიკა'
  | 'სახლი'
  | 'საჩუქარი'
  | 'სილამაზე'
  | 'სპორტი'
  | 'შინაური ცხოველი'
  | 'ვალის გადახდა'
  | 'ყოველთვიური გადასახადი'
  | 'სხვა';

export type SubcategoryInfo = {
  label: string;
  icon: string;
  defaultCategory: ExpenseCategory;
};

export const SUBCATEGORIES: Record<ExpenseSubcategory, SubcategoryInfo> = {
  'საწვავი':          { label: 'საწვავი / ბენზინი',    icon: '⛽', defaultCategory: 'აუცილებელი' },
  'მაღაზია':          { label: 'მაღაზია',              icon: '🛒', defaultCategory: 'საჭირო' },
  'სუპერმარკეტი':    { label: 'სუპერმარკეტი',         icon: '🏪', defaultCategory: 'საჭირო' },
  'ბაზარი':          { label: 'ბაზარი',               icon: '🥬', defaultCategory: 'საჭირო' },
  'რესტორანი':       { label: 'რესტორანი',            icon: '🍽️', defaultCategory: 'სურვილი' },
  'კაფე':            { label: 'კაფე',                 icon: '☕', defaultCategory: 'სურვილი' },
  'აფთიაქი':         { label: 'აფთიაქი',              icon: '💊', defaultCategory: 'აუცილებელი' },
  'ტრანსპორტი':      { label: 'ტრანსპორტი',           icon: '🚌', defaultCategory: 'აუცილებელი' },
  'კომუნალური':       { label: 'კომუნალური',            icon: '🏠', defaultCategory: 'აუცილებელი' },
  'ჯანმრთელობა':     { label: 'ჯანმრთელობა',           icon: '🏥', defaultCategory: 'აუცილებელი' },
  'განათლება':        { label: 'განათლება',             icon: '📚', defaultCategory: 'საჭირო' },
  'გართობა':         { label: 'გართობა',              icon: '🎬', defaultCategory: 'სურვილი' },
  'ტანისამოსი':       { label: 'ტანისამოსი',            icon: '👕', defaultCategory: 'სურვილი' },
  'ტექნიკა':         { label: 'ტექნიკა / ელექტრონიკა', icon: '📱', defaultCategory: 'სურვილი' },
  'სახლი':           { label: 'სახლი / ყოფა',          icon: '🏡', defaultCategory: 'საჭირო' },
  'საჩუქარი':        { label: 'საჩუქარი',              icon: '🎁', defaultCategory: 'სურვილი' },
  'სილამაზე':        { label: 'სილამაზე / ჰიგიენა',    icon: '💈', defaultCategory: 'საჭირო' },
  'სპორტი':          { label: 'სპორტი',               icon: '🏋️', defaultCategory: 'სურვილი' },
  'შინაური ცხოველი':  { label: 'შინაური ცხოველი',       icon: '🐾', defaultCategory: 'საჭირო' },
  'ვალის გადახდა':   { label: 'ვალის გადახდა',         icon: '💸', defaultCategory: 'აუცილებელი' },
  'ყოველთვიური გადასახადი': { label: 'ყოველთვიური გადასახადი', icon: '📅', defaultCategory: 'აუცილებელი' },
  'სხვა':            { label: 'სხვა',                 icon: '📝', defaultCategory: 'საჭირო' },
};

export const SUBCATEGORY_LIST: ExpenseSubcategory[] = Object.keys(SUBCATEGORIES) as ExpenseSubcategory[];

// კომუნალურის საბ-ტიპები
export type UtilityType = 'დენი' | 'გაზი' | 'წყალი' | 'დასუფთავება' | 'ინტერნეტი' | 'სხვა';

export const UTILITY_TYPES: { key: UtilityType; label: string; icon: string; color: string }[] = [
  { key: 'დენი', label: 'დენი', icon: '⚡', color: '#fbbf24' },
  { key: 'გაზი', label: 'გაზი', icon: '🔥', color: '#f97316' },
  { key: 'წყალი', label: 'წყალი', icon: '💧', color: '#3b82f6' },
  { key: 'დასუფთავება', label: 'დასუფთავება', icon: '🧹', color: '#10b981' },
  { key: 'ინტერნეტი', label: 'ინტერნეტი', icon: '🌐', color: '#8b5cf6' },
  { key: 'სხვა', label: 'სხვა', icon: '📋', color: '#64748b' },
];

export type Expense = {
  id: number;
  name: string;
  amount: number;
  category: ExpenseCategory;
  subcategory?: ExpenseSubcategory;
  debtId?: number; // ვალის გადახდისთვის - რომელ ვალს ეხება
  billId?: number; // ყოველთვიური გადასახადისთვის - რომელ ბილს ეხება
  utilityType?: UtilityType; // კომუნალურის ტიპი
  utilityCustomName?: string; // თუ 'სხვა' აირჩია
};

export type DayData = {
  incMain: number;
  incExtra: number;
  expenses: Expense[];
  debt_exp: number;
  kulaba: number;
  comment: string;
  debtPaid?: boolean; // ვალის დაფარვის პწიჩკა
  // ძველი ფორმატის ველები (backward compatibility)
  rune?: boolean;
  gas?: number;
  shop?: number;
  other?: number;
};

export type DebtPriority = 'high' | 'medium' | 'low';

export type Debt = {
  id: number;
  name: string;
  amount: number;
  paid: boolean;
  priority?: DebtPriority;
  dueDate?: string;
  parts?: number;
  paidParts?: number;
  paidAmount?: number; // თანხობრივად რამდენი გადახდილია (ნაწილობრივი გადახდა)
};

export type Bill = {
  id: number;
  name: string;
  amount: number;
  date: string;
  dueDate?: string; // YYYY-MM-DD ფორმატი
  paid: boolean;
  reset_month?: number;
  isRecurring?: boolean;
};

export type Subscription = {
  id: number;
  name: string;
  amount: number;
  dueDate?: string; // YYYY-MM-DD ფორმატი
  paid: boolean;
  reset_month?: number; // 0-11
};

export type Loan = {
  id: number;
  borrowerName: string;   // ვის ვასესხეთ
  amount: number;
  loanDate: string;        // როდის გავასესხეთ (YYYY-MM-DD)
  dueDate?: string;        // როდის უნდა დაგვიბრუნოს (YYYY-MM-DD)
  returned: boolean;
  comment?: string;
};

export type IncomeType = 'salary' | 'freelance' | 'both';
export type PayFrequency = 'monthly_1' | 'monthly_2' | 'biweekly' | 'weekly';

export type AdditionalIncome = {
  id: number;
  name: string;
  amount: number;
  frequency: 'monthly' | 'weekly' | 'daily';
};

export type UserProfile = {
  setupCompleted: boolean;
  incomeType: IncomeType;
  // ხელფასი
  salary: number;
  payFrequency: PayFrequency;
  // სამუშაო დღეები (0=კვირა, 1=ორშაბათი, ... 6=შაბათი)
  workDays: number[];
  // გამომუშავება (ფრილანსი / დანამატი)
  dailyTarget: number;
  // დამატებითი შემოსავალი
  additionalIncomes: AdditionalIncome[];
  // გამოთვლილი დღიური ბიუჯეტი
  dailyBudget: number;
};

export type AppState = {
  db: Record<string, DayData>;
  debts: Debt[];
  bills: Bill[];
  subscriptions: Subscription[];
  loans: Loan[];
  goal: number;
  goalName: string;
  profile: UserProfile;
};

export type MonthlyStats = {
  inc: number;
  exp: number;
  kulaba: number;
  debts: number;
  bills: number;
  bills_paid: number;
  bills_remaining: number;
};
