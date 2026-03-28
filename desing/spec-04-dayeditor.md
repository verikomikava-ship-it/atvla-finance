# Atvla Finance - DayEditor Modal

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

### Expense Categories (25):
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
