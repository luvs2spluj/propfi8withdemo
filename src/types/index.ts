/**
 * Shared Type Definitions
 * 
 * This file contains shared type definitions used across the application
 * to avoid type conflicts between components.
 */

export type Page = 
  | 'dashboard' 
  | 'financials' 
  | 'analytics' 
  | 'properties' 
  | 'reports' 
  | 'upload' 
  | 'upload-ai' 
  | 'csv-management-ai' 
  | 'property-management-ai' 
  | 'ai-training' 
  | 'csv-data' 
  | 'csv-management'
  | 'csv-import-flow';

export interface NavigationProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
}
