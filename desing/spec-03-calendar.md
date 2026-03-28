# Atvla Finance - Calendar

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

### Implementation:
- 365-day grid
- Scrollable by month
- Shows all months or selected month
- Responsive: smaller cells on mobile
