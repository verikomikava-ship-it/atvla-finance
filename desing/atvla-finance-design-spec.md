# Atvla Finance - Complete Design Specification for Designers

## About the Project
**Name:** Atvla Finance (My Finances)
**Technology:** React + TypeScript + Tailwind CSS + Firebase
**Platform:** Web (Vercel), Desktop (Electron), Mobile-responsive
**Language:** Georgian (UI text in Georgian)
**Theme:** Dark / Light mode

---

## General Layout

### Desktop (md+ breakpoint, 768px+)
```
┌──────────────────────────────────────────────────────────────┐
│                        HEADER                                │
│  [Month Select] [Income] [Expense] [Balance] [Goal]         │
├──────────────────────────────────────┬───────────────────────┤
│           MAIN CONTENT               │      SIDEBAR          │
│                                      │   (fixed, w-96)       │
│  ┌─ SmartAdvisor (collapsed) ──────┐ │                       │
│  │ Health Score | Pocket Money     │ │  [Tabs: 5 items]      │
│  └─────────────────────────────────┘ │                       │
│                                      │  ┌─ Sub-tabs ──────┐  │
│  ┌─ Diary (collapsed) ────────────┐ │  │                  │  │
│  │ Monthly notes                   │ │  │  Content         │  │
│  └─────────────────────────────────┘ │  │  (scrollable)    │  │
│                                      │  │                  │  │
│  ┌─ Events (collapsed) ──────────┐  │  │                  │  │
│  │ Monthly events                 │  │  │                  │  │
│  └─────────────────────────────────┘ │  └──────────────────┘  │
│                                      │                       │
│  ┌─ Calendar ──────────────────────┐ │                       │
│  │  365-day grid                   │ │                       │
│  │  (scrollable)                   │ │                       │
│  └─────────────────────────────────┘ │                       │
├──────────────────────────────────────┴───────────────────────┤
│  [☁️ Auth] [🌙 Theme] [⚙️ Tools (draggable)]               │
└──────────────────────────────────────────────────────────────┘
```

### Mobile
```
┌─────────────────────────┐
│        HEADER            │
├─────────────────────────┤
│    MAIN CONTENT          │
│  (scrollable)            │
│                          │
│  SmartAdvisor            │
│  Diary                   │
│  Events                  │
│  Calendar                │
│                          │
├─────────────────────────┤
│ [Month ▼] [Menu ☰]      │  ← sticky bottom bar
└─────────────────────────┘

☰ Menu → sidebar overlay (85vw, right side, z-50)
```

---

## 1. HEADER Component

### Elements:
- **Month selector** — dropdown, 12 months + "All months"
- **Income** — green color, ₾ (Georgian Lari) symbol
- **Expenses** — red color
- **Balance** — (income - expenses), green/red based on value
- **Goal tracker** — progress bar + name + amount
- **Bill Alerts** — payment warning badges (red)

### Colors:
- Income: `emerald-600`
- Expenses: `red-500`
- Balance: green if > 0, red if < 0
- Background: gradient `blue-600 → emerald-600`

---

## 2. SmartAdvisor (Financial AI)

### Default: **Collapsed**
```
┌─────────────────────────────────────────────────┐
│ 🧠 Smart Advisor                [▼ Expand]      │
│                                                  │
│  [85 ❤️]  💰 450₾ pocket  📊 45₾/day            │
│           [🔴 2] [🟡 3] [🟢 5]                   │
│                                                  │
│  ⚠️ Critical: Rent due in 2 days!               │
│  ⚠️ Critical: Loan payment tomorrow!            │
└─────────────────────────────────────────────────┘
```

### Expanded:
- **Health score** — circular indicator (0-100)
  - 80+ green, 50-79 yellow, <50 red
- **50/30/20 bar** — needs/wants/savings ratio
- **Income vs Obligations** — comparison bar
- **4 mini metrics** — expense rate, savings, debt ratio, free cash
- **Insights** — text-based advice (max 4, "show more" button)
- **Loan info** — months remaining, months paid

