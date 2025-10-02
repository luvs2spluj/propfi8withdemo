import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { ArrowLeft, FileText, Calendar, BarChart3 } from 'lucide-react';
import CSVTimeSeriesVisualization from '../components/CSVTimeSeriesVisualization';
import { CSVTimeSeriesService, CSVFile } from '../lib/services/csvTimeSeriesService';

export default function CSVTimeSeriesPage() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const [csvFile, setCsvFile] = useState<CSVFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fileId) {
      loadCSVFile(fileId);
    }
  }, [fileId]);

  const loadCSVFile = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // For now, we'll need to get the file from the list
      // In a real app, you'd have a getCSVFileById method
      const organizationId = 'placeholder-org-id';
      const files = await CSVTimeSeriesService.getCSVFiles(organizationId);
      const file = files.find(f => f.id === id);
      
      if (file) {
        setCsvFile(file);
      } else {
        setError('CSV file not found');
      }
    } catch (error) {
      console.error('Failed to load CSV file:', error);
      setError('Failed to load CSV file');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Loading CSV File...</h3>
            <p className="text-gray-600">Fetching time series data</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !csvFile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-red-500 mb-4">
              <FileText className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading File</h3>
            <p className="text-gray-600 mb-4">{error || 'CSV file not found'}</p>
            <Button onClick={() => navigate('/csv-file-manager')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to File Manager
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/csv-file-manager')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to File Manager
            </Button>
          </div>
          
          <div className="flex items-center gap-3 mb-2">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-gray-900">
              {csvFile.file_name}
            </h1>
          </div>
          
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Uploaded {new Date(csvFile.uploaded_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span>{csvFile.total_records} records</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="capitalize">{csvFile.file_type.replace('_', ' ')}</span>
            </div>
          </div>
        </div>

        {/* Time Series Visualization */}
        <CSVTimeSeriesVisualization 
          csvFileId={csvFile.id} 
          fileName={csvFile.file_name} 
        />
      </div>
    </div>
  );
}
