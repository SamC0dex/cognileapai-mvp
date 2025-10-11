'use client'

import React, { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { motion } from 'framer-motion'

interface MarkdownComponents {
  [key: string]: React.ComponentType<any> // eslint-disable-line @typescript-eslint/no-explicit-any
}

interface MemoizedMarkdownProps {
  content: string
  isStreaming?: boolean
  customComponents: MarkdownComponents
}

// Split content into completed blocks and streaming content
const parseContent = (content: string, isStreaming: boolean) => {
  if (!isStreaming) {
    return { completedBlocks: [content], streamingContent: '' }
  }

  // Split by common markdown block separators
  const blockSeparators = /\n\n(?=[\s]*[^\s])|(?<=\n)(?=#{1,6}\s)|(?<=\n)(?=```)|(?<=```\n)(?=[^\n])/g
  const blocks = content.split(blockSeparators)

  if (blocks.length <= 1) {
    return { completedBlocks: [], streamingContent: content }
  }

  // Keep the last block as streaming, rest as completed
  const completedBlocks = blocks.slice(0, -1)
  const streamingContent = blocks[blocks.length - 1]

  return { completedBlocks, streamingContent }
}

// Memoized block component - only re-renders when content changes
const MarkdownBlock = React.memo<{ content: string; components: MarkdownComponents; index: number }>(
  ({ content, components, index }) => (
    <ReactMarkdown
      key={`block-${index}`}
      remarkPlugins={[remarkGfm]}
      components={components}
      // Security: disallow raw HTML and restrict to safe tags
      skipHtml
      allowedElements={SAFE_ELEMENTS}
    >
      {content}
    </ReactMarkdown>
  )
)

MarkdownBlock.displayName = 'MarkdownBlock'

export const MemoizedMarkdown = React.memo<MemoizedMarkdownProps>(
  ({ content, isStreaming = false, customComponents }) => {
    const { completedBlocks, streamingContent } = useMemo(
      () => parseContent(content, isStreaming),
      [content, isStreaming]
    )

    return (
      <div className="chat-prose prose prose-sm max-w-none prose-slate dark:prose-invert prose-headings:font-semibold prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:text-foreground prose-pre:bg-muted prose-pre:text-foreground prose-thead:text-foreground prose-tbody:text-foreground">
        {/* Render memoized completed blocks */}
        {completedBlocks.map((block, index) => (
          <MarkdownBlock
            key={`completed-${index}-${block.slice(0, 50)}`} // Include content hash for cache busting
            content={block}
            components={customComponents}
            index={index}
          />
        ))}

        {/* Render streaming content with animation */}
        {streamingContent && (
          <motion.div
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.1 }}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={customComponents}
              // Security: disallow raw HTML and restrict to safe tags
              skipHtml
              allowedElements={SAFE_ELEMENTS}
            >
              {streamingContent}
            </ReactMarkdown>
          </motion.div>
        )}

        {/* No cursor needed - text flows naturally like ChatGPT */}
      </div>
    )
  }
)

MemoizedMarkdown.displayName = 'MemoizedMarkdown'

// Whitelist of safe markdown elements to mitigate XSS
const SAFE_ELEMENTS = [
  'p', 'strong', 'em', 'del', 'code', 'pre', 'blockquote',
  'ul', 'ol', 'li', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'a'
] as const