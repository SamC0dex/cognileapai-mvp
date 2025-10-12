'use client'

import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase'
import type { DocumentUploadedDetail } from '@/types/documents'
import { useAuth } from '@/contexts/auth-context'

type DocumentItem = Database['public']['Tables']['documents']['Row']

interface SelectedDocument {
  id: string
  title: string
  size?: number
  processing_status?: string
}

interface DocumentsContextValue {
  documents: DocumentItem[]
  documentsLoading: boolean
  refreshDocuments: (options?: { force?: boolean }) => Promise<void>
  upsertDocument: (document: DocumentItem) => void
  removeDocumentFromContext: (documentId: string) => void
  selectedDocuments: SelectedDocument[]
  addSelectedDocument: (doc: SelectedDocument) => void
  removeSelectedDocument: (documentId: string) => void
  clearSelectedDocuments: () => void
  isDocumentSelected: (documentId: string) => boolean
  primaryDocument: SelectedDocument | null
  updateDocumentStatus: (documentId: string, status: string) => void
}

const DocumentsContext = createContext<DocumentsContextValue | null>(null)

const DOCUMENTS_CACHE_KEY = 'cognileap-documents-cache-v1'
const DOCUMENTS_CACHE_TTL = 2 * 60 * 1000 // 2 minutes
const SELECTED_DOCUMENTS_STORAGE_PREFIX = 'cognileap-selected-documents-v1'

const getSelectedDocumentsStorageKey = (userId: string) => `${SELECTED_DOCUMENTS_STORAGE_PREFIX}:${userId}`

const parseStoredSelectedDocuments = (raw: string | null): SelectedDocument[] => {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => {
        if (!item || typeof item !== 'object' || typeof (item as { id?: unknown }).id !== 'string') {
          return null
        }
        const candidate = item as Partial<SelectedDocument> & { id: string }
        return {
          id: candidate.id,
          title: typeof candidate.title === 'string' ? candidate.title : 'Untitled Document',
          size: typeof candidate.size === 'number' ? candidate.size : undefined,
          processing_status: typeof candidate.processing_status === 'string' ? candidate.processing_status : undefined
        }
      })
      .filter((item): item is SelectedDocument => Boolean(item))
  } catch {
    return []
  }
}

const toSelectedDocument = (doc: DocumentItem): SelectedDocument => ({
  id: doc.id,
  title: doc.title,
  size: doc.bytes ?? undefined,
  processing_status: doc.processing_status ?? undefined
})

