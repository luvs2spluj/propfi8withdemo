import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Download,
  AlertTriangle,
  DollarSign,
  Users,
  Building,
  Target,
  BarChart3,
  X,
  Info,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import ApiService from '../services/api';

interface Property {
  id: string;
  name: string;
  address?: string;
  type?: string;
  total_units?: number;
}

const Analytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState('12m');
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [selectedInsight, setSelectedInsight] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  // Function to handle insight card clicks and generate detailed AI reasoning
  const handleInsightClick = (insight: any) => {
    setSelectedInsight(insight);
    setShowModal(true);
  };

  // Function to generate detailed AI reasoning with real data
  const generateDetailedReasoning = (insight: any) => {
    if (!analyticsData || !insight) return null;

    const reasoning: {
      title: string;
      currentData: Record<string, any>;
      benchmarks: Record<string, any>;
      calculations: Record<string, any>;
      recommendations: string[];
      riskFactors: string[];
      opportunities: string[];
    } = {
      title: insight.title,
      currentData: {},
      benchmarks: {},
      calculations: {},
      recommendations: [],
      riskFactors: [],
      opportunities: []
    };

    switch (insight.title) {
      case 'Rent Optimization Opportunity':
        reasoning.currentData = {
          revenuePerUnit: analyticsData.revenuePerUnit,
          totalRevenue: analyticsData.totalRevenue,
          totalUnits: analyticsData.totalUnits,
          timePeriod: analyticsData.timeRange,
          monthlyRevenue: analyticsData.monthlyData?.map((m: any) => parseFloat(m['Monthly Revenue']) || 0) || []
        };
        reasoning.benchmarks = {
          marketRate: 1500,
          industryAverage: 1400,
          premiumThreshold: 1600
        };
        reasoning.calculations = {
          currentVsMarket: ((analyticsData.revenuePerUnit - 1500) / 1500 * 100).toFixed(1),
          potentialIncrease: analyticsData.revenuePerUnit > 1500 ? '3-5%' : '8-12%',
          revenueImpact: analyticsData.revenuePerUnit > 1500 ? 
            `$${(analyticsData.totalRevenue * 0.04).toLocaleString()} annually` : 
            `$${(analyticsData.totalRevenue * 0.10).toLocaleString()} annually`
        };
        reasoning.recommendations = [
          'Analyze local market comparables for competitive pricing',
          'Implement gradual rent increases to minimize tenant turnover',
          'Consider unit upgrades to justify higher rents',
          'Monitor occupancy rates during rent adjustments'
        ];
        reasoning.riskFactors = [
          'Potential tenant turnover with rent increases',
          'Market competition may limit pricing power',
          'Economic conditions affecting tenant affordability'
        ];
        reasoning.opportunities = [
          'Premium positioning in local market',
          'Increased revenue per square foot',
          'Higher quality tenant retention',
          'Improved property valuation'
        ];
        break;

      case 'Expense Management Alert':
        reasoning.currentData = {
          expenseRatio: analyticsData.expenseRatio,
          totalExpenses: analyticsData.totalExpenses,
          totalRevenue: analyticsData.totalRevenue,
          avgMaintenance: analyticsData.avgMaintenance,
          avgUtilities: analyticsData.avgUtilities,
          avgInsurance: analyticsData.avgInsurance,
          avgPropertyTax: analyticsData.avgPropertyTax,
          avgOtherExpenses: analyticsData.avgOtherExpenses
        };
        reasoning.benchmarks = {
          industryStandard: 0.6,
          efficientThreshold: 0.5,
          highCostThreshold: 0.7
        };
        reasoning.calculations = {
          currentVsBenchmark: ((analyticsData.expenseRatio - 0.6) / 0.6 * 100).toFixed(1),
          costSavings: analyticsData.expenseRatio < 0.6 ? 
            `$${(analyticsData.totalRevenue * (0.6 - analyticsData.expenseRatio)).toLocaleString()} saved vs benchmark` :
            `$${(analyticsData.totalRevenue * (analyticsData.expenseRatio - 0.6)).toLocaleString()} over benchmark`,
          expenseBreakdown: {
            maintenance: `${((analyticsData.avgMaintenance / analyticsData.totalExpenses) * 100).toFixed(1)}%`,
            utilities: `${((analyticsData.avgUtilities / analyticsData.totalExpenses) * 100).toFixed(1)}%`,
            insurance: `${((analyticsData.avgInsurance / analyticsData.totalExpenses) * 100).toFixed(1)}%`,
            propertyTax: `${((analyticsData.avgPropertyTax / analyticsData.totalExpenses) * 100).toFixed(1)}%`,
            other: `${((analyticsData.avgOtherExpenses / analyticsData.totalExpenses) * 100).toFixed(1)}%`
          }
        };
        reasoning.recommendations = analyticsData.expenseRatio > 0.6 ? [
          'Review maintenance contracts for cost optimization',
          'Implement energy-efficient upgrades to reduce utilities',
          'Shop insurance providers for competitive rates',
          'Consider preventive maintenance to reduce repair costs'
        ] : [
          'Maintain current efficient operations',
          'Document cost-saving strategies for replication',
          'Consider reinvesting savings in property improvements',
          'Use efficiency as competitive advantage in marketing'
        ];
        reasoning.riskFactors = analyticsData.expenseRatio > 0.6 ? [
          'Deferred maintenance may increase future costs',
          'Utility costs may continue rising',
          'Insurance premiums may increase with claims',
          'Property tax assessments may rise'
        ] : [
          'Cost-cutting may impact service quality',
          'Deferred maintenance could create larger issues',
          'Market conditions may increase operating costs'
        ];
        reasoning.opportunities = [
          'Technology integration for cost monitoring',
          'Bulk purchasing agreements for supplies',
          'Energy efficiency rebates and incentives',
          'Preventive maintenance programs'
        ];
        break;

      case 'Revenue Trend Analysis':
        reasoning.currentData = {
          revenueTrend: analyticsData.revenueTrend,
          totalRevenue: analyticsData.totalRevenue,
          monthlyRevenue: analyticsData.monthlyData?.map((m: any) => parseFloat(m['Monthly Revenue']) || 0) || [],
          timePeriod: analyticsData.timeRange,
          occupancyRates: analyticsData.monthlyData?.map((m: any) => parseFloat(m['Occupancy Rate']) || 0) || []
        };
        reasoning.benchmarks = {
          healthyGrowth: 5000,
          stableThreshold: 1000,
          declineThreshold: -2000
        };
        reasoning.calculations = {
          trendPercentage: analyticsData.totalRevenue > 0 ? 
            ((analyticsData.revenueTrend / analyticsData.totalRevenue) * 100).toFixed(1) : '0',
          monthlyAverage: analyticsData.monthlyData ? 
            (analyticsData.totalRevenue / analyticsData.monthlyData.length).toLocaleString() : '0',
          occupancyCorrelation: analyticsData.monthlyData ? 
            analyticsData.monthlyData.map((m: any) => ({
              month: m.Date || m.month,
              revenue: parseFloat(m['Monthly Revenue']) || 0,
              occupancy: parseFloat(m['Occupancy Rate']) || 0
            })) : []
        };
        reasoning.recommendations = analyticsData.revenueTrend > 0 ? [
          'Continue current revenue-generating strategies',
          'Identify and replicate successful initiatives',
          'Consider expanding high-performing units',
          'Maintain tenant satisfaction to prevent turnover'
        ] : [
          'Investigate causes of revenue decline',
          'Review tenant retention strategies',
          'Analyze market conditions and competition',
          'Consider rent adjustments or promotions'
        ];
        reasoning.riskFactors = [
          'Economic downturns affecting tenant affordability',
          'Increased competition in local market',
          'Property condition issues affecting desirability',
          'Management inefficiencies impacting operations'
        ];
        reasoning.opportunities = [
          'Market positioning improvements',
          'Tenant retention program enhancements',
          'Revenue diversification strategies',
          'Technology adoption for efficiency'
        ];
        break;

      case 'Occupancy Performance':
        reasoning.currentData = {
          avgOccupancy: analyticsData.avgOccupancy,
          occupancyTrend: analyticsData.occupancyTrend,
          occupancyRates: analyticsData.monthlyData?.map((m: any) => parseFloat(m['Occupancy Rate']) || 0) || [],
          timePeriod: analyticsData.timeRange,
          totalUnits: analyticsData.totalUnits
        };
        reasoning.benchmarks = {
          industryStandard: 95,
          excellentThreshold: 98,
          concernThreshold: 90
        };
        reasoning.calculations = {
          currentVsBenchmark: ((analyticsData.avgOccupancy - 95) / 95 * 100).toFixed(1),
          trendImpact: analyticsData.occupancyTrend > 0 ? 
            `Improving by ${analyticsData.occupancyTrend.toFixed(1)}%` :
            `Declining by ${Math.abs(analyticsData.occupancyTrend).toFixed(1)}%`,
          revenueImpact: analyticsData.avgOccupancy < 95 ? 
            `$${((95 - analyticsData.avgOccupancy) / 100 * analyticsData.totalRevenue).toLocaleString()} potential revenue loss` :
            `$${((analyticsData.avgOccupancy - 95) / 100 * analyticsData.totalRevenue).toLocaleString()} revenue advantage`
        };
        reasoning.recommendations = analyticsData.occupancyTrend > 0 ? [
          'Maintain current tenant satisfaction initiatives',
          'Continue effective marketing strategies',
          'Monitor market conditions for opportunities',
          'Document successful retention practices'
        ] : [
          'Review tenant turnover causes',
          'Enhance marketing and advertising efforts',
          'Improve property condition and amenities',
          'Implement tenant retention programs'
        ];
        reasoning.riskFactors = [
          'Seasonal occupancy fluctuations',
          'Economic conditions affecting demand',
          'Property condition issues',
          'Competition from new developments'
        ];
        reasoning.opportunities = [
          'Technology integration for tenant services',
          'Amenity improvements to attract tenants',
          'Flexible lease terms for market responsiveness',
          'Community building initiatives'
        ];
        break;
    }

    return reasoning;
  };

  // Function to filter data based on time range
  const filterDataByTimeRange = (monthlyData: any[]) => {
    const now = new Date();
    let monthsToInclude = 12; // default
    
    switch (timeRange) {
      case '1m':
        monthsToInclude = 1;
        break;
      case '3m':
        monthsToInclude = 3;
        break;
      case '6m':
        monthsToInclude = 6;
        break;
      case '12m':
        monthsToInclude = 12;
        break;
      case '24m':
        monthsToInclude = 24;
        break;
    }
    
    // Return the last N months of data
    return monthlyData.slice(-monthsToInclude);
  };

  const loadAnalyticsData = async () => {
    try {
      setIsLoading(true);
      
      // Load data from local backend
      try {
        const localDataResponse = await fetch('http://localhost:5000/api/processed-data');
        if (localDataResponse.ok) {
          const localData = await localDataResponse.json();
          console.log('📊 Analytics data loaded:', localData);
          
          if (localData.success && localData.data) {
            // Extract properties and calculate analytics
            const propertyNames = new Set<string>();
            Object.keys(localData.data).forEach(propertyName => {
              propertyNames.add(propertyName);
            });
            
            const localProperties: Property[] = Array.from(propertyNames).map(name => ({
              id: `local-${name.toLowerCase()}`,
              name: name,
              address: 'Local Data Source',
              type: 'Apartment Complex',
              total_units: 26
            }));
            
            setProperties(localProperties);
            
            // Calculate detailed analytics from sample data
            const allData = Object.values(localData.data).flat();
            let allMonthlyData: any[] = [];
            
            allData.forEach((item: any) => {
              if (item.data?.sample && Array.isArray(item.data.sample)) {
                item.data.sample.forEach((month: any) => {
                  allMonthlyData.push(month);
                });
              }
            });
            
            // Filter data based on selected time range
            const filteredData = filterDataByTimeRange(allMonthlyData);
            const monthsInRange = filteredData.length;
            
            // Calculate analytics for the selected time range
            let totalRevenue = 0;
            let totalExpenses = 0;
            let occupancyRates: number[] = [];
            let maintenanceCosts: number[] = [];
            let utilitiesCosts: number[] = [];
            let insuranceCosts: number[] = [];
            let propertyTaxCosts: number[] = [];
            let otherExpenses: number[] = [];
            let netIncomes: number[] = [];
            
            filteredData.forEach((month: any) => {
              const monthlyRevenue = parseFloat(month['Monthly Revenue']) || 0;
              const maintenance = parseFloat(month['Maintenance Cost']) || 0;
              const utilities = parseFloat(month['Utilities Cost']) || 0;
              const insurance = parseFloat(month['Insurance Cost']) || 0;
              const propertyTax = parseFloat(month['Property Tax']) || 0;
              const otherExp = parseFloat(month['Other Expenses']) || 0;
              const netIncome = parseFloat(month['Net Income']) || 0;
              
              totalRevenue += monthlyRevenue;
              totalExpenses += maintenance + utilities + insurance + propertyTax + otherExp;
              
              occupancyRates.push(parseFloat(month['Occupancy Rate']) || 0);
              maintenanceCosts.push(maintenance);
              utilitiesCosts.push(utilities);
              insuranceCosts.push(insurance);
              propertyTaxCosts.push(propertyTax);
              otherExpenses.push(otherExp);
              netIncomes.push(netIncome);
            });
            
            // Calculate analytics insights
            const avgOccupancy = occupancyRates.length > 0 ? 
              occupancyRates.reduce((sum, rate) => sum + rate, 0) / occupancyRates.length : 0;
            const avgMaintenance = maintenanceCosts.length > 0 ? 
              maintenanceCosts.reduce((sum, cost) => sum + cost, 0) / maintenanceCosts.length : 0;
            const avgUtilities = utilitiesCosts.length > 0 ? 
              utilitiesCosts.reduce((sum, cost) => sum + cost, 0) / utilitiesCosts.length : 0;
            const avgInsurance = insuranceCosts.length > 0 ? 
              insuranceCosts.reduce((sum, cost) => sum + cost, 0) / insuranceCosts.length : 0;
            const avgPropertyTax = propertyTaxCosts.length > 0 ? 
              propertyTaxCosts.reduce((sum, cost) => sum + cost, 0) / propertyTaxCosts.length : 0;
            const avgOtherExpenses = otherExpenses.length > 0 ? 
              otherExpenses.reduce((sum, cost) => sum + cost, 0) / otherExpenses.length : 0;
            
            const netIncome = totalRevenue - totalExpenses;
            const profitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;
            
            // Calculate trends and insights
            const revenuePerUnit = totalRevenue / (26 * monthsInRange); // 26 units, N months
            const expenseRatio = totalRevenue > 0 ? totalExpenses / totalRevenue : 0;
            
            // Calculate occupancy trend (comparing first half vs second half of period)
            const occupancyTrend = occupancyRates.length > 2 ? 
              (occupancyRates.slice(-Math.ceil(occupancyRates.length / 2)).reduce((sum, rate) => sum + rate, 0) / Math.ceil(occupancyRates.length / 2)) - 
              (occupancyRates.slice(0, Math.floor(occupancyRates.length / 2)).reduce((sum, rate) => sum + rate, 0) / Math.floor(occupancyRates.length / 2)) : 0;
            
            // Calculate revenue trend
            const revenueTrend = filteredData.length > 1 ? 
              (parseFloat(filteredData[filteredData.length - 1]['Monthly Revenue']) || 0) - 
              (parseFloat(filteredData[0]['Monthly Revenue']) || 0) : 0;
            
            // Calculate expense trend
            const expenseTrend = filteredData.length > 1 ? 
              ((maintenanceCosts[maintenanceCosts.length - 1] || 0) + (utilitiesCosts[utilitiesCosts.length - 1] || 0) + 
               (insuranceCosts[insuranceCosts.length - 1] || 0) + (propertyTaxCosts[propertyTaxCosts.length - 1] || 0) + 
               (otherExpenses[otherExpenses.length - 1] || 0)) - 
              ((maintenanceCosts[0] || 0) + (utilitiesCosts[0] || 0) + (insuranceCosts[0] || 0) + 
               (propertyTaxCosts[0] || 0) + (otherExpenses[0] || 0)) : 0;
            
            setAnalyticsData({
              totalRevenue,
              totalExpenses,
              netIncome,
              profitMargin,
              avgOccupancy,
              avgMaintenance,
              avgUtilities,
              avgInsurance,
              avgPropertyTax,
              avgOtherExpenses,
              revenuePerUnit,
              expenseRatio,
              occupancyTrend,
              revenueTrend,
              expenseTrend,
              monthlyData: filteredData,
              totalUnits: 26,
              totalMonths: monthsInRange,
              timeRange
            });
          }
        }
      } catch (error) {
        console.log('⚠️ Analytics data not available');
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Property Management Analytics Metrics
  const analyticsMetrics = analyticsData ? [
    {
      title: 'Revenue per Unit',
      value: `$${analyticsData.revenuePerUnit.toLocaleString()}`,
      change: analyticsData.revenuePerUnit > 1500 ? 'Above Market' : 'Below Market',
      changeType: analyticsData.revenuePerUnit > 1500 ? 'positive' as const : 'negative' as const,
      period: `${analyticsData.timeRange === '1m' ? 'current month' : `avg over ${analyticsData.timeRange}`}`,
      icon: DollarSign,
      color: 'green'
    },
    {
      title: 'Expense Ratio',
      value: `${(analyticsData.expenseRatio * 100).toFixed(1)}%`,
      change: analyticsData.expenseRatio < 0.6 ? 'Efficient' : 'High Costs',
      changeType: analyticsData.expenseRatio < 0.6 ? 'positive' as const : 'negative' as const,
      period: `of ${analyticsData.timeRange === '1m' ? 'monthly' : 'total'} revenue`,
      icon: TrendingDown,
      color: analyticsData.expenseRatio < 0.6 ? 'green' : 'red'
    },
    {
      title: 'Occupancy Trend',
      value: `${analyticsData.occupancyTrend > 0 ? '+' : ''}${analyticsData.occupancyTrend.toFixed(1)}%`,
      change: analyticsData.occupancyTrend > 0 ? 'Improving' : analyticsData.occupancyTrend < 0 ? 'Declining' : 'Stable',
      changeType: analyticsData.occupancyTrend > 0 ? 'positive' as const : analyticsData.occupancyTrend < 0 ? 'negative' as const : 'neutral' as const,
      period: `vs earlier ${analyticsData.timeRange}`,
      icon: TrendingUp,
      color: analyticsData.occupancyTrend > 0 ? 'blue' : analyticsData.occupancyTrend < 0 ? 'red' : 'gray'
    },
    {
      title: 'Revenue Trend',
      value: `${analyticsData.revenueTrend > 0 ? '+' : ''}$${analyticsData.revenueTrend.toLocaleString()}`,
      change: analyticsData.revenueTrend > 0 ? 'Growing' : analyticsData.revenueTrend < 0 ? 'Declining' : 'Stable',
      changeType: analyticsData.revenueTrend > 0 ? 'positive' as const : analyticsData.revenueTrend < 0 ? 'negative' as const : 'neutral' as const,
      period: `vs start of ${analyticsData.timeRange}`,
      icon: BarChart3,
      color: analyticsData.revenueTrend > 0 ? 'green' : analyticsData.revenueTrend < 0 ? 'red' : 'gray'
    }
  ] : [];

  // Property Management Insights
  const managementInsights = analyticsData ? [
    {
      title: 'Rent Optimization Opportunity',
      description: `Revenue per unit is $${analyticsData.revenuePerUnit.toLocaleString()} ${analyticsData.timeRange === '1m' ? 'this month' : `over ${analyticsData.timeRange}`}. ${analyticsData.revenuePerUnit > 1500 ? 'Above market rate - consider rent increase of 3-5%.' : 'Below market rate - potential for 8-12% increase.'}`,
      type: 'opportunity',
      impact: analyticsData.revenuePerUnit > 1500 ? 'Medium' : 'High',
      action: analyticsData.revenuePerUnit > 1500 ? 'Moderate rent increase' : 'Significant rent increase',
      icon: Target
    },
    {
      title: 'Expense Management Alert',
      description: `Expense ratio is ${(analyticsData.expenseRatio * 100).toFixed(1)}% ${analyticsData.timeRange === '1m' ? 'this month' : `over ${analyticsData.timeRange}`}. Industry benchmark is 60%. ${analyticsData.expenseRatio > 0.6 ? `Expenses are ${((analyticsData.expenseRatio - 0.6) * 100).toFixed(1)}% above benchmark.` : `Expenses are ${((0.6 - analyticsData.expenseRatio) * 100).toFixed(1)}% below benchmark.`}`,
      type: analyticsData.expenseRatio > 0.6 ? 'warning' : 'positive',
      impact: analyticsData.expenseRatio > 0.6 ? 'High' : 'Low',
      action: analyticsData.expenseRatio > 0.6 ? 'Review expense categories' : 'Maintain current efficiency',
      icon: AlertTriangle
    },
    {
      title: 'Revenue Trend Analysis',
      description: `Revenue ${analyticsData.revenueTrend > 0 ? 'increased' : analyticsData.revenueTrend < 0 ? 'decreased' : 'remained stable'} by $${Math.abs(analyticsData.revenueTrend).toLocaleString()} ${analyticsData.timeRange === '1m' ? 'this month' : `over ${analyticsData.timeRange}`}. ${analyticsData.revenueTrend > 0 ? 'Strong performance trend.' : analyticsData.revenueTrend < 0 ? 'Declining trend needs attention.' : 'Stable performance.'}`,
      type: analyticsData.revenueTrend > 0 ? 'positive' : analyticsData.revenueTrend < 0 ? 'warning' : 'info',
      impact: Math.abs(analyticsData.revenueTrend) > 5000 ? 'High' : 'Medium',
      action: analyticsData.revenueTrend > 0 ? 'Continue current strategy' : analyticsData.revenueTrend < 0 ? 'Investigate revenue decline' : 'Monitor performance',
      icon: BarChart3
    },
    {
      title: 'Occupancy Performance',
      description: `Average occupancy is ${analyticsData.avgOccupancy.toFixed(1)}% ${analyticsData.timeRange === '1m' ? 'this month' : `over ${analyticsData.timeRange}`}. ${analyticsData.occupancyTrend > 0 ? `Trend improved by ${analyticsData.occupancyTrend.toFixed(1)}%.` : analyticsData.occupancyTrend < 0 ? `Trend declined by ${Math.abs(analyticsData.occupancyTrend).toFixed(1)}%.` : 'Trend is stable.'}`,
      type: analyticsData.occupancyTrend > 0 ? 'positive' : analyticsData.occupancyTrend < 0 ? 'warning' : 'info',
      impact: Math.abs(analyticsData.occupancyTrend) > 2 ? 'High' : 'Medium',
      action: analyticsData.occupancyTrend > 0 ? 'Maintain current strategy' : analyticsData.occupancyTrend < 0 ? 'Review marketing & retention' : 'Monitor occupancy',
      icon: Users
    }
  ] : [];

  // Performance Benchmarks
  const performanceBenchmarks = analyticsData ? [
    {
      metric: 'Revenue per Unit',
      current: analyticsData.revenuePerUnit,
      benchmark: 1500,
      status: analyticsData.revenuePerUnit >= 1500 ? 'above' : 'below',
      unit: analyticsData.timeRange === '1m' ? '$/month' : `$/month avg`,
      variance: ((analyticsData.revenuePerUnit - 1500) / 1500 * 100).toFixed(1)
    },
    {
      metric: 'Expense Ratio',
      current: analyticsData.expenseRatio * 100,
      benchmark: 60,
      status: analyticsData.expenseRatio <= 0.6 ? 'below' : 'above',
      unit: '%',
      variance: ((analyticsData.expenseRatio - 0.6) / 0.6 * 100).toFixed(1)
    },
    {
      metric: 'Occupancy Rate',
      current: analyticsData.avgOccupancy,
      benchmark: 95,
      status: analyticsData.avgOccupancy >= 95 ? 'above' : 'below',
      unit: '%',
      variance: ((analyticsData.avgOccupancy - 95) / 95 * 100).toFixed(1)
    },
    {
      metric: 'Profit Margin',
      current: analyticsData.profitMargin,
      benchmark: 25,
      status: analyticsData.profitMargin >= 25 ? 'above' : 'below',
      unit: '%',
      variance: ((analyticsData.profitMargin - 25) / 25 * 100).toFixed(1)
    }
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Property Management Analytics</h1>
          <p className="text-gray-600 mt-1">Actionable insights for informed property management decisions</p>
        </div>
        <div className="flex space-x-3">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="1m">Last 1 month</option>
              <option value="3m">Last 3 months</option>
              <option value="6m">Last 6 months</option>
              <option value="12m">Last 12 months</option>
              <option value="24m">Last 24 months</option>
            </select>
          </div>
          <button className="btn-secondary flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {analyticsMetrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div key={index} className="metric-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{metric.value}</p>
                  <div className="flex items-center mt-1">
                    <span className={`text-sm ${
                      metric.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {metric.change}
                    </span>
                    <span className="text-sm text-gray-500 ml-1">{metric.period}</span>
                  </div>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  metric.color === 'green' ? 'bg-green-100' :
                  metric.color === 'blue' ? 'bg-blue-100' :
                  metric.color === 'purple' ? 'bg-purple-100' :
                  'bg-orange-100'
                }`}>
                  <Icon className={`w-6 h-6 ${
                    metric.color === 'green' ? 'text-green-600' :
                    metric.color === 'blue' ? 'text-blue-600' :
                    metric.color === 'purple' ? 'text-purple-600' :
                    'text-orange-600'
                  }`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Performance Benchmarks */}
        <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance vs Industry Benchmarks</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {performanceBenchmarks.map((benchmark, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{benchmark.metric}</h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  benchmark.status === 'above' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {benchmark.status === 'above' ? 'Above' : 'Below'} Benchmark
                </span>
            </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Current:</span>
                  <span className="font-semibold">{benchmark.current.toFixed(1)}{benchmark.unit}</span>
          </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Benchmark:</span>
                  <span className="text-sm text-gray-500">{benchmark.benchmark}{benchmark.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Variance:</span>
                  <span className={`text-sm font-medium ${
                    benchmark.status === 'above' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {parseFloat(benchmark.variance) > 0 ? '+' : ''}{benchmark.variance}%
                  </span>
                </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      {/* Management Insights */}
        <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Management Insights & Recommendations</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {managementInsights.map((insight, index) => {
            const Icon = insight.icon;
            return (
              <div key={index} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    insight.type === 'opportunity' ? 'bg-green-100' :
                    insight.type === 'warning' ? 'bg-yellow-100' :
                    insight.type === 'positive' ? 'bg-blue-100' :
                    'bg-gray-100'
                  }`}>
                    <Icon className={`w-4 h-4 ${
                      insight.type === 'opportunity' ? 'text-green-600' :
                      insight.type === 'warning' ? 'text-yellow-600' :
                      insight.type === 'positive' ? 'text-blue-600' :
                      'text-gray-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{insight.title}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    insight.impact === 'High' ? 'bg-red-100 text-red-800' :
                    insight.impact === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {insight.impact} Impact
                  </span>
                </div>
                    <p className="text-sm text-gray-600 mb-3">{insight.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-primary-600">{insight.action}</span>
                      <button 
                        onClick={() => handleInsightClick(insight)}
                        className="text-sm text-primary-600 hover:text-primary-700 font-medium cursor-pointer transition-colors"
                      >
                        Learn More →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cost Analysis */}
      {analyticsData && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Analysis Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Building className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Maintenance</h4>
              <p className="text-xl font-bold text-gray-900">${analyticsData.avgMaintenance.toLocaleString()}</p>
              <p className="text-sm text-gray-600">{analyticsData.timeRange === '1m' ? 'this month' : `avg over ${analyticsData.timeRange}`}</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Utilities</h4>
              <p className="text-xl font-bold text-gray-900">${analyticsData.avgUtilities.toLocaleString()}</p>
              <p className="text-sm text-gray-600">{analyticsData.timeRange === '1m' ? 'this month' : `avg over ${analyticsData.timeRange}`}</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Insurance</h4>
              <p className="text-xl font-bold text-gray-900">${analyticsData.avgInsurance.toLocaleString()}</p>
              <p className="text-sm text-gray-600">{analyticsData.timeRange === '1m' ? 'this month' : `avg over ${analyticsData.timeRange}`}</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Building className="w-6 h-6 text-red-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Property Tax</h4>
              <p className="text-xl font-bold text-gray-900">${analyticsData.avgPropertyTax.toLocaleString()}</p>
              <p className="text-sm text-gray-600">{analyticsData.timeRange === '1m' ? 'this month' : `avg over ${analyticsData.timeRange}`}</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Total Expenses</h4>
              <p className="text-xl font-bold text-gray-900">${analyticsData.totalExpenses.toLocaleString()}</p>
              <p className="text-sm text-gray-600">{analyticsData.timeRange === '1m' ? 'this month' : `total over ${analyticsData.timeRange}`}</p>
            </div>
          </div>
        </div>
      )}

      {/* AI Reasoning Modal */}
      {showModal && selectedInsight && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">AI Analysis: {selectedInsight.title}</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {(() => {
                const reasoning = generateDetailedReasoning(selectedInsight);
                if (!reasoning) return null;

                return (
                  <div className="space-y-6">
                    {/* Current Data */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
                        <Info className="w-5 h-5 mr-2" />
                        Current Performance Data
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(reasoning.currentData).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-sm text-blue-700 capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}:
                            </span>
                            <span className="text-sm font-medium text-blue-900">
                              {Array.isArray(value) ? 
                                `${value.length} data points` : 
                                typeof value === 'number' ? 
                                  (key.includes('Revenue') || key.includes('Expense') || key.includes('Cost') || key.includes('Unit') ? 
                                    `$${value.toLocaleString()}` : 
                                    key.includes('Ratio') ? `${value.toFixed(1)}%` :
                                    `${value.toFixed(1)}`) :
                                String(value)
                              }
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Benchmarks */}
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-green-900 mb-3 flex items-center">
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Industry Benchmarks
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(reasoning.benchmarks).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-sm text-green-700 capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}:
                            </span>
                            <span className="text-sm font-medium text-green-900">
                              {typeof value === 'number' ? 
                                (key.includes('Ratio') ? `${(value * 100).toFixed(1)}%` : 
                                 key.includes('Rate') && value <= 100 ? `${value}%` :
                                 key.includes('Threshold') && value <= 100 ? `${value}%` :
                                 key.includes('Market') || key.includes('Industry') || key.includes('Premium') || key.includes('Revenue') || key.includes('Expense') || key.includes('Cost') ? 
                                   `$${value.toLocaleString()}` :
                                 `${value.toLocaleString()}`) :
                                String(value)
                              }
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Calculations */}
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-yellow-900 mb-3 flex items-center">
                        <BarChart3 className="w-5 h-5 mr-2" />
                        AI Calculations & Analysis
                      </h3>
                      <div className="space-y-3">
                        {Object.entries(reasoning.calculations).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-sm text-yellow-700 capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}:
                            </span>
                            <span className="text-sm font-medium text-yellow-900">
                              {typeof value === 'object' && value !== null ? 
                                Object.entries(value).map(([subKey, subValue]) => (
                                  <div key={subKey} className="text-right">
                                    <span className="text-xs text-yellow-600">{subKey}: </span>
                                    <span className="text-xs font-medium">{String(subValue)}</span>
                                  </div>
                                )) :
                                String(value)
                              }
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recommendations */}
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-purple-900 mb-3 flex items-center">
                        <Target className="w-5 h-5 mr-2" />
                        AI Recommendations
                      </h3>
                      <ul className="space-y-2">
                        {reasoning.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-purple-600 mr-2">•</span>
                            <span className="text-sm text-purple-700">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Risk Factors */}
                    <div className="bg-red-50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-red-900 mb-3 flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        Risk Factors to Monitor
                      </h3>
                      <ul className="space-y-2">
                        {reasoning.riskFactors.map((risk, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-red-600 mr-2">⚠</span>
                            <span className="text-sm text-red-700">{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Opportunities */}
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-green-900 mb-3 flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2" />
                        Growth Opportunities
                      </h3>
                      <ul className="space-y-2">
                        {reasoning.opportunities.map((opp, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-green-600 mr-2">💡</span>
                            <span className="text-sm text-green-700">{opp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
