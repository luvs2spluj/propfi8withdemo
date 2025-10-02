import React, { useState, useEffect, useRef } from 'react';
import { SecureFileStorage, SecureFileMeta } from '../lib/storage/secureFileStorage';
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
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface FileManagerProps {
  onFileSelect?: (file: SecureFileMeta) => void;
  showUpload?: boolean;
  showPreview?: boolean;
  showDelete?: boolean;
  acceptedTypes?: string[];
  maxFileSize?: number; // in MB
}

export default function FileManager({
  onFileSelect,
  showUpload = true,
  showPreview = true,
  showDelete = true,
  acceptedTypes = ['.csv', '.json', '.txt'],
  maxFileSize = 10
}: FileManagerProps) {
  const [files, setFiles] = useState<SecureFileMeta[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<SecureFileMeta[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<SecureFileMeta | null>(null);
  const [stats, setStats] = useState({
    totalFiles: 0,
    totalSize: 0,
    encryptedFiles: 0,
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
        file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        file.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredFiles(filtered);
    }
  }, [files, searchQuery]);

  const loadFiles = async () => {
    try {
      const fileList = await SecureFileStorage.listFiles();
      setFiles(fileList);
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  };

  const loadStats = async () => {
    try {
      const storageStats = await SecureFileStorage.getStorageStats();
      setStats(storageStats);
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
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!acceptedTypes.includes(fileExtension)) {
          alert(`File type ${fileExtension} is not supported. Accepted types: ${acceptedTypes.join(', ')}`);
          continue;
        }

        // Check file size
        if (file.size > maxFileSize * 1024 * 1024) {
          alert(`File ${file.name} is too large. Maximum size: ${maxFileSize}MB`);
          continue;
        }

        // Store file securely
        await SecureFileStorage.storeFile(file, {
          encrypt: true,
          tags: ['uploaded'],
          description: `Uploaded on ${new Date().toLocaleDateString()}`
        });
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
      const success = await SecureFileStorage.deleteFile(fileId);
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

  const handleFilePreview = async (file: SecureFileMeta) => {
    try {
      const content = await SecureFileStorage.previewFile(file.id);
      if (content) {
        setPreviewContent(content);
        setPreviewFile(file);
      } else {
        alert('Preview not available for this file type.');
      }
    } catch (error) {
      console.error('Failed to preview file:', error);
      alert('Failed to preview file. Please try again.');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">File Manager</h2>
          <p className="text-gray-600">Securely store and manage your files</p>
        </div>
        
        {showUpload && (
          <div className="flex items-center space-x-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={acceptedTypes.join(',')}
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center space-x-2"
            >
              <Upload className="h-4 w-4" />
              <span>{isUploading ? 'Uploading...' : 'Upload Files'}</span>
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
              <HardDrive className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Total Size</p>
                <p className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Encrypted</p>
                <p className="text-2xl font-bold">{stats.encryptedFiles}</p>
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
          placeholder="Search files by name, tags, or description..."
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
              <p className="text-gray-600 mb-4">
                {searchQuery ? 'No files match your search criteria.' : 'Upload your first file to get started.'}
              </p>
              {showUpload && !searchQuery && (
                <Button onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Files
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
                          {file.name}
                        </h3>
                        {file.encrypted && (
                          <Badge variant="secondary" className="text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            Encrypted
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>{formatFileSize(file.size)}</span>
                        <span>{formatDate(file.uploadedAt)}</span>
                        {file.tags && file.tags.length > 0 && (
                          <div className="flex items-center space-x-1">
                            <Tag className="h-3 w-3" />
                            <span>{file.tags.join(', ')}</span>
                          </div>
                        )}
                      </div>
                      
                      {file.description && (
                        <p className="text-xs text-gray-600 mt-1 truncate">
                          {file.description}
                        </p>
                      )}
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
                        <DropdownMenuItem onClick={() => handleFileDownload(file.id)}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        {showDelete && (
                          <DropdownMenuItem 
                            onClick={() => handleFileDelete(file.id, file.name)}
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
                    <span>Preview: {previewFile.name}</span>
                  </CardTitle>
                  <CardDescription>
                    {formatFileSize(previewFile.size)} • {formatDate(previewFile.uploadedAt)}
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

