# PocketBase Migration Guide

## ✅ Completed

1. **Installed PocketBase** - Downloaded v0.30.0 for macOS
2. **Started PocketBase server** - Running on http://127.0.0.1:8090
3. **Installed PocketBase JS SDK** - Added `pocketbase` npm package
4. **Created PocketBase client library** - `src/lib/pocketbase.ts`
5. **Created collection schemas** - `pocketbase-collections.json`

## 🎯 Next Steps

### 1. Setup PocketBase Admin Account
- Open http://127.0.0.1:8090/_/ in your browser
- Create your first admin account
- This will allow you to manage collections and data

### 2. Create Collections Manually
Go to the Collections section and create these:

#### **users** (Auth Collection)
- email (email, required, unique)
- first_name (text)
- last_name (text)
- role (select: admin, member, viewer)

#### **properties** (Base Collection)
- name (text, required)
- address (text)
- property_type (text)
- total_units (number, default: 0)
- owner (relation → users)

#### **csv_data** (Base Collection)
- file_name (text, required)
- file_type (text, required)
- total_records (number, default: 0)
- account_categories (json, default: {})
- bucket_assignments (json, default: {})
- tags (json, default: [])
- is_active (bool, default: true)
- preview_data (json, default: [])
- time_series (json, default: [])
- data_date (date)
- owner (relation → users)

#### **property_data** (Base Collection)
- property (relation → properties)
- date (date, required)
- monthly_revenue (number, default: 0)
- occupancy_rate (number, default: 0)
- total_units (number, default: 0)
- maintenance_cost (number, default: 0)
- utilities_cost (number, default: 0)
- insurance_cost (number, default: 0)
- property_tax (number, default: 0)
- other_expenses (number, default: 0)
- net_income (number, default: 0)
- notes (text)

### 3. Update Frontend Components
Replace imports in these files:
- `src/components/Dashboard.tsx`
- `src/components/CSVImportFlow.tsx`
- `src/components/Properties.tsx`
- `src/components/Financials.tsx`
- `src/components/charts/MultiBucketChart.tsx`
- `src/components/charts/RevenueChart.tsx`
- `src/components/charts/OccupancyChart.tsx`
- `src/components/charts/CashFlowChart.tsx`

Change from:
```typescript
import { getCSVData, saveCSVData } from '../lib/supabase';
```

To:
```typescript
import { getCSVData, saveCSVData } from '../lib/pocketbase';
```

### 4. Update Environment Variables
Remove Supabase env vars and add PocketBase URL:
```env
REACT_APP_POCKETBASE_URL=http://127.0.0.1:8090
```

### 5. Remove Supabase Dependencies
```bash
npm uninstall @supabase/supabase-js
```

## 🚀 Why PocketBase?

✅ **Self-hosted** - No external dependencies
✅ **Embedded SQLite** - Fast, reliable, file-based database
✅ **Built-in Auth** - User management out of the box
✅ **Real-time subscriptions** - WebSocket support
✅ **Admin Dashboard** - Beautiful UI for managing data
✅ **Simple REST API** - Easy to use and understand
✅ **File uploads** - Built-in file handling
✅ **No connection issues** - Runs locally

## 📦 Files Created

- `pocketbase` - Executable binary
- `src/lib/pocketbase.ts` - Client library
- `pocketbase-collections.json` - Collection schemas (reference)
- `POCKETBASE_MIGRATION.md` - This guide
- `pb_data/` - Will be created automatically (add to .gitignore)
- `pb_migrations/` - Migration scripts directory

## 🗄️ Data Migration

The `migrateLocalStorageToPocketBase()` function in `src/lib/pocketbase.ts` will automatically migrate any data from localStorage to PocketBase on first load.

## 🔧 Development Workflow

```bash
# Start PocketBase (in one terminal)
./pocketbase serve

# Start frontend (in another terminal)
npm run dev

# Start AI backend (if needed)
cd backend && source venv/bin/activate && python app.py
```

## 📝 Notes

- Supabase files are kept in the repo for reference
- PocketBase data is stored in `pb_data/` directory
- Add `pb_data/` to `.gitignore`
- The PocketBase API is similar to Supabase but simpler
- All auth, CRUD, and real-time features are supported



