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
      app_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          collection_name: string
          details: Json | null
          id: string
          record_id: string | null
          timestamp: string
          user_id: string | null
        }
        Insert: {
          action: string
          collection_name: string
          details?: Json | null
          id?: string
          record_id?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          collection_name?: string
          details?: Json | null
          id?: string
          record_id?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string
          id: string
          notice_text: string | null
          read_at: string | null
          sender_id: string
          status: string | null
          visible: boolean | null
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string
          id?: string
          notice_text?: string | null
          read_at?: string | null
          sender_id: string
          status?: string | null
          visible?: boolean | null
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string
          id?: string
          notice_text?: string | null
          read_at?: string | null
          sender_id?: string
          status?: string | null
          visible?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_ratings: {
        Row: {
          chat_id: string
          created_at: string
          disagreement: number
          empathy: number
          id: string
          rater_id: string
          updated_at: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          disagreement: number
          empathy: number
          id?: string
          rater_id: string
          updated_at?: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          disagreement?: number
          empathy?: number
          id?: string
          rater_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_ratings_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_requests: {
        Row: {
          created_at: string
          id: string
          requester_opinion_id: string
          status: string
          target_opinion_id: string
          topic_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          requester_opinion_id: string
          status?: string
          target_opinion_id: string
          topic_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          requester_opinion_id?: string
          status?: string
          target_opinion_id?: string
          topic_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_requests_requester_opinion_id_fkey"
            columns: ["requester_opinion_id"]
            isOneToOne: false
            referencedRelation: "opinions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_requests_requester_opinion_id_fkey"
            columns: ["requester_opinion_id"]
            isOneToOne: false
            referencedRelation: "opinions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_requests_target_opinion_id_fkey"
            columns: ["target_opinion_id"]
            isOneToOne: false
            referencedRelation: "opinions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_requests_target_opinion_id_fkey"
            columns: ["target_opinion_id"]
            isOneToOne: false
            referencedRelation: "opinions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_requests_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          created_at: string
          id: string
          opinion_a_id: string
          opinion_b_id: string
          topic_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          opinion_a_id: string
          opinion_b_id: string
          topic_id: string
        }
        Update: {
          created_at?: string
          id?: string
          opinion_a_id?: string
          opinion_b_id?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_opinion_a_id_fkey"
            columns: ["opinion_a_id"]
            isOneToOne: false
            referencedRelation: "opinions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_opinion_a_id_fkey"
            columns: ["opinion_a_id"]
            isOneToOne: false
            referencedRelation: "opinions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_opinion_b_id_fkey"
            columns: ["opinion_b_id"]
            isOneToOne: false
            referencedRelation: "opinions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_opinion_b_id_fkey"
            columns: ["opinion_b_id"]
            isOneToOne: false
            referencedRelation: "opinions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      court_cases: {
        Row: {
          admin_id: string | null
          case_number: string | null
          court_name: string | null
          created_at: string | null
          decision_date: string | null
          decision_type: string | null
          id: string
          report_id: string
          status: string | null
          topic_id: string
          updated_at: string | null
        }
        Insert: {
          admin_id?: string | null
          case_number?: string | null
          court_name?: string | null
          created_at?: string | null
          decision_date?: string | null
          decision_type?: string | null
          id?: string
          report_id: string
          status?: string | null
          topic_id: string
          updated_at?: string | null
        }
        Update: {
          admin_id?: string | null
          case_number?: string | null
          court_name?: string | null
          created_at?: string | null
          decision_date?: string | null
          decision_type?: string | null
          id?: string
          report_id?: string
          status?: string | null
          topic_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "court_cases_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "court_cases_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      fake_nodes: {
        Row: {
          created_at: string
          id: string
          opinion_text: string
          topic_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          opinion_text: string
          topic_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          opinion_text?: string
          topic_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fake_nodes_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      laws: {
        Row: {
          created_at: string | null
          effective_date: string
          id: string
          law_book: string
          offense: string
          paragraph: string
          version: string
        }
        Insert: {
          created_at?: string | null
          effective_date?: string
          id?: string
          law_book: string
          offense: string
          paragraph: string
          version?: string
        }
        Update: {
          created_at?: string | null
          effective_date?: string
          id?: string
          law_book?: string
          offense?: string
          paragraph?: string
          version?: string
        }
        Relationships: []
      }
      opinion_ratings: {
        Row: {
          created_at: string | null
          disagreement: number
          id: string
          rater_opinion_id: string
          target_opinion_id: string
          topic_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          disagreement?: number
          id?: string
          rater_opinion_id: string
          target_opinion_id: string
          topic_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          disagreement?: number
          id?: string
          rater_opinion_id?: string
          target_opinion_id?: string
          topic_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opinion_ratings_rater_opinion_id_fkey"
            columns: ["rater_opinion_id"]
            isOneToOne: false
            referencedRelation: "opinions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opinion_ratings_rater_opinion_id_fkey"
            columns: ["rater_opinion_id"]
            isOneToOne: false
            referencedRelation: "opinions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opinion_ratings_target_opinion_id_fkey"
            columns: ["target_opinion_id"]
            isOneToOne: false
            referencedRelation: "opinions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opinion_ratings_target_opinion_id_fkey"
            columns: ["target_opinion_id"]
            isOneToOne: false
            referencedRelation: "opinions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opinion_ratings_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      opinions: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          notice_text: string | null
          status: string | null
          text: string
          topic_id: string
          user_id: string
          visible: boolean | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          notice_text?: string | null
          status?: string | null
          text: string
          topic_id: string
          user_id: string
          visible?: boolean | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          notice_text?: string | null
          status?: string | null
          text?: string
          topic_id?: string
          user_id?: string
          visible?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "opinions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          admin_id: string | null
          content_id: string
          content_type: string
          created_at: string
          description: string | null
          id: string
          law_book: string
          offense: string
          paragraph: string
          reported_user_ip_address: string | null
          reporter_ip_address: string | null
          reporting_user_id: string
          review_timestamp: string | null
          status: string | null
        }
        Insert: {
          admin_id?: string | null
          content_id: string
          content_type: string
          created_at?: string
          description?: string | null
          id?: string
          law_book: string
          offense: string
          paragraph: string
          reported_user_ip_address?: string | null
          reporter_ip_address?: string | null
          reporting_user_id: string
          review_timestamp?: string | null
          status?: string | null
        }
        Update: {
          admin_id?: string | null
          content_id?: string
          content_type?: string
          created_at?: string
          description?: string | null
          id?: string
          law_book?: string
          offense?: string
          paragraph?: string
          reported_user_ip_address?: string | null
          reporter_ip_address?: string | null
          reporting_user_id?: string
          review_timestamp?: string | null
          status?: string | null
        }
        Relationships: []
      }
      test_diskussion_replies: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
        }
        Relationships: []
      }
      topics: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          status: string | null
          title: string
          url_slug: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          status?: string | null
          title: string
          url_slug: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          status?: string | null
          title?: string
          url_slug?: string
        }
        Relationships: []
      }
      tutorial_settings: {
        Row: {
          created_at: string
          custom_text: string | null
          custom_title: string | null
          id: string
          is_muted: boolean
          language: string
          step_id: string
          tutorial_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_text?: string | null
          custom_title?: string | null
          id?: string
          is_muted?: boolean
          language?: string
          step_id: string
          tutorial_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_text?: string | null
          custom_title?: string | null
          id?: string
          is_muted?: boolean
          language?: string
          step_id?: string
          tutorial_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          blocked_user_id: string
          blocker_id: string
          chat_id: string | null
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          blocked_user_id: string
          blocker_id: string
          chat_id?: string | null
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_user_id?: string
          blocker_id?: string
          chat_id?: string | null
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_blocks_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_topics: {
        Row: {
          id: string
          ip_address: string | null
          joined_at: string | null
          topic_id: string
          user_id: string
        }
        Insert: {
          id?: string
          ip_address?: string | null
          joined_at?: string | null
          topic_id: string
          user_id: string
        }
        Update: {
          id?: string
          ip_address?: string | null
          joined_at?: string | null
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_topics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      contents: {
        Row: {
          content_id: string | null
          content_type: string | null
          created_at: string | null
          creator_id: string | null
          notice_text: string | null
          status: string | null
          text: string | null
          topic_id: string | null
          visible: boolean | null
        }
        Relationships: []
      }
      opinions_public: {
        Row: {
          created_at: string | null
          id: string | null
          notice_text: string | null
          status: string | null
          text: string | null
          topic_id: string | null
          user_id: string | null
          visible: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          notice_text?: string | null
          status?: string | null
          text?: string | null
          topic_id?: string | null
          user_id?: string | null
          visible?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          notice_text?: string | null
          status?: string | null
          text?: string | null
          topic_id?: string | null
          user_id?: string | null
          visible?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "opinions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      approve_court_case: { Args: { _case_id: string }; Returns: undefined }
      can_view_opinion: {
        Args: { _opinion_id: string; _user_id: string; _visible: boolean }
        Returns: boolean
      }
      create_court_case: {
        Args: {
          _case_number?: string
          _court_name?: string
          _report_id: string
        }
        Returns: string
      }
      create_topic: {
        Args: { _description?: string; _title: string }
        Returns: string
      }
      delete_bot_opinion: { Args: { _topic_id: string }; Returns: undefined }
      delete_opinion_cascade: {
        Args: { _opinion_id: string }
        Returns: undefined
      }
      get_graph_pairs: {
        Args: { topic_uuid: string }
        Returns: {
          avg_disagreement: number
          avg_empathy: number
          opinion_a_id: string
          opinion_b_id: string
          rating_count: number
        }[]
      }
      get_opinion_pair_ratings: {
        Args: { topic_uuid: string }
        Returns: {
          avg_disagreement: number
          avg_empathy: number
          opinion_a_id: string
          opinion_b_id: string
          rating_count: number
        }[]
      }
      get_or_create_chat: {
        Args: {
          opinion_a_uuid: string
          opinion_b_uuid: string
          topic_uuid: string
        }
        Returns: string
      }
      get_user_topics: {
        Args: never
        Returns: {
          description: string
          joined_at: string
          status: string
          title: string
          topic_id: string
          url_slug: string
        }[]
      }
      has_joined_topic: { Args: { _topic_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      insert_bot_message: {
        Args: { _chat_id: string; _content: string }
        Returns: string
      }
      is_chat_participant: {
        Args: { chat_id: string; checking_user_id: string }
        Returns: boolean
      }
      join_topic: {
        Args: { _ip_address?: string; _topic_slug: string }
        Returns: string
      }
      log_audit: {
        Args: {
          _action: string
          _collection_name: string
          _details?: Json
          _record_id: string
        }
        Returns: undefined
      }
      report_content:
        | {
            Args: {
              _content_id: string
              _content_type: string
              _description?: string
              _law_book: string
              _offense: string
              _paragraph: string
            }
            Returns: string
          }
        | {
            Args: {
              _content_id: string
              _content_type: string
              _description?: string
              _law_book: string
              _offense: string
              _paragraph: string
              _reporter_ip?: string
            }
            Returns: string
          }
      review_report: {
        Args: { _new_status: string; _notice_text?: string; _report_id: string }
        Returns: undefined
      }
      submit_opinion: {
        Args: { _ip_address?: string; _text: string; _topic_id: string }
        Returns: string
      }
      toggle_soft_delete: {
        Args: {
          _content_id: string
          _content_type: string
          _notice_text?: string
          _visible: boolean
        }
        Returns: undefined
      }
      update_court_case_decision: {
        Args: {
          _case_id: string
          _case_number?: string
          _court_name?: string
          _decision_date?: string
          _decision_type: string
        }
        Returns: undefined
      }
      update_topic_status: {
        Args: { _new_status: string; _topic_id: string }
        Returns: undefined
      }
      upsert_bot_opinion: {
        Args: { _text: string; _topic_id: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
