'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'

interface SelectedDocument {
  id: string
  title: string
  size?: number
  processing_status?: string
}

interface DocumentsContextValue {
  selectedDocuments: SelectedDocument[]
  addSelectedDocument: (doc: SelectedDocument) => void
  removeSelectedDocument: (documentId: string) => void
  clearSelectedDocuments: () => void
  isDocumentSelected: (documentId: string) => boolean
  primaryDocument: SelectedDocument | null
  updateDocumentStatus: (documentId: string, status: string) => void
}

const DocumentsContext = createContext<DocumentsContextValue | null>(null)

export function DocumentsProvider({ children }: { children: React.ReactNode }) {
  const [selectedDocuments, setSelectedDocuments] = useState<SelectedDocument[]>([])

  const addSelectedDocument = useCallback((doc: SelectedDocument) => {
    setSelectedDocuments(prev => {
      // Check if already selected
      if (prev.some(d => d.id === doc.id)) {
        return prev
      }
      return [...prev, doc]
    })
  }, [])

  const removeSelectedDocument = useCallback((documentId: string) => {
    setSelectedDocuments(prev => prev.filter(doc => doc.id !== documentId))
  }, [])

  const clearSelectedDocuments = useCallback(() => {
    setSelectedDocuments([])
  }, [])

  const isDocumentSelected = useCallback((documentId: string) => {
    return selectedDocuments.some(doc => doc.id === documentId)
  }, [selectedDocuments])

  const updateDocumentStatus = useCallback((documentId: string, status: string) => {
    setSelectedDocuments(prev =>
      prev.map(doc =>
        doc.id === documentId
          ? { ...doc, processing_status: status }
          : doc
      )
    )
  }, [])

  // For now, use the first selected document as primary (we can enhance this later)
  const primaryDocument = selectedDocuments.length > 0 ? selectedDocuments[0] : null

  const value: DocumentsContextValue = {
    selectedDocuments,
    addSelectedDocument,
    removeSelectedDocument,
    clearSelectedDocuments,
    isDocumentSelected,
    primaryDocument,
    updateDocumentStatus
  }

  return (
    <DocumentsContext.Provider value={value}>
      {children}
    </DocumentsContext.Provider>
  )
}

export function useDocuments() {
  const context = useContext(DocumentsContext)
  if (!context) {
    throw new Error('useDocuments must be used within a DocumentsProvider')
  }
  return context
}