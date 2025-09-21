'use client'

import React from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui'
import { useStudyToolsStore, STUDY_TOOLS, type StudyToolType } from '@/lib/study-tools-store'
import { StudyToolsConfirmationDialog } from './study-tools-confirmation-dialog'
import { FlashcardCustomizationDialog } from './flashcard-customization-dialog'
import { FlashcardViewer } from './flashcard-viewer'
import { useFlashcardStore } from '@/lib/flashcard-store'
import { FlashcardOptions } from '@/types/flashcards'
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Loader2,
  BookOpen,
  FileText,
  PenTool,
  Zap,
  AlertCircle,
  Clock,
  ExternalLink,
  MoreVertical,
  Edit3,
  Trash2,
  Download,
  Copy,
  X,
  Check,
  Maximize2,
  Minimize2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { FlashcardsStackIcon } from '@/components/icons/flashcards-stack-icon'

// Enhanced animation variants
const springTransition = {
  type: 'spring',
  stiffness: 450,
  damping: 45,
  mass: 0.4
}

const smoothTransition = {
  type: 'tween',
  duration: 0.2,
  ease: 'easeInOut'
}

const cardVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { ...springTransition, delay: 0.05 }
  },
  hover: {
    y: -1,
    scale: 1.01,
    transition: { ...smoothTransition, duration: 0.15 }
  },
  tap: {
    scale: 0.99,
    transition: { duration: 0.08 }
  }
}

// Panel width variants for proper sidebar behavior
const panelVariants = {
  collapsed: {
    width: 48,
    opacity: 1,
    transition: {
      type: 'tween',
      duration: 0.15,
      ease: 'easeOut'
    }
  },
  expanded: {
    width: '40%',
    opacity: 1,
    transition: {
      type: 'tween',
      duration: 0.2,
      ease: 'easeInOut'
    }
  },
  expandedWithCanvas: {
    width: '50%',
    opacity: 1,
    transition: {
      type: 'tween',
      duration: 0.2,
      ease: 'easeInOut'
    }
  },
  fullscreenCanvas: {
    width: '85%',
    opacity: 1,
    transition: {
      type: 'tween',
      duration: 0.3,
      ease: 'easeInOut'
    }
  }
}

const iconMap = {
  'study-guide': BookOpen,
  'flashcards': FlashcardsStackIcon,
  'smart-notes': PenTool,
  'smart-summary': Zap
}

interface StudyToolCardProps {
  type: StudyToolType
  onClick: () => void
  isGenerating: boolean
  isCurrentlyGenerating: boolean
  hasContext: boolean
}

const StudyToolCard: React.FC<StudyToolCardProps> = React.memo(({
  type,
  onClick,
  isGenerating,
  isCurrentlyGenerating,
  hasContext
}) => {
  const tool = STUDY_TOOLS[type]
  const isPlaceholder = 'disabled' in tool && tool.disabled
  const isDisabled = isPlaceholder || (!hasContext && type !== 'flashcards')
  const IconComponent = iconMap[type]
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={!isDisabled && !prefersReducedMotion ? "hover" : undefined}
      whileTap={!isDisabled && !prefersReducedMotion ? "tap" : undefined}
      className={cn(
        "relative p-3 rounded-lg border-2 transition-all duration-200 group",
        !isDisabled && "cursor-pointer hover:shadow-lg hover:shadow-black/5 hover:border-opacity-80",
        isDisabled && "cursor-not-allowed opacity-60",
        tool.color,
        tool.borderColor,
        isCurrentlyGenerating && "ring-2 ring-brand-teal-500 ring-opacity-50 shadow-lg"
      )}
      onClick={!isDisabled ? onClick : undefined}
    >
      {/* Loading overlay */}
      <AnimatePresence>
        {isCurrentlyGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl flex items-center justify-center z-10"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="w-5 h-5 text-brand-teal-600" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tool icon and content */}
      <div className="flex items-start gap-2">
        <motion.div
          className={cn(
            "p-2 rounded-lg transition-colors",
            tool.color,
            !isDisabled && "group-hover:scale-110 transition-transform duration-200"
          )}
          whileHover={!isDisabled ? { scale: 1.1 } : undefined}
        >
          <IconComponent className={cn("w-5 h-5", tool.textColor)} />
        </motion.div>
        <div className="flex-1 min-w-0">
          <h3 className={cn("font-semibold text-xs mb-0.5", tool.textColor)}>
            {tool.name}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {tool.description}
          </p>
        </div>
      </div>

      {/* Generate indicator */}
      <div className="mt-2 flex items-center justify-between">
        <motion.span
          className="text-xs font-medium text-muted-foreground"
          animate={isCurrentlyGenerating ? { opacity: [0.5, 1, 0.5] } : { opacity: 1 }}
          transition={{ duration: 1.5, repeat: isCurrentlyGenerating ? Infinity : 0 }}
        >
          {isCurrentlyGenerating
            ? 'Generating...'
            : isPlaceholder
            ? 'Coming Soon'
            : !hasContext && type !== 'flashcards'
            ? 'Needs Document'
            : 'Generate'
          }
        </motion.span>

        {!hasContext && type !== 'flashcards' ? (
          <AlertCircle className="w-4 h-4 text-amber-500" />
        ) : (
          <motion.div
            animate={isCurrentlyGenerating ? { scale: [1, 1.2, 1] } : { scale: 1 }}
            transition={{ duration: 1, repeat: isCurrentlyGenerating ? Infinity : 0 }}
          >
            <Sparkles className={cn(
              "w-4 h-4 transition-colors",
              isCurrentlyGenerating ? "text-brand-teal-600" : tool.textColor
            )} />
          </motion.div>
        )}
      </div>
    </motion.div>
  )
})

