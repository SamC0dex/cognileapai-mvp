'use client'

import { useState } from 'react'
import { 
  FileText, ChevronRight, Copy, Download, Sparkles, BookOpen, 
  FileCheck2, Loader2, AlertCircle, CheckCircle, Clock,
  ChevronLeft, Settings, Share2, Archive
} from 'lucide-react'
import Link from 'next/link'

export default function DocumentPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState<'study-guide' | 'summary' | 'notes'>('study-guide')
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  
  // Mock sections - will be replaced with real data
  const sections = [
    { id: '1', title: 'Introduction', pageStart: 1, pageEnd: 15, status: 'completed' },
    { id: '2', title: 'Chapter 1: Fundamentals', pageStart: 16, pageEnd: 45, status: 'completed' },
    { id: '3', title: 'Chapter 2: Advanced Concepts', pageStart: 46, pageEnd: 89, status: 'processing' },
    { id: '4', title: 'Chapter 3: Practical Applications', pageStart: 90, pageEnd: 134, status: 'pending' },
    { id: '5', title: 'Conclusion', pageStart: 135, pageEnd: 156, status: 'pending' },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="mx-auto max-w-[1600px] px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard"
                className="p-2 hover:bg-muted rounded-md transition-colors"
                aria-label="Back to dashboard"
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
              <div>
                <h1 className="text-lg font-semibold">Introduction to Machine Learning</h1>
                <p className="text-xs text-muted-foreground">156 pages • Uploaded 2 hours ago</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-muted rounded-md transition-colors" aria-label="Share">
                <Share2 className="h-4 w-4" />
              </button>
              <button className="p-2 hover:bg-muted rounded-md transition-colors" aria-label="Archive">
                <Archive className="h-4 w-4" />
              </button>
              <button className="p-2 hover:bg-muted rounded-md transition-colors" aria-label="Settings">
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-[1600px] px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Panel: Document Outline */}
          <aside className="col-span-3">
            <div className="sticky top-6 space-y-4">
              {/* Document Info */}
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">PDF Document</p>
                    <p className="text-xs text-muted-foreground">2.4 MB</p>
                  </div>
                </div>
                
                {/* Generation Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Processing Progress</span>
                    <span className="font-medium">40%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: '40%' }} />
                  </div>
                </div>
              </div>
              
              {/* Sections List */}
              <div className="rounded-lg border bg-card">
                <div className="p-4 border-b">
                  <h3 className="text-sm font-semibold">Document Sections</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{sections.length} sections detected</p>
                </div>
                <div className="max-h-[500px] overflow-y-auto">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setSelectedSection(section.id)}
                      className={`w-full p-3 text-left hover:bg-muted/50 transition-colors border-b last:border-0 
                        ${selectedSection === section.id ? 'bg-muted' : ''}
                      `}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium line-clamp-1">{section.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Pages {section.pageStart}-{section.pageEnd}
                          </p>
                        </div>
                        <StatusIndicator status={section.status} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Center Panel: Content Viewer */}
          <main className="col-span-6">
            {/* Tabs */}
            <div className="border-b mb-6">
              <nav className="flex gap-6">
                <button
                  onClick={() => setActiveTab('study-guide')}
                  className={`pb-3 px-1 text-sm font-medium transition-colors relative
                    ${activeTab === 'study-guide' 
                      ? 'text-foreground' 
                      : 'text-muted-foreground hover:text-foreground'
                    }
                  `}
                >
                  Study Guide
                  {activeTab === 'study-guide' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`pb-3 px-1 text-sm font-medium transition-colors relative
                    ${activeTab === 'summary' 
                      ? 'text-foreground' 
                      : 'text-muted-foreground hover:text-foreground'
                    }
                  `}
                >
                  Summary
                  {activeTab === 'summary' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('notes')}
                  className={`pb-3 px-1 text-sm font-medium transition-colors relative
                    ${activeTab === 'notes' 
                      ? 'text-foreground' 
                      : 'text-muted-foreground hover:text-foreground'
                    }
                  `}
                >
                  Notes
                  {activeTab === 'notes' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
              </nav>
            </div>

            {/* Content Area */}
            <div className="space-y-4">
              {isGenerating ? (
                <GeneratingState />
              ) : (
                <ContentViewer type={activeTab} sectionId={selectedSection} />
              )}
            </div>
          </main>

          {/* Right Panel: Actions & Export */}
          <aside className="col-span-3">
            <div className="sticky top-6 space-y-4">
              {/* Generate Actions */}
              <div className="rounded-lg border bg-card p-4">
                <h3 className="text-sm font-semibold mb-3">Generate Content</h3>
                <div className="space-y-2">
                  <button className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium flex items-center justify-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Generate All Content
                  </button>
                  <button className="w-full px-3 py-2 border rounded-md hover:bg-muted transition-colors text-sm flex items-center justify-center gap-2">
                    <FileCheck2 className="h-4 w-4" />
                    Generate for Section
                  </button>
                </div>
              </div>

              {/* Export Options */}
              <div className="rounded-lg border bg-card p-4">
                <h3 className="text-sm font-semibold mb-3">Export Options</h3>
                <div className="space-y-2">
                  <button className="w-full px-3 py-2 border rounded-md hover:bg-muted transition-colors text-sm flex items-center justify-center gap-2">
                    <Copy className="h-4 w-4" />
                    Copy All to Clipboard
                  </button>
                  <button className="w-full px-3 py-2 border rounded-md hover:bg-muted transition-colors text-sm flex items-center justify-center gap-2">
                    <Download className="h-4 w-4" />
                    Download as Markdown
                  </button>
                </div>
              </div>

              {/* Statistics */}
              <div className="rounded-lg border bg-card p-4">
                <h3 className="text-sm font-semibold mb-3">Statistics</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Sections</span>
                    <span className="font-medium">{sections.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Completed</span>
                    <span className="font-medium text-emerald-600">2</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Processing</span>
                    <span className="font-medium text-blue-600">1</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pending</span>
                    <span className="font-medium text-muted-foreground">2</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

// Status Indicator Component
function StatusIndicator({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
    case 'processing':
      return <Loader2 className="h-4 w-4 text-blue-600 animate-spin shrink-0" />
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
    default:
      return <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
  }
}

// Generating State Component
function GeneratingState() {
  return (
    <div className="rounded-lg border bg-card p-8 text-center">
      <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Generating Content</h3>
      <p className="text-sm text-muted-foreground mb-4">
        AI is analyzing your document and creating study materials...
      </p>
      <div className="max-w-xs mx-auto">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }} />
        </div>
        <p className="text-xs text-muted-foreground mt-2">Processing section 3 of 5</p>
      </div>
    </div>
  )
}

// Content Viewer Component
function ContentViewer({ type, sectionId }: { type: string; sectionId: string | null }) {
  if (!sectionId) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Select a Section</h3>
        <p className="text-sm text-muted-foreground">
          Choose a section from the outline to view its {type.replace('-', ' ')}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="prose prose-sm max-w-none">
        <h2 className="text-xl font-semibold mb-4">
          {type === 'study-guide' && 'Study Guide'}
          {type === 'summary' && 'Summary'}
          {type === 'notes' && 'Notes'}
        </h2>
        
        {/* Placeholder content - will be replaced with real generated content */}
        <div className="space-y-4 text-muted-foreground">
          <p>
            This is where the generated {type.replace('-', ' ')} content will appear for the selected section.
          </p>
          <p>
            The content will be streamed in real-time as it's being generated by the AI model.
          </p>
        </div>
      </div>
    </div>
  )
}

