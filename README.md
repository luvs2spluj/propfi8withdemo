# Horton Properties Data Dashboard

A comprehensive data dashboard for Horton Properties management, built with React, TypeScript, and Tailwind CSS.

## Features

- **Dashboard Overview**: Key metrics, revenue trends, and property performance
- **Property Management**: View and manage all properties with detailed information
- **Analytics**: Deep insights into property performance and market trends
- **Financials**: Comprehensive financial reporting and expense tracking
- **Reports**: Generate and manage various property reports

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Chart.js with react-chartjs-2
- **Icons**: Lucide React
- **Build Tool**: Create React App

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Available Scripts

- `npm start` - Runs the app in development mode
- `npm build` - Builds the app for production
- `npm test` - Launches the test runner
- `npm eject` - Ejects from Create React App (one-way operation)

## Project Structure

```
src/
├── components/
│   ├── charts/          # Chart components
│   ├── Dashboard.tsx    # Main dashboard page
│   ├── Properties.tsx    # Properties management
│   ├── Analytics.tsx    # Analytics and insights
│   ├── Financials.tsx   # Financial reporting
│   ├── Reports.tsx     # Report generation
│   └── Sidebar.tsx     # Navigation sidebar
├── App.tsx             # Main app component
├── index.tsx           # App entry point
└── index.css           # Global styles
```

## Features Overview

### Dashboard
- Key performance metrics
- Revenue trend visualization
- Occupancy rate tracking
- Property performance charts
- Recent activity feed

### Properties
- Property listing with search and filters
- Detailed property information
- Occupancy and revenue tracking
- Quick actions (view, edit, delete)

### Analytics
- Revenue and occupancy trends
- Property performance comparison
- Market insights and opportunities
- Top performing properties

### Financials
- Comprehensive financial overview
- Monthly breakdown
- Expense categorization
- Revenue source analysis
- Profit margin tracking

### Reports
- Pre-built report templates
- Custom report generation
- Multiple export formats (PDF, Excel, CSV)
- Report status tracking

## Customization

The dashboard is designed to be easily customizable:

- **Colors**: Modify the color scheme in `tailwind.config.js`
- **Data**: Replace mock data with real API integrations
- **Charts**: Customize chart configurations in the chart components
- **Layout**: Adjust the layout and components as needed

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.
