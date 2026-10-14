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
      archive_results: {
        Row: {
          author_id: string | null
          captured_at: string
          created_at: string
          id: string
          opinion_id: string
          opinion_text: string
          points: number
          rank: number
          topic_id: string
        }
        Insert: {
          author_id?: string | null
          captured_at?: string
          created_at?: string
          id?: string
          opinion_id: string
          opinion_text: string
          points?: number
          rank: number
          topic_id: string
        }
        Update: {
          author_id?: string | null
          captured_at?: string
          created_at?: string
          id?: string
          opinion_id?: string
          opinion_text?: string
          points?: number
          rank?: number
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "archive_results_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
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
      banned_emails: {
        Row: {
          banned_at: string
          email: string
          reason: string | null
        }
        Insert: {
          banned_at?: string
          email: string
          reason?: string | null
        }
        Update: {
          banned_at?: string
          email?: string
          reason?: string | null
        }
        Relationships: []
      }
      campaign_sends: {
        Row: {
          campaign_key: string
          id: string
          open_count: number
          opened_at: string | null
          recipient_email: string
          sent_at: string
          signup_id: string
        }
        Insert: {
          campaign_key: string
          id?: string
          open_count?: number
          opened_at?: string | null
          recipient_email: string
          sent_at?: string
          signup_id: string
        }
        Update: {
          campaign_key?: string
          id?: string
          open_count?: number
          opened_at?: string | null
          recipient_email?: string
          sent_at?: string
          signup_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_sends_signup_id_fkey"
            columns: ["signup_id"]
            isOneToOne: false
            referencedRelation: "signups"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_message_reactions: {
        Row: {
          created_at: string
          id: string
          message_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          reaction_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          audio_url: string | null
          chat_id: string
          content: string
          created_at: string
          id: string
          notice_text: string | null
          read_at: string | null
          reply_to_id: string | null
          sender_id: string
          status: string | null
          transcript: string | null
          visible: boolean | null
        }
        Insert: {
          audio_url?: string | null
          chat_id: string
          content: string
          created_at?: string
          id?: string
          notice_text?: string | null
          read_at?: string | null
          reply_to_id?: string | null
          sender_id: string
          status?: string | null
          transcript?: string | null
          visible?: boolean | null
        }
        Update: {
          audio_url?: string | null
          chat_id?: string
          content?: string
          created_at?: string
          id?: string
          notice_text?: string | null
          read_at?: string | null
          reply_to_id?: string | null
          sender_id?: string
          status?: string | null
          transcript?: string | null
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
          {
            foreignKeyName: "chat_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
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
          message_count: number
          rater_id: string
          updated_at: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          disagreement: number
          empathy: number
          id?: string
          message_count?: number
          rater_id: string
          updated_at?: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          disagreement?: number
          empathy?: number
          id?: string
          message_count?: number
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
          title: string | null
          topic_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          opinion_a_id: string
          opinion_b_id: string
          title?: string | null
          topic_id: string
        }
        Update: {
          created_at?: string
          id?: string
          opinion_a_id?: string
          opinion_b_id?: string
          title?: string | null
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
      daily_reports: {
        Row: {
          body_md: string
          created_at: string
          id: string
          report_date: string
          stats: Json
          title: string
          updated_at: string
        }
        Insert: {
          body_md: string
          created_at?: string
          id?: string
          report_date: string
          stats?: Json
          title: string
          updated_at?: string
        }
        Update: {
          body_md?: string
          created_at?: string
          id?: string
          report_date?: string
          stats?: Json
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body_md: string
          heading: string
          key: string
          subject: string
          updated_at: string
        }
        Insert: {
          body_md: string
          heading: string
          key: string
          subject: string
          updated_at?: string
        }
        Update: {
          body_md?: string
          heading?: string
          key?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
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
      faq_items: {
        Row: {
          answer: string
          created_at: string
          id: string
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer?: string
          created_at?: string
          id?: string
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      gutefrage_signups: {
        Row: {
          analytics_id: string | null
          confirm_token: string | null
          confirm_token_expires_at: string | null
          confirmed_at: string | null
          created_at: string
          email: string
          id: string
          is_test: boolean
          post_id: string
          signup_ip: unknown
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          analytics_id?: string | null
          confirm_token?: string | null
          confirm_token_expires_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          email: string
          id?: string
          is_test?: boolean
          post_id?: string
          signup_ip?: unknown
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          analytics_id?: string | null
          confirm_token?: string | null
          confirm_token_expires_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          email?: string
          id?: string
          is_test?: boolean
          post_id?: string
          signup_ip?: unknown
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
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
      notifications: {
        Row: {
          body: string | null
          chat_id: string | null
          created_at: string
          id: string
          link: string | null
          opinion_id: string | null
          read_at: string | null
          title: string
          topic_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          chat_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          opinion_id?: string | null
          read_at?: string | null
          title: string
          topic_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          chat_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          opinion_id?: string | null
          read_at?: string | null
          title?: string
          topic_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      opinion_ips: {
        Row: {
          created_at: string
          ip_address: string | null
          opinion_id: string
        }
        Insert: {
          created_at?: string
          ip_address?: string | null
          opinion_id: string
        }
        Update: {
          created_at?: string
          ip_address?: string | null
          opinion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opinion_ips_opinion_id_fkey"
            columns: ["opinion_id"]
            isOneToOne: true
            referencedRelation: "opinions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opinion_ips_opinion_id_fkey"
            columns: ["opinion_id"]
            isOneToOne: true
            referencedRelation: "opinions_public"
            referencedColumns: ["id"]
          },
        ]
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
      polarization_responses: {
        Row: {
          created_at: string
          id: string
          least_liked_score: number | null
          most_liked_score: number | null
          user_id: string
          wave: string
        }
        Insert: {
          created_at?: string
          id?: string
          least_liked_score?: number | null
          most_liked_score?: number | null
          user_id: string
          wave: string
        }
        Update: {
          created_at?: string
          id?: string
          least_liked_score?: number | null
          most_liked_score?: number | null
          user_id?: string
          wave?: string
        }
        Relationships: []
      }
      push_prefs: {
        Row: {
          enabled: boolean
          new_bridge_points: boolean
          new_chat: boolean
          new_message: boolean
          new_opinion: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          enabled?: boolean
          new_bridge_points?: boolean
          new_chat?: boolean
          new_message?: boolean
          new_opinion?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          enabled?: boolean
          new_bridge_points?: boolean
          new_chat?: boolean
          new_message?: boolean
          new_opinion?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_success_at: string | null
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_success_at?: string | null
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_success_at?: string | null
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      question_submissions: {
        Row: {
          ai_draft: string | null
          created_at: string
          email: string | null
          id: string
          question: string
          status: string
        }
        Insert: {
          ai_draft?: string | null
          created_at?: string
          email?: string | null
          id?: string
          question: string
          status?: string
        }
        Update: {
          ai_draft?: string | null
          created_at?: string
          email?: string | null
          id?: string
          question?: string
          status?: string
        }
        Relationships: []
      }
      rating_events: {
        Row: {
          chat_id: string | null
          created_at: string
          id: string
          kind: string
          rater_id: string
          target_opinion_id: string
          topic_id: string
          value: number
        }
        Insert: {
          chat_id?: string | null
          created_at?: string
          id?: string
          kind: string
          rater_id: string
          target_opinion_id: string
          topic_id: string
          value: number
        }
        Update: {
          chat_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          rater_id?: string
          target_opinion_id?: string
          topic_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "rating_events_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rating_events_target_opinion_id_fkey"
            columns: ["target_opinion_id"]
            isOneToOne: false
            referencedRelation: "opinions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rating_events_target_opinion_id_fkey"
            columns: ["target_opinion_id"]
            isOneToOne: false
            referencedRelation: "opinions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rating_events_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      report_ips: {
        Row: {
          created_at: string
          report_id: string
          reported_user_ip_address: string | null
          reporter_ip_address: string | null
        }
        Insert: {
          created_at?: string
          report_id: string
          reported_user_ip_address?: string | null
          reporter_ip_address?: string | null
        }
        Update: {
          created_at?: string
          report_id?: string
          reported_user_ip_address?: string | null
          reporter_ip_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_ips_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: true
            referencedRelation: "reports"
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
          reporting_user_id?: string
          review_timestamp?: string | null
          status?: string | null
        }
        Relationships: []
      }
      signups: {
        Row: {
          auth_user_id: string | null
          confirm_token: string | null
          confirm_token_expires_at: string | null
          confirmed_at: string | null
          created_at: string
          daily_report_opt_in: boolean
          email: string
          id: string
          last_passphrase_sent_at: string | null
          notification_digest_opt_in: boolean
          passphrase: string | null
          passphrase_issued_at: string | null
          signup_ip: unknown
        }
        Insert: {
          auth_user_id?: string | null
          confirm_token?: string | null
          confirm_token_expires_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          daily_report_opt_in?: boolean
          email: string
          id?: string
          last_passphrase_sent_at?: string | null
          notification_digest_opt_in?: boolean
          passphrase?: string | null
          passphrase_issued_at?: string | null
          signup_ip?: unknown
        }
        Update: {
          auth_user_id?: string | null
          confirm_token?: string | null
          confirm_token_expires_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          daily_report_opt_in?: boolean
          email?: string
          id?: string
          last_passphrase_sent_at?: string | null
          notification_digest_opt_in?: boolean
          passphrase?: string | null
          passphrase_issued_at?: string | null
          signup_ip?: unknown
        }
        Relationships: []
      }
      sim_personas: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          opinion_id: string | null
          opinion_text: string
          persona: string
          slot: number
          user_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          opinion_id?: string | null
          opinion_text: string
          persona: string
          slot: number
          user_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          opinion_id?: string | null
          opinion_text?: string
          persona?: string
          slot?: number
          user_id?: string | null
        }
        Relationships: []
      }
      sim_state: {
        Row: {
          august_lease_expires_at: string | null
          created_at: string
          id: number
          lease_expires_at: string | null
          paused_reason: string | null
          running_until: string | null
          runs_date: string
          runs_today: number
          updated_at: string
        }
        Insert: {
          august_lease_expires_at?: string | null
          created_at?: string
          id?: number
          lease_expires_at?: string | null
          paused_reason?: string | null
          running_until?: string | null
          runs_date?: string
          runs_today?: number
          updated_at?: string
        }
        Update: {
          august_lease_expires_at?: string | null
          created_at?: string
          id?: number
          lease_expires_at?: string | null
          paused_reason?: string | null
          running_until?: string | null
          runs_date?: string
          runs_today?: number
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      test_diskussion_replies: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string | null
          name: string | null
          sincerity: number | null
          understanding: number | null
          warmth: number | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name?: string | null
          sincerity?: number | null
          understanding?: number | null
          warmth?: number | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string | null
          sincerity?: number | null
          understanding?: number | null
          warmth?: number | null
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
          short_code: string
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
          short_code: string
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
          short_code?: string
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
      tutorial_steps: {
        Row: {
          created_at: string
          highlight: string
          id: string
          is_active: boolean
          sort_order: number
          text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          highlight?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          highlight?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          text?: string
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
      verified_participants: {
        Row: {
          signup_id: string
          user_id: string
          verified_at: string
        }
        Insert: {
          signup_id: string
          user_id: string
          verified_at?: string
        }
        Update: {
          signup_id?: string
          user_id?: string
          verified_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "verified_participants_signup_id_fkey"
            columns: ["signup_id"]
            isOneToOne: true
            referencedRelation: "signups"
            referencedColumns: ["id"]
          },
        ]
      }
      wedium_campaign_sends: {
        Row: {
          campaign_key: string
          id: string
          open_count: number
          opened_at: string | null
          recipient_email: string
          sent_at: string
          signup_id: string
        }
        Insert: {
          campaign_key: string
          id?: string
          open_count?: number
          opened_at?: string | null
          recipient_email: string
          sent_at?: string
          signup_id: string
        }
        Update: {
          campaign_key?: string
          id?: string
          open_count?: number
          opened_at?: string | null
          recipient_email?: string
          sent_at?: string
          signup_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wedium_campaign_sends_signup_id_fkey"
            columns: ["signup_id"]
            isOneToOne: false
            referencedRelation: "wedium_signups"
            referencedColumns: ["id"]
          },
        ]
      }
      wedium_signups: {
        Row: {
          auth_user_id: string | null
          confirm_token: string | null
          confirm_token_expires_at: string | null
          confirmed_at: string | null
          created_at: string
          email: string
          id: string
          last_passphrase_sent_at: string | null
          passphrase: string | null
          passphrase_issued_at: string | null
          signup_ip: unknown
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          confirm_token?: string | null
          confirm_token_expires_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          email: string
          id?: string
          last_passphrase_sent_at?: string | null
          passphrase?: string | null
          passphrase_issued_at?: string | null
          signup_ip?: unknown
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          confirm_token?: string | null
          confirm_token_expires_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          email?: string
          id?: string
          last_passphrase_sent_at?: string | null
          passphrase?: string | null
          passphrase_issued_at?: string | null
          signup_ip?: unknown
          updated_at?: string
        }
        Relationships: []
      }
      wedium_verified_participants: {
        Row: {
          signup_id: string
          user_id: string
          verified_at: string
        }
        Insert: {
          signup_id: string
          user_id: string
          verified_at?: string
        }
        Update: {
          signup_id?: string
          user_id?: string
          verified_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wedium_verified_participants_signup_id_fkey"
            columns: ["signup_id"]
            isOneToOne: false
            referencedRelation: "wedium_signups"
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
      archive_reopened_at: { Args: never; Returns: string }
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
      delete_bot_opinion: { Args: { _topic_id: string }; Returns: undefined }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      delete_my_opinion: { Args: { _topic_id: string }; Returns: number }
      delete_opinion_cascade: {
        Args: { _opinion_id: string }
        Returns: undefined
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      event_setting: { Args: { _key: string }; Returns: string }
      fake_node_user_id: { Args: { _fake_node_id: string }; Returns: string }
      generate_topic_short_code: { Args: never; Returns: string }
      get_daily_report_opt_in: { Args: never; Returns: boolean }
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
      get_notification_digest_opt_in: { Args: never; Returns: boolean }
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
      get_readonly_chat_messages: {
        Args: { _source_opinion_id: string; _target_opinion_id: string }
        Returns: {
          audio_url: string
          chat_id: string
          content: string
          created_at: string
          id: string
          reply_to_id: string
          sender_id: string
          transcript: string
        }[]
      }
      get_report_ips: {
        Args: { _report_id: string }
        Returns: {
          reported_user_ip_address: string
          reporter_ip_address: string
        }[]
      }
      get_time_weighted_ratings: {
        Args: { _topic_id: string }
        Returns: {
          kind: string
          rater_id: string
          target_opinion_id: string
          value: number
        }[]
      }
      get_topic_chat_request_edges: {
        Args: { _topic_id: string }
        Returns: {
          created_at: string
          id: string
          requester_opinion_id: string
          status: string
          target_opinion_id: string
          topic_id: string
        }[]
      }
      get_topic_chats: {
        Args: { _topic_id: string }
        Returns: {
          id: string
          last_message: string
          last_message_at: string
          message_count: number
          opinion_a_id: string
          opinion_a_text: string
          opinion_b_id: string
          opinion_b_text: string
          title: string
        }[]
      }
      get_topic_directed_pairs: {
        Args: { _topic_id: string }
        Returns: {
          disagreement: number
          empathy: number
          rater_opinion_id: string
          target_opinion_id: string
        }[]
      }
      get_topic_disagreement_pairs: {
        Args: { _topic_id: string }
        Returns: {
          disagreement: number
          rater_opinion_id: string
          target_opinion_id: string
        }[]
      }
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
      is_archived_topic: { Args: { _topic_id: string }; Returns: boolean }
      is_chat_participant: {
        Args: { chat_id: string; checking_user_id: string }
        Returns: boolean
      }
      is_open_topic: { Args: { _topic_id: string }; Returns: boolean }
      is_post_reopen_chat: { Args: { _chat_id: string }; Returns: boolean }
      is_post_reopen_opinion: {
        Args: { _opinion_id: string }
        Returns: boolean
      }
      is_real_event_topic: { Args: { _topic_id: string }; Returns: boolean }
      is_sandbox_topic: { Args: { _topic_id: string }; Returns: boolean }
      is_sim_topic: { Args: { v_topic: string }; Returns: boolean }
      is_verified_participant: { Args: { _user_id: string }; Returns: boolean }
      log_audit: {
        Args: {
          _action: string
          _collection_name: string
          _details?: Json
          _record_id: string
        }
        Returns: undefined
      }
      mark_notifications_read: { Args: never; Returns: number }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      pin_stream_entry: {
        Args: {
          _cycle: number
          _node_id: string
          _point_index: number
          _topic_id: string
        }
        Returns: boolean
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      reply_to_sim_message: {
        Args: { p_language?: string; p_message_id: string }
        Returns: string
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
      set_daily_report_opt_in: { Args: { _enabled: boolean }; Returns: boolean }
      set_notification_digest_opt_in: {
        Args: { _enabled: boolean }
        Returns: boolean
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
      verify_push_trigger_token: { Args: { _token: string }; Returns: boolean }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
