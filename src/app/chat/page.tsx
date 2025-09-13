import { redirect } from 'next/navigation'

interface ChatPageProps {
  searchParams: Promise<{
    type?: 'course' | 'lesson' | 'document'
    documentId?: string
    title?: string
  }>
}

export default async function ChatPage({ searchParams }: ChatPageProps) {
  // Create new chat and redirect to dynamic route
  const params = await searchParams
  const newChatId = crypto.randomUUID() // Use built-in crypto instead of client function

  // Build redirect URL with query params if present
  const redirectUrl = new URL(`/chat/${newChatId}`, 'http://localhost:3000')

  if (params.type) redirectUrl.searchParams.set('type', params.type)
  if (params.documentId) redirectUrl.searchParams.set('documentId', params.documentId)
  if (params.title) redirectUrl.searchParams.set('title', params.title)

  redirect(redirectUrl.pathname + redirectUrl.search)
}