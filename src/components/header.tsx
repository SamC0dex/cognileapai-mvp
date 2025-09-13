'use client'

import { Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { Logo } from './logo'

export function Header() {
  const { theme, setTheme } = useTheme()
  
  const toggleTheme = () => {
    const root = document.documentElement
    const next = theme === 'dark' ? 'light' : 'dark'

    // Disable all transitions briefly to avoid element-by-element color fades
    root.classList.add('theme-instant')

    // Build a quick cross-fade overlay using the current background token
    const bg = getComputedStyle(root).getPropertyValue('--background').trim()
    const overlay = document.createElement('div')
    overlay.className = 'theme-switch-overlay'
    overlay.style.background = `hsl(${bg})`
    document.body.appendChild(overlay)

    // Fade overlay in, flip theme under it, then fade out
    requestAnimationFrame(() => {
      overlay.style.opacity = '1'
      window.setTimeout(() => {
        setTheme(next)
        // Allow one frame for styles to apply, then fade out
        requestAnimationFrame(() => {
          overlay.style.opacity = '0'
          // Clean up overlay and re-enable transitions after fade
          window.setTimeout(() => {
            overlay.remove()
            root.classList.remove('theme-instant')
          }, 55)
        })
      }, 25)
    })
  }

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo width={24} height={24} />
            <span className="text-lg font-semibold">CogniLeap</span>
          </Link>
          
          <button
            onClick={toggleTheme}
            className="p-2 rounded-md hover:bg-muted transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
