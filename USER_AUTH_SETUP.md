# User Authentication & Data Isolation Setup

## 🔐 Overview

This setup implements user-specific data isolation using Clerk authentication and Supabase Row Level Security (RLS). Each user will only see their own properties, CSV uploads, and data.

## 🚀 Quick Setup

### 1. Add Service Role Key to Environment

Add your Supabase service role key to your `.env` file:

```bash
# Add this line to your .env file
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**To find your service role key:**
1. Go to your Supabase dashboard
2. Navigate to Settings > API
3. Copy the "service_role" key (not the anon key)

### 2. Run the Setup Script

```bash
node setup-user-auth.js
```

This will:
- Create user-specific database tables
- Enable Row Level Security (RLS)
- Set up data isolation policies
- Create helper functions

### 3. Test the Setup

1. Start your application: `PORT=3005 npm start`
2. Sign up with a new Google account
3. Upload a CSV file
4. Sign out and sign in with a different account
5. Verify you only see your own data

## 🏗️ Database Schema

### Tables Created

#### `users`
- Stores Clerk user information
- Links Clerk user IDs to internal user IDs
- Automatically created on first login

#### `properties`
- User-specific property data
- Isolated by user_id

#### `csv_uploads`
- User-specific CSV upload records
- Tracks filename, type, upload date, etc.

#### `csv_data`
- User-specific CSV data rows
- Links to csv_uploads table

#### `user_bucket_terms`
- User-specific AI bucket terms
- Custom categorization rules per user

#### `user_custom_buckets`
- User-specific custom bucket definitions
- Personal bucket configurations

## 🔒 Security Features

### Row Level Security (RLS)
- All tables have RLS enabled
- Users can only access their own data
- Automatic user ID filtering

### Authentication Flow
1. User signs in with Clerk (Google, etc.)
2. System creates/updates user record in database
3. All subsequent queries are filtered by user ID
4. Data is completely isolated between users

### Data Isolation Policies
```sql
-- Example: Users can only see their own properties
CREATE POLICY "Users can view own properties" ON public.properties
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM public.users 
            WHERE clerk_user_id = auth.jwt() ->> 'sub'
        )
    );
```

## 🎯 User Experience

### For New Users
1. Sign up with Google via Clerk
2. Automatically redirected to dashboard
3. Can upload CSVs and manage properties
4. All data is private to their account

### For Returning Users
1. Sign in with Google
2. See their previous CSV uploads
3. Access their property data
4. Continue where they left off

### Logout
- Click "Sign Out" in the sidebar
- Returns to landing page
- All user data is cleared from session

## 🔧 Technical Implementation

### UserAuthService
- Manages user authentication state
- Handles data isolation
- Provides user-specific data access methods

### Key Methods
```typescript
// Set current user from Clerk
await userAuthService.setCurrentUser(clerkUser);

// Get user's properties
const properties = await userAuthService.getUserProperties();

// Save CSV data
await userAuthService.saveCSVData(csvData);

// Get user's bucket terms
const bucketTerms = await userAuthService.getUserBucketTerms();
```

### App.tsx Integration
- Initializes user authentication on sign-in
- Clears user data on sign-out
- Passes logout handler to components

### Sidebar Updates
- Shows user's name and email
- Displays user's profile picture
- Includes logout button

## 🧪 Testing

### Test User Isolation
1. Create two different Google accounts
2. Sign in with Account A, upload a CSV
3. Sign out, sign in with Account B
4. Verify Account B cannot see Account A's data
5. Upload different CSV with Account B
6. Sign back in with Account A
7. Verify Account A only sees their own data

### Test Data Persistence
1. Sign in and upload a CSV
2. Sign out and sign back in
3. Verify CSV data is still there
4. Check that bucket terms are preserved

## 🚨 Troubleshooting

### Common Issues

#### "User not authenticated" errors
- Check that Clerk is properly configured
- Verify REACT_APP_CLERK_PUBLISHABLE_KEY is set
- Ensure user is signed in

#### "Row Level Security" errors
- Verify SUPABASE_SERVICE_ROLE_KEY is set
- Check that RLS policies are created
- Ensure user record exists in database

#### Data not showing
- Check browser console for errors
- Verify user_id is being set correctly
- Check Supabase logs for RLS violations

### Debug Steps
1. Check browser console for errors
2. Verify environment variables are set
3. Check Supabase dashboard for table creation
4. Test with different user accounts
5. Check network tab for API calls

## 📊 Monitoring

### Supabase Dashboard
- Monitor user table for new registrations
- Check RLS policy violations
- Review query performance

### Application Logs
- User authentication events
- Data access patterns
- Error tracking

## 🔄 Maintenance

### Regular Tasks
- Monitor user growth
- Check for RLS policy violations
- Review query performance
- Update user data as needed

### Scaling Considerations
- Index optimization for large datasets
- Partitioning for high-volume users
- Caching for frequently accessed data
- Backup and recovery procedures

## 🎉 Success Criteria

✅ Users can sign up with Google  
✅ Each user sees only their own data  
✅ CSV uploads are user-specific  
✅ Properties are user-specific  
✅ AI bucket terms are user-specific  
✅ Logout returns to landing page  
✅ Data persists between sessions  
✅ No cross-user data leakage  

## 🚀 Next Steps

1. **Test the setup** with multiple user accounts
2. **Monitor performance** and optimize queries
3. **Add user preferences** and settings
4. **Implement data export** functionality
5. **Add user management** features
6. **Set up monitoring** and alerts

---

**Your Propify application now has secure, user-specific data isolation! 🎉**
