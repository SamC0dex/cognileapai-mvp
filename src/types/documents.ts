import type { Database } from '@/lib/supabase'

export type DocumentRecord = Database['public']['Tables']['documents']['Row']

export interface DocumentUploadedDetail {
  document: DocumentRecord
  alreadyExists?: boolean
}
