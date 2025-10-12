'use client'

import * as React from 'react'
import { useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { DocumentsPanel } from '@/components/documents-panel'
import { DocumentsProvider } from '@/contexts/documents-context'
import { motion } from 'framer-motion'

const DOCUMENTS_PANEL_STATE_KEY = 'cognileap-documents-panel-open'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  // Always start with false to match SSR, then hydrate from localStorage
  const [isDocumentsPanelOpen, setIsDocumentsPanelOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  
  // Hydrate from localStorage after mount (client-only)
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const stored = window.localStorage.getItem(DOCUMENTS_PANEL_STATE_KEY)
      if (stored === 'true') {
        setIsDocumentsPanelOpen(true)
        setSidebarCollapsed(true)
      }
    } catch {
      // ignore storage failures
    }
  }, [])

  // Handle documents panel toggle with seamless coordination
  const handleDocumentsPanelToggle = React.useCallback(() => {
    setIsDocumentsPanelOpen(prev => {
      if (!prev) {
        setSidebarCollapsed(true)
        return true
      }
      return false
    })
  }, [])

  // Handle sidebar manual toggle - allow coexistence with documents panel
  const handleSidebarToggle = React.useCallback((newCollapsedState: boolean) => {
    setSidebarCollapsed(newCollapsedState)
  }, [])

  // Shift content only when the floating documents panel is visible so the
  // sidebar remains snug against the dashboard surface.
  const getMainContentOffset = () => {
    return isDocumentsPanelOpen ? 320 : 0
  }

  // Persist panel state to localStorage
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(DOCUMENTS_PANEL_STATE_KEY, isDocumentsPanelOpen ? 'true' : 'false')
    } catch {
      // ignore storage failures
    }
  }, [isDocumentsPanelOpen])

  // Listen for upload events to auto-expand documents panel
  React.useEffect(() => {
    const handleExpandDocumentsPanel = () => {
      if (!isDocumentsPanelOpen) {
        handleDocumentsPanelToggle()
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('expand-documents-panel', handleExpandDocumentsPanel)
      return () => window.removeEventListener('expand-documents-panel', handleExpandDocumentsPanel)
    }
  }, [isDocumentsPanelOpen, handleDocumentsPanelToggle])

  return (
    <DocumentsProvider>
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
    </DocumentsProvider>
  )
}
