/**
 * Shared Type Definitions
 * 
 * This file contains shared type definitions used across the application
 * to avoid type conflicts between components.
 */

export type Page = 
  | 'landing'
  | 'dashboard' 
  | 'financials' 
  | 'analytics' 
  | 'properties' 
  | 'csvs'
  | 'reports'
  | 'team-management'
  | 'pricing'
  | 'logo-test'
  | 'local-first'
  | 'file-manager';

export interface NavigationProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
}
