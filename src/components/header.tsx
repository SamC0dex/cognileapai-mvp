'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon, Menu } from 'lucide-react'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { Logo } from './logo'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui'

export function Header() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])
  
  const toggleTheme = () => {
    const root = document.documentElement
    const current = resolvedTheme === 'dark' ? 'dark' : 'light'
    const next = current === 'dark' ? 'light' : 'dark'

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
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex h-10 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo width={24} height={24} />
            <span className="text-lg font-semibold">CogniLeap</span>
          </Link>
          
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md hover:bg-muted transition-colors"
              aria-label="Toggle theme"
            >
              {mounted ? (
                resolvedTheme === 'dark' ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4" />
                )
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 rounded-md hover:bg-muted transition-colors" aria-label="Menu">
                  <Menu className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/auth/sign-in">Sign in</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/auth/sign-up">Sign up</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}
