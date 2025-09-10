const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

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
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Properties API
  async getProperties() {
    return this.request<{ success: boolean; data: any[] }>('/properties');
  }

  async getProperty(id: string) {
    return this.request<{ success: boolean; data: any }>(`/properties/${id}`);
  }

  async getPropertiesWithData() {
    return this.request<{ success: boolean; data: any[] }>('/properties-with-data');
  }

  async getFinancialSummary(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const queryString = params.toString();
    return this.request<{ success: boolean; data: any }>(`/financial-summary${queryString ? `?${queryString}` : ''}`);
  }

  // Property data API
  async getPropertyData(propertyId: string, page: number = 1, limit: number = 50) {
    return this.request<{ success: boolean; data: any[] }>(`/properties/${propertyId}/data?page=${page}&limit=${limit}`);
  }

  async getPropertyAggregated(propertyId: string, startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const queryString = params.toString();
    return this.request<{ success: boolean; data: any }>(`/properties/${propertyId}/aggregated${queryString ? `?${queryString}` : ''}`);
  }

  // CSV upload API
  async uploadCSV(file: File, propertyId: string): Promise<{ success: boolean; data: any; message: string }> {
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

  async validateCSV(file: File): Promise<{ success: boolean; data: any }> {
    const formData = new FormData();
    formData.append('csvFile', file);

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

  // Health check
  async getHealth() {
    return this.request<{ status: string; timestamp: string; environment: string }>('/health');
  }
}

export default new ApiService();
