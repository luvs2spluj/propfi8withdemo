# Setup AI Learning Table

The AI learning system needs a table in Supabase to store user categorization patterns. Follow these steps:

## Step 1: Create the AI Learning Table

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project: `iqwhrvtcrseidfyznqaf`
3. Go to the SQL Editor (left sidebar)
4. Create a new query and paste the following SQL:

```sql
-- Create AI learning table for storing user categorization patterns
CREATE TABLE IF NOT EXISTS ai_learning (
    id BIGSERIAL PRIMARY KEY,
    file_type TEXT NOT NULL,
    account_name TEXT NOT NULL,
    user_category TEXT NOT NULL,
    confidence_score REAL DEFAULT 1.0,
    usage_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(file_type, account_name)
);

-- Add RLS (Row Level Security) policies
ALTER TABLE ai_learning ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (you can restrict this later)
CREATE POLICY "Allow all operations on ai_learning" ON ai_learning
    FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_learning_file_type ON ai_learning(file_type);
CREATE INDEX IF NOT EXISTS idx_ai_learning_account_name ON ai_learning(account_name);
CREATE INDEX IF NOT EXISTS idx_ai_learning_user_category ON ai_learning(user_category);
```

5. Click "Run" to execute the SQL

## Step 2: Verify the Table

After running the SQL, verify the table was created:

1. Go to Table Editor (left sidebar)
2. You should see the `ai_learning` table in the list
3. The table should have the following columns:
   - id (bigint, primary key)
   - file_type (text)
   - account_name (text)
   - user_category (text)
   - confidence_score (real)
   - usage_count (integer)
   - created_at (timestamp)
   - updated_at (timestamp)

## Step 3: Test the AI Learning

Once the table is created, the AI learning system will:

1. **Save user choices**: When you categorize line items, they're saved to this table
2. **Auto-categorize**: When you upload new CSVs, similar account names will be auto-categorized
3. **Show learning indicators**: Items categorized from learning will show a 🧠 brain icon

## Troubleshooting

If you get errors:
- Make sure you're logged into the correct Supabase project
- Check that RLS policies are enabled
- Verify the table was created in the Table Editor

## Next Steps

After creating the table, restart your development server:
```bash
npm run dev
```

The AI learning system should now work properly and remember your categorization choices!
