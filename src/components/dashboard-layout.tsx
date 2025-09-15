'use client'

import * as React from 'react'
import { useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { DocumentsPanel } from '@/components/documents-panel'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isDocumentsPanelOpen, setIsDocumentsPanelOpen] = useState(false)

  // Handle documents panel toggle with seamless coordination
  const handleDocumentsPanelToggle = () => {
    if (!isDocumentsPanelOpen) {
      // Opening documents panel -> collapse sidebar and open panel simultaneously
      setSidebarCollapsed(true)
      setIsDocumentsPanelOpen(true)
    } else {
      // Closing documents panel -> close immediately
      setIsDocumentsPanelOpen(false)
    }
  }

  // Handle sidebar manual toggle - allow coexistence with documents panel
  const handleSidebarToggle = (newCollapsedState: boolean) => {
    // Simply toggle sidebar state, let documents panel stay open if it's open
    setSidebarCollapsed(newCollapsedState)
  }

  // Shift content only when the floating documents panel is visible so the
  // sidebar remains snug against the dashboard surface.
  const getMainContentOffset = () => {
    return isDocumentsPanelOpen ? 320 : 0
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background optimized-container" data-app-content>
      {/* Sidebar */}
      <Sidebar
        isCollapsed={sidebarCollapsed}
        onCollapsedChange={handleSidebarToggle}
        isDocumentsPanelOpen={isDocumentsPanelOpen}
        onDocumentsPanelToggle={handleDocumentsPanelToggle}
      />

      {/* Main Content */}
      <motion.main
        className="flex-1 flex flex-col overflow-hidden"
        initial={false}
        animate={{
          marginLeft: getMainContentOffset()
        }}
        transition={{
          duration: 0.18,
          ease: [0.4, 0, 0.2, 1],
          type: "tween"
        }}
      >
        {/* Content wrapper with proper scrolling */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </motion.main>

      {/* Documents Panel */}
      <DocumentsPanel
        isOpen={isDocumentsPanelOpen}
        onClose={() => setIsDocumentsPanelOpen(false)}
        sidebarCollapsed={sidebarCollapsed}
      />
    </div>
  )
}
