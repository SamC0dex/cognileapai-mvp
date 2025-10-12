'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui'
import { AlertTriangle, FileText, MessageSquare, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STUDY_TOOLS, type StudyToolType } from '@/lib/study-tools-store'

interface StudyToolsConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  onSelectDocument: () => void
  studyToolType: StudyToolType
  hasMessages: boolean
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2 }
  }
}

const dialogVariants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: -10
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 30,
      mass: 0.8
    }
  }
}

export const StudyToolsConfirmationDialog: React.FC<StudyToolsConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onSelectDocument,
  studyToolType,
  hasMessages
}) => {
  const studyTool = STUDY_TOOLS[studyToolType]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={onClose}
        >
          <motion.div
            className="bg-background border border-border rounded-xl shadow-2xl max-w-md w-full mx-4"
            variants={dialogVariants}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 pb-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center text-lg",
                  studyTool.color,
                  studyTool.borderColor,
                  "border"
                )}>
                  {studyTool.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Generate {studyTool.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Choose your content source
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="px-6 pb-6">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-foreground">
                    No document selected
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  To generate high-quality study materials, we recommend selecting a document as your primary source.
                  {hasMessages && " Alternatively, you can generate materials based on your current conversation."}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {/* Primary option - Select document */}
                <Button
                  type="button"
                  onClick={onSelectDocument}
                  className="w-full justify-start gap-3 h-auto py-3 px-4"
                  variant="default"
                >
                  <FileText className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-medium">Select a Document</div>
                    <div className="text-xs opacity-90">
                      Choose from your uploaded documents (Recommended)
                    </div>
                  </div>
                </Button>

                {/* Secondary option - Use conversation (only if has messages) */}
                {hasMessages && (
                  <Button
                    type="button"
                    onClick={onConfirm}
                    className="w-full justify-start gap-3 h-auto py-3 px-4"
                    variant="outline"
                  >
                    <MessageSquare className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-medium">Use Current Conversation</div>
                      <div className="text-xs text-muted-foreground">
                        Generate from your chat history instead
                      </div>
                    </div>
                  </Button>
                )}
              </div>

              {!hasMessages && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground text-center">
                    Start by uploading a document or having a conversation to generate study materials.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}