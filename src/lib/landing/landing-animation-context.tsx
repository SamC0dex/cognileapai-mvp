"use client"

import { createContext, useContext, type ReactNode } from "react"

// Always enable animations - we'll use suppressHydrationWarning to handle style mismatches
const LandingAnimationContext = createContext<boolean>(true)

export function LandingAnimationProvider({ children }: { children: ReactNode }) {
  return <LandingAnimationContext.Provider value={true}>{children}</LandingAnimationContext.Provider>
}

export function useLandingAnimation() {
  const shouldAnimate = useContext(LandingAnimationContext)
  return {
    shouldAnimate,
  }
}