StudyToolCard.displayName = 'StudyToolCard'

// Helper function to clean AI introduction text from content
const cleanAIIntroduction = (content: string): string => {
  // Remove common AI introduction patterns with comprehensive matching
  const patterns = [
    // "Of course" variations
    /^Of course[.,]?\s*/i,
    // "Here is/are" patterns - more comprehensive
    /^Here\s+(?:is|are)\s+(?:a|an|the|some)?\s*(?:comprehensive|detailed|smart)?\s*[^.]*?\s*on\s+the\s*["'""']?[^"'""']*?["'""']?[^.]*?[.,*]\s*/i,
    // Specific pattern for the current issue
    /^Here\s+are\s+comprehensive\s+smart\s+notes\s+on\s+the\s+["'""'][^"'""']*["'""']\s+syllabus[.,*\s]*/i,
    // General "Here are" followed by content description
    /^Here\s+(?:is|are)\s+[^.]*?(?:notes|summary|guide|analysis)[^.]*?[.,*]\s*/i,
    // "I'll create" patterns
    /^I'll\s+(?:create|provide|generate)\s+[^.]*?[.,]\s*/i,
    // Certainty expressions
    /^(?:Certainly|Absolutely|Sure)[.,]?\s*/i,
    // Methodology references
    /created\s+using\s+the\s+[^.]*?methodology[.,]?\s*/i,
    // Common AI politeness patterns
    /^(?:Let me|I'd be happy to)\s+[^.]*?[.,]\s*/i
  ]

  let cleaned = content
  for (const pattern of patterns) {
    const before = cleaned
    cleaned = cleaned.replace(pattern, '')
    // Debug log to see what patterns are matching
    if (before !== cleaned && process.env.NODE_ENV === 'development') {
      console.log('[AI Text Cleaning] Removed pattern:', before.substring(0, 100) + '...')
    }
  }

  // Remove any remaining leading whitespace, newlines, or asterisks
  cleaned = cleaned.replace(/^[\s*]+/, '').trim()

  return cleaned
}

const GeneratedDocumentsSection: React.FC = React.memo(() => {
  const { generatedContent, openCanvas, removeGeneratedContent, renameGeneratedContent, copyToClipboard } = useStudyToolsStore()
  const { downloadAsPDF, downloadAsDOCX } = useStudyToolsStore()
  const prefersReducedMotion = useReducedMotion()
  const [activeDropdown, setActiveDropdown] = React.useState<string | null>(null)
  const [editingTitle, setEditingTitle] = React.useState<string | null>(null)
  const [editingValue, setEditingValue] = React.useState('')

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (activeDropdown && !target.closest('[data-dropdown="true"]')) {
        setActiveDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [activeDropdown])

  const handleRename = (content: any) => {
    setEditingTitle(content.id)
    setEditingValue(content.title)
    setActiveDropdown(null)
  }

  const handleSaveRename = (id: string) => {
    if (editingValue.trim() && editingValue !== '') {
      renameGeneratedContent(id, editingValue.trim())
    }
    setEditingTitle(null)
    setEditingValue('')
  }

  const handleDelete = async (id: string) => {
    try {
      await removeGeneratedContent(id)
      setActiveDropdown(null)
    } catch (error) {
      console.error('Failed to delete study tool:', error)
      setActiveDropdown(null)
      // Note: Error is logged but UI continues to work. The rollback in the store
      // will restore the item if database deletion failed.
    }
  }

  const handleCopyContent = async (content: string) => {
    try {
      const success = await copyToClipboard(content)
      if (success) {
        console.log('Content copied successfully')
      }
      setActiveDropdown(null)
    } catch (error) {
      console.error('Failed to copy content:', error)
      setActiveDropdown(null)
    }
  }

  const handleDownloadContent = async (content: any) => {
    try {
      await downloadAsDOCX(content)
      setActiveDropdown(null)
    } catch (error) {
      console.error('Failed to download content:', error)
      // Fallback to simple text download
      const blob = new Blob([content.content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${content.title}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setActiveDropdown(null)
    }
  }

  const DocumentDropdownMenu = ({ content }: { content: any }) => {
    const isActive = activeDropdown === content.id

    return (
      <div className="relative" data-dropdown="true">
        <motion.button
          className={cn(
            "p-1.5 rounded-md transition-colors duration-200",
            "hover:bg-muted/70 focus:outline-none focus:bg-muted/70",
            "opacity-0 group-hover:opacity-100 transition-opacity",
            "pointer-events-auto relative z-10",
            isActive && "opacity-100 bg-muted/70"
          )}
          onClick={(e) => {
            e.stopPropagation()
            setActiveDropdown(isActive ? null : content.id)
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <MoreVertical className="w-4 h-4 text-muted-foreground" />
        </motion.button>

        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -5 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute right-0 top-full mt-1 w-48 bg-popover border border-border rounded-lg shadow-xl z-[500] overflow-hidden" data-dropdown="true"
              onMouseEnter={(e) => e.stopPropagation()}
              onMouseMove={(e) => e.stopPropagation()}
            >
              <div className="p-1">
                <motion.button
                  whileHover={{ backgroundColor: 'hsl(var(--accent))' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    handleRename(content)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left hover:bg-accent"
                >
                  <Edit3 className="w-4 h-4" />
                  Rename
                </motion.button>
                <motion.button
                  whileHover={{ backgroundColor: 'hsl(var(--accent))' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    handleCopyContent(content.content)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left hover:bg-accent"
                >
                  <Copy className="w-4 h-4" />
                  Copy Content
                </motion.button>
                <motion.button
                  whileHover={{ backgroundColor: 'hsl(var(--accent))' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    handleDownloadContent(content)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left hover:bg-accent"
                >
                  <Download className="w-4 h-4" />
                  Download
                </motion.button>
                <div className="h-px bg-border my-1" />
                <motion.button
                  whileHover={{ backgroundColor: 'hsl(var(--destructive) / 0.1)' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    handleDelete(content.id)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  if (generatedContent.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, ...smoothTransition }}
        className="text-center py-6"
      >
        <motion.div
          animate={!prefersReducedMotion ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center"
        >
          <FileText className="w-5 h-5 text-muted-foreground/50" />
        </motion.div>
        <p className="text-xs text-muted-foreground">
          Generated documents will appear here
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, ...smoothTransition }}
      className="space-y-2 relative"
    >
      <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
        <FileText className="w-4 h-4" />
        Generated Documents ({generatedContent.length})
      </h3>

      {/* Backdrop overlay when dropdown is open */}
      <AnimatePresence>
        {activeDropdown && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0 }}
            className="absolute inset-0 bg-transparent z-[400] cursor-default"
            onClick={() => setActiveDropdown(null)}
            onMouseMove={(e) => e.stopPropagation()}
            onMouseEnter={(e) => e.stopPropagation()}
          />
        )}
      </AnimatePresence>

      <motion.div
        className="space-y-2 relative"
        variants={{
          hidden: {},
          visible: {
            transition: {
              staggerChildren: 0.05
            }
          }
        }}
        initial="hidden"
        animate="visible"
      >
        {generatedContent.map((content, index) => {
          const tool = STUDY_TOOLS[content.type]
          const IconComponent = iconMap[content.type]
          const isGenerating = content.isGenerating

          return (
            <motion.div
              key={content.id}
              variants={{
                hidden: { opacity: 0, x: -10, scale: 0.95 },
                visible: {
                  opacity: 1,
                  x: 0,
                  scale: 1,
                  transition: {
                    type: 'spring',
                    stiffness: 400,
                    damping: 25,
                    delay: index * 0.05
                  }
                }
              }}
              whileHover={!prefersReducedMotion && !isGenerating && !activeDropdown ? {
                y: -1,
                scale: 1.01,
                transition: { duration: 0.15 }
              } : undefined}
              whileTap={!prefersReducedMotion && !isGenerating && !activeDropdown ? {
                scale: 0.98,
                transition: { duration: 0.08 }
              } : undefined}
              className={cn(
                "group p-3 rounded-lg border transition-all duration-200",
                isGenerating
                  ? "cursor-wait bg-gradient-to-r from-blue-50/50 to-teal-50/50 dark:from-blue-900/10 dark:to-teal-900/10 border-blue-200/50 dark:border-blue-700/50"
                  : "cursor-pointer hover:shadow-md hover:shadow-black/5 bg-background/50 hover:bg-background/80",
                !isGenerating && tool.borderColor
              )}
              onClick={() => !isGenerating && openCanvas(content)}
            >
              <div className="flex items-start gap-3">
                {/* Icon with generation animation */}
                <motion.div
                  className={cn(
                    "p-1.5 rounded-lg flex-shrink-0 relative",
                    isGenerating
                      ? "bg-gradient-to-r from-blue-100 to-teal-100 dark:from-blue-800/30 dark:to-teal-800/30"
                      : tool.color
                  )}
                  animate={isGenerating ? {
                    scale: [1, 1.05, 1],
                    rotate: [0, 2, -2, 0]
                  } : {}}
                  transition={{
                    duration: 2,
                    repeat: isGenerating ? Infinity : 0,
                    ease: "easeInOut"
                  }}
                >
                  {isGenerating ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    </motion.div>
                  ) : (
                    <IconComponent className={cn("w-3.5 h-3.5", tool.textColor)} />
                  )}
                </motion.div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    {editingTitle === content.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => handleSaveRename(content.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(content.id)
                            if (e.key === 'Escape') {
                              setEditingTitle(null)
                              setEditingValue('')
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                          className="flex-1 text-sm font-medium bg-background border border-border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-teal-500/50"
                        />
                      </div>
                    ) : (
                      <h4 className={cn(
                        "font-medium text-sm truncate flex-1",
                        isGenerating && "text-blue-700 dark:text-blue-300"
                      )}>
                        {content.title}
                      </h4>
                    )}

                    <div className="flex items-center gap-1">
                      {!isGenerating && (
                        <motion.div
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          whileHover={{ scale: 1.1 }}
                        >
                          <ExternalLink className="w-3 h-3 text-muted-foreground" />
                        </motion.div>
                      )}
                      {!isGenerating && (
                        <DocumentDropdownMenu content={content} />
                      )}
                    </div>
                  </div>

                  {isGenerating ? (
                    /* Generation progress */
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                        <motion.div
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          <Sparkles className="w-3 h-3" />
                        </motion.div>
                        <span>{content.title.includes(':') ? content.title.split(':')[1].trim() : 'Generating with AI...'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="flex-1 bg-blue-100 dark:bg-blue-800/30 rounded-full h-1">
                          <motion.div
                            className="h-1 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full"
                            initial={{ width: '0%' }}
                            animate={{ width: `${content.generationProgress || 0}%` }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                          />
                        </div>
                        <span className="text-xs">{Math.round(content.generationProgress || 0)}%</span>
                      </div>
                    </div>
                  ) : (
                    /* Completed document info */
                    <>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>
                          {new Date(content.createdAt).toLocaleDateString()} at {new Date(content.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                        </span>
                        <span className="text-xs bg-muted/50 px-1.5 py-0.5 rounded">
                          {Math.round(content.content.length / 1000)}k chars
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </motion.div>
    </motion.div>
  )
})

GeneratedDocumentsSection.displayName = 'GeneratedDocumentsSection'

const CollapsedPanel: React.FC<{ onExpand: () => void }> = ({ onExpand }) => {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      variants={panelVariants}
      initial="collapsed"
      animate="collapsed"
      exit="collapsed"
      className="h-full bg-background/95 backdrop-blur-sm border-r border-border flex flex-col items-center py-4 gap-3 shadow-sm"
    >
      {/* Expand button */}
      <motion.div
        whileHover={!prefersReducedMotion ? { scale: 1.05 } : undefined}
        whileTap={!prefersReducedMotion ? { scale: 0.95 } : undefined}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={onExpand}
          className="w-8 h-8 rounded-lg hover:bg-accent/50 transition-all duration-200"
        >
          <motion.div
            animate={{ rotate: 0 }}
            whileHover={{ rotate: 5 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="w-4 h-4" />
          </motion.div>
        </Button>
      </motion.div>

      {/* Tool icons in vertical stack */}
      <div className="flex flex-col gap-2">
        {Object.entries(STUDY_TOOLS).map(([type, tool], index) => {
          const IconComponent = iconMap[type as StudyToolType]
          return (
            <motion.div
              key={type}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05, ...smoothTransition }}
              whileHover={!prefersReducedMotion ? { scale: 1.1, y: -1 } : undefined}
              whileTap={!prefersReducedMotion ? { scale: 0.95 } : undefined}
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-200",
                "hover:shadow-md",
                tool.color,
                tool.borderColor,
                'disabled' in tool && tool.disabled && "opacity-50"
              )}
              onClick={onExpand}
              title={tool.name}
            >
              <IconComponent className={cn("w-4 h-4", tool.textColor)} />
            </motion.div>
          )
        })}
      </div>

      {/* Sparkle indicator */}
      <motion.div
        className="mt-auto"
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <Sparkles className="w-4 h-4 text-brand-teal-500 opacity-50" />
      </motion.div>
    </motion.div>
  )
}


const ExpandedPanel: React.FC<{
  onCollapse: () => void
  onGenerateStudyTool: (type: StudyToolType) => void
  isGenerating: boolean
  generatingType: StudyToolType | null
  hasContext: boolean
}> = ({ onCollapse, onGenerateStudyTool, isGenerating, generatingType, hasContext }) => {
  const prefersReducedMotion = useReducedMotion()
  const { isCanvasOpen, isCanvasFullscreen, canvasContent, closeCanvas, toggleCanvasFullscreen, copyToClipboard, downloadAsPDF, downloadAsDOCX } = useStudyToolsStore()
  const { isViewerOpen, currentFlashcardSet, isFullscreen, closeViewer, toggleFullscreen } = useFlashcardStore()
  const [isCopied, setIsCopied] = React.useState(false)
  const [showExportMenu, setShowExportMenu] = React.useState(false)

  // Close export menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (showExportMenu && !target.closest('[data-dropdown="true"]')) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showExportMenu])

  const handleCopy = React.useCallback(async () => {
    if (!canvasContent) return

    try {
      const success = await copyToClipboard(canvasContent.content)
      if (success) {
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
      } else {
        // Fallback using navigator.clipboard
        await navigator.clipboard.writeText(canvasContent.content)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
      }
    } catch (error) {
      console.error('Copy failed:', error)
      // Try fallback method
      try {
        await navigator.clipboard.writeText(canvasContent.content)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
      } catch (fallbackError) {
        console.error('Fallback copy also failed:', fallbackError)
      }
    }
  }, [canvasContent, copyToClipboard])

  const handleDownloadPDF = React.useCallback(async () => {
    if (!canvasContent) return

    try {
      await downloadAsPDF(canvasContent)
    } catch (error) {
      console.error('PDF download failed:', error)
    }
  }, [canvasContent, downloadAsPDF])

  const handleDownloadDOCX = React.useCallback(async () => {
    if (!canvasContent) return

    try {
      await downloadAsDOCX(canvasContent)
    } catch (error) {
      console.error('DOCX download failed:', error)
    }
  }, [canvasContent, downloadAsDOCX])

  return (
    <motion.div
      variants={panelVariants}
      initial="collapsed"
      animate={
        isCanvasOpen && !isCanvasFullscreen
          ? "expandedWithCanvas"
          : "expanded"
      }
      exit="collapsed"
      className="h-full bg-background/95 backdrop-blur-sm border-r border-border flex flex-col shadow-lg"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, transition: { duration: 0.05 } }}
        transition={{ delay: 0.05, ...smoothTransition }}
        className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-brand-teal-50 to-transparent dark:from-brand-teal-900/20"
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles className="w-5 h-5 text-brand-teal-600" />
          </motion.div>
          <h2 className="font-semibold text-lg bg-gradient-to-r from-brand-teal-700 to-brand-teal-500 bg-clip-text text-transparent">
            Study Tools
          </h2>
        </div>
        <motion.div
          whileHover={!prefersReducedMotion ? { scale: 1.05 } : undefined}
          whileTap={!prefersReducedMotion ? { scale: 0.95 } : undefined}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={onCollapse}
            className="w-8 h-8 rounded-lg hover:bg-accent/50 transition-all duration-200"
          >
            <motion.div
              animate={{ rotate: 0 }}
              whileHover={{ rotate: -5 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.div>
          </Button>
        </motion.div>
      </motion.div>

      {/* Canvas Content or Tools Grid */}
      <AnimatePresence mode="wait">
        {isCanvasOpen && canvasContent && !isCanvasFullscreen ? (
          <motion.div
            key="canvas"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.05 } }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            className="flex-1 flex flex-col min-h-0"
          >
            {/* Canvas Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-background/95 to-background/90 backdrop-blur-md relative z-10">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <motion.div
                  className={cn(
                    "p-2 rounded-xl shadow-sm",
                    STUDY_TOOLS[canvasContent.type].color,
                    STUDY_TOOLS[canvasContent.type].borderColor,
                    "border-2"
                  )}
                  whileHover={!prefersReducedMotion ? { scale: 1.05, rotate: 1 } : undefined}
                  transition={{ duration: 0.2 }}
                >
                  {React.createElement(iconMap[canvasContent.type], {
                    className: cn("w-5 h-5", STUDY_TOOLS[canvasContent.type].textColor)
                  })}
                </motion.div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base truncate bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                    {canvasContent.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(canvasContent.createdAt).toLocaleDateString()} at {new Date(canvasContent.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Fullscreen toggle - Icon only */}
                <motion.div
                  whileHover={!prefersReducedMotion ? { scale: 1.05 } : undefined}
                  whileTap={!prefersReducedMotion ? { scale: 0.95 } : undefined}
                >
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleCanvasFullscreen}
                    className="w-8 h-8"
                    title={isCanvasFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                  >
                    {isCanvasFullscreen ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                  </Button>
                </motion.div>

                {/* Copy button - Icon only */}
                <motion.div
                  whileHover={!prefersReducedMotion ? { scale: 1.05 } : undefined}
                  whileTap={!prefersReducedMotion ? { scale: 0.95 } : undefined}
                >
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    className={cn(
                      "w-8 h-8 transition-all duration-200",
                      isCopied && "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
                    )}
                    title={isCopied ? "Copied!" : "Copy to clipboard"}
                  >
                    <AnimatePresence mode="wait">
                      {isCopied ? (
                        <motion.div
                          key="copied"
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0, rotate: 180 }}
                        >
                          <Check className="w-4 h-4" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="copy"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                        >
                          <Copy className="w-4 h-4" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Button>
                </motion.div>

                {/* Export menu - Icon only */}
                <div className="relative" data-dropdown="true">
                  <motion.div
                    whileHover={!prefersReducedMotion ? { scale: 1.05 } : undefined}
                    whileTap={!prefersReducedMotion ? { scale: 0.95 } : undefined}
                  >
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      className="w-8 h-8"
                      title="Export options"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </motion.div>

                  <AnimatePresence>
                    {showExportMenu && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -5 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="absolute right-0 top-full mt-2 w-48 bg-popover border border-border rounded-lg shadow-xl z-[500] overflow-hidden" data-dropdown="true"
                        onMouseEnter={(e) => e.stopPropagation()}
                        onMouseMove={(e) => e.stopPropagation()}
                      >
                        <div className="p-1">
                          <motion.button
                            whileHover={{ backgroundColor: 'hsl(var(--accent))' }}
                            onClick={(e) => {
                              e.stopPropagation()
                              e.preventDefault()
                              handleDownloadPDF()
                              setShowExportMenu(false)
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md transition-colors hover:bg-accent"
                          >
                            <FileText className="w-3 h-3 text-red-500" />
                            Download as PDF
                          </motion.button>
                          <motion.button
                            whileHover={{ backgroundColor: 'hsl(var(--accent))' }}
                            onClick={(e) => {
                              e.stopPropagation()
                              e.preventDefault()
                              handleDownloadDOCX()
                              setShowExportMenu(false)
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md transition-colors hover:bg-accent"
                          >
                            <FileText className="w-3 h-3 text-blue-500" />
                            Download as DOCX
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Close button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeCanvas}
                  className="w-7 h-7 rounded-lg hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>


            {/* Canvas Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-none p-4 pb-8">
                {/* Type-specific header */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "p-3 rounded-lg border mb-4 backdrop-blur-sm text-center",
                    STUDY_TOOLS[canvasContent.type].color,
                    STUDY_TOOLS[canvasContent.type].borderColor
                  )}
                >
                  <p className={cn("text-xs font-medium m-0", STUDY_TOOLS[canvasContent.type].textColor)}>
                    {canvasContent.type === 'smart-notes' && '📝 Organized notes with highlights and key insights'}
                    {canvasContent.type === 'smart-summary' && '⚡ Concise overview with essential takeaways'}
                    {canvasContent.type === 'study-guide' && '📖 Comprehensive study guide with structured learning path'}
                    {canvasContent.type === 'flashcards' && '📚 Interactive flashcards - Click to reveal answers'}
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="prose prose-sm max-w-none dark:prose-invert"
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-xl font-bold text-foreground border-b-2 border-primary/20 pb-3 mb-4 mt-8 first:mt-0 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-lg font-semibold text-foreground mb-3 mt-6 first:mt-0 flex items-center gap-2">
                          <span className="w-1 h-6 bg-primary rounded-full"></span>
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-base font-semibold text-foreground mb-2 mt-4 pl-3 border-l-2 border-primary/30">
                          {children}
                        </h3>
                      ),
                      h4: ({ children }) => (
                        <h4 className="text-sm font-medium text-foreground mb-2 mt-3 text-primary">
                          {children}
                        </h4>
                      ),
                      ul: ({ children }) => (
                        <ul className="space-y-2 mb-4 pl-4">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="space-y-2 mb-4 pl-4 list-decimal">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="text-sm text-foreground leading-relaxed flex items-start gap-2">
                          <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                          <span>{children}</span>
                        </li>
                      ),
                      p: ({ children }) => (
                        <p className="mb-4 text-sm text-foreground leading-relaxed last:mb-0">
                          {children}
                        </p>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-primary pl-4 italic bg-primary/5 py-3 my-4 rounded-r-lg">
                          <div className="text-sm text-muted-foreground">
                            {children}
                          </div>
                        </blockquote>
                      ),
                      code: ({ children, inline }: any) => {
                        if (inline) {
                          return (
                            <code className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-xs font-mono border border-primary/20">
                              {children}
                            </code>
                          )
                        }
                        return <code className="font-mono text-xs">{children}</code>
                      },
                      pre: ({ children }) => (
                        <pre className="bg-muted/50 p-4 rounded-lg overflow-x-auto mb-4 text-xs border border-border shadow-inner">
                          {children}
                        </pre>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold text-primary">
                          {children}
                        </strong>
                      ),
                      em: ({ children }) => (
                        <em className="italic text-primary/80 font-medium">
                          {children}
                        </em>
                      ),
                      hr: () => (
                        <hr className="my-6 border-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                      ),
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-4">
                          <table className="min-w-full border-collapse border border-border rounded-lg overflow-hidden">
                            {children}
                          </table>
                        </div>
                      ),
                      th: ({ children }) => (
                        <th className="border border-border bg-muted/50 px-3 py-2 text-left font-semibold text-xs">
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td className="border border-border px-3 py-2 text-xs">
                          {children}
                        </td>
                      )
                    }}
                  >
                    {cleanAIIntroduction(canvasContent.content)}
                  </ReactMarkdown>
                </motion.div>
              </div>
            </div>
          </motion.div>
        ) : isViewerOpen && currentFlashcardSet && !isFullscreen ? (
          <motion.div
            key="flashcards"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.05 } }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            className="flex-1 flex flex-col min-h-0"
          >
            <FlashcardViewer
              flashcards={currentFlashcardSet.cards}
              title={currentFlashcardSet.title}
              onClose={closeViewer}
              isFullscreen={false}
              onToggleFullscreen={toggleFullscreen}
              className="h-full"
            />
          </motion.div>
        ) : (
          <motion.div
            key="tools"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.05 } }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            className="flex-1 p-4 space-y-3 overflow-y-auto"
          >
            <p className="text-sm text-muted-foreground mb-4">
              Generate AI-powered study materials from your documents and conversations.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {Object.entries(STUDY_TOOLS).map(([type, tool]) => (
                <StudyToolCard
                  key={type}
                  type={type as StudyToolType}
                  onClick={() => onGenerateStudyTool(type as StudyToolType)}
                  isGenerating={isGenerating}
                  isCurrentlyGenerating={generatingType === type}
                  hasContext={hasContext}
                />
              ))}
            </div>

            {/* Divider */}
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.2, ...smoothTransition }}
              className="mt-6 mb-4"
            >
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            </motion.div>

            {/* Generated Documents Section */}
            <GeneratedDocumentsSection />

            {/* Flashcard Sets Section */}
            <FlashcardSetsSection />

            {/* Context tip */}
            {!hasContext && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, ...smoothTransition }}
                className="mt-4 p-3 rounded-lg border bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
              >
                <div className="flex items-start gap-2">
                  <span className="text-amber-600 dark:text-amber-400">💡</span>
                  <p className="text-xs text-muted-foreground">
                    <strong>Tip:</strong>{' '}
                    Upload a document or start a conversation to unlock study tools.
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Flashcard Sets Section Component
const FlashcardSetsSection: React.FC = () => {
  const { flashcardSets, openViewer, removeFlashcardSet, renameFlashcardSet } = useFlashcardStore()
  const prefersReducedMotion = useReducedMotion()
  const [activeDropdown, setActiveDropdown] = React.useState<string | null>(null)
  const [editingTitle, setEditingTitle] = React.useState<string | null>(null)
  const [editingValue, setEditingValue] = React.useState('')

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (activeDropdown && !target.closest('[data-flashcard-dropdown="true"]')) {
        setActiveDropdown(null)
      }
    }
    if (activeDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [activeDropdown])

  const handleStartRename = (flashcardSet: any) => {
    setEditingTitle(flashcardSet.id)
    setEditingValue(flashcardSet.title)
  }

  const handleSaveRename = async (flashcardSetId: string) => {
    if (editingValue.trim() && editingValue !== flashcardSets.find(f => f.id === flashcardSetId)?.title) {
      try {
        await renameFlashcardSet(flashcardSetId, editingValue.trim())
      } catch (error) {
        console.error('Failed to rename flashcard set:', error)
        // The UI feedback was already applied, so we don't need to do anything here
      }
    }
    setEditingTitle(null)
    setEditingValue('')
  }

  // handleCopyFlashcards function removed as per user request

  const handleDelete = async (flashcardSetId: string) => {
    try {
      await removeFlashcardSet(flashcardSetId)
    } catch (error) {
      console.error('Failed to delete flashcard set:', error)
      // Note: Error is logged but UI continues to work. The rollback in the store
      // will restore the item if database deletion failed.
    }
  }

  // Flashcard Dropdown Menu Component
  const FlashcardDropdownMenu: React.FC<{ flashcardSet: any }> = ({ flashcardSet }) => {
    const isOpen = activeDropdown === flashcardSet.id

    return (
      <div className="relative">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation()
            setActiveDropdown(isOpen ? null : flashcardSet.id)
          }}
          className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-accent transition-colors pointer-events-auto relative z-10"
          data-flashcard-dropdown="true"
        >
          <MoreVertical className="w-3 h-3 text-muted-foreground" />
        </motion.button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -5 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute right-0 top-full mt-1 w-36 bg-popover border border-border rounded-lg shadow-xl z-[500] overflow-hidden"
              data-flashcard-dropdown="true"
              onMouseEnter={(e) => e.stopPropagation()}
              onMouseMove={(e) => e.stopPropagation()}
            >
              <div className="p-1">
                <motion.button
                  whileHover={{ backgroundColor: 'hsl(var(--accent))' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    handleStartRename(flashcardSet)
                    setActiveDropdown(null)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left hover:bg-accent"
                >
                  <Edit3 className="w-4 h-4" />
                  Rename
                </motion.button>
                {/* Copy button removed as per user request */}
                <div className="h-px bg-border my-1" />
                <motion.button
                  whileHover={{ backgroundColor: 'hsl(var(--destructive) / 0.1)' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    handleDelete(flashcardSet.id)
                    setActiveDropdown(null)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  if (flashcardSets.length === 0) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, ...smoothTransition }}
      className="space-y-2 mt-6 relative"
    >
      <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
        <FlashcardsStackIcon size={18} className="text-brand-teal-600" />
        Generated flashcards ({flashcardSets.length})
      </h3>

      {/* Backdrop overlay when dropdown is open */}
      <AnimatePresence>
        {activeDropdown && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0 }}
            className="absolute inset-0 bg-transparent z-[400] cursor-default"
            onClick={() => setActiveDropdown(null)}
            onMouseMove={(e) => e.stopPropagation()}
            onMouseEnter={(e) => e.stopPropagation()}
          />
        )}
      </AnimatePresence>

      <motion.div
        className="space-y-2 relative"
        variants={{
          hidden: {},
          visible: {
            transition: {
              staggerChildren: 0.05
            }
          }
        }}
        initial="hidden"
        animate="visible"
      >
        {flashcardSets.map((flashcardSet, index) => {
          const isGenerating = flashcardSet.metadata?.isGenerating || false
          const generationProgress = flashcardSet.metadata?.generationProgress || 0

          return (
            <motion.div
              key={flashcardSet.id}
              variants={{
                hidden: { opacity: 0, x: -10, scale: 0.95 },
                visible: {
                  opacity: 1,
                  x: 0,
                  scale: 1,
                  transition: {
                    type: 'spring',
                    stiffness: 400,
                    damping: 25,
                    delay: index * 0.05
                  }
                }
              }}
              whileHover={!prefersReducedMotion && !isGenerating && !activeDropdown ? {
                y: -1,
                scale: 1.01,
                transition: { duration: 0.15 }
              } : undefined}
              whileTap={!prefersReducedMotion && !isGenerating && !activeDropdown ? {
                scale: 0.98,
                transition: { duration: 0.08 }
              } : undefined}
              className={cn(
                "group p-3 rounded-lg border transition-all duration-200",
                isGenerating
                  ? "bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800"
                  : "cursor-pointer hover:shadow-md hover:shadow-black/5 bg-background/50 hover:bg-background/80 border-green-200 dark:border-green-800"
              )}
              onClick={() => !isGenerating && openViewer(flashcardSet)}
            >
              <div className="flex items-start gap-3">
                {/* Flashcard icon */}
                <motion.div
                  className={cn(
                    "p-1.5 rounded-lg flex-shrink-0",
                    isGenerating
                      ? "bg-blue-50 dark:bg-blue-900/20"
                      : "bg-green-50 dark:bg-green-900/20"
                  )}
                  whileHover={!prefersReducedMotion && !isGenerating ? { scale: 1.05, rotate: 1 } : undefined}
                  animate={isGenerating ? { rotate: [0, 360] } : undefined}
                  transition={isGenerating ? { duration: 2, repeat: Infinity, ease: "linear" } : { duration: 0.2 }}
                >
                  {isGenerating ? (
                    <Loader2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <FlashcardsStackIcon size={16} className="text-green-700 dark:text-green-300" strokeWidth={1.4} />
                  )}
                </motion.div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    {editingTitle === flashcardSet.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => handleSaveRename(flashcardSet.id)}
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter') await handleSaveRename(flashcardSet.id)
                            if (e.key === 'Escape') {
                              setEditingTitle(null)
                              setEditingValue('')
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                          className="flex-1 text-sm font-medium bg-background border border-border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-teal-500/50"
                        />
                      </div>
                    ) : (
                      <h4 className="font-medium text-sm truncate flex-1">
                        {flashcardSet.title}
                      </h4>
                    )}

                    <div className="flex items-center gap-1">
                      <motion.div
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        whileHover={{ scale: 1.1 }}
                      >
                        <ExternalLink className="w-3 h-3 text-muted-foreground" />
                      </motion.div>
                      <FlashcardDropdownMenu flashcardSet={flashcardSet} />
                    </div>
                  </div>

                  {/* Flashcard info */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {isGenerating ? (
                      <>
                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                          {flashcardSet.title.includes(':') ? flashcardSet.title.split(':')[1].trim() : 'Generating...'}
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 dark:bg-blue-400 transition-all duration-300 rounded-full"
                              style={{ width: `${generationProgress}%` }}
                            />
                          </div>
                          <span className="text-xs">{Math.round(generationProgress)}%</span>
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(flashcardSet.createdAt).toLocaleDateString()} at {new Date(flashcardSet.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                        </span>
                        <span>{flashcardSet.cards.length} cards</span>
                        <span className="capitalize">
                          {(() => {
                            // Debug logging for difficulty detection
                            if (process.env.NODE_ENV === 'development') {
                              console.log(`[FlashcardDisplay] Difficulty debug for ${flashcardSet.id}:`, {
                                'options.difficulty': flashcardSet.options?.difficulty,
                                'metadata.avgDifficulty': flashcardSet.metadata?.avgDifficulty,
                                'full options': flashcardSet.options,
                                'full metadata': flashcardSet.metadata
                              })
                            }
                            return flashcardSet.options?.difficulty || flashcardSet.metadata?.avgDifficulty || 'medium'
                          })()}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </motion.div>
    </motion.div>
  )
}

interface SelectedDocument {
  id: string
  title: string
  size?: number
  processing_status?: string
}

export const StudyToolsPanel: React.FC<{
  documentId?: string
  conversationId?: string
  selectedDocuments: SelectedDocument[]
  primaryDocument: SelectedDocument | null
  hasMessages: boolean
}> = React.memo(({ documentId, conversationId, selectedDocuments, primaryDocument, hasMessages }) => {
  const {
    isPanelExpanded,
    isGenerating,
    generatingType,
    expandPanel,
    collapsePanel,
    generateStudyTool,
    loadStudyToolsFromDatabase
  } = useStudyToolsStore()

  const hasDocumentSelected = Boolean(documentId || selectedDocuments.length > 0 || primaryDocument)
  const hasContext = Boolean(documentId || conversationId)

  // Confirmation dialog state
  const [confirmationDialog, setConfirmationDialog] = React.useState<{
    isOpen: boolean
    studyToolType: StudyToolType | null
  }>({
    isOpen: false,
    studyToolType: null
  })

  // Flashcard customization dialog state
  const [flashcardDialog, setFlashcardDialog] = React.useState({
    isOpen: false
  })

  // Flashcard store
  const { isViewerOpen, currentFlashcardSet, isFullscreen, closeViewer, toggleFullscreen } = useFlashcardStore()

  // Load study tools from database on mount and when context changes
  React.useEffect(() => {
    if (hasContext) {
      loadStudyToolsFromDatabase(documentId, conversationId)
    }
  }, [documentId, conversationId, hasContext, loadStudyToolsFromDatabase])

  const handleGenerateStudyTool = React.useCallback((type: StudyToolType) => {
    if (isGenerating) return

    // Special handling for flashcards - always show customization dialog
    if (type === 'flashcards') {
      // Check if we have context first
      if (!hasContext) {
        setConfirmationDialog({
          isOpen: true,
          studyToolType: type
        })
        return
      }

      // Open flashcard customization dialog
      setFlashcardDialog({ isOpen: true })
      return
    }

    // Regular study tools handling
    // Priority 1: If we have a document selected, generate from document
    if (hasDocumentSelected) {
      generateStudyTool(type, documentId, conversationId)
      return
    }

    // Priority 2: If no document but has conversation, show confirmation dialog
    if (hasMessages && conversationId) {
      setConfirmationDialog({
        isOpen: true,
        studyToolType: type
      })
      return
    }

    // Priority 3: No document and no conversation - show dialog asking to select document
    setConfirmationDialog({
      isOpen: true,
      studyToolType: type
    })
  }, [isGenerating, generateStudyTool, documentId, conversationId, hasDocumentSelected, hasMessages, hasContext])

  const handleConfirmConversationGeneration = React.useCallback(() => {
    if (confirmationDialog.studyToolType) {
      generateStudyTool(confirmationDialog.studyToolType, undefined, conversationId)
    }
    setConfirmationDialog({ isOpen: false, studyToolType: null })
  }, [generateStudyTool, conversationId, confirmationDialog.studyToolType])

  const handleSelectDocument = React.useCallback(() => {
    // Close dialog and focus on document selection
    setConfirmationDialog({ isOpen: false, studyToolType: null })

    // TODO: Trigger document selection UI or navigate to documents panel
    console.log('User requested to select a document')

    // For now, we could expand a documents panel or show a file picker
    // This would be integrated with the existing document management system
  }, [])

  const handleCloseConfirmationDialog = React.useCallback(() => {
    setConfirmationDialog({ isOpen: false, studyToolType: null })
  }, [])

  const handleFlashcardGenerate = React.useCallback((options: FlashcardOptions) => {
    setFlashcardDialog({ isOpen: false })
    generateStudyTool('flashcards', documentId, conversationId, options)
  }, [generateStudyTool, documentId, conversationId])

  const handleCloseFlashcardDialog = React.useCallback(() => {
    setFlashcardDialog({ isOpen: false })
  }, [])

  return (
    <>
      <AnimatePresence>
        {isPanelExpanded ? (
          <ExpandedPanel
            key="expanded"
            onCollapse={collapsePanel}
            onGenerateStudyTool={handleGenerateStudyTool}
            isGenerating={isGenerating}
            generatingType={generatingType}
            hasContext={hasContext}
          />
        ) : (
          <CollapsedPanel
            key="collapsed"
            onExpand={expandPanel}
          />
        )}
      </AnimatePresence>

      {/* Confirmation Dialog */}
      {confirmationDialog.studyToolType && (
        <StudyToolsConfirmationDialog
          isOpen={confirmationDialog.isOpen}
          onClose={handleCloseConfirmationDialog}
          onConfirm={handleConfirmConversationGeneration}
          onSelectDocument={handleSelectDocument}
          studyToolType={confirmationDialog.studyToolType}
          hasMessages={hasMessages}
        />
      )}

      {/* Flashcard Customization Dialog */}
      <FlashcardCustomizationDialog
        isOpen={flashcardDialog.isOpen}
        onClose={handleCloseFlashcardDialog}
        onGenerate={handleFlashcardGenerate}
        isGenerating={isGenerating && generatingType === 'flashcards'}
      />

      {/* Fullscreen Flashcard Viewer - This should be rendered at app level, not here */}
      {/* Removed fullscreen flashcard viewer - it should be handled at a higher level to respect sidebar layout */}

    </>
  )
})

StudyToolsPanel.displayName = 'StudyToolsPanel'
