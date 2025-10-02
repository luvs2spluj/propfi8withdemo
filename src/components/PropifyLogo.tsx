import React from 'react';

interface PropifyLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

const PropifyLogo: React.FC<PropifyLogoProps> = ({ 
  size = 'md', 
  showText = true, 
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
    xl: 'w-24 h-24'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl'
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo Graphic - Clean image without border to prevent distortion */}
      <div className={`${sizeClasses[size]} relative`}>
        <img 
          src="/propfi-logo.jpg" 
          alt="PropFi" 
          className="w-full h-full object-contain"
          style={{
            objectFit: 'contain',
            maxWidth: '100%',
            height: 'auto'
          }}
          onError={(e) => {
            // Fallback to PDF if JPG fails
            const target = e.target as HTMLImageElement;
            target.src = '/propfi-logo.pdf';
          }}
        />
      </div>

      {/* Text */}
      {showText && (
        <span className={`font-bold text-gray-900 ${textSizeClasses[size]}`}>
          PropFi
        </span>
      )}
    </div>
  );
};

export default PropifyLogo;
