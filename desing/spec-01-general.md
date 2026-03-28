# Atvla Finance - ზოგადი ინფორმაცია და Layout

## პროექტის შესახებ
**სახელი:** Atvla Finance (ჩემი ფინანსები)
**ტექნოლოგია:** React + TypeScript + Tailwind CSS
**პლატფორმა:** Web, Desktop, Mobile-responsive
**ენა:** ქართული
**თემა:** Dark / Light mode

---

## ზოგადი Layout

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

## ფერთა სქემა (Design Tokens)

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
