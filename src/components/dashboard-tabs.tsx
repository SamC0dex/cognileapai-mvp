'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { FlashcardSet } from '@/types/flashcards'
import {
  FileText,
  BookOpen,
  GraduationCap,
  Lightbulb,
  Search,
  Filter,
  Plus,
  Grid3x3,
  List,
  CreditCard,
  Clock,
  ExternalLink,
  PenTool,
  Zap,
  X,
  ChevronLeft
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Button,
  Input
} from '@/components/ui'
import { useStudyToolsStore, STUDY_TOOLS, type StudyToolContent, type StudyToolType } from '@/lib/study-tools-store'
import { useFlashcardStore } from '@/lib/flashcard-store'
import { FlashcardsStackIcon } from '@/components/icons/flashcards-stack-icon'

interface DashboardTabsProps {
  onViewModeChange?: (mode: 'grid' | 'list') => void
  onSearch?: (query: string) => void
  onUpload?: () => void
}

// Icon mapping for study tools
const iconMap = {
  'study-guide': BookOpen,
  'flashcards': FlashcardsStackIcon,
  'smart-notes': PenTool,
  'smart-summary': Zap
}

// Study Tool Card Component
interface StudyToolCardProps {
  content: StudyToolContent
  onClick: () => void
}

const StudyToolCard: React.FC<StudyToolCardProps> = ({ content, onClick }) => {
  const tool = STUDY_TOOLS[content.type]
  const IconComponent = iconMap[content.type]

  return (
    <div
      onClick={onClick}
      className={cn(
        "group p-4 rounded-lg border-2 cursor-pointer transition-all duration-200",
        "hover:shadow-lg hover:shadow-black/5 hover:border-opacity-80",
        tool.color,
        tool.borderColor
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg", tool.color)}>
          <IconComponent className={cn("w-5 h-5", tool.textColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={cn("font-medium text-sm truncate mb-1", tool.textColor)}>
            {content.title}
          </h4>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>
              {new Date(content.createdAt).toLocaleDateString()}
            </span>
            <span className="text-xs bg-muted/50 px-1.5 py-0.5 rounded">
              {Math.round(content.content.length / 1000)}k chars
            </span>
          </div>
        </div>
        <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  )
}

// Flashcard Set Card Component
interface FlashcardCardProps {
  flashcardSet: FlashcardSet
  onClick: () => void
}

const FlashcardCard: React.FC<FlashcardCardProps> = ({ flashcardSet, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="group p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-black/5 hover:border-opacity-80 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
          <FlashcardsStackIcon size={20} className="text-green-700 dark:text-green-300" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate mb-1 text-green-700 dark:text-green-300">
            {flashcardSet.title}
          </h4>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>
              {new Date(flashcardSet.createdAt).toLocaleDateString()}
            </span>
            <span className="text-xs bg-muted/50 px-1.5 py-0.5 rounded">
              {flashcardSet.cards.length} cards
            </span>
          </div>
        </div>
        <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  )
}

// Study Tool List Item Component
interface StudyToolListItemProps {
  content: StudyToolContent
  onClick: () => void
}

const StudyToolListItem: React.FC<StudyToolListItemProps> = ({ content, onClick }) => {
  const tool = STUDY_TOOLS[content.type]
  const IconComponent = iconMap[content.type]

  return (
    <div
      onClick={onClick}
      className={cn(
        "group p-3 rounded-lg border cursor-pointer transition-all duration-200",
        "hover:shadow-md hover:shadow-black/5 bg-background/50 hover:bg-background/80",
        tool.borderColor
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-1.5 rounded-lg", tool.color)}>
          <IconComponent className={cn("w-3.5 h-3.5", tool.textColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate mb-1">
            {content.title}
          </h4>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>
              {new Date(content.createdAt).toLocaleDateString()} at {new Date(content.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
            </span>
            <span className="text-xs bg-muted/50 px-1.5 py-0.5 rounded">
              {Math.round(content.content.length / 1000)}k chars
            </span>
          </div>
        </div>
        <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  )
}

// Flashcard Set List Item Component
interface FlashcardListItemProps {
  flashcardSet: FlashcardSet
  onClick: () => void
}

const FlashcardListItem: React.FC<FlashcardListItemProps> = ({ flashcardSet, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="group p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md hover:shadow-black/5 bg-background/50 hover:bg-background/80 border-green-200 dark:border-green-800"
    >
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded-lg bg-green-50 dark:bg-green-900/20">
          <FlashcardsStackIcon size={16} className="text-green-700 dark:text-green-300" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate mb-1">
            {flashcardSet.title}
          </h4>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>
              {new Date(flashcardSet.createdAt).toLocaleDateString()} at {new Date(flashcardSet.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
            </span>
            <span className="text-xs bg-muted/50 px-1.5 py-0.5 rounded">
              {flashcardSet.cards.length} cards
            </span>
          </div>
        </div>
        <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  )
}

export function DashboardTabs({
  onViewModeChange,
  onSearch,
  onUpload
}: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const router = useRouter()

  // Get study tools data
  const { generatedContent, loadStudyToolsFromDatabase, openCanvas, expandPanel } = useStudyToolsStore()
  const { flashcardSets, openViewer } = useFlashcardStore()

  // Load study tools on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        await loadStudyToolsFromDatabase()
      } catch (error) {
        console.error('Failed to load study tools:', error)
      } finally {
        setIsInitialLoading(false)
      }
    }
    loadData()
  }, [loadStudyToolsFromDatabase])

  // Filter data based on active tab
  const getFilteredData = () => {
    let studyTools = generatedContent.filter(content => !content.isGenerating)
    let flashcards = flashcardSets.filter(set => !set.metadata?.isGenerating)

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      studyTools = studyTools.filter(content =>
        content.title.toLowerCase().includes(query) ||
        content.type.toLowerCase().includes(query)
      )
      flashcards = flashcards.filter(set =>
        set.title.toLowerCase().includes(query)
      )
    }

    switch (activeTab) {
      case 'documents':
        return { studyTools, flashcards: [] }
      case 'flashcards':
        return { studyTools: [], flashcards }
      case 'all':
      default:
        return { studyTools, flashcards }
    }
  }

  const { studyTools, flashcards } = getFilteredData()
  const totalItems = studyTools.length + flashcards.length

  // Click handlers that navigate to chat page and open the content
  const handleStudyToolClick = (content: StudyToolContent) => {
    // Set up the study tool to be opened
    expandPanel()
    openCanvas(content)

    // Navigate to chat page with appropriate context
    if (content.documentId) {
      router.push(`/chat?type=document&documentId=${content.documentId}`)
    } else if (content.conversationId) {
      router.push(`/chat/${content.conversationId}`)
    } else {
      // Fallback - navigate to general chat
      router.push('/chat')
    }
  }

  const handleFlashcardClick = (flashcardSet: FlashcardSet) => {
    // Set up the flashcard to be opened
    expandPanel()
    openViewer(flashcardSet)

    // Navigate to chat page with appropriate context
    if (flashcardSet.documentId) {
      router.push(`/chat?type=document&documentId=${flashcardSet.documentId}`)
    } else if (flashcardSet.conversationId) {
      router.push(`/chat/${flashcardSet.conversationId}`)
    } else {
      // Fallback - navigate to general chat
      router.push('/chat')
    }
  }

  const tabs = [
    {
      id: 'all',
      label: 'All',
      icon: FileText,
      count: generatedContent.filter(c => !c.isGenerating).length + flashcardSets.filter(f => !f.metadata?.isGenerating).length
    },
    {
      id: 'documents',
      label: 'Study Documents',
      icon: BookOpen,
      count: generatedContent.filter(c => !c.isGenerating).length
    },
    {
      id: 'flashcards',
      label: 'Flashcards',
      icon: CreditCard,
      count: flashcardSets.filter(f => !f.metadata?.isGenerating).length
    }
  ]

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    onSearch?.(value)
  }

  const toggleSearch = () => {
    if (isSearchExpanded && searchQuery) {
      // If expanded and has content, clear and collapse
      setSearchQuery('')
      handleSearch('')
      setIsSearchExpanded(false)
    } else if (isSearchExpanded) {
      // If expanded but empty, just collapse
      setIsSearchExpanded(false)
    } else {
      // If collapsed, expand
      setIsSearchExpanded(true)
    }
  }

  // Auto-collapse search when clicking outside
  const searchRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        if (isSearchExpanded && !searchQuery) {
          setIsSearchExpanded(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isSearchExpanded, searchQuery])

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode)
    onViewModeChange?.(mode)
  }

  return (
    <div className="px-8 py-6 border-b border-border">
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Tab Navigation */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <TabsList className="grid grid-cols-3 w-full lg:w-auto bg-muted/50 p-1 h-12 min-w-0">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="flex items-center gap-1 lg:gap-2 px-2 lg:px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md transition-all dark:data-[state=active]:bg-gradient-to-r dark:data-[state=active]:from-teal-600 dark:data-[state=active]:to-teal-700 min-w-0"
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="font-medium text-sm lg:text-base truncate">{tab.label}</span>
                    {tab.count > 0 && (
                      <span className="text-xs bg-background/20 px-1.5 py-0.5 rounded flex-shrink-0">
                        {tab.count}
                      </span>
                    )}
                  </TabsTrigger>
                )
              })}
            </TabsList>

            {/* Controls */}
            <div className="flex items-center gap-2 lg:gap-3">
              {/* Collapsible Search */}
              <div ref={searchRef} className="relative flex items-center">
                <AnimatePresence mode="wait">
                  {isSearchExpanded ? (
                    <motion.div
                      key="search-expanded"
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: "auto", opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="flex items-center"
                    >
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="Search content..."
                          value={searchQuery}
                          onChange={(e) => handleSearch(e.target.value)}
                          className="w-48 lg:w-60 pl-9 bg-background/50 border-border"
                          autoFocus
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleSearch}
                        className="h-10 w-10 ml-1 hover:bg-muted flex-shrink-0"
                      >
                        {searchQuery ? (
                          <X className="h-4 w-4" />
                        ) : (
                          <ChevronLeft className="h-4 w-4" />
                        )}
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="search-collapsed"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.1 }}
                    >
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={toggleSearch}
                        className="h-10 w-10 flex-shrink-0 dark:border-teal-600/40 dark:text-teal-300 dark:hover:bg-teal-600/10 dark:hover:text-teal-200 dark:hover:border-teal-500/60"
                      >
                        <Search className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Filter */}
              <Button variant="outline" size="icon" className="h-10 w-10 flex-shrink-0 dark:border-teal-600/40 dark:text-teal-300 dark:hover:bg-teal-600/10 dark:hover:text-teal-200 dark:hover:border-teal-500/60">
                <Filter className="h-4 w-4" />
              </Button>

              {/* View Mode Toggle */}
              <div className="flex items-center border rounded-lg overflow-hidden flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleViewModeChange('grid')}
                  className={cn(
                    "h-10 w-10 rounded-none",
                    viewMode === 'grid' ? 'bg-primary text-primary-foreground dark:bg-gradient-to-r dark:from-teal-600 dark:to-teal-700' : 'hover:bg-muted'
                  )}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleViewModeChange('list')}
                  className={cn(
                    "h-10 w-10 rounded-none",
                    viewMode === 'list' ? 'bg-primary text-primary-foreground dark:bg-gradient-to-r dark:from-teal-600 dark:to-teal-700' : 'hover:bg-muted'
                  )}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>

              {/* Upload Button */}
              <Button
                onClick={onUpload}
                className="h-10 px-3 lg:px-4 bg-primary text-primary-foreground hover:bg-primary/90 button-primary dark:bg-gradient-to-r dark:from-teal-600 dark:to-teal-700 dark:hover:from-teal-700 dark:hover:to-teal-800 flex-shrink-0"
              >
                <Plus className="h-4 w-4 mr-1 lg:mr-2" />
                <span className="hidden sm:inline">Upload PDF</span>
                <span className="sm:hidden">Upload</span>
              </Button>
            </div>
          </div>

          {/* Tab Content */}
          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="mt-0">
              <div className="min-h-[400px] rounded-xl border border-border/50 bg-card/50 p-6">
                {!isInitialLoading && totalItems === 0 ? (
                  /* Empty State - Only show when loading is complete and no content */
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-6">
                      <tab.icon className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">
                      {tab.id === 'all' && "Your AI study hub awaits"}
                      {tab.id === 'documents' && "Ready to generate study magic"}
                      {tab.id === 'flashcards' && "No flashcard decks yet"}
                    </h3>
                    <p className="text-muted-foreground max-w-md">
                      {tab.id === 'all' && "Upload a document to generate summaries, notes, study guides, and flashcards—all your AI-powered study materials will appear here"}
                      {tab.id === 'documents' && "Transform your documents into study guides, smart summaries, and organized notes using advanced AI"}
                      {tab.id === 'flashcards' && "Create interactive flashcard sets from your study materials for effective memorization and review"}
                    </p>
                  </div>
                ) : !isInitialLoading ? (
                  /* Content Display - Show when loading complete and has content */
                  <div className="space-y-4">
                    {viewMode === 'grid' ? (
                      /* Grid View */
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {studyTools.map((content) => (
                          <StudyToolCard
                            key={content.id}
                            content={content}
                            onClick={() => handleStudyToolClick(content)}
                          />
                        ))}
                        {flashcards.map((flashcardSet) => (
                          <FlashcardCard
                            key={flashcardSet.id}
                            flashcardSet={flashcardSet}
                            onClick={() => handleFlashcardClick(flashcardSet)}
                          />
                        ))}
                      </div>
                    ) : (
                      /* List View */
                      <div className="space-y-2">
                        {studyTools.map((content) => (
                          <StudyToolListItem
                            key={content.id}
                            content={content}
                            onClick={() => handleStudyToolClick(content)}
                          />
                        ))}
                        {flashcards.map((flashcardSet) => (
                          <FlashcardListItem
                            key={flashcardSet.id}
                            flashcardSet={flashcardSet}
                            onClick={() => handleFlashcardClick(flashcardSet)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Loading State - Show nothing during initial load to prevent flash */
                  <div className="min-h-[400px] flex items-center justify-center">
                    {/* Intentionally minimal or empty during loading */}
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}
