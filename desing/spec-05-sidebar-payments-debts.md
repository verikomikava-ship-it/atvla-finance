# Atvla Finance - Sidebar: Payments & Debts

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

## 5.1 Payments Tab

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

## 5.2 Debts / Loans Tab

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
