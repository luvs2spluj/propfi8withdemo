# Supabase Integration Setup Guide

## 🚀 Quick Setup

### 1. Environment Variables

Create these files with your Supabase credentials:

#### Frontend (.env.local)
```bash
# Create this file in the root directory
touch .env.local
```

Add this content to `.env.local`:
```env
REACT_APP_SUPABASE_URL=https://iqwhrvtcrseidfyznqaf.supabase.co
REACT_APP_SUPABASE_ANON_KEY=sb_publishable_ULLJeduhFHc_KRINLLXxug_zGvRBLPf
REACT_APP_API_URL=http://localhost:5000/api
```

#### Backend (backend/.env.supabase)
```bash
# Create this file in the backend directory
touch backend/.env.supabase
```

Add this content to `backend/.env.supabase`:
```env
SUPABASE_URL=https://iqwhrvtcrseidfyznqaf.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_RsnPJrhJJjeOofYT3MPVUQ_Wy0nNOjD
SUPABASE_DB_HOST=db.iqwhrvtcrseidfyznqaf.supabase.co
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=your_supabase_db_password_here
```

### 2. Database Setup

1. Go to your Supabase dashboard: https://iqwhrvtcrseidfyznqaf.supabase.co
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase-schema.sql`
4. Click **Run** to create all tables and sample data

### 3. Update .gitignore

Add these lines to your `.gitignore` file:
```gitignore
# Environment variables
.env.local
backend/.env.supabase
.env
.env.production
```

## 📁 File Locations

### ✅ Created Files:
- `src/config/supabase.ts` - Supabase client configuration
- `supabase-schema.sql` - Database schema
- `env.template` - Environment variables template
- `SUPABASE_SETUP.md` - This setup guide

### 📝 Files You Need to Create:
- `.env.local` (root directory) - Frontend environment variables
- `backend/.env.supabase` - Backend environment variables

## 🔧 Integration Options

### Option 1: Replace MySQL with Supabase (Recommended)
- Use Supabase as your primary database
- Keep the existing API structure
- Update backend to use Supabase instead of MySQL

### Option 2: Hybrid Approach
- Keep MySQL for existing data
- Use Supabase for new features
- Gradually migrate data

### Option 3: Frontend-Only Supabase
- Use Supabase directly from frontend
- Skip backend API calls
- Simpler but less secure for sensitive operations

## 🎯 Next Steps

1. **Create environment files** using the template above
2. **Run the database schema** in Supabase SQL Editor
3. **Update your components** to use SupabaseService instead of ApiService
4. **Test the integration** with sample data

## 🔐 Security Notes

- ✅ **Anon Key**: Safe to use in frontend code
- ❌ **Service Role Key**: Only use in backend/server-side code
- 🔒 **Row Level Security**: Enabled for all tables
- 🛡️ **Authentication**: Ready for user management

## 📊 Available Tables

- `properties` - Property information
- `property_data` - CSV upload data
- `csv_uploads` - Upload tracking
- `users` - User management (future)
- `analytics` - Computed metrics

## 🚀 Usage Example

```typescript
import { SupabaseService } from './config/supabase';

// Get all properties
const properties = await SupabaseService.getProperties();

// Add a new property
const newProperty = await SupabaseService.addProperty({
  name: 'New Property',
  address: '123 New St',
  type: 'Apartment Complex',
  total_units: 20
});

// Upload CSV data
const csvData = await SupabaseService.addPropertyData([
  { property_id: 'uuid', date: '2024-01-01', revenue: 5000 }
]);
```

Your Supabase integration is ready! 🎉
