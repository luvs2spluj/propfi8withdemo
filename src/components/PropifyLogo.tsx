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
      {/* Logo Graphic with Blue Border */}
      <div className={`${sizeClasses[size]} relative border-2 border-blue-500 rounded-lg p-1 bg-white shadow-sm`}>
        <img 
          src="/propfi-logo.svg" 
          alt="PropFi" 
          className="w-full h-full object-contain rounded"
          style={{objectFit: 'contain', aspectRatio: '1 / 1'}}
          width="100"
          height="100"
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
