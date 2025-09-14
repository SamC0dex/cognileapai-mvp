'use client'

import * as React from 'react'
import { useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background optimized-container" data-app-content>
      {/* Sidebar */}
      <Sidebar 
        isCollapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      
      {/* Main Content */}
      <motion.main 
        className={cn(
          "flex-1 flex flex-col overflow-hidden",
          sidebarCollapsed ? "ml-0" : "ml-0"
        )}
        initial={false}
        animate={{ 
          marginLeft: 0 
        }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Content wrapper with proper scrolling */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </motion.main>
    </div>
  )
}