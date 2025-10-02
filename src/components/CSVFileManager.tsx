import React, { useState, useEffect, useRef } from 'react';
import { SecureFileStorage, SecureFileMeta } from '../lib/storage/secureFileStorage';
import { CSVBucketDataService, CSVBucketData } from '../lib/storage/bucketMemory';
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
  AlertCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface CSVFileManagerProps {
  onFileSelect?: (file: CSVBucketData) => void;
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
  const [files, setFiles] = useState<CSVBucketData[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<CSVBucketData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<CSVBucketData | null>(null);
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
        file.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.fileType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        Object.keys(file.bucketAssignments).some(account => 
          account.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
      setFilteredFiles(filtered);
    }
  }, [files, searchQuery]);

  const loadFiles = async () => {
    try {
      const fileList = await CSVBucketDataService.getAllCSVBucketData();
      setFiles(fileList);
    } catch (error) {
      console.error('Failed to load CSV files:', error);
    }
  };

  const loadStats = async () => {
    try {
      const allFiles = await CSVBucketDataService.getAllCSVBucketData();
      const totalRecords = allFiles.reduce((sum, file) => sum + file.totalRecords, 0);
      const activeFiles = allFiles.filter(file => file.isActive).length;
      
      setStats({
        totalFiles: allFiles.length,
        totalRecords,
        activeFiles,
        oldestFile: allFiles.length > 0 ? Math.min(...allFiles.map(f => f.uploadedAt)) : 0,
        newestFile: allFiles.length > 0 ? Math.max(...allFiles.map(f => f.uploadedAt)) : 0
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

        // Store file securely
        const secureFile = await SecureFileStorage.storeFile(file, {
          encrypt: true,
          tags: ['csv', 'uploaded'],
          description: `CSV file uploaded on ${new Date().toLocaleDateString()}`
        });

        // Create CSV bucket data
        const csvData: CSVBucketData = {
          id: secureFile.id,
          fileName: file.name,
          fileType: 'csv',
          uploadedAt: Date.now(),
          bucketAssignments: {},
          includedItems: {},
          accountCategories: {},
          previewData: [],
          totalRecords: 0,
          isActive: true,
          lastModified: Date.now()
        };

        await CSVBucketDataService.saveCSVBucketData(csvData);
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
      // Delete from secure storage
      await SecureFileStorage.deleteFile(fileId);
      
      // Delete from CSV bucket data
      const success = await CSVBucketDataService.deleteCSVBucketData(fileId);
      
      if (success) {
        await loadFiles();
        await loadStats();
      } else {
        alert('Failed to delete file. Please try again.');
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
      alert('Failed to delete file. Please try again.');
    }
  };

  const handleFileDownload = async (fileId: string) => {
    try {
      await SecureFileStorage.exportFile(fileId);
    } catch (error) {
      console.error('Failed to download file:', error);
      alert('Failed to download file. Please try again.');
    }
  };

  const handleFilePreview = async (file: CSVBucketData) => {
    try {
      const content = await SecureFileStorage.previewFile(file.id);
      if (content) {
        setPreviewContent(content);
        setPreviewFile(file);
      } else {
        alert('Preview not available for this file.');
      }
    } catch (error) {
      console.error('Failed to preview file:', error);
      alert('Failed to preview file. Please try again.');
    }
  };

  const handleFileEdit = (file: CSVBucketData) => {
    if (onFileSelect) {
      onFileSelect(file);
    } else {
      // Navigate to CSV editing page
      window.dispatchEvent(new CustomEvent('navigateToPage', { 
        detail: { page: 'csvs' } 
      }));
    }
  };

  const handleFilePrint = async (file: CSVBucketData) => {
    try {
      const content = await SecureFileStorage.previewFile(file.id);
      if (content) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>Print: ${file.fileName}</title>
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
                  <h1>${file.fileName}</h1>
                  <div class="info">
                    <p>File Type: ${file.fileType}</p>
                    <p>Total Records: ${file.totalRecords}</p>
                    <p>Uploaded: ${new Date(file.uploadedAt).toLocaleDateString()}</p>
                    <p>Status: ${file.isActive ? 'Active' : 'Inactive'}</p>
                  </div>
                </div>
                <pre>${content}</pre>
              </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.print();
        }
      } else {
        alert('Print preview not available for this file.');
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

  const getStatusIcon = (file: CSVBucketData) => {
    if (file.isActive) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusText = (file: CSVBucketData) => {
    if (file.isActive) {
      return 'Active';
    } else {
      return 'Inactive';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">CSV File Manager</h2>
          <p className="text-gray-600">Manage your CSV files with bucket assignments and categorization</p>
        </div>
        
        {showUpload && (
          <div className="flex items-center space-x-2">
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
          </div>
        )}
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
        {filteredFiles.length === 0 ? (
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
                          {file.fileName}
                        </h3>
                        {getStatusIcon(file)}
                        <Badge variant="secondary" className="text-xs">
                          {getStatusText(file)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>{file.totalRecords} records</span>
                        <span>{formatDate(file.uploadedAt)}</span>
                        <span>{Object.keys(file.bucketAssignments).length} buckets</span>
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
                            Edit Buckets
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleFileDownload(file.id)}>
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
                            onClick={() => handleFileDelete(file.id, file.fileName)}
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
                    <span>Preview: {previewFile.fileName}</span>
                  </CardTitle>
                  <CardDescription>
                    {previewFile.totalRecords} records • {formatDate(previewFile.uploadedAt)}
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
