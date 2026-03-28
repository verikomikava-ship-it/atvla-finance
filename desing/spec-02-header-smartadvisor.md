# Atvla Finance - Header და SmartAdvisor

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
