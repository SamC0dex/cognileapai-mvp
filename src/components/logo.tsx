'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  width?: number
  height?: number
}

export function Logo({ className, width = 32, height = 32 }: LogoProps) {
  // Use CSS to control visibility based on theme to avoid hydration issues
  // Both images are always rendered but only one is visible at a time
  return (
    <div className={cn("relative inline-block", className)} style={{ width, height }}>
      {/* Light mode logo - visible in light theme */}
      <Image
        src="/logo-light.png"
        alt="CogniLeap Logo"
        width={width}
        height={height}
        priority
        className="absolute inset-0 object-contain dark:opacity-0 dark:invisible opacity-100 visible transition-opacity duration-150"
      />
      {/* Dark mode logo - visible in dark theme */}
      <Image
        src="/logo-dark.png"
        alt="CogniLeap Logo"
        width={width}
        height={height}
        priority
        className="absolute inset-0 object-contain dark:opacity-100 dark:visible opacity-0 invisible transition-opacity duration-150"
      />
    </div>
  )
}
