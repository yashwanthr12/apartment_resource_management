# React Frontend Migration — Walkthrough

## Summary

Replaced the entire Jinja2 + vanilla JS frontend with a React SPA while keeping the Flask backend, database, APIs, and business logic completely untouched.

---

## What Changed

### New Files Created (30 files in `frontend/src/`)

| Layer | Files | Purpose |
|-------|-------|---------|
| **Entry** | `main.jsx`, `App.jsx`, `index.css` | React entry, router, design system |
| **Services** (7) | `api.js`, `authService.js`, `adminService.js`, `expenseService.js`, `billService.js`, `paymentService.js`, `analyticsService.js` | API calls with `credentials: 'include'` |
| **Hooks** (3) | `useAuth.jsx`, `usePolling.js`, `useFetch.js` | Auth context, 15s polling, data fetching |
| **Layout** (3) | `Sidebar.jsx`, `Navbar.jsx`, `DashboardLayout.jsx` | Admin sidebar, resident navbar, layout wrapper |
| **UI** (2) | `ui/index.jsx`, (contains 7 components) | StatCard, GlassCard, Alert, Badge, Modal, Spinner, EmptyState |
| **Charts** (2) | `BarChart.jsx`, `PieChart.jsx` | Chart.js wrappers |
| **Auth Pages** (4) | `AdminLogin.jsx`, `AdminRegister.jsx`, `ResidentLogin.jsx`, `ResidentRegister.jsx` | Login/register forms |
| **Admin Pages** (7) | `AdminDashboard.jsx`, `AddExpense.jsx`, `ResidentList.jsx`, `VerifyResidents.jsx`, `PaymentVerification.jsx`, `PaymentSettings.jsx`, `Analytics.jsx` | All admin functionality |
| **Resident Pages** (1) | `ResidentDashboard.jsx` | Bills, filters, receipt upload |
| **Utils** (1) | `format.js` | Currency & date formatting |

### Modified Files

| File | Change |
|------|--------|
| [app.py](file:///c:/Users/Admin/Desktop/final_year_project/app.py) | Removed 13 page routes, added React SPA catch-all, changed unauthorized handler to return 401 JSON |
| [.gitignore](file:///c:/Users/Admin/Desktop/final_year_project/.gitignore) | Added `frontend/node_modules/` and `static/react/` |

### Deleted Files

| Folder | Contents |
|--------|----------|
| `templates/` | 13 Jinja2 HTML templates |
| `static/js/` | 8 vanilla JS files |
| `static/css/` | 1 CSS file (`style.css`) |

---

## Real-Time Sync Implementation

Three sync mechanisms solve the original problems:

1. **Immediate refetch** after mutations — user sees instant result after any action
2. **Background polling** every 15 seconds — cross-user updates (admin ↔ resident) 
3. **React re-render** — only affected components re-render, no full page reload

```
Admin sends bill → Resident's dashboard picks it up within 15s
Resident uploads receipt → Admin's verification page picks it up within 15s
```

---

## How to Run

### Development (two terminals)

```bash
# Terminal 1: Flask backend
python app.py
# Runs on http://localhost:5000

# Terminal 2: React frontend
cd frontend
npm run dev
# Runs on http://localhost:5173 (proxies /api → :5000)
```

> [!IMPORTANT]
> In development, open **http://localhost:5173** (Vite), not :5000.

### Production

```bash
# Build React app
cd frontend
npm run build

# Start Flask (serves React from static/react/)
python app.py
# Open http://localhost:5000
```

---

## Build Verification

```
✓ vite build completed in 437ms
✓ 56 modules transformed
✓ Output: static/react/ (index.html + assets)
✓ CSS: 14.20 kB (3.45 kB gzipped)
✓ JS:  489.86 kB (152.64 kB gzipped)
```

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **No Redux/React Query** | `useState` + `usePolling` is sufficient for this app's complexity |
| **`credentials: 'include'`** | Required to send Flask session cookies through Vite proxy |
| **401 JSON & auth-401 Event** | Prevents browser reload loops on unauthenticated requests. An `auth-401` event is dispatched by `api.js` to clear React auth state in `useAuth.jsx`, allowing `ProtectedRoute` to perform smooth client-side redirects. |
| **15s polling interval** | Balance between freshness and server load |
| **CSS variables ported as-is** | Same visual identity, no redesign needed |
