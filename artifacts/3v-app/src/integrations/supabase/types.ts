export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          category: string
          created_at: string
          date: string
          description: string
          end_date: string | null
          end_time: string | null
          id: string
          image_url: string | null
          is_published: boolean | null
          location: string
          max_participants: number
          price: string | null
          start_date: string | null
          start_time: string | null
          time: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          date: string
          description: string
          end_date?: string | null
          end_time?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          location: string
          max_participants?: number
          price?: string | null
          start_date?: string | null
          start_time?: string | null
          time: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          date?: string
          description?: string
          end_date?: string | null
          end_time?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          location?: string
          max_participants?: number
          price?: string | null
          start_date?: string | null
          start_time?: string | null
          time?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      activity_registrations: {
        Row: {
          activity_name: string
          created_at: string
          id: string
          phone_country_code: string
          phone_number: string
          user_id: string
        }
        Insert: {
          activity_name: string
          created_at?: string
          id?: string
          phone_country_code: string
          phone_number: string
          user_id: string
        }
        Update: {
          activity_name?: string
          created_at?: string
          id?: string
          phone_country_code?: string
          phone_number?: string
          user_id?: string
        }
        Relationships: []
      }
      activity_reports: {
        Row: {
          content: Json | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          is_published: boolean | null
          linked_activities: string[] | null
          linked_galleries: string[] | null
          linked_spiritual_practices: string[] | null
          pdf_url: string | null
          period_end: string | null
          period_start: string | null
          report_date: string
          sort_order: number | null
          summary: string | null
          title: string
          translations: Json | null
          updated_at: string
        }
        Insert: {
          content?: Json | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean | null
          linked_activities?: string[] | null
          linked_galleries?: string[] | null
          linked_spiritual_practices?: string[] | null
          pdf_url?: string | null
          period_end?: string | null
          period_start?: string | null
          report_date?: string
          sort_order?: number | null
          summary?: string | null
          title: string
          translations?: Json | null
          updated_at?: string
        }
        Update: {
          content?: Json | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean | null
          linked_activities?: string[] | null
          linked_galleries?: string[] | null
          linked_spiritual_practices?: string[] | null
          pdf_url?: string | null
          period_end?: string | null
          period_start?: string | null
          report_date?: string
          sort_order?: number | null
          summary?: string | null
          title?: string
          translations?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          created_at: string | null
          id: string
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      biblical_readings: {
        Row: {
          books: string
          chapters: string
          chapters_count: number
          comment: string | null
          created_at: string | null
          date: string
          day_number: number
          id: string
          month: number
          type: string
          year: number
        }
        Insert: {
          books: string
          chapters: string
          chapters_count: number
          comment?: string | null
          created_at?: string | null
          date: string
          day_number: number
          id?: string
          month: number
          type: string
          year: number
        }
        Update: {
          books?: string
          chapters?: string
          chapters_count?: number
          comment?: string | null
          created_at?: string | null
          date?: string
          day_number?: number
          id?: string
          month?: number
          type?: string
          year?: number
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          subject: string
          type: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          subject: string
          type: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          subject?: string
          type?: string
        }
        Relationships: []
      }
      donations: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          donor_email: string | null
          donor_name: string | null
          id: string
          message: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string | null
          donor_email?: string | null
          donor_name?: string | null
          id?: string
          message?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          donor_email?: string | null
          donor_name?: string | null
          id?: string
          message?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      faq_items: {
        Row: {
          answer: string
          category: string | null
          created_at: string
          id: string
          is_published: boolean | null
          question: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string
          id?: string
          is_published?: boolean | null
          question: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string
          id?: string
          is_published?: boolean | null
          question?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      fcm_tokens: {
        Row: {
          created_at: string
          device_info: string | null
          id: string
          language: string | null
          platform: string | null
          timezone: string | null
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: string | null
          id?: string
          language?: string | null
          platform?: string | null
          timezone?: string | null
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: string | null
          id?: string
          language?: string | null
          platform?: string | null
          timezone?: string | null
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gallery_images: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          group_name: string | null
          id: string
          image_url: string
          is_published: boolean | null
          sort_order: number | null
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          group_name?: string | null
          id?: string
          image_url: string
          is_published?: boolean | null
          sort_order?: number | null
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          group_name?: string | null
          id?: string
          image_url?: string
          is_published?: boolean | null
          sort_order?: number | null
          title?: string
        }
        Relationships: []
      }
      neuvaines: {
        Row: {
          common_prayers: Json | null
          conclusion: Json | null
          created_at: string | null
          days: Json | null
          description: string | null
          id: string
          image_url: string | null
          introduction: string | null
          is_published: boolean | null
          pdf_url: string | null
          saint_name: string
          title: string
          total_days: number | null
          translations: Json | null
          updated_at: string | null
        }
        Insert: {
          common_prayers?: Json | null
          conclusion?: Json | null
          created_at?: string | null
          days?: Json | null
          description?: string | null
          id?: string
          image_url?: string | null
          introduction?: string | null
          is_published?: boolean | null
          pdf_url?: string | null
          saint_name: string
          title: string
          total_days?: number | null
          translations?: Json | null
          updated_at?: string | null
        }
        Update: {
          common_prayers?: Json | null
          conclusion?: Json | null
          created_at?: string | null
          days?: Json | null
          description?: string | null
          id?: string
          image_url?: string | null
          introduction?: string | null
          is_published?: boolean | null
          pdf_url?: string | null
          saint_name?: string
          title?: string
          total_days?: number | null
          translations?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      page_content: {
        Row: {
          content: Json | null
          created_at: string | null
          id: string
          page_key: string
          subtitle: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          content?: Json | null
          created_at?: string | null
          id?: string
          page_key: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: Json | null
          created_at?: string | null
          id?: string
          page_key?: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      prayer_requests: {
        Row: {
          content: string
          created_at: string
          id: string
          is_anonymous: boolean | null
          prayer_count: number | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_anonymous?: boolean | null
          prayer_count?: number | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_anonymous?: boolean | null
          prayer_count?: number | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      prayer_responses: {
        Row: {
          content: string
          created_at: string
          id: string
          prayer_request_id: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          prayer_request_id: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          prayer_request_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prayer_responses_prayer_request_id_fkey"
            columns: ["prayer_request_id"]
            isOneToOne: false
            referencedRelation: "prayer_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          phone_country_code: string | null
          phone_number: string | null
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          phone_country_code?: string | null
          phone_number?: string | null
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          phone_country_code?: string | null
          phone_number?: string | null
        }
        Relationships: []
      }
      quizzes: {
        Row: {
          correct_answer: string | null
          created_at: string
          difficulty: string
          id: string
          options: Json | null
          question: string
          question_type: string
          reading_id: string | null
        }
        Insert: {
          correct_answer?: string | null
          created_at?: string
          difficulty: string
          id?: string
          options?: Json | null
          question: string
          question_type: string
          reading_id?: string | null
        }
        Update: {
          correct_answer?: string | null
          created_at?: string
          difficulty?: string
          id?: string
          options?: Json | null
          question?: string
          question_type?: string
          reading_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_reading_id_fkey"
            columns: ["reading_id"]
            isOneToOne: false
            referencedRelation: "biblical_readings"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_sessions: {
        Row: {
          access_password: string | null
          access_type: string
          agenda: Json | null
          created_at: string
          created_by: string
          description: string | null
          estimated_duration: number | null
          id: string
          platforms: Json | null
          recording_url: string | null
          recurrence: string | null
          scheduled_date: string
          scheduled_time: string
          session_type: string
          share_link: string | null
          status: string
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_room_id: string | null
          viewer_count: number | null
        }
        Insert: {
          access_password?: string | null
          access_type?: string
          agenda?: Json | null
          created_at?: string
          created_by: string
          description?: string | null
          estimated_duration?: number | null
          id?: string
          platforms?: Json | null
          recording_url?: string | null
          recurrence?: string | null
          scheduled_date: string
          scheduled_time: string
          session_type?: string
          share_link?: string | null
          status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_room_id?: string | null
          viewer_count?: number | null
        }
        Update: {
          access_password?: string | null
          access_type?: string
          agenda?: Json | null
          created_at?: string
          created_by?: string
          description?: string | null
          estimated_duration?: number | null
          id?: string
          platforms?: Json | null
          recording_url?: string | null
          recurrence?: string | null
          scheduled_date?: string
          scheduled_time?: string
          session_type?: string
          share_link?: string | null
          status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_room_id?: string | null
          viewer_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_sessions_video_room_id_fkey"
            columns: ["video_room_id"]
            isOneToOne: false
            referencedRelation: "video_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      session_reminders: {
        Row: {
          created_at: string
          id: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_reminders_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "scheduled_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      streaming_settings: {
        Row: {
          created_at: string
          facebook_stream_key: string | null
          id: string
          tiktok_rtmp_url: string | null
          tiktok_stream_key: string | null
          updated_at: string
          whatsapp_broadcast_link: string | null
          youtube_stream_key: string | null
        }
        Insert: {
          created_at?: string
          facebook_stream_key?: string | null
          id?: string
          tiktok_rtmp_url?: string | null
          tiktok_stream_key?: string | null
          updated_at?: string
          whatsapp_broadcast_link?: string | null
          youtube_stream_key?: string | null
        }
        Update: {
          created_at?: string
          facebook_stream_key?: string | null
          id?: string
          tiktok_rtmp_url?: string | null
          tiktok_stream_key?: string | null
          updated_at?: string
          whatsapp_broadcast_link?: string | null
          youtube_stream_key?: string | null
        }
        Relationships: []
      }
      user_quiz_responses: {
        Row: {
          answer: string
          created_at: string
          id: string
          is_correct: boolean | null
          quiz_id: string
          user_id: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          quiz_id: string
          user_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          quiz_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_quiz_responses_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_reading_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          id: string
          reading_id: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          reading_id: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          reading_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_reading_progress_reading_id_fkey"
            columns: ["reading_id"]
            isOneToOne: false
            referencedRelation: "biblical_readings"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_notifications: {
        Row: {
          id: string
          title: string
          body: string | null
          icon: string | null
          type: string | null
          target_role: string | null
          created_by: string
          scheduled_at: string | null
          sent_at: string | null
          is_sent: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          body?: string | null
          icon?: string | null
          type?: string | null
          target_role?: string | null
          created_by: string
          scheduled_at?: string | null
          sent_at?: string | null
          is_sent?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          body?: string | null
          icon?: string | null
          type?: string | null
          target_role?: string | null
          created_by?: string
          scheduled_at?: string | null
          sent_at?: string | null
          is_sent?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          id: string
          user_id: string
          broadcast_notification_id: string | null
          title: string
          body: string | null
          icon: string | null
          type: string | null
          message: string
          data: Record<string, unknown> | null
          link: string | null
          viewed_at: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          broadcast_notification_id?: string | null
          title: string
          body?: string | null
          icon?: string | null
          type?: string | null
          message?: string
          data?: Record<string, unknown> | null
          link?: string | null
          viewed_at?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          broadcast_notification_id?: string | null
          title?: string
          body?: string | null
          icon?: string | null
          type?: string | null
          message?: string
          data?: Record<string, unknown> | null
          link?: string | null
          viewed_at?: string | null
          is_read?: boolean
          created_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          room_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          room_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "video_room_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_message_reactions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "video_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      video_room_messages: {
        Row: {
          content: string
          created_at: string
          display_name: string | null
          id: string
          room_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          display_name?: string | null
          id?: string
          room_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          display_name?: string | null
          id?: string
          room_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_room_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "video_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      video_room_participants: {
        Row: {
          display_name: string | null
          id: string
          is_active: boolean
          joined_at: string
          left_at: string | null
          room_id: string
          user_id: string
        }
        Insert: {
          display_name?: string | null
          id?: string
          is_active?: boolean
          joined_at?: string
          left_at?: string | null
          room_id: string
          user_id: string
        }
        Update: {
          display_name?: string | null
          id?: string
          is_active?: boolean
          joined_at?: string
          left_at?: string | null
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_room_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "video_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      video_room_signals: {
        Row: {
          created_at: string
          id: string
          payload: Json
          recipient_id: string | null
          room_id: string
          sender_id: string
          signal_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          recipient_id?: string | null
          room_id: string
          sender_id: string
          signal_type: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          recipient_id?: string | null
          room_id?: string
          sender_id?: string
          signal_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_room_signals_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "video_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      video_rooms: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          ended_at: string | null
          id: string
          room_type: string
          started_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          ended_at?: string | null
          id?: string
          room_type?: string
          started_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          ended_at?: string | null
          id?: string
          room_type?: string
          started_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      fix_superadmin_role: {
        Args: never
        Returns: {
          new_role: Database["public"]["Enums"]["app_role"]
          old_role: Database["public"]["Enums"]["app_role"]
          success: boolean
          user_id: string
        }[]
      }
      get_current_user_roles: {
        Args: never
        Returns: {
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }[]
      }
      get_user_admin_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      hard_delete_auth_user: { Args: { target_user_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_admin_simple: { Args: { _user_id: string }; Returns: boolean }
      update_page_content_data: {
        Args: { p_content: Json; p_page_key: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin_principal" | "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin_principal", "admin", "moderator", "user"],
    },
  },
} as const
