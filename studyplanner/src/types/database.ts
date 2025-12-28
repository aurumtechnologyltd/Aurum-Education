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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      assignments: {
        Row: {
          calendar_event_id: string | null
          course_id: string
          created_at: string | null
          description: string | null
          due_date: string
          grade_points: number | null
          id: string
          last_synced_at: string | null
          points_earned: number | null
          score: number | null
          score_percentage: number | null
          status: string | null
          title: string
          total_score: number | null
          type: string
          weight: number | null
          weight_percentage: number | null
        }
        Insert: {
          calendar_event_id?: string | null
          course_id: string
          created_at?: string | null
          description?: string | null
          due_date: string
          grade_points?: number | null
          id?: string
          last_synced_at?: string | null
          points_earned?: number | null
          score?: number | null
          score_percentage?: number | null
          status?: string | null
          title: string
          total_score?: number | null
          type: string
          weight?: number | null
          weight_percentage?: number | null
        }
        Update: {
          calendar_event_id?: string | null
          course_id?: string
          created_at?: string | null
          description?: string | null
          due_date?: string
          grade_points?: number | null
          id?: string
          last_synced_at?: string | null
          points_earned?: number | null
          score?: number | null
          score_percentage?: number | null
          status?: string | null
          title?: string
          total_score?: number | null
          type?: string
          weight?: number | null
          weight_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_sync_settings: {
        Row: {
          created_at: string | null
          id: string
          last_full_sync_at: string | null
          last_sync_token: string | null
          sync_assessments: boolean | null
          sync_custom_events: boolean | null
          sync_study_sessions: boolean | null
          two_way_sync: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_full_sync_at?: string | null
          last_sync_token?: string | null
          sync_assessments?: boolean | null
          sync_custom_events?: boolean | null
          sync_study_sessions?: boolean | null
          two_way_sync?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_full_sync_at?: string | null
          last_sync_token?: string | null
          sync_assessments?: boolean | null
          sync_custom_events?: boolean | null
          sync_study_sessions?: boolean | null
          two_way_sync?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_sync_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_webhooks: {
        Row: {
          channel_id: string
          created_at: string | null
          expiration: string
          id: string
          resource_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string | null
          expiration: string
          id?: string
          resource_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string | null
          expiration?: string
          id?: string
          resource_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_webhooks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          code: string | null
          color: string | null
          course_gpa_value: number | null
          course_grade_percentage: number | null
          course_letter_grade: string | null
          created_at: string | null
          credits: number | null
          graded_weight_total: number | null
          icon: string | null
          id: string
          instructor: string | null
          is_finished: boolean | null
          name: string
          semester_id: string
          user_id: string
        }
        Insert: {
          code?: string | null
          color?: string | null
          course_gpa_value?: number | null
          course_grade_percentage?: number | null
          course_letter_grade?: string | null
          created_at?: string | null
          credits?: number | null
          graded_weight_total?: number | null
          icon?: string | null
          id?: string
          instructor?: string | null
          is_finished?: boolean | null
          name: string
          semester_id: string
          user_id: string
        }
        Update: {
          code?: string | null
          color?: string | null
          course_gpa_value?: number | null
          course_grade_percentage?: number | null
          course_letter_grade?: string | null
          created_at?: string | null
          credits?: number | null
          graded_weight_total?: number | null
          icon?: string | null
          id?: string
          instructor?: string | null
          is_finished?: boolean | null
          name?: string
          semester_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          related_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          related_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          related_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_events: {
        Row: {
          calendar_event_id: string | null
          color: string | null
          course_id: string | null
          created_at: string | null
          description: string | null
          end_time: string
          event_type: string | null
          id: string
          is_all_day: boolean | null
          last_synced_at: string | null
          location: string | null
          recurrence_rule: string | null
          start_time: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          calendar_event_id?: string | null
          color?: string | null
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          end_time: string
          event_type?: string | null
          id?: string
          is_all_day?: boolean | null
          last_synced_at?: string | null
          location?: string | null
          recurrence_rule?: string | null
          start_time: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          calendar_event_id?: string | null
          color?: string | null
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          end_time?: string
          event_type?: string | null
          id?: string
          is_all_day?: boolean | null
          last_synced_at?: string | null
          location?: string | null
          recurrence_rule?: string | null
          start_time?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      default_reminder_settings: {
        Row: {
          apply_to_assessments: boolean | null
          apply_to_custom_events: boolean | null
          apply_to_study_sessions: boolean | null
          created_at: string | null
          id: string
          reminders: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          apply_to_assessments?: boolean | null
          apply_to_custom_events?: boolean | null
          apply_to_study_sessions?: boolean | null
          created_at?: string | null
          id?: string
          reminders?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          apply_to_assessments?: boolean | null
          apply_to_custom_events?: boolean | null
          apply_to_study_sessions?: boolean | null
          created_at?: string | null
          id?: string
          reminders?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "default_reminder_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_chunks: {
        Row: {
          content: string
          created_at: string | null
          document_id: string
          embedding: string | null
          id: number
          metadata: Json | null
        }
        Insert: {
          content: string
          created_at?: string | null
          document_id: string
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Update: {
          content?: string
          created_at?: string | null
          document_id?: string
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          course_id: string
          created_at: string | null
          document_type: string | null
          file_name: string
          file_path: string
          file_type: string
          id: string
          processed: boolean | null
          resource_description: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          document_type?: string | null
          file_name: string
          file_path: string
          file_type: string
          id?: string
          processed?: boolean | null
          resource_description?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          document_type?: string | null
          file_name?: string
          file_path?: string
          file_type?: string
          id?: string
          processed?: boolean | null
          resource_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      event_reminders: {
        Row: {
          created_at: string | null
          event_id: string
          event_type: string
          id: string
          is_sent: boolean | null
          method: string | null
          reminder_offset_unit: string
          reminder_offset_value: number
          reminder_time: string
          sent_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          event_type: string
          id?: string
          is_sent?: boolean | null
          method?: string | null
          reminder_offset_unit: string
          reminder_offset_value: number
          reminder_time: string
          sent_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          event_type?: string
          id?: string
          is_sent?: boolean | null
          method?: string | null
          reminder_offset_unit?: string
          reminder_offset_value?: number
          reminder_time?: string
          sent_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          assignment_id: string
          created_at: string | null
          date: string
          id: string
          is_completed: boolean | null
          title: string
        }
        Insert: {
          assignment_id: string
          created_at?: string | null
          date: string
          id?: string
          is_completed?: boolean | null
          title: string
        }
        Update: {
          assignment_id?: string
          created_at?: string | null
          date?: string
          id?: string
          is_completed?: boolean | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          event_id: string | null
          event_type: string | null
          id: string
          is_read: boolean | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          event_id?: string | null
          event_type?: string | null
          id?: string
          is_read?: boolean | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          event_id?: string | null
          event_type?: string | null
          id?: string
          is_read?: boolean | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          credit_cap: number
          credit_reset_date: string | null
          current_credits: number
          full_name: string | null
          google_refresh_token: string | null
          id: string
          plan_tier: string
          referral_code: string | null
          referred_by: string | null
          stripe_customer_id: string | null
          theme: string | null
          timezone: string | null
          university: string | null
        }
        Insert: {
          created_at?: string | null
          credit_cap?: number
          credit_reset_date?: string | null
          current_credits?: number
          full_name?: string | null
          google_refresh_token?: string | null
          id: string
          plan_tier?: string
          referral_code?: string | null
          referred_by?: string | null
          stripe_customer_id?: string | null
          theme?: string | null
          timezone?: string | null
          university?: string | null
        }
        Update: {
          created_at?: string | null
          credit_cap?: number
          credit_reset_date?: string | null
          current_credits?: number
          full_name?: string | null
          google_refresh_token?: string | null
          id?: string
          plan_tier?: string
          referral_code?: string | null
          referred_by?: string | null
          stripe_customer_id?: string | null
          theme?: string | null
          timezone?: string | null
          university?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string | null
          id: string
          referee_id: string
          referral_code: string
          referrer_id: string
          status: string
          syllabus_uploaded_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          referee_id: string
          referral_code: string
          referrer_id: string
          status?: string
          syllabus_uploaded_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          referee_id?: string
          referral_code?: string
          referrer_id?: string
          status?: string
          syllabus_uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referee_id_fkey"
            columns: ["referee_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      semesters: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          is_active: boolean | null
          name: string
          start_date: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          name: string
          start_date: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          name?: string
          start_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "semesters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plan_preferences: {
        Row: {
          course_priorities: Json | null
          created_at: string | null
          id: string
          semester_id: string
          session_length_minutes: number
          total_weekly_hours: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          course_priorities?: Json | null
          created_at?: string | null
          id?: string
          semester_id: string
          session_length_minutes?: number
          total_weekly_hours?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          course_priorities?: Json | null
          created_at?: string | null
          id?: string
          semester_id?: string
          session_length_minutes?: number
          total_weekly_hours?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_plan_preferences_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_plan_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plan_weekly_progress: {
        Row: {
          completed_hours: number
          created_at: string | null
          date_range: string
          id: string
          is_completed: boolean | null
          plan_id: string
          planned_hours: number
          updated_at: string | null
          week_number: number
        }
        Insert: {
          completed_hours?: number
          created_at?: string | null
          date_range: string
          id?: string
          is_completed?: boolean | null
          plan_id: string
          planned_hours?: number
          updated_at?: string | null
          week_number: number
        }
        Update: {
          completed_hours?: number
          created_at?: string | null
          date_range?: string
          id?: string
          is_completed?: boolean | null
          plan_id?: string
          planned_hours?: number
          updated_at?: string | null
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "study_plan_weekly_progress_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "study_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plans: {
        Row: {
          created_at: string | null
          id: string
          plan_json: Json
          semester_id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          plan_json: Json
          semester_id: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          plan_json?: Json
          semester_id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_plans_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          activity_type: string
          actual_duration_minutes: number | null
          calendar_event_id: string | null
          course_id: string
          created_at: string | null
          day: string
          description: string | null
          duration_minutes: number
          icon: string | null
          id: string
          is_completed: boolean | null
          last_synced_at: string | null
          notes: string | null
          plan_id: string
          rating: number | null
          resources: Json | null
          start_time: string
          title: string
          updated_at: string | null
          week_number: number
        }
        Insert: {
          activity_type: string
          actual_duration_minutes?: number | null
          calendar_event_id?: string | null
          course_id: string
          created_at?: string | null
          day: string
          description?: string | null
          duration_minutes: number
          icon?: string | null
          id?: string
          is_completed?: boolean | null
          last_synced_at?: string | null
          notes?: string | null
          plan_id: string
          rating?: number | null
          resources?: Json | null
          start_time: string
          title: string
          updated_at?: string | null
          week_number: number
        }
        Update: {
          activity_type?: string
          actual_duration_minutes?: number | null
          calendar_event_id?: string | null
          course_id?: string
          created_at?: string | null
          day?: string
          description?: string | null
          duration_minutes?: number
          icon?: string | null
          id?: string
          is_completed?: boolean | null
          last_synced_at?: string | null
          notes?: string | null
          plan_id?: string
          rating?: number | null
          resources?: Json | null
          start_time?: string
          title?: string
          updated_at?: string | null
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "study_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string
          current_period_start: string
          id: string
          plan_tier: string
          price_id: string | null
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string | null
          user_id: string
          credit_balance: number | null
          credit_cap: number | null
          billing_interval: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan_tier: string
          price_id?: string | null
          status: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
          credit_balance?: number | null
          credit_cap?: number | null
          billing_interval?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan_tier?: string
          price_id?: string | null
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string | null
          user_id?: string
          credit_balance?: number | null
          credit_cap?: number | null
          billing_interval?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          id: string
          name: string
          email: string
          company: string | null
          interest: string
          message: string
          utm_source: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_content: string | null
          page_url: string | null
          status: string
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          email: string
          company?: string | null
          interest?: string
          message: string
          utm_source?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_content?: string | null
          page_url?: string | null
          status?: string
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          email?: string
          company?: string | null
          interest?: string
          message?: string
          utm_source?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_content?: string | null
          page_url?: string | null
          status?: string
          created_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_credits: {
        Args: {
          p_amount: number
          p_description?: string
          p_related_id?: string
          p_respect_cap?: boolean
          p_type: string
          p_user_id: string
        }
        Returns: number
      }
      award_credits_internal: {
        Args: {
          p_user_id: string
          p_amount: number
          p_type: string
          p_description?: string
          p_reference_id?: string
          p_respect_cap?: boolean
        }
        Returns: number
      }
      check_and_deduct_credits: {
        Args: {
          p_user_id: string
          p_amount: number
        }
        Returns: boolean
      }
      deduct_credits_atomic: {
        Args: {
          p_cost: number
          p_description?: string
          p_related_id?: string
          p_type: string
          p_user_id: string
        }
        Returns: number
      }
      generate_referral_code: { Args: never; Returns: string }
      match_document_chunks: {
        Args: {
          match_count: number
          match_threshold: number
          p_course_id: string
          query_embedding: string
        }
        Returns: {
          content: string
          id: number
          similarity: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Semester = Database['public']['Tables']['semesters']['Row']
export type Document = Database['public']['Tables']['documents']['Row']
export type DocumentChunk = Database['public']['Tables']['document_chunks']['Row']
export type Milestone = Database['public']['Tables']['milestones']['Row']
export type Referral = Database['public']['Tables']['referrals']['Row']
export type CreditTransaction = Database['public']['Tables']['credit_transactions']['Row']
export type SubscriptionRow = Database['public']['Tables']['subscriptions']['Row']

// Extended types with new fields
export type Assignment = Database['public']['Tables']['assignments']['Row'] & {
  weight_percentage?: number | null
  total_score?: number | null
  score_percentage?: number | null
  points_earned?: number | null
  calendar_event_id?: string | null
  last_synced_at?: string | null
}

export type Course = Database['public']['Tables']['courses']['Row'] & {
  course_grade_percentage?: number | null
  course_letter_grade?: string | null
  course_gpa_value?: number | null
  graded_weight_total?: number | null
}

export type AssignmentType = 'Assignment' | 'Project' | 'Exam'
export type AssignmentStatus = 'not_started' | 'in_progress' | 'done'

// Study Plan Types
export type CoursePriority = 'high' | 'normal' | 'low'

export interface StudyPlanPreferences {
  id: string
  user_id: string
  semester_id: string
  total_weekly_hours: number
  session_length_minutes: number
  course_priorities: Record<string, CoursePriority> | Json | null
  created_at: string | null
  updated_at: string | null
}

export type StudyPlanStatus = 'active' | 'archived'

export interface StudyPlan {
  id: string
  user_id: string
  semester_id: string
  status: string
  plan_json: StudyPlanJSON | Json
  created_at: string | null
  updated_at: string | null
}

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'

export interface StudySession {
  id: string
  plan_id: string
  course_id: string
  week_number: number
  day: string
  start_time: string
  duration_minutes: number
  activity_type: string
  title: string
  description: string | null
  resources: string[] | Json | null
  icon: string | null
  is_completed: boolean | null
  actual_duration_minutes: number | null
  rating: number | null
  notes: string | null
  calendar_event_id?: string | null
  last_synced_at?: string | null
  created_at: string | null
  updated_at: string | null
  // Joined fields
  course?: Course
}

export interface StudyPlanWeeklyProgress {
  id: string
  plan_id: string
  week_number: number
  date_range: string
  planned_hours: number
  completed_hours: number
  is_completed: boolean | null
  created_at: string | null
  updated_at: string | null
}

// AI Response Types
export interface StudyPlanCourseAllocation {
  courseId: string
  name: string
  weeklyHoursAllocated: number
}

export interface StudyPlanSessionJSON {
  courseId: string
  courseName: string
  courseColor: string
  day: DayOfWeek
  startTime: string
  duration: number
  activityType: string
  title: string
  description: string
  resources: string[]
  icon: string
}

export interface StudyPlanDeadline {
  course: string
  assessment: string
  date: string
}

export interface StudyPlanWeekJSON {
  week: number
  dateRange: string
  totalHours: number
  studySessions: StudyPlanSessionJSON[]
  upcomingDeadlines: StudyPlanDeadline[]
}

export interface StudyPlanJSON {
  semester: string
  totalWeeks: number
  courses: StudyPlanCourseAllocation[]
  weeklySchedule: StudyPlanWeekJSON[]
}

// Calendar and Custom Event Types
export type CustomEventType = 'Meeting' | 'Office Hours' | 'Study Group' | 'Personal' | 'Other'

export interface CustomEvent {
  id: string
  user_id: string
  course_id: string | null
  title: string
  description: string | null
  event_type: CustomEventType
  start_time: string
  end_time: string
  is_all_day: boolean
  location: string | null
  color: string
  recurrence_rule: string | null
  calendar_event_id: string | null
  last_synced_at: string | null
  created_at: string | null
  updated_at: string | null
  // Joined fields
  course?: Course
}

export type CalendarEventType = 'assessment' | 'study_session' | 'custom_event' | 'milestone'

export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay?: boolean
  type: CalendarEventType
  color: string
  courseId?: string
  courseName?: string
  courseCode?: string
  location?: string
  description?: string
  // Original record references
  originalId: string
  originalType: CalendarEventType
  // Sync status
  isSynced?: boolean
  // For assessments
  weight?: number
  assignmentType?: string
  // For study sessions
  weekNumber?: number
  activityType?: string
  isCompleted?: boolean
  // For recurring events
  recurrenceRule?: string
  isRecurring?: boolean
}

// Reminder Types
export type ReminderUnit = 'minutes' | 'hours' | 'days' | 'weeks'
export type ReminderMethod = 'popup' | 'email'

export interface ReminderConfig {
  value: number
  unit: ReminderUnit
  method: ReminderMethod
}

export interface EventReminder {
  id: string
  user_id: string
  event_type: CalendarEventType
  event_id: string
  reminder_time: string
  reminder_offset_value: number
  reminder_offset_unit: ReminderUnit
  method: ReminderMethod
  is_sent: boolean
  sent_at: string | null
  created_at: string | null
}

export interface DefaultReminderSettings {
  id: string
  user_id: string
  reminders: ReminderConfig[]
  apply_to_assessments: boolean
  apply_to_study_sessions: boolean
  apply_to_custom_events: boolean
  created_at: string | null
  updated_at: string | null
}

export interface Notification {
  id: string
  user_id: string
  title: string
  body: string | null
  event_type: CalendarEventType | null
  event_id: string | null
  is_read: boolean
  created_at: string | null
}

export interface CalendarSyncSettings {
  id: string
  user_id: string
  sync_assessments: boolean
  sync_study_sessions: boolean
  sync_custom_events: boolean
  two_way_sync: boolean
  last_sync_token: string | null
  last_full_sync_at: string | null
  created_at: string | null
  updated_at: string | null
}
