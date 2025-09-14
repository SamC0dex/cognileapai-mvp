'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/skeleton'

// Dynamic import with loading component
const ChatContainer = dynamic(
  () => import('./chat-container').then(mod => ({ default: mod.ChatContainer })),
  {
    loading: () => (
      <div className="relative h-full flex flex-col bg-background">
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-start">
                <div className="flex items-start gap-3 max-w-[85%]">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="w-64 h-4" />
                    <Skeleton className="w-48 h-4" />
                    <Skeleton className="w-32 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    ssr: false
  }
)

export { ChatContainer as DynamicChatContainer }