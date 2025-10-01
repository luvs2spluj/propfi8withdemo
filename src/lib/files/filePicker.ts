// File System Access API support detection
export const supportsFSAccess =
  'showOpenFilePicker' in window || 'chooseFileSystemEntries' in window;

// Pick a single CSV file with FS Access API or fallback to input
export async function pickCSVFile(): Promise<File> {
  if (supportsFSAccess && 'showOpenFilePicker' in window) {
    try {
      const [handle] = await (window as any).showOpenFilePicker({
        multiple: false,
        types: [{ 
          description: 'CSV files', 
          accept: { 
            'text/csv': ['.csv'],
            'application/csv': ['.csv']
          } 
        }],
      });
      const file = await handle.getFile();
      return file;
    } catch (error) {
      // User cancelled or error occurred, fall back to input
      console.log('FS Access API failed, falling back to input:', error);
    }
  }
  
  // Fallback to traditional file input
  return new Promise<File>((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,text/csv,application/csv';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        resolve(file);
      } else {
        reject(new Error('No file selected'));
      }
    };
    input.oncancel = () => reject(new Error('File selection cancelled'));
    input.click();
  });
}

// Pick multiple CSV files
export async function pickCSVFiles(): Promise<File[]> {
  if (supportsFSAccess && 'showOpenFilePicker' in window) {
    try {
      const handles = await (window as any).showOpenFilePicker({
        multiple: true,
        types: [{ 
          description: 'CSV files', 
          accept: { 
            'text/csv': ['.csv'],
            'application/csv': ['.csv']
          } 
        }],
      });
      const files = await Promise.all(handles.map((handle: any) => handle.getFile()));
      return files;
    } catch (error) {
      console.log('FS Access API failed, falling back to input:', error);
    }
  }
  
  // Fallback to traditional file input
  return new Promise<File[]>((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,text/csv,application/csv';
    input.multiple = true;
    input.onchange = () => {
      const files = Array.from(input.files || []);
      if (files.length > 0) {
        resolve(files);
      } else {
        reject(new Error('No files selected'));
      }
    };
    input.oncancel = () => reject(new Error('File selection cancelled'));
    input.click();
  });
}

// Pick a directory (Chromium only)
export async function pickDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if ('showDirectoryPicker' in window) {
    try {
      return await (window as any).showDirectoryPicker();
    } catch (error) {
      console.log('Directory picker failed:', error);
      return null;
    }
  }
  return null; // not supported; caller should handle fallback
}

// Get all CSV files from a directory
export async function getCSVFilesFromDirectory(
  directory: FileSystemDirectoryHandle
): Promise<File[]> {
  const csvFiles: File[] = [];
  
  try {
    for await (const [name, handle] of directory as any) {
      if (handle.kind === 'file' && name.toLowerCase().endsWith('.csv')) {
        const file = await handle.getFile();
        csvFiles.push(file);
      }
    }
  } catch (error) {
    console.error('Error reading directory:', error);
  }
  
  return csvFiles;
}

// Check if browser supports directory access
export const supportsDirectoryAccess = 'showDirectoryPicker' in window;
