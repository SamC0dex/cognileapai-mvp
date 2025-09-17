import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

export type Database = {
  public: {
    Tables: {
      documents: {
        Row: {
          id: string
          title: string
          page_count: number
          bytes: number
          storage_path: string | null
          checksum: string | null
          processing_status: string
          chunk_count: number
          error_message: string | null
          document_content: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          page_count?: number
          bytes?: number
          storage_path?: string | null
          checksum?: string | null
          processing_status?: string
          chunk_count?: number
          error_message?: string | null
          document_content?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          page_count?: number
          bytes?: number
          storage_path?: string | null
          checksum?: string | null
          processing_status?: string
          chunk_count?: number
          error_message?: string | null
          document_content?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sections: {
        Row: {
          id: string
          document_id: string
          ord: number
          title: string
          page_start: number
          page_end: number
          parent_id: string | null
          status: string
        }
        Insert: {
          id?: string
          document_id: string
          ord: number
          title: string
          page_start?: number
          page_end?: number
          parent_id?: string | null
          status?: string
        }
        Update: {
          id?: string
          document_id?: string
          ord?: number
          title?: string
          page_start?: number
          page_end?: number
          parent_id?: string | null
          status?: string
        }
      }
      outputs: {
        Row: {
          id: string
          document_id: string
          section_id: string | null
          overall: boolean
          type: 'summary' | 'notes' | 'study_guide'
          payload: any
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          section_id?: string | null
          overall?: boolean
          type: 'summary' | 'notes' | 'study_guide'
          payload: any
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          section_id?: string | null
          overall?: boolean
          type?: 'summary' | 'notes' | 'study_guide'
          payload?: any
          created_at?: string
        }
      }
    }
  }
}
