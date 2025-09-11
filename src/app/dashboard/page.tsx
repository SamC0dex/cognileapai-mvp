'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useDropzone } from 'react-dropzone'
import { DashboardLayout } from '@/components/dashboard-layout'
import { DashboardHeader } from '@/components/dashboard-header'
import { DashboardActionCards } from '@/components/dashboard-action-cards'
import { DashboardTabs } from '@/components/dashboard-tabs'

export default function DashboardPage() {
  const [isUploading, setIsUploading] = useState(false)

  const uploadFile = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      
      if (response.ok) {
        toast.success(`"${file.name}" uploaded successfully!`)
        // Handle successful upload - could update state, refresh data, etc.
      } else {
        const error = await response.json()
        toast.error(error.error || 'Upload failed')
      }
    } catch (error) {
      toast.error('Upload failed')
      console.error('Upload error:', error)
    }
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    
    setIsUploading(true)
    
    try {
      // Upload files sequentially to avoid overwhelming the server
      for (const file of acceptedFiles) {
        await uploadFile(file)
      }
    } finally {
      setIsUploading(false)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 20 * 1024 * 1024, // 20MB
    disabled: isUploading,
    noClick: true // Disable default click to open file dialog
  })

  const handleUpload = () => {
    // Trigger file dialog manually
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf'
    input.multiple = true
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || [])
      if (files.length > 0) {
        await onDrop(files)
      }
    }
    input.click()
  }

  const handleStartCourse = () => {
    toast.info('Course creation coming soon!')
  }

  const handleStartLesson = () => {
    toast.info('Lesson creation coming soon!')
  }

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    // Handle view mode change
    console.log('View mode changed to:', mode)
  }

  const handleSearch = (query: string) => {
    // Handle search
    console.log('Search query:', query)
  }

  return (
    <DashboardLayout>
      <div 
        {...getRootProps()}
        className={`min-h-screen transition-all duration-300 ${
          isDragActive ? 'bg-primary/5 ring-2 ring-primary ring-inset' : ''
        }`}
      >
        <input {...getInputProps()} />
        
        {/* Drag Overlay */}
        {isDragActive && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto">
                <svg
                  className="w-10 h-10 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-primary">Drop your PDF here</h3>
                <p className="text-muted-foreground">Release to upload your document</p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <DashboardHeader userName="Sam" />
        
        {/* Action Cards */}
        <DashboardActionCards
          onStartCourse={handleStartCourse}
          onStartLesson={handleStartLesson}
          onUploadDocument={handleUpload}
        />
        
        {/* Tabs and Content */}
        <DashboardTabs
          onViewModeChange={handleViewModeChange}
          onSearch={handleSearch}
          onUpload={handleUpload}
        />
      </div>
    </DashboardLayout>
  )
}

