/**
 * Bucket Icon Component
 * 
 * Reusable component for displaying bucket icons and information
 */

import React from 'react';
import { getBucketDefinition, getChartBuckets, getPrimaryBucket } from '../types/bucketTypes';

interface BucketIconProps {
  bucketId: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showDescription?: boolean;
  className?: string;
}

const BucketIcon: React.FC<BucketIconProps> = ({
  bucketId,
  size = 'md',
  showLabel = false,
  showDescription = false,
  className = ''
}) => {
  const bucket = getBucketDefinition(bucketId);
  
  if (!bucket) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <span className="text-gray-400">📊</span>
        {showLabel && <span className="text-sm text-gray-500">Unknown Bucket</span>}
      </div>
    );
  }

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`${iconSizeClasses[size]} flex items-center justify-center`}>
        <span className={sizeClasses[size]}>{bucket.emoji}</span>
      </div>
      
      {showLabel && (
        <div className="flex flex-col">
          <span className={`text-sm font-medium ${bucket.color.split(' ')[1]}`}>
            {bucket.label}
          </span>
          {showDescription && (
            <span className="text-xs text-gray-500">
              {bucket.description}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

interface BucketBadgeProps {
  bucketId: string;
  className?: string;
}

export const BucketBadge: React.FC<BucketBadgeProps> = ({
  bucketId,
  className = ''
}) => {
  const bucket = getBucketDefinition(bucketId);
  
  if (!bucket) {
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 ${className}`}>
        📊 Unknown
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${bucket.color} ${className}`}>
      <span className="mr-1">{bucket.emoji}</span>
      {bucket.label}
    </span>
  );
};

interface ChartBucketHeaderProps {
  chartId: string;
  chartName: string;
  className?: string;
}

export const ChartBucketHeader: React.FC<ChartBucketHeaderProps> = ({
  chartId,
  chartName,
  className = ''
}) => {
  const buckets = getChartBuckets(chartId);
  const primaryBucket = getPrimaryBucket(chartId);

  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900">{chartName}</h3>
      
      <div className="flex items-center space-x-2">
        {buckets.map((bucketId: string) => (
          <BucketIcon
            key={bucketId}
            bucketId={bucketId}
            size="sm"
            showLabel={true}
            className={bucketId === primaryBucket ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
          />
        ))}
      </div>
    </div>
  );
};

export default BucketIcon;
