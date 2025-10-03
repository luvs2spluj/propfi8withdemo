// Sample CSV data for testing dashboard population
export const sampleBudgetData = `Account Name,Jan 2024,Feb 2024,Mar 2024,Apr 2024,May 2024,Jun 2024,Jul 2024,Aug 2024,Sep 2024,Oct 2024,Nov 2024,Dec 2024,Total
Gross Potential Rent,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,10000,120000
Vacancy,-500,-500,-500,-500,-500,-500,-500,-500,-500,-500,-500,-500,-6000
Effective Gross Income,9500,9500,9500,9500,9500,9500,9500,9500,9500,9500,9500,9500,114000

Operating Expenses
Property Management Fees,500,500,500,500,500,500,500,500,500,500,500,500,6000
Repairs & Maintenance,200,150,300,100,250,180,220,170,280,120,200,190,2360
Utilities,300,320,290,310,300,330,280,310,300,320,290,300,3650
Insurance,100,100,100,100,100,100,100,100,100,100,100,100,1200
Total Operating Expenses,1100,1070,1190,1010,1150,1110,1100,1080,1180,1040,1090,1090,13210

Net Operating Income,8400,8430,8310,8490,8350,8390,8400,8420,8320,8460,8410,8410,100750`;

// Instructions for testing dashboard data population
export const testInstructions = `
To test dashboard data population:

1. Go to the CSV Budget Importer page
2. Add a property using the Property Management section
3. Select the property
4. Upload the sample CSV data above (copy and paste into the text area)
5. Click "Parse CSV Text"
6. Go back to the Dashboard
7. The dashboard should now show:
   - Total Revenue: $114,000
   - Total Expenses: $13,210
   - Net Income: $100,750
   - Charts should populate with monthly data

The data should flow from CSVBudgetImporter → Property System → Dashboard Charts
`;
