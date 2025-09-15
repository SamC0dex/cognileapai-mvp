'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, FileText, Upload, MoreHorizontal, Trash2, Edit3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, Input } from '@/components/ui'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase'

type DocumentItem = Database['public']['Tables']['documents']['Row']

interface DocumentsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function DocumentsPanel({ isOpen, onClose }: DocumentsPanelProps) {
  const router = useRouter()
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [renameDialog, setRenameDialog] = useState<{open: boolean, document: DocumentItem | null}>({open: false, document: null})
  const [removeDialog, setRemoveDialog] = useState<{open: boolean, document: DocumentItem | null}>({open: false, document: null})
  const [newDocumentName, setNewDocumentName] = useState('')

  // Client-side Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Fetch documents from Supabase
  const fetchDocuments = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Failed to fetch documents:', error)
        toast.error('Failed to load documents')
      } else {
        setDocuments(data || [])
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error)
      toast.error('Failed to load documents')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchDocuments()
    }
  }, [isOpen])

  const handleUpload = React.useCallback(() => {
    if (isUploading) return
    
    // Create file input dynamically (same approach as dashboard)
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf'
    input.multiple = true
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || [])
      if (files.length > 0) {
        await handleFileChange({ target: { files, value: '' } } as any)
      }
    }
    input.click()
  }, [isUploading])

  const handleFileChange = React.useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)

    try {
      const fileArray = Array.from(files)
      for (const file of fileArray) {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })

        if (response.ok) {
          const result = await response.json()
          toast.success(`"${file.name}" uploaded successfully!`)
        } else {
          const error = await response.json()
          toast.error(error.error || 'Upload failed')
        }
      }

      // Refresh the list after all uploads
      await fetchDocuments()
    } catch (error) {
      toast.error('Upload failed')
      console.error('Upload error:', error)
    } finally {
      setIsUploading(false)
      // Reset the input value so the same file can be selected again
      e.target.value = ''
    }
  }, [fetchDocuments])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleDocumentClick = (document: DocumentItem) => {
    router.push(`/chat?type=document&documentId=${document.id}&title=${encodeURIComponent(document.title)}`)
  }

  const handleDocumentSelect = (documentId: string) => {
    setSelectedDocuments(prev => {
      const newSelected = new Set(prev)
      if (newSelected.has(documentId)) {
        newSelected.delete(documentId)
      } else {
        newSelected.add(documentId)
      }

      // Update select all state based on selection
      setSelectAll(newSelected.size === documents.length && documents.length > 0)

      return newSelected
    })
  }

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedDocuments(new Set())
      setSelectAll(false)
    } else {
      setSelectedDocuments(new Set(documents.map(doc => doc.id)))
      setSelectAll(true)
    }
  }

  const handleRename = (document: DocumentItem) => {
    setNewDocumentName(document.title)
    setRenameDialog({open: true, document})
  }

  const handleRenameConfirm = async () => {
    if (!renameDialog.document || newDocumentName.trim() === renameDialog.document.title) {
      setRenameDialog({open: false, document: null})
      return
    }

    try {
      const { error } = await supabase
        .from('documents')
        .update({ title: newDocumentName.trim() })
        .eq('id', renameDialog.document.id)

      if (error) {
        console.error('Failed to rename document:', error)
        toast.error('Failed to rename document')
      } else {
        toast.success('Document renamed successfully!')
        await fetchDocuments() // Refresh the list
      }
    } catch (error) {
      console.error('Failed to rename document:', error)
      toast.error('Failed to rename document')
    }

    setRenameDialog({open: false, document: null})
  }

  const handleRemove = (document: DocumentItem) => {
    setRemoveDialog({open: true, document})
  }

  const handleRemoveConfirm = async () => {
    if (!removeDialog.document) {
      setRemoveDialog({open: false, document: null})
      return
    }

    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', removeDialog.document.id)

      if (error) {
        console.error('Failed to remove document:', error)
        toast.error('Failed to remove document')
      } else {
        toast.success('Document removed successfully!')
        await fetchDocuments() // Refresh the list
      }
    } catch (error) {
      console.error('Failed to remove document:', error)
      toast.error('Failed to remove document')
    }

    setRemoveDialog({open: false, document: null})
  }

  // Update selectAll state when documents change
  React.useEffect(() => {
    if (documents.length > 0) {
      setSelectAll(selectedDocuments.size === documents.length)
    } else {
      setSelectAll(false)
      setSelectedDocuments(new Set())
    }
  }, [documents.length, selectedDocuments.size])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[300] md:hidden"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={cn(
              "fixed right-0 top-0 h-full w-80 bg-background border-l border-border shadow-2xl z-[400]",
              "flex flex-col overflow-hidden"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-card/50">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Sources</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Toolbar */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="flex-1 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
            </div>



            {/* Document List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-16 bg-muted/50 rounded-lg animate-pulse"
                    />
                  ))}
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    No documents yet
                  </p>
                  <Button
                    onClick={handleUpload}
                    disabled={isUploading}
                    size="sm"
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Upload PDF
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Select all sources</span>
                    <button
                      onClick={handleSelectAll}
                      className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${
                        selectAll
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground/30 bg-transparent hover:border-primary/50'
                      }`}
                    >
                      {selectAll && (
                        <svg
                          className="w-2.5 h-2.5 text-primary-foreground"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </button>
                  </div>

                  {documents.map((document) => (
                    <div key={document.id} className="group">
                      <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                        <button
                          onClick={() => handleDocumentSelect(document.id)}
                          className={`w-4 h-4 border rounded flex items-center justify-center shrink-0 transition-colors ${
                            selectedDocuments.has(document.id)
                              ? 'border-primary bg-primary'
                              : 'border-muted-foreground/30 bg-transparent hover:border-primary/50'
                          }`}
                        >
                          {selectedDocuments.has(document.id) && (
                            <svg
                              className="w-2.5 h-2.5 text-primary-foreground"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </button>
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <div className="min-w-0 flex-1">
                          <button
                            onClick={() => handleDocumentClick(document)}
                            className="text-sm font-medium text-left hover:text-primary transition-colors block w-full text-left"
                            title={document.title}
                          >
                            <div className="truncate" style={{ maxWidth: '180px' }}>
                              {document.title}
                            </div>
                          </button>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {document.page_count} pages • {formatFileSize(document.bytes)}
                          </p>
                        </div>

                        {/* 3-dot dropdown menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            >
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem 
                              className="text-xs cursor-pointer" 
                              onClick={() => handleRename(document)}
                            >
                              <Edit3 className="h-3 w-3 mr-2" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-xs text-destructive cursor-pointer" 
                              onClick={() => handleRemove(document)}
                            >
                              <Trash2 className="h-3 w-3 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Rename Dialog */}
          <AlertDialog open={renameDialog.open} onOpenChange={(open) => !open && setRenameDialog({open: false, document: null})}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Rename Document</AlertDialogTitle>
                <AlertDialogDescription>
                  Enter a new name for "{renameDialog.document?.title}"
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Input
                value={newDocumentName}
                onChange={(e) => setNewDocumentName(e.target.value)}
                placeholder="Document name"
                className="mb-4"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRenameConfirm()
                  }
                }}
              />
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setRenameDialog({open: false, document: null})}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction onClick={handleRenameConfirm}>
                  Rename
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Remove Dialog */}
          <AlertDialog open={removeDialog.open} onOpenChange={(open) => !open && setRemoveDialog({open: false, document: null})}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Document</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove "{removeDialog.document?.title}"? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setRemoveDialog({open: false, document: null})}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction onClick={handleRemoveConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </AnimatePresence>
  )
}