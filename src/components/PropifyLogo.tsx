import React, { useMemo, useState, useCallback } from 'react';

interface PropifyLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  imageSrc?: string; // optional raster logo path (e.g., /propify-logo.jpg)
  fallbackSrcs?: string[]; // optional fallbacks if the first image fails to load
}

const PropifyLogo: React.FC<PropifyLogoProps> = ({ 
  size = 'md', 
  showText = true, 
  className = '',
  imageSrc,
  fallbackSrcs
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

  // Use the new PropFi SVG logo as the primary source
  const svgSrc = process.env.PUBLIC_URL + '/propfi logo copy.svg';
  const initialSrc = useMemo(() => imageSrc || svgSrc, [imageSrc, svgSrc]);
  const [activeSrc, setActiveSrc] = useState<string | undefined>(initialSrc);
  const [fallbackIndex, setFallbackIndex] = useState<number>(0);

  const handleImgError = useCallback(() => {
    if (fallbackSrcs && fallbackIndex < fallbackSrcs.length) {
      setActiveSrc(fallbackSrcs[fallbackIndex]);
      setFallbackIndex(fallbackIndex + 1);
    } else {
      setActiveSrc(undefined);
    }
  }, [fallbackSrcs, fallbackIndex]);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo Graphic with Blue Border */}
      <div className={`${sizeClasses[size]} relative border-2 border-blue-500 rounded-lg p-1 bg-white shadow-sm`}>
        {activeSrc ? (
          <img src={activeSrc} onError={handleImgError} alt="PropFi" className="w-full h-full object-contain rounded" />
        ) : (
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full rounded"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Sun */}
          <circle cx="20" cy="20" r="8" fill="#1E3A8A" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
            <line
              key={i}
              x1="20"
              y1="20"
              x2={20 + 12 * Math.cos(angle * Math.PI / 180)}
              y2={20 + 12 * Math.sin(angle * Math.PI / 180)}
              stroke="#1E3A8A"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ))}

          {/* Upward Arrow over Bar Chart */}
          <path
            d="M 35 70 L 35 50 L 45 40 L 55 50 L 55 70"
            stroke="#1E3A8A"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Arrowhead */}
          <path
            d="M 55 50 L 60 45 L 65 50 L 60 55 Z"
            fill="#1E3A8A"
          />

          {/* Bar Chart */}
          <rect x="30" y="75" width="6" height="12" fill="#60A5FA" />
          <rect x="40" y="70" width="6" height="17" fill="#60A5FA" />
          <rect x="50" y="65" width="6" height="22" fill="#60A5FA" />

          {/* Building */}
          <g transform="translate(70, 55)">
            {/* Building structure */}
            <rect x="0" y="20" width="25" height="20" fill="#1E3A8A" />
            {/* Roof */}
            <path d="M-3 20 L12.5 8 L28 20 Z" fill="#1E3A8A" />
            {/* Windows */}
            <rect x="3" y="25" width="4" height="4" fill="white" />
            <rect x="18" y="25" width="4" height="4" fill="white" />
            <rect x="3" y="32" width="4" height="4" fill="white" />
            <rect x="18" y="32" width="4" height="4" fill="white" />
            <rect x="10.5" y="28.5" width="4" height="4" fill="white" />
          </g>

          {/* Base Line */}
          <line x1="30" y1="80" x2="95" y2="80" stroke="#1E3A8A" strokeWidth="3" />
        </svg>
        )}
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
