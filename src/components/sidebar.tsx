'use client'

import * as React from 'react'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  LayoutDashboard, 
  Settings,
  FileText,
  Lightbulb,
  ChevronDown,
  MoreHorizontal,
  User,
  Sun,
  Moon,
  Palette
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
  Button,
  Avatar,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Separator
} from '@/components/ui'
import { ClientOnly } from '@/components/client-only'

interface SidebarProps {
  isCollapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

export function Sidebar({ isCollapsed = false, onCollapsedChange }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(isCollapsed)
  const { theme, setTheme } = useTheme()
  
  const handleToggle = () => {
    const newState = !collapsed
    setCollapsed(newState)
    onCollapsedChange?.(newState)
  }
  
  const toggleTheme = () => {
    const root = document.documentElement
    const next = theme === 'dark' ? 'light' : 'dark'
    root.classList.add('theme-instant')

    const bg = getComputedStyle(root).getPropertyValue('--background').trim()
    const overlay = document.createElement('div')
    overlay.className = 'theme-switch-overlay'
    overlay.style.background = `hsl(${bg})`
    document.body.appendChild(overlay)

    requestAnimationFrame(() => {
      overlay.style.opacity = '1'
      window.setTimeout(() => {
        setTheme(next)
        requestAnimationFrame(() => {
          overlay.style.opacity = '0'
          window.setTimeout(() => {
            overlay.remove()
            root.classList.remove('theme-instant')
          }, 55)
        })
      }, 25)
    })
  }

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      current: pathname === '/dashboard'
    },
    {
      name: 'Chat',
      href: '/chat',
      icon: Lightbulb,
      current: pathname?.startsWith('/chat') || false
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      current: pathname === '/settings'
    }
  ]

  return (
    <motion.div 
      className={cn(
        "relative z-[200] flex flex-col h-screen penseum-sidebar pointer-events-auto",
        collapsed ? "w-16" : "w-64"
      )}
      initial={false}
      animate={{ width: collapsed ? 64 : 256 }}
      transition={{ duration: 0.1, ease: "easeOut" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-sidebar-foreground">
              CogniLeap
            </span>
          </div>
        )}
        
        {/* Show theme toggle only when not collapsed, otherwise show collapse toggle centered */}
        {!collapsed ? (
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-8 w-8 hover:bg-sidebar-accent transition-colors duration-150"
            >
              <ClientOnly fallback={<Palette className="h-4 w-4" />}>
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </ClientOnly>
            </Button>
            
            {/* Collapse Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggle}
              className="h-8 w-8 hover:bg-sidebar-accent transition-colors duration-150"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex justify-center">
            {/* Collapse Toggle - centered when collapsed */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggle}
              className="h-8 w-8 hover:bg-sidebar-accent transition-colors duration-150"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Workspace Selector removed per request */}

      {/* Primary Action Button */}
      <div className="px-4 py-2">
        {!collapsed ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="purple" 
                className="w-full gap-2 penseum-button-primary dark:from-teal-600 dark:to-teal-700 dark:hover:from-teal-700 dark:hover:to-teal-800"
              >
                <Plus className="h-4 w-4" />
                New Course
                <ChevronDown className="h-4 w-4 ml-auto" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 penseum-dropdown">
              <DropdownMenuItem 
                onClick={() => {
                  console.log('New Course clicked - direct navigation');
                  window.location.href = '/chat?type=course&title=New%20Course';
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Course
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  console.log('New Lesson clicked - direct navigation');
                  window.location.href = '/chat?type=lesson&title=New%20Lesson';
                }}
              >
                <Lightbulb className="h-4 w-4 mr-2" />
                New Lesson
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex justify-center">
            <Button variant="purple" size="icon" className="w-10 h-10 dark:from-teal-600 dark:to-teal-700 dark:hover:from-teal-700 dark:hover:to-teal-800">
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>


      {/* Navigation */}
      <nav className="flex-1 px-4 py-2 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.name}
              onClick={() => {
                console.log(`Direct navigation to ${item.href}`);
                window.location.href = item.href;
              }}
              className={cn(
                "penseum-nav-item group w-full",
                item.current && "active",
                collapsed && "justify-center"
              )}
              type="button"
            >
              <Icon
                className={cn(
                  "shrink-0",
                  collapsed ? "h-5 w-5" : "h-5 w-5"
                )}
              />
              {!collapsed && (
                <div className="flex items-center justify-between w-full">
                  <span className="truncate">{item.name}</span>
                </div>
              )}
            </button>
          )
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-sidebar-border">
        {!collapsed ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full justify-start h-auto p-3 hover:bg-sidebar-accent"
              >
                <Avatar className="h-8 w-8 mr-3">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-medium">
                    S
                  </AvatarFallback>
                </Avatar>
                <div className="text-left flex-1">
                  <div className="text-sm font-medium text-sidebar-foreground">Swami</div>
                  <div className="text-xs text-sidebar-foreground/60">swami@example.com</div>
                </div>
                <MoreHorizontal className="h-4 w-4 text-sidebar-foreground/60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 penseum-dropdown">
              <DropdownMenuItem>
                <User className="h-4 w-4 mr-2" />
                Profile Settings
              </DropdownMenuItem>
              <Separator />
              <DropdownMenuItem className="text-red-600">
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex justify-center">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-medium">
                S
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>
    </motion.div>
  )
}
