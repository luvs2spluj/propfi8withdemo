/**
 * Demo Gallery Component
 * 
 * Shows screenshots of the main pages with populated data
 * Allows users to scroll through the site without authentication
 */

import React, { useState } from 'react';
import { Button } from './ui/button';
// import { Card, CardContent } from './ui/card'; // Unused
import { X, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { SignUpButton } from '@clerk/clerk-react';

interface DemoPage {
  id: string;
  title: string;
  description: string;
  image: string;
  features: string[];
}

const DemoGallery: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const demoPages: DemoPage[] = [
    {
      id: 'dashboard',
      title: 'Dashboard Overview',
      description: 'Get a comprehensive view of your property portfolio with key metrics and performance indicators.',
      image: '/demo-screenshots/dashboard.png',
      features: [
        'Real-time financial metrics',
        'Property performance charts',
        'Quick access to key data',
        'Visual impact analysis'
      ]
    },
    {
      id: 'financials',
      title: 'Financial Analysis',
      description: 'Deep dive into your property finances with detailed breakdowns and trend analysis.',
      image: '/demo-screenshots/financials.png',
      features: [
        'Monthly financial breakdowns',
        'Expense categorization',
        'Revenue tracking',
        'Impact-based analysis'
      ]
    },
    {
      id: 'csv-import',
      title: 'Smart CSV Import',
      description: 'AI-powered data import with automatic categorization and bucket management.',
      image: '/demo-screenshots/csv-import.png',
      features: [
        'AI-powered categorization',
        'Automatic bucket assignment',
        'Data validation',
        'Preview before import'
      ]
    },
    {
      id: 'analytics',
      title: 'Advanced Analytics',
      description: 'Comprehensive analytics with benchmarking and market comparisons.',
      image: '/demo-screenshots/analytics.png',
      features: [
        'Market benchmarking',
        'Performance comparisons',
        'Trend analysis',
        'Custom reports'
      ]
    },
    {
      id: 'properties',
      title: 'Property Management',
      description: 'Manage all your properties with detailed information and performance tracking.',
      image: '/demo-screenshots/properties.png',
      features: [
        'Property portfolio view',
        'Individual property details',
        'Performance metrics',
        'Maintenance tracking'
      ]
    }
  ];

  const currentPage = demoPages[currentPageIndex];

  const nextPage = () => {
    setCurrentPageIndex((prev) => (prev + 1) % demoPages.length);
  };

  const prevPage = () => {
    setCurrentPageIndex((prev) => (prev - 1 + demoPages.length) % demoPages.length);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Landing</span>
            </Button>
            <div className="h-6 w-px bg-gray-300" />
            <h2 className="text-xl font-semibold">PropFi Demo</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex h-[calc(90vh-120px)]">
          {/* Navigation Sidebar */}
          <div className="w-80 bg-gray-50 p-6 overflow-y-auto">
            <div className="space-y-2">
              {demoPages.map((page, index) => (
                <button
                  key={page.id}
                  onClick={() => setCurrentPageIndex(index)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    index === currentPageIndex
                      ? 'bg-blue-100 text-blue-900 border border-blue-200'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="font-medium text-sm">{page.title}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {page.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Page Header */}
            <div className="p-6 border-b">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {currentPage.title}
              </h3>
              <p className="text-gray-600 mb-4">
                {currentPage.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {currentPage.features.map((feature, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>

            {/* Screenshot */}
            <div className="flex-1 p-6 bg-gray-100 flex items-center justify-center">
              <div className="bg-white rounded-lg shadow-lg max-w-full max-h-full overflow-hidden">
                <img
                  src={currentPage.image}
                  alt={currentPage.title}
                  className="w-full h-auto"
                  onError={(e) => {
                    // Fallback to placeholder if image doesn't exist
                    e.currentTarget.src = `data:image/svg+xml,${encodeURIComponent(`
                      <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
                        <rect width="100%" height="100%" fill="#f3f4f6"/>
                        <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="Arial, sans-serif" font-size="24" fill="#6b7280">
                          ${currentPage.title} Screenshot
                        </text>
                        <text x="50%" y="60%" text-anchor="middle" dy=".3em" font-family="Arial, sans-serif" font-size="16" fill="#9ca3af">
                          Coming Soon
                        </text>
                      </svg>
                    `)}`;
                  }}
                />
              </div>
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center justify-between p-6 border-t">
              <Button
                variant="outline"
                onClick={prevPage}
                disabled={currentPageIndex === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              <div className="flex space-x-2">
                {demoPages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentPageIndex(index)}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      index === currentPageIndex
                        ? 'bg-blue-600'
                        : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                  />
                ))}
              </div>

              <Button
                variant="outline"
                onClick={nextPage}
                disabled={currentPageIndex === demoPages.length - 1}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="p-6 border-t bg-blue-50">
          <div className="text-center">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Ready to try PropFi?
            </h4>
            <p className="text-gray-600 mb-4">
              Get started with a free month and see how PropFi can transform your property management.
            </p>
            <SignUpButton mode="modal">
              <Button size="lg" className="px-8">
                Start Free Trial
              </Button>
            </SignUpButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoGallery;
