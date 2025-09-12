'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ThemeProviderProps } from 'next-themes/dist/types'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider 
      {...props}
      // Force suppress hydration warnings for theme provider
      enableSystem={false}
      defaultTheme="light"
    >
      {children}
    </NextThemesProvider>
  )
}