---

## 3. Calendar (Calendar Grid)

### Visual:
```
┌────┬────┬────┬────┬────┬────┬────┐
│ Mon│ Tue│ Wed│ Thu│ Fri│ Sat│ Sun│
├────┼────┼────┼────┼────┼────┼────┤
│ 1  │ 2  │ 3  │ 4  │ 5  │ 6  │ 7  │
│ 🟢 │ 🟡 │ 🔴 │ ⬛ │ 🟢 │ 🟢 │ ⬛ │
├────┼────┼────┼────┼────┼────┼────┤
│ ...│    │    │    │    │    │    │
└────┴────┴────┴────┴────┴────┴────┘
```

### Day card statuses:
| Status | Color | Meaning |
|--------|-------|---------|
| `status-perfect` | Green (`emerald`) | Within budget |
| `status-yellow` | Yellow (`amber`) | Slightly over budget |
| `status-critical` | Red (`red`) | Significantly over budget |
| No data | Dark (`slate-800`) | Empty day |

### Additional elements:
- **Today** — blue glow/border (`blue-500`)
- **Work day** — 💼 icon (salary mode)
- **Has event** — small dot indicator
- **Click** → opens DayEditor modal

---

## 4. DayEditor Modal

### Structure (scrollable):
```
┌─────────────────────────────────────┐
│  📅 2026-03-27, Friday        [✕]   │
├─────────────────────────────────────┤
│                                     │
│  💼 Main Income                      │
│  ┌───────────────────────┐          │
│  │ [________] ₾          │          │
│  └───────────────────────┘          │
│                                     │
│  💰 Additional Income                │
│  ┌───────────────────────┐          │
│  │ [________] ₾          │          │
│  │ Source: [▼ Remittance] │          │
│  │ Note: [____________]   │          │
│  └───────────────────────┘          │
│                                     │
│  🛒 Expenses                         │
│  ┌───────────────────────────┐      │
│  │ [Name] [Amount] [Cat. ▼]  │      │
│  │ + New expense              │      │
│  │                           │      │
│  │ • Fuel - 50₾ ⛽  [✕]      │      │
│  │ • Grocery - 30₾ 🛒  [✕]   │      │
│  │ • Cafe - 15₾ ☕  [✕]      │      │
│  │                           │      │
│  │ ███████░░░ 95₾/120₾      │      │
│  └───────────────────────────┘      │
│                                     │
│  📋 Daily Plan                       │
│  ┌───────────────────────────┐      │
│  │ #1 ▲▼ 📅 Rent             │      │
│  │    ███████░░ 350/500₾     │      │
│  │    Today: [50] ₾  Due: 5d │      │
│  │                           │      │
│  │ #2 ▲▼ 💸 Cosmos Debt      │      │
│  │    ⚠️ OVERDUE!            │      │
│  │    Remaining: 200₾        │      │
│  │    Today: [200] ₾         │      │
│  └───────────────────────────┘      │
│                                     │
│  📅 Events                           │
│  ┌───────────────────────────┐      │
│  │ [Type ▼] [Time] [Who]     │      │
│  │ [Location] [Budget]       │      │
│  │ + New event               │      │
│  └───────────────────────────┘      │
│                                     │
│  💬 Comment / Diary                  │
│  ┌───────────────────────────┐      │
│  │ [textarea - multiline]    │      │
│  └───────────────────────────┘      │
│                                     │
│  [Save 💾]               [Cancel]   │
└─────────────────────────────────────┘
```

