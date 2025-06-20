// Database type definitions
export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          encrypted_claude_api_key: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          encrypted_claude_api_key?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          encrypted_claude_api_key?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      companies: {
        Row: {
          id: string
          user_id: string
          name: string
          variations: string[]
          website: string | null
          industry: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          variations: string[]
          website?: string | null
          industry?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          variations?: string[]
          website?: string | null
          industry?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      bookmarks: {
        Row: {
          id: string
          user_id: string
          press_release_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          press_release_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          press_release_id?: string
          created_at?: string
        }
      }
      read_status: {
        Row: {
          id: string
          user_id: string
          press_release_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          press_release_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          press_release_id?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Convenience types
export type UserProfile = Database["public"]["Tables"]["user_profiles"]["Row"]
export type Company = Database["public"]["Tables"]["companies"]["Row"]
export type Bookmark = Database["public"]["Tables"]["bookmarks"]["Row"]
export type ReadStatus = Database["public"]["Tables"]["read_status"]["Row"]
