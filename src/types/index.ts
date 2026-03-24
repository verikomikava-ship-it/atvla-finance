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

// დამატებითი შემოსავლის წყარო
export type ExtraIncomeSource = 'გზავნილი' | 'საჩუქარი' | 'ბონუსი' | 'დამატებითი სამუშაო' | 'გაყიდვა' | 'პროცენტი' | 'სხვა';

export const EXTRA_INCOME_SOURCES: { key: ExtraIncomeSource; label: string; icon: string; color: string }[] = [
  { key: 'გზავნილი', label: 'გზავნილი', icon: '💳', color: '#3b82f6' },
  { key: 'საჩუქარი', label: 'საჩუქარი', icon: '🎁', color: '#ec4899' },
  { key: 'ბონუსი', label: 'ბონუსი', icon: '🌟', color: '#f59e0b' },
  { key: 'დამატებითი სამუშაო', label: 'დამატ. სამუშაო', icon: '💼', color: '#10b981' },
  { key: 'გაყიდვა', label: 'გაყიდვა', icon: '🏷️', color: '#8b5cf6' },
  { key: 'პროცენტი', label: 'პროცენტი', icon: '📈', color: '#06b6d4' },
  { key: 'სხვა', label: 'სხვა', icon: '📝', color: '#64748b' },
];

export type DailyPlanItem = {
  targetId: number;
  targetType: 'bill' | 'debt' | 'subscription';
  amount: number;
};

// კალენდარული ივენთები
export type CalendarEventType =
  | 'დაბადების დღე'
  | 'ბიზნეს შეხვედრა'
  | 'ბიზნეს ლანჩი'
  | 'ეკლესია'
  | 'ექიმთან ვიზიტი'
  | 'სპორტი'
  | 'გამოცდა'
  | 'მოგზაურობა'
  | 'ქორწილი'
  | 'კონცერტი'
  | 'ნათლობა'
  | 'პაემანი'
  | 'სხვა';

export type EventTypeInfo = {
  label: string;
  icon: string;
  color: string;
};

export const EVENT_TYPES: Record<CalendarEventType, EventTypeInfo> = {
  'დაბადების დღე':    { label: 'დაბადების დღე',    icon: '🎂', color: '#ec4899' },
  'ბიზნეს შეხვედრა':  { label: 'ბიზნეს შეხვედრა',  icon: '💼', color: '#3b82f6' },
  'ბიზნეს ლანჩი':     { label: 'ბიზნეს ლანჩი',     icon: '🍽️', color: '#f59e0b' },
  'ეკლესია':          { label: 'ეკლესია',           icon: '⛪', color: '#8b5cf6' },
  'ექიმთან ვიზიტი':   { label: 'ექიმთან ვიზიტი',    icon: '🏥', color: '#ef4444' },
  'სპორტი':           { label: 'სპორტი',            icon: '🏋️', color: '#10b981' },
  'გამოცდა':          { label: 'გამოცდა',            icon: '📝', color: '#06b6d4' },
  'მოგზაურობა':       { label: 'მოგზაურობა',         icon: '✈️', color: '#f97316' },
  'ქორწილი':          { label: 'ქორწილი',            icon: '💒', color: '#d946ef' },
  'კონცერტი':         { label: 'კონცერტი',           icon: '🎵', color: '#6366f1' },
  'ნათლობა':          { label: 'ნათლობა',            icon: '✝️', color: '#a855f7' },
  'პაემანი':           { label: 'პაემანი',            icon: '❤️', color: '#f43f5e' },
  'სხვა':             { label: 'სხვა',               icon: '📌', color: '#64748b' },
};

export const EVENT_TYPE_LIST: CalendarEventType[] = Object.keys(EVENT_TYPES) as CalendarEventType[];

export type CalendarEvent = {
  id: number;
  type: CalendarEventType;
  time?: string;        // HH:MM ფორმატი
  personName?: string;  // ვისი დაბადების დღე / ქორწილი
  location?: string;    // მისამართი / ადგილი
  note?: string;        // შენიშვნა
  budget?: number;      // დაგეგმილი ხარჯი (საჩუქარი, ბილეთი, და ა.შ.)
};

