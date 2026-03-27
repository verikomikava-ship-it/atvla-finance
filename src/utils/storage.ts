import { AppState, UserProfile } from '../types';

const STORE_KEY = 'kulaba_v2';

const DEFAULT_PROFILE: UserProfile = {
  setupCompleted: false,
  incomeType: 'salary',
  salary: 0,
  payFrequency: 'monthly_1',
  workDays: [1, 2, 3, 4, 5],
  dailyTarget: 0,
  additionalIncomes: [],
  dailyBudget: 150,
};

const BACKUP_DATA: AppState = {
  db: {},
  debts: [],
  subscriptions: [],
  bills: [],
  loans: [],
  lombards: [],
  bankLoans: [],
  projects: [],
  goal: 0,
  goalName: '',
  profile: DEFAULT_PROFILE,
};

const ensureProfile = (parsed: Record<string, unknown>): void => {
  if (!parsed.profile) {
    parsed.profile = { ...DEFAULT_PROFILE };
    // თუ ძველი მომხმარებელია (აქვს მონაცემები), setupCompleted = true
    const db = parsed.db as Record<string, unknown> | undefined;
    if (db && Object.keys(db).length > 0) {
      (parsed.profile as UserProfile).setupCompleted = true;
      (parsed.profile as UserProfile).dailyBudget = 150; // ძველი default
    }
  }
  // workDays მიგრაცია ძველი პროფილებისთვის
  const profile = parsed.profile as UserProfile;
  if (!profile.workDays) {
    profile.workDays = [1, 2, 3, 4, 5]; // default: ორშ-პარ
  }
};

export const loadState = (): AppState => {
  try {
    let stored = localStorage.getItem(STORE_KEY);

    // backward compat: kulaba_v1
    if (!stored) {
      stored = localStorage.getItem('kulaba_v1');
    }

    // backward compat: rune_v32
    if (!stored) {
      stored = localStorage.getItem('rune_v32');
    }

    if (!stored) return BACKUP_DATA;

    const parsed = JSON.parse(stored);

    // rune -> kulaba მიგრაცია (ძველი მონაცემებისთვის)
    if (parsed.db) {
      Object.keys(parsed.db).forEach((key) => {
        const day = parsed.db[key];
        if (day.rune && !day.kulaba) {
          day.kulaba = 27;
        }
        if (day.kulaba === undefined) {
          day.kulaba = 0;
        }
      });
    }

    if (!parsed.subscriptions) parsed.subscriptions = [];
    if (!parsed.loans) parsed.loans = [];
    if (!parsed.lombards) parsed.lombards = [];
    if (!parsed.bankLoans) parsed.bankLoans = [];
    if (!parsed.projects) parsed.projects = [];
    if (!parsed.goal && parsed.goal !== 0) parsed.goal = 0;
    if (!parsed.goalName) parsed.goalName = '';
    ensureProfile(parsed);

    // ახალ key-ზე შენახვა
    localStorage.setItem(STORE_KEY, JSON.stringify(parsed));
    return parsed;
  } catch {
    return BACKUP_DATA;
  }
};

export const saveState = (state: AppState): void => {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
};

export const exportData = (state: AppState): void => {
  const dataStr = JSON.stringify(state, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `kulaba_backup_${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

export const importData = (
  file: File,
  onSuccess: (state: AppState) => void,
  onError: (message: string) => void
): void => {
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const imported = JSON.parse(event.target?.result as string) as AppState;
      if (imported.db && imported.debts && imported.bills) {
        if (!imported.subscriptions) imported.subscriptions = [];
        if (!imported.loans) imported.loans = [];
        if (!imported.lombards) imported.lombards = [];
        if (!imported.bankLoans) imported.bankLoans = [];
        if (!imported.projects) imported.projects = [];
        if (!imported.goal && imported.goal !== 0) imported.goal = 0;
        if (!imported.goalName) imported.goalName = '';
        ensureProfile(imported as unknown as Record<string, unknown>);
        onSuccess(imported);
      } else {
        onError('ფაილი არ ჩანს სწორი ფორმატის');
      }
    } catch {
      onError('შეცდომა ფაილის წაკითხვაში');
    }
  };
  reader.readAsText(file);
};
