import * as React from 'react'

interface FlashcardsStackIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string
  size?: number
}

export const FlashcardsStackIcon: React.FC<FlashcardsStackIconProps> = ({
  className = '',
  size = 24,
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="Flashcards"
    {...props}
  >
    <rect x="8" y="10" width="32" height="38" rx="5.1" fill="currentColor" opacity="0.25" />
    <rect x="4.5" y="6.5" width="32" height="38" rx="5.1" fill="currentColor" opacity="0.45" />
    <rect x="1.5" y="3.5" width="32" height="38" rx="6.5" fill="currentColor" opacity="0.92" />
    <rect x="8" y="14.5" width="22" height="3.4" rx="1.7" fill="#FFFFFF" />
    <rect x="8" y="21" width="19" height="3.4" rx="1.7" fill="#FFFFFF" opacity="0.95" />
    <rect x="8" y="27.5" width="16" height="3.4" rx="1.7" fill="#FFFFFF" opacity="0.9" />
  </svg>
)

export default FlashcardsStackIcon
