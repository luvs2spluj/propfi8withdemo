# PocketBase Collections Setup Guide

## 🎯 Required Collections

### 1. **users** (Auth Collection)
- **Type**: Auth
- **Fields**:
  - `email` (email, required, unique)
  - `first_name` (text)
  - `last_name` (text)
  - `role` (select: admin, member, viewer)

### 2. **csv_data** (Base Collection)
- **Type**: Base
- **Fields**:
  - `file_name` (text, required)
  - `file_type` (text, required)
  - `total_records` (number, default: 0)
  - `account_categories` (json, default: {})
  - `bucket_assignments` (json, default: {})
  - `tags` (json, default: [])
  - `is_active` (bool, default: true)
  - `preview_data` (json, default: [])
  - `time_series` (json, default: [])
  - `data_date` (date)
  - `owner` (relation → users)

### 3. **properties** (Base Collection)
- **Type**: Base
- **Fields**:
  - `name` (text, required)
  - `address` (text)
  - `property_type` (text)
  - `total_units` (number, default: 0)
  - `owner` (relation → users)

### 4. **property_data** (Base Collection)
- **Type**: Base
- **Fields**:
  - `property` (relation → properties)
  - `date` (date, required)
  - `monthly_revenue` (number, default: 0)
  - `occupancy_rate` (number, default: 0)
  - `total_units` (number, default: 0)
  - `maintenance_cost` (number, default: 0)
  - `utilities_cost` (number, default: 0)
  - `insurance_cost` (number, default: 0)
  - `property_tax` (number, default: 0)
  - `other_expenses` (number, default: 0)
  - `net_income` (number, default: 0)
  - `notes` (text)

### 5. **ai_learning** (Base Collection)
- **Type**: Base
- **Fields**:
  - `file_type` (text, required)
  - `account_name` (text, required)
  - `bucket` (text, required)
  - `usage_count` (number, default: 0)
  - `last_used` (date)
  - `owner` (relation → users)

## 📋 Step-by-Step Instructions

1. **Open PocketBase Admin**: http://127.0.0.1:8090/_/
2. **Navigate to Collections**: Click "Collections" in the sidebar
3. **Create each collection**:
   - Click "New Collection"
   - Enter the collection name
   - Select the type (Auth for users, Base for others)
   - Add all the fields listed above
   - Set field types, requirements, and defaults as specified
   - For relation fields, select the target collection
4. **Set up Rules** (optional):
   - For each collection, go to "Rules" tab
   - Set up access rules as needed
   - Default: Allow all operations for authenticated users

## 🔧 Quick Setup Commands

If you prefer to use the CLI, you can also create collections programmatically:

```bash
# Create users collection (Auth)
./pocketbase collection create users --type auth

# Create csv_data collection
./pocketbase collection create csv_data --type base

# Create properties collection
./pocketbase collection create properties --type base

# Create property_data collection
./pocketbase collection create property_data --type base

# Create ai_learning collection
./pocketbase collection create ai_learning --type base
```

## ✅ Verification

After creating the collections, test the API:

```bash
# Test collections endpoint
curl http://127.0.0.1:8090/api/collections

# Test csv_data collection
curl http://127.0.0.1:8090/api/collections/csv_data/records
```

## 🚨 Important Notes

- **users** collection must be created as "Auth" type
- **owner** fields should be relations to the users collection
- **json** fields store JSON data (arrays, objects)
- **date** fields store date values
- **number** fields store numeric values
- **text** fields store string values
- **bool** fields store true/false values

## 🔄 After Setup

Once collections are created:
1. Restart your frontend: `npm run dev`
2. Test CSV upload functionality
3. Verify charts are working
4. Check that data is being saved to PocketBase



