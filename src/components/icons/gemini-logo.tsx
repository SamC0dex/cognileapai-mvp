import React from 'react'

interface GeminiLogoProps {
  className?: string
  size?: number
}

export const GeminiLogo: React.FC<GeminiLogoProps> = ({ 
  className = '', 
  size = 16 
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="gemini-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4285f4" />
          <stop offset="25%" stopColor="#34a853" />
          <stop offset="50%" stopColor="#fbbc04" />
          <stop offset="75%" stopColor="#ea4335" />
          <stop offset="100%" stopColor="#9c27b0" />
        </linearGradient>
      </defs>
      
      {/* 4-pointed star shape inspired by Gemini branding */}
      <path
        d="M12 2 L14.5 9.5 L22 12 L14.5 14.5 L12 22 L9.5 14.5 L2 12 L9.5 9.5 Z"
        fill="url(#gemini-gradient)"
        className="drop-shadow-sm"
      />
      
      {/* Inner highlight for depth */}
      <path
        d="M12 4.5 L13.8 10.2 L19.5 12 L13.8 13.8 L12 19.5 L10.2 13.8 L4.5 12 L10.2 10.2 Z"
        fill="rgba(255, 255, 255, 0.2)"
      />
    </svg>
  )
}

export default GeminiLogo