### Daily Plan Entry:
- **Priority number** (#1, #2...) + ▲▼ arrows for reordering
- **Type badge**: 📅 Bill | 💸 Debt | 🔄 Subscription
- **Progress bar**: saved/total amount
- **Overdue**: red pulse animation + "⚠️ OVERDUE!"
- **Daily amount**: input field

---

## 5. Sidebar Tabs

### Main Tabs (5):
```
┌──────────┬──────────┬──────────┬──────────┬──────────┐
│ 📅       │ 💸       │ 🏗️       │ 🤝       │ 📊       │
│Payments  │Debts     │Projects  │Lent Out  │Statistics│
└──────────┴──────────┴──────────┴──────────┴──────────┘
```

Active tab: `blue-600`, border-bottom, background `blue-50`
Inactive: `slate-400`

---

### 5.1 Payments Tab

#### Sub-tabs:
```
┌────────────────┬────────────────┬────────────────┐
│ 📅 Monthly     │ ⚡ Utilities   │ 🔄 Subscriptions│
│     (3)        │                │     (2)        │
└────────────────┴────────────────┴────────────────┘
```
Red badge = unpaid count

#### Monthly Bills:
```
┌─────────────────────────────────────┐
│ + New bill                           │
│ [Name] [Amount ₾] [Due date 📅]     │
├─────────────────────────────────────┤
│ 🏢 Rent                     500₾   │
│ Due: 2026-04-01  (5 days)           │
│ [✓ Paid] [✏️] [🗑️]                │
├─────────────────────────────────────┤
│ 📱 Phone                     25₾   │
│ ⚠️ Due: Tomorrow!                   │
│ [□ Unpaid] [✏️] [🗑️]              │
└─────────────────────────────────────┘
```

Due date colors:
- 🔴 ≤3 days: `red-500`
- 🟡 ≤7 days: `amber-500`
- 🟢 >7 days: `green-500`
- ⚫ Overdue: `red-600` + pulse animation

#### Utilities:
```
┌─────────────────────────────────────┐
│ ⚡ Electricity ██████░░░  80/100₾  │
│ 🔥 Gas        ████░░░░░  45/80₾   │
│ 💧 Water      ██████████  30/30₾ ✓│
│ 🧹 Cleanup    ░░░░░░░░░  0/15₾   │
│ 🌐 Internet   ██████████  50/50₾ ✓│
└─────────────────────────────────────┘
```

#### Subscriptions:
- Netflix, Spotify, etc.
- Monthly reset cycle
- Paid/unpaid toggle

---

### 5.2 Debts / Loans Tab

#### Sub-tabs:
```
┌─────────────────────┬──────────────────────────┐
│ 💸 Personal    (4)  │ 🏦 Banks / Microfinance (2)│
└─────────────────────┴──────────────────────────┘
```

#### Personal Debts:
```
┌─────────────────────────────────────────┐
│ + New debt                               │
│ [Name] [Amount] [Priority ▼] [Due date] │
├─────────────────────────────────────────┤
│ 🔴 Cosmos                      2000₾   │
│ Priority: High                           │
│ Paid: 800₾  ███░░░░ 40%                │
│ Due: 2026-04-15 (19 days)               │
│ [Pay ₾] [✏️] [🗑️]                     │
├─────────────────────────────────────────┤
│ 🟡 George                       500₾   │
│ Priority: Medium                         │
│ ███████░░░ 70%                          │
│ [Pay ₾] [✏️] [🗑️]                     │
└─────────────────────────────────────────┘
```

Priority colors:
- **High**: `red-500` (red border + background)
- **Medium**: `amber-500` (yellow)
- **Low**: `emerald-500` (green)

#### Bank Loans:
```
┌─────────────────────────────────────────┐
│ + New loan                               │
│ [Type▼] [Name] [Principal₾] [Interest₾] │
│ [Payment day] [Total months] [Paid]      │
├─────────────────────────────────────────┤
│ 🏠 Mortgage                              │
│ Principal: 50,000₾  Monthly: 800₾       │
│ ████░░░░░░ 12/36 months                 │
│ Next payment: 5 days                     │
│ [✏️ Edit] [🗑️ Delete]                   │
├─────────────────────────────────────────┤
│ 💳 Credit Card                           │
│ Principal: 3,000₾  Monthly: 120₾        │
│ ██████░░░░ 6/10 months                  │
└─────────────────────────────────────────┘
```

Bank product types (9):
| Type | Icon | Color |
|------|------|-------|
| Mortgage | 🏠 | `red-500` |
| Loan | 💰 | `amber-500` |
| Credit Card | 💳 | `violet-500` |
| Installment | 📋 | `blue-500` |
| Split Payment | 🔢 | `cyan-500` |
| Pawn Shop | 🏪 | `amber-700` |
| Auto Pawn | 🚗 | `amber-800` |
| Auto Leasing | 🚙 | `emerald-600` |
| Other | 📝 | `slate-500` |

---

### 5.3 Projects Tab (NEW!)

```
┌─────────────────────────────────────────────┐
│  🏗️ My Projects — Total                     │
│  ┌────────┬──────────┬──────────┐            │
│  │Inventory│Purchased │ Monthly  │            │
│  │15,000₾ │ 5,000₾🟢│ 3,500₾🟡│            │
│  └────────┴──────────┴──────────┘            │
│  (gradient: indigo → purple)                 │
├─────────────────────────────────────────────┤
│                                              │
│  [+ New Project]                             │
│                                              │
│  ┌─ 🏗️ Bakery ────────────────── [✏️] [▼]┐  │
│  │                                         │  │
│  │  ┌──────────┬───────────┐               │  │
│  │  │📦 Invent.│🔄 Monthly │               │  │
│  │  │ 12,000₾  │ 2,500₾   │               │  │
│  │  │ ███░░ 33%│ 3 costs   │               │  │
│  │  └──────────┴───────────┘               │  │
│  │                                         │  │
│  │  📦 Inventory / One-time Costs           │  │
│  │  [+ Add]                                │  │
│  │  ┌─────────────────────────────────┐    │  │
│  │  │ ☑ Refrigerator          2,000₾ ✕│    │  │
│  │  │ ☑ Bakery Oven           5,000₾ ✕│    │  │
│  │  │ ☐ Tables & Chairs      3,000₾ ✕│    │  │
│  │  │ ☐ Display Case         2,000₾ ✕│    │  │
│  │  └─────────────────────────────────┘    │  │
│  │                                         │  │
│  │  🔄 Monthly Costs                       │  │
│  │  [+ Add]                                │  │
│  │  ┌─────────────────────────────────┐    │  │
│  │  │ 🔄 Rent             1,500₾/mo ✕│    │  │
│  │  │ 🔄 Staff              700₾/mo ✕│    │  │
│  │  │ 🔄 Utilities          300₾/mo ✕│    │  │
│  │  └─────────────────────────────────┘    │  │
│  │                                         │  │
│  │  ┌─ Summary ─────────────────────┐      │  │
│  │  │ 📦 Inventory total:  12,000₾  │      │  │
│  │  │ ✅ Purchased:         7,000₾  │      │  │
│  │  │ ⏳ Remaining:         5,000₾  │      │  │
│  │  │ ──────────────────────        │      │  │
│  │  │ 🔄 Monthly:         2,500₾/mo│      │  │
│  │  │ 📅 Yearly:         30,000₾/yr│      │  │
│  │  │ ──────────────────────        │      │  │
│  │  │ 💰 Total startup:   14,500₾  │      │  │
│  │  └───────────────────────────────┘      │  │
│  │                                         │  │
│  │  [📁 Archive] [🗑️]                     │  │
│  └─────────────────────────────────────────┘  │
│                                              │
│  ▼ Archive (1)                               │
└─────────────────────────────────────────────┘
```

Colors:
- Inventory: `indigo-600`
- Monthly costs: `amber-600`
- Summary background: gradient `indigo-50 → amber-50`
- Purchased checkbox: `green-500`
- Header gradient: `indigo-500 → purple-600`

---

### 5.4 Lent Out Tab

```
┌─────────────────────────────────────┐
│ + New loan                           │
│ [To whom] [Amount] [Date] [Due]     │
├─────────────────────────────────────┤
│ 🤝 George                  1000₾   │
│ Lent: 2026-01-15                    │
│ Due: 2026-04-01                     │
│ [☐ Not returned] [✏️] [🗑️]        │
├─────────────────────────────────────┤
│ 🤝 Nick                     500₾   │
│ ✅ Returned                         │
└─────────────────────────────────────┘
```

---

### 5.5 Statistics Tab

```
┌─────────────────────────────────────┐
│ 📊 Statistics                        │
│                                     │
│  Income Structure                    │
│  ┌─────────────────────────┐        │
│  │   [Pie/Donut Chart]     │        │
│  │   Salary: 70%           │        │
│  │   Freelance: 20%        │        │
│  │   Other: 10%            │        │
│  └─────────────────────────┘        │
│                                     │
│  Expense Categories                  │
│  ┌─────────────────────────┐        │
│  │   [Donut Chart]         │        │
│  │   Essential: 40%        │        │
│  │   Necessary: 30%        │        │
│  │   Wants: 20%            │        │
│  │   Unexpected: 10%       │        │
│  └─────────────────────────┘        │
│                                     │
│  Income vs Expenses                  │
│  ┌─────────────────────────┐        │
│  │   [Bar Chart]           │        │
│  │   ██████ 3000₾ Income   │        │
│  │   ████ 2100₾ Expenses   │        │
│  └─────────────────────────┘        │
│                                     │
│  Monthly Table (12 months)           │
│  ┌──────┬──────┬───────┬──────┐     │
│  │Month │Income│Expense│Balance│     │
│  ├──────┼──────┼───────┼──────┤     │
│  │ Jan  │2800  │ 2100  │ +700 │     │
│  │ Feb  │3000  │ 2500  │ +500 │     │
│  │ ...  │      │       │      │     │
│  └──────┴──────┴───────┴──────┘     │
└─────────────────────────────────────┘
```

---

## 6. Diary (DiaryView)

```
┌─────────────────────────────────────┐
│ 📔 Diary                    [▼] (3) │
├─────────────────────────────────────┤
│ March 5, Wednesday                   │
│ "Today was a good day, got a lot..." │
│                                     │
│ March 12, Thursday                   │
│ "Paid the loan, feeling relieved"   │
└─────────────────────────────────────┘
```
- Background: `amber-50` / dark: `amber-900/20`
- Collapsible, default collapsed

---

## 7. Events (EventsView)

```
┌─────────────────────────────────────┐
│ 🗓️ Events                  [▼] (2) │
├─────────────────────────────────────┤
│ March 15                             │
│ 🎂 George's Birthday                │
│    18:00 • Restaurant • 100₾        │
│                                     │
│ March 22                             │
│ 💼 Business Meeting                 │
│    10:00 • Office                   │
└─────────────────────────────────────┘
```
- Background: `teal-50` / dark: `teal-900/20`
- Collapsible, default collapsed

Event types (13):
| Type | Icon | Color |
|------|------|-------|
| Birthday | 🎂 | `pink-500` |
| Business Meeting | 💼 | `blue-500` |
| Business Lunch | 🍽️ | `amber-500` |
| Church | ⛪ | `violet-500` |
| Doctor Visit | 🏥 | `red-500` |
| Sports | 🏋️ | `emerald-500` |
| Exam | 📝 | `cyan-500` |
| Travel | ✈️ | `orange-500` |
| Wedding | 💒 | `fuchsia-500` |
| Concert | 🎵 | `indigo-500` |
| Baptism | ✝️ | `purple-500` |
| Date | ❤️ | `rose-500` |
| Other | 📌 | `slate-500` |

---

## 8. Setup Wizard (Initial Setup)

### 4 Steps:

**Step 0 — Authentication:**
```
┌─────────────────────────────────────┐
│      🏺 Welcome!                    │
│                                     │
│  [Sign in with Google]              │
│  [Email / Password]                 │
│  [Phone Number]                     │
│                                     │
│  or → [Skip]                        │
└─────────────────────────────────────┘
```

**Step 1 — Income:**
```
┌─────────────────────────────────────┐
│  1/3  Income                         │
│                                     │
│  [💼 Salary] [📊 Freelance] [🧩 Both]│
│                                     │
│  Salary: [________] ₾              │
│  Frequency: [▼ Once a month]        │
│  Work days: [Mon][Tue]...[Sun]      │
│                                     │
│          [← Back]  [Next →]         │
└─────────────────────────────────────┘
```

**Step 2 — Expenses:**
```
┌─────────────────────────────────────┐
│  2/3  Monthly Expenses               │
│                                     │
│  ▶ 📅 Bills                         │
│    [Rent][Insurance][Phone][Net]... │
│                                     │
│  ▶ ⚡ Utilities                     │
│    [Electric][Gas][Water]...        │
│                                     │
│  ▶ 🏦 Bank Loans                    │
│  ▶ 🏪 Pawn Shops                    │
│                                     │
│          [← Back]  [Next →]         │
└─────────────────────────────────────┘
```

**Step 3 — Summary + Motivation:**
```
┌─────────────────────────────────────┐
│  3/3  Ready! 🎉                     │
│                                     │
│  ┌──────────┬──────────┐            │
│  │ Income   │ Budget   │            │
│  │ 3000₾   │ 45₾/day  │            │
│  └──────────┴──────────┘            │
│                                     │
│  💼 Salary:              3000₾     │
│  📅 Bills:               -800₾     │
│  ⚡ Utilities:            -200₾     │
│  🏦 Loans:               -500₾     │
│  ─────────────────────────          │
│  Free:                   1500₾     │
│                                     │
│  ┌─ 💌 Motivational Letter ───────┐ │
│  │ (gradient: purple → pink)       │ │
│  │ Write a letter to yourself      │ │
│  │ [textarea]                      │ │
│  │ ⏰ What time? [▼ 09:00]         │ │
│  └─────────────────────────────────┘ │
│                                     │
│  [← Back]  [🏺 Let's Go! ✓]        │
└─────────────────────────────────────┘
```

Progress indicator:
```
    ●━━━━━━━━━●━━━━━━━━━●━━━━━━━━━○
    1         2         3
```

---

## 9. Motivational Letter (Daily Popup)

### Daily Modal:
```
┌─────────────────────────────────────┐
│ (overlay: black/60 + backdrop-blur) │
│                                     │
│   ┌─ gradient border ──────────┐    │
│   │ (purple → pink → orange)   │    │
│   │                            │    │
│   │   ┌─ white card ────────┐  │    │
│   │   │                     │  │    │
│   │   │       💌            │  │    │
│   │   │  Letter to Yourself  │  │    │
│   │   │  (gradient text)    │  │    │
│   │   │                     │  │    │
│   │   │ ┌─ purple bg ─────┐ │  │    │
│   │   │ │                 │ │  │    │
│   │   │ │  "You can do    │ │  │    │
│   │   │ │   this!         │ │  │    │
│   │   │ │   Keep going    │ │  │    │
│   │   │ │   and never     │ │  │    │
│   │   │ │   give up!"     │ │  │    │
│   │   │ │                 │ │  │    │
│   │   │ └─────────────────┘ │  │    │
│   │   │                     │  │    │
│   │   │ [💪 Got it, let's go!]│  │    │
│   │   │                     │  │    │
│   │   │ ✏️ Edit letter       │  │    │
│   │   └─────────────────────┘  │    │
│   └────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

**Behavior:**
- Shows once per day at configured hour (default: 9 AM)
- If app opens after set time, shows immediately
- LocalStorage tracks last shown date
- Editable from Settings menu or from popup itself

---

## 10. Tools Menu (⚙️ Settings)

### Draggable Button:
- **Size:** 48x48px, rounded-full
- **Background:** gradient `blue-600 → emerald-600`
- **Icon:** ⚙️ Settings (white)
- **Position:** draggable, saves to localStorage
- **z-index:** 50

### Menu (popup):
```
┌────────────────────┐
│ 💾 Save Backup      │  (green)
│ 📂 Restore          │  (default)
│ ✨ Clean Orphans     │  (outline)
│ 💌 Motivation       │  (outline)
│ 🔄 Re-setup         │  (outline)
│ 🗑️ Reset All        │  (red/destructive)
└────────────────────┘
```

---

## 11. Auth Modal (Authentication)

```
┌─────────────────────────────────────┐
│  ☁️ Authentication            [✕]   │
│                                     │
│  [Google] [Email] [Phone]           │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Google:                     │    │
│  │ [Sign in with Google]       │    │
│  │                             │    │
│  │ Email:                      │    │
│  │ [email] [password]          │    │
│  │ [Sign In] / [Sign Up]      │    │
│  │                             │    │
│  │ Phone:                      │    │
│  │ [+995 _________]            │    │
│  │ [Send SMS Code]             │    │
│  └─────────────────────────────┘    │
│                                     │
│  ✅ Synced (if logged in)           │
│  [Logout]                           │
└─────────────────────────────────────┘
```

Cloud status (fixed bottom-left):
- 🟢 `green-500` — Synced
- ⚫ `slate-500` — Offline

---

## 12. Fixed Buttons (Bottom)

```
  [☁️]  [🌙]                    [⚙️]
  auth   theme                  tools
  (bl)   (bl+4.5rem)           (draggable)
```

- **Auth button:** 48px, bottom-left, green if logged in
- **Theme toggle:** 40px, next to auth
  - 🌙 Moon (light mode) → 🌞 Sun (dark mode)
- **Tools:** 48px, draggable, gradient

---

## 13. Expense Categories

### 4 Main Categories:
| Category | Color | Description |
|----------|-------|-------------|
| Essential | `blue-500` | Daily necessities |
| Necessary | `red-500` | Can't live without |
| Want | `purple-500` | Desire-based spending |
| Unexpected | `orange-500` | Unplanned expenses |

### 25 Subcategories:
| Name | Icon | Default Category |
|------|------|------------------|
| Fuel | ⛽ | Necessary |
| Grocery Store | 🛒 | Essential |
| Supermarket | 🏪 | Essential |
| Market | 🥬 | Essential |
| Restaurant | 🍽️ | Want |
| Cafe | ☕ | Want |
| Pharmacy | 💊 | Necessary |
| Transport | 🚌 | Necessary |
| Utilities | 🏠 | Necessary |
| Healthcare | 🏥 | Necessary |
| Education | 📚 | Essential |
| Entertainment | 🎬 | Want |
| Clothing | 👕 | Want |
| Tech / Electronics | 📱 | Want |
| Home / Living | 🏡 | Essential |
| Gift | 🎁 | Want |
| Beauty / Hygiene | 💈 | Essential |
| Sports | 🏋️ | Want |
| Pets | 🐾 | Essential |
| Debt Payment | 💸 | Necessary |
| Monthly Bill | 📅 | Necessary |
| Other | 📝 | Essential |

### Extra Income Sources (7):
| Source | Icon | Color |
|--------|------|-------|
| Remittance | 💳 | `blue-500` |
| Gift | 🎁 | `pink-500` |
| Bonus | 🌟 | `amber-500` |
| Side Work | 💼 | `emerald-500` |
| Sale | 🏷️ | `violet-500` |
| Interest | 📈 | `cyan-500` |
| Other | 📝 | `slate-500` |

---

## 14. Color Scheme (Design Tokens)

### Backgrounds:
- **Light:** `bg-gradient-to-br from-blue-50 via-white to-emerald-50`
- **Dark:** `from-slate-900 via-slate-900 to-slate-800`

### Sidebar:
- **Light:** `bg-white/95 backdrop-blur`
- **Dark:** `bg-slate-900/95 backdrop-blur`
- **Border:** `border-slate-200` / `border-slate-700`

### Cards:
- **Light:** white bg, `border-slate-200`
- **Dark:** `bg-slate-800/50`, `border-slate-700`

### Text:
- **Primary:** `text-slate-800` / `text-slate-200`
- **Secondary:** `text-slate-500` / `text-slate-400`
- **Muted:** `text-slate-400` / `text-slate-500`

### Accent Colors:
- **Primary action:** `blue-600`
- **Success:** `emerald-500` / `green-500`
- **Warning:** `amber-500`
- **Danger:** `red-500`
- **Info:** `cyan-500`
- **Purple accent:** `purple-600` / `indigo-600`

### Input Fields:
- **Height:** `h-8` (compact) / `h-11` (wizard)
- **Border:** `border-slate-200` → focus: `border-blue-500 ring-blue-500/30`
- **Radius:** `rounded-xl`

### Buttons:
- **Compact:** `h-7 text-[11px]`
- **Normal:** standard shadcn sizes
- **Gradient:** `bg-gradient-to-r from-blue-600 to-emerald-600`

---

## 15. Animations

| Name | Usage | Effect |
|------|-------|--------|
| `animate-fadeIn` | Modals, new elements | opacity 0→1 |
| `pulse` | Overdue bills | red pulse |
| `transition-all duration-200` | Tab switching | smooth transition |
| `backdrop-blur` | Sidebar, modals | blur background |

---

## 16. Responsiveness

| Breakpoint | Behavior |
|------------|----------|
| `< 768px` (mobile) | Sidebar hidden, bottom bar with menu toggle, overlay sidebar |
| `≥ 768px` (desktop) | Sidebar fixed right (w-96), main content left |

### Mobile-specific:
- Bottom sticky bar: month selector + menu button
- Sidebar: overlay 85vw from right, z-50
- Touch-optimized: larger tap targets
- Swipe: native scroll

---

## 17. Data Model Summary

```
AppState
├── profile: UserProfile
│   ├── incomeType, salary, payFrequency
│   ├── workDays[], dailyTarget, dailyBudget
│   ├── additionalIncomes[]
│   ├── motivationalMessage, motivationHour
│   └── setupCompleted
├── db: { "YYYY-MM-DD": DayData }
│   ├── incMain, incExtra, expenses[]
│   ├── dailyPlanDone[], events[]
│   └── comment (diary)
├── debts: Debt[]
│   ├── name, amount, priority, dueDate
│   └── paidAmount, parts, paidParts, paid
├── bills: Bill[]
│   ├── name, amount, dueDate, reset_month
│   └── paid, isRecurring
├── subscriptions: Subscription[]
├── loans: Loan[] (money lent to others)
├── bankLoans: BankLoan[]
│   ├── type, principal, monthlyInterest
│   ├── debtId → links to Debt
│   └── billIds[] → links to Bills (12 monthly)
├── lombards: Lombard[]
│   ├── itemName, principal, monthlyInterest
│   ├── debtId → links to Debt
│   └── billIds[] → links to Bills (12 monthly)
├── projects: Project[]
│   ├── name, description, active
│   ├── inventoryItems[] (name, cost, purchased)
│   └── monthlyCosts[] (name, amount)
├── goal, goalName
└── Storage: localStorage + Firebase Firestore sync
```

---

## 18. Icons (Icon Library)

**Lucide React** — all UI icons from this library:
- Menu, X, Cloud, CloudOff, Moon, Sun
- Plus, Check, Pencil, Trash2
- ChevronDown, ChevronUp, ArrowLeft, ArrowRight
- Settings, Save, FolderOpen, RotateCcw
- Sparkles, Heart, Package, Repeat
- AlertTriangle, Clock, TrendingDown
- Briefcase, Rocket, Layers
- FileText, Calendar

**Emoji Icons** — used in UI text:
📅 📊 💸 🤝 🏗️ ⚡ 🔄 🏦 📦 💌 ⚠️ 🚨 💪 🎉 🏺 ✅ ⏳ 💰

---

*Last updated: 2026-03-27*
*Version: Atvla Finance v2.0*
