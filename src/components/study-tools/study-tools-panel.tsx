'use client'

import React from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Button } from '@/components/ui'
import { useStudyToolsStore, STUDY_TOOLS, type StudyToolType } from '@/lib/study-tools-store'
import { StudyToolsConfirmationDialog } from './study-tools-confirmation-dialog'
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
  Copy
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
      type: 'spring',
      stiffness: 400,
      damping: 40,
      mass: 0.5,
      duration: 0.3
    }
  },
  expanded: {
    width: '25%',
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 40,
      mass: 0.5,
      duration: 0.3
    }
  }
}

const iconMap = {
  'study-guide': BookOpen,
  'flashcards': FileText,
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
            "p-1.5 rounded-lg transition-colors",
            tool.color,
            !isDisabled && "group-hover:scale-110 transition-transform duration-200"
          )}
          whileHover={!isDisabled ? { scale: 1.1 } : undefined}
        >
          <IconComponent className={cn("w-4 h-4", tool.textColor)} />
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

const GeneratedDocumentsSection: React.FC = React.memo(() => {
  const { generatedContent, openCanvas, removeGeneratedContent, renameGeneratedContent, copyToClipboard } = useStudyToolsStore()
  const prefersReducedMotion = useReducedMotion()
  const [activeDropdown, setActiveDropdown] = React.useState<string | null>(null)
  const [editingTitle, setEditingTitle] = React.useState<string | null>(null)
  const [editingValue, setEditingValue] = React.useState('')

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeDropdown) {
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

  const handleDelete = (id: string) => {
    removeGeneratedContent(id)
    setActiveDropdown(null)
  }

  const handleCopy = async (content: string) => {
    await copyToClipboard(content)
    setActiveDropdown(null)
  }

  const DocumentDropdownMenu = ({ content }: { content: any }) => {
    const isActive = activeDropdown === content.id

    return (
      <div className="relative">
        <motion.button
          className={cn(
            "p-1.5 rounded-md transition-colors duration-200",
            "hover:bg-muted/70 focus:outline-none focus:bg-muted/70",
            "opacity-0 group-hover:opacity-100 transition-opacity",
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
              className="absolute right-0 top-full mt-1 w-48 bg-popover border border-border rounded-lg shadow-xl z-20 overflow-hidden"
            >
              <div className="p-1">
                <motion.button
                  whileHover={{ backgroundColor: 'hsl(var(--accent))' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRename(content)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left"
                >
                  <Edit3 className="w-4 h-4" />
                  Rename
                </motion.button>
                <motion.button
                  whileHover={{ backgroundColor: 'hsl(var(--accent))' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCopy(content.content)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left"
                >
                  <Copy className="w-4 h-4" />
                  Copy Content
                </motion.button>
                <motion.button
                  whileHover={{ backgroundColor: 'hsl(var(--accent))' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    // TODO: Add download functionality
                    setActiveDropdown(null)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left"
                >
                  <Download className="w-4 h-4" />
                  Download
                </motion.button>
                <div className="h-px bg-border my-1" />
                <motion.button
                  whileHover={{ backgroundColor: 'hsl(var(--destructive) / 0.1)' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(content.id)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left text-destructive hover:text-destructive"
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
      className="space-y-2"
    >
      <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
        <FileText className="w-4 h-4" />
        Generated Documents ({generatedContent.length})
      </h3>

      <motion.div
        className="space-y-2"
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
              whileHover={!prefersReducedMotion && !isGenerating ? {
                y: -1,
                scale: 1.01,
                transition: { duration: 0.15 }
              } : undefined}
              whileTap={!prefersReducedMotion && !isGenerating ? {
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
                        <span>Generating with AI...</span>
                      </div>
                      <div className="w-full bg-blue-100 dark:bg-blue-800/30 rounded-full h-1">
                        <motion.div
                          className="h-1 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full"
                          initial={{ width: '0%' }}
                          animate={{ width: `${content.generationProgress || 0}%` }}
                          transition={{ duration: 0.3, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  ) : (
                    /* Completed document info */
                    <>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>
                          {new Date(content.createdAt).toLocaleString()}
                        </span>
                        <span className="text-xs bg-muted/50 px-1.5 py-0.5 rounded">
                          {Math.round(content.content.length / 1000)}k chars
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {content.content.substring(0, 120)}...
                      </p>
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

  return (
    <motion.div
      variants={panelVariants}
      initial="collapsed"
      animate="expanded"
      exit="collapsed"
      className="h-full bg-background/95 backdrop-blur-sm border-r border-border flex flex-col shadow-lg"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
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

      {/* Tools grid */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-sm text-muted-foreground mb-4"
        >
          Generate AI-powered study materials from your documents and conversations.
        </motion.p>

        <motion.div
          className="grid grid-cols-2 gap-3"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: 0.05
              }
            }
          }}
        >
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
        </motion.div>

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
      </div>
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

  // Load study tools from database on mount and when context changes
  React.useEffect(() => {
    if (hasContext) {
      loadStudyToolsFromDatabase(documentId, conversationId)
    }
  }, [documentId, conversationId, hasContext, loadStudyToolsFromDatabase])

  const handleGenerateStudyTool = React.useCallback((type: StudyToolType) => {
    if (isGenerating) return

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
  }, [isGenerating, generateStudyTool, documentId, conversationId, hasDocumentSelected, hasMessages])

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

  return (
    <>
      <AnimatePresence mode="wait">
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
    </>
  )
})

StudyToolsPanel.displayName = 'StudyToolsPanel'