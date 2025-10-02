import React from 'react';
import CSVFileManager from '../components/CSVFileManager';

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
  properties?: {
    name: string;
  };
}

export default function CSVFileManagerPage() {
  const handleFileSelect = (file: any) => {
    console.log('Selected CSV file:', file);
    // Navigate to CSV editing page with the selected file
    window.dispatchEvent(new CustomEvent('navigateToPage', { 
      detail: { page: 'csvs', fileId: file.id } 
    }));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            CSV File Manager
          </h1>
          <p className="text-gray-600">
            Upload, manage, and edit your CSV files from Supabase backend with intelligent bucket categorization and memory.
          </p>
        </div>

        <CSVFileManager
          onFileSelect={handleFileSelect}
          showUpload={true}
          showPreview={true}
          showDelete={true}
          showEdit={true}
          showPrint={true}
          maxFileSize={50} // 50MB max
        />
      </div>
    </div>
  );
}
