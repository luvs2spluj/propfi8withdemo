# 🎓 AI Training System Guide

## Overview
The AI Training system allows you to train the AI parser with your actual property data, improving accuracy over time and correcting any misclassified information.

## 🚀 Getting Started

### 1. Access AI Training
- Navigate to **"AI Training"** in the sidebar
- The system will load all your uploaded CSV files and their AI analysis

### 2. Training Dashboard
The dashboard shows:
- **Total Headers**: Number of CSV columns analyzed
- **Confirmed Headers**: Headers you've manually verified
- **Total Records**: Number of data points processed
- **AI Confidence**: Overall confidence level of AI predictions

## 🧠 Header Categorization Training

### Step 1: Select a CSV File
- Click on any CSV file card to select it
- View the file's header analysis and data records

### Step 2: Review Header Suggestions
For each CSV column, you'll see:
- **Original Header**: The actual column name from your CSV
- **AI Suggested Category**: What the AI thinks this column represents
- **Confidence Score**: How confident the AI is (0-100%)

### Step 3: Confirm or Correct Headers
- **If correct**: The AI suggestion is already confirmed
- **If wrong**: Click "Correct" and choose the right category from:
  - `income` - Revenue, rent, fees
  - `expense` - General expenses
  - `maintenance` - Repairs, upkeep
  - `utilities` - Water, electricity, gas
  - `insurance` - Property insurance
  - `property_tax` - Tax payments
  - `management_fees` - Management costs
  - `legal_fees` - Legal expenses
  - `marketing` - Advertising, marketing
  - `other` - Miscellaneous items

## 📊 Data Correction

### Step 1: Review Individual Records
- Scroll through the first 20 records of your selected file
- Look for incorrect amounts or categories

### Step 2: Edit Records
- Click "Edit" on any record that needs correction
- Update the **Amount** field if the value is wrong
- Change the **Category** if it's misclassified
- Click "Save" to apply changes

### Step 3: Bulk Corrections
- Similar records will be automatically updated based on your corrections
- The AI learns from your patterns for future uploads

## 🎯 Training Benefits

### Immediate Benefits
- ✅ **Correct cash flow amounts** that seem off
- ✅ **Fix misclassified categories** (e.g., maintenance vs. utilities)
- ✅ **Improve data accuracy** for financial reporting
- ✅ **Train AI** with your specific business logic

### Long-term Benefits
- 🚀 **Higher AI accuracy** on future CSV uploads
- 🚀 **Faster processing** with better confidence scores
- 🚀 **Reduced manual work** as AI learns your patterns
- 🚀 **Consistent categorization** across all properties

## 📈 Training Progress

### Tracking Your Progress
- **Header Confirmation Rate**: Percentage of headers you've verified
- **Data Accuracy**: How many records you've corrected
- **AI Confidence Growth**: Improvement in AI prediction confidence
- **Category Distribution**: Spread of data across different categories

### Best Practices
1. **Start with headers** - Get categorization right first
2. **Focus on large amounts** - Prioritize correcting significant financial data
3. **Be consistent** - Use the same categories for similar items
4. **Review regularly** - Check new uploads and continue training

## 🔧 Troubleshooting

### Common Issues
- **"No data found"**: Make sure you've uploaded CSV files first
- **"Server error"**: Check your internet connection and try refreshing
- **"Changes not saving"**: Ensure you're connected to Supabase properly

### Getting Help
- Check the browser console for detailed error messages
- Verify your Supabase connection in the AI Parser tab
- Make sure your database schema is properly set up

## 🎉 Success Tips

1. **Train incrementally** - Don't try to fix everything at once
2. **Focus on accuracy** - Better to have fewer, correct records than many wrong ones
3. **Use consistent naming** - Stick to the predefined categories
4. **Monitor progress** - Watch the confidence scores improve over time

---

**Ready to start training? Navigate to the "AI Training" tab and begin improving your AI parser!** 🚀