export type DayData = {
  incMain: number;
  incExtra: number;
  incExtraSource?: ExtraIncomeSource; // დამატებითი შემოსავლის წყარო
  incExtraNote?: string; // დამატებითი შემოსავლის კომენტარი
  expenses: Expense[];
  debt_exp: number;
  kulaba: number;
  comment: string;
  debtPaid?: boolean; // ვალის დაფარვის პწიჩკა
  dailyPlanDone?: DailyPlanItem[]; // დღიური გეგმა — რა გადადო დღეს
  events?: CalendarEvent[]; // კალენდარული ივენთები
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

// ბანკი / საკრედიტო პროდუქტები
export type BankProductType = 'იპოთეკური სესხი' | 'სესხი' | 'საკრედიტო ბარათი' | 'განვადება' | 'ნაწილ-ნაწილ გადახდა' | 'მანქანის ლობარდი' | 'მანქანის ლიზინგი' | 'ლობარდი' | 'სხვა';

export const BANK_PRODUCT_TYPES: { key: BankProductType; label: string; icon: string; color: string }[] = [
  { key: 'იპოთეკური სესხი', label: 'იპოთეკური სესხი', icon: '🏠', color: '#ef4444' },
  { key: 'სესხი', label: 'სესხი', icon: '💰', color: '#f59e0b' },
  { key: 'საკრედიტო ბარათი', label: 'საკრედიტო ბარათი', icon: '💳', color: '#8b5cf6' },
  { key: 'განვადება', label: 'განვადება', icon: '📋', color: '#3b82f6' },
  { key: 'ნაწილ-ნაწილ გადახდა', label: 'ნაწილ-ნაწილ გადახდა', icon: '🔢', color: '#06b6d4' },
  { key: 'ლობარდი', label: 'ლობარდი', icon: '🏪', color: '#d97706' },
  { key: 'მანქანის ლობარდი', label: 'მანქანის ლობარდი', icon: '🚗', color: '#b45309' },
  { key: 'მანქანის ლიზინგი', label: 'მანქანის ლიზინგი', icon: '🚙', color: '#059669' },
  { key: 'სხვა', label: 'სხვა', icon: '📝', color: '#64748b' },
];

export type BankLoan = {
  id: number;
  type: BankProductType;
  name?: string;              // დამატებითი სახელი (სურვილისამებრ)
  principal: number;          // ძირი თანხა → ვალები
  monthlyInterest: number;    // ყოველთვიური პროცენტი → ბილები
  paymentDay: number;         // გადახდის დღე (1-31)
  startDate: string;          // ვადის დასაწყისი YYYY-MM
  endDate: string;            // ვადის დასასრული YYYY-MM
  totalMonths: number;        // სულ რამდენი თვე
  debtId: number;             // დაკავშირებული ვალის ID
  billIds: number[];          // დაკავშირებული ბილების ID-ები
  active: boolean;
  createdAt: string;
  lateFee?: number;           // ფიქსირებული ჯარიმა პირველ დღეს (default: 20₾)
  dailyPenaltyRate?: number;  // დღიური პენალტი % (default: 0.5%)
};

// ლობარდი
export type Lombard = {
  id: number;
  itemName: string;           // ნივთის დასახელება
  principal: number;          // ძირი თანხა
  monthlyInterest: number;    // ყოველთვიური პროცენტი
  contractNumber?: string;    // ხელშეკრულების ნომერი (სურვილისამებრ)
  paymentDay: number;         // გადახდის დღე (1-31)
  debtId: number;             // დაკავშირებული ვალის ID
  billIds: number[];          // დაკავშირებული ბილების ID-ები (12 თვე)
  active: boolean;
  createdAt: string;          // YYYY-MM-DD
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
  lombards: Lombard[];
  bankLoans: BankLoan[];
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
