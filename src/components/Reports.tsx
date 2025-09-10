import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Filter,
  Eye,
  Plus,
  BarChart3,
  DollarSign,
  Users,
  Building2
} from 'lucide-react';

interface Report {
  id: string;
  title: string;
  type: 'financial' | 'occupancy' | 'maintenance' | 'tenant';
  description: string;
  createdDate: string;
  status: 'ready' | 'generating' | 'failed';
  size: string;
  format: 'PDF' | 'Excel' | 'CSV';
}

const Reports: React.FC = () => {
  const [selectedType, setSelectedType] = useState('all');
  const [selectedFormat, setSelectedFormat] = useState('all');

  const reports: Report[] = [
    {
      id: '1',
      title: 'Monthly Financial Summary',
      type: 'financial',
      description: 'Complete financial overview including revenue, expenses, and profit margins',
      createdDate: '2024-01-15',
      status: 'ready',
      size: '2.4 MB',
      format: 'PDF'
    },
    {
      id: '2',
      title: 'Occupancy Rate Analysis',
      type: 'occupancy',
      description: 'Detailed occupancy rates and trends across all properties',
      createdDate: '2024-01-14',
      status: 'ready',
      size: '1.8 MB',
      format: 'Excel'
    },
    {
      id: '3',
      title: 'Maintenance Cost Report',
      type: 'maintenance',
      description: 'Breakdown of maintenance costs and repair history',
      createdDate: '2024-01-13',
      status: 'ready',
      size: '3.1 MB',
      format: 'PDF'
    },
    {
      id: '4',
      title: 'Tenant Demographics',
      type: 'tenant',
      description: 'Analysis of tenant demographics and lease patterns',
      createdDate: '2024-01-12',
      status: 'generating',
      size: 'N/A',
      format: 'CSV'
    },
    {
      id: '5',
      title: 'Annual Property Performance',
      type: 'financial',
      description: 'Year-end performance analysis for all properties',
      createdDate: '2024-01-10',
      status: 'ready',
      size: '4.2 MB',
      format: 'PDF'
    },
    {
      id: '6',
      title: 'Rent Roll Analysis',
      type: 'tenant',
      description: 'Current rent roll with lease expiration dates',
      createdDate: '2024-01-08',
      status: 'failed',
      size: 'N/A',
      format: 'Excel'
    }
  ];

  const reportTemplates = [
    {
      name: 'Financial Summary',
      description: 'Monthly revenue, expenses, and profit analysis',
      icon: DollarSign,
      color: 'green'
    },
    {
      name: 'Occupancy Report',
      description: 'Property occupancy rates and trends',
      icon: Building2,
      color: 'blue'
    },
    {
      name: 'Maintenance Report',
      description: 'Maintenance costs and work order history',
      icon: BarChart3,
      color: 'orange'
    },
    {
      name: 'Tenant Report',
      description: 'Tenant demographics and lease information',
      icon: Users,
      color: 'purple'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'generating':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'financial':
        return DollarSign;
      case 'occupancy':
        return Building2;
      case 'maintenance':
        return BarChart3;
      case 'tenant':
        return Users;
      default:
        return FileText;
    }
  };

  const filteredReports = reports.filter(report => {
    const typeMatch = selectedType === 'all' || report.type === selectedType;
    const formatMatch = selectedFormat === 'all' || report.format === selectedFormat;
    return typeMatch && formatMatch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600 mt-1">Generate and manage your property reports</p>
        </div>
        <button className="btn-primary flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>New Report</span>
        </button>
      </div>

      {/* Report Templates */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Report Templates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {reportTemplates.map((template, index) => {
            const Icon = template.icon;
            return (
              <button
                key={index}
                className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors duration-200 text-left"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                  template.color === 'green' ? 'bg-green-100' :
                  template.color === 'blue' ? 'bg-blue-100' :
                  template.color === 'orange' ? 'bg-orange-100' :
                  'bg-purple-100'
                }`}>
                  <Icon className={`w-5 h-5 ${
                    template.color === 'green' ? 'text-green-600' :
                    template.color === 'blue' ? 'text-blue-600' :
                    template.color === 'orange' ? 'text-orange-600' :
                    'text-purple-600'
                  }`} />
                </div>
                <h4 className="font-medium text-gray-900 mb-1">{template.name}</h4>
                <p className="text-sm text-gray-500">{template.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="financial">Financial</option>
              <option value="occupancy">Occupancy</option>
              <option value="maintenance">Maintenance</option>
              <option value="tenant">Tenant</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-gray-400" />
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Formats</option>
              <option value="PDF">PDF</option>
              <option value="Excel">Excel</option>
              <option value="CSV">CSV</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Reports</h3>
        <div className="space-y-4">
          {filteredReports.map((report) => {
            const TypeIcon = getTypeIcon(report.type);
            return (
              <div key={report.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <TypeIcon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{report.title}</h4>
                    <p className="text-sm text-gray-500">{report.description}</p>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-xs text-gray-400">
                        Created: {new Date(report.createdDate).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-gray-400">
                        Size: {report.size}
                      </span>
                      <span className="text-xs text-gray-400">
                        Format: {report.format}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                    {report.status}
                  </span>
                  <div className="flex space-x-1">
                    <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                      disabled={report.status !== 'ready'}
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {filteredReports.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
          <p className="text-gray-500">Try adjusting your filter criteria or create a new report.</p>
        </div>
      )}
    </div>
  );
};

export default Reports;
