import React from 'react';
import FileManager from '../components/FileManager';
import { SecureFileMeta } from '../lib/storage/secureFileStorage';

export default function FileManagerPage() {
  const handleFileSelect = (file: SecureFileMeta) => {
    console.log('Selected file:', file);
    // You can implement file selection logic here
    // For example, open the file in a viewer or pass it to another component
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Secure File Manager
          </h1>
          <p className="text-gray-600">
            Upload, store, and manage your files securely with encryption and preview capabilities.
          </p>
        </div>

        <FileManager
          onFileSelect={handleFileSelect}
          showUpload={true}
          showPreview={true}
          showDelete={true}
          acceptedTypes={['.csv', '.json', '.txt', '.xlsx', '.pdf']}
          maxFileSize={50} // 50MB max
        />
      </div>
    </div>
  );
}

