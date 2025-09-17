import * as React from 'react'

interface ChatDuotoneIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string
  size?: number
}

export const ChatDuotoneIcon: React.FC<ChatDuotoneIconProps> = ({ className = '', size = 24, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    role="img"
    aria-label="Chat"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M3.75 6.5A2.5 2.5 0 0 1 6.25 4h9.5A2.5 2.5 0 0 1 18.25 6.5v5A2.5 2.5 0 0 1 15.75 14H9.6l-3.9 2.7a.9.9 0 0 1-1.45-.75v-8.95Z"
      fill="currentColor"
      opacity={0.12}
    />
    <path
      d="M3.75 6.5A2.5 2.5 0 0 1 6.25 4h9.5A2.5 2.5 0 0 1 18.25 6.5v5A2.5 2.5 0 0 1 15.75 14H9.6l-3.9 2.7a.9.9 0 0 1-1.45-.75v-8.95Z"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10.5 9.75h4.25M10.5 12h2.25"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
    />
    <path
      d="M20.25 9.75c.97 0 1.75.78 1.75 1.75v3.25c0 .97-.78 1.75-1.75 1.75h-2.6l-2.3 1.6a.8.8 0 0 1-1.27-.67v-1.01"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={0.9}
    />
  </svg>
)

export default ChatDuotoneIcon