export function DocumentsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const cacheRef = useRef<DocumentItem[]>([])
  const selectedDocsStorageKeyRef = useRef<string | null>(null)
  const hasLoadedStoredSelectionRef = useRef(false)

  const readCache = () => {
    if (typeof window === 'undefined') return []
    try {
      const cached = window.sessionStorage.getItem(DOCUMENTS_CACHE_KEY)
      if (!cached) return []
      const parsed = JSON.parse(cached) as { timestamp: number; documents: DocumentItem[] }
      if (!parsed?.documents || !Array.isArray(parsed.documents)) return []
      if (Date.now() - (parsed.timestamp || 0) > DOCUMENTS_CACHE_TTL) {
        return []
      }
      cacheRef.current = parsed.documents
      return parsed.documents
    } catch {
      return []
    }
  }

  const persistCache = (docs: DocumentItem[]) => {
    if (typeof window === 'undefined') return
    try {
      window.sessionStorage.setItem(
        DOCUMENTS_CACHE_KEY,
        JSON.stringify({ timestamp: Date.now(), documents: docs })
      )
    } catch {
      // ignore storage errors
    }
  }

  const [documents, setDocuments] = useState<DocumentItem[]>(() => readCache())
  const [documentsLoading, setDocumentsLoading] = useState(() => cacheRef.current.length === 0)
  const [selectedDocuments, setSelectedDocuments] = useState<SelectedDocument[]>([])

  const applyDocumentsUpdate = useCallback((updater: (current: DocumentItem[]) => DocumentItem[]) => {
    setDocuments(prev => {
      const next = updater(prev)
      cacheRef.current = next
      persistCache(next)
      return next
    })
  }, [])

  const upsertDocument = useCallback((document: DocumentItem) => {
    applyDocumentsUpdate(prev => {
      const existingIndex = prev.findIndex(item => item.id === document.id)
      if (existingIndex === -1) {
        return [document, ...prev]
      }
      const next = [...prev]
      next[existingIndex] = document
      return next
    })

    setSelectedDocuments(prev =>
      prev.map(item => (item.id === document.id ? toSelectedDocument(document) : item))
    )
  }, [applyDocumentsUpdate])

  const removeDocumentFromContext = useCallback((documentId: string) => {
    applyDocumentsUpdate(prev => prev.filter(doc => doc.id !== documentId))
    setSelectedDocuments(prev => prev.filter(doc => doc.id !== documentId))
  }, [applyDocumentsUpdate])

  const refreshDocuments = useCallback(async (options?: { force?: boolean }) => {
    if (!user) {
      applyDocumentsUpdate(() => [])
      setDocumentsLoading(false)
      return
    }

    const shouldForceLoading = options?.force || cacheRef.current.length === 0
    if (shouldForceLoading) {
      setDocumentsLoading(true)
    }

    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[Documents] Failed to fetch documents:', error)
        return
      }

      const nextDocs = data ?? []
      applyDocumentsUpdate(() => nextDocs)

      setSelectedDocuments(prev =>
        prev
          .map(item => {
            const updated = nextDocs.find(doc => doc.id === item.id)
            return updated ? toSelectedDocument(updated) : item
          })
          .filter(item => nextDocs.some(doc => doc.id === item.id))
      )
    } finally {
      setDocumentsLoading(false)
    }
  }, [applyDocumentsUpdate, supabase, user])

  useEffect(() => {
    if (!user) {
      if (typeof window !== 'undefined' && selectedDocsStorageKeyRef.current) {
        window.localStorage.removeItem(selectedDocsStorageKeyRef.current)
      }
      selectedDocsStorageKeyRef.current = null
      hasLoadedStoredSelectionRef.current = false
      applyDocumentsUpdate(() => [])
      setSelectedDocuments([])
      setDocumentsLoading(false)
      return
    }

    const storageKey = getSelectedDocumentsStorageKey(user.id)
    selectedDocsStorageKeyRef.current = storageKey
    hasLoadedStoredSelectionRef.current = false

    const storedSelection = typeof window !== 'undefined'
      ? parseStoredSelectedDocuments(window.localStorage.getItem(storageKey))
      : []

    setSelectedDocuments(storedSelection)
    hasLoadedStoredSelectionRef.current = true

    void refreshDocuments({ force: cacheRef.current.length === 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!selectedDocsStorageKeyRef.current) return
    if (!hasLoadedStoredSelectionRef.current) return

    try {
      window.localStorage.setItem(selectedDocsStorageKeyRef.current, JSON.stringify(selectedDocuments))
    } catch {
      // ignore storage errors
    }
  }, [selectedDocuments])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleDocumentUploaded = (event: Event) => {
      const customEvent = event as CustomEvent<DocumentUploadedDetail>
      const uploadedDocument = customEvent.detail?.document
      if (!uploadedDocument) return
      upsertDocument(uploadedDocument as DocumentItem)
    }

    window.addEventListener('document-uploaded', handleDocumentUploaded as EventListener)
    return () => window.removeEventListener('document-uploaded', handleDocumentUploaded as EventListener)
  }, [upsertDocument])

  const addSelectedDocument = useCallback((doc: SelectedDocument) => {
    setSelectedDocuments(prev => {
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

  const primaryDocument = selectedDocuments.length > 0 ? selectedDocuments[0] : null

  const value: DocumentsContextValue = {
    documents,
    documentsLoading,
    refreshDocuments,
    upsertDocument,
    removeDocumentFromContext,
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