'use client'

import * as React from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Home,
  LayoutDashboard, 
  Compass, 
  Settings,
  FileText,
  BookOpen,
  Lightbulb,
  ChevronDown,
  MoreHorizontal,
  User,
  Sparkles,
  Sun,
  Moon
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
  Button,
  Badge,
  Avatar,
  AvatarImage,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Separator
} from '@/components/ui'

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
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      current: pathname === '/settings'
    }
  ]

  return (
    <motion.div 
      className={cn(
        "flex flex-col h-screen penseum-sidebar",
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
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
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

      {/* Workspace Selector */}
      <div className="p-4">
        {!collapsed ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full justify-between h-auto p-3 bg-sidebar-accent/50 hover:bg-sidebar-accent"
              >
                <div className="text-left">
                  <div className="text-sm font-medium text-sidebar-foreground">Home</div>
                  <div className="text-xs text-sidebar-foreground/60">Change Workspaces</div>
                </div>
                <ChevronDown className="h-4 w-4 text-sidebar-foreground/60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 penseum-dropdown">
              <DropdownMenuItem>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                    <Home className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div>
                    <div className="font-medium">Home Workspace</div>
                    <div className="text-xs text-muted-foreground">Personal documents</div>
                  </div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <BookOpen className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="font-medium">Study Group</div>
                    <div className="text-xs text-muted-foreground">Shared workspace</div>
                  </div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex justify-center">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <Home className="h-5 w-5 text-primary-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Primary Action Button */}
      <div className="px-4 mb-4">
        {!collapsed ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="purple" 
                className="w-full gap-2 penseum-button-primary"
              >
                <Plus className="h-4 w-4" />
                New Course
                <ChevronDown className="h-4 w-4 ml-auto" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 penseum-dropdown">
              <DropdownMenuItem>
                <Plus className="h-4 w-4 mr-2" />
                New Lesson
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Lightbulb className="h-4 w-4 mr-2" />
                New Solution
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex justify-center">
            <Button variant="purple" size="icon" className="w-10 h-10">
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>


      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon
          return (
            <Link key={item.name} href={item.href}>
              <div
                className={cn(
                  "penseum-nav-item group",
                  item.current && "active",
                  collapsed && "justify-center"
                )}
              >
                <Icon className={cn(
                  "shrink-0",
                  collapsed ? "h-5 w-5" : "h-5 w-5"
                )} />
                {!collapsed && (
                  <div className="flex items-center justify-between w-full">
                    <span className="truncate">{item.name}</span>
                    {item.badge && (
                      <Badge variant={item.badge.variant} className="ml-auto">
                        {item.badge.text}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </Link>
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
                  <div className="text-sm font-medium text-sidebar-foreground">Sam</div>
                  <div className="text-xs text-sidebar-foreground/60">sam@example.com</div>
                </div>
                <MoreHorizontal className="h-4 w-4 text-sidebar-foreground/60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 penseum-dropdown">
              <DropdownMenuItem>
                <User className="h-4 w-4 mr-2" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Sparkles className="h-4 w-4 mr-2" />
                Upgrade to Pro
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
