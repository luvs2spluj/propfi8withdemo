import { supabaseApiService } from './supabaseClient';

// Backend URLs
const SUPABASE_BACKEND_URL = process.env.REACT_APP_SUPABASE_API_URL || 'http://localhost:5003/api';
const LOCAL_BACKEND_URL = process.env.REACT_APP_LOCAL_API_URL || 'http://localhost:5003/api';

// Default to Supabase backend for most operations
const API_BASE_URL = process.env.REACT_APP_API_URL || SUPABASE_BACKEND_URL;

// Check if we're in a browser environment (unused but kept for future use)
// const isBrowser = typeof window !== 'undefined';

// API Response Types
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      // Skip API calls if no backend server is available
      if (API_BASE_URL.includes('localhost:5000') || API_BASE_URL.includes('localhost:5001') || API_BASE_URL.includes('localhost:5002')) {
        console.warn('Backend server not available, skipping API call to:', endpoint);
        throw new Error('Backend server not available - using Supabase directly');
      }

      // Add timeout for better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(url, {
        ...config,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('API request failed:', error);
      
      // Provide more specific error messages
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - server may be unavailable');
      } else if (error.message.includes('fetch')) {
        throw new Error('Network error - unable to connect to server');
      } else if (error.message.includes('Backend server not available')) {
        throw error; // Re-throw our custom error
      }
      
      throw error;
    }
  }

  // Properties API
  async getProperties(): Promise<ApiResponse<any[]>> {
    try {
      return await this.request('/properties');
    } catch (error) {
      console.log('🔄 Backend unavailable, using Supabase directly');
      return await supabaseApiService.getProperties();
    }
  }

  async getProperty(id: string): Promise<ApiResponse<any>> {
    return this.request(`/properties/${id}`);
  }

  async getPropertiesWithData(): Promise<ApiResponse<any[]>> {
    try {
      return await this.request('/properties-with-data');
    } catch (error) {
      console.log('🔄 Backend unavailable, using Supabase directly');
      return await supabaseApiService.getPropertiesWithData();
    }
  }

  async getFinancialSummary(startDate?: string, endDate?: string): Promise<ApiResponse<any>> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const queryString = params.toString();
      return await this.request(`/financial-summary${queryString ? `?${queryString}` : ''}`);
    } catch (error) {
      console.log('🔄 Backend unavailable, using Supabase directly');
      return await supabaseApiService.getFinancialSummary(startDate, endDate);
    }
  }

  // Property data API
  async getPropertyData(propertyId: string, page: number = 1, limit: number = 50): Promise<ApiResponse<any[]>> {
    try {
      return await this.request(`/properties/${propertyId}/data?page=${page}&limit=${limit}`);
    } catch (error) {
      console.log('🔄 Backend unavailable, using Supabase directly');
      return await supabaseApiService.getPropertyData(propertyId);
    }
  }

  async getPropertyAggregated(propertyId: string, startDate?: string, endDate?: string): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const queryString = params.toString();
    return this.request(`/properties/${propertyId}/aggregated${queryString ? `?${queryString}` : ''}`);
  }

  // CSV upload API
  async uploadCSV(file: File, propertyId: string): Promise<ApiResponse> {
    const formData = new FormData();
    formData.append('csvFile', file);
    formData.append('propertyId', propertyId);

    const url = `${API_BASE_URL}/upload-csv`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('CSV upload failed:', error);
      throw error;
    }
  }

  // Local CSV processing (no Supabase validation)
  async processCSVLocal(file: File, propertyName?: string): Promise<ApiResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (propertyName) {
      formData.append('propertyName', propertyName);
    }

    const url = `${LOCAL_BACKEND_URL}/api/process-csv-local`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Local CSV processing failed:', error);
      throw error;
    }
  }

  // Save processed local data to unified pipeline
  async saveLocalData(data: any, propertyName: string, source: 'local' | 'supabase'): Promise<ApiResponse> {
    const url = `${LOCAL_BACKEND_URL}/save-processed-data`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data,
          propertyName,
          source,
          timestamp: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Save data failed:', error);
      throw error;
    }
  }

  // Check backend status for both servers
  async checkBackendStatus(): Promise<{ supabase: boolean; local: boolean }> {
    const status = { supabase: false, local: false };
    
    try {
      const supabaseResponse = await fetch(`${SUPABASE_BACKEND_URL}/health`, { 
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      });
      status.supabase = supabaseResponse.ok;
    } catch (error) {
      console.log('Supabase backend not available');
    }
    
    try {
      const localResponse = await fetch(`${LOCAL_BACKEND_URL}/processed-data`, { 
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      });
      status.local = localResponse.ok;
    } catch (error) {
      console.log('Local backend not available');
    }
    
    return status;
  }

  async validateCSV(file: File, propertyName?: string): Promise<{ success: boolean; data: any }> {
    const formData = new FormData();
    formData.append('csvFile', file);
    if (propertyName) {
      formData.append('propertyName', propertyName);
    }

    const url = `${API_BASE_URL}/validate-csv`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('CSV validation failed:', error);
      throw error;
    }
  }

  // Chart data API
  async getChartData(propertyId?: string, startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (propertyId) params.append('propertyId', propertyId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const queryString = params.toString();
    return this.request<{ success: boolean; data: any[] }>(`/chart-data${queryString ? `?${queryString}` : ''}`);
  }

  async getMonthlyData(propertyId?: string) {
    const params = new URLSearchParams();
    if (propertyId) params.append('propertyId', propertyId);
    
    const queryString = params.toString();
    return this.request<{ success: boolean; data: any[] }>(`/monthly-data${queryString ? `?${queryString}` : ''}`);
  }

  // Upload history API
  async getUploadHistory(propertyId?: string) {
    const params = new URLSearchParams();
    if (propertyId) params.append('propertyId', propertyId);
    
    const queryString = params.toString();
    return this.request<{ success: boolean; data: any[] }>(`/upload-history${queryString ? `?${queryString}` : ''}`);
  }

  // Property management API
  async addProperty(propertyData: any): Promise<ApiResponse<any>> {
    return this.request('/properties', {
      method: 'POST',
      body: JSON.stringify(propertyData)
    });
  }

  async updateProperty(id: string, propertyData: any): Promise<ApiResponse<any>> {
    return this.request(`/properties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(propertyData)
    });
  }

  async deleteProperty(id: string): Promise<ApiResponse<any>> {
    return this.request(`/properties/${id}`, {
      method: 'DELETE'
    });
  }

  // CSV Management API
  async deleteUpload(uploadId: string): Promise<ApiResponse<any>> {
    return this.request(`/uploads/${uploadId}`, {
      method: 'DELETE'
    });
  }

  async deletePropertyDataByUpload(uploadId: string): Promise<ApiResponse<any>> {
    return this.request(`/uploads/${uploadId}/data`, {
      method: 'DELETE'
    });
  }

  async reprocessUpload(uploadId: string): Promise<ApiResponse<any>> {
    return this.request(`/uploads/${uploadId}/reprocess`, {
      method: 'POST'
    });
  }

  // Health check
  async getHealth() {
    return this.request<{ status: string; timestamp: string; environment: string }>('/health');
  }
}

const apiService = new ApiService();
export default apiService;
