import React, { useState, useEffect, useRef } from 'react';
import { SecureFileStorage, SecureFileMeta } from '../lib/storage/secureFileStorage';
import { CSVBucketDataService, CSVBucketData } from '../lib/storage/bucketMemory';
import { UserPreferencesService } from '../lib/storage/userPreferences';
import { supabase } from '../services/supabaseClient';
import { CSVTimeSeriesService, CSVFile } from '../lib/services/csvTimeSeriesService';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { 
  Upload, 
  Download, 
  Trash2, 
  Eye, 
  Search, 
  FileText, 
  Shield, 
  Calendar,
  HardDrive,
  Tag,
  MoreVertical,
  Edit,
  Printer,
  Database,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface SupabaseCSVUpload {
  id: string;
  property_id: string;
  file_name: string;
  file_size: number;
  records_processed: number;
  records_skipped: number;
  upload_status: string;
  error_message?: string;
  uploaded_at: string;
  processed_at?: string;
  bucket_assignments?: Record<string, string>;
  included_items?: Record<string, boolean>;
  account_categories?: Record<string, string>;
  properties?: {
    name: string;
  };
}

interface CSVFileManagerProps {
  onFileSelect?: (file: CSVFile) => void;
  showUpload?: boolean;
  showPreview?: boolean;
  showDelete?: boolean;
  showEdit?: boolean;
  showPrint?: boolean;
  maxFileSize?: number; // in MB
}

export default function CSVFileManager({
  onFileSelect,
  showUpload = true,
  showPreview = true,
  showDelete = true,
  showEdit = true,
  showPrint = true,
  maxFileSize = 50
}: CSVFileManagerProps) {
  const [files, setFiles] = useState<CSVFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<CSVFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<CSVFile | null>(null);
  const [stats, setStats] = useState({
    totalFiles: 0,
    totalRecords: 0,
    activeFiles: 0,
    oldestFile: 0,
    newestFile: 0
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load files on component mount
  useEffect(() => {
    loadFiles();
    loadStats();
  }, []);

  // Filter files based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredFiles(files);
    } else {
      const filtered = files.filter(file =>
        file.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.upload_status.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (file as any).properties?.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredFiles(filtered);
    }
  }, [files, searchQuery]);

    const loadFiles = async () => {
      try {
        setIsLoading(true);
        // For now, using a placeholder organization ID
        // In a real app, this would come from the user's organization
        const organizationId = 'placeholder-org-id';
        const csvFiles = await CSVTimeSeriesService.getCSVFiles(organizationId);
        setFiles(csvFiles);
      } catch (error) {
        console.error('Failed to load CSV files:', error);
      } finally {
        setIsLoading(false);
      }
    };

  const loadStats = async () => {
    try {
      const totalRecords = files.reduce((sum, file) => sum + file.total_records, 0);
      const activeFiles = files.filter(file => file.upload_status === 'completed').length;
      
      setStats({
        totalFiles: files.length,
        totalRecords,
        activeFiles,
        oldestFile: files.length > 0 ? Math.min(...files.map(f => new Date(f.uploaded_at).getTime())) : 0,
        newestFile: files.length > 0 ? Math.max(...files.map(f => new Date(f.uploaded_at).getTime())) : 0
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsUploading(true);
    
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        // Check file type
        if (!file.name.toLowerCase().endsWith('.csv')) {
          alert(`File ${file.name} is not a CSV file. Only CSV files are supported.`);
          continue;
        }

        // Check file size
        if (file.size > maxFileSize * 1024 * 1024) {
          alert(`File ${file.name} is too large. Maximum size: ${maxFileSize}MB`);
          continue;
        }

        // Upload to Supabase Storage
        const fileName = `${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('csv-files')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Failed to upload file to Supabase Storage:', uploadError);
          alert(`Failed to upload ${file.name}. Please try again.`);
          continue;
        }

        // Create CSV upload record
        const { error: insertError } = await supabase
          .from('csv_uploads')
          .insert({
            file_name: file.name,
            file_size: file.size,
            upload_status: 'uploaded',
            property_id: null // Will be set when property is selected
          });

        if (insertError) {
          console.error('Failed to create CSV upload record:', insertError);
          alert(`Failed to create record for ${file.name}. Please try again.`);
          continue;
        }
      }

      // Reload files and stats
      await loadFiles();
      await loadStats();
      
      // Clear input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Failed to upload files:', error);
      alert('Failed to upload files. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileDelete = async (fileId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      // Delete from time series storage
      await CSVTimeSeriesService.deleteCSVFile(fileId);

      // Reload files and stats
      await loadFiles();
      await loadStats();
    } catch (error) {
      console.error('Failed to delete file:', error);
      alert('Failed to delete file. Please try again.');
    }
  };

  const handleFileDownload = async (file: CSVFile) => {
    try {
      // Download from Supabase Storage
      const fileName = `${Date.now()}-${file.file_name}`;
      const { data, error } = await supabase.storage
        .from('csv-files')
        .download(fileName);

      if (error) {
        console.error('Failed to download file from Supabase Storage:', error);
        alert('Failed to download file. Please try again.');
        return;
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download file:', error);
      alert('Failed to download file. Please try again.');
    }
  };

  const handleFilePreview = async (file: CSVFile) => {
    try {
      // Get file content from Supabase Storage
      const fileName = `${Date.now()}-${file.file_name}`;
      const { data, error } = await supabase.storage
        .from('csv-files')
        .download(fileName);

      if (error) {
        console.error('Failed to preview file from Supabase Storage:', error);
        alert('Preview not available for this file.');
        return;
      }

      const text = await data.text();
      setPreviewContent(text);
      setPreviewFile(file);
    } catch (error) {
      console.error('Failed to preview file:', error);
      alert('Failed to preview file. Please try again.');
    }
  };

  const handleFileEdit = (file: CSVFile) => {
    if (onFileSelect) {
      onFileSelect(file);
    } else {
      // Navigate to time series visualization page
      window.dispatchEvent(new CustomEvent('navigateToPage', { 
        detail: {
          page: 'csv-timeseries',
          fileId: file.id
        } 
      }));
    }
  };

  const handleFilePrint = async (file: CSVFile) => {
    try {
      // Get file content from Supabase Storage
      const fileName = `${Date.now()}-${file.file_name}`;
      const { data, error } = await supabase.storage
        .from('csv-files')
        .download(fileName);

      if (error) {
        console.error('Failed to print file from Supabase Storage:', error);
        alert('Print preview not available for this file.');
        return;
      }

      const content = await data.text();
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Print: ${file.file_name}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #1E3A8A; }
                pre { white-space: pre-wrap; font-size: 12px; }
                .header { margin-bottom: 20px; }
                .info { margin-bottom: 20px; color: #666; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>${file.file_name}</h1>
                <div class="info">
                  <p>File Size: ${formatFileSize(file.file_size)}</p>
                  <p>Records Processed: ${file.records_processed}</p>
                  <p>Uploaded: ${formatDate(new Date(file.uploaded_at).getTime())}</p>
                  <p>Status: ${file.upload_status}</p>
                  ${(file as any).properties?.name && `<p>Property: ${(file as any).properties.name}</p>`}
                </div>
              </div>
              <pre>${content}</pre>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    } catch (error) {
      console.error('Failed to print file:', error);
      alert('Failed to print file. Please try again.');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (file: CSVFile) => {
    switch (file.upload_status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusText = (file: CSVFile) => {
    switch (file.upload_status) {
      case 'completed':
        return 'Completed';
      case 'processing':
        return 'Processing';
      case 'failed':
        return 'Failed';
      case 'uploaded':
        return 'Uploaded';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">CSV File Manager</h2>
          <p className="text-gray-600">Manage your CSV files from Supabase backend with bucket assignments and categorization</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            onClick={loadFiles}
            disabled={isLoading}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          
          {showUpload && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center space-x-2"
              >
                <Upload className="h-4 w-4" />
                <span>{isUploading ? 'Uploading...' : 'Upload CSV Files'}</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Total Files</p>
                <p className="text-2xl font-bold">{stats.totalFiles}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Total Records</p>
                <p className="text-2xl font-bold">{stats.totalRecords.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Active Files</p>
                <p className="text-2xl font-bold">{stats.activeFiles}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Latest Upload</p>
                <p className="text-sm font-bold">
                  {stats.newestFile ? formatDate(stats.newestFile) : 'None'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search CSV files by name, type, or account..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Files List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <RefreshCw className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Loading CSV files...</h3>
              <p className="text-gray-600">Fetching files from Supabase backend</p>
            </CardContent>
          </Card>
        ) : filteredFiles.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No CSV files found</h3>
              <p className="text-gray-600 mb-4">
                {searchQuery ? 'No CSV files match your search criteria.' : 'Upload your first CSV file to get started.'}
              </p>
              {showUpload && !searchQuery && (
                <Button onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload CSV Files
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredFiles.map((file) => (
            <Card key={file.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="flex-shrink-0">
                      <FileText className="h-8 w-8 text-blue-500" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {file.file_name}
                        </h3>
                        {getStatusIcon(file)}
                        <Badge variant="secondary" className="text-xs">
                          {getStatusText(file)}
                        </Badge>
                      </div>
                      
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>{file.total_records} records</span>
                          <span>{formatDate(new Date(file.uploaded_at).getTime())}</span>
                          <span>{formatFileSize(file.file_size)}</span>
                          <span className="text-green-600 font-medium">
                            Time series data available
                          </span>
                        </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {onFileSelect && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onFileSelect(file)}
                      >
                        Select
                      </Button>
                    )}
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {showPreview && (
                          <DropdownMenuItem onClick={() => handleFilePreview(file)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </DropdownMenuItem>
                        )}
                          {showEdit && (
                            <DropdownMenuItem onClick={() => handleFileEdit(file)}>
                              <Edit className="h-4 w-4 mr-2" />
                              View Time Series
                            </DropdownMenuItem>
                          )}
                        <DropdownMenuItem onClick={() => handleFileDownload(file)}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        {showPrint && (
                          <DropdownMenuItem onClick={() => handleFilePrint(file)}>
                            <Printer className="h-4 w-4 mr-2" />
                            Print
                          </DropdownMenuItem>
                        )}
                        {showDelete && (
                          <DropdownMenuItem 
                            onClick={() => handleFileDelete(file.id, file.file_name)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Preview Modal */}
      {previewContent && previewFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl max-h-[80vh] m-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Eye className="h-5 w-5" />
                    <span>Preview: {previewFile.file_name}</span>
                  </CardTitle>
                    <CardDescription>
                      {previewFile.total_records} records • {formatDate(new Date(previewFile.uploaded_at).getTime())}
                      <span className="ml-2 text-green-600">
                        • Time series data available
                      </span>
                    </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setPreviewContent(null);
                    setPreviewFile(null);
                  }}
                >
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-auto">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {previewContent}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
