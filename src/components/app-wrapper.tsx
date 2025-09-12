'use client'

import { useExtensionBlocker } from '@/hooks/use-extension-blocker'

export function AppWrapper({ children }: { children: React.ReactNode }) {
  useExtensionBlocker()
  return <>{children}</>
}