const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

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
      }
      
      throw error;
    }
  }

  // Properties API
  async getProperties(): Promise<ApiResponse<any[]>> {
    return this.request('/properties');
  }

  async getProperty(id: string): Promise<ApiResponse<any>> {
    return this.request(`/properties/${id}`);
  }

  async getPropertiesWithData(): Promise<ApiResponse<any[]>> {
    return this.request('/properties-with-data');
  }

  async getFinancialSummary(startDate?: string, endDate?: string): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const queryString = params.toString();
    return this.request(`/financial-summary${queryString ? `?${queryString}` : ''}`);
  }

  // Property data API
  async getPropertyData(propertyId: string, page: number = 1, limit: number = 50): Promise<ApiResponse<any[]>> {
    return this.request(`/properties/${propertyId}/data?page=${page}&limit=${limit}`);
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
